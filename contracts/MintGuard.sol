// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

interface IAuxiteMetal {
    function mint(address to, uint256 amount) external;
    function burnFrom(address from, uint256 amount) external;
}

interface IAUXR {
    function mint(address to, uint256 amount, bytes32 refId) external;
}

/**
 * @title  Auxite Mint Guard
 * @author Auxite
 * @notice Rate-limited minter that sits between the automated reconciliation
 *         signer and the immutable token contracts (AuxiteMetal x4, AUXR).
 *
 * @dev    WHY THIS EXISTS
 *         ---------------
 *         The deployed tokens are immutable and give MINTER_ROLE unlimited
 *         mint / burnFrom power. When that role is held by a single hot
 *         signer, a key compromise means unlimited issuance (and, for the
 *         metals, burning any holder's balance). This contract holds
 *         MINTER_ROLE instead, and the signer only gets OPERATOR_ROLE here,
 *         which is bounded by per-token daily caps set by the multisig.
 *
 *         Worst case after a signer compromise: at most one day's cap is
 *         minted/burned before the multisig (or a pauser) halts it.
 *
 *         LIMITS
 *         ------
 *         Per token, separate mint and burn caps in raw token units per fixed
 *         UTC day window (block.timestamp / 1 days). A cap of 0 disables that
 *         operation for the token. Fixed windows allow up to 2x a cap across a
 *         day boundary; size caps with that in mind.
 *
 *         ROLES
 *         -----
 *         DEFAULT_ADMIN_ROLE — Governance Safe. Sets caps, grants roles,
 *                              unpauses.
 *         OPERATOR_ROLE      — Reconciliation signer. Mints/burns within caps.
 *         PAUSER_ROLE        — Security ops. Can pause instantly.
 *
 *         ROLLOUT (via the Safe)
 *         ----------------------
 *           1. Deploy MintGuard(safe, signer, pauser).
 *           2. setCaps(token, mintCap, burnCap) for each token.
 *           3. token.grantRole(MINTER_ROLE, mintGuard).
 *           4. token.revokeRole(MINTER_ROLE, signer) and from any other
 *              EOA that still holds it.
 */
contract MintGuard is AccessControl, Pausable {
    // ── Roles ───────────────────────────────────────────────────────────────

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // ── Types ───────────────────────────────────────────────────────────────

    struct Limits {
        uint128 mintCapPerDay; // raw units; 0 = minting disabled
        uint128 burnCapPerDay; // raw units; 0 = burning disabled
    }

    struct Usage {
        uint64 day; // block.timestamp / 1 days of the last update
        uint128 minted;
        uint128 burned;
    }

    // ── Storage ─────────────────────────────────────────────────────────────

    mapping(address => Limits) public limits;
    mapping(address => Usage) private _usage;

    // ── Events ──────────────────────────────────────────────────────────────

    event CapsSet(address indexed token, uint128 mintCapPerDay, uint128 burnCapPerDay);
    event GuardedMint(address indexed token, address indexed to, uint256 amount, bytes32 refId);
    event GuardedBurn(address indexed token, address indexed from, uint256 amount);

    // ── Errors ──────────────────────────────────────────────────────────────

    error ZeroAddress();
    error MintCapExceeded(address token, uint256 requested, uint256 remaining);
    error BurnCapExceeded(address token, uint256 requested, uint256 remaining);
    error LengthMismatch();

    // ── Constructor ─────────────────────────────────────────────────────────

    /// @param admin    Governance Safe (DEFAULT_ADMIN_ROLE).
    /// @param operator Reconciliation signer (OPERATOR_ROLE). May be zero.
    /// @param pauser   Security ops key (PAUSER_ROLE). May be zero.
    constructor(address admin, address operator, address pauser) {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        if (operator != address(0)) _grantRole(OPERATOR_ROLE, operator);
        if (pauser != address(0)) _grantRole(PAUSER_ROLE, pauser);
    }

    // ── Admin ───────────────────────────────────────────────────────────────

    function setCaps(
        address token,
        uint128 mintCapPerDay,
        uint128 burnCapPerDay
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (token == address(0)) revert ZeroAddress();
        limits[token] = Limits(mintCapPerDay, burnCapPerDay);
        emit CapsSet(token, mintCapPerDay, burnCapPerDay);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @dev Unpause is admin-only so a compromised pauser cannot undo a halt.
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ── Operator: AuxiteMetal (AUXG / AUXS / AUXPT / AUXPD) ─────────────────

    function mint(
        address token,
        address to,
        uint256 amount
    ) external onlyRole(OPERATOR_ROLE) whenNotPaused {
        _consumeMint(token, amount);
        IAuxiteMetal(token).mint(to, amount);
        emit GuardedMint(token, to, amount, bytes32(0));
    }

    function burnFrom(
        address token,
        address from,
        uint256 amount
    ) external onlyRole(OPERATOR_ROLE) whenNotPaused {
        _consumeBurn(token, amount);
        IAuxiteMetal(token).burnFrom(from, amount);
        emit GuardedBurn(token, from, amount);
    }

    function mintBatch(
        address token,
        address[] calldata to,
        uint256[] calldata amounts
    ) external onlyRole(OPERATOR_ROLE) whenNotPaused {
        if (to.length != amounts.length) revert LengthMismatch();
        for (uint256 i = 0; i < to.length; ++i) {
            _consumeMint(token, amounts[i]);
            IAuxiteMetal(token).mint(to[i], amounts[i]);
            emit GuardedMint(token, to[i], amounts[i], bytes32(0));
        }
    }

    function burnFromBatch(
        address token,
        address[] calldata from,
        uint256[] calldata amounts
    ) external onlyRole(OPERATOR_ROLE) whenNotPaused {
        if (from.length != amounts.length) revert LengthMismatch();
        for (uint256 i = 0; i < from.length; ++i) {
            _consumeBurn(token, amounts[i]);
            IAuxiteMetal(token).burnFrom(from[i], amounts[i]);
            emit GuardedBurn(token, from[i], amounts[i]);
        }
    }

    // ── Operator: AUXR ──────────────────────────────────────────────────────

    function mintWithRef(
        address token,
        address to,
        uint256 amount,
        bytes32 refId
    ) external onlyRole(OPERATOR_ROLE) whenNotPaused {
        _consumeMint(token, amount);
        IAUXR(token).mint(to, amount, refId);
        emit GuardedMint(token, to, amount, refId);
    }

    // ── Views ───────────────────────────────────────────────────────────────

    /// @notice Mint/burn capacity left for `token` in the current day window.
    function remaining(
        address token
    ) external view returns (uint256 mintLeft, uint256 burnLeft) {
        Limits memory l = limits[token];
        Usage memory u = _currentUsage(token);
        mintLeft = _left(l.mintCapPerDay, u.minted);
        burnLeft = _left(l.burnCapPerDay, u.burned);
    }

    // ── Internal ────────────────────────────────────────────────────────────

    function _currentUsage(address token) private view returns (Usage memory u) {
        u = _usage[token];
        uint64 today = uint64(block.timestamp / 1 days);
        if (u.day != today) {
            u.day = today;
            u.minted = 0;
            u.burned = 0;
        }
    }

    /// @dev A cap may be lowered below today's usage; treat that as 0 left.
    function _left(uint128 cap, uint128 used) private pure returns (uint256) {
        return cap > used ? cap - used : 0;
    }

    function _consumeMint(address token, uint256 amount) private {
        Usage memory u = _currentUsage(token);
        uint256 left = _left(limits[token].mintCapPerDay, u.minted);
        if (amount > left) revert MintCapExceeded(token, amount, left);
        u.minted += uint128(amount);
        _usage[token] = u;
    }

    function _consumeBurn(address token, uint256 amount) private {
        Usage memory u = _currentUsage(token);
        uint256 left = _left(limits[token].burnCapPerDay, u.burned);
        if (amount > left) revert BurnCapExceeded(token, amount, left);
        u.burned += uint128(amount);
        _usage[token] = u;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title  Auxite Reserve (AUXR)
 * @author Auxite
 * @notice Fixed-composition basket reserve token: each AUXR represents a
 *         claim on a fixed number of grams of Gold, Silver, Platinum, and
 *         Palladium held in custody by Auxite. Backing is published at
 *         auxite.io/proof-of-reserves and attested by The Network Firm.
 *
 * @dev    HYBRID ON-CHAIN / OFF-CHAIN MODEL
 *         --------------------------------
 *         Default user balances live on Auxite's off-chain ledger (Redis)
 *         to provide gas-free UX in the Auxite mobile/web app. This contract
 *         is the on-chain representation used for:
 *           - Self-custody withdrawals (user moves AUXR to their own wallet)
 *           - Centralized exchange deposits / trading (BitMart, etc.)
 *           - DEX liquidity (Uniswap V3 on Base)
 *
 *         BRIDGE FLOW
 *         -----------
 *         WITHDRAW (off-chain → on-chain):
 *           1. User requests withdrawal to a chain address.
 *           2. Auxite backend burns the user's off-chain balance.
 *           3. Auxite backend (MINTER_ROLE) calls `mint(user, amount, refId)`.
 *
 *         DEPOSIT (on-chain → off-chain):
 *           1. User sends AUXR to Auxite's deposit address via standard
 *              ERC-20 transfer, OR calls `burnWithRef(amount, refId)`.
 *           2. Auxite backend observes the Transfer/Burn event.
 *           3. Auxite backend credits the user's off-chain balance.
 *
 *         REDEMPTION (claim physical metal / fiat) happens through the
 *         off-chain Auxite app — users redeem AUXR for fiat via Stripe/Wise
 *         or physical delivery via the existing Auxite delivery pipeline.
 *         There is no on-chain redemption function; on-chain holders must
 *         deposit back to Auxite first.
 *
 *         BACKING INVARIANT
 *         -----------------
 *         At all times: totalSupply() + offChainSupply ≤ allocatedReserves
 *         where allocatedReserves are the physical grams of Au/Ag/Pt/Pd
 *         held in the Auxite vault network and reserved against AUXR.
 *         Enforcement is operational (off-chain ledger + PoR attestation),
 *         not on-chain. The hard MAX_SUPPLY cap is a defense-in-depth
 *         backstop against issuance bugs.
 *
 *         ROLES
 *         -----
 *         DEFAULT_ADMIN_ROLE — Can grant/revoke other roles. Held by the
 *                              Auxite governance multisig.
 *         MINTER_ROLE        — Can mint new AUXR. Held by the Auxite backend
 *                              signer (KMS-controlled) that brokers the
 *                              off-chain → on-chain bridge.
 *         PAUSER_ROLE        — Can pause all transfers/mints/burns. Held by
 *                              Auxite security ops for emergency response.
 */
contract AUXR is ERC20, ERC20Burnable, ERC20Pausable, ERC20Permit, AccessControl {
    // ── Roles ───────────────────────────────────────────────────────────────

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // ── Constants ───────────────────────────────────────────────────────────

    /**
     * @notice Hard cap on total supply. Safety backstop against issuance
     *         bugs; not a meaningful economic constraint at this size
     *         (1B AUXR ≈ $100B at the $100 NAV reference).
     */
    uint256 public constant MAX_SUPPLY = 1_000_000_000 ether;

    // ── Events ──────────────────────────────────────────────────────────────

    /// @notice Emitted on every successful mint via `mint()`.
    /// @param to     Recipient address.
    /// @param amount Amount minted (18 decimals).
    /// @param refId  Off-chain reconciliation id (e.g. the off-chain burn
    ///               event id) so the backend can match this on-chain
    ///               mint to its off-chain counterpart.
    event AuxrMinted(address indexed to, uint256 amount, bytes32 indexed refId);

    /// @notice Emitted on every successful burn via `burnWithRef()`.
    /// @param from   Account whose tokens were burned (always msg.sender).
    /// @param amount Amount burned (18 decimals).
    /// @param refId  Off-chain reconciliation id.
    event AuxrBurned(address indexed from, uint256 amount, bytes32 indexed refId);

    // ── Constructor ─────────────────────────────────────────────────────────

    /**
     * @param admin Initial admin address. Granted DEFAULT_ADMIN_ROLE,
     *              MINTER_ROLE, and PAUSER_ROLE. Strongly recommended to
     *              be a Safe multisig in production; MINTER_ROLE should
     *              then be granted to the backend signer and revoked
     *              from admin post-deployment.
     */
    constructor(address admin)
        ERC20("Auxite Reserve", "AUXR")
        ERC20Permit("Auxite Reserve")
    {
        require(admin != address(0), "AUXR: admin is zero address");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    // ── Mint / Burn ─────────────────────────────────────────────────────────

    /**
     * @notice Mint AUXR to a recipient address.
     * @dev    Only callable by MINTER_ROLE. The Auxite backend must have
     *         already burned an equivalent off-chain balance (or be
     *         performing an initial-seed / market-maker mint authorized
     *         by treasury operations).
     *
     *         Reverts if `to` is the zero address (ERC20 default), if the
     *         contract is paused, or if minting would exceed MAX_SUPPLY.
     *
     * @param to     Recipient of the minted AUXR.
     * @param amount AUXR amount (18 decimals).
     * @param refId  Off-chain reconciliation id. Indexed in the event
     *               for efficient log-based reconciliation.
     */
    function mint(address to, uint256 amount, bytes32 refId)
        external
        onlyRole(MINTER_ROLE)
    {
        require(totalSupply() + amount <= MAX_SUPPLY, "AUXR: exceeds MAX_SUPPLY");
        _mint(to, amount);
        emit AuxrMinted(to, amount, refId);
    }

    /**
     * @notice Burn AUXR from the caller with an off-chain reconciliation id.
     * @dev    Use this (instead of plain ERC20Burnable.burn) when depositing
     *         back to Auxite for off-chain credit, so the backend can
     *         match the burn to its corresponding off-chain mint event.
     *
     *         Plain `burn(amount)` and `burnFrom(from, amount)` remain
     *         available via ERC20Burnable for users who simply want to
     *         destroy their tokens with no off-chain side-effect.
     *
     * @param amount AUXR amount to burn (18 decimals).
     * @param refId  Off-chain reconciliation id.
     */
    function burnWithRef(uint256 amount, bytes32 refId) external {
        _burn(_msgSender(), amount);
        emit AuxrBurned(_msgSender(), amount, refId);
    }

    // ── Emergency Pause ─────────────────────────────────────────────────────

    /**
     * @notice Pause all token transfers (including mints and burns).
     * @dev    Only callable by PAUSER_ROLE. Intended for emergency response
     *         to discovered vulnerabilities or compromised keys.
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @notice Resume transfers after a pause.
     * @dev    Only callable by PAUSER_ROLE.
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // ── Required Overrides ──────────────────────────────────────────────────

    /// @dev Hook required when combining ERC20 with ERC20Pausable in OZ 5.x.
    ///      Routes all balance changes through the pause check.
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        super._update(from, to, value);
    }
}

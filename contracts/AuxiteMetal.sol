// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AuxiteMetal
 * @notice Canonical on-chain ownership ledger for an Auxite tokenized precious
 *         metal (AUXG / AUXS / AUXPT / AUXPD). One contract is deployed per
 *         metal via the constructor (name/symbol).
 *
 *         WHAT THIS IS (and how it should be classified):
 *           - The blockchain IS the per-investor record of ownership: every
 *             investor's holding is minted to that investor's own (custodied)
 *             address, not pooled in a single treasury. Transfers, holder
 *             counts, and totalSupply are all meaningful on-chain.
 *           - Supply is reconciled to the custodian's allocation record
 *             (Silver Bullion, Singapore) and the physical metal is independently
 *             attested by a third party (The Network Firm). 1 token = 1 gram of
 *             allocated physical metal (3 decimals → 1 raw unit = 1 milligram).
 *           - Investor servicing (subscription, redemption, fiat/crypto funding
 *             across multiple rails) is performed by Auxite as a custodial
 *             intermediary and settled here as a mint (subscribe) or burn
 *             (redeem). This maps to rwa.xyz "On-chain Represented": the chain
 *             records ownership; investor interactions occur off-chain through
 *             the issuer. It is deliberately NOT a passive "digital twin".
 *
 *         TRUST MODEL:
 *           - DEFAULT_ADMIN_ROLE: Auxite governance multisig (Safe). May grant /
 *             revoke MINTER_ROLE and update the reserve-info pointer.
 *           - MINTER_ROLE: the reconciliation signer that mints/burns to keep
 *             on-chain supply in lockstep with custodian-allocated grams.
 *           - The contract does not custody payment and cannot be drained; it
 *             holds only balances + supply. Physical backing lives off-chain at
 *             the custodian and is proven by attestation + daily reconciliation,
 *             not enforced by this contract.
 */
contract AuxiteMetal is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// Always 3 — 1 gram = 1000 raw units (1 raw unit = 1 milligram).
    uint8 private constant _DECIMALS = 3;

    /// Off-chain pointer (custodian allocation / attestation / reserve page).
    /// Lets indexers (rwa.xyz, DefiLlama) and explorers surface proof-of-reserve.
    string public reserveInfoURI;

    /// Emitted whenever the daily reconciliation settles a net change for a user.
    event Reconciled(address indexed account, int256 netAmount, string reason);

    /// Emitted when a holding is burned because the investor redeemed.
    event Redeemed(address indexed account, uint256 amount);

    /// Emitted when admin updates the off-chain reserve pointer.
    event ReserveInfoUpdated(string uri);

    constructor(
        string memory name_,
        string memory symbol_,
        address admin,
        string memory reserveInfoURI_
    ) ERC20(name_, symbol_) {
        require(admin != address(0), "admin=0");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin); // bootstrap; revoke after wiring the signer
        reserveInfoURI = reserveInfoURI_;
        emit ReserveInfoUpdated(reserveInfoURI_);
    }

    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Subscription (mint) — credit an investor's address with allocated grams
    // ─────────────────────────────────────────────────────────────────────────

    /// Mint `amount` raw units (milligrams) to a single investor address.
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
        emit Reconciled(to, int256(amount), "subscribe");
    }

    /// Gas-efficient per-investor reconciliation: mint to many addresses at once.
    function mintBatch(
        address[] calldata to,
        uint256[] calldata amounts
    ) external onlyRole(MINTER_ROLE) {
        require(to.length == amounts.length, "len mismatch");
        for (uint256 i = 0; i < to.length; i++) {
            _mint(to[i], amounts[i]);
            emit Reconciled(to[i], int256(amounts[i]), "subscribe");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Redemption / downward reconciliation (burn)
    // ─────────────────────────────────────────────────────────────────────────

    /// Burn `amount` from an investor address on redemption (custodial: Auxite
    /// holds the investor's key, so no ERC-20 allowance is required).
    function burnFrom(address from, uint256 amount) external onlyRole(MINTER_ROLE) {
        _burn(from, amount);
        emit Redeemed(from, amount);
    }

    /// Batch counterpart for redemptions / refunds during reconciliation.
    function burnFromBatch(
        address[] calldata from,
        uint256[] calldata amounts
    ) external onlyRole(MINTER_ROLE) {
        require(from.length == amounts.length, "len mismatch");
        for (uint256 i = 0; i < from.length; i++) {
            _burn(from[i], amounts[i]);
            emit Redeemed(from[i], amounts[i]);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────────────────────────────────

    function setReserveInfoURI(string calldata uri)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        reserveInfoURI = uri;
        emit ReserveInfoUpdated(uri);
    }
}

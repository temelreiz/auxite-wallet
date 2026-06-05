// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AuxiteMetalMirror
 * @notice Display-only ERC-20 used to mirror Auxite's off-chain custodial
 *         ledger onto Base so RWA observatories (rwa.xyz et al.) and basic
 *         block explorers can read a meaningful Total Supply / Holder count.
 *
 *         IMPORTANT — this is NOT the user-facing metal token. The real
 *         buy/sell flow lives on the V8 contracts at:
 *           AUXG  0x390164702040b509a3d752243f92c2ac0318989d
 *           AUXS  0x82f6eb8ba5c84c8fd395b25a7a40ade08f0868aa
 *           AUXPT 0x119de594170b68561b1761ae1246c5154f94705d
 *           AUXPD 0xe051b2603617277ab50c509f5a38c16056c1c908
 *
 *         The V8 contracts work as designed (USDC-backed, `buy()`-only).
 *         This mirror exists strictly so the off-chain claims (card buys
 *         that never touch chain) get represented on rwa.xyz as well.
 *
 *         Behaviour:
 *           - 3 decimals (1 gram = 1000 raw units, matching V8)
 *           - DEFAULT_ADMIN_ROLE: deployer, may grant/revoke MINTER_ROLE
 *           - MINTER_ROLE: may mint to / burn from any address
 *           - No buy/sell, no payment, no reserve proof — it's a ledger
 *             mirror, not a financial product
 *
 *         Auditing: this contract holds no value, intentionally does not
 *         take payment, and cannot be drained. The only state it tracks
 *         is balances + supply. Audit not necessary.
 */
contract AuxiteMetalMirror is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// Always 3 — locks the contract to the same precision as V8 so the
    /// gram count line up 1:1 in rwa.xyz columns.
    uint8 private constant _DECIMALS = 3;

    constructor(
        string memory name_,
        string memory symbol_,
        address admin
    ) ERC20(name_, symbol_) {
        require(admin != address(0), "admin=0");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin); // bootstrap; can be revoked later
    }

    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }

    /// Mint mirrored grams to `to`. Called by the daily rwa-mint-sync cron
    /// once it's computed the delta between off-chain claims and on-chain
    /// supply. Reverts unless caller has MINTER_ROLE.
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /// Burn mirrored grams from `from`. Symmetric counterpart to mint —
    /// used when off-chain claims shrink (refunds, redemptions, etc.) so
    /// the mirror tracks the ledger downward as well as upward.
    function burnFrom(address from, uint256 amount) external onlyRole(MINTER_ROLE) {
        _burn(from, amount);
    }
}

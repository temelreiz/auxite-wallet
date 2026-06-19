// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title  Auxite Reserve Attestation Registry
 * @author Auxite
 * @notice On-chain proof-of-reserve feed. An independent attestor (e.g. The
 *         Network Firm) periodically posts a signed snapshot of physical metal
 *         reserves vs. outstanding token supply. Each posting anchors the
 *         keccak256 hash of the full off-chain signed report, so anyone can
 *         fetch that report, recompute the hash, and confirm it matches what
 *         was committed on-chain at a given block.
 *
 * @dev    WHY THIS EXISTS
 *         ---------------
 *         Previously, reserve backing was tracked off-chain (Redis ledger +
 *         /proof-of-reserves dashboard) and the attestor was named only in
 *         contract docstrings. Institutional due-diligence wants the proof to
 *         be (a) on-chain, (b) independently signed, and (c) timestamped and
 *         tamper-evident. This registry provides the on-chain, append-only
 *         half; the off-chain `reserve-attestation.ts` library produces the
 *         signed report whose hash is committed here.
 *
 *         WHAT IS COMMITTED
 *         -----------------
 *         Per attestation: an as-of timestamp, the report hash + URI, and for
 *         each metal the reserve grams, the grams required to back supply, and
 *         the backing ratio in basis points (10000 = 100%). Grams are stored
 *         as milligrams (grams * 1000) to keep integer precision.
 *
 *         TRUST MODEL
 *         -----------
 *         This contract does not enforce the truth of the figures — it makes
 *         them public, ordered, timestamped, and attributable to an ATTESTOR_ROLE
 *         key. Trust comes from that key being held by an independent attestor
 *         and from the off-chain report being independently verifiable.
 *
 *         ROLES
 *         -----
 *         DEFAULT_ADMIN_ROLE — Grants/revokes ATTESTOR_ROLE. Held by the Auxite
 *                              governance multisig.
 *         ATTESTOR_ROLE      — Can post attestations. Held by the independent
 *                              attestor's signing key (The Network Firm).
 */
contract ReserveAttestation is AccessControl {
    // ── Roles ───────────────────────────────────────────────────────────────

    bytes32 public constant ATTESTOR_ROLE = keccak256("ATTESTOR_ROLE");

    // ── Types ───────────────────────────────────────────────────────────────

    /// @notice Per-metal reserve figures for one attestation.
    /// @dev    Grams stored as milligrams (grams * 1000) for integer precision.
    struct MetalReserve {
        uint256 reservesMg; // physical metal reserved, in milligrams
        uint256 requiredMg; // milligrams required to back current supply
        uint32 backingBps; // reservesMg / requiredMg in bps (10000 = 100%)
    }

    /// @notice Calldata input for one metal when posting an attestation.
    /// @dev    Packing the per-metal fields into a struct (rather than parallel
    ///         arrays) keeps `postAttestation` under the stack-depth limit and
    ///         removes the length-mismatch failure mode.
    struct MetalInput {
        bytes32 symbol; // metal symbol, e.g. encodeBytes32("AUXG")
        uint256 reservesMg;
        uint256 requiredMg;
        uint32 backingBps;
    }

    /// @notice Header for one attestation posting.
    struct Attestation {
        uint64 asOf; // attestor-reported as-of time (unix seconds)
        uint64 postedAt; // block.timestamp when committed
        address attestor; // ATTESTOR_ROLE account that posted
        bytes32 reportHash; // keccak256 of the full off-chain signed report
        string reportURI; // pointer to the full report (https/ipfs)
        bytes32[] symbols; // metal symbols covered (e.g. "AUXG")
    }

    // ── Storage ─────────────────────────────────────────────────────────────

    /// @dev Attestation id => header. Ids are 1-based; 0 means "none".
    mapping(uint256 => Attestation) private _attestations;
    /// @dev Attestation id => metal symbol => per-metal figures.
    mapping(uint256 => mapping(bytes32 => MetalReserve)) private _metals;

    /// @notice Total number of attestations posted (also the latest id).
    uint256 public attestationCount;

    // ── Events ──────────────────────────────────────────────────────────────

    /// @notice Emitted on every successful `postAttestation`.
    /// @param id          1-based attestation id.
    /// @param asOf        Attestor-reported as-of time.
    /// @param attestor    Account that posted.
    /// @param reportHash  keccak256 of the full off-chain signed report.
    /// @param weakestBps  Minimum backing ratio across all covered metals (bps).
    event AttestationPosted(
        uint256 indexed id,
        uint64 indexed asOf,
        address indexed attestor,
        bytes32 reportHash,
        uint32 weakestBps
    );

    // ── Errors ──────────────────────────────────────────────────────────────

    error NoMetals();
    error NonMonotonicAsOf(uint64 provided, uint64 lastAsOf);
    error UnknownAttestation(uint256 id);

    // ── Constructor ─────────────────────────────────────────────────────────

    /// @param admin    Governance multisig (DEFAULT_ADMIN_ROLE).
    /// @param attestor Independent attestor signing key (ATTESTOR_ROLE). May be
    ///                 the zero address to grant later via the admin role.
    constructor(address admin, address attestor) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        if (attestor != address(0)) {
            _grantRole(ATTESTOR_ROLE, attestor);
        }
    }

    // ── Write ───────────────────────────────────────────────────────────────

    /**
     * @notice Post a new reserve attestation. Append-only; ids increment.
     * @dev    Parallel arrays are indexed by metal. `asOf` must be >= the most
     *         recent attestation's `asOf` (monotonic, so the feed is ordered).
     * @param asOf       Attestor-reported as-of time (unix seconds).
     * @param reportHash keccak256 of the full off-chain signed report.
     * @param reportURI  Pointer to the full report (https/ipfs).
     * @param metals     Per-metal figures (symbol + milligrams + bps).
     * @return id        The new 1-based attestation id.
     */
    function postAttestation(
        uint64 asOf,
        bytes32 reportHash,
        string calldata reportURI,
        MetalInput[] calldata metals
    ) external onlyRole(ATTESTOR_ROLE) returns (uint256 id) {
        uint256 n = metals.length;
        if (n == 0) revert NoMetals();

        if (attestationCount != 0) {
            uint64 lastAsOf = _attestations[attestationCount].asOf;
            if (asOf < lastAsOf) revert NonMonotonicAsOf(asOf, lastAsOf);
        }

        id = ++attestationCount;

        Attestation storage a = _attestations[id];
        a.asOf = asOf;
        a.postedAt = uint64(block.timestamp);
        a.attestor = msg.sender;
        a.reportHash = reportHash;
        a.reportURI = reportURI;

        uint32 weakest = type(uint32).max;
        for (uint256 i = 0; i < n; ++i) {
            MetalInput calldata m = metals[i];
            a.symbols.push(m.symbol);
            _metals[id][m.symbol] = MetalReserve({
                reservesMg: m.reservesMg,
                requiredMg: m.requiredMg,
                backingBps: m.backingBps
            });
            if (m.backingBps < weakest) weakest = m.backingBps;
        }

        emit AttestationPosted(id, asOf, msg.sender, reportHash, weakest);
    }

    // ── Read ────────────────────────────────────────────────────────────────

    /// @notice Full header for an attestation id. Reverts if unknown.
    function getAttestation(
        uint256 id
    ) external view returns (Attestation memory) {
        if (id == 0 || id > attestationCount) revert UnknownAttestation(id);
        return _attestations[id];
    }

    /// @notice The most recent attestation header. Reverts if none posted.
    function latestAttestation() external view returns (Attestation memory) {
        if (attestationCount == 0) revert UnknownAttestation(0);
        return _attestations[attestationCount];
    }

    /// @notice Per-metal figures for a given attestation + symbol.
    function getMetal(
        uint256 id,
        bytes32 symbol
    ) external view returns (MetalReserve memory) {
        if (id == 0 || id > attestationCount) revert UnknownAttestation(id);
        return _metals[id][symbol];
    }

    /// @notice Per-metal figures from the most recent attestation.
    function latestMetal(
        bytes32 symbol
    ) external view returns (MetalReserve memory) {
        if (attestationCount == 0) revert UnknownAttestation(0);
        return _metals[attestationCount][symbol];
    }

    /**
     * @notice True if the latest attestation was posted within `maxAgeSeconds`.
     *         Integrators (and a future on-chain redemption guard) can use this
     *         as a freshness circuit-breaker: a stale PoR feed should halt
     *         issuance-sensitive actions.
     * @dev    Returns false when no attestation has ever been posted.
     */
    function isFresh(uint64 maxAgeSeconds) external view returns (bool) {
        if (attestationCount == 0) return false;
        uint64 postedAt = _attestations[attestationCount].postedAt;
        return block.timestamp <= uint256(postedAt) + maxAgeSeconds;
    }

    /// @notice Minimum backing ratio (bps) across all metals in an attestation.
    function weakestBackingBps(uint256 id) external view returns (uint32) {
        if (id == 0 || id > attestationCount) revert UnknownAttestation(id);
        bytes32[] memory symbols = _attestations[id].symbols;
        uint32 weakest = type(uint32).max;
        for (uint256 i = 0; i < symbols.length; ++i) {
            uint32 bps = _metals[id][symbols[i]].backingBps;
            if (bps < weakest) weakest = bps;
        }
        return weakest;
    }
}

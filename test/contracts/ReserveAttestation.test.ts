// ============================================================================
// ReserveAttestation.sol — test suite
// ----------------------------------------------------------------------------
// Covers: deployment + roles, posting (access control, length/empty guards,
// monotonic asOf), reads (header/metal/latest), freshness circuit-breaker,
// weakest-backing computation, and the AttestationPosted event.
//
// Run: npx hardhat test
// ============================================================================

import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const AUXG = ethers.encodeBytes32String("AUXG");
const AUXS = ethers.encodeBytes32String("AUXS");
const AUXPT = ethers.encodeBytes32String("AUXPT");
const AUXPD = ethers.encodeBytes32String("AUXPD");
const REPORT_HASH = ethers.keccak256(ethers.toUtf8Bytes("report-001"));
const REPORT_URI = "https://auxite.io/proof-of-reserves/2026-06-19.json";

describe("ReserveAttestation", function () {
  async function deploy() {
    const [admin, attestor, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReserveAttestation");
    const reg = await Factory.deploy(
      await admin.getAddress(),
      await attestor.getAddress()
    );
    await reg.waitForDeployment();
    return { reg, admin, attestor, outsider };
  }

  // Four metals: gold slightly over-backed, others exactly 100%.
  // MetalInput tuple: [symbol, reservesMg, requiredMg, backingBps]
  const metals = [
    [AUXG, 1_000_500_000n, 1_000_000_000n, 10005n],
    [AUXS, 5_000_000_000n, 5_000_000_000n, 10000n],
    [AUXPT, 200_000_000n, 200_000_000n, 10000n],
    [AUXPD, 100_000_000n, 100_000_000n, 10000n],
  ];

  async function post(reg: any, attestor: any, asOf: number) {
    return reg
      .connect(attestor)
      .postAttestation(asOf, REPORT_HASH, REPORT_URI, metals);
  }

  // ── Deployment ──────────────────────────────────────────────────────────

  describe("Deployment", function () {
    it("grants DEFAULT_ADMIN to admin and ATTESTOR to attestor", async function () {
      const { reg, admin, attestor } = await deploy();
      const ADMIN = await reg.DEFAULT_ADMIN_ROLE();
      const ATTESTOR = await reg.ATTESTOR_ROLE();
      expect(await reg.hasRole(ADMIN, await admin.getAddress())).to.equal(true);
      expect(await reg.hasRole(ATTESTOR, await attestor.getAddress())).to.equal(
        true
      );
    });

    it("starts with zero attestations", async function () {
      const { reg } = await deploy();
      expect(await reg.attestationCount()).to.equal(0n);
    });

    it("isFresh is false before any attestation", async function () {
      const { reg } = await deploy();
      expect(await reg.isFresh(86400)).to.equal(false);
    });

    it("supports a zero-address attestor (granted later)", async function () {
      const [admin] = await ethers.getSigners();
      const Factory = await ethers.getContractFactory("ReserveAttestation");
      const reg = await Factory.deploy(
        await admin.getAddress(),
        ethers.ZeroAddress
      );
      await reg.waitForDeployment();
      const ATTESTOR = await reg.ATTESTOR_ROLE();
      expect(await reg.hasRole(ATTESTOR, ethers.ZeroAddress)).to.equal(false);
    });
  });

  // ── Posting ─────────────────────────────────────────────────────────────

  describe("postAttestation", function () {
    it("posts and increments the id, emitting AttestationPosted", async function () {
      const { reg, attestor } = await deploy();
      const asOf = (await time.latest()) - 10;
      await expect(post(reg, attestor, asOf))
        .to.emit(reg, "AttestationPosted")
        .withArgs(1n, asOf, await attestor.getAddress(), REPORT_HASH, 10000n);
      expect(await reg.attestationCount()).to.equal(1n);
    });

    it("rejects callers without ATTESTOR_ROLE", async function () {
      const { reg, outsider } = await deploy();
      const asOf = await time.latest();
      await expect(post(reg, outsider, asOf)).to.be.reverted;
    });

    it("reverts on empty metals", async function () {
      const { reg, attestor } = await deploy();
      const asOf = await time.latest();
      await expect(
        reg
          .connect(attestor)
          .postAttestation(asOf, REPORT_HASH, REPORT_URI, [])
      ).to.be.revertedWithCustomError(reg, "NoMetals");
    });

    it("enforces monotonic asOf across postings", async function () {
      const { reg, attestor } = await deploy();
      const asOf = await time.latest();
      await post(reg, attestor, asOf);
      await expect(
        post(reg, attestor, asOf - 100)
      ).to.be.revertedWithCustomError(reg, "NonMonotonicAsOf");
    });

    it("allows equal asOf (monotonic non-decreasing)", async function () {
      const { reg, attestor } = await deploy();
      const asOf = await time.latest();
      await post(reg, attestor, asOf);
      await expect(post(reg, attestor, asOf)).to.not.be.reverted;
      expect(await reg.attestationCount()).to.equal(2n);
    });
  });

  // ── Reads ───────────────────────────────────────────────────────────────

  describe("Reads", function () {
    it("returns the stored header and per-metal figures", async function () {
      const { reg, attestor } = await deploy();
      const asOf = await time.latest();
      await post(reg, attestor, asOf);

      const a = await reg.getAttestation(1);
      expect(a.asOf).to.equal(BigInt(asOf));
      expect(a.attestor).to.equal(await attestor.getAddress());
      expect(a.reportHash).to.equal(REPORT_HASH);
      expect(a.reportURI).to.equal(REPORT_URI);
      expect(a.symbols.length).to.equal(4);

      const gold = await reg.getMetal(1, AUXG);
      expect(gold.reservesMg).to.equal(1_000_500_000n);
      expect(gold.requiredMg).to.equal(1_000_000_000n);
      expect(gold.backingBps).to.equal(10005n);
    });

    it("latestAttestation / latestMetal track the newest posting", async function () {
      const { reg, attestor } = await deploy();
      const asOf = await time.latest();
      await post(reg, attestor, asOf);
      await post(reg, attestor, asOf + 60);
      const latest = await reg.latestAttestation();
      expect(latest.asOf).to.equal(BigInt(asOf + 60));
      const gold = await reg.latestMetal(AUXG);
      expect(gold.backingBps).to.equal(10005n);
    });

    it("weakestBackingBps returns the minimum across metals", async function () {
      const { reg, attestor } = await deploy();
      const asOf = await time.latest();
      await post(reg, attestor, asOf);
      expect(await reg.weakestBackingBps(1)).to.equal(10000n);
    });

    it("reverts reads for unknown ids", async function () {
      const { reg } = await deploy();
      await expect(reg.getAttestation(1)).to.be.revertedWithCustomError(
        reg,
        "UnknownAttestation"
      );
      await expect(reg.latestAttestation()).to.be.revertedWithCustomError(
        reg,
        "UnknownAttestation"
      );
    });
  });

  // ── Freshness circuit-breaker ─────────────────────────────────────────────

  describe("isFresh", function () {
    it("is true right after posting and false once stale", async function () {
      const { reg, attestor } = await deploy();
      await post(reg, attestor, await time.latest());
      expect(await reg.isFresh(3600)).to.equal(true);
      await time.increase(3601);
      expect(await reg.isFresh(3600)).to.equal(false);
    });
  });
});

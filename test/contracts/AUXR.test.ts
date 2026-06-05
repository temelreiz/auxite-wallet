// ============================================================================
// AUXR.sol — comprehensive test suite
// ----------------------------------------------------------------------------
// Covers: deployment invariants, role-based access control, mint/burn/pause,
// MAX_SUPPLY enforcement, EIP-2612 permit, ERC20Burnable hooks, and the
// `burnWithRef` reconciliation event.
//
// Run: npx hardhat test
// ============================================================================

import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { Signer } from "ethers";

const ONE = 10n ** 18n;
const REF_ID = ethers.encodeBytes32String("test-ref-001");
const REF_ID_2 = ethers.encodeBytes32String("test-ref-002");
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

describe("AUXR", function () {
  async function deploy() {
    const [admin, minter, pauser, alice, bob, attacker] =
      await ethers.getSigners();

    const AUXR = await ethers.getContractFactory("AUXR");
    const auxr = await AUXR.deploy(await admin.getAddress());
    await auxr.waitForDeployment();

    return { auxr, admin, minter, pauser, alice, bob, attacker };
  }

  // ── Deployment ────────────────────────────────────────────────────────────

  describe("Deployment", function () {
    it("sets name and symbol", async function () {
      const { auxr } = await deploy();
      expect(await auxr.name()).to.equal("Auxite Reserve");
      expect(await auxr.symbol()).to.equal("AUXR");
    });

    it("uses 18 decimals (ERC20 default)", async function () {
      const { auxr } = await deploy();
      expect(await auxr.decimals()).to.equal(18);
    });

    it("starts with zero total supply", async function () {
      const { auxr } = await deploy();
      expect(await auxr.totalSupply()).to.equal(0n);
    });

    it("grants DEFAULT_ADMIN/MINTER/PAUSER to admin", async function () {
      const { auxr, admin } = await deploy();
      const adminAddr = await admin.getAddress();
      const DEFAULT_ADMIN_ROLE = await auxr.DEFAULT_ADMIN_ROLE();
      const MINTER_ROLE = await auxr.MINTER_ROLE();
      const PAUSER_ROLE = await auxr.PAUSER_ROLE();

      expect(await auxr.hasRole(DEFAULT_ADMIN_ROLE, adminAddr)).to.equal(true);
      expect(await auxr.hasRole(MINTER_ROLE, adminAddr)).to.equal(true);
      expect(await auxr.hasRole(PAUSER_ROLE, adminAddr)).to.equal(true);
    });

    it("reverts when admin is the zero address", async function () {
      const AUXR = await ethers.getContractFactory("AUXR");
      await expect(AUXR.deploy(ZERO_ADDRESS)).to.be.revertedWith(
        "AUXR: admin is zero address"
      );
    });

    it("exposes the correct MAX_SUPPLY constant", async function () {
      const { auxr } = await deploy();
      expect(await auxr.MAX_SUPPLY()).to.equal(1_000_000_000n * ONE);
    });
  });

  // ── Mint ──────────────────────────────────────────────────────────────────

  describe("Mint", function () {
    it("MINTER can mint to an account", async function () {
      const { auxr, admin, alice } = await deploy();
      const aliceAddr = await alice.getAddress();
      await expect(auxr.connect(admin).mint(aliceAddr, 100n * ONE, REF_ID))
        .to.emit(auxr, "AuxrMinted")
        .withArgs(aliceAddr, 100n * ONE, REF_ID);

      expect(await auxr.balanceOf(aliceAddr)).to.equal(100n * ONE);
      expect(await auxr.totalSupply()).to.equal(100n * ONE);
    });

    it("non-minter cannot mint", async function () {
      const { auxr, attacker, alice } = await deploy();
      await expect(
        auxr.connect(attacker).mint(await alice.getAddress(), 1n * ONE, REF_ID)
      )
        .to.be.revertedWithCustomError(auxr, "AccessControlUnauthorizedAccount");
    });

    it("reverts when minting would exceed MAX_SUPPLY", async function () {
      const { auxr, admin, alice } = await deploy();
      const aliceAddr = await alice.getAddress();
      const max = await auxr.MAX_SUPPLY();
      // Mint right up to the cap
      await auxr.connect(admin).mint(aliceAddr, max, REF_ID);
      // One wei more triggers the cap
      await expect(
        auxr.connect(admin).mint(aliceAddr, 1n, REF_ID_2)
      ).to.be.revertedWith("AUXR: exceeds MAX_SUPPLY");
    });

    it("reverts when minting to the zero address", async function () {
      const { auxr, admin } = await deploy();
      await expect(
        auxr.connect(admin).mint(ZERO_ADDRESS, 1n * ONE, REF_ID)
      ).to.be.revertedWithCustomError(auxr, "ERC20InvalidReceiver");
    });

    it("MINTER_ROLE can be granted to a new account", async function () {
      const { auxr, admin, minter, alice } = await deploy();
      const MINTER_ROLE = await auxr.MINTER_ROLE();
      await auxr.connect(admin).grantRole(MINTER_ROLE, await minter.getAddress());

      await expect(
        auxr.connect(minter).mint(await alice.getAddress(), 5n * ONE, REF_ID)
      ).to.emit(auxr, "AuxrMinted");
    });
  });

  // ── Burn ──────────────────────────────────────────────────────────────────

  describe("Burn", function () {
    it("burnWithRef burns caller's tokens and emits AuxrBurned", async function () {
      const { auxr, admin, alice } = await deploy();
      const aliceAddr = await alice.getAddress();
      await auxr.connect(admin).mint(aliceAddr, 50n * ONE, REF_ID);

      await expect(auxr.connect(alice).burnWithRef(20n * ONE, REF_ID_2))
        .to.emit(auxr, "AuxrBurned")
        .withArgs(aliceAddr, 20n * ONE, REF_ID_2);

      expect(await auxr.balanceOf(aliceAddr)).to.equal(30n * ONE);
      expect(await auxr.totalSupply()).to.equal(30n * ONE);
    });

    it("ERC20Burnable.burn works alongside burnWithRef", async function () {
      const { auxr, admin, alice } = await deploy();
      const aliceAddr = await alice.getAddress();
      await auxr.connect(admin).mint(aliceAddr, 50n * ONE, REF_ID);
      await auxr.connect(alice).burn(10n * ONE);
      expect(await auxr.balanceOf(aliceAddr)).to.equal(40n * ONE);
    });

    it("burnFrom respects allowance", async function () {
      const { auxr, admin, alice, bob } = await deploy();
      const aliceAddr = await alice.getAddress();
      const bobAddr = await bob.getAddress();
      await auxr.connect(admin).mint(aliceAddr, 50n * ONE, REF_ID);
      await auxr.connect(alice).approve(bobAddr, 30n * ONE);

      await auxr.connect(bob).burnFrom(aliceAddr, 25n * ONE);
      expect(await auxr.balanceOf(aliceAddr)).to.equal(25n * ONE);
      expect(await auxr.allowance(aliceAddr, bobAddr)).to.equal(5n * ONE);
    });

    it("reverts on insufficient balance", async function () {
      const { auxr, alice } = await deploy();
      await expect(
        auxr.connect(alice).burnWithRef(1n * ONE, REF_ID)
      ).to.be.revertedWithCustomError(auxr, "ERC20InsufficientBalance");
    });
  });

  // ── Pause / Unpause ───────────────────────────────────────────────────────

  describe("Pause", function () {
    it("PAUSER can pause and unpause", async function () {
      const { auxr, admin } = await deploy();
      await auxr.connect(admin).pause();
      expect(await auxr.paused()).to.equal(true);
      await auxr.connect(admin).unpause();
      expect(await auxr.paused()).to.equal(false);
    });

    it("non-pauser cannot pause", async function () {
      const { auxr, attacker } = await deploy();
      await expect(auxr.connect(attacker).pause()).to.be.revertedWithCustomError(
        auxr,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("blocks transfers while paused", async function () {
      const { auxr, admin, alice, bob } = await deploy();
      const aliceAddr = await alice.getAddress();
      const bobAddr = await bob.getAddress();
      await auxr.connect(admin).mint(aliceAddr, 10n * ONE, REF_ID);

      await auxr.connect(admin).pause();
      await expect(
        auxr.connect(alice).transfer(bobAddr, 1n * ONE)
      ).to.be.revertedWithCustomError(auxr, "EnforcedPause");

      await auxr.connect(admin).unpause();
      await auxr.connect(alice).transfer(bobAddr, 1n * ONE);
      expect(await auxr.balanceOf(bobAddr)).to.equal(1n * ONE);
    });

    it("blocks mint while paused", async function () {
      const { auxr, admin, alice } = await deploy();
      await auxr.connect(admin).pause();
      await expect(
        auxr.connect(admin).mint(await alice.getAddress(), 1n * ONE, REF_ID)
      ).to.be.revertedWithCustomError(auxr, "EnforcedPause");
    });

    it("blocks burn while paused", async function () {
      const { auxr, admin, alice } = await deploy();
      await auxr.connect(admin).mint(await alice.getAddress(), 5n * ONE, REF_ID);
      await auxr.connect(admin).pause();
      await expect(
        auxr.connect(alice).burnWithRef(1n * ONE, REF_ID_2)
      ).to.be.revertedWithCustomError(auxr, "EnforcedPause");
    });
  });

  // ── ERC20 transfers ───────────────────────────────────────────────────────

  describe("ERC20", function () {
    it("transfer moves tokens", async function () {
      const { auxr, admin, alice, bob } = await deploy();
      const aliceAddr = await alice.getAddress();
      const bobAddr = await bob.getAddress();
      await auxr.connect(admin).mint(aliceAddr, 10n * ONE, REF_ID);
      await auxr.connect(alice).transfer(bobAddr, 3n * ONE);
      expect(await auxr.balanceOf(aliceAddr)).to.equal(7n * ONE);
      expect(await auxr.balanceOf(bobAddr)).to.equal(3n * ONE);
    });

    it("approve + transferFrom respects allowance", async function () {
      const { auxr, admin, alice, bob } = await deploy();
      const aliceAddr = await alice.getAddress();
      const bobAddr = await bob.getAddress();
      await auxr.connect(admin).mint(aliceAddr, 10n * ONE, REF_ID);
      await auxr.connect(alice).approve(bobAddr, 5n * ONE);
      await auxr.connect(bob).transferFrom(aliceAddr, bobAddr, 4n * ONE);
      expect(await auxr.balanceOf(bobAddr)).to.equal(4n * ONE);
      expect(await auxr.allowance(aliceAddr, bobAddr)).to.equal(1n * ONE);
    });
  });

  // ── EIP-2612 Permit ───────────────────────────────────────────────────────

  describe("Permit (EIP-2612)", function () {
    it("issues a gasless approval via signature", async function () {
      const { auxr, admin, alice, bob } = await deploy();
      const aliceAddr = await alice.getAddress();
      const bobAddr = await bob.getAddress();
      await auxr.connect(admin).mint(aliceAddr, 100n * ONE, REF_ID);

      const value = 50n * ONE;
      const deadline = BigInt((await time.latest()) + 3600);
      const nonce = await auxr.nonces(aliceAddr);

      const domain = {
        name: "Auxite Reserve",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await auxr.getAddress(),
      };
      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };
      const message = {
        owner: aliceAddr,
        spender: bobAddr,
        value,
        nonce,
        deadline,
      };

      const signature = await (alice as unknown as Signer).signTypedData!(
        domain,
        types,
        message
      );
      const { v, r, s } = ethers.Signature.from(signature);

      await auxr.permit(aliceAddr, bobAddr, value, deadline, v, r, s);
      expect(await auxr.allowance(aliceAddr, bobAddr)).to.equal(value);
    });
  });

  // ── Role admin ────────────────────────────────────────────────────────────

  describe("Role administration", function () {
    it("DEFAULT_ADMIN can revoke MINTER_ROLE", async function () {
      const { auxr, admin } = await deploy();
      const MINTER_ROLE = await auxr.MINTER_ROLE();
      const adminAddr = await admin.getAddress();
      expect(await auxr.hasRole(MINTER_ROLE, adminAddr)).to.equal(true);
      await auxr.connect(admin).revokeRole(MINTER_ROLE, adminAddr);
      expect(await auxr.hasRole(MINTER_ROLE, adminAddr)).to.equal(false);
    });

    it("non-admin cannot grant roles", async function () {
      const { auxr, attacker, alice } = await deploy();
      const MINTER_ROLE = await auxr.MINTER_ROLE();
      await expect(
        auxr
          .connect(attacker)
          .grantRole(MINTER_ROLE, await alice.getAddress())
      ).to.be.revertedWithCustomError(auxr, "AccessControlUnauthorizedAccount");
    });
  });
});

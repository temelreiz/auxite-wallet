# AUXITE Key Ceremony Protocol

**Version:** 1.0
**Last Updated:** 2026-02-15
**Classification:** CONFIDENTIAL — Restricted Distribution

---

## 1. Purpose

This document defines the secure process for generating, storing, and rotating cryptographic keys used by the Auxite platform. The key ceremony ensures that no single person has access to complete key material at any time.

---

## 2. Key Inventory

| Key | Purpose | Storage | Rotation |
|-----|---------|---------|----------|
| Treasury Private Key | Signs treasury transactions | Hardware wallet (Ledger/Trezor) | On compromise or annually |
| Multisig Owner Keys | Safe multisig signers | Individual hardware wallets | On personnel change |
| JWT Signing Secret | Signs user auth tokens | Vercel env var (NEXTAUTH_SECRET) | Quarterly |
| Upstash Redis Token | Database access | Vercel env var | On compromise |
| API Keys (GoldAPI, CoinGecko, etc.) | Third-party services | Vercel env vars | Annually |
| Cloudflare API Token | DNS/CDN management | Cloudflare dashboard | Annually |
| Vercel Token | Deployment | GitHub secrets | Annually |
| DKIM Signing Key | Email authentication | DNS TXT record | Annually |

---

## 3. Key Generation Ceremony

### 3.1 Prerequisites

- **Participants:** Minimum 3 authorized personnel
  - Key Ceremony Lead (typically CTO)
  - Witness 1 (CEO or Security Lead)
  - Witness 2 (Senior Engineer or Board Member)
- **Location:** Secure, private room with no cameras/recording
- **Equipment:**
  - Air-gapped computer (never connected to internet)
  - New, factory-sealed hardware wallets (Ledger Nano X or Trezor Model T)
  - Tamper-evident bags for seed phrase storage
  - Metal seed phrase backup plates (fire/water resistant)
  - Dice (for additional entropy, if needed)
  - Printed copy of this protocol

### 3.2 Environment Setup

1. Verify air-gapped computer has no wireless capabilities (WiFi/Bluetooth disabled at hardware level)
2. Boot from clean, verified OS (Tails USB recommended)
3. Verify hardware wallet firmware is authentic (check hash against manufacturer's published hash)
4. Close all blinds/curtains, ensure no recording devices present
5. All participants place phones in separate room

### 3.3 Key Generation Steps

#### For Hardware Wallet Keys (Treasury, Multisig):

1. **Initialize** hardware wallet from factory-sealed state
2. **Generate** new seed phrase on the device
   - Use 24-word seed (BIP-39)
   - Device generates seed internally — never type seed into any computer
3. **Record** seed phrase:
   - Write on 2 separate metal plates (not paper)
   - Each participant verifies written words match device display
   - NO photos, NO digital copies
4. **Verify** seed by resetting device and restoring from recorded seed
5. **Derive** required addresses:
   - Treasury address (e.g., Ethereum, m/44'/60'/0'/0/0)
   - Record public addresses (these are safe to store digitally)
6. **Seal** seed backups in tamper-evident bags
   - Sign across seal with permanent marker
   - Record bag serial numbers

#### For Application Secrets (JWT, API keys):

1. On air-gapped computer, generate using:
   ```bash
   openssl rand -base64 64
   ```
2. Record on paper (2 copies)
3. Transfer to Vercel via secure, direct entry (not copy-paste from network)
4. Destroy paper copies after confirming deployment works

### 3.4 Distribution and Storage

| Seed Backup | Storage Location | Access |
|-------------|-----------------|--------|
| Copy 1 | Bank safe deposit box (Location A) | Key Ceremony Lead + Witness 1 |
| Copy 2 | Bank safe deposit box (Location B) | Key Ceremony Lead + Witness 2 |
| Hardware Wallet | Secure office safe | Key Ceremony Lead |

**Rules:**
- No single person can access both seed backup copies
- Both backup locations must be geographically separate (different banks, different cities preferred)
- Safe deposit box access requires 2 authorized signers

---

## 4. Key Rotation Ceremony

### 4.1 Scheduled Rotation

| Key Type | Frequency |
|----------|-----------|
| JWT/Application Secrets | Quarterly |
| API Keys | Annually |
| Hardware Wallet Keys | Annually or on personnel change |
| Emergency Rotation | On any suspected compromise |

### 4.2 Rotation Process

1. Schedule ceremony with all required participants
2. Generate new keys following Section 3.3
3. **Transition period:**
   - For JWT: Deploy new secret, old tokens expire naturally (24h)
   - For API keys: Update in Vercel, verify services work, then revoke old keys
   - For wallet keys: Transfer funds from old wallet to new, then decommission old
4. Update key inventory (Section 2)
5. Destroy old key material:
   - Paper: Cross-cut shred
   - Metal plates: Grind/melt
   - Hardware wallets: Factory reset 3x, then physically destroy
6. Log rotation in ceremony log (Section 6)

---

## 5. Emergency Key Compromise Protocol

**If a key is suspected compromised:**

1. **IMMEDIATELY** notify all ceremony participants
2. **DO NOT** use the compromised key for any further operations
3. **TRANSFER** all assets from compromised wallet to secure backup wallet
4. **REVOKE** compromised API keys/tokens immediately
5. **INITIATE** emergency key rotation ceremony (can be done with 2 of 3 participants)
6. **INVESTIGATE** how compromise occurred
7. **DOCUMENT** in incident report (see incident-playbooks.md)

---

## 6. Ceremony Log

Record every key ceremony event:

```
| Date | Type | Participants | Keys Generated/Rotated | Notes |
|------|------|-------------|----------------------|-------|
| YYYY-MM-DD | Initial Generation | [Names] | Treasury Key, Multisig Keys | First ceremony |
| YYYY-MM-DD | Scheduled Rotation | [Names] | JWT Secret | Quarterly rotation |
```

---

## 7. Verification Checklist

Before closing ceremony, verify:

- [ ] All keys tested and functional
- [ ] Seed phrases verified by restore test
- [ ] Backup copies sealed in tamper-evident bags
- [ ] Bag serial numbers recorded
- [ ] Storage locations confirmed and locked
- [ ] Key inventory (Section 2) updated
- [ ] Ceremony log (Section 6) updated
- [ ] All temporary materials destroyed (paper notes, USB drives)
- [ ] Air-gapped computer wiped and powered off
- [ ] All participants confirm: "No key material was photographed, copied digitally, or transmitted electronically"

---

## 8. Audit

- This document is reviewed and updated at every key ceremony
- External security auditor reviews this process annually
- Any deviations from this protocol must be documented and reviewed

> **WARNING:** Failure to follow this protocol puts all Auxite user funds at risk. Every step exists for a reason. If any step cannot be completed, STOP the ceremony and consult with security lead before proceeding.

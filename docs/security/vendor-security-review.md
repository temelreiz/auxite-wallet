# AUXITE Vendor Security Review

**Version:** 1.0
**Last Updated:** 2026-02-15
**Classification:** INTERNAL

---

## 1. Purpose

This document tracks the security posture of all third-party services and dependencies used by the Auxite platform. Each vendor is assessed for risk level, data exposure, and compliance.

---

## 2. Vendor Risk Matrix

### Risk Levels
- **Critical:** Has access to funds, private keys, or can execute transactions
- **High:** Has access to user PII, authentication data, or can affect service availability
- **Medium:** Has access to non-sensitive operational data
- **Low:** No data access, tooling only

---

## 3. Vendor Assessment

### 3.1 CRITICAL Risk Vendors

#### Upstash (Redis Database)
| Attribute | Details |
|-----------|---------|
| **Service** | Managed Redis (sessions, rate limiting, data cache) |
| **Data Stored** | User sessions, email/wallet mappings, balances cache, admin audit logs |
| **Risk Level** | CRITICAL |
| **SOC 2** | Yes — Type II |
| **Encryption at Rest** | Yes (AES-256) |
| **Encryption in Transit** | Yes (TLS 1.2+) |
| **Data Region** | EU (configurable) |
| **Access Control** | API token per database, IP whitelist available |
| **Backup** | Automatic daily snapshots |
| **SLA** | 99.99% uptime |
| **Review Status** | ✅ Approved |
| **Next Review** | 2026-08-15 |
| **Action Items** | Enable IP whitelist for production database |

#### WalletConnect
| Attribute | Details |
|-----------|---------|
| **Service** | Web3 wallet connection protocol |
| **Data Exposed** | Wallet addresses, transaction signing requests |
| **Risk Level** | CRITICAL |
| **Audit Status** | Open-source, multiple audits |
| **Encryption** | End-to-end encrypted relay |
| **Review Status** | ✅ Approved |
| **Next Review** | 2026-08-15 |
| **Action Items** | Monitor for protocol vulnerabilities |

---

### 3.2 HIGH Risk Vendors

#### Vercel (Hosting & Deployment)
| Attribute | Details |
|-----------|---------|
| **Service** | Web hosting, serverless functions, CI/CD |
| **Data Exposed** | Environment variables (secrets), source code, server logs |
| **Risk Level** | HIGH |
| **SOC 2** | Yes — Type II |
| **GDPR** | Compliant |
| **Encryption at Rest** | Yes |
| **Encryption in Transit** | Yes (TLS 1.3) |
| **Access Control** | Team-based, SSO available |
| **Review Status** | ✅ Approved |
| **Next Review** | 2026-08-15 |
| **Action Items** | Enable SSO, restrict deployment permissions |

#### Cloudflare (CDN / DNS / Security)
| Attribute | Details |
|-----------|---------|
| **Service** | DNS, CDN, DDoS protection, WAF, SSL |
| **Data Exposed** | All HTTP traffic (proxy mode), DNS records |
| **Risk Level** | HIGH |
| **SOC 2** | Yes — Type II |
| **ISO 27001** | Yes |
| **GDPR** | Compliant |
| **Review Status** | ✅ Approved |
| **Next Review** | 2026-08-15 |
| **Action Items** | Enable 2FA on account, review API token permissions |

#### NowPayments (Crypto Payment Processing)
| Attribute | Details |
|-----------|---------|
| **Service** | Crypto deposit/payment processing |
| **Data Exposed** | Transaction amounts, wallet addresses, IPN callbacks |
| **Risk Level** | HIGH |
| **KYC/AML** | Compliant |
| **Encryption** | TLS, signed IPN callbacks |
| **Review Status** | ✅ Approved |
| **Next Review** | 2026-08-15 |
| **Action Items** | Verify IPN signature on all callbacks, monitor for anomalies |

#### Transak (Fiat On-Ramp)
| Attribute | Details |
|-----------|---------|
| **Service** | Fiat-to-crypto purchase widget |
| **Data Exposed** | User KYC data (handled by Transak), transaction amounts |
| **Risk Level** | HIGH |
| **KYC/AML** | Full compliance (they handle KYC) |
| **PCI DSS** | Compliant (they handle card data) |
| **Review Status** | ✅ Approved |
| **Next Review** | 2026-08-15 |
| **Action Items** | Review webhook signatures, ensure no PII stored on our side |

#### Coinbase (Wallet / Commerce)
| Attribute | Details |
|-----------|---------|
| **Service** | Crypto wallet integration, commerce payments |
| **Data Exposed** | Wallet addresses, transaction data |
| **Risk Level** | HIGH |
| **SOC 2** | Yes |
| **Regulatory** | Licensed in multiple jurisdictions |
| **Review Status** | ✅ Approved |
| **Next Review** | 2026-08-15 |
| **Action Items** | Review API key permissions, ensure minimum required scope |

---

### 3.3 MEDIUM Risk Vendors

#### GoldAPI / LBMA
| Attribute | Details |
|-----------|---------|
| **Service** | Gold/Silver/Platinum spot prices |
| **Data Exposed** | API key only (no user data sent) |
| **Risk Level** | MEDIUM |
| **Impact if Compromised** | Incorrect pricing (financial risk) |
| **Review Status** | ✅ Approved |
| **Next Review** | 2027-02-15 |
| **Action Items** | Implement price sanity checks, cache with staleness detection |

#### CoinGecko
| Attribute | Details |
|-----------|---------|
| **Service** | Cryptocurrency price feeds |
| **Data Exposed** | API key only (no user data sent) |
| **Risk Level** | MEDIUM |
| **Impact if Compromised** | Incorrect crypto pricing |
| **Review Status** | ✅ Approved |
| **Next Review** | 2027-02-15 |
| **Action Items** | Implement price deviation alerts |

#### Infura / Alchemy (Ethereum RPC)
| Attribute | Details |
|-----------|---------|
| **Service** | Ethereum blockchain RPC access |
| **Data Exposed** | Wallet addresses, transaction data (public blockchain data) |
| **Risk Level** | MEDIUM |
| **SOC 2** | Yes (both) |
| **Review Status** | ✅ Approved |
| **Next Review** | 2027-02-15 |
| **Action Items** | Use multiple providers for redundancy, set rate limits |

#### Sentry (Error Monitoring)
| Attribute | Details |
|-----------|---------|
| **Service** | Application error tracking |
| **Data Exposed** | Error stack traces, potentially user context |
| **Risk Level** | MEDIUM |
| **SOC 2** | Yes — Type II |
| **GDPR** | Compliant, EU data residency available |
| **Review Status** | ✅ Approved |
| **Next Review** | 2027-02-15 |
| **Action Items** | Ensure PII scrubbing is enabled, review data retention policy |

---

### 3.4 LOW Risk Vendors

#### GitHub (Source Code)
| Attribute | Details |
|-----------|---------|
| **Service** | Git repository, CI/CD, code review |
| **Data Exposed** | Source code, CI/CD secrets (encrypted) |
| **Risk Level** | LOW (no user data) |
| **SOC 2** | Yes |
| **Review Status** | ✅ Approved |
| **Next Review** | 2027-02-15 |
| **Action Items** | Enable branch protection, require signed commits, enable Dependabot |

#### Google Fonts
| Attribute | Details |
|-----------|---------|
| **Service** | Font delivery CDN |
| **Data Exposed** | User IP (via font requests) |
| **Risk Level** | LOW |
| **Review Status** | ✅ Approved |
| **Action Items** | Consider self-hosting fonts to eliminate external requests |

---

## 4. Vendor Onboarding Checklist

Before adding any new vendor/service:

- [ ] Security questionnaire completed
- [ ] SOC 2 / ISO 27001 report reviewed (if applicable)
- [ ] Data Processing Agreement (DPA) signed
- [ ] GDPR compliance verified
- [ ] Encryption (at rest + in transit) confirmed
- [ ] Access control model reviewed
- [ ] Incident response process documented
- [ ] SLA reviewed and acceptable
- [ ] Exit strategy defined (data portability, deletion)
- [ ] Added to this vendor registry

---

## 5. Review Schedule

| Frequency | Action |
|-----------|--------|
| **Semi-Annual** | Full review of CRITICAL and HIGH risk vendors |
| **Annual** | Review of MEDIUM and LOW risk vendors |
| **On Incident** | Immediate review of affected vendor |
| **On Renewal** | Review before contract renewal |

---

## 6. Vendor Removal Process

When decommissioning a vendor:

1. Identify all data shared with vendor
2. Request data deletion confirmation (written)
3. Revoke all API keys and access tokens
4. Remove from codebase (dependencies, API calls)
5. Update CSP headers if domain was whitelisted
6. Remove from this registry
7. Verify no residual data remains

---

> **Note:** This document must be reviewed and updated every 6 months or when any vendor change occurs.

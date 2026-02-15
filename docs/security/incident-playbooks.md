# AUXITE Incident Response Playbooks

**Version:** 1.0
**Last Updated:** 2026-02-15
**Classification:** INTERNAL — Do not share externally

---

## 1. Incident Severity Levels

| Level | Name | Description | Response Time | Escalation |
|-------|------|-------------|---------------|------------|
| SEV-1 | Critical | Fund loss, private key compromise, full system down | Immediate (< 15 min) | CEO + CTO + All Engineers |
| SEV-2 | High | Partial outage, security breach attempt, data exposure | < 30 min | CTO + On-call Engineer |
| SEV-3 | Medium | Degraded performance, failed transactions, minor bug | < 2 hours | On-call Engineer |
| SEV-4 | Low | UI issue, non-critical bug, monitoring alert | < 24 hours | Assigned Engineer |

---

## 2. Playbook: Private Key / Wallet Compromise

**Severity:** SEV-1
**Trigger:** Unauthorized transaction detected, key exposure suspected

### Immediate Actions (0-15 min)
1. **FREEZE** all withdrawal and transfer endpoints
   - Set `EMERGENCY_FREEZE=true` in Vercel env vars
   - Or Redis: `SET system:emergency_freeze "true"`
2. **NOTIFY** team via emergency Telegram group
3. **IDENTIFY** compromised key/wallet address
4. **TRANSFER** remaining funds from compromised wallet to secure cold wallet

### Investigation (15 min - 2 hours)
1. Review admin audit logs: `LRANGE admin:audit:actions 0 -1`
2. Check CloudTrail for AWS access anomalies
3. Review GitHub audit log for repo access
4. Check Vercel deployment logs for unauthorized deploys
5. Scan server access logs for suspicious IPs

### Recovery (2-24 hours)
1. Generate new keys using key ceremony process
2. Update all dependent systems with new keys
3. Re-enable services one by one with monitoring
4. Conduct post-mortem

### Communication
- Internal: Telegram group + email to all team
- External (if user funds affected): Email users within 24 hours
- Regulatory: Notify relevant authorities if required

---

## 3. Playbook: DDoS Attack

**Severity:** SEV-2
**Trigger:** Abnormal traffic spike, Cloudflare alerts, service degradation

### Immediate Actions (0-15 min)
1. **VERIFY** attack via Cloudflare Dashboard → Analytics → Traffic
2. **ENABLE** Cloudflare "Under Attack Mode"
   - Dashboard → auxite.io → Overview → Under Attack Mode: ON
3. **ENABLE** stricter rate limiting
   - Cloudflare → Security → WAF → Rate Limiting Rules

### Mitigation (15 min - 1 hour)
1. Analyze attack patterns (source IPs, request paths, user agents)
2. Create Cloudflare WAF custom rules to block attack traffic
3. If needed, enable IP Access Rules to block attacking countries/ASNs
4. Scale Vercel if needed (auto-scales, but check limits)

### Recovery
1. Monitor traffic for 24 hours after attack subsides
2. Keep "Under Attack Mode" on for at least 1 hour after traffic normalizes
3. Review and keep effective WAF rules
4. Document attack patterns for future prevention

---

## 4. Playbook: Database / Redis Breach

**Severity:** SEV-1
**Trigger:** Unauthorized data access, Upstash alerts, unusual query patterns

### Immediate Actions (0-15 min)
1. **ROTATE** Upstash Redis credentials immediately
   - Upstash Console → Database → Settings → Reset Password
2. **UPDATE** `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Vercel
3. **REDEPLOY** application
4. **FREEZE** all user sessions: `DEL session:*` (forces re-login)

### Investigation
1. Review Upstash audit logs
2. Check for data exfiltration patterns
3. Identify scope of exposed data
4. Check if user PII or financial data was accessed

### Recovery
1. Reset all user sessions and force password changes
2. Notify affected users via email
3. Enable additional monitoring on database access
4. Implement IP whitelisting for database access

---

## 5. Playbook: Smart Contract Vulnerability

**Severity:** SEV-1
**Trigger:** Vulnerability report, unusual contract behavior, audit finding

### Immediate Actions (0-15 min)
1. **PAUSE** contract if pause functionality exists
2. **DISABLE** affected features on frontend (exchange, withdraw, convert)
3. **NOTIFY** security team and auditors

### Investigation
1. Reproduce the vulnerability on testnet/fork
2. Assess funds at risk
3. Check if vulnerability has been exploited

### Recovery
1. Deploy patched contract (if upgradeable)
2. If not upgradeable: deploy new contract, migrate state
3. Coordinate with multisig signers for treasury operations
4. Re-enable features after thorough testing
5. Commission additional audit of the fix

---

## 6. Playbook: Phishing / Domain Attack

**Severity:** SEV-2
**Trigger:** Fake domain reported, phishing emails detected, DNS hijack suspected

### Immediate Actions (0-15 min)
1. **VERIFY** vault.auxite.io DNS records: `dig vault.auxite.io`
2. **CHECK** SSL certificate validity
3. **VERIFY** SecurityBanner component is showing correct status

### Mitigation
1. Report phishing domain to:
   - Google Safe Browsing: https://safebrowsing.google.com/safebrowsing/report_phish/
   - Cloudflare: abuse@cloudflare.com
   - Domain registrar of fake domain
2. Send warning email/notification to all users
3. Post warning on status page and social media
4. Enable additional monitoring for the fake domain

### Prevention
1. Register similar domains (auxlte.io, auxite.com, etc.)
2. Monitor Certificate Transparency logs for unauthorized certs
3. Ensure DNSSEC is enabled and verified

---

## 7. Playbook: Third-Party Service Outage

**Severity:** SEV-3
**Trigger:** CoinGecko, GoldAPI, NowPayments, Transak, or WalletConnect down

### Immediate Actions
1. **IDENTIFY** which service is down
2. **CHECK** service status pages
3. **ENABLE** fallback/cache if available

### Service-Specific Actions

| Service | Impact | Fallback |
|---------|--------|----------|
| CoinGecko | Price feeds stop | Use cached prices, show "last updated" timestamp |
| GoldAPI / LBMA | Gold/silver pricing fails | Use last known price with warning banner |
| NowPayments | Crypto deposits fail | Disable deposit, show maintenance message |
| Transak | Fiat on-ramp fails | Disable buy feature, show maintenance message |
| WalletConnect | Wallet connections fail | Direct MetaMask/injected provider only |
| Upstash Redis | Sessions, rate limiting fail | Emergency: disable rate limiting, use JWT-only auth |
| Cloudflare | CDN/proxy down | DNS failover to Vercel direct |

### Communication
1. Update status page (status.auxite.io)
2. In-app banner: "Some features temporarily unavailable"
3. Monitor third-party status page for updates

---

## 8. Incident Response Communication Template

### Internal Alert (Telegram)
```
🚨 [SEV-X] INCIDENT ALERT
Service: [affected service]
Impact: [what's broken]
Status: [investigating/mitigating/resolved]
Lead: [who's handling]
Channel: #incident-YYYY-MM-DD
```

### User Communication (Email)
```
Subject: [Auxite] Service Update — [Brief Description]

Dear Auxite User,

We are aware of [brief description of issue].

Impact: [what users experience]
Status: [current status]
ETA: [estimated resolution time if known]

Your funds are safe and secure. We will provide updates as the situation develops.

— Auxite Security Team
security@auxite.io
```

### Post-Incident Report Template
```
## Incident Report: [Title]
- Date: YYYY-MM-DD
- Duration: X hours Y minutes
- Severity: SEV-X
- Lead: [Name]

### Summary
[1-2 sentence summary]

### Timeline
- HH:MM — [event]
- HH:MM — [event]

### Root Cause
[Detailed explanation]

### Impact
- Users affected: X
- Financial impact: $X
- Data exposed: Yes/No

### Resolution
[What was done to fix it]

### Action Items
- [ ] [Preventive measure 1]
- [ ] [Preventive measure 2]
```

---

## 9. Emergency Contacts

| Role | Name | Contact | Backup |
|------|------|---------|--------|
| Incident Commander | [CEO Name] | [Phone/Telegram] | [Backup] |
| Technical Lead | [CTO Name] | [Phone/Telegram] | [Backup] |
| Security Lead | [Security Name] | [Phone/Telegram] | [Backup] |
| Cloudflare Support | — | Enterprise support / community | — |
| Upstash Support | — | support@upstash.com | — |
| Vercel Support | — | support@vercel.com | — |
| AWS Support | — | AWS Console support | — |

---

## 10. Regular Drills

- **Monthly:** Tabletop exercise (walk through a scenario verbally)
- **Quarterly:** Live drill (simulate SEV-2 incident)
- **Annually:** Full SEV-1 simulation with key rotation

> **Note:** Update this document after every real incident and drill.

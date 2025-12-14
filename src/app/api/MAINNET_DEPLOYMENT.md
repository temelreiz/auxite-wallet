# Mainnet Deployment Guide

## 🚀 Auxite Wallet - Production Launch Checklist

### Pre-Launch Checklist

#### 1. Smart Contracts
- [ ] Audit completed by reputable firm
- [ ] All tests passing (100% coverage)
- [ ] Gas optimization verified
- [ ] Upgrade mechanism tested
- [ ] Admin functions secured

#### 2. Backend
- [ ] All API endpoints tested
- [ ] Rate limiting configured
- [ ] Error handling complete
- [ ] Logging setup (Sentry)
- [ ] Database backups configured

#### 3. Frontend
- [ ] All E2E tests passing
- [ ] Mobile responsive verified
- [ ] Multi-language support tested
- [ ] Performance optimized (Lighthouse > 90)
- [ ] SEO meta tags added

#### 4. Security
- [ ] Security audit completed
- [ ] Penetration testing done
- [ ] SSL certificates configured
- [ ] CORS properly configured
- [ ] Environment variables secured

---

## Step 1: Smart Contract Deployment

### Mainnet Contract Deployment

```bash
cd contracts

# 1. Set mainnet environment
export NETWORK=mainnet
export PRIVATE_KEY=your_deployer_private_key
export ETHERSCAN_API_KEY=your_etherscan_key
export ALCHEMY_API_KEY=your_alchemy_key

# 2. Verify deployer balance (need ~0.5 ETH for gas)
npx hardhat balance --network mainnet

# 3. Deploy contracts
npx hardhat run scripts/deploy.js --network mainnet

# 4. Verify on Etherscan
npx hardhat verify --network mainnet DEPLOYED_CONTRACT_ADDRESS "Constructor Arg 1" "Constructor Arg 2"
```

### Contract Addresses (Update after deployment)

```
AUXG (Gold):      0x...
AUXS (Silver):    0x...
AUXPT (Platinum): 0x...
AUXPD (Palladium):0x...
```

### Post-Deployment Verification

```bash
# 1. Verify contract code on Etherscan
# 2. Test mint function
# 3. Test burn function
# 4. Test transfer function
# 5. Verify admin functions
```

---

## Step 2: Vercel Production Deployment

### 2.1 Create Vercel Project

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project
vercel link
```

### 2.2 Configure Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables:

```
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=xxx
NEXT_PUBLIC_ALCHEMY_API_KEY=xxx
UPSTASH_REDIS_REST_URL=xxx
UPSTASH_REDIS_REST_TOKEN=xxx
ADMIN_PASSWORD=xxx
JWT_SECRET=xxx
SENTRY_DSN=xxx
... (tüm production env vars)
```

### 2.3 Deploy

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

### 2.4 Configure Custom Domain

1. Vercel Dashboard → Project → Settings → Domains
2. Add domain: `app.auxite.io`
3. Update DNS records:
   - Type: CNAME
   - Name: app
   - Value: cname.vercel-dns.com

---

## Step 3: Sentry Setup

### 3.1 Create Sentry Project

1. Go to https://sentry.io
2. Create new project → Next.js
3. Copy DSN

### 3.2 Install & Configure

```bash
npx @sentry/wizard@latest -i nextjs
```

### 3.3 Test Error Tracking

```javascript
// Test error
Sentry.captureException(new Error('Test error'));
```

---

## Step 4: Monitoring & Alerts

### 4.1 Uptime Monitoring

Setup UptimeRobot or Better Uptime:
- Monitor: `https://app.auxite.io/api/health`
- Interval: 5 minutes
- Alert: Email + Slack

### 4.2 Sentry Alerts

Configure alerts for:
- New errors
- Error spike (>10 in 1 hour)
- Transaction failures

### 4.3 Vercel Analytics

Enable in Vercel Dashboard:
- Web Vitals
- Audience
- Speed Insights

---

## Step 5: Final Verification

### 5.1 Smoke Tests

```bash
# Health check
curl https://app.auxite.io/api/health

# Prices API
curl https://app.auxite.io/api/prices

# Expected: 200 OK with JSON response
```

### 5.2 User Flow Tests

1. [ ] Connect wallet
2. [ ] View balances
3. [ ] Buy metal (small amount)
4. [ ] Sell metal
5. [ ] Deposit crypto
6. [ ] Withdraw crypto
7. [ ] Stake metal
8. [ ] Admin login
9. [ ] Admin vault assignment

### 5.3 Performance Check

```bash
# Lighthouse
npx lighthouse https://app.auxite.io --view

# Target scores:
# Performance: > 90
# Accessibility: > 90
# Best Practices: > 90
# SEO: > 90
```

---

## Post-Launch

### Daily Checks
- [ ] Check Sentry for new errors
- [ ] Monitor transaction volume
- [ ] Check hot wallet balances
- [ ] Review user feedback

### Weekly Tasks
- [ ] Database backup verification
- [ ] Performance review
- [ ] Security log review
- [ ] Update dependencies (if needed)

### Monthly Tasks
- [ ] Full security audit
- [ ] User analytics review
- [ ] Cost optimization
- [ ] Feature planning

---

## Emergency Procedures

### Contract Pause
```javascript
// If security issue detected
await contract.pause();
```

### Rollback Deployment
```bash
vercel rollback
```

### Hot Wallet Emergency
1. Transfer funds to cold wallet
2. Disable withdrawal API
3. Investigate issue

---

## Support Contacts

- **Technical Lead**: [email]
- **Security**: [email]
- **DevOps**: [email]
- **On-call**: [phone]

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | TBD | Initial mainnet launch |

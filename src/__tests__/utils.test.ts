describe('Format Utilities', () => {
  const formatNumber = (num: number) => num.toLocaleString('en-US');
  const formatAddress = (addr: string) => addr ? `${addr.slice(0,6)}...${addr.slice(-4)}` : '';

  it('should format number', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('should format address', () => {
    expect(formatAddress('0xD24B2bca1E0b58a2EAE5b1184871219f9a8EE944')).toBe('0xD24B...E944');
  });

  it('should handle empty address', () => {
    expect(formatAddress('')).toBe('');
  });
});

describe('Calculation Utilities', () => {
  const calculateSpreadPrice = (basePrice: number, spreadPercent: number, type: 'buy' | 'sell') => {
    const spreadMultiplier = spreadPercent / 100;
    return type === 'buy' ? basePrice * (1 + spreadMultiplier) : basePrice * (1 - spreadMultiplier);
  };

  const calculateGramsFromUSD = (usd: number, pricePerGram: number) => {
    return pricePerGram <= 0 ? 0 : usd / pricePerGram;
  };

  it('should calculate buy price with spread', () => {
    const result = calculateSpreadPrice(100, 1.5, 'buy');
    expect(result).toBeCloseTo(101.5, 2);
  });

  it('should calculate sell price with spread', () => {
    const result = calculateSpreadPrice(100, 1.5, 'sell');
    expect(result).toBeCloseTo(98.5, 2);
  });

  it('should calculate grams from USD', () => {
    expect(calculateGramsFromUSD(100, 50)).toBe(2);
  });

  it('should handle zero price', () => {
    expect(calculateGramsFromUSD(100, 0)).toBe(0);
  });
});

describe('Validation Utilities', () => {
  const isValidEthAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);
  const isValidBtcAddress = (addr: string) => {
    if (!addr) return false;
    return /^(1|3)[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(addr) || /^bc1[a-zA-HJ-NP-Z0-9]{39,59}$/.test(addr);
  };
  const isPositiveNumber = (val: any) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  };

  it('should validate correct ETH address', () => {
    expect(isValidEthAddress('0xD24B2bca1E0b58a2EAE5b1184871219f9a8EE944')).toBe(true);
  });

  it('should reject invalid ETH address', () => {
    expect(isValidEthAddress('invalid')).toBe(false);
    expect(isValidEthAddress('0xshort')).toBe(false);
  });

  it('should validate BTC addresses', () => {
    expect(isValidBtcAddress('bc1q5tv54drekw0h5s4xd4dgvjhx239hykpmhsrg3r')).toBe(true);
    expect(isValidBtcAddress('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2')).toBe(true);
  });

  it('should validate positive numbers', () => {
    expect(isPositiveNumber(100)).toBe(true);
    expect(isPositiveNumber('50')).toBe(true);
    expect(isPositiveNumber(0)).toBe(false);
    expect(isPositiveNumber(-10)).toBe(false);
    expect(isPositiveNumber('abc')).toBe(false);
  });
});

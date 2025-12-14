/**
 * Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock Button Component
const Button = ({ 
  children, 
  onClick, 
  disabled = false, 
  loading = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    data-testid="button"
  >
    {loading ? 'Loading...' : children}
  </button>
);

// Mock Modal Component
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) => {
  if (!isOpen) return null;
  return (
    <div data-testid="modal" role="dialog">
      <div data-testid="modal-overlay" onClick={onClose} />
      <div data-testid="modal-content">
        <h2>{title}</h2>
        <button onClick={onClose} data-testid="modal-close">×</button>
        {children}
      </div>
    </div>
  );
};

// Mock Input Component
const Input = ({
  value,
  onChange,
  placeholder,
  error,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}) => (
  <div>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      data-testid="input"
      aria-invalid={!!error}
    />
    {error && <span data-testid="input-error" role="alert">{error}</span>}
  </div>
);

// Mock MetalCard Component
const MetalCard = ({
  symbol,
  name,
  price,
  change,
  onBuy,
  onSell,
}: {
  symbol: string;
  name: string;
  price: number;
  change: number;
  onBuy: () => void;
  onSell: () => void;
}) => (
  <div data-testid={`metal-card-${symbol}`}>
    <h3>{name}</h3>
    <p data-testid="metal-symbol">{symbol}</p>
    <p data-testid="metal-price">${price}</p>
    <p data-testid="metal-change">{change >= 0 ? '+' : ''}{change}%</p>
    <button onClick={onBuy} data-testid="buy-button">Buy</button>
    <button onClick={onSell} data-testid="sell-button">Sell</button>
  </div>
);

// Mock Balance Display
const BalanceDisplay = ({
  balances,
}: {
  balances: { symbol: string; amount: number; value: number }[];
}) => (
  <div data-testid="balance-display">
    {balances.map((b) => (
      <div key={b.symbol} data-testid={`balance-${b.symbol}`}>
        <span>{b.symbol}</span>
        <span data-testid={`amount-${b.symbol}`}>{b.amount}</span>
        <span data-testid={`value-${b.symbol}`}>${b.value}</span>
      </div>
    ))}
    <div data-testid="total-value">
      Total: ${balances.reduce((sum, b) => sum + b.value, 0)}
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// BUTTON TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Button Component', () => {
  it('should render button with text', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    
    await userEvent.click(screen.getByTestId('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not call onClick when disabled', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick} disabled>Click Me</Button>);
    
    await userEvent.click(screen.getByTestId('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should show loading state', () => {
    render(<Button loading>Click Me</Button>);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should be disabled when loading', () => {
    render(<Button loading>Click Me</Button>);
    expect(screen.getByTestId('button')).toBeDisabled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Modal Component', () => {
  it('should not render when closed', () => {
    render(<Modal isOpen={false} onClose={jest.fn()} title="Test">Content</Modal>);
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('should render when open', () => {
    render(<Modal isOpen={true} onClose={jest.fn()} title="Test Modal">Content</Modal>);
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
  });

  it('should call onClose when close button clicked', async () => {
    const handleClose = jest.fn();
    render(<Modal isOpen={true} onClose={handleClose} title="Test">Content</Modal>);
    
    await userEvent.click(screen.getByTestId('modal-close'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should have dialog role', () => {
    render(<Modal isOpen={true} onClose={jest.fn()} title="Test">Content</Modal>);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Input Component', () => {
  it('should render with placeholder', () => {
    render(<Input value="" onChange={jest.fn()} placeholder="Enter value" />);
    expect(screen.getByPlaceholderText('Enter value')).toBeInTheDocument();
  });

  it('should display value', () => {
    render(<Input value="test value" onChange={jest.fn()} />);
    expect(screen.getByTestId('input')).toHaveValue('test value');
  });

  it('should call onChange when typing', async () => {
    const handleChange = jest.fn();
    render(<Input value="" onChange={handleChange} />);
    
    await userEvent.type(screen.getByTestId('input'), 'hello');
    expect(handleChange).toHaveBeenCalledTimes(5);
  });

  it('should show error message', () => {
    render(<Input value="" onChange={jest.fn()} error="Required" />);
    expect(screen.getByTestId('input-error')).toHaveTextContent('Required');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Input value="" onChange={jest.fn()} disabled />);
    expect(screen.getByTestId('input')).toBeDisabled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// METAL CARD TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('MetalCard Component', () => {
  const defaultProps = {
    symbol: 'AUXG',
    name: 'Gold',
    price: 65000,
    change: 2.5,
    onBuy: jest.fn(),
    onSell: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render metal info correctly', () => {
    render(<MetalCard {...defaultProps} />);
    
    expect(screen.getByText('Gold')).toBeInTheDocument();
    expect(screen.getByTestId('metal-symbol')).toHaveTextContent('AUXG');
    expect(screen.getByTestId('metal-price')).toHaveTextContent('65000');
  });

  it('should show positive change with + sign', () => {
    render(<MetalCard {...defaultProps} />);
    expect(screen.getByTestId('metal-change')).toHaveTextContent('+2.5%');
  });

  it('should show negative change correctly', () => {
    render(<MetalCard {...defaultProps} change={-1.5} />);
    expect(screen.getByTestId('metal-change')).toHaveTextContent('-1.5%');
  });

  it('should call onBuy when buy button clicked', async () => {
    render(<MetalCard {...defaultProps} />);
    
    await userEvent.click(screen.getByTestId('buy-button'));
    expect(defaultProps.onBuy).toHaveBeenCalledTimes(1);
  });

  it('should call onSell when sell button clicked', async () => {
    render(<MetalCard {...defaultProps} />);
    
    await userEvent.click(screen.getByTestId('sell-button'));
    expect(defaultProps.onSell).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BALANCE DISPLAY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('BalanceDisplay Component', () => {
  const mockBalances = [
    { symbol: 'AUXG', amount: 10, value: 650000 },
    { symbol: 'AUXS', amount: 100, value: 3000 },
    { symbol: 'ETH', amount: 2.5, value: 8750 },
  ];

  it('should render all balances', () => {
    render(<BalanceDisplay balances={mockBalances} />);
    
    expect(screen.getByTestId('balance-AUXG')).toBeInTheDocument();
    expect(screen.getByTestId('balance-AUXS')).toBeInTheDocument();
    expect(screen.getByTestId('balance-ETH')).toBeInTheDocument();
  });

  it('should display correct amounts', () => {
    render(<BalanceDisplay balances={mockBalances} />);
    
    expect(screen.getByTestId('amount-AUXG')).toHaveTextContent('10');
    expect(screen.getByTestId('amount-AUXS')).toHaveTextContent('100');
    expect(screen.getByTestId('amount-ETH')).toHaveTextContent('2.5');
  });

  it('should display values', () => {
    render(<BalanceDisplay balances={mockBalances} />);
    
    expect(screen.getByTestId('value-AUXG')).toHaveTextContent('650000');
    expect(screen.getByTestId('value-AUXS')).toHaveTextContent('3000');
  });

  it('should calculate total correctly', () => {
    render(<BalanceDisplay balances={mockBalances} />);
    
    // 650000 + 3000 + 8750 = 661750
    expect(screen.getByTestId('total-value')).toHaveTextContent('661750');
  });

  it('should handle empty balances', () => {
    render(<BalanceDisplay balances={[]} />);
    expect(screen.getByTestId('total-value')).toHaveTextContent('0');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FORM INTERACTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Form Interactions', () => {
  const TradeForm = ({ onSubmit }: { onSubmit: (data: any) => void }) => {
    const [amount, setAmount] = React.useState('');
    const [metal, setMetal] = React.useState('AUXG');
    const [error, setError] = React.useState('');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!amount || parseFloat(amount) <= 0) {
        setError('Please enter a valid amount');
        return;
      }
      setError('');
      onSubmit({ amount: parseFloat(amount), metal });
    };

    return (
      <form onSubmit={handleSubmit} data-testid="trade-form">
        <select value={metal} onChange={(e) => setMetal(e.target.value)} data-testid="metal-select">
          <option value="AUXG">Gold</option>
          <option value="AUXS">Silver</option>
        </select>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          data-testid="amount-input"
        />
        {error && <span data-testid="form-error">{error}</span>}
        <button type="submit" data-testid="submit-button">Buy</button>
      </form>
    );
  };

  it('should submit form with valid data', async () => {
    const handleSubmit = jest.fn();
    render(<TradeForm onSubmit={handleSubmit} />);

    await userEvent.type(screen.getByTestId('amount-input'), '100');
    await userEvent.click(screen.getByTestId('submit-button'));

    expect(handleSubmit).toHaveBeenCalledWith({ amount: 100, metal: 'AUXG' });
  });

  it('should show error for empty amount', async () => {
    const handleSubmit = jest.fn();
    render(<TradeForm onSubmit={handleSubmit} />);

    await userEvent.click(screen.getByTestId('submit-button'));

    expect(screen.getByTestId('form-error')).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('should allow changing metal selection', async () => {
    const handleSubmit = jest.fn();
    render(<TradeForm onSubmit={handleSubmit} />);

    await userEvent.selectOptions(screen.getByTestId('metal-select'), 'AUXS');
    await userEvent.type(screen.getByTestId('amount-input'), '50');
    await userEvent.click(screen.getByTestId('submit-button'));

    expect(handleSubmit).toHaveBeenCalledWith({ amount: 50, metal: 'AUXS' });
  });
});

/**
 * Hook Tests
 * Custom React hook testleri
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK HOOKS (Gerçek hooklar import edildiğinde bu kısım kaldırılacak)
// ═══════════════════════════════════════════════════════════════════════════════

// useLocalStorage Hook
const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = React.useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue] as const;
};

// useDebounce Hook
const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// useToggle Hook
const useToggle = (initialValue = false): [boolean, () => void, (value: boolean) => void] => {
  const [value, setValue] = React.useState(initialValue);

  const toggle = React.useCallback(() => setValue((v) => !v), []);
  const set = React.useCallback((v: boolean) => setValue(v), []);

  return [value, toggle, set];
};

// usePrevious Hook
const usePrevious = <T>(value: T): T | undefined => {
  const ref = React.useRef<T>();

  React.useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
};

// useAsync Hook
const useAsync = <T>(asyncFunction: () => Promise<T>, immediate = true) => {
  const [status, setStatus] = React.useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [value, setValue] = React.useState<T | null>(null);
  const [error, setError] = React.useState<Error | null>(null);

  const execute = React.useCallback(async () => {
    setStatus('pending');
    setValue(null);
    setError(null);

    try {
      const response = await asyncFunction();
      setValue(response);
      setStatus('success');
    } catch (err) {
      setError(err as Error);
      setStatus('error');
    }
  }, [asyncFunction]);

  React.useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { execute, status, value, error };
};

// usePrices Hook (Custom)
const usePrices = () => {
  const [prices, setPrices] = React.useState<Record<string, number>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchPrices = React.useCallback(async () => {
    setLoading(true);
    try {
      // Mock fetch
      await new Promise((resolve) => setTimeout(resolve, 100));
      setPrices({
        AUXG: 65000,
        AUXS: 30,
        AUXPT: 950,
        AUXPD: 1100,
      });
      setError(null);
    } catch (err) {
      setError('Failed to fetch prices');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  return { prices, loading, error, refetch: fetchPrices };
};

// useBalance Hook (Custom)
const useBalance = (address: string | undefined) => {
  const [balances, setBalances] = React.useState<Record<string, number>>({});
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchBalances = React.useCallback(async () => {
    if (!address) return;
    
    setLoading(true);
    try {
      // Mock fetch
      await new Promise((resolve) => setTimeout(resolve, 100));
      setBalances({
        AUXG: 10,
        AUXS: 100,
        USD: 5000,
      });
      setError(null);
    } catch (err) {
      setError('Failed to fetch balances');
    } finally {
      setLoading(false);
    }
  }, [address]);

  React.useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  return { balances, loading, error, refetch: fetchBalances };
};

// ═══════════════════════════════════════════════════════════════════════════════
// useLocalStorage TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('useLocalStorage Hook', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
  });

  it('should return initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    
    expect(result.current[0]).toBe('initial');
  });

  it('should update localStorage when value changes', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    
    act(() => {
      result.current[1]('updated');
    });

    expect(result.current[0]).toBe('updated');
    expect(window.localStorage.setItem).toHaveBeenCalledWith('test-key', '"updated"');
  });

  it('should handle object values', () => {
    const initialObj = { name: 'test', count: 0 };
    const { result } = renderHook(() => useLocalStorage('test-obj', initialObj));
    
    act(() => {
      result.current[1]({ name: 'updated', count: 1 });
    });

    expect(result.current[0]).toEqual({ name: 'updated', count: 1 });
  });

  it('should handle function updates', () => {
    const { result } = renderHook(() => useLocalStorage('counter', 0));
    
    act(() => {
      result.current[1]((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// useDebounce TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('useDebounce Hook', () => {
  jest.useFakeTimers();

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    
    expect(result.current).toBe('initial');
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });
    
    // Value should still be initial
    expect(result.current).toBe('initial');

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toBe('updated');
  });

  it('should cancel previous timeout on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'a' } }
    );

    rerender({ value: 'b' });
    act(() => {
      jest.advanceTimersByTime(200);
    });

    rerender({ value: 'c' });
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Should still be 'a' since 500ms hasn't passed
    expect(result.current).toBe('a');

    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Now should be 'c'
    expect(result.current).toBe('c');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// useToggle TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('useToggle Hook', () => {
  it('should initialize with false by default', () => {
    const { result } = renderHook(() => useToggle());
    
    expect(result.current[0]).toBe(false);
  });

  it('should initialize with provided value', () => {
    const { result } = renderHook(() => useToggle(true));
    
    expect(result.current[0]).toBe(true);
  });

  it('should toggle value', () => {
    const { result } = renderHook(() => useToggle(false));
    
    act(() => {
      result.current[1](); // toggle
    });

    expect(result.current[0]).toBe(true);

    act(() => {
      result.current[1](); // toggle again
    });

    expect(result.current[0]).toBe(false);
  });

  it('should set specific value', () => {
    const { result } = renderHook(() => useToggle(false));
    
    act(() => {
      result.current[2](true); // set
    });

    expect(result.current[0]).toBe(true);

    act(() => {
      result.current[2](true); // set same value
    });

    expect(result.current[0]).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// usePrevious TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('usePrevious Hook', () => {
  it('should return undefined on first render', () => {
    const { result } = renderHook(() => usePrevious(1));
    
    expect(result.current).toBeUndefined();
  });

  it('should return previous value after update', () => {
    const { result, rerender } = renderHook(
      ({ value }) => usePrevious(value),
      { initialProps: { value: 1 } }
    );

    expect(result.current).toBeUndefined();

    rerender({ value: 2 });
    expect(result.current).toBe(1);

    rerender({ value: 3 });
    expect(result.current).toBe(2);
  });

  it('should work with different types', () => {
    const { result, rerender } = renderHook(
      ({ value }) => usePrevious(value),
      { initialProps: { value: 'hello' } }
    );

    rerender({ value: 'world' });
    expect(result.current).toBe('hello');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// useAsync TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('useAsync Hook', () => {
  it('should handle successful async operation', async () => {
    const asyncFn = jest.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useAsync(asyncFn, true));

    expect(result.current.status).toBe('pending');

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(result.current.value).toBe('success');
    expect(result.current.error).toBeNull();
  });

  it('should handle failed async operation', async () => {
    const error = new Error('Failed');
    const asyncFn = jest.fn().mockRejectedValue(error);
    const { result } = renderHook(() => useAsync(asyncFn, true));

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(result.current.error).toBe(error);
    expect(result.current.value).toBeNull();
  });

  it('should not execute immediately when immediate is false', () => {
    const asyncFn = jest.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useAsync(asyncFn, false));

    expect(result.current.status).toBe('idle');
    expect(asyncFn).not.toHaveBeenCalled();
  });

  it('should allow manual execution', async () => {
    const asyncFn = jest.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useAsync(asyncFn, false));

    act(() => {
      result.current.execute();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(asyncFn).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// usePrices TESTS (Custom)
// ═══════════════════════════════════════════════════════════════════════════════

describe('usePrices Hook', () => {
  it('should fetch prices on mount', async () => {
    const { result } = renderHook(() => usePrices());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.prices.AUXG).toBe(65000);
    expect(result.current.prices.AUXS).toBe(30);
    expect(result.current.error).toBeNull();
  });

  it('should have refetch function', async () => {
    const { result } = renderHook(() => usePrices());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe('function');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// useBalance TESTS (Custom)
// ═══════════════════════════════════════════════════════════════════════════════

describe('useBalance Hook', () => {
  it('should not fetch without address', () => {
    const { result } = renderHook(() => useBalance(undefined));

    expect(result.current.loading).toBe(false);
    expect(result.current.balances).toEqual({});
  });

  it('should fetch balances with valid address', async () => {
    const { result } = renderHook(() => 
      useBalance('0xD24B2bca1E0b58a2EAE5b1184871219f9a8EE944')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.balances.AUXG).toBe(10);
    expect(result.current.balances.USD).toBe(5000);
  });

  it('should refetch when address changes', async () => {
    const { result, rerender } = renderHook(
      ({ address }) => useBalance(address),
      { initialProps: { address: '0x123' } }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    rerender({ address: '0x456' });

    // Should trigger new fetch
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});

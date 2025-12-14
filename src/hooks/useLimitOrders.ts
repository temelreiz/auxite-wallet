// hooks/useLimitOrders.ts
// Hook for fetching and managing user's limit orders

import { useState, useEffect, useCallback } from 'react';

export interface LimitOrder {
  id: string;
  address: string;
  type: 'buy' | 'sell';
  metal: 'AUXG' | 'AUXS' | 'AUXPT' | 'AUXPD';
  grams: number;
  limitPrice: number;
  paymentMethod: 'AUXM' | 'USDT' | 'USD';
  status: 'pending' | 'filled' | 'partially_filled' | 'cancelled' | 'expired';
  filledGrams: number;
  filledAt?: string;
  txHash?: string;
  createdAt: string;
  expiresAt: string;
  updatedAt: string;
}

interface UseLimitOrdersOptions {
  address?: string;
  metal?: string;
  status?: LimitOrder['status'];
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useLimitOrders(options: UseLimitOrdersOptions = {}) {
  const { 
    address, 
    metal, 
    status = 'pending',
    autoRefresh = true, 
    refreshInterval = 30000 // 30 seconds
  } = options;

  const [orders, setOrders] = useState<LimitOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!address) {
      setOrders([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ address });
      if (status) params.append('status', status);
      
      const response = await fetch(`/api/orders/limit?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch orders');
      }

      let filteredOrders = data.orders || [];
      
      // Filter by metal if specified
      if (metal) {
        filteredOrders = filteredOrders.filter(
          (order: LimitOrder) => order.metal === metal.toUpperCase()
        );
      }

      setOrders(filteredOrders);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch orders');
      console.error('useLimitOrders error:', err);
    } finally {
      setLoading(false);
    }
  }, [address, metal, status]);

  // Cancel order
  const cancelOrder = useCallback(async (orderId: string): Promise<boolean> => {
    if (!address) return false;

    try {
      const response = await fetch('/api/orders/limit', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, address }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel order');
      }

      // Refresh orders after cancellation
      await fetchOrders();
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to cancel order');
      return false;
    }
  }, [address, fetchOrders]);

  // Initial fetch
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh || !address) return;

    const interval = setInterval(fetchOrders, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, address, refreshInterval, fetchOrders]);

  return {
    orders,
    loading,
    error,
    refresh: fetchOrders,
    cancelOrder,
    pendingCount: orders.filter(o => o.status === 'pending').length,
  };
}

export default useLimitOrders;

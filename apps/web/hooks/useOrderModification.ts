import { useState, useEffect } from 'react';

interface OrderModificationResponse {
  canModify: boolean;
  reason?: string;
}

interface UseOrderModificationReturn {
  canModify: boolean;
  reason: string | null;
  loading: boolean;
  error: string | null;
  checkOrderStatus: (orderId: string) => Promise<void>;
}

/**
 * Custom hook to check if an order can be modified based on its status
 * @param initialOrderId Optional order ID to check on mount
 * @param token Authentication token
 * @returns Object with canModify status, reason, loading state, error state, and refresh function
 */
const useOrderModification = (
  initialOrderId?: string,
  token?: string
): UseOrderModificationReturn => {
  const [canModify, setCanModify] = useState<boolean>(true);
  const [reason, setReason] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  
  const checkOrderStatus = async (orderId: string): Promise<void> => {
    if (!orderId || !token) {
      setCanModify(true);
      setReason(null);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${apiBase}/api/v1/orders/${orderId}/can-modify`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          // Order not found, assume it can be modified
          setCanModify(true);
          setReason(null);
        } else {
          throw new Error(`Failed to check order status: ${response.status}`);
        }
      } else {
        const data: OrderModificationResponse = await response.json();
        setCanModify(data.canModify);
        setReason(data.reason || null);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to check order status');
      // Default to allowing modification if we can't check
      setCanModify(true);
    } finally {
      setLoading(false);
    }
  };
  
  // Check initial order status if provided
  useEffect(() => {
    if (initialOrderId) {
      checkOrderStatus(initialOrderId);
    }
  }, [initialOrderId, token]);
  
  return {
    canModify,
    reason,
    loading,
    error,
    checkOrderStatus
  };
};

export default useOrderModification;

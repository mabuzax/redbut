"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Clock, Check, X, AlertCircle, ImageIcon, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast, Toaster } from "react-hot-toast";
import { OrderStatus, OrderStatusConfigService } from "../../lib/order-status-config";

interface MenuItem {
  id: string;
  name: string;
  image: string | null;
}

interface OrderItem {
  id: string;
  menuItemId: string;
  quantity: number;
  price: number;
  status: OrderStatus;
  menuItem: MenuItem;
  selectedOptions?: string[];
}

interface Order {
  id: string;
  tableNumber: number;
  sessionId: string;
  userId: string | null;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  orderItems: OrderItem[];
}

interface MyOrdersProps {
  userId: string;
  tableNumber: number;
  sessionId: string;
  token: string;
}

interface StatusOption {
  value: string;
  label: string;
}

const statusColors = {
  [OrderStatus.New]: "bg-blue-100 text-blue-800 border-blue-200",
  [OrderStatus.Acknowledged]: "bg-purple-100 text-purple-800 border-purple-200",
  [OrderStatus.InProgress]: "bg-yellow-100 text-yellow-800 border-yellow-200",
  [OrderStatus.Delivered]: "bg-green-100 text-green-800 border-green-200",
  [OrderStatus.Paid]: "bg-gray-100 text-gray-800 border-gray-200",
  [OrderStatus.Cancelled]: "bg-red-100 text-red-800 border-red-200",
  [OrderStatus.Complete]: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const ImagePlaceholder = ({ name }: { name: string }) => (
  <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
    <div className="flex flex-col items-center justify-center p-2 text-center">
      <ImageIcon className="h-5 w-5 mb-1" />
      <span className="text-xs">{name || "No Image"}</span>
    </div>
  </div>
);

const MyOrders = ({ userId, tableNumber, sessionId, token }: MyOrdersProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [updating, setUpdating] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [statusOptions, setStatusOptions] = useState<Record<string, StatusOption[]>>({});
  const [loadingStatusOptions, setLoadingStatusOptions] = useState<Record<string, boolean>>({});

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  const fetchOrders = useCallback(async () => {
    if (!token) {
      setError("Authentication token not found");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${apiBase}/api/v1/orders?tableNumber=${tableNumber}&sessionId=${sessionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        let friendly = "Unable to load orders.";
        try {
          const data = await response.json();
          friendly = data?.message ?? data?.error ?? friendly;
        } catch {
          // ignore parse errors
        }
        throw new Error(friendly);
      }

      const data = await response.json();
      setOrders(data.items || []);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [apiBase, token, tableNumber, sessionId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders, refreshTrigger]);

  const handleImageError = (imageUrl: string) => {
    setFailedImages(prev => new Set(prev).add(imageUrl));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const getTotalPrice = (order: Order) => {
    return order.orderItems.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0
    );
  };

  const loadStatusOptions = async (orderId: string, currentStatus: OrderStatus) => {
    if (!token) return;
    
    try {
      setLoadingStatusOptions(prev => ({ ...prev, [orderId]: true }));
      
      const options = await OrderStatusConfigService.getStatusOptions(
        currentStatus,
        'client',
        token
      );
      
      setStatusOptions(prev => ({
        ...prev,
        [orderId]: options.length > 0 
          ? options 
          : OrderStatusConfigService.getDefaultStatusOptions(currentStatus)
      }));
    } catch (error) {
      console.error('Error loading status options:', error);
      setStatusOptions(prev => ({
        ...prev,
        [orderId]: OrderStatusConfigService.getDefaultStatusOptions(currentStatus)
      }));
    } finally {
      setLoadingStatusOptions(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (!token) {
      setError("Authentication token not found");
      return;
    }

    try {
      setUpdating(orderId);
      const response = await fetch(`${apiBase}/api/v1/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        let friendly = "Unable to update order status.";
        try {
          const data = await response.json();
          friendly = data?.message ?? data?.error ?? friendly;
        } catch {
          // ignore parse errors
        }
        throw new Error(friendly);
      }

      toast.success(`Order status updated to ${newStatus}`, {
        position: "bottom-center",
        duration: 2000,
      });

      // Trigger a refresh of the orders
      setRefreshTrigger(prev => prev + 1);
    } catch (e: any) {
      toast.error(e?.message || "Unable to update order status at this time.", {
        position: "bottom-center",
        duration: 3000,
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleStatusUpdate = (orderId: string, currentStatus: OrderStatus, newStatus: OrderStatus) => {
    if (window.confirm(`Update order status to ${newStatus}?`)) {
      updateOrderStatus(orderId, newStatus);
    }
  };

  const StatusBadge = ({ status }: { status: OrderStatus }) => (
    <div className={`px-3 py-1 rounded-full border flex items-center space-x-1 text-sm ${statusColors[status]}`}>
      <span>{status}</span>
    </div>
  );

  const StatusDropdown = ({ order }: { order: Order }) => {
    const isLoading = loadingStatusOptions[order.id] || false;
    const options = statusOptions[order.id] || [];
    
    // Load status options when dropdown is focused
    const handleFocus = () => {
      if (!options.length && !isLoading) {
        loadStatusOptions(order.id, order.status);
      }
    };
    
    // Check if any options are available other than current status
    const hasOptions = options.length > 1 || (options.length === 1 && options[0].value !== order.status);
    const isDisabled = updating === order.id || isLoading || !hasOptions;
    
    return (
      <div className="relative">
        {isLoading && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
          </div>
        )}
        <select
          value={order.status}
          onChange={(e) => handleStatusUpdate(order.id, order.status, e.target.value as OrderStatus)}
          onFocus={handleFocus}
          onClick={handleFocus}
          className={`px-3 py-1 rounded-md text-sm font-medium border bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 pr-8 ${
            isDisabled ? "opacity-60 cursor-not-allowed" : ""
          }`}
          disabled={isDisabled}
        >
          {options.length > 0 ? (
            options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          ) : (
            <option value={order.status}>{order.status}</option>
          )}
        </select>
      </div>
    );
  };

  return (
    <div className="p-4">
      <Toaster />
      
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">My Orders</h1>
        <button
          onClick={() => setRefreshTrigger(prev => prev + 1)}
          className="p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Refresh orders"
        >
          <Clock className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : error ? (
        <div className="text-center py-10">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-500">You don't have any orders yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map(order => (
            <div
              key={order.id}
              className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm"
            >
              <div className="p-4 border-b">
                <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <StatusBadge status={order.status} />
                      <span className="text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Order #{order.id.slice(-6)}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">
                      ${getTotalPrice(order).toFixed(2)}
                    </span>
                    <StatusDropdown order={order} />
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="divide-y divide-gray-100">
                {order.orderItems.map(item => (
                  <div key={item.id} className="p-4 flex items-center">
                    <div className="w-16 h-16 rounded overflow-hidden mr-3 bg-white">
                      {item.menuItem.image && !failedImages.has(item.menuItem.image) ? (
                        <img
                          src={item.menuItem.image}
                          alt={item.menuItem.name}
                          className="w-full h-full object-cover"
                          onError={() => handleImageError(item.menuItem.image!)}
                        />
                      ) : (
                        <ImagePlaceholder name={item.menuItem.name} />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="font-medium">{item.menuItem.name}</span>
                        <span>${Number(item.price).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-500">
                        <div>
                          <span>Qty: {item.quantity}</span>
                          {item.selectedOptions && item.selectedOptions.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              Options: {item.selectedOptions.join(', ')}
                            </p>
                          )}
                        </div>
                        <span>Total: ${(Number(item.price) * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrders;

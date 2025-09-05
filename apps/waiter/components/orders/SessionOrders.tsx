"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronsRight,
  Package,
  CreditCard,
  RefreshCcw,
  ImageIcon,
  Loader2,
  ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  selectedExtras?: string[];
  specialInstructions?: string;
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

interface StatusOption {
  value: string;
  label: string;
}

const statusColors = {
  [OrderStatus.New]: "bg-red-100 text-red-800 border-red-200",
  [OrderStatus.Acknowledged]: "bg-blue-100 text-blue-800 border-blue-200",
  [OrderStatus.InProgress]: "bg-yellow-100 text-yellow-800 border-yellow-200",
  [OrderStatus.Complete]: "bg-purple-100 text-purple-800 border-purple-200",
  [OrderStatus.Delivered]: "bg-green-100 text-green-800 border-green-200",
  [OrderStatus.Paid]: "bg-gray-100 text-gray-800 border-gray-200",
  [OrderStatus.Cancelled]: "bg-red-100 text-red-800 border-red-200",
  [OrderStatus.Rejected]: "bg-orange-100 text-orange-800 border-orange-200",
};

const statusIcons = {
  [OrderStatus.New]: AlertCircle,
  [OrderStatus.Acknowledged]: Clock,
  [OrderStatus.InProgress]: RefreshCcw,
  [OrderStatus.Complete]: CheckCircle,
  [OrderStatus.Delivered]: Package,
  [OrderStatus.Paid]: CreditCard,
  [OrderStatus.Cancelled]: AlertCircle,
  [OrderStatus.Rejected]: AlertCircle,
};

const ImagePlaceholder = ({ name }: { name: string }) => (
  <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
    <div className="flex flex-col items-center justify-center p-2 text-center">
      <ImageIcon className="h-5 w-5 mb-1" />
      <span className="text-xs">{name || "No Image"}</span>
    </div>
  </div>
);

interface SessionOrdersProps {
  sessionId: string;
  tableNumber: number;
  token: string;
  onBack: () => void;
}

const SessionOrders = ({ sessionId, tableNumber, token, onBack }: SessionOrdersProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [statusOptions, setStatusOptions] = useState<Record<string, StatusOption[]>>({});
  const [loadingStatusOptions, setLoadingStatusOptions] = useState<Record<string, boolean>>({});

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/api/v1/waiter/orders/session/${sessionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.statusText}`);
      }

      const data = await response.json();
      setOrders(data);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, [apiBase, sessionId, token]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Clear status options when orders change to force reload with new statuses
  useEffect(() => {
    setStatusOptions({});
  }, [orders]);

  const fetchStatusOptions = useCallback(async (orderId: string, currentStatus: OrderStatus) => {
    setLoadingStatusOptions(prev => ({ ...prev, [orderId]: true }));
    try {
      const options = await OrderStatusConfigService.getStatusOptions(currentStatus, 'waiter', token);
      setStatusOptions(prev => ({ ...prev, [orderId]: options }));
    } catch (error) {
      console.error("Failed to fetch status options:", error);
    } finally {
      setLoadingStatusOptions(prev => ({ ...prev, [orderId]: false }));
    }
  }, [token]);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    console.log("Attempting to update order status:", { orderId, newStatus });
    setUpdating(orderId);
    try {
      const response = await fetch(`${apiBase}/api/v1/waiter/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        // Try to get the error details from the response
        let errorMessage = `Failed to update order status: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
        }
        throw new Error(errorMessage);
      }

      // Refresh the orders
      await fetchOrders();
    } catch (err) {
      console.error("Error updating order status:", err);
      alert(err instanceof Error ? err.message : "Failed to update order status");
    } finally {
      setUpdating(null);
    }
  };

  const toggleOrderExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const handleImageError = (itemId: string) => {
    setFailedImages(prev => {
      const newSet = new Set(prev);
      newSet.add(itemId);
      return newSet;
    });
  };

  const handleEditOrderItem = (orderItem: OrderItem, orderId: string) => {
    // Show message that order items cannot be changed
    alert("Cannot change at order item level. Only order status can be modified.");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchOrders}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="mr-3 text-red-800 hover:text-red-900 transition-colors" strokeWidth={4} />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Table {tableNumber} Orders
          </h2>
          <p className="text-sm text-gray-500">Session: {sessionId.slice(-8)}</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center p-8 text-gray-500">
          <Package className="mx-auto h-12 w-12 mb-4 text-gray-300" />
          <p>No orders found for this session</p>
        </div>
      ) : (
        <div className="space-y-4 flex flex-col gap-4">
          {orders.map((order) => {
            const StatusIcon = statusIcons[order.status];
            const isExpanded = expandedOrders.has(order.id);
            const orderTotal = order.orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-all duration-300 hover:scale-[1.02] min-h-fit w-full max-w-full flex-shrink-0 flex-grow"
                onClick={() => {
                  // Load status options and focus on the dropdown
                  const dropdown = document.getElementById(`status-dropdown-${order.id}`) as HTMLSelectElement;
                  if (dropdown) {
                    fetchStatusOptions(order.id, order.status);
                    dropdown.focus();
                    dropdown.click();
                  }
                }}
              >
                {/* Order Header */}
                <div className="p-4 border-b border-gray-100 min-h-fit flex-shrink-0">
                  <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-3 min-h-fit">
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <StatusIcon className="h-5 w-5 text-gray-500 flex-shrink-0" />
                      <div className="min-w-0 flex-grow">
                        <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">Order #{order.id.slice(-8)}</h3>
                        <p className="text-xs sm:text-sm text-gray-500 truncate">{formatDateTime(order.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-fit mb-7">
                      <div className="relative flex-shrink-0 pb-2">
                        <span 
                          className={`px-2 py-1 text-xs font-medium rounded-full border cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap ${statusColors[order.status]}`}
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            const dropdown = document.getElementById(`status-dropdown-${order.id}`) as HTMLSelectElement;
                            if (dropdown) {
                              fetchStatusOptions(order.id, order.status);
                              setTimeout(() => {
                                dropdown.focus();
                                dropdown.click();
                              }, 100);
                            }
                          }}
                        >
                          {order.status}
                        </span>
                        
                        {/* Status dropdown positioned below the badge */}
                        <select
                          id={`status-dropdown-${order.id}`}
                          value={order.status}
                          onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as OrderStatus)}
                          disabled={updating === order.id}
                          className="absolute top-full left-0 mt-1 mb-4 px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-md z-10 min-w-40"
                          onFocus={() => fetchStatusOptions(order.id, order.status)}
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchStatusOptions(order.id, order.status);
                          }}
                        >
                          <option value={order.status}>{order.status}</option>
                          {statusOptions[order.id]?.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <span className="font-medium text-gray-900 text-sm sm:text-base whitespace-nowrap flex-shrink-0">{formatCurrency(orderTotal)}</span>
                      <button
                        onClick={() => toggleOrderExpansion(order.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 space-y-4 min-h-fit flex-grow">
                        {order.orderItems.map((item) => (
                          <div key={item.id} className="flex items-center gap-2 sm:gap-4 p-3 bg-gray-50 rounded-lg min-h-fit flex-wrap sm:flex-nowrap">
                            {/* Item Image */}
                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                              {item.menuItem.image && !failedImages.has(item.id) ? (
                                <img
                                  src={item.menuItem.image}
                                  alt={item.menuItem.name}
                                  className="w-full h-full object-cover"
                                  onError={() => handleImageError(item.id)}
                                />
                              ) : (
                                <ImagePlaceholder name={item.menuItem.name} />
                              )}
                            </div>

                            {/* Item Details */}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 text-sm sm:text-base truncate">{item.menuItem.name}</h4>
                              <p className="text-xs sm:text-sm text-gray-500">Quantity: {item.quantity}</p>
                              <p className="text-xs sm:text-sm font-medium text-gray-900">
                                {formatCurrency(item.price)} each
                              </p>
                              {item.selectedOptions && item.selectedOptions.length > 0 && (
                                <p className="text-xs text-gray-500 mt-1 truncate">
                                  Options: {item.selectedOptions.join(', ')}
                                </p>
                              )}
                              {item.selectedExtras && item.selectedExtras.length > 0 && (
                                <p className="text-xs text-gray-500 truncate">
                                  Extras: {item.selectedExtras.join(', ')}
                                </p>
                              )}
                              {item.specialInstructions && (
                                <p className="text-xs text-gray-500 truncate">
                                  Instructions: {item.specialInstructions}
                                </p>
                              )}
                            </div>

                            {/* Item Total */}
                            <div className="text-right flex-shrink-0 w-full sm:w-auto">
                              <p className="text-sm font-medium text-gray-900">
                                {formatCurrency(item.price * item.quantity)}
                              </p>
                            </div>
                          </div>
                        ))}

                        {/* Order Actions */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            {updating === order.id && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                          </div>
                          <div className="text-right">
                            <p className="text-base sm:text-lg font-semibold text-gray-900">Total: {formatCurrency(orderTotal)}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SessionOrders;

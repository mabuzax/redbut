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
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { OrderStatus, OrderStatusConfigService } from "../../lib/order-status-config";
import { fetchWithAuth } from "../../lib/fetch-with-auth";

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

interface TableOrders {
  tableNumber: number;
  orders: Order[];
  newOrdersCount: number;
  expanded: boolean;
}

interface StatusOption {
  value: string;
  label: string;
}

const statusColors = {
  [OrderStatus.New]: "bg-red-100 text-red-800 border-red-200",
  [OrderStatus.InProgress]: "bg-yellow-100 text-yellow-800 border-yellow-200",
  [OrderStatus.Delivered]: "bg-green-100 text-green-800 border-green-200",
  [OrderStatus.Paid]: "bg-gray-100 text-gray-800 border-gray-200",
  [OrderStatus.Cancelled]: "bg-red-100 text-red-800 border-red-200",
};

const statusIcons = {
  [OrderStatus.New]: AlertCircle,
  [OrderStatus.InProgress]: RefreshCcw,
  [OrderStatus.Delivered]: Package,
  [OrderStatus.Paid]: CreditCard,
  [OrderStatus.Cancelled]: AlertCircle,
};

const ImagePlaceholder = ({ name }: { name: string }) => (
  <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
    <div className="flex flex-col items-center justify-center p-2 text-center">
      <ImageIcon className="h-5 w-5 mb-1" />
      <span className="text-xs">{name || "No Image"}</span>
    </div>
  </div>
);

const OrderManagement = () => {
  const [tableOrders, setTableOrders] = useState<TableOrders[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [statusOptions, setStatusOptions] = useState<Record<string, StatusOption[]>>({});
  const [loadingStatusOptions, setLoadingStatusOptions] = useState<Record<string, boolean>>({});

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const token = typeof window !== "undefined" ? localStorage.getItem("redBut_token") || "" : "";

  const fetchOrders = useCallback(async () => {
    if (!token) {
      setError("Authentication token not found");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetchWithAuth(`${apiBase}/api/v1/waiter/orders/by-table`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status}`);
      }

      const data = await response.json();
      
      // Add expanded state to each table group
      const tablesWithState = data.map((table: Omit<TableOrders, 'expanded'>) => ({
        ...table,
        expanded: table.newOrdersCount > 0, // Auto-expand tables with new orders
      }));
      
      setTableOrders(tablesWithState);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [apiBase, token]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders, refreshTrigger]);

  const toggleTableExpanded = (tableNumber: number) => {
    setTableOrders(prev =>
      prev.map(table =>
        table.tableNumber === tableNumber
          ? { ...table, expanded: !table.expanded }
          : table
      )
    );
  };

  const handleImageError = (imageUrl: string) => {
    setFailedImages(prev => new Set(prev).add(imageUrl));
  };

  const loadStatusOptions = (orderId: string, currentStatus: OrderStatus) => {
    
    try {
      setLoadingStatusOptions(prev => ({ ...prev, [orderId]: true }));
      
      const options = OrderStatusConfigService.getStatusOptions(currentStatus);
      
      setStatusOptions(prev => ({
        ...prev,
        [orderId]: options
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
      const response = await fetchWithAuth(`${apiBase}/api/v1/waiter/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        // Attempt to extract a user-friendly message from the API response
        let friendly = `Unable to update order status.`;
        try {
          const data = await response.json();
          friendly = data?.message ?? data?.error ?? friendly;
        } catch {
          // ignore JSON parse errors and use fallback
        }
        throw new Error(friendly);
      }

      // Trigger a refresh of the orders
      setRefreshTrigger(prev => prev + 1);
    } catch (e: any) {
      setError(e?.message || "Unable to update order status at this time.");
    } finally {
      setUpdating(null);
    }
  };

  const handleStatusUpdate = (orderId: string, newStatus: OrderStatus) => {
    if (window.confirm(`Update order status to ${newStatus}?`)) {
      updateOrderStatus(orderId, newStatus);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      month: 'short',
      day: 'numeric',
      timeZone: 'Africa/Johannesburg'
    }).format(date);
  };

  const getTotalPrice = (order: Order) => {
    return order.orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  };

  const StatusBadge = ({ status, onClick }: { status: OrderStatus; onClick?: (e: React.MouseEvent) => void }) => {
    const Icon = statusIcons[status] || AlertCircle;
    return (
      <div 
        className={`px-3 py-1 rounded-full border flex items-center space-x-1 text-sm ${
          onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
        } ${statusColors[status] || "bg-gray-100 text-gray-800 border-gray-200"}`}
        onClick={onClick}
      >
        <Icon className="h-3.5 w-3.5 mr-1" />
        <span>{status}</span>
      </div>
    );
  };

  const StatusDropdown = ({ order, onStatusChange }: { order: Order, onStatusChange: (status: OrderStatus) => void }) => {
    const isLoading = loadingStatusOptions[order.id] || false;
    const options = statusOptions[order.id] || [];
    
    // Load status options when dropdown is focused
    const handleFocus = () => {
      if (!options.length && !isLoading) {
        loadStatusOptions(order.id, order.status);
      }
    };
    
    return (
      <div className="relative">
        {isLoading && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
          </div>
        )}
        <select
          value={order.status}
          onChange={(e) => onStatusChange(e.target.value as OrderStatus)}
          onFocus={handleFocus}
          onClick={handleFocus}
          data-order-id={order.id}
          className="px-3 py-1 rounded-md text-sm font-medium border bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 pr-8"
          disabled={updating === order.id || isLoading}
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

  if (loading && tableOrders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error && tableOrders.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => setRefreshTrigger(prev => prev + 1)}
          className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (tableOrders.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">No orders found for your tables.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
          {error}
          <button
            onClick={() => setError(null)}
            className="float-right text-red-700 hover:text-red-900"
          >
            &times;
          </button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Orders by Table</h2>
        <button
          onClick={() => setRefreshTrigger(prev => prev + 1)}
          className="p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Refresh orders"
        >
          <RefreshCcw className="h-5 w-5" />
        </button>
      </div>

      {tableOrders.map(table => (
        <div
          key={table.tableNumber}
          className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm"
        >
          {/* Table Header with New Order Ribbon */}
          <div 
            className={`relative ${table.newOrdersCount > 0 ? 'bg-red-50' : 'bg-white'}`}
          >
            {table.newOrdersCount > 0 && (
              <div className="absolute top-0 right-0">
                <div className="bg-red-500 text-white px-3 py-1 text-xs font-semibold rounded-bl-lg">
                  {table.newOrdersCount} New
                </div>
              </div>
            )}
            
            <button
              onClick={() => toggleTableExpanded(table.tableNumber)}
              className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <span className="text-lg font-semibold">Table {table.tableNumber}</span>
                <span className="ml-3 text-sm text-gray-500">
                  {table.orders.length} order{table.orders.length !== 1 ? 's' : ''}
                </span>
              </div>
              {table.expanded ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </button>
          </div>

          {/* Orders List */}
          <AnimatePresence>
            {table.expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="divide-y divide-gray-200">
                  {table.orders.map(order => (
                    <div key={order.id} className="p-4 space-y-4">
                      <div className="flex flex-wrap justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <StatusBadge 
                              status={order.status} 
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                // Load status options and focus on the dropdown
                                loadStatusOptions(order.id, order.status);
                                // Small delay to allow options to load before focusing
                                setTimeout(() => {
                                  const dropdown = document.querySelector(`select[data-order-id="${order.id}"]`) as HTMLSelectElement;
                                  if (dropdown) {
                                    dropdown.focus();
                                    dropdown.click();
                                  }
                                }, 100);
                              }}
                            />
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
                          <StatusDropdown 
                            order={order}
                            onStatusChange={(newStatus) => handleStatusUpdate(order.id, newStatus as OrderStatus)}
                          />
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="bg-gray-50 rounded-md p-3 space-y-2">
                        {order.orderItems.map(item => (
                          <div key={item.id} className="flex items-center">
                            <div className="w-12 h-12 rounded overflow-hidden mr-3 bg-white">
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
                                <span>Qty: {item.quantity}</span>
                                <span>Total: ${(Number(item.price) * item.quantity).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};

export default OrderManagement;

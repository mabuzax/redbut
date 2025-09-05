"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Clock, Check, X, AlertCircle, ImageIcon, Loader2, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { toast, Toaster } from "react-hot-toast";
import { api, serviceAnalysisApi } from '@/lib/api';
import { OrderStatus, OrderStatusConfigService } from "../../lib/order-status-config";
import { ServiceAnalysisData } from '../../types/service-analysis';
import { getWaiterIdFromLocalStorage } from '../../lib/session-utils';
import ReviewComponent from '../feedback/ReviewComponent';

interface MenuItem {
  id: string;
  name: string;
  image: string | null;
  available_options?: string;
  available_extras?: string;
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

interface MyOrdersProps {
  userId: string;
  token: string;
  tableNumber: number;
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
  [OrderStatus.Rejected]: "bg-orange-100 text-orange-800 border-orange-200",
};

const ImagePlaceholder = ({ name }: { name: string }) => (
  <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
    <div className="flex flex-col items-center justify-center p-2 text-center">
      <ImageIcon className="h-5 w-5 mb-1" />
      <span className="text-xs">{name || "No Image"}</span>
    </div>
  </div>
);

const MyOrders = ({ userId, token, tableNumber }: MyOrdersProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [updating, setUpdating] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [statusOptions, setStatusOptions] = useState<Record<string, StatusOption[]>>({});
  const [loadingStatusOptions, setLoadingStatusOptions] = useState<Record<string, boolean>>({});
  const [rejectDialog, setRejectDialog] = useState<{
    isOpen: boolean;
    orderId: string;
    orderNumber: string;
  }>({ isOpen: false, orderId: '', orderNumber: '' });
  const [rejectReason, setRejectReason] = useState('');
  
  // Review component state
  const [reviewDialog, setReviewDialog] = useState({
    isOpen: false,
    orderId: '',
    newStatus: '' as OrderStatus | '',
    sessionId: '',
    userId: '',
    waiterId: ''
  });

  const fetchOrders = useCallback(async () => {
    if (!token) {
      setError("Authentication token not found");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Use simplified endpoint - authentication provides session info
      const response = await api.get('/api/v1/orders');

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
  }, [token]); // Remove tableNumber and sessionId dependencies

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders, refreshTrigger]);

  // Clear status options when orders change to force reload with new statuses
  useEffect(() => {
    setStatusOptions({});
  }, [orders]);

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
      const response = await api.put(`/api/v1/orders/${orderId}/status`, { status: newStatus });

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

  const updateOrderStatusWithReview = async (orderId: string, newStatus: OrderStatus, sessionId: string, orderUserId: string) => {
    try {
      // First update the order status
      await updateOrderStatus(orderId, newStatus);
      
      // Get waiter ID from session
      const waiterId = getWaiterIdFromLocalStorage();
      
      // Then show the review dialog
      setReviewDialog({
        isOpen: true,
        orderId,
        newStatus,
        sessionId,
        userId: orderUserId,
        waiterId: waiterId || ''
      });
    } catch (error) {
      // Error already handled by updateOrderStatus
      console.error('Failed to update order status for review:', error);
    }
  };

  const handleEditOrderItem = (orderItem: OrderItem, orderId: string) => {
    // Show message to use Buzz Waiter button for help
    toast.error("To modify your order, please use the 'Buzz Waiter' button for assistance.", {
      position: "bottom-center",
      duration: 4000,
    });
  };

  const handleRejectWithReason = async () => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejecting the order", {
        position: "bottom-center",
        duration: 3000,
      });
      return;
    }

    if (!token) {
      setError("Authentication token not found");
      return;
    }

    try {
      setUpdating(rejectDialog.orderId);
      
      // Create request for waiter attention and update order status in transaction
      const response = await api.put(`/api/v1/orders/${rejectDialog.orderId}/reject`, {
        reason: rejectReason.trim(),
        tableNumber: tableNumber
      });

      if (!response.ok) {
        let friendly = "Unable to reject order.";
        try {
          const data = await response.json();
          friendly = data?.message ?? data?.error ?? friendly;
        } catch {
          // ignore parse errors
        }
        throw new Error(friendly);
      }

      // Close dialog
      setRejectDialog({ isOpen: false, orderId: '', orderNumber: '' });
      setRejectReason('');

      toast.success("Your waiter has been notified and will be with you soon", {
        position: "bottom-center",
        duration: 4000,
      });

      // Trigger a refresh of the orders
      setRefreshTrigger(prev => prev + 1);
    } catch (e: any) {
      toast.error(e?.message || "Unable to reject order at this time.", {
        position: "bottom-center",
        duration: 3000,
      });
    } finally {
      setUpdating(null);
    }
  };

  const closeRejectDialog = () => {
    setRejectDialog({ isOpen: false, orderId: '', orderNumber: '' });
    setRejectReason('');
  };

  // Review dialog functions
  const handleReviewSubmit = async (reviewData: ServiceAnalysisData) => {
    try {
      await serviceAnalysisApi.submitAnalysis({
        sessionId: reviewDialog.sessionId,
        userId: reviewDialog.userId,
        waiterId: reviewDialog.waiterId || undefined,
        analysis: reviewData
      });
      
      setReviewDialog({
        isOpen: false,
        orderId: '',
        newStatus: '',
        sessionId: '',
        userId: '',
        waiterId: ''
      });
    } catch (error) {
      console.error('Failed to submit review:', error);
      throw error; // Let the ReviewComponent handle the error display
    }
  };

  const closeReviewDialog = () => {
    setReviewDialog({
      isOpen: false,
      orderId: '',
      newStatus: '',
      sessionId: '',
      userId: '',
      waiterId: ''
    });
  };

  const handleStatusUpdate = (orderId: string, currentStatus: OrderStatus, newStatus: OrderStatus) => {
    if (newStatus === OrderStatus.Rejected) {
      // Find the order to get its number for display
      const order = orders.find(o => o.id === orderId);
      const orderNumber = order?.id.slice(-8) || orderId.slice(-8);
      
      setRejectDialog({
        isOpen: true,
        orderId,
        orderNumber
      });
      setRejectReason(''); // Reset reason
    } else if (newStatus === OrderStatus.Cancelled) {
      // Show review dialog for cancelled orders
      const order = orders.find(o => o.id === orderId);
      const sessionId = localStorage.getItem('redBut_table_session') || '';
      
      // First update the order status, then show review
      if (window.confirm(`Cancel this order?`)) {
        updateOrderStatusWithReview(orderId, newStatus, sessionId, order?.userId || userId);
      }
    } else {
      if (window.confirm(`Update order status to ${newStatus}?`)) {
        updateOrderStatus(orderId, newStatus);
      }
    }
  };

  const StatusBadge = ({ status, onClick }: { status: OrderStatus; onClick?: (e: React.MouseEvent) => void }) => (
    <div 
      className={`px-3 py-1 rounded-full border flex items-center space-x-1 text-sm cursor-pointer hover:opacity-80 transition-opacity ${statusColors[status]}`}
      onClick={onClick}
    >
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
    // Only disable if we have loaded options and there are truly no transitions available
    const hasLoadedOptions = statusOptions[order.id] !== undefined;
    const hasOptions = !hasLoadedOptions || options.length > 1 || (options.length === 1 && options[0].value !== order.status);
    const isDisabled = updating === order.id || isLoading || !hasOptions;
    
    return (
      <div className="relative">
        {isLoading && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
          </div>
        )}
        <select
          id={`status-dropdown-${order.id}`}
          value={order.status}
          onChange={(e) => handleStatusUpdate(order.id, order.status, e.target.value as OrderStatus)}
          onFocus={handleFocus}
          onClick={(e) => {
            e.stopPropagation(); // Prevent card click event
            handleFocus();
          }}
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
        <h1 className="text-2xl font-bold text-primary-700">My Orders</h1>
        <button
          onClick={() => setRefreshTrigger(prev => prev + 1)}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Refresh orders"
        >
          <RefreshCw className="h-5 w-5 text-primary-600" />
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
              className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                // Load status options and focus on the dropdown
                const dropdown = document.getElementById(`status-dropdown-${order.id}`) as HTMLSelectElement;
                if (dropdown) {
                  loadStatusOptions(order.id, order.status);
                  dropdown.focus();
                  dropdown.click();
                }
              }}
            >
              <div className="p-4 border-b">
                <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <StatusBadge 
                        status={order.status} 
                        onClick={(e: React.MouseEvent) => {
                          e?.stopPropagation();
                          const dropdown = document.getElementById(`status-dropdown-${order.id}`) as HTMLSelectElement;
                          if (dropdown) {
                            loadStatusOptions(order.id, order.status);
                            dropdown.focus();
                            dropdown.click();
                          }
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
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{item.menuItem.name}</span>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            <span>Qty: {item.quantity}</span>
                            {item.selectedOptions && item.selectedOptions.length > 0 && (
                              <p className="text-xs text-gray-500 mt-1">
                                Options: {item.selectedOptions.join(', ')}
                              </p>
                            )}
                            {item.selectedExtras && item.selectedExtras.length > 0 && (
                              <p className="text-xs text-gray-500">
                                Extras: {item.selectedExtras.join(', ')}
                              </p>
                            )}
                            {item.specialInstructions && (
                              <p className="text-xs text-gray-500">
                                Instructions: {item.specialInstructions}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-medium">${Number(item.price).toFixed(2)}</span>
                          <p className="text-sm text-gray-500">
                            Total: ${(Number(item.price) * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Dialog */}
      {rejectDialog.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Reject Order #{rejectDialog.orderNumber}
              </h3>
              <p className="text-gray-600 mb-4">
                Please provide a reason for rejecting this order. Your waiter will be notified immediately.
              </p>
              
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection (required)..."
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
                maxLength={500}
              />
              
              <div className="text-sm text-gray-500 mt-1 text-right">
                {rejectReason.length}/500 characters
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={closeRejectDialog}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  disabled={updating === rejectDialog.orderId}
                >
                  Do Not Reject
                </button>
                <button
                  onClick={handleRejectWithReason}
                  disabled={updating === rejectDialog.orderId || !rejectReason.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {updating === rejectDialog.orderId ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Rejecting...
                    </div>
                  ) : (
                    'Reject'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Review Component */}
      <ReviewComponent
        isOpen={reviewDialog.isOpen}
        onClose={closeReviewDialog}
        onSubmit={handleReviewSubmit}
        title={`Your ${reviewDialog.newStatus === 'Cancelled' ? 'cancelled' : ''} order`}
        type="order"
      />
      
      <Toaster />
    </div>
  );
};

export default MyOrders;

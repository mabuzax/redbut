import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, RefreshCw, DollarSign, BellRing, CheckCircle, CreditCard, Banknote, X } from 'lucide-react';
import { api, serviceAnalysisApi } from '@/lib/api';
import ReviewComponent from '../feedback/ReviewComponent';
import { ServiceAnalysisData } from '../../types/service-analysis';
import { getWaiterIdFromLocalStorage } from '../../lib/session-utils';

// Define interfaces for data structures
interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  status: string;
  menuItem: {
    id: string;
    name: string;
    image: string | null;
  };
}

interface Order {
  id: string;
  tableNumber: number;
  sessionId: string;
  status: string;
  createdAt: string;
  orderItems: OrderItem[];
}

interface MyBillProps {
  userId: string;
  tableNumber: number;
  sessionId: string;
  token: string;
  onWaiterRequested?: () => void; // Callback for when waiter is requested
}

const MyBill: React.FC<MyBillProps> = ({ userId, tableNumber, sessionId, token, onWaiterRequested }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestingWaiter, setRequestingWaiter] = useState(false);
  const [waiterRequestedMessage, setWaiterRequestedMessage] = useState<string | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'card' | 'cash' | null>(null);
  const [showRatingDialog, setShowRatingDialog] = useState(false);

  const fetchBill = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/v1/orders');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch bill: ${response.statusText}`);
      }
      
      const data = await response.json();
      setOrders(data);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred while fetching your bill.');
      console.error('Failed to fetch bill:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBill();
  }, [fetchBill]);

  const handleReadyToPay = () => {
    setShowPaymentDialog(true);
  };

  const handlePaymentSubmit = async () => {
    if (!selectedPaymentMethod) return;
    
    // First, send the payment request to the waiter immediately
    await submitPaymentRequest();
    
    // Then show the rating dialog (optional, non-blocking)
    setShowPaymentDialog(false);
    setShowRatingDialog(true);
  };

  const handleRatingSubmit = async (reviewData: ServiceAnalysisData) => {
    try {
      // Get waiterId from localStorage (same approach as requests)
      const waiterId = getWaiterIdFromLocalStorage();
      
      // Submit the service analysis with service_type 'order'
      await serviceAnalysisApi.submitAnalysis({
        sessionId: sessionId,
        userId: userId,
        waiterId: waiterId || undefined,
        serviceType: 'order',
        analysis: reviewData
      });
      
      setShowRatingDialog(false);
      setSelectedPaymentMethod(null);
    } catch (error) {
      console.error('Failed to submit rating:', error);
      throw error; // Let the ReviewComponent handle the error display
    }
  };

  const submitPaymentRequest = async () => {
    if (!selectedPaymentMethod) return;
    
    setRequestingWaiter(true);
    setWaiterRequestedMessage(null);
    setError(null);

    try {
      const paymentMethodText = selectedPaymentMethod === 'card' ? 'card' : 'cash';
      const response = await api.post('/api/v1/requests', {
        userId,
        tableNumber,
        content: `Table ${tableNumber} ready to pay. This will be a ${paymentMethodText} payment.`,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to request waiter.');
      }

      setWaiterRequestedMessage('Payment request sent! Waiter has been notified.');
      if (onWaiterRequested) {
        onWaiterRequested(); // Trigger splash screen in parent
      }
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred while requesting the waiter.');
      console.error('Failed to request waiter:', err);
    } finally {
      setRequestingWaiter(false);
    }
  };

  const closeRatingDialog = () => {
    setShowRatingDialog(false);
    setSelectedPaymentMethod(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-primary-700">Your Bill</h2>
        <button
          onClick={fetchBill}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Refresh bill"
        >
          <RefreshCw className="h-5 w-5 text-primary-600" />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center flex-1">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Loader2 className="h-10 w-10 animate-spin text-primary-500 mb-4" />
            <p className="text-gray-600">Loading bill...</p>
          </motion.div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center flex-1">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <p className="text-red-500 text-center mb-4">{error}</p>
            <button
              onClick={fetchBill}
              className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
            >
              <RefreshCw className="inline-block w-4 h-4 mr-2" /> Try Again
            </button>
          </motion.div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {orders.length > 0 ? (
            <>
              {/* Receipt-style bill */}
              <div className="bg-white border border-gray-300 rounded-lg p-4 mb-4 font-mono text-sm shadow-inner">
                {/* Header */}
                <div className="text-center border-b border-gray-400 pb-2 mb-3">
                  <h3 className="font-bold text-lg">REDBUT RESTAURANT</h3>
                  <p className="text-xs text-gray-600">Table {tableNumber}</p>
                  <p className="text-xs text-gray-600">{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
                </div>

                {/* Items */}
                <div className="space-y-1 mb-3">
                  <AnimatePresence>
                    {orders.map((order) => 
                      order.orderItems.map((item) => (
                        <motion.div
                          key={`${order.id}-${item.id}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex justify-between items-start text-xs"
                        >
                          <div className="flex-1 pr-2">
                            <p className="font-semibold">{item.menuItem.name}</p>
                            <p className="text-gray-600">Qty: {item.quantity} × {formatCurrency(item.price)}</p>
                          </div>
                          <p className="font-bold">{formatCurrency(item.price * item.quantity)}</p>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>

                {/* Total */}
                <div className="border-t border-gray-400 pt-2">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-base">TOTAL:</p>
                    <p className="font-bold text-base">{formatCurrency(total)}</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-3 pt-2 border-t border-gray-300 text-xs text-gray-600">
                  <p>Thank you for dining with us!</p>
                  <p>Session: {sessionId.slice(-8)}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <p className="text-gray-600 text-center mb-4">No orders found for this session.</p>
                <p className="text-gray-600 text-center mb-4">Use below button if ready to pay</p>
              </motion.div>
            </div>
          )}

          {waiterRequestedMessage && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 p-3 bg-green-100 text-green-700 rounded-md flex items-center justify-center space-x-2"
            >
              <CheckCircle className="h-5 w-5" />
              <span>{waiterRequestedMessage}</span>
            </motion.div>
          )}

          <button
            onClick={handleReadyToPay}
            className="mt-6 w-full bg-primary-500 text-white font-bold py-3 px-4 rounded-md hover:bg-primary-600 transition-colors flex items-center justify-center space-x-2"
          >
            <BellRing className="inline-block w-5 h-5" />
            <span>Ready to Pay</span>
          </button>
        </div>
      )}

      {/* Payment Method Dialog */}
      <AnimatePresence>
        {showPaymentDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg p-6 max-w-sm w-full mx-4"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Pay Method</h3>
                <h4 className="text-sm text-gray-600">Tell your waiter how you would like to pay</h4>
                <button
                  onClick={() => {
                    setShowPaymentDialog(false);
                    setSelectedPaymentMethod(null);
                  }}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-3 mb-6">
                <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="payment"
                    value="card"
                    checked={selectedPaymentMethod === 'card'}
                    onChange={() => setSelectedPaymentMethod('card')}
                    className="form-radio"
                  />
                  <CreditCard className="h-6 w-6 text-blue-600" />
                  <div>
                    <p className="font-semibold">Card Payment</p>
                    <p className="text-sm text-gray-600">Asks waiter to bring Speedpoint</p>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="payment"
                    value="cash"
                    checked={selectedPaymentMethod === 'cash'}
                    onChange={() => setSelectedPaymentMethod('cash')}
                    className="form-radio"
                  />
                  <Banknote className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-semibold">Cash Payment</p>
                    <p className="text-sm text-gray-600">Pay with cash</p>
                  </div>
                </label>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowPaymentDialog(false);
                    setSelectedPaymentMethod(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePaymentSubmit}
                  disabled={!selectedPaymentMethod || requestingWaiter}
                  className={`flex-1 px-4 py-2 rounded-md transition-colors ${
                    selectedPaymentMethod && !requestingWaiter
                      ? 'bg-primary-500 text-white hover:bg-primary-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {requestingWaiter ? (
                    <Loader2 className="inline-block w-4 h-4 animate-spin" />
                  ) : (
                    'Submit'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Service Rating Dialog */}
      <ReviewComponent
        isOpen={showRatingDialog}
        onClose={closeRatingDialog}
        onSubmit={handleRatingSubmit}
        title="How was your dining experience? (Optional)"
        type="order"
      />
    </div>
  );
};

export default MyBill;
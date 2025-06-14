import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, RefreshCw, DollarSign, BellRing, CheckCircle } from 'lucide-react';

// Define interfaces for data structures
interface Order {
  id: string;
  tableNumber: number;
  sessionId: string;
  item: string;
  price: number;
  createdAt: string;
}

interface MyBillProps {
  userId: string;
  tableNumber: number;
  sessionId: string;
  token: string;
  onWaiterRequested?: () => void; // Callback for when waiter is requested
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const MyBill: React.FC<MyBillProps> = ({ userId, tableNumber, sessionId, token, onWaiterRequested }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestingWaiter, setRequestingWaiter] = useState(false);
  const [waiterRequestedMessage, setWaiterRequestedMessage] = useState<string | null>(null);

  const fetchBill = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/orders?tableNumber=${tableNumber}&sessionId=${sessionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch bill: ${response.statusText}`);
      }
      const data = await response.json();
      setOrders(data.items);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred while fetching your bill.');
      console.error('Failed to fetch bill:', err);
    } finally {
      setLoading(false);
    }
  }, [tableNumber, sessionId, token]);

  useEffect(() => {
    if (tableNumber && sessionId && token) {
      fetchBill();
    } else {
      setError('Session information missing. Please ensure you have a valid session.');
      setLoading(false);
    }
  }, [tableNumber, sessionId, token, fetchBill]);

  const handleReadyToPay = async () => {
    setRequestingWaiter(true);
    setWaiterRequestedMessage(null);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          tableNumber,
          content: 'Ready to pay',
          status: 'New',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to request waiter.');
      }

      setWaiterRequestedMessage('Waiter Informed: Your request to pay has been sent!');
      if (onWaiterRequested) {
        onWaiterRequested(); // Trigger splash screen in parent
      }
    } catch (err: any) {
      if (err.message.includes('Already requested payment')) {
        setWaiterRequestedMessage('Already requested, buzzing waiter again.');
        if (onWaiterRequested) {
          onWaiterRequested(); // Still trigger splash screen for duplicate requests
        }
      } else {
        setError(err.message || 'An unknown error occurred while requesting the waiter.');
      }
      console.error('Failed to request waiter:', err);
    } finally {
      setRequestingWaiter(false);
    }
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
        <h2 className="text-2xl font-bold text-primary-700">My Bill</h2>
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
              {/* Mobile view - Card based list */}
              <div className="md:hidden space-y-4 mb-4">
                <AnimatePresence>
                  {orders.map((order) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm"
                    >
                      <div className="flex justify-between items-start">
                        <p className="text-gray-800">{order.item}</p>
                        <p className="font-medium">{formatCurrency(order.price)}</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <p className="text-lg font-bold text-primary-700">Total:</p>
                    <p className="text-lg font-bold text-primary-700">{formatCurrency(total)}</p>
                  </div>
                </div>
              </div>

              {/* Desktop view - Table */}
              <div className="overflow-x-auto flex-1 mb-4 hidden md:block">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead>
                    <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                      <th className="py-3 px-6 text-left">Item</th>
                      <th className="py-3 px-6 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-600 text-sm font-light">
                    <AnimatePresence>
                      {orders.map((order) => (
                        <motion.tr
                          key={order.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-b border-gray-200 hover:bg-gray-50"
                        >
                          <td className="py-3 px-6 text-left">{order.item}</td>
                          <td className="py-3 px-6 text-right">{formatCurrency(order.price)}</td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
              <div className="text-right text-xl font-bold text-primary-700 mt-auto pt-4 border-t border-gray-200 hidden md:block">
                Total: {formatCurrency(total)}
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
              className="mt-4 p-3 bg-blue-100 text-blue-700 rounded-md flex items-center justify-center space-x-2"
            >
              <CheckCircle className="h-5 w-5" />
              <span>{waiterRequestedMessage}</span>
            </motion.div>
          )}

          <button
            onClick={handleReadyToPay}
            className={`mt-6 w-full bg-primary-500 text-white font-bold py-3 px-4 rounded-md transition-colors flex items-center justify-center space-x-2 ${
              requestingWaiter ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-600'
            }`}
            disabled={requestingWaiter}
          >
            {requestingWaiter ? (
              <Loader2 className="inline-block w-5 h-5 animate-spin" />
            ) : (
              <BellRing className="inline-block w-5 h-5" />
            )}
            <span>{requestingWaiter ? 'Requesting Waiter...' : 'Ready to Pay'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default MyBill;
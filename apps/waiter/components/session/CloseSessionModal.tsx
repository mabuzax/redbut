"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Loader2, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { getTableSessions, removeTableSession, TableSession } from "../../lib/table-sessions";
import { waiterApi } from "../../lib/api";

interface CloseSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
}

interface ActiveSession {
  id: string;
  tableNumber: number;
  sessionId: string;
  name?: string;
  createdAt: string;
  waiter?: {
    name: string;
    surname: string;
  };
}

export default function CloseSessionModal({ isOpen, onClose, token }: CloseSessionModalProps) {
  const [activeSessions, setActiveSessions] = useState<TableSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    unpaidOrders: any[];
    unclosedRequests: any[];
    canClose: boolean;
  } | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [closeReason, setCloseReason] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchActiveSessions();
      // Reset validation state when modal opens
      setValidationResult(null);
      setShowConfirmation(false);
      setCloseReason("");
      setSelectedSession("");
    }
  }, [isOpen]);

  const fetchActiveSessions = async () => {
    setLoading(true);
    try {
      // Extract waiter ID from token
      const waiterId = extractWaiterIdFromToken(token);
      console.log('CloseSessionModal: waiterId:', waiterId);
      if (!waiterId) {
        console.error('No waiter ID found in token');
        setActiveSessions([]);
        return;
      }

      // Fetch sessions for this specific waiter from API
      const apiSessions = await waiterApi.getWaiterSessions(waiterId, token);
      console.log('CloseSessionModal: API sessions:', apiSessions);
      
      // Convert API response to our TableSession format
      const tableSessions: TableSession[] = apiSessions.map((session: any) => ({
        sessionId: session.sessionId,
        tableNumber: session.tableNumber,
        waiterId: session.waiterId,
        qrCodeUrl: session.qrCodeUrl,
        createdAt: session.createdAt,
      }));
      
      console.log('CloseSessionModal: Converted sessions:', tableSessions);
      setActiveSessions(tableSessions);
    } catch (error) {
      console.error('Error fetching active sessions:', error);
      // Fallback to localStorage sessions
      setActiveSessions(getTableSessions());
    } finally {
      setLoading(false);
    }
  };

  // Helper function to extract waiter ID from JWT token
  const extractWaiterIdFromToken = (token: string): string | null => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('CloseSessionModal: JWT payload:', payload);
      return payload.userId || null;
    } catch (error) {
      console.error('Error parsing token:', error);
      return null;
    }
  };

  const validateSessionClosure = async (sessionId: string) => {
    setValidating(true);
    try {
      // Fetch orders and requests for this session
      const [orders, requests] = await Promise.all([
        waiterApi.getOrdersBySession(sessionId, token),
        waiterApi.getRequestsBySession(sessionId, token)
      ]);

      // Check for unpaid orders (status not "Paid" or "Done")
      const unpaidOrders = orders.filter(order => 
        order.status !== 'Paid' && order.status !== 'Done'
      );

      // Check for unclosed requests (status not "Done")
      const unclosedRequests = requests.filter(request => 
        request.status !== 'Done'
      );

      const canClose = unpaidOrders.length === 0 && unclosedRequests.length === 0;

      setValidationResult({
        unpaidOrders,
        unclosedRequests,
        canClose
      });

      if (canClose) {
        // If no issues, proceed with normal closure
        await performSessionClosure(sessionId);
      } else {
        // Show confirmation dialog with details
        setShowConfirmation(true);
      }
    } catch (error) {
      console.error('Error validating session closure:', error);
      alert(`Failed to validate session: ${error instanceof Error ? error.message : 'Network error'}`);
    } finally {
      setValidating(false);
    }
  };

  const performSessionClosure = async (sessionId: string, forceClose: boolean = false) => {
    try {
      if (forceClose && validationResult && closeReason) {
        // Update unpaid orders to "Done" status
        for (const order of validationResult.unpaidOrders) {
          try {
            await waiterApi.updateOrderStatus(order.id, 'Done', token);
          } catch (error) {
            console.error(`Failed to update order ${order.id} status:`, error);
          }
        }

        // Update unclosed requests to "Done" status
        for (const request of validationResult.unclosedRequests) {
          try {
            await waiterApi.updateRequestStatus(request.id, 'Done', token);
          } catch (error) {
            console.error(`Failed to update request ${request.id} status:`, error);
          }
        }

        // Log the manual closure reason
        console.log(`Session ${sessionId} manually closed with reason: ${closeReason}`);
      }

      // Close the session
      const data = await waiterApi.closeSession(sessionId, token);
      console.log('Session closed successfully:', data);
      
      // Update local state
      setActiveSessions(prev => prev.filter(session => session.sessionId !== sessionId));
      setSelectedSession("");
      setValidationResult(null);
      setShowConfirmation(false);
      setCloseReason("");
      
      // Show success message
      const tableNumber = activeSessions.find(s => s.sessionId === sessionId)?.tableNumber;
      alert(`Session closed successfully for table ${tableNumber}`);
      
      // Close modal if no more sessions
      if (activeSessions.length <= 1) {
        onClose();
      }
    } catch (error) {
      console.error('Error closing session:', error);
      alert(`Failed to close session: ${error instanceof Error ? error.message : 'Network error'}`);
    }
  };

  const handleCloseSession = async () => {
    if (!selectedSession) {
      alert('Please select a session to close');
      return;
    }

    setClosing(selectedSession);
    try {
      await validateSessionClosure(selectedSession);
    } catch (error) {
      console.error('Error during session closure:', error);
      alert(`Failed to close session: ${error instanceof Error ? error.message : 'Network error'}`);
    } finally {
      setClosing(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-2xl p-6 w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Trash2 className="h-6 w-6 text-red-600 mr-2" />
              <h2 className="text-xl font-bold text-gray-900">Close Table Session</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-red-600 mx-auto mb-2" />
              <p className="text-gray-600">Loading active sessions...</p>
            </div>
          ) : validating ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-gray-600">Validating session status...</p>
            </div>
          ) : showConfirmation && validationResult ? (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                  <h3 className="font-medium text-yellow-800">Session Has Unfinished Items</h3>
                </div>
                
                {validationResult.unpaidOrders.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-yellow-800 mb-2">Unpaid Orders ({validationResult.unpaidOrders.length}):</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      {validationResult.unpaidOrders.map((order, index) => (
                        <li key={order.id || index} className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Order #{order.id?.slice(-6) || index + 1} - Status: {order.status}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {validationResult.unclosedRequests.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-yellow-800 mb-2">Unclosed Requests ({validationResult.unclosedRequests.length}):</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      {validationResult.unclosedRequests.map((request, index) => (
                        <li key={request.id || index} className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {request.requestText || `Request #${index + 1}`} - Status: {request.status}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <p className="text-sm text-yellow-800">
                  Proceeding will mark all unpaid orders and unclosed requests as "Done". 
                  Please provide a reason for manual closure:
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Manual Closure *
                </label>
                <select
                  value={closeReason}
                  onChange={(e) => setCloseReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                >
                  <option value="">Select a reason...</option>
                  <option value="Customer left without paying">Customer left without paying</option>
                  <option value="Manager approved waiver">Manager approved waiver</option>
                  <option value="System error - items already resolved">System error - items already resolved</option>
                  <option value="Emergency closure">Emergency closure</option>
                  <option value="End of shift - items transferred">End of shift - items transferred</option>
                  <option value="Other operational reason">Other operational reason</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowConfirmation(false);
                    setValidationResult(null);
                    setCloseReason("");
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => performSessionClosure(selectedSession, true)}
                  disabled={!closeReason || closing !== null}
                  className="flex-1 px-4 py-2 text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {closing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Closing...
                    </>
                  ) : (
                    'Force Close Session'
                  )}
                </button>
              </div>
            </div>
          ) : activeSessions.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Sessions</h3>
              <p className="text-gray-600">There are no active table sessions to close.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                  <p className="text-sm text-yellow-800">
                    This will validate and close the table session. Orders and requests will be checked before closure.
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Session to Close
                </label>
                <select
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">Choose a session...</option>
                  {activeSessions.map((session) => (
                    <option key={session.sessionId} value={session.sessionId}>
                      Table {session.tableNumber} - Session {session.sessionId.slice(-8)}
                      {session.createdAt && ` (Created: ${new Date(session.createdAt).toLocaleTimeString()})`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCloseSession}
                  disabled={!selectedSession || closing !== null || validating}
                  className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {closing || validating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {validating ? 'Validating...' : 'Closing...'}
                    </>
                  ) : (
                    'Close Session'
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

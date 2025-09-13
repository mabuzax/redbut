"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, ArrowRight, AlertCircle, CheckCircle, Loader2, ChevronDown } from "lucide-react";
import { waiterApi } from "../../lib/api";

interface TableTransferDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTransferComplete: () => void;
  activeSessions: any[];
  token: string;
}

interface AvailableWaiter {
  id: string;
  name: string;
  surname: string;
  tag_nickname: string | null;
}

interface SessionTransfer {
  sessionId: string;
  waiterId: string;
}

export default function TableTransferDialog({ 
  isOpen, 
  onClose, 
  onTransferComplete, 
  activeSessions, 
  token 
}: TableTransferDialogProps) {
  const [availableWaiters, setAvailableWaiters] = useState<AvailableWaiter[]>([]);
  const [sessionTransfers, setSessionTransfers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [transferredCount, setTransferredCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableWaiters();
      setSuccess(false);
      setError(null);
      setSessionTransfers({});
      setTransferredCount(0);
    }
  }, [isOpen, token]);

  const fetchAvailableWaiters = async () => {
    setLoading(true);
    setError(null);
    try {
      const waiters = await waiterApi.getAvailableWaiters(token);
      setAvailableWaiters(waiters);
    } catch (err: any) {
      setError(err.message || 'Failed to load available waiters');
    } finally {
      setLoading(false);
    }
  };

  const handleWaiterSelection = (sessionId: string, waiterId: string) => {
    setSessionTransfers(prev => ({
      ...prev,
      [sessionId]: waiterId
    }));
  };

  const canTransfer = () => {
    // All sessions must have a waiter selected
    return activeSessions.every(session => sessionTransfers[session.sessionId]);
  };

  const handleTransfer = async () => {
    if (!canTransfer()) {
      setError('Please assign a waiter to each table');
      return;
    }

    setTransferring(true);
    setError(null);
    
    try {
      // Group sessions by target waiter for batch transfers
      const transfersByWaiter: Record<string, string[]> = {};
      Object.entries(sessionTransfers).forEach(([sessionId, waiterId]) => {
        if (!transfersByWaiter[waiterId]) {
          transfersByWaiter[waiterId] = [];
        }
        transfersByWaiter[waiterId].push(sessionId);
      });

      // Perform transfers for each waiter
      let totalTransferred = 0;
      for (const [waiterId, sessionIds] of Object.entries(transfersByWaiter)) {
        const result = await waiterApi.transferSpecificSessions(sessionIds, waiterId, token);
        totalTransferred += result.transferredSessions || sessionIds.length;
      }

      setTransferredCount(totalTransferred);
      setSuccess(true);
      
      // Auto-close and complete after a short delay
      setTimeout(() => {
        onTransferComplete();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to transfer sessions');
    } finally {
      setTransferring(false);
    }
  };

  const getWaiterDisplayName = (waiter: AvailableWaiter) => {
    return waiter.tag_nickname || `${waiter.name} ${waiter.surname}`;
  };

  const getSelectedWaiterNames = () => {
    const uniqueWaiters = new Set(Object.values(sessionTransfers));
    return Array.from(uniqueWaiters).map(waiterId => {
      const waiter = availableWaiters.find(w => w.id === waiterId);
      return waiter ? getWaiterDisplayName(waiter) : 'Unknown';
    }).join(', ');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={!transferring ? onClose : undefined}
          >
            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <Users className="h-4 w-4 text-orange-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Transfer Tables</h2>
                </div>
                {!transferring && (
                  <button
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
                {success ? (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full mx-auto flex items-center justify-center mb-4">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Transfer Complete!</h3>
                    <p className="text-gray-600">
                      {transferredCount} table{transferredCount !== 1 ? 's have' : ' has'} been successfully transferred to {getSelectedWaiterNames()}.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Warning */}
                    <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200 mb-6">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-red-800 mb-1">
                          Cannot Sign Out
                        </p>
                        <p className="text-sm text-red-700">
                          You have {activeSessions.length} open table{activeSessions.length !== 1 ? 's' : ''}. 
                          You must transfer all tables to other waiters before signing out.
                        </p>
                      </div>
                    </div>

                    {/* Session Transfer List */}
                    {activeSessions.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-sm font-medium text-gray-900 mb-4">Assign each table to a waiter:</h4>
                        
                        {loading ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                            <span className="ml-2 text-sm text-gray-500">Loading waiters...</span>
                          </div>
                        ) : availableWaiters.length === 0 ? (
                          <div className="text-center py-4 text-red-600">
                            No other waiters available for transfer. Cannot sign out.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {activeSessions.map((session) => (
                              <div key={session.sessionId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3">
                                    <span className="font-medium text-lg">Table {session.tableNumber}</span>
                                    <div className="flex gap-2 text-sm text-gray-500">
                                      {session.orderCount > 0 && (
                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                          {session.orderCount} order{session.orderCount !== 1 ? 's' : ''}
                                        </span>
                                      )}
                                      {session.requestCount > 0 && (
                                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                                          {session.requestCount} request{session.requestCount !== 1 ? 's' : ''}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex-shrink-0 w-48">
                                  <select
                                    value={sessionTransfers[session.sessionId] || ''}
                                    onChange={(e) => handleWaiterSelection(session.sessionId, e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    disabled={transferring}
                                  >
                                    <option value="">Select waiter...</option>
                                    {availableWaiters.map((waiter) => (
                                      <option key={waiter.id} value={waiter.id}>
                                        {getWaiterDisplayName(waiter)}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Error */}
                    {error && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-600">{error}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              {!success && (
                <div className="flex gap-3 p-6 border-t border-gray-200">
                  <button
                    onClick={onClose}
                    disabled={transferring}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleTransfer}
                    disabled={!canTransfer() || transferring || availableWaiters.length === 0}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {transferring ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Transferring...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="h-4 w-4" />
                        Transfer & Sign Out
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { getTableSessions, removeTableSession, TableSession } from "../../lib/table-sessions";

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

  useEffect(() => {
    if (isOpen) {
      fetchActiveSessions();
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/waiter/sessions/${waiterId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('CloseSessionModal: API response status:', response.status);
      
      if (response.ok) {
        const apiSessions = await response.json();
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
      } else {
        console.error('API request failed, falling back to localStorage');
        // If API fails, fallback to localStorage sessions
        setActiveSessions(getTableSessions());
      }
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

  const handleCloseSession = async () => {
    if (!selectedSession) {
      alert('Please select a session to close');
      return;
    }

    setClosing(selectedSession);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/waiter/close-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId: selectedSession })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Session closed successfully:', data);
        
        // Session is closed in the database, just update local state
        // No need to update localStorage since we're now using API as source of truth
        setActiveSessions(prev => prev.filter(session => session.sessionId !== selectedSession));
        setSelectedSession("");
        
        // Show success message
        alert(`Session closed successfully for table ${activeSessions.find(s => s.sessionId === selectedSession)?.tableNumber}`);
        
        // Close modal if no more sessions
        if (activeSessions.length <= 1) {
          onClose();
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to close session:', errorData);
        alert(`Failed to close session: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error closing session:', error);
      alert('Failed to close session: Network error');
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
                    This will clear the table session and make the table available for new customers.
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
                  disabled={!selectedSession || closing !== null}
                  className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {closing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Closing...
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

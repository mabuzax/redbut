"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QrCode, Clock, Users, X } from "lucide-react";
import { getTableSessions, removeTableSession, TableSession } from "../../lib/table-sessions";
import QRCode from "qrcode";

interface TableSessionsDisplayProps {
  token: string;
  onCloseSession?: (sessionId: string) => void;
  refreshTrigger?: number; // Optional prop to trigger refresh from parent
  onViewOrders?: (sessionId: string, tableNumber: number) => void; // Callback to handle order view
  onViewRequests?: (sessionId: string, tableNumber: number) => void; // Callback to handle request view
}

export default function TableSessionsDisplay({ token, onCloseSession, refreshTrigger, onViewOrders, onViewRequests }: TableSessionsDisplayProps) {
  const [sessions, setSessions] = useState<TableSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<TableSession | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [sessionToClose, setSessionToClose] = useState<TableSession | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  // Refresh when refreshTrigger changes (triggered by parent)
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      loadSessions();

    }
  }, [refreshTrigger]);

  const loadSessions = async () => {
    try {
      // First, try to get waiter ID from token or user data
      const waiterId = extractWaiterIdFromToken(token);
      if (!waiterId) {
        console.error('No waiter ID found in token');
        setSessions([]);
        return;
      }
    console.log('TableSessionsDisplay: waiterId:', waiterId);
      // Fetch sessions from API instead of localStorage
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/waiter/sessions/${waiterId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const apiSessions = await response.json();
        console.log('TableSessionsDisplay: Loading sessions from API:', apiSessions);
        
        // Convert API response to our TableSession format
        const tableSessions: TableSession[] = apiSessions.map((session: any) => ({
          sessionId: session.sessionId,
          tableNumber: session.tableNumber,
          waiterId: session.waiterId,
          qrCodeUrl: session.qrCodeUrl,
          createdAt: session.createdAt,
          orderCount: session.orderCount || 0, // Include order count from API
          requestCount: session.requestCount || 0, // Include request count from API
        }));
        
        setSessions(tableSessions);
        
        // Sync with localStorage for offline access
        localStorage.setItem('redBut_table_sessions', JSON.stringify(tableSessions));
      } else {
        console.error('Failed to fetch sessions from API, falling back to localStorage');
        // Fallback to localStorage if API fails
        const tableSessions = getTableSessions();
        setSessions(tableSessions);
      }
    } catch (error) {
      console.error('Error loading table sessions:', error);
      // Fallback to localStorage on error
      const tableSessions = getTableSessions();
      setSessions(tableSessions);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to extract waiter ID from JWT token
  const extractWaiterIdFromToken = (token: string): string | null => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('TableSessionsDisplay: JWT payload:', payload);
      return payload.userId || null;
    } catch (error) {
      console.error('Error parsing token:', error);
      return null;
    }
  };

  const handleRemoveSession = (sessionId: string) => {
    const session = sessions.find(s => s.sessionId === sessionId);
    if (session) {
      setSessionToClose(session);
    }
  };

  const confirmCloseSession = async () => {
    if (!sessionToClose) return;
    
    setIsClosing(true);
    try {
      // Close session via API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/waiter/close-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId: sessionToClose.sessionId })
      });

      if (response.ok) {
        console.log('Session closed successfully via API');
        // Update local state immediately
        setSessions(prev => prev.filter(s => s.sessionId !== sessionToClose.sessionId));
        
        // Also update localStorage for consistency
        removeTableSession(sessionToClose.sessionId);
        
        if (onCloseSession) {
          onCloseSession(sessionToClose.sessionId);
        }
        
        // Close the confirmation modal
        setSessionToClose(null);
      } else {
        console.error('Failed to close session via API');
        alert('Failed to close session');
      }
    } catch (error) {
      console.error('Error closing session:', error);
      alert('Failed to close session');
    } finally {
      setIsClosing(false);
    }
  };

  const cancelCloseSession = () => {
    setSessionToClose(null);
  };

  const handleShowQR = async (session: TableSession) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(session.qrCodeUrl, {
        width: 256,
        margin: 2,
      });
      setQrCodeDataUrl(qrDataUrl);
      setSelectedSession(session);
    } catch (error) {
      console.error('Error generating QR code:', error);
      alert('Failed to generate QR code');
    }
  };

  const closeQRModal = () => {
    setSelectedSession(null);
    setQrCodeDataUrl("");
  };

  const formatTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Unknown';
    }
  };

  const formatDuration = (dateString: string) => {
    try {
      const created = new Date(dateString);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
      
      if (diffMinutes < 60) {
        return `${diffMinutes}m`;
      } else {
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;
        return `${hours}h ${minutes}m`;
      }
    } catch {
      return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        <Users className="mx-auto h-12 w-12 mb-4 text-gray-300" />
        <p>No active table sessions</p>
        <p className="text-sm">Create a new session to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Active Table Sessions</h3>
        <span className="text-sm text-gray-500">{sessions.length} active</span>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sessions.map((session) => (
          <motion.div
            key={session.sessionId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold text-gray-900">Table {session.tableNumber}</h4>
                <p className="text-sm text-gray-500">Session ID: {session.sessionId.slice(-8)}</p>
                
                
                {/* Badge Container */}
                <div className="flex gap-2 mt-2">
                  {/* Order Count Badge */}
                {/* Order Count Badge with conditional blinking */}
                <button
                    onClick={() => onViewOrders?.(session.sessionId, session.tableNumber)}
                    className={`inline-flex items-center px-2 py-1 text-xs font-bold rounded-button transition-colors ${
                        (session.orderCount || 0) > 0
                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    } ${(session.orderCount || 0) > 0 ? 'animate-pulse' : ''}`}
                >
                    {session.orderCount > 0 ? 'View' : ''}  {session.orderCount || 'No '} {(session.orderCount || 0) === 1 ? 'order' : 'orders'}
                </button>

                {/* Request Count Badge with conditional blinking */}
                <button
                    onClick={() => onViewRequests?.(session.sessionId, session.tableNumber)}
                    className={`inline-flex items-center self-end px-2 py-1 text-xs font-bold rounded-button transition-colors ${
                        (session.requestCount || 0) > 0
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    } ${(session.requestCount || 0) > 0 ? 'animate-pulse' : ''}`}
                >
                    {session.requestCount > 0 ? 'View' : ''} {session.requestCount || 'No '} {(session.requestCount || 0) === 1 ? 'request' : 'requests'}
                </button>
                  
                </div>
              </div>
              <button
                onClick={() => handleRemoveSession(session.sessionId)}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                title="Remove session"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-2" />
                Started: {formatTime(session.createdAt)}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Users className="h-4 w-4 mr-2" />
                Duration: {formatDuration(session.createdAt)}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <button
                onClick={() => handleShowQR(session)}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800"
              >
                <QrCode className="h-4 w-4 mr-1" />
                Show QR
              </button>
              
              <div className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                Active
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* QR Code Modal */}
      <AnimatePresence>
        {selectedSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={closeQRModal}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-lg p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Table {selectedSession.tableNumber} QR Code
                </h3>
                <button
                  onClick={closeQRModal}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="text-center">
                {qrCodeDataUrl && (
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code"
                    className="mx-auto mb-4 border border-gray-200 rounded"
                  />
                )}
                <p className="text-sm text-gray-600 mb-2">
                  Show this QR code to customers to access the table menu
                </p>
                <p className="text-xs text-gray-500 break-all">
                  {selectedSession.qrCodeUrl}
                </p>
              </div>
              
              <div className="mt-6 flex gap-3">
                <button
                  onClick={closeQRModal}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedSession.qrCodeUrl);
                    alert('URL copied to clipboard!');
                  }}
                  className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Copy URL
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Close Session Confirmation Modal */}
      <AnimatePresence>
        {sessionToClose && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={cancelCloseSession}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-lg p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-red-600">
                  Close Table Session
                </h3>
                <button
                  onClick={cancelCloseSession}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  disabled={isClosing}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="text-center mb-6">
                <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <X className="h-6 w-6 text-red-600" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Close Table {sessionToClose.tableNumber}?
                </h4>
                <p className="text-sm text-gray-600">
                  This will clear the table session and make the table available for new customers.
                  This action cannot be undone.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={cancelCloseSession}
                  disabled={isClosing}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmCloseSession}
                  disabled={isClosing}
                  className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {isClosing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Closing...
                    </>
                  ) : (
                    'Close Session'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

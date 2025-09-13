"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, QrCode, Loader2 } from "lucide-react";
import QRCode from "qrcode";
import { addTableSession, TableSession } from "../../lib/table-sessions";
import { waiterApi } from "../../lib/api";

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
}

interface Waiter {
  id: string;
  name: string;
  surname: string;
}

export default function CreateSessionModal({ isOpen, onClose, token }: CreateSessionModalProps) {
  const [tableNumber, setTableNumber] = useState<string>("");
  const [selectedWaiterId, setSelectedWaiterId] = useState<string>("");
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [loading, setLoading] = useState(false);
  const [waitersLoading, setWaitersLoading] = useState(false);
  const [sessionCreated, setSessionCreated] = useState<{
    sessionId: string;
    qrCodeUrl: string;
  } | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  // Fetch waiters when modal opens
  useEffect(() => {
    if (isOpen && waiters.length === 0) {
      fetchWaiters();
    }
  }, [isOpen]);

  // Generate QR code when session is created
  useEffect(() => {
    if (sessionCreated?.qrCodeUrl) {
      generateQRCode(sessionCreated.qrCodeUrl);
    }
  }, [sessionCreated]);

  const fetchWaiters = async () => {
    setWaitersLoading(true);
    try {
      const data = await waiterApi.getAllWaiters(token);
      setWaiters(data);
    } catch (error) {
      console.error('Error fetching waiters:', error);
    } finally {
      setWaitersLoading(false);
    }
  };

  const generateQRCode = async (url: string) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeDataUrl(qrDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const handleCreateSession = async () => {
    if (!tableNumber || !selectedWaiterId) {
      alert('Please select both table number and waiter');
      return;
    }

    setLoading(true);
    try {
      const sessionId = `${crypto.randomUUID()}_${tableNumber}_${selectedWaiterId}`;
      
      await waiterApi.createSession({
        tableNumber: parseInt(tableNumber),
        waiterId: selectedWaiterId,
        sessionId
      }, token);

      const webAppUrl = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';
      const qrCodeUrl = `${webAppUrl}?session=${sessionId}`;
      
      // No need to save to localStorage anymore - sessions will be fetched from API
      // The session is already created in the database via the API call above
      
      setSessionCreated({
        sessionId,
        qrCodeUrl
      });
    } catch (error) {
      console.error('Error creating session:', error);
      alert(`Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTableNumber("");
    setSelectedWaiterId("");
    setSessionCreated(null);
    setQrCodeDataUrl("");
    onClose();
  };

  const tableNumbers = Array.from({ length: 20 }, (_, i) => i + 1);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full relative p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {!sessionCreated ? (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Create Table Session</h3>
                  <button
                    onClick={handleClose}
                    className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Table Number Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Table Number
                    </label>
                    <select
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      className="w-full border border-gray-300 rounded-md p-3 bg-white text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="">Select Table Number</option>
                      {tableNumbers.map(num => (
                        <option key={num} value={num}>Table {num}</option>
                      ))}
                    </select>
                  </div>

                  {/* Waiter Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Waiter
                    </label>
                    {waitersLoading ? (
                      <div className="flex items-center justify-center p-3 border border-gray-300 rounded-md">
                        <Loader2 className="h-5 w-5 animate-spin text-red-500 mr-2" />
                        <span className="text-gray-500">Loading waiters...</span>
                      </div>
                    ) : (
                      <select
                        value={selectedWaiterId}
                        onChange={(e) => setSelectedWaiterId(e.target.value)}
                        className="w-full border border-gray-300 rounded-md p-3 bg-white text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      >
                        <option value="">Select Waiter</option>
                        {waiters.map(waiter => (
                          <option key={waiter.id} value={waiter.id}>
                            {waiter.name} {waiter.surname}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Create Button */}
                  <button
                    onClick={handleCreateSession}
                    disabled={loading || !tableNumber || !selectedWaiterId}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Creating Session...
                      </>
                    ) : (
                      'Create Table Session'
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Session Created!</h3>
                  <button
                    onClick={handleClose}
                    className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="text-center space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <QrCode className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-green-800 font-medium">Table session created successfully!</p>
                    <p className="text-green-600 text-sm mt-1">Session ID: {sessionCreated.sessionId}</p>
                  </div>

                  {qrCodeDataUrl && (
                    <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                      <p className="text-gray-700 font-medium mb-3">QR Code for customers:</p>
                      <img 
                        src={qrCodeDataUrl} 
                        alt="QR Code" 
                        className="mx-auto"
                        style={{ maxWidth: '200px', height: 'auto' }}
                      />
                      <p className="text-gray-500 text-xs mt-2">
                        Customer can scan this to access the table session
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleClose}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

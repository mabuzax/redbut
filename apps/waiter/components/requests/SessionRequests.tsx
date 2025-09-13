"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RefreshCw, X, Loader2 } from "lucide-react";
import TimeAgo from "react-timeago";
import { waiterApi, WaiterRequest } from "../../lib/api";
import { RequestStatusConfigService } from "../../lib/request-status-config";
import { RequestStatus } from "../../lib/types";

interface SessionRequestsProps {
  sessionId: string;
  tableNumber: number;
  token: string;
  onBack: () => void;
}

function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function SessionRequests({
  sessionId,
  tableNumber,
  token,
  onBack,
}: SessionRequestsProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<WaiterRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<WaiterRequest | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string>("New");
  const [statusOptions, setStatusOptions] = useState<{ targetStatus: string; label: string }[]>([]);
  const [statusOptionsLoading, setStatusOptionsLoading] = useState(false);
  const [showStatusChangeDialog, setShowStatusChangeDialog] = useState(false);

  // Custom sorting function for waiter requests
  const sortRequestsByPriority = useCallback((requests: WaiterRequest[]): WaiterRequest[] => {
    return [...requests].sort((a, b) => {
      // Priority order: New > Others > Cancelled/Done
      const getPriority = (status: string) => {
        if (status === 'New') return 1;
        if (status === 'Cancelled' || status === 'Done') return 3;
        return 2; // All other statuses
      };

      const priorityA = getPriority(a.status);
      const priorityB = getPriority(b.status);

      // First sort by priority
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Within same priority group, sort by oldest first (createdAt ascending)
      // Ensure proper date parsing
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      
      // Handle invalid dates
      if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
        return 0; // Keep original order if dates are invalid
      }
      
      return dateA.getTime() - dateB.getTime();
    });
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await waiterApi.getRequestsBySession(sessionId, token);
      
      // Apply custom sorting for waiter priority order
      const sortedRequests = sortRequestsByPriority(response);
      setRequests(sortedRequests);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId, token, sortRequestsByPriority]);

  const loadStatusOptions = async (currentStatus: string) => {
    try {
      setStatusOptionsLoading(true);
      const options = RequestStatusConfigService.getStatusOptions(currentStatus as RequestStatus);
      
      // Convert StatusOption[] to the expected format for this component
      const convertedOptions = options.map(option => ({
        targetStatus: option.value,
        label: option.label
      }));
      
      // Ensure current status is always first in the dropdown
      const sortedOptions = convertedOptions.sort((a, b) => {
        if (a.targetStatus === currentStatus) return -1;
        if (b.targetStatus === currentStatus) return 1;
        return 0;
      });
      
      setStatusOptions(sortedOptions);
    } catch (error) {
      console.error('Error loading status options:', error);
      // Fallback to default options if API fails
      const fallbackOptions = [
        { targetStatus: 'InProgress', label: 'In Progress' },
        { targetStatus: 'Cancelled', label: 'Cancel' }
      ];
      
      // Ensure current status is first in fallback too
      const sortedFallback = fallbackOptions.sort((a, b) => {
        if (a.targetStatus === currentStatus) return -1;
        if (b.targetStatus === currentStatus) return 1;
        return 0;
      });
      
      setStatusOptions(sortedFallback);
    } finally {
      setStatusOptionsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleUpdateStatus = async () => {
    if (!selectedRequest) return;
    setSaving(true);
    try {
      const updated = await waiterApi.updateRequestStatus(selectedRequest.id, status, token);
      
      // Update the local state and apply sorting
      setRequests((prevRequests) => {
        const updatedRequests = prevRequests.map((r) => (r.id === updated.id ? updated : r));
        return sortRequestsByPriority(updatedRequests);
      });
      
      setSelectedRequest(null);
      // Refresh the list to get updated data and ensure consistency
      await fetchRequests();
    } catch (e: any) {
      const errorMessage = e.message || 'An unknown error occurred while updating the request.';
      
      // Check if this is a status change race condition error
      if (errorMessage.includes('status may have changed while you were editing') || 
          errorMessage.includes('Refresh for the latest status')) {
        // Close the edit modal and show the status change dialog
        setSelectedRequest(null);
        setShowStatusChangeDialog(true);
      } else {
        // Show regular alert for other errors
        alert(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChangeDialogOk = () => {
    setShowStatusChangeDialog(false);
    // Refresh the whole listing page
    fetchRequests();
  };

  const getStatusClass = (status: WaiterRequest["status"]) => {
    switch (status) {
      case "New":
        return "bg-blue-200 text-blue-600";
      case "InProgress":
        return "bg-purple-200 text-purple-600";
      case "Completed":
        return "bg-green-200 text-green-600";
      default:
        return "bg-gray-200 text-gray-600";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="inline-flex items-center justify-center p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="mr-3 text-red-800 hover:text-red-900 transition-colors" strokeWidth={4} />
          </button>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Table {tableNumber} Requests
            </h2>
            <p className="text-sm text-gray-500">
              Session: {sessionId.slice(-8)}
            </p>
          </div>
        </div>
        <button
          onClick={fetchRequests}
          className="inline-flex items-center justify-center px-4 py-2 font-medium text-gray-900 bg-gray-100 rounded-full hover:bg-gray-200 active:bg-gray-300 transition-all"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500 mr-2" />
            <p className="text-gray-500">Let me find you your requests...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchRequests}
              className="mt-4 inline-flex items-center justify-center px-4 py-2 font-medium text-white bg-red-500 rounded-full hover:bg-red-600 transition-all"
            >
              Try Again
            </button>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <p>No requests for this table yet 🎉</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {requests.map((request) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={async () => {
                  setSelectedRequest(request);
                  setStatus(request.status as any);
                  await loadStatusOptions(request.status);
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm text-gray-500">
                    <TimeAgo date={request.createdAt} />
                  </span>
                  <span
                    className={classNames(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      getStatusClass(request.status)
                    )}
                  >
                    {request.status}
                  </span>
                </div>
                <p className="text-gray-900">
                  {request.content.length > 100
                    ? `${request.content.substring(0, 100)}...`
                    : request.content}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Request Detail Modal */}
      <AnimatePresence>
        {selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedRequest(null)}
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white text-gray-900 rounded-lg shadow-xl max-w-md w-full relative p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Request Details</h3>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="inline-flex items-center justify-center px-4 py-2 font-medium text-gray-900 bg-gray-100 rounded-full hover:bg-gray-200 active:bg-gray-300 transition-all"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2">
                  <TimeAgo date={selectedRequest.createdAt} />
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Table {tableNumber}
                </p>
                <p className="whitespace-pre-wrap text-gray-900 mb-4">
                  {selectedRequest.content}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                {statusOptionsLoading ? (
                  <div className="w-full border border-gray-200 rounded-md p-2 bg-gray-100 text-gray-500">
                    RedBut
                  </div>
                ) : statusOptions.length === 0 ? (
                  <div className="w-full border border-gray-200 rounded-md p-2 bg-gray-50 text-gray-900 font-medium">
                    {selectedRequest.status}
                  </div>
                ) : (
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as typeof status)
                    }
                    className="w-full border border-gray-200 rounded-md p-2 bg-white text-gray-900"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.targetStatus} value={option.targetStatus}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Only show update button if there are status options to change to */}
              {statusOptions.length > 0 && (
                <button
                  onClick={handleUpdateStatus}
                  disabled={saving || statusOptionsLoading}
                  className={classNames(
                    "inline-flex items-center justify-center px-4 py-2 font-medium text-white bg-primary-500 rounded-full shadow hover:bg-primary-600 active:bg-primary-700 transition-all w-full",
                    saving || statusOptionsLoading ? "opacity-50 cursor-not-allowed" : ""
                  )}
                >
                  {saving ? "Updating..." : "Update Status"}
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Change Dialog */}
      <AnimatePresence>
        {showStatusChangeDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full"
            >
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                  <RefreshCw className="h-6 w-6 text-yellow-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Status Changed</h3>
                <p className="text-sm text-gray-500 mb-6">
                  The status of this item has changed. I will refresh for the latest state.
                </p>
                <button
                  onClick={handleStatusChangeDialogOk}
                  className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-2 px-4 rounded-md transition-colors"
                >
                  OK
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

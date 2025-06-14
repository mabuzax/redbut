import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TimeAgo from 'react-timeago';
import { Loader2, Edit, CheckCircle, XCircle, PauseCircle, RefreshCw, X } from 'lucide-react';

// Define interfaces for data structures
interface Request {
  id: string;
  userId: string;
  tableNumber: number;
  content: string;
  status: 'New' | 'OnHold' | 'Cancelled' | 'Done';
  createdAt: string;
  updatedAt: string;
}

interface MyRequestsProps {
  userId: string;
  token: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const MyRequests: React.FC<MyRequestsProps> = ({ userId, token }) => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editStatus, setEditStatus] = useState<Request['status'] | ''>('');
  const [updatingRequest, setUpdatingRequest] = useState(false);

  /**
   * Fetch waiter requests for the current user.
   * Uses the `token` prop that was provided when the component was mounted
   * instead of attempting to read from localStorage.  Memoised with
   * useCallback so the reference is stable for useEffect.
   */
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(
        `${API_BASE_URL}/api/v1/requests?userId=${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch requests: ${response.statusText}`);
      }

      const data: Request[] = await response.json();
      setRequests(data);
    } catch (err: any) {
      console.error('Failed to fetch requests:', err);
      setError(err.message || 'Unable to load requests.');
    } finally {
      setLoading(false);
    }
  }, [userId, token]);

  useEffect(() => {
    if (!userId || !token) {
      setError('User not authenticated. Please log in.');
      setLoading(false);
      return;
    }

    fetchRequests();
  }, [fetchRequests, userId, token]);

  const handleRowClick = (request: Request) => {
    setSelectedRequest(request);
    setEditContent(request.content);
    setEditStatus(request.status);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
    setEditContent('');
    setEditStatus('');
  };

  const handleUpdateSubmit = async () => {
    if (!selectedRequest) return;

    setUpdatingRequest(true);
    setError(null);

    try {
      const updatePayload: { content?: string; status?: Request['status'] } = {};

      // Only include content if it's editable and changed
      const isContentEditable = ['New', 'OnHold'].includes(selectedRequest.status);
      if (isContentEditable && editContent !== selectedRequest.content) {
        updatePayload.content = editContent;
      }

      // Only include status if it's changed
      if (editStatus && editStatus !== selectedRequest.status) {
        updatePayload.status = editStatus;
      }

      if (Object.keys(updatePayload).length === 0) {
        // No changes to submit
        handleModalClose();
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/requests/${selectedRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update request.');
      }

      // Refresh requests after successful update
      fetchRequests();
      handleModalClose();
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred while updating the request.');
      console.error('Failed to update request:', err);
    } finally {
      setUpdatingRequest(false);
    }
  };

  const getStatusOptions = (currentStatus: Request['status']) => {
    switch (currentStatus) {
      case 'New':
        return [
          { value: 'New', label: 'New' },
          { value: 'OnHold', label: 'Hold' },
          { value: 'Cancelled', label: 'Cancel' },
          { value: 'Done', label: 'Done' },
        ];
      case 'OnHold':
        return [
          { value: 'OnHold', label: 'On Hold' },
          { value: 'New', label: 'Activate' },
          { value: 'Cancelled', label: 'Cancel' },
        ];
      case 'Cancelled':
      case 'Done':
        return [{ value: currentStatus, label: currentStatus }]; // Not editable
      default:
        return [];
    }
  };

  const getStatusClass = (status: Request['status']) => {
    switch (status) {
      case 'New':
        return 'bg-blue-200 text-blue-600';
      case 'OnHold':
        return 'bg-yellow-200 text-yellow-600';
      case 'Cancelled':
        return 'bg-red-200 text-red-600';
      case 'Done':
        return 'bg-green-200 text-green-600';
      default:
        return 'bg-gray-200 text-gray-600';
    }
  };

  const isEditable = selectedRequest && ['New', 'OnHold'].includes(selectedRequest.status);
  const statusOptions = selectedRequest ? getStatusOptions(selectedRequest.status) : [];

  return (
    <div className="p-4 bg-white rounded-lg shadow-md h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-primary-700">My Requests</h2>
        <button
          onClick={fetchRequests}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Refresh requests"
        >
          <RefreshCw className="h-5 w-5 text-primary-600" />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center flex-1">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Loader2 className="h-10 w-10 animate-spin text-primary-500 mb-4" />
            <p className="text-gray-600">Loading requests...</p>
          </motion.div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center flex-1">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-red-500 text-center mb-4">{error}</p>
            <button
              onClick={fetchRequests}
              className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
            >
              <RefreshCw className="inline-block w-4 h-4 mr-2" /> Try Again
            </button>
          </motion.div>
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-gray-600">No requests found.</p>
            <button
              onClick={fetchRequests}
              className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
            >
              <RefreshCw className="inline-block w-4 h-4 mr-2" /> Refresh
            </button>
          </motion.div>
        </div>
      ) : (
        <div className="overflow-x-auto flex-1">
          {/* Mobile view - Card based list */}
          <div className="md:hidden space-y-4">
            {requests.map((request) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm"
                onClick={() => handleRowClick(request)}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm text-gray-500">
                    <TimeAgo date={request.createdAt} />
                  </span>
                  <span
                    className={`py-1 px-3 rounded-full text-xs font-medium ${getStatusClass(request.status)}`}
                  >
                    {request.status}
                  </span>
                </div>
                <p className="text-gray-800 line-clamp-2">{request.content}</p>
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRowClick(request);
                    }}
                    className="text-primary-500 hover:text-primary-700"
                    aria-label="Edit request"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Desktop view - Table */}
          <table className="min-w-full bg-white border border-gray-200 hidden md:table">
            <thead>
              <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-left">Time</th>
                <th className="py-3 px-6 text-left">Request</th>
                <th className="py-3 px-6 text-center">Status</th>
                <th className="py-3 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm font-light">
              {requests.map((request) => (
                <motion.tr
                  key={request.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleRowClick(request)}
                >
                  <td className="py-3 px-6 text-left whitespace-nowrap">
                    <TimeAgo date={request.createdAt} />
                  </td>
                  <td className="py-3 px-6 text-left max-w-xs overflow-hidden text-ellipsis">
                    {request.content}
                  </td>
                  <td className="py-3 px-6 text-center">
                    <span
                      className={`py-1 px-3 rounded-full text-xs font-medium ${getStatusClass(request.status)}`}
                    >
                      {request.status}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row click from triggering
                        handleRowClick(request);
                      }}
                      className="text-primary-500 hover:text-primary-700"
                      aria-label="Edit request"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={handleModalClose}
            data-testid="modal-overlay"
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full relative"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
            >
              <button
                onClick={handleModalClose}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
              <h3 className="text-xl font-bold text-primary-700 mb-2">Request</h3>
              <p className="text-sm text-gray-500 mb-4">
                <TimeAgo date={selectedRequest.createdAt} />
              </p>

              <div className="mb-4">
                <label htmlFor="requestContent" className="block text-gray-700 text-sm font-bold mb-2">
                  Request:
                </label>
                {isEditable ? (
                  <textarea
                    id="requestContent"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-24 resize-none"
                  />
                ) : (
                  <p className="bg-gray-100 p-3 rounded-md whitespace-pre-wrap">{selectedRequest.content}</p>
                )}
              </div>

              <div className="mb-6">
                <label htmlFor="requestStatus" className="block text-gray-700 text-sm font-bold mb-2">
                  Status:
                </label>
                {['Cancelled', 'Done'].includes(selectedRequest.status) ? (
                  <p className={`p-3 rounded-md font-medium ${getStatusClass(selectedRequest.status)}`}>
                    {selectedRequest.status}
                  </p>
                ) : (
                  <select
                    id="requestStatus"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as Request['status'])}
                    className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    disabled={updatingRequest}
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

              {isEditable && (
                <button
                  onClick={handleUpdateSubmit}
                  className={`w-full bg-primary-500 text-white font-bold py-2 px-4 rounded-md transition-colors ${
                    updatingRequest ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-600'
                  }`}
                  disabled={updatingRequest}
                >
                  {updatingRequest ? (
                    <Loader2 className="inline-block w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="inline-block w-5 h-5 mr-2" />
                  )}
                  {updatingRequest ? 'Updating...' : 'Update Request'}
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyRequests;
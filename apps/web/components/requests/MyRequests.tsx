import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TimeAgo from 'react-timeago';
import { Loader2, Edit, CheckCircle, XCircle, PauseCircle, RefreshCw, X } from 'lucide-react';
import { api, serviceAnalysisApi } from '@/lib/api';
import { RequestStatusConfigService } from '../../lib/request-status-config';
import { RequestStatus } from '../../lib/types';
import { ServiceAnalysisData } from '../../types/service-analysis';
import { getWaiterIdFromLocalStorage } from '../../lib/session-utils';
import ReviewComponent from '../feedback/ReviewComponent';

// Define interfaces for data structures
interface Request {
  id: string;
  userId: string;
  tableNumber: number;
  content: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
}

interface MyRequestsProps {
  userId: string;
  token: string;
}

const MyRequests: React.FC<MyRequestsProps> = ({ userId, token }) => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editStatus, setEditStatus] = useState<Request['status'] | ''>('');
  const [updatingRequest, setUpdatingRequest] = useState(false);
  const [statusOptions, setStatusOptions] = useState<{ value: string; label: string }[]>([]);
  const [statusOptionsLoading, setStatusOptionsLoading] = useState(false);
  const [showStatusChangeDialog, setShowStatusChangeDialog] = useState(false);
  
  // Review component state
  const [reviewDialog, setReviewDialog] = useState({
    isOpen: false,
    requestId: '',
    newStatus: '' as RequestStatus | '',
    sessionId: '',
    userId: '',
    waiterId: ''
  });

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

      const response = await api.get(
        `/api/v1/requests?userId=${userId}`
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
    
    // Load status options for the selected request
    loadStatusOptions(request.status);
  };

  const loadStatusOptions = (currentStatus: Request['status']) => {
    setStatusOptionsLoading(true);
    try {
      const options = RequestStatusConfigService.getStatusOptions(currentStatus);
      
      // Ensure current status is always first in the dropdown
      const sortedOptions = options.sort((a, b) => {
        if (a.value === currentStatus) return -1;
        if (b.value === currentStatus) return 1;
        return 0;
      });
      
      setStatusOptions(sortedOptions);
    } catch (err) {
      console.error('Error loading status options:', err);
      const fallbackOptions = RequestStatusConfigService.getDefaultStatusOptions(currentStatus);
      
      // Ensure current status is first in fallback too
      const sortedFallback = fallbackOptions.sort((a, b) => {
        if (a.value === currentStatus) return -1;
        if (b.value === currentStatus) return 1;
        return 0;
      });
      
      setStatusOptions(sortedFallback);
    } finally {
      setStatusOptionsLoading(false);
    }
  };

  const refreshStatusOptions = async () => {
    if (!selectedRequest) return;
    
    // Reload status options with current request status
    await loadStatusOptions(selectedRequest.status);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
    setEditContent('');
    setEditStatus('');
    setStatusOptions([]);
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

      // If status is being changed, validate the transition with fresh data from backend
      // The backend will check the current database status and validate the transition
      const response = await api.put(`/api/v1/requests/${selectedRequest.id}`, updatePayload);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update request.');
      }

      // Check if status was changed to Done or Cancelled - show review dialog
      const statusChanged = updatePayload.status;
      if (statusChanged === 'Done' || statusChanged === 'Cancelled') {
        // Get session and user data for review
        const sessionId = localStorage.getItem('redBut_table_session') || '';
        const currentUser = requests.find(r => r.id === selectedRequest.id);
        const waiterId = getWaiterIdFromLocalStorage();
        
        setReviewDialog({
          isOpen: true,
          requestId: selectedRequest.id,
          newStatus: statusChanged,
          sessionId,
          userId: currentUser?.userId || userId,
          waiterId: waiterId || ''
        });
      }

      // Refresh requests after successful update
      fetchRequests();
      handleModalClose();
    } catch (err: any) {
      const errorMessage = err.message || 'An unknown error occurred while updating the request.';
      
      // Check if this is a status change race condition error
      if (errorMessage.includes('status may have changed while you were editing') || 
          errorMessage.includes('Refresh for the latest status')) {
        // Close the edit modal and show the status change dialog
        handleModalClose();
        setShowStatusChangeDialog(true);
      } else {
        // Show regular error in the modal
        setError(errorMessage);
        console.error('Failed to update request:', err);
      }
    } finally {
      setUpdatingRequest(false);
    }
  };

  const handleStatusChangeDialogOk = () => {
    setShowStatusChangeDialog(false);
    // Refresh the whole listing page
    fetchRequests();
  };

  // Review dialog functions
  const handleReviewSubmit = async (reviewData: ServiceAnalysisData) => {
    try {
      await serviceAnalysisApi.submitAnalysis({
        sessionId: reviewDialog.sessionId,
        userId: reviewDialog.userId,
        waiterId: reviewDialog.waiterId || undefined,
        serviceType: 'request',
        analysis: reviewData
      });
      
      setReviewDialog({
        isOpen: false,
        requestId: '',
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
      requestId: '',
      newStatus: '',
      sessionId: '',
      userId: '',
      waiterId: ''
    });
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
      case 'InProgress':
        return 'bg-indigo-200 text-indigo-600';
      case 'Completed':
        return 'bg-green-200 text-green-600';
      default:
        return 'bg-gray-200 text-gray-600';
    }
  };

  const isEditable = selectedRequest && ['New', 'OnHold', 'Completed'].includes(selectedRequest.status);

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
            <p className="text-gray-600">Let me find you your requests...</p>
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
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="requestStatus" className="block text-gray-700 text-sm font-bold">
                    Status:
                  </label>
                  {!['Cancelled', 'Done', 'InProgress'].includes(selectedRequest.status) && (
                    <button
                      onClick={refreshStatusOptions}
                      disabled={statusOptionsLoading || updatingRequest}
                      className="text-xs text-primary-600 hover:text-primary-800 disabled:opacity-50 flex items-center"
                      title="Refresh status options"
                    >
                      <RefreshCw className={`w-3 h-3 mr-1 ${statusOptionsLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  )}
                </div>
                {['Cancelled', 'Done', 'InProgress'].includes(selectedRequest.status) ? (
                  <p className={`p-3 rounded-md font-medium ${getStatusClass(selectedRequest.status)}`}>
                    {selectedRequest.status}
                  </p>
                ) : statusOptionsLoading ? (
                  <div className="flex items-center p-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary-500 mr-2" />
                    <span className="text-gray-600">Loading options...</span>
                  </div>
                ) : (
                  <select
                    id="requestStatus"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as Request['status'])}
                    className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    disabled={updatingRequest || statusOptionsLoading}
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

              {isEditable && statusOptions.length > 0 && (
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

      {/* Review Component */}
      <ReviewComponent
        isOpen={reviewDialog.isOpen}
        onClose={closeReviewDialog}
        onSubmit={handleReviewSubmit}
        title={`Your ${reviewDialog.newStatus === 'Done' ? 'completed' : 'cancelled'} request`}
        type="request"
      />
    </div>
  );
};

export default MyRequests;

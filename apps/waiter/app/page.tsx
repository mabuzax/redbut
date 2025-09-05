"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Star, User, Bot, MessageSquare, RefreshCw, X, Plus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import TimeAgo from "react-timeago";
import { waiterApi, WaiterRequest, RequestsSummary, ServiceAnalysisSummary, ServiceAnalysis, AIAnalysisResponse, LoginResponse } from "../lib/api";
import { RequestStatusConfigService } from "../lib/request-status-config";
import { RequestStatus } from "../lib/types";
import OTPLoginForm from "../components/auth/OTPLoginForm";
import ChangePasswordForm from "../components/auth/ChangePasswordForm";
import OrderManagement from "../components/orders/OrderManagement";
import SessionOrders from "../components/orders/SessionOrders";
import SessionRequests from "../components/requests/SessionRequests";
import CreateSessionModal from "../components/session/CreateSessionModal";
import WaiterBurgerMenu from "../components/session/WaiterBurgerMenu";
import CloseSessionModal from "../components/session/CloseSessionModal";
import TableSessionsDisplay from "../components/session/TableSessionsDisplay";
import { clearRedButLocalStorage } from "../lib/redbut-localstorage";

/* -------------------------------------------------------------------------- */
/* Utility helpers                                                            */
/* -------------------------------------------------------------------------- */
function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/* -------------------------------------------------------------------------- */
/* Sessions Summary Card                                                      */
/* -------------------------------------------------------------------------- */
function AllRequestsView({ token }: { token: string }) {
  const [requests, setRequests] = useState<WaiterRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<WaiterRequest | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<WaiterRequest['status']>(RequestStatus.Acknowledged);
  const [statusOptions, setStatusOptions] = useState<{ value: string; label: string }[]>([]);
  const [statusOptionsLoading, setStatusOptionsLoading] = useState(false);
  const [showStatusChangeDialog, setShowStatusChangeDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'createdAt' | 'status'>('createdAt');
  const [searchTerm, setSearchTerm] = useState('');

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

  const fetchAllRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await waiterApi.getAllRequests(token, {
        status: statusFilter === 'all' ? undefined : statusFilter as any,
        sort: sortOrder,
        search: searchTerm,
      });
      
      // Apply custom sorting for waiter priority order
      const sortedRequests = sortRequestsByPriority(res);
      setRequests(sortedRequests);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, sortOrder, searchTerm, sortRequestsByPriority]);

  useEffect(() => {
    fetchAllRequests();
  }, [fetchAllRequests]);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await waiterApi.updateRequestStatus(selected.id, status as any, token);
      
      // Update the local state and apply sorting
      setRequests((prevRequests) => {
        const updatedRequests = prevRequests.map((r) => (r.id === updated.id ? updated : r));
        return sortRequestsByPriority(updatedRequests);
      });
      
      setSelected(null);
    } catch (e: any) {
      const errorMessage = e.message || 'An unknown error occurred while updating the request.';
      
      // Check if this is a status change race condition error
      if (errorMessage.includes('status may have changed while you were editing') || 
          errorMessage.includes('Refresh for the latest status')) {
        // Close the edit modal and show the status change dialog
        setSelected(null);
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
    fetchAllRequests();
  };

  const getStatusClass = (status: WaiterRequest['status']) => {
    switch (status) {
      case 'New':
        return 'bg-blue-200 text-blue-600';
      case 'Acknowledged':
        return 'bg-yellow-200 text-yellow-600';
      case 'InProgress':
        return 'bg-purple-200 text-purple-600';
      case 'Completed':
        return 'bg-green-200 text-green-600';
      case 'OnHold':
        return 'bg-orange-200 text-orange-600';
      case 'Cancelled':
        return 'bg-red-200 text-red-600';
      case 'Done':
        return 'bg-green-200 text-green-600';
      default:
        return 'bg-gray-200 text-gray-600';
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold tracking-tight text-gray-900">All Requests</h2>
        <button
          onClick={fetchAllRequests}
          className="inline-flex items-center justify-center px-4 py-2 font-medium text-gray-900 bg-gray-100 rounded-full hover:bg-gray-200 active:bg-gray-300 transition-all"
          aria-label="Refresh requests"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Search and filter controls */}
      <div className="flex flex-col gap-2 mb-4 md:flex-row md:items-center">
        <input
          type="text"
          placeholder="Search requests..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 rounded-md p-2 flex-1"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-md p-2">
          <option value="all">All Statuses</option>
          <option value="New">New</option>
          <option value="Acknowledged">Acknowledged</option>
          <option value="InProgress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="OnHold">On Hold</option>
          <option value="Cancelled">Cancelled</option>
          <option value="Done">Done</option>
        </select>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as 'createdAt' | 'status')}
          className="border border-gray-300 rounded-md p-2">
          <option value="createdAt">Sort by Time</option>
          <option value="status">Sort by Status</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500 mr-2" />
          <p className="text-gray-500">Loading requests...</p>
        </div>
      ) : error ? (
        <p className="text-red-600 text-center">{error}</p>
      ) : requests.length === 0 ? (
        <p className="text-gray-500 text-center">No requests found 🎉</p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm cursor-pointer"
              onClick={async () => {
                setSelected(r);
                setStatus(r.status as any);
                setStatusOptions([]);
                setStatusOptionsLoading(true);
                const opts = await RequestStatusConfigService.getStatusOptions(
                  r.status as any,
                  'waiter',
                  token
                );
                setStatusOptions(
                  opts.length > 0
                    ? opts
                    : RequestStatusConfigService.getDefaultStatusOptions(r.status as any)
                );
                setStatusOptionsLoading(false);
              }}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">
                  <TimeAgo date={r.createdAt} />
                </span>
                <span className={classNames("px-2 py-1 rounded-full text-xs font-medium", getStatusClass(r.status))}>
                  {r.status}
                </span>
              </div>
              <p className="text-gray-900 line-clamp-2">{r.content.substring(0, 50)}{r.content.length > 50 ? '...' : ''}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* overlay */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white text-gray-900 rounded-lg shadow-xl max-w-md w-full relative p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Request</h3>
                <button
                  onClick={() => setSelected(null)}
                  className="inline-flex items-center justify-center px-4 py-2 font-medium text-gray-900 bg-gray-100 rounded-full hover:bg-gray-200 active:bg-gray-300 transition-all"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                <TimeAgo date={selected.createdAt} />
              </p>
              <p className="mb-4 whitespace-pre-wrap text-gray-900">{selected.content}</p>

              {statusOptionsLoading ? (
                <div className="flex items-center justify-center p-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary-500 mr-2" />
                  <span>Loading options…</span>
                </div>
              ) : (
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as typeof status)
                  }
                  className="w-full border border-gray-200 rounded-md p-2 mb-4 bg-white text-gray-900"
                >
                  {statusOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                className={classNames(
                  "inline-flex items-center justify-center px-4 py-2 font-medium text-white bg-primary-500 rounded-full shadow hover:bg-primary-600 active:bg-primary-700 transition-all w-full",
                  saving
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                )}
              >
                {saving ? "Saving…" : "Submit"}
              </button>
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

/* -------------------------------------------------------------------------- */
/* Requests Summary Card                                                      */
/* -------------------------------------------------------------------------- */
interface RequestsSummaryCardProps {
  token: string;
  onOpen?: () => void;
}

function RequestsSummaryCard({ token, onOpen }: RequestsSummaryCardProps) {
  const [summary, setSummary] = useState<RequestsSummary | null>(null);
  useEffect(() => {
    waiterApi.getRequestsSummary(token).then(setSummary).catch(console.error);
  }, [token]);
  return (
    <div className="bg-white text-gray-900 rounded-lg shadow-md p-6 border border-gray-200 flex flex-col items-center justify-center text-center">
      <MessageSquare className="h-12 w-12 text-primary-500 mb-4" />
      <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-4">Requests</h2>
      {summary ? (
        <p className="text-lg text-gray-900">
          Open {summary.open} | Closed {summary.closed}
        </p>
      ) : (
        <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
      )}
      <button
        onClick={onOpen}
        className="inline-flex items-center justify-center px-4 py-2 font-medium text-gray-900 bg-gray-100 rounded-full hover:bg-gray-200 active:bg-gray-300 transition-all mt-4"
      >
        View Requests
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sessions Summary Card                                                      */
/* -------------------------------------------------------------------------- */
interface SessionsSummaryCardProps {
  token: string;
  onOpen?: () => void;
}

function SessionsSummaryCard({ token, onOpen }: SessionsSummaryCardProps) {
  const [sessionsCount, setSessionsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchSessionsCount = async () => {
      try {
        // Extract waiter ID from token
        const waiterId = extractWaiterIdFromToken(token);
        if (!waiterId) {
          setSessionsCount(0);
          setLoading(false);
          return;
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/waiter/sessions/${waiterId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const sessions = await response.json();
          setSessionsCount(sessions.length);
        } else {
          setSessionsCount(0);
        }
      } catch (error) {
        console.error("Failed to fetch sessions count", error);
        setSessionsCount(0);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSessionsCount();
  }, [token]);

  // Helper function to extract waiter ID from JWT token
  const extractWaiterIdFromToken = (token: string): string | null => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId || null;
    } catch (error) {
      console.error('Error parsing token:', error);
      return null;
    }
  };
  
  return (
    <div className="bg-white text-gray-900 rounded-lg shadow-md p-6 border border-gray-200 flex flex-col items-center justify-center text-center">
      <Users className="h-12 w-12 text-primary-500 mb-4" />
      <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-4">Tables</h2>
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
      ) : (
        <p className="text-sm text-gray-500">
          {sessionsCount} Active Session{sessionsCount !== 1 ? 's' : ''}
        </p>
      )}
      <button
        onClick={onOpen}
        className="inline-flex items-center justify-center px-4 py-2 font-semibold text-red-500 bg-white rounded-full hover:bg-gray-200 active:bg-gray-300 transition-all shadow-lg mt-4 text-sm"
      >
        View Tables
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* AI Analysis Card                                                           */
/* -------------------------------------------------------------------------- */
function AIAnalysisCard({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = async () => {
    setOpen(true);
    if (!analysis) {
      setLoading(true);
      setError(null);
      try {
        const res = await waiterApi.getAIAnalysis(token);
        setAnalysis(res);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const getSentimentColor = (sentiment: string | undefined | null) => {
    if (!sentiment) return 'text-gray-600';
    const lowerSentiment = sentiment.toLowerCase();
    if (lowerSentiment.includes('positive')) return 'text-green-600';
    if (lowerSentiment.includes('mixed')) return 'text-yellow-600';
    if (lowerSentiment.includes('improvement')) return 'text-red-600';
    return 'text-gray-600';
  };

  const getSentimentIcon = (sentiment: string | undefined | null) => {
    if (!sentiment) return '🤖';
    const lowerSentiment = sentiment.toLowerCase();
    if (lowerSentiment.includes('positive')) return '😊';
    if (lowerSentiment.includes('mixed')) return '😐';
    if (lowerSentiment.includes('improvement')) return '😔';
    return '🤖';
  };

  return (
    <>
      <div className="bg-white text-gray-900 rounded-lg shadow-md p-6 border border-gray-200 flex flex-col items-center justify-center text-center">
        <div className="flex items-center mb-4">
          <Bot className="h-12 w-12 text-primary-500 mr-2" />
          <span className="text-xl font-extrabold text-purple-800">AI</span>
        </div>
        <h2 className="text-xl tracking-tight mb-4 text-purple-800 font-bold">Performance Analysis</h2>
        <p className="mb-4 text-gray-500 text-sm">Pull AI analysis of your performance for today.</p>
        <button
          onClick={handleOpen}
          className="inline-flex items-center justify-center px-4 py-2 font-semibold text-red-500 bg-white rounded-full hover:bg-gray-200 active:bg-gray-300 transition-all shadow-lg text-sm"
        >
          View
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white text-gray-900 rounded-lg shadow-xl max-w-2xl w-full relative p-6 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold tracking-tight text-gray-900">AI Performance Analysis</h3>
                <button
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center p-2 font-medium text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 active:bg-gray-300 transition-all"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-500 mr-2" />
                  <p className="text-gray-500">Analyzing your performance...</p>
                </div>
              ) : error ? (
                <div className="text-center p-4">
                  <p className="text-red-600 mb-2">Error loading analysis</p>
                  <p className="text-gray-500 text-sm">{error}</p>
                </div>
              ) : analysis ? (
                <div className="space-y-6">
                  {/* Customer Sentiment */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <span className="text-2xl">{getSentimentIcon(analysis.overall_sentiment)}</span>
                      Customer Sentiment
                    </h4>
                    <p className={classNames("text-lg font-medium", getSentimentColor(analysis.overall_sentiment))}>
                      {analysis.overall_sentiment || 'No sentiment data available'}
                    </p>
                  </div>

                  {/* Happiness Breakdown */}
                  {analysis.happiness_breakdown && Object.keys(analysis.happiness_breakdown).length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Customer Feedback Breakdown</h4>
                      <div className="space-y-3">
                        {Object.entries(analysis.happiness_breakdown).map(([level, summary]) => (
                          <div key={level} className="border rounded-lg p-3 bg-white">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-700">{level}</span>
                            </div>
                            <p className="text-sm text-gray-600">{summary}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Improvement Points */}
                  {analysis.improvement_points && analysis.improvement_points.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Areas for Improvement</h4>
                      <ul className="space-y-2">
                        {analysis.improvement_points.map((point, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-yellow-500 mt-1">•</span>
                            <span className="text-gray-700">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Overall Analysis */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Bot className="h-5 w-5 text-blue-600" />
                      AI Recommendation
                    </h4>
                    <p className="text-gray-700">{analysis.overall_analysis || 'No detailed analysis available'}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-gray-500">No analysis available</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Reviews Summary Card                                                       */
/* -------------------------------------------------------------------------- */
function ReviewsSummaryCard({ token }: { token: string }) {
  const [summary, setSummary] = useState<ServiceAnalysisSummary | null>(null);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [reviews, setReviews] = useState<ServiceAnalysis[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  useEffect(() => {
    waiterApi.getReviewsSummary(token).then(setSummary).catch(console.error);
  }, [token]);

  const fetchReviews = useCallback(async () => {
    setReviewsLoading(true);
    setReviewsError(null);
    try {
      const res = await waiterApi.getPaginatedReviews(token);
      setReviews(res);
    } catch (e: any) {
      setReviewsError(e.message);
    } finally {
      setReviewsLoading(false);
    }
  }, [token]);

  const handleOpenReviews = () => {
    setReviewsOpen(true);
    if (reviews.length === 0) {
      fetchReviews();
    }
  };

  // Helper function to get happiness emoji
  const getHappinessEmoji = (happiness: string) => {
    switch (happiness) {
      case 'Extremely Happy': return '😍';
      case 'Very Happy': return '😊';
      case 'Just Ok': return '😐';
      case 'Unhappy': return '😟';
      case 'Horrible': return '😡';
      default: return '😐';
    }
  };

  // Helper function to get happiness color
  const getHappinessColor = (happiness: string) => {
    switch (happiness) {
      case 'Extremely Happy': return 'text-green-600';
      case 'Very Happy': return 'text-green-500';
      case 'Just Ok': return 'text-yellow-500';
      case 'Unhappy': return 'text-orange-500';
      case 'Horrible': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <>
      <div className="bg-white text-gray-900 rounded-lg shadow-md p-6 border border-gray-200 flex flex-col items-center justify-center text-center">
        <User className="h-12 w-12 text-primary-500 mb-4" />
        <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-4">Your Ratings</h2>
        {summary ? (
          <>
            <div className="flex items-center mb-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={classNames(
                    "h-5 w-5",
                    i < Math.round(summary.averageRating) ? "text-yellow-400" : "text-gray-300"
                  )}
                  fill="currentColor"
                />
              ))}
            </div>
            <p className="text-sm text-gray-600">
              from {summary.totalReviews} review{summary.totalReviews !== 1 ? 's' : ''}
            </p>
          </>
        ) : (
          <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
        )}
        <button 
          onClick={handleOpenReviews}
          className="inline-flex items-center justify-center px-4 py-2 font-semibold text-red-500 bg-white rounded-full hover:bg-gray-200 active:bg-gray-300 transition-all shadow-lg mt-4 text-sm"
        >
          Show Reviews
        </button>
      </div>

      <AnimatePresence>
        {reviewsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setReviewsOpen(false)}
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white text-gray-900 rounded-lg shadow-xl max-w-2xl w-full relative p-6 max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold tracking-tight text-gray-900">Your Customer Reviews</h3>
                <button
                  onClick={() => setReviewsOpen(false)}
                  className="inline-flex items-center justify-center p-2 font-medium text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 active:bg-gray-300 transition-all"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Summary Stats */}
              {summary && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={classNames(
                              "h-5 w-5",
                              i < Math.round(summary.averageRating) ? "text-yellow-400" : "text-gray-300"
                            )}
                            fill="currentColor"
                          />
                        ))}
                      </div>
                      <span className="text-lg font-semibold">{summary.averageRating.toFixed(1)}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {summary.totalReviews} review{summary.totalReviews !== 1 ? 's' : ''}
                    </div>
                  </div>
                  
                  {/* Rating Distribution */}
                  <div className="mt-3 space-y-1">
                    {summary.ratingDistribution.filter(item => item.count > 0).map((item) => (
                      <div key={item.rating} className="flex items-center gap-2 text-xs">
                        <span className="w-8">{item.rating}★</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-yellow-400 h-2 rounded-full" 
                            style={{ width: `${(item.count / summary.totalReviews) * 100}%` }}
                          />
                        </div>
                        <span className="w-8 text-right">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {reviewsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-500 mr-2" />
                  <p className="text-gray-500">Loading reviews...</p>
                </div>
              ) : reviewsError ? (
                <p className="text-red-600 text-center">{reviewsError}</p>
              ) : reviews.length === 0 ? (
                <p className="text-gray-500 text-center">No reviews yet</p>
              ) : (
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                  {reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((review) => (
                    <motion.div
                      key={review.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={classNames(
                                  "h-4 w-4",
                                  i < review.rating ? "text-yellow-400" : "text-gray-300"
                                )}
                                fill="currentColor"
                              />
                            ))}
                          </div>
                          <span className={classNames("text-2xl", getHappinessColor(review.analysis.happiness))}>
                            {getHappinessEmoji(review.analysis.happiness)}
                          </span>
                          <span className={classNames("text-sm font-medium", getHappinessColor(review.analysis.happiness))}>
                            {review.analysis.happiness}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-gray-500">
                            <TimeAgo date={review.createdAt} />
                          </span>
                          {review.user && (
                            <div className="text-xs text-gray-500">
                              Table {review.user.tableNumber}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">What they said:</p>
                          <p className="text-gray-900 text-sm">{review.analysis.reason}</p>
                        </div>
                        
                        {review.analysis.suggested_improvement && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Suggested improvement:</p>
                            <p className="text-gray-700 text-sm italic">{review.analysis.suggested_improvement}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Page root – splash → session → dashboard                                  */
/* -------------------------------------------------------------------------- */

type Stage = "splash" | "dashboard" | "sessions";

export default function WaiterDashboard() {
  /* ───── stage control (splash ➜ dashboard / sessions) ───── */
  const [stage, setStage] = useState<Stage>("splash");
  /* simple router-like view switch (after splash/session) */
  const [view, setView] = useState<Stage>("dashboard");
  /* ───── waiter session state ───── */
  const [bootstrapping, setBootstrapping] = useState(true); // loading token
  const [userData, setUserData] = useState<any>(null);
  /* ───── session orders state ───── */
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | null>(null);
  /* ───── session view state (orders or requests) ───── */
  const [sessionView, setSessionView] = useState<"orders" | "requests">("orders");
  /* ───── create session modal state ───── */
  const [showCreateSession, setShowCreateSession] = useState(false);
  /* ───── close session modal state ───── */
  const [showCloseSession, setShowCloseSession] = useState(false);
  /* ───── session refresh trigger ───── */
  const [sessionRefreshTrigger, setSessionRefreshTrigger] = useState(0);
  const router = useRouter();

  /* ------------------------------------------------------------------ */
  /*  Splash → ensureSession → dashboard                                */
  /* ------------------------------------------------------------------ */

  /* splash vanishes after 3 s                                          */
  useEffect(() => {
    const t = setTimeout(() => setStage("dashboard"), 3000);
    return () => clearTimeout(t);
  }, []);

  /* waiter session boot-strap logic (very similar to client /web)      */
  useEffect(() => {
    const ensureSession = async () => {
      const existing = localStorage.getItem("redBut_waiterSession");
      if (existing) {
        try {
          const data = JSON.parse(existing);
          
          // Validate the token by making a simple API call
          if (data.token) {
            try {
              console.log('Testing stored token...');
              const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/waiter/requests/summary`, {
                headers: {
                  'Authorization': `Bearer ${data.token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (response.ok) {
                console.log('Token is valid, setting user data');
                setUserData(data);
                setBootstrapping(false);
                return;
              } else {
                // Token is invalid, clear session
                console.log('Invalid token detected, clearing session...');
                clearRedButLocalStorage();
                setUserData(null);
              }
            } catch (error) {
              console.log('Token validation failed, clearing session...', error);
              clearRedButLocalStorage();
              setUserData(null);
            }
          } else {
            console.log('No token found in session data');
            clearRedButLocalStorage();
            setUserData(null);
          }
        } catch (error) {
          console.log('Failed to parse session data:', error);
          clearRedButLocalStorage();
          setUserData(null);
        }
      } else {
        console.log('No session found in localStorage');
      }

      // No longer show prompts, the login form will handle authentication
      setBootstrapping(false);
    };
    ensureSession();
  }, []);

  /* ------------------------------------------------------------------ */
  /*  Login form success handler                                        */
  /* ------------------------------------------------------------------ */
  const handleLoginSuccess = (data: any) => {
    // Store session data in localStorage
    localStorage.setItem("redBut_waiterSession", JSON.stringify(data));
    localStorage.setItem("redBut_token", data.token);
    
    // Update state
    setUserData(data);
  };

  const handleViewSessionOrders = (sessionId: string, tableNumber: number) => {
    setSelectedSessionId(sessionId);
    setSelectedTableNumber(tableNumber);
    setSessionView("orders");
    setView("sessions"); // Stay in sessions view but show session orders
  };

  const handleViewSessionRequests = (sessionId: string, tableNumber: number) => {
    setSelectedSessionId(sessionId);
    setSelectedTableNumber(tableNumber);
    setSessionView("requests");
    setView("sessions"); // Stay in sessions view but show session requests
  };

  const handleBackFromSessionOrders = () => {
    setSelectedSessionId(null);
    setSelectedTableNumber(null);
  };

  /* ------------------------------------------------------------------ */
  /*  Rendering                                                         */
  /* ------------------------------------------------------------------ */

  if (stage === "splash") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        <h1 className="text-4xl font-bold text-primary-500 animate-pulse">RedBut</h1>
      </div>
    );
  }

  // Show login form if no session data is available
  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <OTPLoginForm onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // Show loading indicator while bootstrapping
  if (bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-primary-500" />
        <p className="ml-4 text-lg text-gray-500">
          Preparing session…
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <header className="mb-8 flex items-center justify-between relative">
        <WaiterBurgerMenu
          onCreateSession={() => setShowCreateSession(true)}
          onCloseSession={() => setShowCloseSession(true)}
        />
        
        <h1 className="text-2xl font-bold">
          {view === "dashboard" ? "Dashboard" : 
           view === "sessions" ? (selectedSessionId ? 
             (sessionView === "orders" ? "Orders" : "Requests") : "Sessions") : "Dashboard"}
        </h1>
        
        <div className="w-32"></div> {/* Spacer for centering */}
      </header>

      {view === "dashboard" && (
        <div className="grid grid-cols-1 gap-6 max-w-md mx-auto">
          {/* Sessions Summary Card */}
          <SessionsSummaryCard token={userData.token} onOpen={() => setView("sessions")} />
        
          {/* AI Analysis Card */}
          <AIAnalysisCard token={userData.token} />
        
          {/* Reviews Summary Card */}
          <ReviewsSummaryCard token={userData.token} />
        </div>
      )}

      {view === "sessions" && (
        <div>
          {selectedSessionId && selectedTableNumber ? (
            // Show session-specific content (orders or requests)
            sessionView === "orders" ? (
              <SessionOrders
                sessionId={selectedSessionId}
                tableNumber={selectedTableNumber}
                token={userData.token}
                onBack={handleBackFromSessionOrders}
              />
            ) : (
              <SessionRequests
                sessionId={selectedSessionId}
                tableNumber={selectedTableNumber}
                token={userData.token}
                onBack={handleBackFromSessionOrders}
              />
            )
          ) : (
            // Show table sessions list
            <>
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setView("dashboard")}
                  className="inline-flex items-center justify-center px-4 py-2 font-medium text-gray-900 bg-gray-100 rounded-full hover:bg-gray-200 active:bg-gray-300 transition-all"
                >
                  Back to Dashboard
                </button>
              </div>
              <TableSessionsDisplay 
                token={userData.token} 
                refreshTrigger={sessionRefreshTrigger}
                onViewOrders={handleViewSessionOrders}
                onViewRequests={handleViewSessionRequests}
              />
            </>
          )}
        </div>
      )}
      
      {/* Create Session Modal */}
      <CreateSessionModal 
        isOpen={showCreateSession}
        onClose={() => {
          setShowCreateSession(false);
          // Trigger refresh of session display when modal closes
          setSessionRefreshTrigger(prev => prev + 1);
        }}
        token={userData.token}
      />
      
      {/* Close Session Modal */}
      <CloseSessionModal 
        isOpen={showCloseSession}
        onClose={() => {
          setShowCloseSession(false);
          // Trigger refresh of session display when modal closes
          setSessionRefreshTrigger(prev => prev + 1);
        }}
        token={userData.token}
      />
    </div>
  );
}

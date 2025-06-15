"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Star, User, Bot, MessageSquare, RefreshCw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import TimeAgo from "react-timeago";
import { waiterApi, WaiterRequest, RequestsSummary, ReviewsSummary, Review, AIAnalysisResponse, LoginResponse } from "../lib/api";
import LoginForm from "../components/auth/LoginForm";
import ChangePasswordForm from "../components/auth/ChangePasswordForm";

/* -------------------------------------------------------------------------- */
/* Utility helpers                                                            */
/* -------------------------------------------------------------------------- */
function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/* -------------------------------------------------------------------------- */
/* Active Requests Card (now card-focused list)                               */
/* -------------------------------------------------------------------------- */
function MyRequests({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WaiterRequest[]>([]);
  const [selected, setSelected] = useState<WaiterRequest | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"Acknowledged" | "InProgress" | "Completed">(
    "Acknowledged"
  );

  /* fetch */
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await waiterApi.getActiveRequests(token);
      setData(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  /* status change */
  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await waiterApi.updateRequestStatus(selected.id, status, token); // Status is already updated in local state
      setData((d) => d.map((r) => (r.id === updated.id ? updated : r)));
      setSelected(null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
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
      default:
        return 'bg-gray-200 text-gray-600';
    }
  };

  return (
    <div className="bg-white text-gray-900 rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-4">Active Requests</h2>
        <button
          onClick={fetchRequests}
          className="inline-flex items-center justify-center px-4 py-2 font-medium text-gray-900 bg-gray-100 rounded-full hover:bg-gray-200 active:bg-gray-300 transition-all"
          aria-label="Refresh requests"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500 mr-2" />
          <p className="text-gray-500">Loading requests...</p>
        </div>
      ) : error ? (
        <p className="text-red-600 text-center">{error}</p>
      ) : data.length === 0 ? (
        <p className="text-gray-500 text-center">No active requests 🎉</p>
      ) : (
        <div className="space-y-3">
          {data.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm cursor-pointer"
              onClick={() => { setSelected(r); setStatus(r.status as any); }}
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

              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as typeof status)
                }
                className="w-full border border-gray-200 rounded-md p-2 mb-4 bg-white text-gray-900"
              >
                <option value="Acknowledged">Acknowledged</option>
                <option value="InProgress">In&nbsp;Progress</option>
                <option value="Completed">Completed</option>
              </select>

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
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* All Requests View (Full Page)                                              */
/* -------------------------------------------------------------------------- */
function AllRequestsView({ token }: { token: string }) {
  const [requests, setRequests] = useState<WaiterRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<WaiterRequest | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'createdAt' | 'status'>('createdAt');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAllRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await waiterApi.getAllRequests(token, {
        status: statusFilter === 'all' ? undefined : statusFilter as any,
        sort: sortOrder,
        search: searchTerm,
      });
      setRequests(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, sortOrder, searchTerm]);

  useEffect(() => {
    fetchAllRequests();
  }, [fetchAllRequests]);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await waiterApi.updateRequestStatus(selected.id, selected.status as any, token); // Status is already updated in local state
      setRequests((d) => d.map((r) => (r.id === updated.id ? updated : r)));
      setSelected(null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
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

  const getStatusOptions = (currentStatus: WaiterRequest['status']) => {
    // Waiter can only change to Acknowledged, InProgress, Completed
    return [
      { value: 'Acknowledged', label: 'Acknowledged' },
      { value: 'InProgress', label: 'In Progress' },
      { value: 'Completed', label: 'Completed' },
    ];
  };

  const isEditable = selected && !['Completed', 'Cancelled', 'Done'].includes(selected.status);
  const statusOptions = selected ? getStatusOptions(selected.status) : [];

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
              onClick={() => { setSelected(r); }}
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

              <select
                value={selected.status}
                onChange={(e) =>
                  setSelected({...selected, status: e.target.value as any})
                }
                className="w-full border border-gray-200 rounded-md p-2 mb-4 bg-white text-gray-900"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

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
/* AI Analysis Card                                                           */
/* -------------------------------------------------------------------------- */
function AIAnalysisCard({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const handleOpen = async () => {
    setOpen(true);
    if (!analysis) {
      const res = await waiterApi.getAIAnalysis(token);
      setAnalysis(res.analysis);
    }
  };
  return (
    <>
      <div className="bg-white text-gray-900 rounded-lg shadow-md p-6 border border-gray-200 flex flex-col items-center justify-center text-center">
        <Bot className="h-12 w-12 text-primary-500 mb-4" />
        <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-4">AI Analysis</h2>
        <p className="mb-4 text-gray-500">AI analysis of your performance today.</p>
        <button
          onClick={handleOpen}
          className="inline-flex items-center justify-center px-4 py-2 font-medium text-gray-900 bg-gray-100 rounded-full hover:bg-gray-200 active:bg-gray-300 transition-all"
        >
          Show AI Analysis
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
              className="bg-white text-gray-900 rounded-lg shadow-xl max-w-lg w-full relative p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold tracking-tight text-gray-900 mb-4">AI Analysis</h3>
                <button
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center px-4 py-2 font-medium text-gray-900 bg-gray-100 rounded-full hover:bg-gray-200 active:bg-gray-300 transition-all"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {analysis ? (
                <p className="whitespace-pre-wrap text-gray-900">{analysis}</p>
              ) : (
                <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
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
  const [summary, setSummary] = useState<ReviewsSummary | null>(null);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
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

  return (
    <>
      <div className="bg-white text-gray-900 rounded-lg shadow-md p-6 border border-gray-200 flex flex-col items-center justify-center text-center">
        <User className="h-12 w-12 text-primary-500 mb-4" />
        <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-4">Your Reviews</h2>
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
            <p className="text-lg text-gray-900">
              Reviews {summary.totalReviews}
            </p>
          </>
        ) : (
          <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
        )}
        <button 
          onClick={handleOpenReviews}
          className="inline-flex items-center justify-center px-4 py-2 font-medium text-gray-900 bg-gray-100 rounded-full hover:bg-gray-200 active:bg-gray-300 transition-all mt-4"
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
              className="bg-white text-gray-900 rounded-lg shadow-xl max-w-lg w-full relative p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold tracking-tight text-gray-900 mb-4">Your Reviews</h3>
                <button
                  onClick={() => setReviewsOpen(false)}
                  className="inline-flex items-center justify-center px-4 py-2 font-medium text-gray-900 bg-gray-100 rounded-full hover:bg-gray-200 active:bg-gray-300 transition-all"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
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
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  {reviews.map((review) => (
                    <motion.div
                      key={review.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm"
                    >
                      <div className="flex justify-between items-center mb-2">
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
                        <span className="text-xs text-gray-500">
                          <TimeAgo date={review.createdAt} />
                        </span>
                      </div>
                      <p className="text-gray-900">{review.content}</p>
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

type Stage = "splash" | "dashboard" | "requests";

export default function WaiterDashboard() {
  /* ───── stage control (splash ➜ dashboard / requests) ───── */
  const [stage, setStage] = useState<Stage>("splash");
  /* simple router-like view switch (after splash/session) */
  const [view, setView] = useState<Stage>("dashboard");
  /* ───── waiter session state ───── */
  const [bootstrapping, setBootstrapping] = useState(true); // loading token
  const [userData, setUserData] = useState<any>(null);
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
      const existing = localStorage.getItem("redbutWaiterSession");
      if (existing) {
        try {
          const data = JSON.parse(existing);
          setUserData(data);
          setBootstrapping(false);
          return;
        } catch {
          localStorage.removeItem("redbutWaiterSession");
        }
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
    localStorage.setItem("redbutWaiterSession", JSON.stringify(data));
    localStorage.setItem("redbutToken", data.token);
    
    // Update state
    setUserData(data);
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
        <LoginForm onLoginSuccess={handleLoginSuccess} />
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
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-center">{view === "dashboard" ? "Dashboard" : "Requests"}</h1>
      </header>

      {view === "dashboard" && (
        <div className="grid grid-cols-1 gap-6 max-w-md mx-auto">
          {/* Requests Summary Card */}
          <RequestsSummaryCard token={userData.token} onOpen={() => setView("requests")} />
        
          {/* AI Analysis Card */}
          <AIAnalysisCard token={userData.token} />
        
          {/* Reviews Summary Card */}
          <ReviewsSummaryCard token={userData.token} />
        </div>
      )}

      {view === "requests" && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setView("dashboard")}
              className="inline-flex items-center justify-center px-4 py-2 font-medium text-gray-900 bg-gray-100 rounded-full hover:bg-gray-200 active:bg-gray-300 transition-all"
            >
              Back to Dashboard
            </button>
          </div>
          <AllRequestsView token={userData.token} />
        </div>
      )}
    </div>
  );
}

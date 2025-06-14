"use client";

import { useState, useEffect } from "react";
import { Loader2, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { waiterApi, WaiterRequest, RequestsSummary, ReviewsSummary } from "../lib/api";

/* -------------------------------------------------------------------------- */
/* Utility helpers                                                            */
/* -------------------------------------------------------------------------- */
function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/* -------------------------------------------------------------------------- */
/* Active Requests Card                                                       */
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
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await waiterApi.getActiveRequests(token);
        setData(res);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  /* status change */
  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await waiterApi.updateRequestStatus(selected.id, status, token);
      setData((d) => d.map((r) => (r.id === updated.id ? updated : r)));
      setSelected(null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-card">
      <h2 className="text-xl font-bold mb-4">Active Requests</h2>
      {loading ? (
        <div className="flex items-center">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </div>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : data.length === 0 ? (
        <p>No active requests 🎉</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Content</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id} onClick={() => { setSelected(r); setStatus("Acknowledged"); }} className="cursor-pointer">
                  <td>{new Date(r.createdAt).toLocaleTimeString()}</td>
                  <td>{r.content}</td>
                  <td>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* overlay */}
      {selected && (
        <div className="overlay-sheet" onClick={() => setSelected(null)}>
          <div
            className="sheet-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-1">Request</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {Math.floor(
                (Date.now() - new Date(selected.createdAt).getTime()) / 60000
              )}{" "}
              mins ago
            </p>
            <p className="mb-4 whitespace-pre-wrap">{selected.content}</p>

            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as typeof status)
              }
              className="w-full border border-border rounded-md p-2 mb-4"
            >
              <option value="Acknowledged">Acknowledged</option>
              <option value="InProgress">In&nbsp;Progress</option>
              <option value="Completed">Completed</option>
            </select>

            <button
              onClick={handleSave}
              disabled={saving}
              className={classNames(
                "w-full py-2 rounded-md text-white",
                saving
                  ? "bg-muted-foreground cursor-not-allowed"
                  : "bg-primary-500 hover:bg-primary-600"
              )}
            >
              {saving ? "Saving…" : "Submit"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Requests Summary Card                                                      */
/* -------------------------------------------------------------------------- */
function RequestsSummaryCard({ token }: { token: string }) {
  const [summary, setSummary] = useState<RequestsSummary | null>(null);
  useEffect(() => {
    waiterApi.getRequestsSummary(token).then(setSummary).catch(console.error);
  }, [token]);
  return (
    <div className="dashboard-card">
      <h2 className="text-xl font-bold mb-4">Requests</h2>
      {summary ? (
        <p className="text-lg">
          Open {summary.open} | Closed {summary.closed}
        </p>
      ) : (
        <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
      )}
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
      <div className="dashboard-card">
        <h2 className="text-xl font-bold mb-4">AI Analysis</h2>
        <p className="mb-4">AI analysis of your performance today.</p>
        <button
          onClick={handleOpen}
          className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
        >
          Show AI Analysis
        </button>
      </div>
      {open && (
        <div className="overlay-sheet" onClick={() => setOpen(false)}>
          <div
            className="sheet-content max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">AI Analysis</h3>
            {analysis ? (
              <p className="whitespace-pre-wrap">{analysis}</p>
            ) : (
              <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Reviews Summary Card                                                       */
/* -------------------------------------------------------------------------- */
function ReviewsSummaryCard({ token }: { token: string }) {
  const [summary, setSummary] = useState<ReviewsSummary | null>(null);
  useEffect(() => {
    waiterApi.getReviewsSummary(token).then(setSummary).catch(console.error);
  }, [token]);

  const stars = summary ? Math.round(summary.averageRating) : 0;

  return (
    <div className="dashboard-card">
      <h2 className="text-xl font-bold mb-2">Your Reviews</h2>
      <div className="flex items-center mb-3">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={classNames(
              "h-6 w-6",
              i < stars ? "text-yellow-400" : "text-gray-300"
            )}
            fill="currentColor"
          />
        ))}
        {summary && (
          <span className="ml-2 text-lg font-semibold">
            {summary.averageRating.toFixed(1)} Stars
          </span>
        )}
      </div>
      <p>
        Reviews {summary ? summary.totalReviews : <Loader2 className="inline h-4 w-4 animate-spin" />}
      </p>
      <button className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600">
        Show Reviews
      </button>
    </div>
  );
}

export default function WaiterDashboard() {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null); // Placeholder for waiter user data
  const router = useRouter();

  useEffect(() => {
    // Simulate authentication check
    const checkAuth = async () => {
      // In a real app, this would involve checking a JWT token or session
      // For now, we'll mock a successful login
      const mockWaiterUser = {
        id: "waiter-123",
        name: "John Doe",
        role: "waiter",
        token: "mock-waiter-jwt", // A mock token for demonstration
      };
      setUserData(mockWaiterUser);
      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-light">
        <Loader2 className="h-12 w-12 animate-spin text-primary-500" />
        <p className="ml-4 text-lg text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

  if (!userData) {
    // In a real app, redirect to login page
    router.push("/login"); // Assuming a login page exists
    return null;
  }

  return (
    <div className="min-h-screen bg-background-light p-4 md:p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-primary-700">
          Waiter Dashboard
        </h1>
        {/* Placeholder for waiter-specific menu/profile */}
        <div className="text-secondary-700">Welcome, {userData.name}</div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* First Card: Active Requests Table */}
        <div className="md:col-span-2 lg:col-span-2 xl:col-span-2">
          <MyRequests token={userData.token} />
        </div>

        {/* Second Card: Requests Summary */}
        <RequestsSummaryCard token={userData.token} />

        {/* Third Card: AI Analysis */}
        <AIAnalysisCard token={userData.token} />

        {/* Fourth Card: Your Reviews */}
        <ReviewsSummaryCard token={userData.token} />
      </div>
    </div>
  );
}

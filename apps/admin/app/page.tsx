"use client";

import { useState, useEffect, useCallback } from "react";
import {
  User,
  BrainCircuit,
  BarChart2,
  MessageSquare,
  ShoppingCart,
  Star,
  UtensilsCrossed,
  Users,
  CalendarClock,
  Table2,
  Settings,
  ArrowLeft,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Filter,
  Eye,
  RefreshCw,
  X,
  Loader2,
  type LucideIcon
} from "lucide-react";
import LoginForm from "../components/auth/LoginForm";
import TimeAgo from "react-timeago";
import {
  adminApi,
  AdminRequestSummary,
  RequestFilters,
  RequestSummary,
  ResolutionBucket, 
} from "../lib/api";

export default function AdminDashboard() {
  type Stage = "splash" | "login" | "dashboard";
  type Section =
    | "AI Analysis"
    | "Analytics"
    | "Requests"
    | "Orders"
    | "Ratings"
    | "Food Menu"
    | "Staff"
    | "Shifts"
    | "Table Allocations"
    | "Owner Dashboard";

  const [stage, setStage] = useState<Stage>("splash");
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setStage("login");
      setLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const checkSession = () => {
      const existingSession = localStorage.getItem("redbutAdminSession");
      if (existingSession) {
        try {
          const data = JSON.parse(existingSession);
          setUserData(data);
          setStage("dashboard");
        } catch (e) {
          console.error("Failed to parse session data", e);
          localStorage.removeItem("redbutAdminSession");
          setStage("login");
        }
      }
    };
    
    if (stage === "login") {
      checkSession();
    }
  }, [stage]);

  const handleLoginSuccess = (data: any) => {
    localStorage.setItem("redbutAdminSession", JSON.stringify(data));
    localStorage.setItem("redbutToken", data.token);
    setUserData(data);
    setStage("dashboard");
  };

  if (stage === "splash") {
    return (
      <div className="splash-container">
        <div className="splash-text">RedBut Admin</div>
      </div>
    );
  }

  if (stage === "login") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary-600">RedBut Admin</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">{userData?.name || "Admin User"}</span>
            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
              <User className="h-5 w-5" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedSection === null ? (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h2>
            <DashboardGrid onSelect={setSelectedSection} />
          </>
        ) : selectedSection === "Requests" ? (
          <RequestsComponent onBack={() => setSelectedSection(null)} />
        ) : (
          <SectionPlaceholder
            section={selectedSection}
            onBack={() => setSelectedSection(null)}
          />
        )}
      </main>
    </div>
  );
}

interface GridProps {
  onSelect: (s: Section) => void;
}

const DashboardGrid = ({ onSelect }: GridProps) => {
  const items: { key: Section; label: string; icon: LucideIcon }[] = [
    { key: "AI Analysis", label: "AI Analysis", icon: BrainCircuit },
    { key: "Analytics", label: "Analytics", icon: BarChart2 },
    { key: "Requests", label: "Requests", icon: MessageSquare },
    { key: "Orders", label: "Orders", icon: ShoppingCart },
    { key: "Ratings", label: "Ratings", icon: Star },
    { key: "Food Menu", label: "Food Menu", icon: UtensilsCrossed },
    { key: "Staff", label: "Staff", icon: Users },
    { key: "Shifts", label: "Shifts", icon: CalendarClock },
    { key: "Table Allocations", label: "Table Allocations", icon: Table2 },
    { key: "Owner Dashboard", label: "Owner Dashboard", icon: Settings },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
      {items.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          className="bg-white border border-gray-200 rounded-lg py-8 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
        >
          <Icon className="h-8 w-8 text-primary-500 mb-2" />
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </button>
      ))}
    </div>
  );
};

interface SectionProps {
  section: string;
  onBack: () => void;
}

const SectionPlaceholder = ({ section, onBack }: SectionProps) => (
  <div className="bg-white border border-gray-200 rounded-lg p-8">
    <button
      onClick={onBack}
      className="mb-6 inline-flex items-center text-primary-600 hover:underline"
    >
      <ArrowLeft className="h-4 w-4 mr-1" /> Back
    </button>
    <h3 className="text-xl font-semibold text-gray-900">{section}</h3>
    <p className="text-gray-500 mt-2">This section is under construction.</p>
  </div>
);

interface RequestsComponentProps {
  onBack: () => void;
}

const RequestsComponent = ({ onBack }: RequestsComponentProps) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem("redbutToken") || "" : "";
  const todayISO = new Date().toISOString().split("T")[0];

  const [viewMode, setViewMode] = useState<"dashboard" | "wall">("dashboard");

  const [summary, setSummary] = useState<{ open: number; closed: number; avgResolutionTime: number } | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [errorSummary, setErrorSummary] = useState<string | null>(null);

  const [selectedDateLineChart, setSelectedDateLineChart] = useState<string>(todayISO);
  const [hourlyData, setHourlyData] = useState<AdminRequestSummary | null>(null);
  const [loadingHourly, setLoadingHourly] = useState(false);
  const [errorHourly, setErrorHourly] = useState<string | null>(null);

  const [resolutionDateFilter, setResolutionDateFilter] = useState<string>(todayISO);
  const [resolutionData, setResolutionData] = useState<ResolutionBucket[] | null>(null);
  const [loadingResolution, setLoadingResolution] = useState(false);
  const [errorResolution, setErrorResolution] = useState<string | null>(null);
  
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [errorList, setErrorList] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"createdAt" | "status" | "tableNumber">("createdAt");

  const [insightsDateFilter, setInsightsDateFilter] = useState<string>(todayISO);
  const [performanceDateFilter, setPerformanceDateFilter] = useState<string>(todayISO);

  useEffect(() => {
    if (!token) {
      setLoadingSummary(false);
      setErrorSummary("Authentication token not found.");
      return;
    }
    let isMounted = true;
    setLoadingSummary(true);
    setErrorSummary(null);
    adminApi.getRequestsSummary(token)
      .then((data) => { if (isMounted) setSummary(data); })
      .catch((e) => { if (isMounted) setErrorSummary(e.message); console.error("Error fetching summary:", e); })
      .finally(() => { if (isMounted) setLoadingSummary(false); });
    return () => { isMounted = false; };
  }, [token]);

  useEffect(() => {
    if (!token || !selectedDateLineChart) {
      setLoadingHourly(false);
      setErrorHourly(!token ? "Authentication token not found." : "No date selected for hourly chart.");
      return;
    }
    setLoadingHourly(true);
    setErrorHourly(null);
    adminApi
      .getHourlyRequestAnalytics(token, selectedDateLineChart)
      .then((d) => setHourlyData(d))
      .catch((e) => setErrorHourly(e.message))
      .finally(() => setLoadingHourly(false));
  }, [token, selectedDateLineChart]);

  useEffect(() => {
    if (!token || !resolutionDateFilter) {
      setLoadingResolution(false);
      setErrorResolution(!token ? "Authentication token not found." : "No date selected for resolution chart.");
      return;
    }
    setLoadingResolution(true);
    setErrorResolution(null);
    adminApi
      .getRequestsResolutionAnalytics(token, resolutionDateFilter)
      .then((data) => setResolutionData(data))
      .catch((e) => setErrorResolution(e.message))
      .finally(() => setLoadingResolution(false));
  }, [token, resolutionDateFilter]);

  const fetchList = useCallback(async () => {
    if (!token) {
      setLoadingList(false);
      setErrorList("Authentication token not found.");
      return;
    }
    setLoadingList(true);
    setErrorList(null);
    const filters: RequestFilters = {
      status: statusFilter === "all" ? undefined : statusFilter,
      search: searchTerm || undefined,
      sort: sortOrder,
    };
    try {
      const data = await adminApi.getAllRequests(token, filters);
      setRequests(data);
    } catch (e: any) {
      setErrorList(e.message);
    } finally {
      setLoadingList(false);
    }
  }, [token, statusFilter, searchTerm, sortOrder]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'New': return 'bg-blue-200 text-blue-600';
      case 'Acknowledged': return 'bg-yellow-200 text-yellow-600';
      case 'InProgress': return 'bg-purple-200 text-purple-600';
      case 'Completed': return 'bg-green-200 text-green-600';
      case 'Done': return 'bg-green-200 text-green-600';
      case 'Cancelled': return 'bg-red-200 text-red-600';
      case 'OnHold': return 'bg-orange-200 text-orange-600';
      default: return 'bg-gray-200 text-gray-600';
    }
  };

  const dateOptions = Array.from({ length: 31 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const iso = date.toISOString().split("T")[0];
    const label =
      i === 0
        ? "Today"
        : i === 1
        ? "Yesterday"
        : `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    return { value: iso, label: `${label} (${iso.substring(5)})` }; // Shortened ISO for display
  });

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center text-primary-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
      </button>
      
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Requests Management</h2>
      
      {viewMode === "dashboard" ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-gray-900">Requests Summary</h3>
                <Eye className="h-5 w-5 text-primary-500" />
              </div>
              {loadingSummary ? (
                <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : errorSummary ? (
                <p className="text-red-500 text-center">{errorSummary}</p>
              ) : summary ? (
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-500 mr-3"><MessageSquare className="h-5 w-5" /></div>
                    <div><p className="text-sm text-gray-500">Open Requests</p><p className="text-xl font-bold text-gray-900">{summary.open}</p></div>
                  </div>
                  <div className="flex items-center">
                    <div className="p-2 bg-green-50 rounded-lg text-green-500 mr-3"><CheckCircle className="h-5 w-5" /></div>
                    <div><p className="text-sm text-gray-500">Closed Requests</p><p className="text-xl font-bold text-gray-900">{summary.closed}</p></div>
                  </div>
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-50 rounded-lg text-purple-500 mr-3"><Clock className="h-5 w-5" /></div>
                    <div><p className="text-sm text-gray-500">Avg Resolution Time</p><p className="text-xl font-bold text-gray-900">{summary.avgResolutionTime} mins</p></div>
                  </div>
                </div>
              ) : <p className="text-gray-500 text-center">No summary data.</p>}
              <button onClick={() => setViewMode("wall")} className="mt-4 w-full py-2 bg-primary-50 text-primary-600 rounded-md hover:bg-primary-100 transition">
                View All Requests
              </button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 col-span-1 md:col-span-2 lg:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">Open vs Closed Requests (Hourly)</h3>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <select
                    value={selectedDateLineChart}
                    onChange={(e) => setSelectedDateLineChart(e.target.value)}
                    className="border-none text-sm text-gray-500 focus:ring-0 cursor-pointer bg-gray-50 rounded-md px-2 py-1"
                  >
                    {dateOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="h-64 relative flex items-center justify-center">
                {loadingHourly ? (
                  <div className="flex items-center"><Loader2 className="h-5 w-5 animate-spin mr-2" /> <p>Loading chart…</p></div>
                ) : errorHourly ? (
                  <p className="text-red-600">{errorHourly}</p>
                ) : hourlyData && hourlyData.hourly.length > 0 ? (
                  <div className="w-full h-full relative">
                    <svg viewBox="0 0 620 200" className="w-full h-full">
                      <line x1="0" y1="180" x2="620" y2="180" stroke="#e5e7eb" />
                      {Array.from({length: 19}, (_,i) => 7+i).map(hour => {
                        const x = ((hour-7)/18)*600 + 10; // 19 points for 19 hours (7am to 2am)
                        return <text key={hour} x={x} y="195" className="text-xs fill-gray-500 text-center" dominantBaseline="middle" textAnchor="middle">{(hour % 24).toString().padStart(2,'0')}</text>
                      })}
                      {["open", "closed"].map((key) => {
                        const points = hourlyData.hourly
                          .filter(h => (h.hour >= 7 && h.hour <=23) || (h.hour >=0 && h.hour < 2)) // 7 AM to 2 AM next day
                          .sort((a,b) => (a.hour < 7 ? a.hour + 24 : a.hour) - (b.hour < 7 ? b.hour + 24 : b.hour))
                          .map((h) => {
                            const hourAdjusted = h.hour < 7 ? h.hour + 24 : h.hour; // Adjust for 24h cycle starting at 7AM
                            const x = ((hourAdjusted - 7) / 18) * 600 + 10; // 19 hours from 7 AM to 2 AM (18 intervals)
                            const maxVal = Math.max(1, ...hourlyData.hourly.map(d => Math.max(d.open, d.closed)));
                            const y = 180 - ((h[key as "open" | "closed"] || 0) / maxVal) * 150;
                            return `${x},${y}`;
                          })
                          .join(" ");
                        return (
                          <polyline key={key} fill="none" stroke={key === "open" ? "#ef4444" : "#22c55e"} strokeWidth="2" points={points} />
                        );
                      })}
                    </svg>
                    <div className="absolute top-0 right-0 flex items-center space-x-4 bg-white p-1 rounded-md shadow">
                      <div className="flex items-center"><div className="w-3 h-3 bg-red-500 rounded-sm mr-1"></div><span className="text-xs text-gray-500">Open</span></div>
                      <div className="flex items-center"><div className="w-3 h-3 bg-green-500 rounded-sm mr-1"></div><span className="text-xs text-gray-500">Closed</span></div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">No data available for selected date.</p>
                )}
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">Requests Resolution</h3>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <select
                    value={resolutionDateFilter}
                    onChange={(e) => setResolutionDateFilter(e.target.value)}
                    className="border-none text-sm text-gray-500 focus:ring-0 cursor-pointer bg-gray-50 rounded-md px-2 py-1"
                  >
                    {dateOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="h-48 flex items-end justify-around">
                {loadingResolution ? (
                  <div className="flex items-center justify-center w-full h-full"><Loader2 className="h-6 w-6 animate-spin" /> <p className="ml-2">Loading data...</p></div>
                ) : errorResolution ? (
                  <p className="text-red-500 text-center w-full">{errorResolution}</p>
                ) : resolutionData && resolutionData.length > 0 ? (
                  resolutionData.map((item, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="w-16 bg-primary-500 rounded-t-sm" style={{ height: `${Math.max(5, item.count * 8)}px` }} title={`Count: ${item.count}`}></div>
                      <p className="text-xs text-gray-500 mt-2">{item.range}</p>
                      <p className="text-sm font-medium">{item.count}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center w-full">No resolution data for selected date.</p>
                )}
              </div>
              <div className="mt-4 flex items-center justify-center">
                <div className="flex items-center"><div className="w-3 h-3 bg-primary-500 rounded-sm mr-1"></div><span className="text-xs text-gray-500">Number of requests</span></div>
              </div>
              {resolutionData && resolutionData.find(r => r.range === '>15mins' && r.count > 0) && (
                <div className="mt-4 text-center text-sm text-gray-500">
                  <AlertTriangle className="h-4 w-4 inline-block mr-1 text-yellow-500" />
                  <span>{resolutionData.find(r => r.range === '>15mins')?.count} requests resolved in &gt;15 mins</span>
                </div>
              )}
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">Request Insights</h3>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <select
                    value={insightsDateFilter}
                    onChange={(e) => setInsightsDateFilter(e.target.value)}
                    className="border-none text-sm text-gray-500 focus:ring-0 cursor-pointer bg-gray-50 rounded-md px-2 py-1"
                  >
                    {dateOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center"> <TrendingUp className="h-5 w-5 text-green-500 mr-2" /> <span className="text-sm">Completion Rate</span></div>
                  <span className="font-medium">{summary ? Math.round((summary.closed / (summary.open + summary.closed || 1)) * 100) : 0}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center"> <Clock className="h-5 w-5 text-blue-500 mr-2" /> <span className="text-sm">Peak Request Time</span></div>
                  <span className="font-medium">12:00 - 14:00</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center"> <Users className="h-5 w-5 text-purple-500 mr-2" /> <span className="text-sm">Most Active Waiter</span></div>
                  <span className="font-medium">John D. (42)</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center"> <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" /> <span className="text-sm">Overdue Requests</span></div>
                  <span className="font-medium text-yellow-600">5</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
               <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">Waiter Performance</h3>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <select
                    value={performanceDateFilter}
                    onChange={(e) => setPerformanceDateFilter(e.target.value)}
                    className="border-none text-sm text-gray-500 focus:ring-0 cursor-pointer bg-gray-50 rounded-md px-2 py-1"
                  >
                    {dateOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-3">
                {["John D.", "Maria S.", "Lebo N."].map((name, i) => (
                  <div key={i} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 mr-3">
                        {name.split(' ')[0][0]}{name.split(' ')[1][0]}
                      </div>
                      <span>{name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{Math.floor(Math.random() * 5) + 15} reqs</div>
                      <div className="text-xs text-gray-500">~{Math.floor(Math.random() * 5) + 5} mins avg</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-gray-900">All Requests</h3>
            <div className="flex space-x-2">
              <button 
                onClick={() => setViewMode("dashboard")}
                className="inline-flex items-center justify-center px-4 py-2 font-medium text-gray-900 bg-gray-100 rounded-full hover:bg-gray-200 active:bg-gray-300 transition-all"
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard View
              </button>
              <button 
                onClick={fetchList}
                disabled={loadingList}
                className="inline-flex items-center justify-center px-4 py-2 font-medium text-gray-900 bg-gray-100 rounded-full hover:bg-gray-200 active:bg-gray-300 transition-all disabled:opacity-50"
              >
                {loadingList ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />} Refresh
              </button>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 mb-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 pl-8"
              />
              <Filter className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md p-2"
            >
              <option value="all">All Statuses</option>
              <option value="New">New</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="InProgress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Done">Done</option>
              <option value="Cancelled">Cancelled</option>
              <option value="OnHold">On Hold</option>
            </select>
            <select 
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "createdAt" | "status" | "tableNumber")}
              className="border border-gray-300 rounded-md p-2"
            >
              <option value="createdAt">Sort by Time</option>
              <option value="status">Sort by Status</option>
              <option value="tableNumber">Sort by Table</option>
            </select>
          </div>
          
          <div className="space-y-3 mt-4">
            {loadingList ? (
              <div className="flex items-center justify-center h-32"><Loader2 className="h-8 w-8 animate-spin text-primary-500 mr-2" /> <p>Loading requests...</p></div>
            ) : errorList ? (
              <div className="text-center py-8"><p className="text-red-500 mb-2">{errorList}</p><button onClick={fetchList} className="btn-subtle"><RefreshCw className="h-4 w-4 mr-1" /> Try Again</button></div>
            ) : (requests && requests.length > 0) ? (
              requests.map((request) => (
                <div key={request.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition cursor-pointer">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center mb-2">
                        <span className="font-medium mr-2">Table {request.tableNumber}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(request.status)}`}>{request.status}</span>
                      </div>
                      <p className="text-gray-900">{request.content}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-xs text-gray-500"><TimeAgo date={request.createdAt} /></p>
                      {request.waiterName && (<p className="text-xs text-gray-500 mt-1">Assigned to: {request.waiterName}</p>)}
                    </div>
                  </div>
                  {request.responseTime !== undefined && (<div className="mt-2 text-xs text-gray-500">Response time: {request.responseTime} mins</div>)}
                </div>
              ))
            ) : (
              <div className="text-center py-8"><p className="text-gray-500">No requests found matching your filters.</p></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

"use client";

import { useState, useEffect } from "react";
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
  type LucideIcon
} from "lucide-react";
import LoginForm from "../components/auth/LoginForm";
import TimeAgo from "react-timeago";

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
  
  // Hide splash screen after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setStage("login");
      setLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Check for existing session
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

  // Render splash screen
  if (stage === "splash") {
    return (
      <div className="splash-container">
        <div className="splash-text">RedBut Admin</div>
      </div>
    );
  }

  // Render login screen
  if (stage === "login") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // Render dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
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

/* ---------- Helper Components ---------- */

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

/* ---------- Requests Component ---------- */

interface RequestsComponentProps {
  onBack: () => void;
}

const RequestsComponent = ({ onBack }: RequestsComponentProps) => {
  // State for view mode (dashboard or wall view)
  const [viewMode, setViewMode] = useState<"dashboard" | "wall">("dashboard");
  
  // State for date filter
  const [dateFilter, setDateFilter] = useState<number>(7); // Default 7 days
  
  // Placeholder data for requests
  const requestsData = {
    openRequests: 25,
    closedRequests: 102,
    avgResolutionTime: 10, // in minutes
    newRequestsByTime: [
      { range: "<10mins", count: 8 },
      { range: "10-15mins", count: 12 },
      { range: ">15mins", count: 5 }
    ],
    // Daily data for timeline chart
    timelineData: Array.from({ length: 31 }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      openCount: Math.floor(Math.random() * 30) + 5,
      closedCount: Math.floor(Math.random() * 40) + 10
    })).reverse(),
    // Placeholder for requests list
    requestsList: Array.from({ length: 20 }, (_, i) => ({
      id: `req-${i}`,
      tableNumber: Math.floor(Math.random() * 20) + 1,
      content: `Request from table ${Math.floor(Math.random() * 20) + 1}: ${
        ["Need assistance with menu", "Request for bill", "Need extra utensils", "Water refill", "Order inquiry"][Math.floor(Math.random() * 5)]
      }`,
      status: ["New", "Acknowledged", "InProgress", "Completed"][Math.floor(Math.random() * 4)],
      waiterId: `waiter-${Math.floor(Math.random() * 5) + 1}`,
      waiterName: ["John D.", "Maria S.", "Lebo N.", "Sam T.", "Lisa R."][Math.floor(Math.random() * 5)],
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000)).toISOString(),
      updatedAt: new Date(Date.now() - Math.floor(Math.random() * 12 * 60 * 60 * 1000)).toISOString(),
      responseTime: Math.floor(Math.random() * 20) + 1
    }))
  };

  // Filter timeline data based on date filter
  const filteredTimelineData = requestsData.timelineData.slice(0, dateFilter);

  // Function to get status class for coloring
  const getStatusClass = (status: string) => {
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
          {/* Dashboard View with Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Summary Card */}
            <div 
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition"
              onClick={() => setViewMode("wall")}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-gray-900">Requests Summary</h3>
                <Eye className="h-5 w-5 text-primary-500" />
              </div>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-500 mr-3">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Open Requests</p>
                    <p className="text-xl font-bold text-gray-900">{requestsData.openRequests}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="p-2 bg-green-50 rounded-lg text-green-500 mr-3">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Closed Requests</p>
                    <p className="text-xl font-bold text-gray-900">{requestsData.closedRequests}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="p-2 bg-purple-50 rounded-lg text-purple-500 mr-3">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Avg Resolution Time</p>
                    <p className="text-xl font-bold text-gray-900">{requestsData.avgResolutionTime} mins</p>
                  </div>
                </div>
              </div>
              <button className="mt-4 w-full py-2 bg-primary-50 text-primary-600 rounded-md hover:bg-primary-100 transition">
                View All Requests
              </button>
            </div>

            {/* Timeline Chart Card */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 col-span-1 md:col-span-2 lg:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">Open vs Closed Requests</h3>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <select 
                    value={dateFilter}
                    onChange={(e) => setDateFilter(Number(e.target.value))}
                    className="border-none text-sm text-gray-500 focus:ring-0 cursor-pointer"
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={14}>Last 14 days</option>
                    <option value={31}>Last 31 days</option>
                  </select>
                </div>
              </div>
              
              {/* Timeline Chart (Placeholder) */}
              <div className="h-64 relative">
                <div className="absolute inset-0 flex items-end justify-between px-4">
                  {filteredTimelineData.map((day, i) => (
                    <div key={i} className="flex flex-col items-center w-full max-w-[30px]">
                      <div className="w-full flex flex-col items-center">
                        <div 
                          className="w-full bg-blue-400 rounded-t-sm" 
                          style={{ height: `${day.openCount * 2}px` }}
                          title={`Open: ${day.openCount}`}
                        ></div>
                        <div 
                          className="w-full bg-green-400 rounded-t-sm mt-1" 
                          style={{ height: `${day.closedCount * 2}px` }}
                          title={`Closed: ${day.closedCount}`}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-top-left">
                        {new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Legend */}
                <div className="absolute top-0 right-0 flex items-center space-x-4">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-400 rounded-sm mr-1"></div>
                    <span className="text-xs text-gray-500">Open</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-400 rounded-sm mr-1"></div>
                    <span className="text-xs text-gray-500">Closed</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* New Requests by Time Range Bar Chart */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">New Requests by Time</h3>
              
              <div className="h-48 flex items-end justify-around">
                {requestsData.newRequestsByTime.map((item, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div 
                      className="w-16 bg-primary-500 rounded-t-sm" 
                      style={{ height: `${item.count * 8}px` }}
                    ></div>
                    <p className="text-xs text-gray-500 mt-2">{item.range}</p>
                    <p className="text-sm font-medium">{item.count}</p>
                  </div>
                ))}
              </div>
              
              {/* Legend */}
              <div className="mt-4 flex items-center justify-center">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-primary-500 rounded-sm mr-1"></div>
                  <span className="text-xs text-gray-500">Number of requests</span>
                </div>
              </div>
              
              <div className="mt-4 text-center text-sm text-gray-500">
                <AlertTriangle className="h-4 w-4 inline-block mr-1 text-yellow-500" />
                <span>{requestsData.newRequestsByTime[2].count} requests waiting &gt;15 mins</span>
              </div>
            </div>
            
            {/* Additional Insights Card */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Request Insights</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
                    <span className="text-sm">Completion Rate</span>
                  </div>
                  <span className="font-medium">
                    {Math.round((requestsData.closedRequests / (requestsData.openRequests + requestsData.closedRequests)) * 100)}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-blue-500 mr-2" />
                    <span className="text-sm">Peak Request Time</span>
                  </div>
                  <span className="font-medium">12:00 - 14:00</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-purple-500 mr-2" />
                    <span className="text-sm">Most Active Waiter</span>
                  </div>
                  <span className="font-medium">John D. (42)</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                    <span className="text-sm">Overdue Requests</span>
                  </div>
                  <span className="font-medium text-yellow-600">5</span>
                </div>
              </div>
            </div>
            
            {/* Staff Performance Card */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Waiter Performance</h3>
              
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
                      <div className="text-sm font-medium">
                        {Math.floor(Math.random() * 5) + 15} reqs
                      </div>
                      <div className="text-xs text-gray-500">
                        ~{Math.floor(Math.random() * 5) + 5} mins avg
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Wall View (Request List) */
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
                className="inline-flex items-center justify-center px-4 py-2 font-medium text-gray-900 bg-gray-100 rounded-full hover:bg-gray-200 active:bg-gray-300 transition-all"
              >
                <RefreshCw className="h-4 w-4 mr-1" /> Refresh
              </button>
            </div>
          </div>
          
          {/* Search and filter controls */}
          <div className="flex flex-col gap-2 mb-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search requests..."
                className="w-full border border-gray-300 rounded-md p-2 pl-8"
              />
              <Filter className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            <select className="border border-gray-300 rounded-md p-2">
              <option value="all">All Statuses</option>
              <option value="New">New</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="InProgress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
            <select className="border border-gray-300 rounded-md p-2">
              <option value="createdAt">Sort by Time</option>
              <option value="status">Sort by Status</option>
              <option value="table">Sort by Table</option>
            </select>
          </div>
          
          {/* Requests list */}
          <div className="space-y-3 mt-4">
            {requestsData.requestsList.map((request) => (
              <div
                key={request.id}
                className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center mb-2">
                      <span className="font-medium mr-2">Table {request.tableNumber}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(request.status)}`}>
                        {request.status}
                      </span>
                    </div>
                    <p className="text-gray-900">{request.content}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      <TimeAgo date={request.createdAt} />
                    </p>
                    {request.waiterName && (
                      <p className="text-xs text-gray-500 mt-1">
                        Assigned to: {request.waiterName}
                      </p>
                    )}
                  </div>
                </div>
                {request.responseTime && (
                  <div className="mt-2 text-xs text-gray-500">
                    Response time: {request.responseTime} mins
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  CalendarDays,
  DollarSign,
  Users,
  ShoppingCart,
  Star,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  PieChart,
  ListChecks,
  Clock,
  Coffee,
  UserCheck,
  MessageCircle,
  Smile,
  Eye,
  Brain,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  BarChart,
  PieChart as RePieChart, // Renamed to avoid conflict
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  Bar,
  Area,
  Pie,
  Cell,
} from "recharts";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { adminApi, DateRange } from "../../lib/api"; 
import AiAnalyticsChatWindow from "./AiAnalyticsChatWindow"; // Placeholder for now

// Chart colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

// Import specific data types from adminApi (assuming they are defined in ../../lib/api)
import {
  StaffAnalyticsData,
  StaffPerformanceDetail,
  ServiceAnalysisData,
  RequestsAnalyticsData,
  CustomerRatingsAnalyticsData,
  MetricCardValue,
  NameValuePair,
  RecentComment,
} from "../../lib/api";


type AnalyticsTab = 
  | "Executive Summary"
  | "Staff" 
  | "Service Analysis" 
  | "Requests" 
  | "Overall Sentiments";

const tabs: AnalyticsTab[] = [
  "Executive Summary",
  "Staff", 
  "Service Analysis", 
  "Requests", 
  "Overall Sentiments"
];

const initialDateRange = {
  startDate: format(subDays(new Date(), 6), 'yyyy-MM-dd'), // Last 7 days
  endDate: format(new Date(), 'yyyy-MM-dd'),
};

const AnalyticsComponent = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem("redBut_token") || "" : "";
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("Executive Summary");
  const [dateRange, setDateRange] = useState<DateRange>(initialDateRange);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [staffDetailModal, setStaffDetailModal] = useState<{
    isOpen: boolean;
    staffMember: StaffPerformanceDetail | null;
  }>({
    isOpen: false,
    staffMember: null,
  });
  
  // Data states for each tab
  const [executiveSummaryData, setExecutiveSummaryData] = useState<any | null>(null);
  const [staffData, setStaffData] = useState<StaffAnalyticsData | null>(null);
  const [serviceAnalysisData, setServiceAnalysisData] = useState<ServiceAnalysisData | null>(null);
  const [requestsData, setRequestsData] = useState<RequestsAnalyticsData | null>(null);
  const [customerRatingsData, setCustomerRatingsData] = useState<CustomerRatingsAnalyticsData | null>(null);

  // Loading and error states
  const [loading, setLoading] = useState<Record<AnalyticsTab, boolean>>({} as any);
  const [error, setError] = useState<Record<AnalyticsTab, string | null>>({} as any);

  const fetchDataForTab = useCallback(async (tab: AnalyticsTab, currentRange: DateRange) => {
    if (!token) {
      setError(prev => ({ ...prev, [tab]: "Authentication token not found." }));
      return;
    }
    setLoading(prev => ({ ...prev, [tab]: true }));
    setError(prev => ({ ...prev, [tab]: null }));

    try {
      switch (tab) {
        case "Executive Summary":
          setExecutiveSummaryData(await adminApi.getExecutiveSummaryAnalytics(token, currentRange));
          break;
        case "Staff":
          setStaffData(await adminApi.getStaffAnalytics(token, currentRange));
          break;
        case "Service Analysis":
          setServiceAnalysisData(await adminApi.getServiceAnalytics(token, currentRange));
          break;
        case "Requests":
          setRequestsData(await adminApi.getRequestsAnalytics(token, currentRange));
          break;
        case "Overall Sentiments":
          console.log(`[Frontend] Fetching Overall Sentiments data for range: ${JSON.stringify(currentRange)}`);
          const startTime = Date.now();
          setCustomerRatingsData(await adminApi.getCustomerRatingsAnalytics(token, currentRange));
          const endTime = Date.now();
          console.log(`[Frontend] Overall Sentiments data fetched in ${endTime - startTime}ms`);
          break;
        default:
          console.warn("Unknown tab:", tab);
      }
    } catch (e: any) {
      setError(prev => ({ ...prev, [tab]: e.message || `Failed to fetch data for ${tab}.` }));
    } finally {
      setLoading(prev => ({ ...prev, [tab]: false }));
    }
  }, [token]);

  useEffect(() => {
    fetchDataForTab(activeTab, dateRange);
  }, [activeTab, dateRange, fetchDataForTab]);

  const handleDateRangeChange = (newDateRange: DateRange) => {
    setDateRange(newDateRange);
  };

  const handleOpenStaffDetail = (staffMember: StaffPerformanceDetail) => {
    setStaffDetailModal({
      isOpen: true,
      staffMember,
    });
  };

  const handleCloseStaffDetail = () => {
    setStaffDetailModal({
      isOpen: false,
      staffMember: null,
    });
  };
  
  const renderTabContent = () => {
    if (loading[activeTab]) {
      return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /> <span className="ml-2">AI analysis in progress...</span></div>;
    }
    if (error[activeTab]) {
      return <div className="text-red-500 text-center p-4">{error[activeTab]}</div>;
    }

    switch (activeTab) {
      case "Executive Summary": return <ExecutiveSummaryTabContent data={executiveSummaryData} />;
      case "Staff": return <StaffTabContent data={staffData} onViewStaff={handleOpenStaffDetail} />;
      case "Service Analysis": return <ServiceAnalysisTabContent data={serviceAnalysisData} />;
      case "Requests": return <RequestsTabContent data={requestsData} />;
      case "Overall Sentiments": return <CustomerRatingsTabContent data={customerRatingsData} />;
      default: return <div>Select a tab</div>;
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Analytics Dashboard</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <CalendarDays className="h-5 w-5 text-gray-500" />
            <input 
              type="date" 
              value={dateRange.startDate} 
              onChange={(e) => handleDateRangeChange({...dateRange, startDate: e.target.value})}
              className="border border-gray-300 rounded-md p-1.5 text-sm focus:ring-primary-500 focus:border-primary-500"
            />
            <span className="text-gray-500">-</span>
            <input 
              type="date" 
              value={dateRange.endDate} 
              onChange={(e) => handleDateRangeChange({...dateRange, endDate: e.target.value})}
              className="border border-gray-300 rounded-md p-1.5 text-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <button
            onClick={() => setIsAiChatOpen(true)}
            className="btn-primary flex items-center"
            style={{backgroundColor: '#8B5CF6', borderColor: '#8B5CF6'}} 
          >
            <MessageSquare className="h-4 w-4 mr-2" /> Talk to Your Data
          </button>
        </div>
      </div>

      <div className="mb-6 overflow-x-auto">
        <div className="flex border-b border-gray-200 space-x-1">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors duration-150
                ${activeTab === tab 
                  ? 'border-b-2 border-primary-600 text-primary-600' 
                  : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
                }
              `}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-lg min-h-[60vh]">
        {renderTabContent()}
      </div>
      
      {isAiChatOpen && (
        <AiAnalyticsChatWindow 
          onClose={() => setIsAiChatOpen(false)} 
          initialDateRange={dateRange}
        />
      )}

      {/* Staff Detail Modal */}
      {staffDetailModal.isOpen && staffDetailModal.staffMember && (
        <StaffDetailModal
          staffMember={staffDetailModal.staffMember}
          onClose={handleCloseStaffDetail}
          token={token}
        />
      )}
    </div>
  );
};

// Placeholder Tab Content Components (to be fleshed out later)
const ExecutiveSummaryTabContent: React.FC<{
  data: any | null;
}> = ({ data }) => {
  if (!data) return <div className="text-center p-10 text-gray-500">No executive summary data available for the selected period.</div>;

  const { overview, trends, alerts, serviceQuality, insights } = data;

  // Helper function to render trend indicators
  const renderTrend = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingUp className="h-4 w-4 text-red-500 transform rotate-180" />;
      case 'stable':
        return <div className="h-4 w-4 text-yellow-500 flex items-center justify-center">→</div>;
      default:
        return null;
    }
  };

  // Helper function to render alert status
  const renderAlert = (isAlert: boolean) => {
    return isAlert ? (
      <AlertTriangle className="h-4 w-4 text-red-500" />
    ) : (
      <CheckCircle className="h-4 w-4 text-green-500" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Request Metrics */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">{overview.totalRequests}</p>
              <p className="text-xs text-gray-500">
                Completed: {overview.completedRequests} | Open: {overview.openRequests}
              </p>
            </div>
            <MessageSquare className="h-8 w-8 text-blue-500" />
          </div>
          <div className="mt-2 flex items-center space-x-2">
            {renderTrend(trends.requestCompletionRate)}
            <span className="text-sm text-gray-600">
              {overview.requestCompletionRate}% completion rate
            </span>
          </div>
        </div>

        {/* Order Metrics */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{overview.totalOrders}</p>
              <p className="text-xs text-gray-500">
                Completed: {overview.completedOrders}
              </p>
            </div>
            <ShoppingCart className="h-8 w-8 text-green-500" />
          </div>
          <div className="mt-2 flex items-center space-x-2">
            {renderTrend(trends.orderCompletionRate)}
            <span className="text-sm text-gray-600">
              {overview.orderCompletionRate}% completion rate
            </span>
          </div>
        </div>

        {/* Response Time */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-bold text-gray-900">{overview.avgRequestResponseTime}m</p>
              <p className="text-xs text-gray-500">
                Order processing: {overview.avgOrderProcessingTime}m
              </p>
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
          <div className="mt-2 flex items-center space-x-2">
            {renderTrend(trends.responseTime)}
            <span className="text-sm text-gray-600">Performance</span>
          </div>
        </div>

        {/* Service Rating */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Service Rating</p>
              <p className="text-2xl font-bold text-gray-900">{overview.avgServiceRating}/5</p>
              <p className="text-xs text-gray-500">
                {serviceQuality.totalAnalyses} analyses
              </p>
            </div>
            <Star className="h-8 w-8 text-yellow-500" />
          </div>
          <div className="mt-2 flex items-center space-x-2">
            {renderTrend(trends.serviceRating)}
            <span className="text-sm text-gray-600">Customer satisfaction</span>
          </div>
        </div>
      </div>

      {/* Performance Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Cancellation Rates */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Cancellation Rates</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Requests</span>
              <span className="text-sm font-medium">{overview.requestCancelledRate}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Orders</span>
              <span className="text-sm font-medium">{overview.orderCancelledRate}%</span>
            </div>
          </div>
        </div>

        {/* Order Performance */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Order Performance</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Rejection Rate</span>
              <span className="text-sm font-medium">{overview.averageRejectionRate}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Delivery Rate</span>
              <span className="text-sm font-medium">{overview.averageDeliveryRate}%</span>
            </div>
          </div>
        </div>

        {/* Service Quality Distribution */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Service Quality</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Excellent (4-5★)</span>
              <span className="text-sm font-medium">{serviceQuality.ratingDistribution.excellent}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Good (3★)</span>
              <span className="text-sm font-medium">{serviceQuality.ratingDistribution.good}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Poor (1-2★)</span>
              <span className="text-sm font-medium">{serviceQuality.ratingDistribution.poor}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
          System Alerts
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2">
            {renderAlert(alerts.openRequests)}
            <span className="text-sm text-gray-600">Open Requests</span>
          </div>
          <div className="flex items-center space-x-2">
            {renderAlert(alerts.highCancelledRate)}
            <span className="text-sm text-gray-600">High Cancellation Rate</span>
          </div>
          <div className="flex items-center space-x-2">
            {renderAlert(alerts.slowResponseTime)}
            <span className="text-sm text-gray-600">Slow Response Time</span>
          </div>
          <div className="flex items-center space-x-2">
            {renderAlert(alerts.lowServiceRating)}
            <span className="text-sm text-gray-600">Low Service Rating</span>
          </div>
          <div className="flex items-center space-x-2">
            {renderAlert(alerts.highRejectionRate)}
            <span className="text-sm text-gray-600">High Rejection Rate</span>
          </div>
          <div className="flex items-center space-x-2">
            {renderAlert(alerts.lowDeliveryRate)}
            <span className="text-sm text-gray-600">Low Delivery Rate</span>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      {insights && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Brain className="h-5 w-5 text-purple-500 mr-2" />
            AI Insights
          </h3>
          
          {/* Executive Summary */}
          {insights.summary && (
            <div className="mb-4">
              <h4 className="text-md font-medium text-gray-800 mb-2">Executive Summary</h4>
              <p className="text-sm text-gray-600">{insights.summary}</p>
            </div>
          )}
          
          {/* Key Findings */}
          {insights.keyFindings && insights.keyFindings.length > 0 && (
            <div className="mb-4">
              <h4 className="text-md font-medium text-gray-800 mb-2">Key Findings</h4>
              <ul className="list-disc list-inside space-y-1">
                {insights.keyFindings.map((finding: string, index: number) => (
                  <li key={index} className="text-sm text-gray-600">{finding}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Recommendations */}
          {insights.recommendations && insights.recommendations.length > 0 && (
            <div className="mb-4">
              <h4 className="text-md font-medium text-gray-800 mb-2">Recommendations</h4>
              <ul className="list-disc list-inside space-y-1">
                {insights.recommendations.map((recommendation: string, index: number) => (
                  <li key={index} className="text-sm text-gray-600">{recommendation}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Critical Alerts */}
          {insights.alerts && insights.alerts.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-gray-800 mb-2">Critical Alerts</h4>
              <ul className="list-disc list-inside space-y-1">
                {insights.alerts.map((alert: string, index: number) => (
                  <li key={index} className="text-sm text-red-600 font-medium">{alert}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const StaffTabContent: React.FC<{
  data: StaffAnalyticsData | null; 
  onViewStaff: (staffMember: StaffPerformanceDetail) => void;
}> = ({data, onViewStaff}) => {
  if (!data) return <div className="text-center p-10 text-gray-500">No staff data available for the selected period.</div>;
  
  const renderStars = (rating: number | undefined) => {
    if (!rating) return <span className="text-gray-400 text-sm">No rating</span>;
    
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />);
    }
    
    if (hasHalfStar) {
      stars.push(<Star key="half" className="h-4 w-4 fill-yellow-400/50 text-yellow-400" />);
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />);
    }
    
    return (
      <div className="flex items-center space-x-1">
        {stars}
        <span className="ml-2 text-sm text-gray-600">({rating.toFixed(1)})</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.performanceDetails.map((staff) => (
          <div 
            key={staff.staffId} 
            className="bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg transition-shadow duration-200"
          >
            <div className="flex items-start space-x-4">
              {/* Photo on left */}
              <div className="flex-shrink-0">
                <div className="w-16 h-20 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                  {/* Placeholder for staff photo - could be replaced with actual photo URL */}
                  <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                    <Users className="h-8 w-8 text-gray-500" />
                  </div>
                </div>
              </div>
              
              {/* Name, Surname and details on right */}
              <div className="flex-1 min-w-0">
                <div className="space-y-2">
                  {/* Name and Surname */}
                  <h3 className="text-base font-semibold text-gray-900 truncate">
                    {staff.staffName}
                  </h3>
                  
                  {/* Position */}
                  <p className="text-sm text-gray-600 capitalize">
                    {staff.position}
                  </p>
                  
                  {/* Rating */}
                  <div className="flex items-center">
                    {renderStars(staff.averageRating)}
                  </div>
                  
                  {/* Additional stats */}
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Requests: {staff.requestsHandled || 0}</div>
                    <div>Orders: {staff.ordersHandled || 0}</div>
                  </div>
                </div>
                
                {/* View button - bottom right */}
                <div className="flex justify-end mt-3">
                  <button 
                    onClick={() => onViewStaff(staff)}
                    className="flex items-center space-x-1 text-red-600 hover:text-red-700 transition-colors shadow-lg rounded-md px-2 py-1 hover:bg-red-50"
                  >
                    <Eye className="h-4 w-4" />
                    <span className="text-sm font-medium">View</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {data.performanceDetails.length === 0 && (
        <div className="text-center p-10 text-gray-500">
          <Users className="mx-auto h-12 w-12 text-gray-400 mb-2" />
          <p>No staff performance data available for the selected period.</p>
        </div>
      )}
    </div>
  );
};

const ServiceAnalysisTabContent: React.FC<{data: ServiceAnalysisData | null}> = ({data}) => {
  if (!data) return <div className="text-center p-10 text-gray-500">No service analysis data available.</div>;
  return (
    <div className="space-y-6">
      <ChartContainer title="Average Ratings Per Waiter">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.averageRatingsPerWaiter}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 5]}/>
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#82ca9d" name="Avg Rating" />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
       <ChartContainer title="Recent Comments">
         {data.recentComments.length > 0 ? (
            <div className="space-y-3 max-h-60 overflow-y-auto">
                {data.recentComments.map(c => (
                    <div key={c.commentId} className="p-3 border rounded-lg bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-900">{c.waiterName}</span>
                            {c.overallSentiment && (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    c.overallSentiment.toLowerCase() === 'positive' ? 'bg-green-100 text-green-800' :
                                    c.overallSentiment.toLowerCase() === 'negative' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                    {c.overallSentiment}
                                </span>
                            )}
                        </div>
                        <p className="text-gray-700 text-sm mb-2">{c.commentText}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{c.rating}★ • {format(new Date(c.commentDate), 'MMM dd, yyyy')}</span>
                            {c.isServiceAnalysis && c.serviceType && (
                                <span className={`px-2 py-1 rounded capitalize ${
                                    c.serviceType.toLowerCase() === 'order' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                    {c.serviceType}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
         ) : <p>No recent comments.</p>}
       </ChartContainer>
    </div>
  );
};
const RequestsTabContent: React.FC<{data: RequestsAnalyticsData | null}> = ({data}) => {
  if (!data) {
    return (
      <div className="text-center p-10 text-gray-500">
        <ListChecks className="mx-auto h-12 w-12 text-gray-400 mb-2" />
        Loading requests analytics...
      </div>
    );
  }

  const { summaryMetrics, statusDistribution, requestsOverTime, waiterResponseTimes, waiterRequestPerformance } = data;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Total Requests" 
          value={summaryMetrics.totalRequests.toString()} 
          icon={<ListChecks className="h-6 w-6" />}
          description="All requests in date range"
        />
        <MetricCard 
          title="Currently Open" 
          value={summaryMetrics.openRequests.toString()} 
          icon={<Eye className="h-6 w-6" />}
          description="Not yet marked as Done"
        />
        <MetricCard 
          title="Avg. Response Time" 
          value={`${summaryMetrics.averageResponseTimeMinutes} mins`} 
          icon={<CheckCircle className="h-6 w-6" />}
          description="New to Done completion time"
        />
        <MetricCard 
          title="Completed Requests" 
          value={summaryMetrics.completedRequests.toString()} 
          icon={<CheckCircle className="h-6 w-6" />}
          description="Requests marked as Done"
        />
      </div>

      {/* Rate Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard 
          title="Completion Rate" 
          value={`${summaryMetrics.completionRatePercentage}%`} 
          icon={<CheckCircle className="h-6 w-6" />}
          description="Done vs Total"
          valueColor="text-green-600"
        />
        <MetricCard 
          title="Cancellation Rate" 
          value={`${summaryMetrics.cancelledRatePercentage}%`} 
          icon={<AlertCircle className="h-6 w-6" />}
          description={`${summaryMetrics.cancelledRequests} cancelled requests`}
          valueColor="text-red-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <ChartContainer title="Request Status Distribution">
          <ResponsiveContainer width="100%" height={300}>
            <RePieChart>
              <Pie
                data={statusDistribution}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({name, value}) => `${name}: ${value}`}
              >
                {statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </RePieChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Requests Over Time */}
        <ChartContainer title="Requests Over Time">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={requestsOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="newRequests" stroke="#8884d8" name="New Requests" />
              <Line type="monotone" dataKey="resolvedRequests" stroke="#82ca9d" name="Resolved Requests" />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Waiter Performance Tables */}
      {waiterResponseTimes.length > 0 && (
        <ChartContainer title="Waiter Response Times">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Waiter
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Response Time (mins)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {waiterResponseTimes.map((waiter, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {waiter.waiterName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {waiter.averageResponseTime.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartContainer>
      )}

      {/* Detailed Performance Table */}
      {waiterRequestPerformance.length > 0 && (
        <ChartContainer title="Waiter Request Handling Performance">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Waiter
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Requests
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completion Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Response Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {waiterRequestPerformance.map((waiter, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {waiter.staffName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {waiter.totalRequests}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {waiter.completedRequests}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        waiter.completionRate! >= 80 ? 'bg-green-100 text-green-800' :
                        waiter.completionRate! >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {waiter.completionRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {waiter.averageResponseTime?.toFixed(1)} mins
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartContainer>
      )}
    </div>
  );
};
const CustomerRatingsTabContent: React.FC<{data: CustomerRatingsAnalyticsData | null}> = ({data}) => {
  if (!data) {
    return (
      <div className="text-center p-10 text-gray-500">
        <Smile className="mx-auto h-12 w-12 text-gray-400 mb-2" />
        Loading overall sentiments analytics...
      </div>
    );
  }

  const { sentimentAnalysis, satisfactionTrend, topFeedbackThemes, rawDataSummary } = data;

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-100';
      case 'negative': return 'text-red-600 bg-red-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <CheckCircle className="h-5 w-5" />;
      case 'negative': return <AlertCircle className="h-5 w-5" />;
      default: return <Eye className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Overall Sentiments Analysis</h2>
            <p className="text-gray-600 mt-1">AI-powered insights from request handling and service feedback</p>
          </div>
          <div className="flex items-center space-x-2">
            <Brain className="h-8 w-8 text-indigo-600" />
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${getSentimentColor(sentimentAnalysis.overallSentiment)}`}>
              {sentimentAnalysis.overallSentiment.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Data Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard 
          title="Request Logs Analyzed" 
          value={rawDataSummary.totalRequestLogs.toString()} 
          icon={<ListChecks className="h-6 w-6" />}
          description="Total request handling events"
        />
        <MetricCard 
          title="Service Feedback Items" 
          value={rawDataSummary.totalServiceAnalysis.toString()} 
          icon={<MessageSquare className="h-6 w-6" />}
          description="AI-analyzed service interactions"
        />
        <MetricCard 
          title="Sentiment Score" 
          value={`${(sentimentAnalysis.sentimentScore * 100).toFixed(0)}%`} 
          icon={getSentimentIcon(sentimentAnalysis.overallSentiment)}
          description="Overall satisfaction indicator"
          valueColor={sentimentAnalysis.sentimentScore > 0.3 ? 'text-green-600' : 
                     sentimentAnalysis.sentimentScore < -0.3 ? 'text-red-600' : 'text-yellow-600'}
        />
      </div>

      {/* Key Insights Section */}
      <ChartContainer title="🎯 Key Insights">
        <div className="space-y-3">
          {sentimentAnalysis.keyInsights.map((insight, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
              <div className="p-1 bg-blue-100 rounded-full mt-0.5">
                <CheckCircle className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-gray-700 text-sm">{insight}</p>
            </div>
          ))}
        </div>
      </ChartContainer>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Satisfaction Trend */}
        <ChartContainer title="Satisfaction Trend Over Time">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={satisfactionTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[1, 5]} />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="satisfactionScore" 
                stroke="#3B82F6" 
                strokeWidth={3}
                name="Satisfaction Score" 
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Common Themes */}
        <ChartContainer title="Common Feedback Themes">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sentimentAnalysis.commonThemes}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Waiter Performance Insights */}
      {sentimentAnalysis.waiterPerformanceInsights.length > 0 && (
        <ChartContainer title="👥 Waiter Performance Insights">
          <div className="space-y-4">
            {sentimentAnalysis.waiterPerformanceInsights.map((waiter, index) => (
              <div key={index} className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-800">{waiter.waiterName}</h4>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    waiter.sentimentTrend === 'improving' ? 'bg-green-100 text-green-800' :
                    waiter.sentimentTrend === 'declining' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {waiter.sentimentTrend.toUpperCase()}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-medium text-green-700 mb-2">✅ Key Strengths</h5>
                    <ul className="space-y-1">
                      {waiter.keyStrengths.map((strength, idx) => (
                        <li key={idx} className="text-xs text-gray-600 flex items-start">
                          <span className="text-green-500 mr-2">•</span>
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-medium text-red-700 mb-2">🎯 Areas for Improvement</h5>
                    <ul className="space-y-1">
                      {waiter.areasForImprovement.map((area, idx) => (
                        <li key={idx} className="text-xs text-gray-600 flex items-start">
                          <span className="text-red-500 mr-2">•</span>
                          {area}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartContainer>
      )}

      {/* Business Value Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Areas */}
        <ChartContainer title="⚠️ Risk Areas">
          <div className="space-y-3">
            {sentimentAnalysis.businessValue.riskAreas.map((risk, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-red-700 text-sm">{risk}</p>
              </div>
            ))}
          </div>
        </ChartContainer>

        {/* Opportunities */}
        <ChartContainer title="🚀 Opportunities">
          <div className="space-y-3">
            {sentimentAnalysis.businessValue.opportunities.map((opportunity, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-green-700 text-sm">{opportunity}</p>
              </div>
            ))}
          </div>
        </ChartContainer>

        {/* Priority Actions */}
        <ChartContainer title="📋 Priority Actions">
          <div className="space-y-3">
            {sentimentAnalysis.businessValue.priorityActions.map((action, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-0.5 flex-shrink-0">
                  {index + 1}
                </div>
                <p className="text-blue-700 text-sm">{action}</p>
              </div>
            ))}
          </div>
        </ChartContainer>
      </div>

      {/* Footer Summary */}
      <div className="bg-gray-50 border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Analysis Period: {rawDataSummary.dateRange}</p>
            <p className="text-xs text-gray-500 mt-1">
              This analysis is based on {rawDataSummary.totalRequestLogs} request handling events and {rawDataSummary.totalServiceAnalysis} service feedback items.
            </p>
          </div>
          <div className="text-right">
            
            <div className="flex items-center justify-end mt-1">
              <Brain className="h-4 w-4 text-indigo-500 mr-1" />
              <span className="text-xs text-indigo-600">Powered by RedBut AI Analytics</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper components
const MetricCard: React.FC<{
  icon: React.ReactNode, 
  title?: string,
  label?: string, 
  value: string,
  description?: string,
  valueColor?: string
}> = ({icon, title, label, value, description, valueColor = "text-gray-800"}) => (
  <div className="bg-gray-50 p-4 rounded-lg shadow border">
    <div className="flex items-center space-x-3 mb-1">
      <div className="p-2 bg-primary-100 text-primary-600 rounded-full">{icon}</div>
      <h4 className="text-sm font-medium text-gray-600">{title || label}</h4>
    </div>
    <p className={`text-2xl font-bold ml-12 ${valueColor}`}>{value}</p>
    {description && (
      <p className="text-xs text-gray-500 ml-12 mt-1">{description}</p>
    )}
  </div>
);

const ChartContainer: React.FC<{title: string, children: React.ReactNode}> = ({title, children}) => (
  <div className="bg-gray-50 p-4 rounded-lg shadow border">
    <h4 className="text-md font-semibold text-gray-700 mb-3">{title}</h4>
    {children}
  </div>
);

// Staff Detail Modal Component
const StaffDetailModal: React.FC<{
  staffMember: StaffPerformanceDetail;
  onClose: () => void;
  token: string;
}> = ({ staffMember, onClose, token }) => {
  const [staffDetailData, setStaffDetailData] = useState<any>(null);
  const [aiReview, setAiReview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch detailed staff data including waiter info and analytics
    const fetchStaffDetails = async () => {
      try {
        setLoading(true);
        const detailedData = await adminApi.getStaffDetailedAnalytics(staffMember.staffId, token);
        setStaffDetailData(detailedData);
      } catch (err) {
        setError('Failed to load staff details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    // Fetch AI performance review
    const fetchAIReview = async () => {
      try {
        setAiLoading(true);
        const aiData = await adminApi.getStaffAIReview(staffMember.staffId, token);
        setAiReview(aiData);
      } catch (err) {
        console.error('Failed to fetch AI review:', err);
      } finally {
        setAiLoading(false);
      }
    };

    fetchStaffDetails();
    fetchAIReview();
  }, [staffMember, token]);

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-2 text-sm text-gray-600">({rating.toFixed(1)})</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-red-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Staff Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Profile Section */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Profile</h3>
          <div className="flex items-start space-x-4 bg-gray-50 p-4 rounded-lg">
            {/* Profile Image */}
            <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
              {staffDetailData?.profile?.profileImage ? (
                <img 
                  src={staffDetailData.profile.profileImage} 
                  alt={`${staffDetailData.profile.name} ${staffDetailData.profile.surname}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Users className="h-10 w-10 text-gray-400" />
              )}
            </div>
            
            {/* Profile Info */}
            <div className="flex-1">
              <h4 className="text-xl font-bold text-gray-800">
                {staffDetailData?.profile ? 
                  `${staffDetailData.profile.name} ${staffDetailData.profile.surname}` :
                  staffMember.staffName
                }
              </h4>
              <p className="text-gray-600 capitalize">
                {staffDetailData?.profile?.tag ? `@${staffDetailData.profile.tag}` : ''}
              </p>
              <p className="text-gray-600 capitalize">{staffMember.position}</p>
              <div className="mt-2">
                {renderStars(staffMember.averageRating || 0)}
              </div>
              
              {/* Profile details */}
              <div className="mt-4 text-sm text-gray-600">
                <p><strong>Email:</strong> {staffDetailData?.profile?.email || 'Not available'}</p>
                <p><strong>Phone:</strong> {staffDetailData?.profile?.phone || 'Not available'}</p>
                <p><strong>Address:</strong> {staffDetailData?.profile?.address || 'Not available'}</p>
                <p><strong>Joined:</strong> {staffDetailData?.profile?.joined ? 
                  new Date(staffDetailData.profile.joined).toLocaleDateString() : 'Not available'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Requests Performance */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 text-blue-800">Requests Performance</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Requests:</span>
                <span className="font-semibold">
                  {staffDetailData?.requestsPerformance?.totalRequests || staffMember.requestsHandled || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg. Resolve Time:</span>
                <span className="font-semibold">
                  {staffDetailData?.requestsPerformance?.avgResolveTimeMinutes ? 
                    `${staffDetailData.requestsPerformance.avgResolveTimeMinutes} min` : 
                    'Not available'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg. Rating:</span>
                <span className="font-semibold">
                  {staffDetailData?.requestsPerformance?.avgRating ? 
                    `${staffDetailData.requestsPerformance.avgRating}` : 
                    'Not available'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Highest Rating:</span>
                <span className="font-semibold">
                  {staffDetailData?.requestsPerformance?.highestRating ? 
                    `${staffDetailData.requestsPerformance.highestRating}` : 
                    'Not available'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Lowest Rating:</span>
                <span className="font-semibold">
                  {staffDetailData?.requestsPerformance?.lowestRating ? 
                    `${staffDetailData.requestsPerformance.lowestRating}` : 
                    'Not available'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Orders Performance */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 text-green-800">Orders Performance</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Orders:</span>
                <span className="font-semibold">
                  {staffDetailData?.ordersPerformance?.totalOrders || staffMember.ordersHandled || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg. Rating:</span>
                <span className="font-semibold">
                  {staffDetailData?.ordersPerformance?.avgRating ? 
                    `${staffDetailData.ordersPerformance.avgRating}` : 
                    'Not available'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Highest Rating:</span>
                <span className="font-semibold">
                  {staffDetailData?.ordersPerformance?.highestRating ? 
                    `${staffDetailData.ordersPerformance.highestRating}` : 
                    'Not available'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Lowest Rating:</span>
                <span className="font-semibold">
                  {staffDetailData?.ordersPerformance?.lowestRating ? 
                    `${staffDetailData.ordersPerformance.lowestRating}` : 
                    'Not available'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Performance Review */}
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-6 h-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-purple-800">Performance Review [AI]</h3>
          </div>
          
          {aiLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
            </div>
          ) : aiReview ? (
            <div className="space-y-4">
              {/* Overall Assessment */}
              <div className="bg-white p-4 rounded-lg border border-purple-200">
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Overall Sentiment</span>
                    <p className="text-lg font-semibold text-purple-700">{aiReview.overall_sentiment}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Feedback Count</span>
                    <p className="text-lg font-semibold text-purple-700">{aiReview.totalFeedback}</p>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Analysis Summary</span>
                  <p className="text-gray-700 mt-1">{aiReview.overall_analysis}</p>
                </div>
              </div>

              {/* Happiness Breakdown */}
              {aiReview.happiness_breakdown && Object.keys(aiReview.happiness_breakdown).length > 0 && (
                <div className="bg-white p-4 rounded-lg border border-purple-200">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Customer Happiness Breakdown</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(aiReview.happiness_breakdown).map(([level, count]) => (
                      <div key={level} className="bg-gray-50 p-3 rounded-lg text-center">
                        <div className="text-lg font-semibold text-gray-900">{count as number}</div>
                        <div className="text-sm text-gray-600 capitalize">{level}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Strengths and Improvements in two columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Strengths */}
                {aiReview.strengths && aiReview.strengths.length > 0 && (
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <h4 className="text-md font-medium text-green-800 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Key Strengths
                    </h4>
                    <div className="space-y-2">
                      {aiReview.strengths.map((strength: string, index: number) => (
                        <div key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{strength}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Improvement Points */}
                {aiReview.improvement_points && aiReview.improvement_points.length > 0 && (
                  <div className="bg-white p-4 rounded-lg border border-amber-200">
                    <h4 className="text-md font-medium text-amber-800 mb-3 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Areas for Improvement
                    </h4>
                    <div className="space-y-2">
                      {aiReview.improvement_points.map((point: string, index: number) => (
                        <div key={index} className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Manager Recommendation */}
              {aiReview.recommendation && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="text-md font-medium text-blue-800 mb-2">Manager Recommendation</h4>
                  <p className="text-gray-700">{aiReview.recommendation}</p>
                </div>
              )}

              {/* Metadata */}
              <div className="text-xs text-gray-500 pt-2 border-t">
                Analysis Period: {aiReview.dateRange} | Last Updated: {new Date(aiReview.lastUpdated).toLocaleString()}
                {aiReview.error && (
                  <span className="text-amber-600 ml-4">⚠ {aiReview.error}</span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Brain className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <h4 className="text-md font-medium text-gray-700 mb-2">No AI Review Available</h4>
              <p className="text-sm text-gray-500">
                No customer feedback available for AI analysis in the selected period.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


export default AnalyticsComponent;

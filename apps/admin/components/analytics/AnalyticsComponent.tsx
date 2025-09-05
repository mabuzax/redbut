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
  Table,
  UserCheck,
  MessageCircle,
  Smile,
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

// Import specific data types from adminApi (assuming they are defined in ../../lib/api)
import {
  SalesAnalyticsData,
  PopularItemsAnalyticsData,
  ShiftsAnalyticsData,
  HourlySalesAnalyticsData,
  StaffAnalyticsData,
  TablesAnalyticsData,
  WaiterRatingsAnalyticsData,
  RequestsAnalyticsData,
  CustomerRatingsAnalyticsData,
  MetricCardValue,
  NameValuePair,
  SalesTrendDataPoint,
  PopularItem,
  RecentComment,
} from "../../lib/api";


type AnalyticsTab = 
  | "Sales" 
  | "Popular Items" 
  | "Shifts" 
  | "Hourly Sales" 
  | "Staff" 
  | "Tables" 
  | "Waiter Ratings" 
  | "Requests" 
  | "Customer Ratings";

const tabs: AnalyticsTab[] = [
  "Sales", 
  "Popular Items", 
  "Shifts", 
  "Hourly Sales", 
  "Staff", 
  "Tables", 
  "Waiter Ratings", 
  "Requests", 
  "Customer Ratings"
];

const initialDateRange = {
  startDate: format(subDays(new Date(), 6), 'yyyy-MM-dd'), // Last 7 days
  endDate: format(new Date(), 'yyyy-MM-dd'),
};

const AnalyticsComponent = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem("redBut_token") || "" : "";
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("Sales");
  const [dateRange, setDateRange] = useState<DateRange>(initialDateRange);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  
  // Data states for each tab
  const [salesData, setSalesData] = useState<SalesAnalyticsData | null>(null);
  const [popularItemsData, setPopularItemsData] = useState<PopularItemsAnalyticsData | null>(null);
  const [shiftsData, setShiftsData] = useState<ShiftsAnalyticsData | null>(null);
  const [hourlySalesData, setHourlySalesData] = useState<HourlySalesAnalyticsData | null>(null);
  const [staffData, setStaffData] = useState<StaffAnalyticsData | null>(null);
  const [tablesData, setTablesData] = useState<TablesAnalyticsData | null>(null);
  const [waiterRatingsData, setWaiterRatingsData] = useState<WaiterRatingsAnalyticsData | null>(null);
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
        case "Sales":
          setSalesData(await adminApi.getSalesAnalytics(token, currentRange));
          break;
        case "Popular Items":
          setPopularItemsData(await adminApi.getPopularItemsAnalytics(token, currentRange));
          break;
        case "Shifts":
          setShiftsData(await adminApi.getShiftsAnalytics(token, currentRange));
          break;
        case "Hourly Sales":
          setHourlySalesData(await adminApi.getHourlySalesAnalytics(token, currentRange));
          break;
        case "Staff":
          setStaffData(await adminApi.getStaffAnalytics(token, currentRange));
          break;
        case "Tables":
          setTablesData(await adminApi.getTablesAnalytics(token, currentRange));
          break;
        case "Waiter Ratings":
          setWaiterRatingsData(await adminApi.getWaiterRatingsAnalytics(token, currentRange));
          break;
        case "Requests":
          setRequestsData(await adminApi.getRequestsAnalytics(token, currentRange));
          break;
        case "Customer Ratings":
          setCustomerRatingsData(await adminApi.getCustomerRatingsAnalytics(token, currentRange));
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
  
  const renderTabContent = () => {
    if (loading[activeTab]) {
      return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /> <span className="ml-2">Loading data...</span></div>;
    }
    if (error[activeTab]) {
      return <div className="text-red-500 text-center p-4">{error[activeTab]}</div>;
    }

    switch (activeTab) {
      case "Sales": return <SalesTabContent data={salesData} />;
      case "Popular Items": return <PopularItemsTabContent data={popularItemsData} />;
      case "Shifts": return <ShiftsTabContent data={shiftsData} />;
      case "Hourly Sales": return <HourlySalesTabContent data={hourlySalesData} />;
      case "Staff": return <StaffTabContent data={staffData} />;
      case "Tables": return <TablesTabContent data={tablesData} />;
      case "Waiter Ratings": return <WaiterRatingsTabContent data={waiterRatingsData} />;
      case "Requests": return <RequestsTabContent data={requestsData} />;
      case "Customer Ratings": return <CustomerRatingsTabContent data={customerRatingsData} />;
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
    </div>
  );
};

// Placeholder Tab Content Components (to be fleshed out later)
const SalesTabContent: React.FC<{data: SalesAnalyticsData | null}> = ({data}) => {
  if (!data) return <div className="text-center p-10 text-gray-500">No sales data available for the selected period.</div>;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard icon={<DollarSign />} label="Total Sales" value={`$${data.summary.totalSales.toFixed(2)}`} />
        <MetricCard icon={<ShoppingCart />} label="Total Orders" value={data.summary.totalOrders.toString()} />
        <MetricCard icon={<DollarSign />} label="Avg. Order Value" value={`$${data.summary.averageOrderValue.toFixed(2)}`} />
      </div>
      <ChartContainer title="Sales Trend">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.salesTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={(tick) => format(new Date(tick), 'MMM dd')} />
            <YAxis yAxisId="left" orientation="left" stroke="#8884d8" label={{ value: 'Sales ($)', angle: -90, position: 'insideLeft' }}/>
            <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" label={{ value: 'Orders', angle: -90, position: 'insideRight' }}/>
            <Tooltip labelFormatter={(label) => format(new Date(label), 'MMM dd, yyyy')} formatter={(value, name) => [name === 'sales' ? `$${Number(value).toFixed(2)}` : value, name === 'sales' ? 'Sales' : 'Orders']}/>
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="sales" stroke="#8884d8" activeDot={{ r: 8 }} />
            <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#82ca9d" />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
};

const PopularItemsTabContent: React.FC<{data: PopularItemsAnalyticsData | null}> = ({data}) => {
  if (!data) return <div className="text-center p-10 text-gray-500">No popular items data available.</div>;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartContainer title="Top Selling Items (by Quantity)">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.topSellingItems.slice(0,5)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="itemName" type="category" width={120} />
            <Tooltip formatter={(value) => [value, "Quantity Sold"]}/>
            <Legend />
            <Bar dataKey="quantitySold" fill="#8884d8" name="Quantity Sold" />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
      <ChartContainer title="Revenue by Item (Top 5)">
         <ResponsiveContainer width="100%" height={300}>
          <RePieChart>
            <Pie data={data.revenueByItem.slice(0,5)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
              {data.revenueByItem.slice(0,5).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`}/>
            <Legend />
          </RePieChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
};

const ShiftsTabContent: React.FC<{data: ShiftsAnalyticsData | null}> = ({data}) => (
  <div className="text-center p-10 text-gray-500">
    <Clock className="mx-auto h-12 w-12 text-gray-400 mb-2" />
    Shifts analytics coming soon.
    {data && <pre className="text-xs text-left">{JSON.stringify(data.shiftPerformanceDetails, null, 2)}</pre>}
  </div>
);
const HourlySalesTabContent: React.FC<{data: HourlySalesAnalyticsData | null}> = ({data}) => (
  <div className="text-center p-10 text-gray-500">
    <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-2" />
    Hourly sales analytics coming soon.
    {data && <pre className="text-xs text-left">{JSON.stringify(data.salesTodayByHour, null, 2)}</pre>}
  </div>
);
const StaffTabContent: React.FC<{data: StaffAnalyticsData | null}> = ({data}) => (
  <div className="text-center p-10 text-gray-500">
    <Users className="mx-auto h-12 w-12 text-gray-400 mb-2" />
    Staff performance analytics coming soon.
    {data && <pre className="text-xs text-left">{JSON.stringify(data.salesPerformance, null, 2)}</pre>}
  </div>
);
const TablesTabContent: React.FC<{data: TablesAnalyticsData | null}> = ({data}) => (
  <div className="text-center p-10 text-gray-500">
    <Table className="mx-auto h-12 w-12 text-gray-400 mb-2" />
    Table utilization analytics coming soon.
    {data && <pre className="text-xs text-left">{JSON.stringify(data.utilization, null, 2)}</pre>}
  </div>
);
const WaiterRatingsTabContent: React.FC<{data: WaiterRatingsAnalyticsData | null}> = ({data}) => {
  if (!data) return <div className="text-center p-10 text-gray-500">No waiter ratings data available.</div>;
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
            <ul className="space-y-2 max-h-60 overflow-y-auto">
                {data.recentComments.map(c => (
                    <li key={c.commentId} className="p-2 border rounded text-sm">
                        <strong>{c.waiterName} ({c.rating}★):</strong> {c.commentText} 
                        <em className="text-xs block text-gray-500">{format(new Date(c.commentDate), 'MMM dd, yyyy')}</em>
                    </li>
                ))}
            </ul>
         ) : <p>No recent comments.</p>}
       </ChartContainer>
    </div>
  );
};
const RequestsTabContent: React.FC<{data: RequestsAnalyticsData | null}> = ({data}) => (
  <div className="text-center p-10 text-gray-500">
    <ListChecks className="mx-auto h-12 w-12 text-gray-400 mb-2" />
    Requests analytics coming soon.
    {data && <pre className="text-xs text-left">{JSON.stringify(data.summaryMetrics, null, 2)}</pre>}
  </div>
);
const CustomerRatingsTabContent: React.FC<{data: CustomerRatingsAnalyticsData | null}> = ({data}) => (
  <div className="text-center p-10 text-gray-500">
    <Smile className="mx-auto h-12 w-12 text-gray-400 mb-2" />
    Customer ratings analytics coming soon.
    {data && <pre className="text-xs text-left">{JSON.stringify(data.overallRestaurantRating, null, 2)}</pre>}
  </div>
);

// Helper components
const MetricCard: React.FC<{icon: React.ReactNode, label: string, value: string}> = ({icon, label, value}) => (
  <div className="bg-gray-50 p-4 rounded-lg shadow border">
    <div className="flex items-center space-x-3 mb-1">
      <div className="p-2 bg-primary-100 text-primary-600 rounded-full">{icon}</div>
      <h4 className="text-sm font-medium text-gray-600">{label}</h4>
    </div>
    <p className="text-2xl font-bold text-gray-800 ml-12">{value}</p>
  </div>
);

const ChartContainer: React.FC<{title: string, children: React.ReactNode}> = ({title, children}) => (
  <div className="bg-gray-50 p-4 rounded-lg shadow border">
    <h4 className="text-md font-semibold text-gray-700 mb-3">{title}</h4>
    {children}
  </div>
);

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];


export default AnalyticsComponent;

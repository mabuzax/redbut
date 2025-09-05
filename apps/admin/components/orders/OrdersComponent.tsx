/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Loader2,
  LineChart,
  BarChart2,
  DollarSign,
  ShoppingCart,
  Clock,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart as ReLineChart,
  BarChart as ReBarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  Bar,
} from "recharts";
import {
  adminApi,
  CurrentShiftOrdersDataPoint,
  DailyOrdersDataPoint,
  OrderInsightsData,
  TopSellingItem,
} from "../../lib/api";

export interface OrdersComponentProps {
  onBack: () => void;
}

const OrdersComponent = ({ onBack }: OrdersComponentProps) => {
  const [filters, setFilters] = useState({
    status: 'all'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10
  });
  const token = typeof window !== 'undefined' ? localStorage.getItem("redBut_token") || "" : "";

  const [currentShiftOrders, setCurrentShiftOrders] = useState<CurrentShiftOrdersDataPoint[]>([]);
  const [dailyOrders, setDailyOrders] = useState<DailyOrdersDataPoint[]>([]);
  const [orderInsights, setOrderInsights] = useState<OrderInsightsData | null>(null);

  const [loadingShiftOrders, setLoadingShiftOrders] = useState(true);
  const [loadingDailyOrders, setLoadingDailyOrders] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(true);

  const [errorShiftOrders, setErrorShiftOrders] = useState<string | null>(null);
  const [errorDailyOrders, setErrorDailyOrders] = useState<string | null>(null);
  const [errorInsights, setErrorInsights] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) {
      setErrorShiftOrders("Authentication token not found.");
      setErrorDailyOrders("Authentication token not found.");
      setErrorInsights("Authentication token not found.");
      setLoadingShiftOrders(false);
      setLoadingDailyOrders(false);
      setLoadingInsights(false);
      return;
    }

    // Fetch current shift orders
    setLoadingShiftOrders(true);
    setErrorShiftOrders(null);
    try {
      const data = await adminApi.getCurrentShiftOrdersByStatus(token);
      setCurrentShiftOrders(data);
    } catch (e: any) {
      setErrorShiftOrders(e.message || "Failed to fetch current shift orders.");
    } finally {
      setLoadingShiftOrders(false);
    }

    // Fetch daily orders for the month
    setLoadingDailyOrders(true);
    setErrorDailyOrders(null);
    try {
      const data = await adminApi.getOrdersPerDayThisMonth(token);
      setDailyOrders(data);
    } catch (e: any) {
      setErrorDailyOrders(e.message || "Failed to fetch daily orders.");
    } finally {
      setLoadingDailyOrders(false);
    }

    // Fetch order insights
    setLoadingInsights(true);
    setErrorInsights(null);
    try {
      const data = await adminApi.getOrderInsights(token);
      setOrderInsights(data);
    } catch (e: any) {
      setErrorInsights(e.message || "Failed to fetch order insights.");
    } finally {
      setLoadingInsights(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderLoading = () => (
    <div className="flex items-center justify-center h-full py-10">
      <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      <p className="ml-2 text-gray-500">Loading data...</p>
    </div>
  );

  const renderError = (message: string) => (
    <div className="flex flex-col items-center justify-center h-full py-10 text-red-500">
      <AlertTriangle className="h-8 w-8 mb-2" />
      <p>{message}</p>
    </div>
  );

  return (
    <div>
      <button onClick={onBack} className="mb-6 inline-flex items-center text-primary-600 hover:underline">
        <ArrowLeft className="mr-3 text-red-800 hover:text-red-900 transition-colors" strokeWidth={4} /> Dashboard
      </button>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Orders Analytics</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Current Shift Orders Chart */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Current Shift Orders by Status</h3>
          {loadingShiftOrders ? renderLoading() : errorShiftOrders ? renderError(errorShiftOrders) : 
            currentShiftOrders.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ReLineChart data={currentShiftOrders}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="timeLabel" stroke="#4b5563" />
                <YAxis stroke="#4b5563" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '0.5rem', borderColor: '#cbd5e0' }}
                  itemStyle={{ color: '#1f2937' }}
                  labelStyle={{ color: '#111827', fontWeight: 'bold' }}
                />
                <Legend />
                <Line type="monotone" dataKey="newOrders" name="New" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="inProgressOrders" name="In Progress" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="completedOrders" name="Completed" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </ReLineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-10">No order data available for the current shift.</p>
          )}
        </div>

        {/* Daily Orders This Month Chart */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Total Orders Per Day (This Month)</h3>
          {loadingDailyOrders ? renderLoading() : errorDailyOrders ? renderError(errorDailyOrders) : 
            dailyOrders.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ReLineChart data={dailyOrders}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#4b5563"
                  tickFormatter={(tick) => new Date(tick).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#4b5563" />
                <Tooltip
                  labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '0.5rem', borderColor: '#cbd5e0' }}
                  itemStyle={{ color: '#1f2937' }}
                  labelStyle={{ color: '#111827', fontWeight: 'bold' }}
                />
                <Legend />
                <Line type="monotone" dataKey="totalOrders" name="Total Orders" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </ReLineChart>
            </ResponsiveContainer>
          ) : (
             <p className="text-gray-500 text-center py-10">No daily order data available for this month yet.</p>
          )}
        </div>
      </div>

      {/* Order Insights Cards */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Today's Order Insights</h3>
        {loadingInsights ? renderLoading() : errorInsights ? renderError(errorInsights) : orderInsights ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <InsightCard
              title="Total Revenue Today"
              value={`$${orderInsights.totalRevenueToday.toFixed(2)}`}
              icon={<DollarSign className="h-7 w-7 text-green-500" />}
            />
            <InsightCard
              title="Average Order Value"
              value={`$${orderInsights.averageOrderValue.toFixed(2)}`}
              icon={<ShoppingCart className="h-7 w-7 text-blue-500" />}
            />
            <InsightCard
              title="Peak Order Hour"
              value={orderInsights.peakOrderHour}
              icon={<Clock className="h-7 w-7 text-purple-500" />}
            />
            <div className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center mb-3">
                <div className="p-2 bg-yellow-100 rounded-full mr-3">
                  <TrendingUp className="h-7 w-7 text-yellow-500" />
                </div>
                <h4 className="text-md font-semibold text-gray-700">Top Selling Items</h4>
              </div>
              {orderInsights.topSellingItems.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {orderInsights.topSellingItems.map((item, index) => (
                    <li key={index} className="flex justify-between text-gray-600">
                      <span>{item.item}</span>
                      <span className="font-medium text-gray-800">{item.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No sales data for top items yet today.</p>
              )}
            </div>
          </div>
        ) : (
           <p className="text-gray-500 text-center py-10">No order insights available for today.</p>
        )}
      </div>
    </div>
  );
};

interface InsightCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
}

const InsightCard: React.FC<InsightCardProps> = ({ title, value, icon }) => (
  <div className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200">
    <div className="flex items-center mb-2">
      <div className="p-2 bg-primary-100 rounded-full mr-3">
        {React.cloneElement(icon as React.ReactElement, { className: "h-7 w-7 text-primary-600"})}
      </div>
      <h4 className="text-md font-semibold text-gray-700">{title}</h4>
    </div>
    <p className="text-3xl font-bold text-gray-900 ml-12">{value}</p>
  </div>
);

export default OrdersComponent;

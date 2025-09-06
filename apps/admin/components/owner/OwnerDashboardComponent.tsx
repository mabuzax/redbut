"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Users,
  Brain,
  ArrowLeft,
  Calendar,
  Loader2,
} from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { adminApi, DateRange } from "../../lib/api";

// Import tab components (we'll create these)
import ExecutiveSummaryTab from "./ExecutiveSummaryTab";
import StaffPerformanceTab from "./StaffPerformanceTab";
import AiInsightsTab from "./AiInsightsTab";

type OwnerTab = 
  | "Executive Summary"
  | "Staff Performance Summary"
  | "AI-Driven Insights";

interface OwnerDashboardProps {
  onBack?: () => void;
}

const OwnerDashboardComponent: React.FC<OwnerDashboardProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<OwnerTab>("Executive Summary");
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states for different analytics
  const [executiveData, setExecutiveData] = useState<any>(null);
  const [staffData, setStaffData] = useState<any>(null);
  const [insightsData, setInsightsData] = useState<any>(null);

  const tabs: { key: OwnerTab; label: string; icon: React.ReactNode }[] = [
    { 
      key: "Executive Summary", 
      label: "Executive Summary", 
      icon: <TrendingUp className="h-5 w-5" /> 
    },
    { 
      key: "Staff Performance Summary", 
      label: "Staff Performance", 
      icon: <Users className="h-5 w-5" /> 
    },
    { 
      key: "AI-Driven Insights", 
      label: "AI Insights", 
      icon: <Brain className="h-5 w-5" /> 
    },
  ];

  // Date range presets
  const datePresets = [
    { label: "Last 7 Days", value: "7d" },
    { label: "Last 30 Days", value: "30d" },
    { label: "This Week", value: "week" },
    { label: "This Month", value: "month" },
  ];

  const handleDatePreset = (preset: string) => {
    let start: Date, end: Date;
    const now = new Date();

    switch (preset) {
      case "7d":
        start = subDays(now, 7);
        end = now;
        break;
      case "30d":
        start = subDays(now, 30);
        end = now;
        break;
      case "week":
        start = startOfWeek(now);
        end = endOfWeek(now);
        break;
      case "month":
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      default:
        return;
    }

    setDateRange({
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd')
    });
  };

  // Fetch data for all tabs
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("redBut_token");
      
      if (!token) {
        throw new Error("No authentication token found");
      }

      // Fetch data from our existing analytics endpoints
      const [requestsAnalytics, waiterRatingsAnalytics, sentimentsAnalytics] = await Promise.all([
        adminApi.getRequestsAnalytics(token, dateRange),
        adminApi.getWaiterRatingsAnalytics(token, dateRange),
        adminApi.getCustomerRatingsAnalytics(token, dateRange)
      ]);

      // Set data for different tabs
      setExecutiveData({
        requests: requestsAnalytics,
        ratings: waiterRatingsAnalytics,
        sentiments: sentimentsAnalytics
      });

      setStaffData({
        requests: requestsAnalytics,
        ratings: waiterRatingsAnalytics
      });

      setInsightsData({
        sentiments: sentimentsAnalytics,
        requests: requestsAnalytics
      });

    } catch (err: any) {
      console.error("Failed to fetch owner dashboard data:", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when component mounts or date range changes
  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const renderActiveTab = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          <span className="ml-2 text-gray-600">Loading dashboard data...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-red-600 mb-2">Error loading dashboard data</p>
            <p className="text-gray-500 text-sm">{error}</p>
            <button 
              onClick={fetchData}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case "Executive Summary":
        return <ExecutiveSummaryTab data={executiveData} dateRange={dateRange} />;
      case "Staff Performance Summary":
        return <StaffPerformanceTab data={staffData} dateRange={dateRange} />;
      case "AI-Driven Insights":
        return <AiInsightsTab data={insightsData} dateRange={dateRange} />;
      default:
        return <div className="p-8 text-center text-gray-500">Tab content coming soon...</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-600" />
                </button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Owner Dashboard</h1>
                <p className="text-gray-600">Request handling insights and business intelligence</p>
              </div>
            </div>

            {/* Date Range Controls */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-gray-500" />
                <select
                  onChange={(e) => handleDatePreset(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Custom Range</option>
                  {datePresets.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <div className="flex space-x-8 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.key
                      ? "border-primary-500 text-primary-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderActiveTab()}
      </div>
    </div>
  );
};

export default OwnerDashboardComponent;

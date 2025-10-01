"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Clock,
  Target,
  Star,
  Brain,
  RefreshCw,
  BarChart3,
  Award
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { DateRange, adminApi } from "../../lib/api";

interface ExecutiveSummaryTabProps {
  data: any;
  dateRange: DateRange;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  color?: 'green' | 'red' | 'blue' | 'yellow' | 'purple';
  description?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  change, 
  changeLabel, 
  icon, 
  color = 'blue',
  description 
}) => {
  const colorClasses = {
    green: 'bg-green-50 border-green-200 text-green-600',
    red: 'bg-red-50 border-red-200 text-red-600',
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
              {icon}
            </div>
            <h3 className="text-sm font-medium text-gray-600">{title}</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
          {description && (
            <p className="text-xs text-gray-500">{description}</p>
          )}
        </div>
        {change !== undefined && (
          <div className="text-right">
            <div className={`flex items-center text-sm ${
              change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {change >= 0 ? (
                <TrendingUp className="h-4 w-4 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-1" />
              )}
              {Math.abs(change)}%
            </div>
            {changeLabel && (
              <p className="text-xs text-gray-500 mt-1">{changeLabel}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const ExecutiveSummaryTab: React.FC<ExecutiveSummaryTabProps> = ({ data, dateRange }) => {
  const [staffData, setStaffData] = useState<any>(null);
  const [executiveInsights, setExecutiveInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExecutiveData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = typeof window !== 'undefined' ? localStorage.getItem("redBut_token") || "" : "";
      if (!token) {
        throw new Error("No auth token");
      }
      
      // Use the dedicated Executive Summary API endpoint
      const result = await adminApi.getExecutiveSummaryAnalytics(token, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      
      setStaffData(result);
      
      // Use insights from the API response directly
      if (result.insights) {
        setExecutiveInsights(result.insights);
      } else {
        setExecutiveInsights(null);
      }
      
    } catch (error) {
      console.error('Error fetching executive data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load executive data');
      setStaffData(null);
      setExecutiveInsights(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExecutiveData();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
        <div className="h-96 bg-gray-100 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  if (error || !staffData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Analysis Unavailable</h3>
          <p className="text-gray-500 mb-4">
            {error || 'Unable to load executive summary data. Please try again.'}
          </p>
          <button
            onClick={fetchExecutiveData}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Analysis
          </button>
        </div>
      </div>
    );
  }

  // Calculate metrics from staffData (now from Executive Summary API)
  const totalRequests = staffData.overview?.totalRequests || 0;
  const avgCompletionRate = staffData.overview?.requestCompletionRate || 0;
  const avgResponseTime = staffData.overview?.avgRequestResponseTime || 0;
  const totalStaff = staffData.overview?.totalStaff || 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Executive Summary</h2>
        <p className="text-blue-100">
          Operational insights for {dateRange.startDate} to {dateRange.endDate}
        </p>
        <div className="mt-4 flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span className="text-sm">AI-Powered Analysis</span>
          </div>
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span className="text-sm">Real-time Data</span>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Requests"
          value={totalRequests}
          icon={<MessageSquare className="h-5 w-5" />}
          color="blue"
          description="Customer service requests"
        />
        <MetricCard
          title="Completion Rate"
          value={`${avgCompletionRate.toFixed(2)}%`}
          icon={<CheckCircle className="h-5 w-5" />}
          color="green"
          description="Successfully resolved requests"
        />
        <MetricCard
          title="Avg Response Time"
          value={`${avgResponseTime.toFixed(2)} min`}
          icon={<Clock className="h-5 w-5" />}
          color="yellow"
          description="Time to resolution"
        />
        <MetricCard
          title="Total Staff"
          value={totalStaff}
          icon={<Users className="h-5 w-5" />}
          color="purple"
          description="Active team members"
        />
      </div>

      {/* Critical Alerts & Performance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900">Performance Alerts</h3>
          </div>
          <div className="space-y-3">
            {avgCompletionRate < 75 && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-sm text-red-700">Low completion rate needs attention</span>
                <span className="text-xs text-red-500">{avgCompletionRate.toFixed(2)}%</span>
              </div>
            )}
            {avgResponseTime > 30 && (
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <span className="text-sm text-yellow-700">Response time above target</span>
                <span className="text-xs text-yellow-500">{avgResponseTime.toFixed(1)} min</span>
              </div>
            )}
            {staffData.waiterPerformance && staffData.waiterPerformance.some((w: any) => w.requestCompletionRate < 60) && (
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <span className="text-sm text-orange-700">Staff performance concerns</span>
                <span className="text-xs text-orange-500">Monitor</span>
              </div>
            )}
            {avgCompletionRate >= 75 && avgResponseTime <= 30 && staffData.waiterPerformance && !staffData.waiterPerformance.some((w: any) => w.requestCompletionRate < 60) && (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-green-700">All Systems Normal</span>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Award className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Team Performance</h3>
          </div>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{totalStaff}</p>
              <p className="text-sm text-gray-500">Active Staff Members</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-green-600">{staffData.overview.topPerformer}</p>
              <p className="text-sm text-gray-500">Top Performer</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Performance Growth</p>
              <div className={`flex items-center justify-center ${
                staffData.overview.performanceGrowth >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {staffData.overview.performanceGrowth >= 0 ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                {Math.abs(staffData.overview.performanceGrowth).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Service Metrics</h3>
          </div>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{avgCompletionRate.toFixed(2)}%</p>
              <p className="text-sm text-gray-500">Completion Rate</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-yellow-600">{avgResponseTime.toFixed(1)} min</p>
              <p className="text-sm text-gray-500">Avg Response Time</p>
            </div>
          </div>
        </div>
      </div>

      {/* LLM Insights Section */}
      {executiveInsights ? (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">AI Executive Insights</h3>
          </div>
          
          <div className="space-y-4">
            {executiveInsights.summary && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Executive Summary</h4>
                <p className="text-gray-600 text-sm leading-relaxed">{executiveInsights.summary}</p>
              </div>
            )}
            
            {executiveInsights.keyFindings && executiveInsights.keyFindings.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Key Insights</h4>
                <ul className="space-y-1">
                  {executiveInsights.keyFindings.map((insight: string, index: number) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                      <Target className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {executiveInsights.recommendations && executiveInsights.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Strategic Recommendations</h4>
                <ul className="space-y-1">
                  {executiveInsights.recommendations.map((recommendation: string, index: number) => (
                    <li key={index} className="text-sm text-green-700 flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      {recommendation}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {executiveInsights.alerts && executiveInsights.alerts.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Action Required</h4>
                <ul className="space-y-1">
                  {executiveInsights.alerts.map((alert: string, index: number) => (
                    <li key={index} className="text-sm text-red-700 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      {alert}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">AI Executive Insights</h3>
          </div>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">AI Analysis Unavailable</h4>
            <p className="text-gray-500">
              LLM analysis service is currently unavailable. Please contact administrator to configure OpenAI API key.
            </p>
          </div>
        </div>
      )}

      {/* Staff Performance Summary */}
      {staffData.waiterPerformance && staffData.waiterPerformance.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Staff Performance Overview</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {staffData.waiterPerformance.slice(0, 6).map((waiter: any, index: number) => (
                <div key={waiter.waiterId} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{waiter.name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      waiter.requestCompletionRate >= 90 ? 'bg-green-100 text-green-800' :
                      waiter.requestCompletionRate >= 75 ? 'bg-blue-100 text-blue-800' :
                      waiter.requestCompletionRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {waiter.requestCompletionRate >= 90 ? 'Excellent' :
                       waiter.requestCompletionRate >= 75 ? 'Good' :
                       waiter.requestCompletionRate >= 60 ? 'Average' : 'Needs Improvement'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center text-sm">
                    <div>
                      <p className="font-bold text-green-600">{waiter.requestCompletionRate.toFixed(2)}%</p>
                      <p className="text-xs text-gray-500">Completion</p>
                    </div>
                    <div>
                      <p className="font-bold text-blue-600">{waiter.avgResponseTime.toFixed(1)}m</p>
                      <p className="text-xs text-gray-500">Avg Response</p>
                    </div>
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-xs text-gray-600">{waiter.totalRequests} requests handled</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutiveSummaryTab;
       
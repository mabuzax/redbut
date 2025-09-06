"use client";

import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';
import { 
  TrendingUp, TrendingDown, User, Clock, CheckCircle, XCircle,
  Star, AlertTriangle, Award, Target, Activity, RefreshCw, BarChart3
} from 'lucide-react';
import { DateRange, adminApi, StaffPerformanceAnalytics, WaiterPerformanceAnalytics } from "../../lib/api";

interface PerformanceMetrics extends StaffPerformanceAnalytics {}

interface StaffPerformanceTabProps {
  data: any;
  dateRange: DateRange;
}

const StaffPerformanceTab: React.FC<StaffPerformanceTabProps> = ({ data, dateRange }) => {
  const [performanceData, setPerformanceData] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWaiter, setSelectedWaiter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('completion-rate');
  const [activeTab, setActiveTab] = useState<string>('rankings');

  const fetchStaffPerformance = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = typeof window !== 'undefined' ? localStorage.getItem("redBut_token") || "" : "";
      if (!token) {
        throw new Error("No auth token");
      }
      
      const result = await adminApi.getStaffPerformanceAnalytics(token, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        waiter: selectedWaiter,
        sort: sortBy
      });
      
      console.log(result)
      setPerformanceData(result);
    } catch (error) {
      console.error('Error fetching staff performance:', error);
      setError(error instanceof Error ? error.message : 'Failed to load staff performance data');
      setPerformanceData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffPerformance();
  }, [dateRange, selectedWaiter, sortBy]);

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  const getPerformanceBadgeClass = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium';
    if (score >= 75) return 'bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium';
    return 'bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium';
  };

  const getPerformanceBadgeText = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Average';
    return 'Needs Improvement';
  };

  // Show error state when data is not available
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

  if (error || !performanceData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Analysis Unavailable</h3>
          <p className="text-gray-500 mb-4">
            {error || 'LLM analysis service is currently unavailable. Please try again.'}
          </p>
          <button
            onClick={fetchStaffPerformance}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Analysis
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex gap-4">
          <select 
            value={selectedWaiter} 
            onChange={(e) => setSelectedWaiter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Staff</option>
            {performanceData.staffRankings.map(waiter => (
              <option key={waiter.waiterId} value={waiter.waiterId.toString()}>
                {waiter.waiterName}
              </option>
            ))}
          </select>
          
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="completion-rate">Completion Rate</option>
            <option value="response-time">Response Time</option>
            <option value="rating">Customer Rating</option>
            <option value="productivity">Productivity</option>
          </select>
        </div>
        
        <button 
          onClick={fetchStaffPerformance} 
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Data
        </button>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center">
            <User className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Staff</p>
              <div className="flex items-center">
                <p className="text-2xl font-bold text-gray-900">{performanceData.overview.totalStaff}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center">
            <Award className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Top Performer</p>
              <div className="flex items-center">
                <p className="text-lg font-bold text-gray-900">{performanceData.overview.topPerformer}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Completion Rate</p>
              <div className="flex items-center">
                <p className="text-2xl font-bold text-gray-900">{performanceData.overview.avgCompletionRate.toFixed(2)}%</p>
                <TrendingUp className="h-4 w-4 text-green-500 ml-2" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Response Time</p>
              <div className="flex items-center">
                <p className="text-2xl font-bold text-gray-900">{performanceData.overview.avgResponseTime.toFixed(2)}m</p>
                <TrendingDown className="h-4 w-4 text-green-500 ml-2" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'rankings', name: 'Staff Rankings', icon: Award },
            { id: 'productivity', name: 'Team Productivity', icon: TrendingUp },
            { id: 'workload', name: 'Workload Analysis', icon: BarChart3 }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'rankings' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Individual Staff Performance</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {performanceData.staffRankings.map((waiter, index) => (
                  <div key={waiter.waiterId} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-bold">
                          #{index + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{waiter.waiterName}</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{waiter.totalRequests} requests</span>
                            <span>•</span>
                            <span>{waiter.activeHours.toFixed(1)}h active</span>
                            <span>•</span>
                            <span>{waiter.requestsPerHour.toFixed(1)} req/hr</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className={getPerformanceBadgeClass(waiter.completionRate)}>
                          {getPerformanceBadgeText(waiter.completionRate)}
                        </span>
                        <div className="flex space-x-1">
                          {getTrendIcon(waiter.trends.week)}
                          {getTrendIcon(waiter.trends.month)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{waiter.completionRate.toFixed(2)}%</p>
                        <p className="text-xs text-gray-500">Completion Rate</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{waiter.avgResponseTime.toFixed(2)}m</p>
                        <p className="text-xs text-gray-500">Response Time</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-yellow-600">{waiter.avgRating.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">Rating</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">{waiter.sentimentScore.toFixed(2)}%</p>
                        <p className="text-xs text-gray-500">Sentiment Score</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-600">{waiter.completedRequests}</p>
                        <p className="text-xs text-gray-500">Completed</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'productivity' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Team Productivity Trend</h3>
              </div>
              <div className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={performanceData.teamMetrics.productivityTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="productivity" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="efficiency" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Service Quality Metrics</h3>
              </div>
              <div className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData.teamMetrics.serviceQuality}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="metric" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="score" fill="#3B82F6" />
                    <Bar dataKey="target" fill="#E5E7EB" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'workload' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Workload Distribution Analysis</h3>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={performanceData.teamMetrics.workloadDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="waiter" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="requests" fill="#3B82F6" name="Requests Handled" />
                  <Bar dataKey="hours" fill="#10B981" name="Hours Worked" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* LLM Insights Section */}
      {performanceData.insights && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">AI Performance Insights</h3>
          </div>
          
          <div className="space-y-4">
            {performanceData.insights.summary && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Summary</h4>
                <p className="text-gray-600 text-sm leading-relaxed">{performanceData.insights.summary}</p>
              </div>
            )}
            
            {performanceData.insights.strengths && performanceData.insights.strengths.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Team Strengths</h4>
                <ul className="space-y-1">
                  {performanceData.insights.strengths.map((strength, index) => (
                    <li key={index} className="text-sm text-green-700 flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {performanceData.insights.improvements && performanceData.insights.improvements.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Areas for Improvement</h4>
                <ul className="space-y-1">
                  {performanceData.insights.improvements.map((improvement, index) => (
                    <li key={index} className="text-sm text-yellow-700 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      {improvement}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {performanceData.insights.recommendations && performanceData.insights.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h4>
                <ul className="space-y-1">
                  {performanceData.insights.recommendations.map((recommendation, index) => (
                    <li key={index} className="text-sm text-blue-700 flex items-start gap-2">
                      <Target className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      {recommendation}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffPerformanceTab;

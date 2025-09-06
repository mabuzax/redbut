"use client";

import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { 
  Brain, TrendingUp, AlertTriangle, CheckCircle, XCircle, 
  Target, Users, Clock, MessageSquare, Star, Lightbulb, 
  ArrowUp, ArrowDown, Minus, RefreshCw, Eye
} from 'lucide-react';
import { DateRange } from "../../lib/api";

interface AIInsight {
  id: string;
  type: 'positive' | 'negative' | 'neutral' | 'opportunity' | 'warning';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  category: 'performance' | 'sentiment' | 'efficiency' | 'quality' | 'trend';
  data?: any;
  recommendation?: string;
}

interface SentimentAnalysis {
  overall: {
    positive: number;
    neutral: number;
    negative: number;
    trend: 'improving' | 'declining' | 'stable';
  };
  byWaiter: Array<{
    waiterId: number;
    waiterName: string;
    sentiment: number;
    trend: 'up' | 'down' | 'stable';
    keyWords: string[];
  }>;
  themes: Array<{
    theme: string;
    frequency: number;
    sentiment: number;
    examples: string[];
  }>;
}

interface PerformanceInsights {
  patterns: Array<{
    pattern: string;
    description: string;
    frequency: number;
    impact: string;
  }>;
  anomalies: Array<{
    type: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
    affectedStaff: string[];
  }>;
  predictions: Array<{
    metric: string;
    currentValue: number;
    predictedValue: number;
    confidence: number;
    timeframe: string;
  }>;
}

interface AiInsightsTabProps {
  data: any;
  dateRange: DateRange;
}

const AiInsightsTab: React.FC<AiInsightsTabProps> = ({ data, dateRange }) => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [sentimentData, setSentimentData] = useState<SentimentAnalysis | null>(null);
  const [performanceInsights, setPerformanceInsights] = useState<PerformanceInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<string>('insights');

  const fetchAIInsights = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('redBut_token');
      const response = await fetch(`/api/admin/analytics/ai-insights?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setInsights(result.insights || []);
      setSentimentData(result.sentiment || null);
      setPerformanceInsights(result.performance || null);
    } catch (error) {
      console.error('Error fetching AI insights:', error);
      // Keep the current state if API fails
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAIInsights();
  }, [dateRange]);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'positive': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'negative': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'opportunity': return <Lightbulb className="h-5 w-5 text-blue-500" />;
      default: return <Brain className="h-5 w-5 text-gray-500" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'positive': return 'border-green-200 bg-green-50';
      case 'negative': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'opportunity': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getImpactBadge = (impact: string) => {
    const baseClass = 'px-2 py-1 text-xs font-medium rounded-full';
    switch (impact) {
      case 'high': return `${baseClass} bg-red-100 text-red-800`;
      case 'medium': return `${baseClass} bg-yellow-100 text-yellow-800`;
      case 'low': return `${baseClass} bg-green-100 text-green-800`;
      default: return `${baseClass} bg-gray-100 text-gray-800`;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
      case 'improving': return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'down':
      case 'declining': return <ArrowDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const sentimentChartData = sentimentData ? [
    { name: 'Positive', value: sentimentData.overall.positive, color: '#10B981' },
    { name: 'Neutral', value: sentimentData.overall.neutral, color: '#6B7280' },
    { name: 'Negative', value: sentimentData.overall.negative, color: '#EF4444' }
  ] : [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2">
          {[
            { id: 'insights', name: 'AI Insights', icon: Brain },
            { id: 'sentiment', name: 'Sentiment Analysis', icon: MessageSquare },
            { id: 'patterns', name: 'Pattern Analysis', icon: Eye }
          ].map((view) => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                activeView === view.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <view.icon className="h-4 w-4" />
              {view.name}
            </button>
          ))}
        </div>
        
        <button 
          onClick={fetchAIInsights} 
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Analysis
        </button>
      </div>

      {/* AI Insights View */}
      {activeView === 'insights' && (
        <div className="space-y-6">
          {insights.length === 0 ? (
            <div className="text-center py-12">
              <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No AI Insights Available</h3>
              <p className="text-gray-600 mb-4">Click "Refresh Analysis" to generate insights from your current data.</p>
              <button 
                onClick={fetchAIInsights} 
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Generate Insights
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {insights.map((insight) => (
              <div key={insight.id} className={`rounded-lg border p-6 ${getInsightColor(insight.type)}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getInsightIcon(insight.type)}
                    <div>
                      <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                      <p className="text-sm text-gray-600 capitalize">{insight.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={getImpactBadge(insight.impact)}>{insight.impact.toUpperCase()}</span>
                    <span className="text-xs text-gray-500">{insight.confidence}% confidence</span>
                  </div>
                </div>
                
                <p className="text-gray-700 mb-4">{insight.description}</p>
                
                {insight.recommendation && (
                  <div className="bg-white bg-opacity-50 rounded-md p-3 border-l-4 border-blue-500">
                    <h4 className="font-medium text-sm text-gray-900 mb-1">AI Recommendation:</h4>
                    <p className="text-sm text-gray-700">{insight.recommendation}</p>
                  </div>
                )}
              </div>
            ))}
            </div>
          )}
        </div>
      )}

      {/* Sentiment Analysis View */}
      {activeView === 'sentiment' && (
        <div className="space-y-6">
          {!sentimentData ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Sentiment Data Available</h3>
              <p className="text-gray-600 mb-4">Generate AI insights to see sentiment analysis.</p>
            </div>
          ) : (
            <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Overall Sentiment */}
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Overall Sentiment Distribution</h3>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(sentimentData.overall.trend)}
                    <span className="text-sm text-gray-600 capitalize">{sentimentData.overall.trend}</span>
                  </div>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={sentimentChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {sentimentChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Waiter Sentiment Scores */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Individual Sentiment Scores</h3>
              <div className="space-y-4">
                {sentimentData.byWaiter?.map((waiter) => (
                  <div key={waiter.waiterId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">{waiter.waiterName}</h4>
                      <div className="flex gap-2 mt-1">
                        {waiter.keyWords.slice(0, 3).map((word, idx) => (
                          <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-900">{waiter.sentiment}%</span>
                      {getTrendIcon(waiter.trend)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sentiment Themes */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Common Themes in Feedback</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sentimentData.themes?.map((theme, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{theme.theme}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">{theme.frequency} mentions</span>
                      <span className={`text-sm font-medium ${theme.sentiment >= 70 ? 'text-green-600' : theme.sentiment >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {theme.sentiment}%
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {theme.examples?.slice(0, 2).map((example, idx) => (
                      <p key={idx} className="text-xs text-gray-600 italic">"{example}"</p>
                    ))}
                  </div>
                </div>
              )) || <p className="text-gray-500 text-center">No sentiment themes available</p>}
            </div>
          </div>
            </>
          )}
        </div>
      )}

      {/* Pattern Analysis View */}
      {activeView === 'patterns' && (
        <div className="space-y-6">
          {!performanceInsights ? (
            <div className="text-center py-12">
              <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Performance Data Available</h3>
              <p className="text-gray-600 mb-4">Generate AI insights to see performance patterns and predictions.</p>
            </div>
          ) : (
            <>
              {/* Performance Patterns */}
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Detected Performance Patterns</h3>
                <div className="space-y-4">
                  {performanceInsights.patterns?.map((pattern, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{pattern.pattern}</h4>
                    <p className="text-sm text-gray-600">{pattern.description}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{pattern.frequency}%</p>
                      <p className="text-xs text-gray-500">Frequency</p>
                    </div>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                      pattern.impact === 'High' ? 'bg-red-100 text-red-800' :
                      pattern.impact === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {pattern.impact}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Anomalies */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Anomalies</h3>
            <div className="space-y-4">
              {performanceInsights.anomalies?.map((anomaly, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{anomaly.type}</h4>
                      <p className="text-sm text-gray-600 mt-1">{anomaly.description}</p>
                      <div className="mt-2">
                        <p className="text-xs text-gray-500">Affected Staff:</p>
                        <div className="flex gap-2 mt-1">
                          {anomaly.affectedStaff.map((staff, idx) => (
                            <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              {staff}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      anomaly.severity === 'high' ? 'bg-red-100 text-red-800' :
                      anomaly.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {anomaly.severity.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Predictions */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">AI Predictions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {performanceInsights.predictions?.map((prediction, index) => (
                <div key={index} className="border rounded-lg p-4 text-center">
                  <h4 className="font-medium text-gray-900 mb-2">{prediction.metric}</h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500">Current</p>
                      <p className="text-lg font-bold text-gray-700">{prediction.currentValue}</p>
                    </div>
                    <div className="flex items-center justify-center">
                      {prediction.predictedValue > prediction.currentValue ? 
                        <ArrowUp className="h-4 w-4 text-green-500" /> :
                        <ArrowDown className="h-4 w-4 text-red-500" />
                      }
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Predicted</p>
                      <p className="text-lg font-bold text-blue-600">{prediction.predictedValue}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{prediction.confidence}% confidence</p>
                      <p className="text-xs text-gray-400">{prediction.timeframe}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AiInsightsTab;

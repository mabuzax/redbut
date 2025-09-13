import { UserType } from './types';
import { clearRedButLocalStorage } from './redbut-localstorage';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface RestaurantMetrics {
  totalTables: number;
  occupiedTables: number;
  totalRequests: number;
  openRequests: number;
  averageResponseTime: number; 
  dailyRevenue: number;
}


export const STAFF_POSITIONS = ['Waiter', 'Admin'] as const;
export type StaffPosition = typeof STAFF_POSITIONS[number];

// Use the same enum structure as the backend
export enum WaiterStatus {
  Active = 'Active',
  Inactive = 'Inactive'
}

export enum RestaurantStatus {
  Active = 'Active',
  Inactive = 'Inactive'
}

export interface RestaurantSubscription {
  id: string;
  restaurantId: string;
  activeUntil: string;
  createdAt: string;
  updatedAt: string;
}

export interface Restaurant {
  id: string;
  name: string;
  location?: string;
  address?: string;
  status?: RestaurantStatus; // Optional since existing restaurants might not have status
  subscription?: RestaurantSubscription; // Optional subscription info
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  surname: string;
  email: string; 
  tag_nickname: string;
  position?: StaffPosition; 
  address?: string | null;
  phone?: string | null;
  propic?: string | null;
  userType: UserType; // Direct userType from waiter record
  status: WaiterStatus; // Status of the staff member
  createdAt: string; 
  updatedAt: string; 
  accessAccount?: {
    username: string; 
    userType?: UserType; // Optional since we use userType directly from waiter
  } | null;
  averageRating?: number;
  requestsHandled?: number;
}


export interface CreateStaffMemberDto {
  name: string;
  surname: string;
  email?: string; 
  tag_nickname: string;
  position: StaffPosition;
  address?: string;
  phone?: string; 
  propic?: string;
  restaurantId: string;
}


export interface UpdateStaffMemberDto {
  name?: string;
  surname?: string;
  tag_nickname?: string;
  position?: StaffPosition;
  status?: WaiterStatus;
  address?: string;
  phone?: string; 
  propic?: string;
}


export interface RequestSummary {
  id: string;
  tableNumber: number;
  content: string;
  status: string;
  waiterId?: string;
  waiterName?: string;
  createdAt: string; 
  updatedAt: string; 
  responseTime?: number; 
}

export interface HourlyRequestData {
  hour: number;   
  open: number;
  closed: number;
}


export interface AdminRequestSummary {
  date: string; 
  hourly: HourlyRequestData[];
}


export interface ResolutionBucket {
  range: string; 
  count: number;
}


export interface BusiestTime {
  hour: number; 
  label: string; 
  count: number; 
}


export interface PeakTimeRequests {
  peakTime: string; 
  totalRequests: number; 
}


export interface WaiterPerformance {
  waiterId: string;
  waiterName: string;
  requestsHandled: number;
  avgResolutionTime: number; 
}

export interface RequestFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  waiterId?: string;
  search?: string;
  sort?: 'createdAt' | 'status' | 'tableNumber';
  page?: number;
  pageSize?: number;
}


export interface MenuItem {
  id: string;
  category?: string;
  name: string;
  description?: string;
  image?: string;
  price: number;
  status: string;
  video?: string;
  served_info?: string;
  available_options?: any;
  available_extras?: any;
  createdAt: string;
  updatedAt: string;
}


export interface CreateMenuItemDto {
  category?: string;
  name: string;
  description?: string;
  image?: string;
  price: number;
  status?: string;
  video?: string;
  served_info?: string;
  available_options?: any;
  available_extras?: any;
}

export interface UpdateMenuItemDto extends Partial<CreateMenuItemDto> {}


export interface MenuItemsResponse {
  items: MenuItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}


export interface MenuFilters {
  category?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}


export interface LoginRequest {
  username: string;
  password: string;
}


export interface LoginResponse {
  userId: string;
  username: string;
  name: string;
  token: string;
  requiresPasswordChange: boolean;
}

export interface LoginResponse {
  waiter: {
    id: string;
    name: string;
    surname: string;
    email: string;
    phone?: string;
    tag_nickname: string;
  };
  token: string;
}


export interface ChangePasswordRequest {
  userId: string;
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}


export interface AiQueryRequest {
  message: string;
  threadId?: string; 
}

export type AiQueryResponse = 
  | string 
  | StaffMember 
  | StaffMember[] 
  | { message: string } 
  | string[]; 

// User management types
export interface User {
  id: string;
  name: string;
  surname: string;
  tag_nickname: string;
}

// Orders Analytics Section

export interface DailyOrdersDataPoint {
  date: string; // Format: "YYYY-MM-DD"
  totalOrders: number;
}

export interface TopSellingItem {
  item: string;
  count: number;
}

export interface OrderInsightsData {
  totalRevenueToday: number;
  averageOrderValue: number;
  peakOrderHour: string; // e.g., "14:00 - 14:59" or "N/A"
  topSellingItems: TopSellingItem[];
}

// Comprehensive Analytics Section

// General Utility Types
export interface DateRange {
  startDate: string; // ISO Date string YYYY-MM-DD
  endDate: string;   // ISO Date string YYYY-MM-DD
}

export interface DataPoint<X = string | number | Date, Y = number> {
  x: X;
  y: Y;
  [key: string]: any; 
}

export interface NameValuePair {
  name: string;
  value: number;
  [key: string]: any; 
}

export interface TimeValuePair {
  time: string; 
  value: number;
  [key: string]: any;
}

export interface MetricCardValue {
  value: string | number;
  label: string;
  trend?: string; 
  trendDirection?: 'up' | 'down' | 'neutral';
}

// 1. Sales Analytics
export interface SalesSummaryMetrics {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
}

export interface SalesTrendDataPoint {
  date: string; 
  sales: number;
  orders: number;
}

export interface SalesAnalyticsData {
  summary: SalesSummaryMetrics;
  salesTrend: SalesTrendDataPoint[];
}

// 2. Popular Items Analytics
export interface PopularItem {
  itemId: string;
  itemName: string;
  quantitySold: number;
  totalRevenue: number;
  percentageOfTotalRevenue?: number;
}

export interface RevenueByItemDataPoint extends NameValuePair {}

export interface PopularItemsAnalyticsData {
  topSellingItems: PopularItem[];
  revenueByItem: RevenueByItemDataPoint[];
}

// 3. Hourly Sales Analytics
export interface HourlySalesDataPoint {
  hour: string; 
  sales: number;
  orders: number;
}
export interface HourlyAverageOrderValueDataPoint {
  hour: string;
  averageOrderValue: number;
}
export interface HourlySalesAnalyticsData {
  salesTodayByHour: HourlySalesDataPoint[];
  averageOrderValueByHour: HourlyAverageOrderValueDataPoint[];
}

// 5. Staff Analytics
export interface StaffSalesPerformance {
  staffId: string;
  staffName: string; 
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  itemsSold?: number;
}
export interface StaffOrderCount extends NameValuePair {}
export interface StaffPerformanceDetail {
  staffId: string;
  staffName: string;
  position: string;
  totalHoursWorked: number;
  averageRating?: number; 
  requestsHandled?: number; 
  ordersHandled?: number;
  // Request handling specific metrics
  totalRequests?: number;
  completedRequests?: number;
  averageResponseTime?: number; // in minutes
  completionRate?: number; // percentage
}
export interface StaffAnalyticsData {
  salesPerformance: StaffSalesPerformance[];
  orderCounts: StaffOrderCount[]; 
  performanceDetails: StaffPerformanceDetail[]; 
}

// Staff Performance Analytics for LLM-powered insights
export interface WaiterPerformanceAnalytics {
  waiterId: number;
  waiterName: string;
  totalRequests: number;
  completedRequests: number;
  completionRate: number;
  avgResponseTime: number;
  avgRating: number;
  sentimentScore: number;
  activeHours: number;
  requestsPerHour: number;
  trends: {
    week: 'up' | 'down' | 'stable';
    month: 'up' | 'down' | 'stable';
  };
}

export interface StaffPerformanceAnalytics {
  overview: {
    totalStaff: number;
    topPerformer: string;
    avgCompletionRate: number;
    avgResponseTime: number;
    performanceGrowth: number;
  };
  staffRankings: WaiterPerformanceAnalytics[];
  teamMetrics: {
    productivityTrend: Array<{ date: string; productivity: number; efficiency: number }>;
    serviceQuality: Array<{ metric: string; score: number; target: number }>;
    workloadDistribution: Array<{ waiter: string; requests: number; hours: number }>;
  };
  insights?: {
    summary: string;
    strengths: string[];
    improvements: string[];
    recommendations: string[];
  };
  error?: string;
  llmUnavailable?: boolean;
}

// 6. Tables Analytics
export interface TableUtilizationDataPoint {
  tableNumber: number;
  totalOrders: number;
  totalRevenue: number;
  averageTurnaroundTimeMinutes?: number; 
  occupancyPercentage?: number; 
}
export interface RevenueByTableDataPoint extends NameValuePair {}
export interface TablesAnalyticsData {
  utilization: TableUtilizationDataPoint[]; 
  revenueByTable: RevenueByTableDataPoint[]; 
  mostPopularTables?: NameValuePair[]; 
}

// 7. Waiter Ratings Analytics
export interface WaiterAverageRating extends NameValuePair {
  waiterId: string;
  totalRatings: number;
}
export interface RatingDistributionDataPoint extends NameValuePair {}
export interface RatingsOverTimeDataPoint {
  date: string; 
  averageRating: number;
}
export interface RecentComment {
  commentId: string;
  waiterId: string;
  waiterName: string;
  rating: number;
  commentText: string;
  commentDate: string; 
  tableName?: string; 
  overallSentiment?: string;
  isServiceAnalysis?: boolean;
  serviceType?: string;
}
export interface ServiceAnalysisBreakdown {
    waiterId: string;
    waiterName: string;
    averageRating: number;
    totalAnalyses: number;
    serviceTypes: {
      request: { count: number; averageRating: number };
      order: { count: number; averageRating: number };
    };
}
export interface ServiceAnalysisData {
  averageRatingsPerWaiter: WaiterAverageRating[];
  overallRatingDistribution: RatingDistributionDataPoint[]; 
  ratingsTrend: RatingsOverTimeDataPoint[];
  recentComments: RecentComment[];
  analysisBreakdownPerWaiter: ServiceAnalysisBreakdown[];
}

// 8. Requests Analytics
export interface RequestsSummaryMetrics {
  totalRequests: number;
  openRequests: number;
  averageResponseTimeMinutes: number; 
  completionRatePercentage: number; 
  cancelledRatePercentage: number;
  completedRequests: number;
  cancelledRequests: number;
}
export interface RequestStatusDistribution extends NameValuePair {}
export interface RequestsOverTimeDataPoint {
  time: string; 
  newRequests: number;
  resolvedRequests: number; 
}
export interface WaiterResponseTimeDataPoint extends NameValuePair {
    waiterId: string;
    waiterName: string;
    averageResponseTime: number;
}
export interface RequestsAnalyticsData {
  summaryMetrics: RequestsSummaryMetrics;
  statusDistribution: RequestStatusDistribution[];
  requestsOverTime: RequestsOverTimeDataPoint[]; 
  waiterResponseTimes: WaiterResponseTimeDataPoint[]; 
  waiterRequestPerformance: StaffPerformanceDetail[]; 
}

// 9. Customer Ratings Analytics
export interface OverallRestaurantRating {
  averageOverallRating: number; 
  totalReviews: number;
}
export interface CustomerSatisfactionTrendDataPoint {
  date: string; 
  satisfactionScore: number; 
}
export interface FeedbackTheme extends NameValuePair {
  sentiment?: 'positive' | 'negative' | 'neutral';
}
export interface SentimentAnalysisResult {
  overallSentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  keyInsights: string[];
  commonThemes: FeedbackTheme[];
  waiterPerformanceInsights: {
    waiterName: string;
    sentimentTrend: 'improving' | 'declining' | 'stable';
    keyStrengths: string[];
    areasForImprovement: string[];
  }[];
  businessValue: {
    riskAreas: string[];
    opportunities: string[];
    priorityActions: string[];
  };
}
export interface CustomerRatingsAnalyticsData {
  overallRestaurantRating: OverallRestaurantRating;
  satisfactionTrend: CustomerSatisfactionTrendDataPoint[];
  topFeedbackThemes: FeedbackTheme[]; 
  sentimentAnalysis: SentimentAnalysisResult;
  rawDataSummary: {
    totalRequestLogs: number;
    totalServiceAnalysis: number;
    dateRange: string;
  };
}

export type AiAnalyticsQueryResponse = 
  | string 
  | SalesAnalyticsData
  | PopularItemsAnalyticsData
  | HourlySalesAnalyticsData
  | StaffAnalyticsData
  | TablesAnalyticsData
  | ServiceAnalysisData
  | RequestsAnalyticsData
  | CustomerRatingsAnalyticsData
  | { message: string } 
  | any; // For potentially mixed or custom AI responses


export interface OTPGenerationRequest {
  identifier: string; // email or phone
  userType: string; // 'ADMIN' or 'WAITER'
}

export interface OTPGenerationResponse {
  message: string;
  username: string;
}

export interface OTPVerificationRequest {
  identifier: string; // email or phone  
  userType: string; // 'ADMIN' or 'WAITER'
  code: string; // 6-digit OTP
}

export interface OTPVerificationResponse {
  success: boolean;
  message?: string;
  user?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    userType: string;
  };
  waiter?: {
    id: string;
    name: string;
    surname: string;
    email: string;
    phone?: string;
  };
  admin?: {
    id: string;
    name: string;
    surname: string;
    email: string;
    phone?: string;
  };
  token: string;
}

async function callApi<T>(
  endpoint: string,
  token: string,
  method: string = 'GET',
  body?: object,
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const config: RequestInit = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const url = `${API_BASE_URL}/api/v1${endpoint}`;  
  const response = await fetch(url, config);

  // Check for new token in response headers (sliding session)
  const newToken = response.headers.get('X-New-Token');
  if (newToken) {
    console.log('🔄 Received refreshed token, updating localStorage');
    localStorage.setItem('redBut_token', newToken);
    
    // Update session data if it exists
    const existingSession = localStorage.getItem('redBut_adminSession');
    if (existingSession) {
      try {
        const sessionData = JSON.parse(existingSession);
        sessionData.token = newToken;
        localStorage.setItem('redBut_adminSession', JSON.stringify(sessionData));
      } catch (error) {
        console.error('Error updating session with new token:', error);
      }
    }
  }

  const rawText = await response.clone().text();
  console.log('API responded with:', rawText);

  if (!response.ok) {
    // If we get a 401, the token is expired/invalid - clear all session data
    if (response.status === 401) {
      console.error('Authentication failed (401) - JWT token expired or invalid, clearing all session data');
      clearRedButLocalStorage();
      // Redirect to login page
      window.location.href = '/';
      return; // Early return to prevent further execution
    }
    
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(errorData.message || `API call failed with status ${response.status}`);
  }

  const isJson =
    response.headers.get('content-type')?.includes('application/json');

  return isJson ? (JSON.parse(rawText) as T) : (rawText as T);
}


async function callPublicApi<T>(
  endpoint: string,
  method: string = 'POST',
  body?: object,
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  const config: RequestInit = { method, headers };
  if (body) config.body = JSON.stringify(body);

  const url = `${API_BASE_URL}/api/v1${endpoint}`;
  const response = await fetch(url, config);
  if (!response.ok) {
    // If we get a 401, check if it's an OTP endpoint
    if (response.status === 401) {
      // For OTP endpoints, don't redirect - let the form handle the error
      if (endpoint.includes('/otp/')) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `API call failed with status ${response.status}`);
      }
      
      // For other endpoints, the token is expired/invalid - clear all session data
      console.error('Authentication failed (401) - JWT token expired or invalid, clearing all session data');
      clearRedButLocalStorage();
      // Redirect to login page
      window.location.href = '/';
      return; // Early return to prevent further execution
    }
    
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(errorData.message || `API call failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const adminApi = {
 
  login: async (username: string, password: string): Promise<LoginResponse> => {
    return callPublicApi<LoginResponse>('/auth/admin/login', 'POST', {
      username,
      password,
    } as LoginRequest);
  },

 
  changePassword: async (dto: ChangePasswordRequest): Promise<void> => {
    await callPublicApi<void>('/auth/admin/change-password', 'POST', dto);
  },

  checkPassword: (password: string): boolean => password === '__new__pass',

  
  getRestaurantMetrics: async (token: string): Promise<RestaurantMetrics> => {
    return callApi<RestaurantMetrics>('/admin/metrics/summary', token);
  },

  
  getRequestSummaries: async (
    token: string,
    filters: RequestFilters = {},
  ): Promise<RequestSummary[]> => {
    const queryParams = new URLSearchParams();
    if (filters.status)     queryParams.append('status', filters.status);
    if (filters.startDate)  queryParams.append('startDate', filters.startDate);
    if (filters.endDate)    queryParams.append('endDate', filters.endDate);
    if (filters.waiterId)   queryParams.append('waiterId', filters.waiterId);
    if (filters.search)     queryParams.append('search', filters.search);
    if (filters.sort)       queryParams.append('sort', filters.sort);
    if (filters.page)       queryParams.append('page', String(filters.page));
    if (filters.pageSize)   queryParams.append('pageSize', String(filters.pageSize));

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return callApi<RequestSummary[]>(`/admin/requests${queryString}`, token);
  },

  getAllRequests: async (
    token: string,
    filters: RequestFilters = {},
  ): Promise<RequestSummary[]> => {
    return adminApi.getRequestSummaries(token, filters);
  },

 
  getRequestsSummary: async (
    token: string,
  ): Promise<{ open: number; closed: number; avgResolutionTime: number }> => {
    return callApi<{ open: number; closed: number; avgResolutionTime: number }>(
      '/admin/requests/summary',
      token,
    );
  },

 
  getHourlyRequestAnalytics: async (
    token: string,
    date: string,
  ): Promise<AdminRequestSummary> => {
    return callApi<AdminRequestSummary>(
      `/admin/requests/analytics/hourly?date=${date}`,
      token,
    );
  },


  getRequestsResolutionAnalytics: async (
    token: string,
    date: string,
  ): Promise<ResolutionBucket[]> => {
    return callApi<ResolutionBucket[]>(
      `/admin/requests/analytics/resolution?date=${date}`,
      token,
    );
  },

 
  getBusiestTime: async (
    token: string,
    date: string,
  ): Promise<BusiestTime> => {
    return callApi<BusiestTime>(
      `/admin/requests/analytics/busiest-time?date=${date}`,
      token,
    );
  },


  getPeakTimeRequests: async (
    token: string,
    date: string,
  ): Promise<PeakTimeRequests> => {
    return callApi<PeakTimeRequests>(
      `/admin/requests/analytics/peak-time-requests?date=${date}`,
      token,
    );
  },

  
  getWaiterPerformanceAnalytics: async (
    token: string,
    date: string,
  ): Promise<WaiterPerformance[]> => {
    return callApi<WaiterPerformance[]>(
      `/admin/requests/analytics/waiter-performance?date=${date}`,
      token,
    );
  },

  
  getWaiterPerformance: async (token: string, waiterId: string): Promise<any> => {
    return callApi<any>(`/admin/staff/${waiterId}/performance`, token); 
  },


  getRevenueData: async (
    token: string,
    period: 'day' | 'week' | 'month' | 'year' = 'day',
  ): Promise<any> => {
    return callApi<any>(`/admin/metrics/revenue?period=${period}`, token);
  },


  getSatisfactionData: async (
    token: string,
    period: 'day' | 'week' | 'month' | 'year' = 'day',
  ): Promise<any> => {
    return callApi<any>(`/admin/metrics/satisfaction?period=${period}`, token);
  },


  getAllStaffMembers: async (token: string, restaurantId?: string): Promise<StaffMember[]> => {
    const queryParams = restaurantId ? `?restaurantId=${restaurantId}` : '';
    console.log(`Fetching staff members with restaurantId: ${restaurantId}`);
    console.log(`API endpoint: /admin/staff${queryParams}`);
    return callApi<StaffMember[]>(`/admin/staff${queryParams}`, token);
  },

  getRestaurants: async (token: string): Promise<Restaurant[]> => {
    return callApi<Restaurant[]>('/restaurants', token);
  },


  getStaffMemberById: async (token: string, id: string): Promise<StaffMember> => {
    return callApi<StaffMember>(`/admin/staff/${id}`, token);
  },


  createStaffMember: async (
    token: string,
    data: CreateStaffMemberDto,
  ): Promise<StaffMember> => {
    return callApi<StaffMember>('/admin/staff', token, 'POST', data);
  },


  updateStaffMember: async (
    token: string,
    id: string,
    data: UpdateStaffMemberDto,
  ): Promise<StaffMember> => {
    return callApi<StaffMember>(`/admin/staff/${id}`, token, 'PUT', data);
  },


  deleteStaffMember: async (token: string, id: string): Promise<void> => {
    await callApi<void>(`/admin/staff/${id}`, token, 'DELETE');
  },

  processStaffAiQuery: async (
    token: string,
    query: AiQueryRequest,
  ): Promise<AiQueryResponse> => {
    return callApi<AiQueryResponse>('/admin/staff/ai/query', token, 'POST', query);
  },

  // Orders Analytics API functions
  getOrdersPerDayThisMonth: async (token: string): Promise<DailyOrdersDataPoint[]> => {
    return callApi<DailyOrdersDataPoint[]>('/admin/orders/daily-this-month', token);
  },

  getOrderInsights: async (token: string): Promise<OrderInsightsData> => {
    return callApi<OrderInsightsData>('/admin/orders/insights', token);
  },

  // Comprehensive Analytics API functions
  getSalesAnalytics: async (token: string, dateRangeDto?: { startDate?: string; endDate?: string }): Promise<SalesAnalyticsData> => {
    const queryParams = new URLSearchParams();
    if (dateRangeDto?.startDate) queryParams.append('startDate', dateRangeDto.startDate);
    if (dateRangeDto?.endDate) queryParams.append('endDate', dateRangeDto.endDate);
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return callApi<SalesAnalyticsData>(`/admin/analytics/sales${queryString}`, token);
  },

  getPopularItemsAnalytics: async (token: string, dateRangeDto?: { startDate?: string; endDate?: string }): Promise<PopularItemsAnalyticsData> => {
    const queryParams = new URLSearchParams();
    if (dateRangeDto?.startDate) queryParams.append('startDate', dateRangeDto.startDate);
    if (dateRangeDto?.endDate) queryParams.append('endDate', dateRangeDto.endDate);
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return callApi<PopularItemsAnalyticsData>(`/admin/analytics/popular-items${queryString}`, token);
  },
  
  getHourlySalesAnalytics: async (token: string, dateRangeDto?: { startDate?: string; endDate?: string }): Promise<HourlySalesAnalyticsData> => {
    const queryParams = new URLSearchParams();
    if (dateRangeDto?.startDate) queryParams.append('startDate', dateRangeDto.startDate);
    if (dateRangeDto?.endDate) queryParams.append('endDate', dateRangeDto.endDate);
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return callApi<HourlySalesAnalyticsData>(`/admin/analytics/hourly-sales${queryString}`, token);
  },

  getStaffAnalytics: async (token: string, dateRangeDto?: { startDate?: string; endDate?: string }): Promise<StaffAnalyticsData> => {
    const queryParams = new URLSearchParams();
    if (dateRangeDto?.startDate) queryParams.append('startDate', dateRangeDto.startDate);
    if (dateRangeDto?.endDate) queryParams.append('endDate', dateRangeDto.endDate);
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return callApi<StaffAnalyticsData>(`/admin/analytics/staff${queryString}`, token);
  },

  getStaffDetailedAnalytics: async (staffId: string, token: string, dateRangeDto?: { startDate?: string; endDate?: string }): Promise<any> => {
    const queryParams = new URLSearchParams();
    if (dateRangeDto?.startDate) queryParams.append('startDate', dateRangeDto.startDate);
    if (dateRangeDto?.endDate) queryParams.append('endDate', dateRangeDto.endDate);
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return callApi<any>(`/admin/analytics/staff/${staffId}/details${queryString}`, token);
  },

  getStaffAIReview: async (staffId: string, token: string, dateRangeDto?: { startDate?: string; endDate?: string }): Promise<any> => {
    const queryParams = new URLSearchParams();
    if (dateRangeDto?.startDate) queryParams.append('startDate', dateRangeDto.startDate);
    if (dateRangeDto?.endDate) queryParams.append('endDate', dateRangeDto.endDate);
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return callApi<any>(`/admin/analytics/staff/${staffId}/ai-review${queryString}`, token);
  },

  getTablesAnalytics: async (token: string, dateRangeDto?: { startDate?: string; endDate?: string }): Promise<TablesAnalyticsData> => {
    const queryParams = new URLSearchParams();
    if (dateRangeDto?.startDate) queryParams.append('startDate', dateRangeDto.startDate);
    if (dateRangeDto?.endDate) queryParams.append('endDate', dateRangeDto.endDate);
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return callApi<TablesAnalyticsData>(`/admin/analytics/tables${queryString}`, token);
  },

  getServiceAnalytics: async (token: string, dateRangeDto?: { startDate?: string; endDate?: string }): Promise<ServiceAnalysisData> => {
    const queryParams = new URLSearchParams();
    if (dateRangeDto?.startDate) queryParams.append('startDate', dateRangeDto.startDate);
    if (dateRangeDto?.endDate) queryParams.append('endDate', dateRangeDto.endDate);
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return callApi<ServiceAnalysisData>(`/admin/analytics/service-analysis${queryString}`, token);
  },

  getRequestsAnalytics: async (token: string, dateRangeDto?: { startDate?: string; endDate?: string }): Promise<RequestsAnalyticsData> => {
    const queryParams = new URLSearchParams();
    if (dateRangeDto?.startDate) queryParams.append('startDate', dateRangeDto.startDate);
    if (dateRangeDto?.endDate) queryParams.append('endDate', dateRangeDto.endDate);
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return callApi<RequestsAnalyticsData>(`/admin/analytics/requests${queryString}`, token);
  },

  getCustomerRatingsAnalytics: async (token: string, dateRangeDto?: { startDate?: string; endDate?: string }): Promise<CustomerRatingsAnalyticsData> => {
    const queryParams = new URLSearchParams();
    if (dateRangeDto?.startDate) queryParams.append('startDate', dateRangeDto.startDate);
    if (dateRangeDto?.endDate) queryParams.append('endDate', dateRangeDto.endDate);
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return callApi<CustomerRatingsAnalyticsData>(`/admin/analytics/customer-ratings${queryString}`, token);
  },

  processAnalyticsAiQuery: async (
    token: string,
    query: AiQueryRequest,
  ): Promise<AiAnalyticsQueryResponse> => {
    return callApi<AiAnalyticsQueryResponse>('/admin/analytics/ai/query', token, 'POST', query);
  },

  getMenuItems: async (
    token: string,
    filters: MenuFilters = {},
  ): Promise<MenuItemsResponse> => {
    const queryParams = new URLSearchParams();
    if (filters.category) queryParams.append('category', filters.category);
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.page) queryParams.append('page', String(filters.page));
    if (filters.pageSize) queryParams.append('pageSize', String(filters.pageSize));

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return callApi<MenuItemsResponse>(`/admin/menu${queryString}`, token);
  },

  
  getMenuCategories: async (token: string): Promise<string[]> => {
    return callApi<string[]>('/admin/menu/categories', token);
  },

  
  getMenuItemById: async (token: string, id: string): Promise<MenuItem> => {
    return callApi<MenuItem>(`/admin/menu/${id}`, token);
  },

  createMenuItem: async (
    token: string,
    data: CreateMenuItemDto,
  ): Promise<MenuItem> => {
    return callApi<MenuItem>('/admin/menu', token, 'POST', data);
  },

  updateMenuItem: async (
    token: string,
    id: string,
    data: UpdateMenuItemDto,
  ): Promise<MenuItem> => {
    return callApi<MenuItem>(`/admin/menu/${id}`, token, 'PUT', data);
  },

  
  deleteMenuItem: async (token: string, id: string): Promise<void> => {
    await callApi<void>(`/admin/menu/${id}`, token, 'DELETE');
  },

 
  bulkUploadMenuItems: async (
    token: string,
    items: any[],
  ): Promise<{ created: number; failed: number }> => {
    return callApi<{ created: number; failed: number }>(
      '/admin/menu/bulk-upload-json',
      token,
      'POST',
      { items },
    );
  },

  // OTP Authentication Methods
  generateOTP: async (
    emailOrPhone: string,
    userType: 'admin' | 'waiter' | 'manager'
  ): Promise<OTPGenerationResponse> => {
    return callPublicApi<OTPGenerationResponse>('/auth/otp/generate', 'POST', {
      emailOrPhone,
      userType,
    });
  },

  verifyOTP: async (
    username: string,
    otp: string,
    userType: 'admin' | 'waiter' | 'manager'
  ): Promise<OTPVerificationResponse> => {
    return callPublicApi<OTPVerificationResponse>('/auth/otp/verify', 'POST', {
      username,
      otp,
      userType,
    });
  },

  // Tenant OTP Authentication Methods
  generateTenantOTP: async (emailOrPhone: string): Promise<{ message: string; email: string }> => {
    return callPublicApi<{ message: string; email: string }>('/auth/tenant/generate-otp', 'POST', {
      emailOrPhone,
    });
  },

  verifyTenantOTP: async (
    emailOrPhone: string,
    otp: string
  ): Promise<{ tenant: any; token: string }> => {
    return callPublicApi<{ tenant: any; token: string }>('/auth/tenant/verify-otp', 'POST', {
      emailOrPhone,
      otp,
    });
  },

  // Staff Performance Analytics with LLM insights
  getStaffPerformanceAnalytics: async (
    token: string,
    params?: {
      startDate?: string;
      endDate?: string;
      waiter?: string;
      sort?: string;
    }
  ): Promise<StaffPerformanceAnalytics> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.waiter && params.waiter !== 'all') queryParams.append('waiter', params.waiter);
    if (params?.sort) queryParams.append('sort', params.sort);
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return callApi<StaffPerformanceAnalytics>(`/admin/analytics/staff-performance${queryString}`, token);
  },

  // Executive Summary Analytics with LLM insights
  getExecutiveSummaryAnalytics: async (
    token: string,
    params?: {
      startDate?: string;
      endDate?: string;
    }
  ): Promise<any> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return callApi<any>(`/admin/analytics/executive-summary${queryString}`, token);
  },

  // Restaurant Management Functions
  updateRestaurant: async (token: string, id: string, data: Partial<Restaurant>): Promise<Restaurant> => {
    return callApi<Restaurant>(`/restaurants/${id}`, token, 'PUT', data);
  },

  activateRestaurant: async (token: string, restaurantId: string, months: number): Promise<any> => {
    return callApi<any>(`/restaurants/${restaurantId}/activate`, token, 'POST', { months });
  },

  getRestaurantSubscription: async (token: string, restaurantId: string): Promise<RestaurantSubscription | null> => {
    return callApi<RestaurantSubscription | null>(`/restaurants/${restaurantId}/subscription`, token);
  },

  getExpiringSoonRestaurants: async (token: string): Promise<Restaurant[]> => {
    return callApi<Restaurant[]>('/restaurants/expiring/soon', token);
  },
};

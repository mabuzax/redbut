import { UserType } from '@prisma/client';

export interface RestaurantMetrics {
  totalTables: number;
  occupiedTables: number;
  totalRequests: number;
  openRequests: number;
  averageResponseTime: number; 
  dailyRevenue: number;
}


export const STAFF_POSITIONS = ['Waiter', 'Chef', 'Manager', 'Supervisor'] as const;
export type StaffPosition = typeof STAFF_POSITIONS[number];


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
  createdAt: string; 
  updatedAt: string; 
  accessAccount?: {
    username: string; 
    userType: UserType; 
  } | null;
  averageRating?: number;
  requestsHandled?: number;
}


export interface CreateStaffMemberDto {
  name: string;
  surname: string;
  email: string; 
  tag_nickname: string;
  position: StaffPosition;
  address?: string;
  phone?: string; 
  propic?: string;
  password?: string; 
}


export interface UpdateStaffMemberDto {
  name?: string;
  surname?: string;
  tag_nickname?: string;
  position?: StaffPosition;
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


export interface Shift {
  id: string;
  date: string; 
  startTime: string; 
  endTime: string; 
  createdAt: string; 
  updatedAt: string; 
}

export interface CreateShiftDto {
  startTime: string; 
  endTime: string; 
}

export interface UpdateShiftDto {
  startTime?: string; 
  endTime?: string; 
}

export type AiShiftsQueryResponse =
  | string
  | Shift
  | Shift[]
  | { message: string }
  | string[];

// Table Allocations Section
export interface ShiftForDropdown {
  id: string;
  displayLabel: string; // e.g., "2025-06-01 (9AM to 5PM)"
}

export interface WaiterForDropdown {
  id: string;
  displayLabel: string; // e.g., "John Doe (JohnnyD)"
}

export interface TableAllocation {
  id: string;
  shiftId: string;
  tableNumbers: number[];
  waiterId: string;
  createdAt: string; 
  updatedAt: string; 
}

export interface ShiftInfoForAllocation {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
}
  
export interface WaiterInfoForAllocation {
  id: string;
  name: string;
  surname: string;
  tag_nickname: string;
}

export interface TableAllocationWithDetails extends TableAllocation {
  shift?: ShiftInfoForAllocation | null;
  waiter?: WaiterInfoForAllocation | null;
}

export interface CreateTableAllocationDto {
  shiftId: string;
  tableNumbers: number[];
  waiterId: string;
}

export interface UpdateTableAllocationDto {
  shiftId?: string;
  tableNumbers?: number[];
  waiterId?: string;
}

export type AiTableAllocationsQueryResponse =
  | string
  | TableAllocationWithDetails
  | TableAllocationWithDetails[]
  | { message: string }
  | string[];

// Orders Analytics Section
export interface CurrentShiftOrdersDataPoint {
  timeLabel: string; // e.g., "09:00", "10:00"
  newOrders: number;
  inProgressOrders: number;
  completedOrders: number;
}

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

// 3. Shifts Analytics
export interface ShiftSalesDataPoint extends NameValuePair {}
export interface ShiftAverageOrderValueDataPoint extends NameValuePair {}
export interface ShiftPerformanceDetail {
  shiftId: string;
  shiftLabel: string; 
  date: string; 
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  totalRequestsHandled?: number; 
  averageRequestResponseTime?: number; 
}
export interface ShiftsAnalyticsData {
  salesByShift: ShiftSalesDataPoint[];
  averageOrderValueByShift: ShiftAverageOrderValueDataPoint[];
  shiftPerformanceDetails: ShiftPerformanceDetail[];
}

// 4. Hourly Sales Analytics
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
  shiftsWorked: number;
  totalHoursWorked: number;
  averageRating?: number; 
  requestsHandled?: number; 
}
export interface StaffAnalyticsData {
  salesPerformance: StaffSalesPerformance[];
  orderCounts: StaffOrderCount[]; 
  performanceDetails: StaffPerformanceDetail[]; 
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
}
export interface WaiterRatingsBreakdown {
    waiterId: string;
    waiterName: string;
    averageFriendliness: number;
    averageOrderAccuracy: number;
    averageSpeed: number;
    averageAttentiveness: number;
    averageKnowledge: number;
    totalRatings: number;
}
export interface WaiterRatingsAnalyticsData {
  averageRatingsPerWaiter: WaiterAverageRating[];
  overallRatingDistribution: RatingDistributionDataPoint[]; 
  ratingsTrend: RatingsOverTimeDataPoint[];
  recentComments: RecentComment[];
  ratingsBreakdownPerWaiter: WaiterRatingsBreakdown[];
}

// 8. Requests Analytics
export interface RequestsSummaryMetrics {
  totalRequests: number;
  averageResponseTimeMinutes: number; 
  completionRatePercentage: number; 
  openRequests: number;
}
export interface RequestStatusDistribution extends NameValuePair {}
export interface RequestsOverTimeDataPoint {
  time: string; 
  newRequests: number;
  resolvedRequests: number; 
}
export interface WaiterResponseTimeDataPoint extends NameValuePair {
    waiterId: string;
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
export interface CustomerRatingsAnalyticsData {
  overallRestaurantRating: OverallRestaurantRating;
  satisfactionTrend: CustomerSatisfactionTrendDataPoint[];
  topFeedbackThemes: FeedbackTheme[]; 
}

export type AiAnalyticsQueryResponse = 
  | string 
  | SalesAnalyticsData
  | PopularItemsAnalyticsData
  | ShiftsAnalyticsData
  | HourlySalesAnalyticsData
  | StaffAnalyticsData
  | TablesAnalyticsData
  | WaiterRatingsAnalyticsData
  | RequestsAnalyticsData
  | CustomerRatingsAnalyticsData
  | { message: string } 
  | any; // For potentially mixed or custom AI responses


const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';


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

  const rawText = await response.clone().text();
  console.log('API responded with:', rawText);

  if (!response.ok) {
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


  getAllStaffMembers: async (token: string): Promise<StaffMember[]> => {
    return callApi<StaffMember[]>('/admin/staff', token);
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

  getAllShifts: async (token: string): Promise<Shift[]> => {
    return callApi<Shift[]>('/admin/shifts', token);
  },

  getShiftById: async (token: string, id: string): Promise<Shift> => {
    return callApi<Shift>(`/admin/shifts/${id}`, token);
  },

  createShift: async (
    token: string,
    data: CreateShiftDto,
  ): Promise<Shift> => {
    return callApi<Shift>('/admin/shifts', token, 'POST', data);
  },

  updateShift: async (
    token: string,
    id: string,
    data: UpdateShiftDto,
  ): Promise<Shift> => {
    return callApi<Shift>(`/admin/shifts/${id}`, token, 'PUT', data);
  },

  deleteShift: async (token: string, id: string): Promise<void> => {
    await callApi<void>(`/admin/shifts/${id}`, token, 'DELETE');
  },

  processShiftsAiQuery: async (
    token: string,
    query: AiQueryRequest,
  ): Promise<AiShiftsQueryResponse> => {
    return callApi<AiShiftsQueryResponse>('/admin/shifts/ai/query', token, 'POST', query);
  },

  // Table Allocations API functions
  getAllTableAllocations: async (token: string): Promise<TableAllocationWithDetails[]> => {
    return callApi<TableAllocationWithDetails[]>('/admin/table-allocations', token);
  },

  getTableAllocationById: async (token: string, id: string): Promise<TableAllocationWithDetails> => {
    return callApi<TableAllocationWithDetails>(`/admin/table-allocations/${id}`, token);
  },

  createTableAllocation: async (
    token: string,
    data: CreateTableAllocationDto,
  ): Promise<TableAllocationWithDetails> => {
    return callApi<TableAllocationWithDetails>('/admin/table-allocations', token, 'POST', data);
  },

  updateTableAllocation: async (
    token: string,
    id: string,
    data: UpdateTableAllocationDto,
  ): Promise<TableAllocationWithDetails> => {
    return callApi<TableAllocationWithDetails>(`/admin/table-allocations/${id}`, token, 'PUT', data);
  },

  deleteTableAllocation: async (token: string, id: string): Promise<void> => {
    await callApi<void>(`/admin/table-allocations/${id}`, token, 'DELETE');
  },

  processTableAllocationsAiQuery: async (
    token: string,
    query: AiQueryRequest,
  ): Promise<AiTableAllocationsQueryResponse> => {
    return callApi<AiTableAllocationsQueryResponse>('/admin/table-allocations/ai/query', token, 'POST', query);
  },

  // Orders Analytics API functions
  getCurrentShiftOrdersByStatus: async (token: string): Promise<CurrentShiftOrdersDataPoint[]> => {
    return callApi<CurrentShiftOrdersDataPoint[]>('/admin/orders/current-shift-status', token);
  },

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
  
  getShiftsAnalytics: async (token: string, dateRangeDto?: { startDate?: string; endDate?: string }): Promise<ShiftsAnalyticsData> => {
    const queryParams = new URLSearchParams();
    if (dateRangeDto?.startDate) queryParams.append('startDate', dateRangeDto.startDate);
    if (dateRangeDto?.endDate) queryParams.append('endDate', dateRangeDto.endDate);
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return callApi<ShiftsAnalyticsData>(`/admin/analytics/shifts${queryString}`, token);
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

  getTablesAnalytics: async (token: string, dateRangeDto?: { startDate?: string; endDate?: string }): Promise<TablesAnalyticsData> => {
    const queryParams = new URLSearchParams();
    if (dateRangeDto?.startDate) queryParams.append('startDate', dateRangeDto.startDate);
    if (dateRangeDto?.endDate) queryParams.append('endDate', dateRangeDto.endDate);
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return callApi<TablesAnalyticsData>(`/admin/analytics/tables${queryString}`, token);
  },

  getWaiterRatingsAnalytics: async (token: string, dateRangeDto?: { startDate?: string; endDate?: string }): Promise<WaiterRatingsAnalyticsData> => {
    const queryParams = new URLSearchParams();
    if (dateRangeDto?.startDate) queryParams.append('startDate', dateRangeDto.startDate);
    if (dateRangeDto?.endDate) queryParams.append('endDate', dateRangeDto.endDate);
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return callApi<WaiterRatingsAnalyticsData>(`/admin/analytics/waiter-ratings${queryString}`, token);
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
};

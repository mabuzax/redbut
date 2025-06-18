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


export const SHIFT_TYPES = ['Morning', 'Afternoon', 'Evening', 'Night'] as const;
export type ShiftType = typeof SHIFT_TYPES[number];

export const SHIFT_STATUSES = ['Scheduled', 'Active', 'Completed', 'Cancelled'] as const;
export type ShiftStatus = typeof SHIFT_STATUSES[number];

export interface MinimalStaffInfo {
  id: string;
  name: string;
  surname: string;
  tag_nickname: string;
  position?: string;
}

export interface ShiftWithStaffInfo {
  id: string;
  staffId: string;
  startTime: string; 
  endTime: string; 
  type: ShiftType;
  status: ShiftStatus;
  notes?: string | null;
  createdAt: string; 
  updatedAt: string; 
  staffMember?: MinimalStaffInfo | null;
}

export interface CreateShiftDto {
  staffId: string;
  startTime: string; 
  endTime: string; 
  type: ShiftType;
  status?: ShiftStatus;
  notes?: string;
}

export interface UpdateShiftDto {
  startTime?: string; 
  endTime?: string; 
  type?: ShiftType;
  status?: ShiftStatus;
  notes?: string;
}

export type AiShiftsQueryResponse =
  | string
  | ShiftWithStaffInfo
  | ShiftWithStaffInfo[]
  | { message: string }
  | string[];


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

  getAllShifts: async (token: string): Promise<ShiftWithStaffInfo[]> => {
    return callApi<ShiftWithStaffInfo[]>('/admin/shifts', token);
  },

  getShiftById: async (token: string, id: string): Promise<ShiftWithStaffInfo> => {
    return callApi<ShiftWithStaffInfo>(`/admin/shifts/${id}`, token);
  },

  createShift: async (
    token: string,
    data: CreateShiftDto,
  ): Promise<ShiftWithStaffInfo> => {
    return callApi<ShiftWithStaffInfo>('/admin/shifts', token, 'POST', data);
  },

  updateShift: async (
    token: string,
    id: string,
    data: UpdateShiftDto,
  ): Promise<ShiftWithStaffInfo> => {
    return callApi<ShiftWithStaffInfo>(`/admin/shifts/${id}`, token, 'PUT', data);
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

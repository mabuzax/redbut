/* eslint-disable @typescript-eslint/no-explicit-any */

// General Utility Types
export interface DateRange {
  startDate: string; // ISO Date string
  endDate: string;   // ISO Date string
}

export interface DataPoint<X = string | number | Date, Y = number> {
  x: X;
  y: Y;
  [key: string]: any; // For additional properties like series name, color, etc.
}

export interface NameValuePair {
  name: string;
  value: number;
  [key: string]: any; // For additional properties like fill color
}

export interface TimeValuePair {
  time: string; // Could be date string, hour string, etc.
  value: number;
  [key: string]: any;
}

export interface MetricCardValue {
  value: string | number;
  label: string;
  trend?: string; // e.g., "+5% vs last period"
  trendDirection?: 'up' | 'down' | 'neutral';
}

// 1. Sales Analytics
export interface SalesSummaryMetrics {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
}

export interface SalesTrendDataPoint {
  date: string; // ISO Date string
  sales: number;
  orders: number;
}

export interface SalesAnalyticsData {
  summary: SalesSummaryMetrics;
  salesTrend: SalesTrendDataPoint[];
  // Potentially other sales-related metrics like salesByPaymentMethod, etc.
}

// 2. Popular Items Analytics
export interface PopularItem {
  itemId: string;
  itemName: string;
  quantitySold: number;
  totalRevenue: number;
  percentageOfTotalRevenue?: number;
}

export interface RevenueByItemDataPoint extends NameValuePair {
  // name: itemName, value: revenue
}

export interface PopularItemsAnalyticsData {
  topSellingItems: PopularItem[];
  revenueByItem: RevenueByItemDataPoint[];
  // Potentially itemsFrequentlySoldTogether, etc.
}

// 3. Shifts Analytics
export interface ShiftSalesDataPoint extends NameValuePair {
  // name: shiftLabel (e.g., "Morning Shift - 2024-06-18"), value: totalSales
}

export interface ShiftAverageOrderValueDataPoint extends NameValuePair {
  // name: shiftLabel, value: averageOrderValue
}

export interface ShiftPerformanceDetail {
  shiftId: string;
  shiftLabel: string; // e.g., "Morning (08:00-16:00)"
  date: string; // ISO Date string
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  totalRequestsHandled?: number; // If applicable during this shift
  averageRequestResponseTime?: number; // In minutes, if applicable
  // Could also include labor cost for this shift vs sales (profitability)
}

export interface ShiftsAnalyticsData {
  salesByShift: ShiftSalesDataPoint[];
  averageOrderValueByShift: ShiftAverageOrderValueDataPoint[];
  shiftPerformanceDetails: ShiftPerformanceDetail[];
}

// 4. Hourly Sales Analytics
export interface HourlySalesDataPoint {
  hour: string; // e.g., "09:00", "14:00"
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

// 5. Staff Analytics (Waiters, Chefs, etc.)
export interface StaffSalesPerformance {
  staffId: string;
  staffName: string; // "Name Surname (TagName)"
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  itemsSold?: number;
}

export interface StaffOrderCount extends NameValuePair {
  // name: staffName, value: orderCount
}

export interface StaffPerformanceDetail {
  staffId: string;
  staffName: string;
  position: string;
  shiftsWorked: number;
  totalHoursWorked: number;
  averageRating?: number; // From WaiterRatings
  requestsHandled?: number; // From Requests
  // Could include efficiency metrics: orders_per_hour, sales_per_hour
}

export interface StaffAnalyticsData {
  salesPerformance: StaffSalesPerformance[];
  orderCounts: StaffOrderCount[]; // Could be a bar chart
  performanceDetails: StaffPerformanceDetail[]; // For a detailed table
}

// 6. Tables Analytics
export interface TableUtilizationDataPoint {
  tableNumber: number;
  totalOrders: number;
  totalRevenue: number;
  averageTurnaroundTimeMinutes?: number; // Time from seating to payment
  occupancyPercentage?: number; // % of time occupied during open hours
}

export interface RevenueByTableDataPoint extends NameValuePair {
  // name: `Table ${tableNumber}`, value: revenue
}

export interface TablesAnalyticsData {
  utilization: TableUtilizationDataPoint[]; // For a table or heatmap
  revenueByTable: RevenueByTableDataPoint[]; // For a bar chart
  mostPopularTables?: NameValuePair[]; // Tables with most orders/revenue
}

// 7. Waiter Ratings Analytics
export interface WaiterAverageRating extends NameValuePair {
  // name: waiterName, value: averageRating
  waiterId: string;
  totalRatings: number;
}

export interface RatingDistributionDataPoint extends NameValuePair {
  // name: rating (e.g., "5 Stars"), value: count or percentage
}

export interface RatingsOverTimeDataPoint {
  date: string; // ISO Date string
  averageRating: number;
}

export interface RecentComment {
  commentId: string;
  waiterId: string;
  waiterName: string;
  rating: number;
  commentText: string;
  commentDate: string; // ISO Date string
  tableName?: string; // e.g. "Table 5"
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
  overallRatingDistribution: RatingDistributionDataPoint[]; // e.g., 1-star, 2-star counts
  ratingsTrend: RatingsOverTimeDataPoint[];
  recentComments: RecentComment[];
  ratingsBreakdownPerWaiter: WaiterRatingsBreakdown[];
}

// 8. Requests Analytics
export interface RequestsSummaryMetrics {
  totalRequests: number;
  averageResponseTimeMinutes: number; // Time from request creation to Acknowledged/InProgress
  completionRatePercentage: number; // (Completed + Done) / Total
  openRequests: number;
}

export interface RequestStatusDistribution extends NameValuePair {
  // name: status (e.g., "New", "Completed"), value: count or percentage
}

export interface RequestsOverTimeDataPoint {
  time: string; // Could be date or hour
  newRequests: number;
  resolvedRequests: number; // Completed or Done
}

export interface WaiterResponseTimeDataPoint extends NameValuePair {
    // name: waiterName, value: averageResponseTimeMinutes
    waiterId: string;
}

export interface RequestsAnalyticsData {
  summaryMetrics: RequestsSummaryMetrics;
  statusDistribution: RequestStatusDistribution[];
  requestsOverTime: RequestsOverTimeDataPoint[]; // Line chart
  waiterResponseTimes: WaiterResponseTimeDataPoint[]; // Bar chart or table
  waiterRequestPerformance: StaffAnalyticsData['performanceDetails']; // Re-use staff performance details for request handling
}

// 9. Customer Ratings Analytics (Overall Restaurant Feedback)
export interface OverallRestaurantRating {
  averageOverallRating: number; // e.g., from a general feedback form
  totalReviews: number;
}

export interface CustomerSatisfactionTrendDataPoint {
  date: string; // ISO Date string
  satisfactionScore: number; // e.g., NPS or average rating
}

export interface FeedbackTheme extends NameValuePair {
  // name: theme (e.g., "Food Quality", "Ambiance"), value: count
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface CustomerRatingsAnalyticsData {
  overallRestaurantRating: OverallRestaurantRating;
  satisfactionTrend: CustomerSatisfactionTrendDataPoint[];
  topFeedbackThemes: FeedbackTheme[]; // e.g., common praises or complaints
}

// Master Analytics Data Structure (Optional, or handle tabs individually)
export interface FullAnalyticsDashboardData {
  dateRange: DateRange;
  sales: SalesAnalyticsData;
  popularItems: PopularItemsAnalyticsData;
  shifts: ShiftsAnalyticsData;
  hourlySales: HourlySalesAnalyticsData;
  staff: StaffAnalyticsData;
  tables: TablesAnalyticsData;
  waiterRatings: WaiterRatingsAnalyticsData;
  requests: RequestsAnalyticsData;
  customerRatings?: CustomerRatingsAnalyticsData; // Optional if not fully implemented
}

// For API request payloads if filtering is needed
export interface AnalyticsRequestFilters {
  dateRange?: DateRange;
  shiftId?: string;
  staffId?: string;
  tableNumber?: number;
  // Add other relevant filters
}

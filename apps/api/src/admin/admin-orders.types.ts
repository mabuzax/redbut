export interface CurrentShiftOrdersDataPoint {
  timeLabel: string;
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

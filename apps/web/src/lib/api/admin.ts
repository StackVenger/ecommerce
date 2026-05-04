import { apiClient } from './client';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  revenueGrowth: number;
  ordersGrowth: number;
  customersGrowth: number;
  productsGrowth: number;
  pendingOrders: number;
  processingOrders: number;
  lowStockProducts: number;
}

export interface ChartDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  id: string;
  name: string;
  totalSold: number;
  revenue: number;
}

export interface CategoryRevenue {
  category: string;
  revenue: number;
  percentage: number;
}

export interface ChartsData {
  revenueOverTime: ChartDataPoint[];
  topProducts: TopProduct[];
  revenueByCategory: CategoryRevenue[];
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  itemCount: number;
}

export interface RecentRegistration {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface LowStockAlert {
  id: string;
  name: string;
  sku: string;
  stock: number;
  lowStockThreshold: number;
  image: string | null;
}

export interface ActivityData {
  recentOrders: RecentOrder[];
  recentRegistrations: RecentRegistration[];
  lowStockAlerts: LowStockAlert[];
}

// ──────────────────────────────────────────────────────────
// Dashboard API
// ──────────────────────────────────────────────────────────

export interface DashboardQueryParams {
  startDate?: string;
  endDate?: string;
}

/**
 * Fetch admin dashboard statistics for the given date range.
 * Defaults to the last 30 days when no range is supplied.
 * All monetary values are in BDT (৳).
 */
export async function fetchDashboardStats(params?: DashboardQueryParams): Promise<DashboardStats> {
  const { data } = await apiClient.get('/admin/dashboard/stats', { params });
  return data.data ?? data;
}

/**
 * Fetch chart data for the admin dashboard for the given date range.
 */
export async function fetchDashboardCharts(params?: DashboardQueryParams): Promise<ChartsData> {
  const { data } = await apiClient.get('/admin/dashboard/charts', { params });
  return data.data ?? data;
}

/**
 * Fetch recent activity data for the admin dashboard.
 */
export async function fetchDashboardActivity(): Promise<ActivityData> {
  const { data } = await apiClient.get('/admin/dashboard/activity');
  return data.data ?? data;
}

// ──────────────────────────────────────────────────────────
// Analytics Types
// ──────────────────────────────────────────────────────────

export interface AnalyticsQueryParams {
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export interface MostViewedProduct {
  productId: string;
  name: string;
  image: string | null;
  viewCount: number;
}

export interface MostSearchedTerm {
  term: string;
  searchCount: number;
}

export interface MostOrderedProduct {
  productId: string;
  name: string;
  image: string | null;
  totalQuantity: number;
  totalRevenue: number;
}

export interface MostCartedProduct {
  productId: string;
  name: string;
  image: string | null;
  cartAddCount: number;
}

export interface MostWishlistedProduct {
  productId: string;
  name: string;
  image: string | null;
  wishlistCount: number;
}

export interface ConversionFunnel {
  totalViews: number;
  totalCartAdds: number;
  totalOrders: number;
  viewToCartRate: number;
  cartToOrderRate: number;
  overallConversionRate: number;
}

export interface AnalyticsOverview {
  mostViewed: MostViewedProduct[];
  mostSearched: MostSearchedTerm[];
  mostOrdered: MostOrderedProduct[];
  mostCarted: MostCartedProduct[];
  mostWishlisted: MostWishlistedProduct[];
  funnel: ConversionFunnel;
}

// ──────────────────────────────────────────────────────────
// Analytics API
// ──────────────────────────────────────────────────────────

export async function fetchAnalyticsOverview(
  params?: AnalyticsQueryParams,
): Promise<AnalyticsOverview> {
  const { data } = await apiClient.get('/admin/analytics/overview', { params });
  return data.data ?? data;
}

export async function fetchMostViewed(params?: AnalyticsQueryParams): Promise<MostViewedProduct[]> {
  const { data } = await apiClient.get('/admin/analytics/most-viewed', { params });
  return data.data ?? data;
}

export async function fetchMostSearched(
  params?: AnalyticsQueryParams,
): Promise<MostSearchedTerm[]> {
  const { data } = await apiClient.get('/admin/analytics/most-searched', { params });
  return data.data ?? data;
}

export async function fetchMostOrdered(
  params?: AnalyticsQueryParams,
): Promise<MostOrderedProduct[]> {
  const { data } = await apiClient.get('/admin/analytics/most-ordered', { params });
  return data.data ?? data;
}

export async function fetchMostCarted(params?: AnalyticsQueryParams): Promise<MostCartedProduct[]> {
  const { data } = await apiClient.get('/admin/analytics/most-carted', { params });
  return data.data ?? data;
}

export async function fetchMostWishlisted(
  params?: AnalyticsQueryParams,
): Promise<MostWishlistedProduct[]> {
  const { data } = await apiClient.get('/admin/analytics/most-wishlisted', { params });
  return data.data ?? data;
}

export async function fetchConversionFunnel(
  params?: AnalyticsQueryParams,
): Promise<ConversionFunnel> {
  const { data } = await apiClient.get('/admin/analytics/funnel', { params });
  return data.data ?? data;
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

/**
 * Format a number as BDT currency.
 *
 * @example formatBDT(15000) → "৳15,000"
 */
export function formatBDT(amount: number): string {
  return `৳${amount.toLocaleString('en-BD')}`;
}

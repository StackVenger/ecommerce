import { apiClient } from './client';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

export interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  price: number;
  image: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  subtotal: number;
  shippingCost: number;
  total: number;
  totalFormatted: string;
  itemCount: number;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface OrderStats {
  totalOrders: number;
  totalSpent: number;
  totalSpentFormatted: string;
  pending: number;
  confirmed: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
}

// ──────────────────────────────────────────────────────────
// API Functions
// ──────────────────────────────────────────────────────────

export async function getOrderHistory(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<{ orders: Order[]; pagination: OrderPagination }> {
  const searchParams = new URLSearchParams();

  if (params?.page) {
    searchParams.set('page', params.page.toString());
  }
  if (params?.limit) {
    searchParams.set('limit', params.limit.toString());
  }
  if (params?.status) {
    searchParams.set('status', params.status);
  }

  const response = await apiClient.get<{
    success: boolean;
    data: Order[];
    pagination: OrderPagination;
  }>(`/users/orders?${searchParams.toString()}`);

  return {
    orders: response.data.data,
    pagination: response.data.pagination,
  };
}

export async function getOrderStats(): Promise<OrderStats> {
  const response = await apiClient.get<{
    success: boolean;
    data: OrderStats;
  }>('/users/orders/stats');

  return response.data.data;
}

/**
 * Format BDT amount with ৳ symbol.
 */
export function formatOrderAmount(amount: number): string {
  return `৳${amount.toLocaleString('en-BD')}`;
}

/**
 * Get a human-readable status label.
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    PROCESSING: 'Processing',
    SHIPPED: 'Shipped',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
  };

  return labels[status] || status;
}

// ──────────────────────────────────────────────────────────
// Single Order Detail
// ──────────────────────────────────────────────────────────

export interface OrderDetailItem {
  id: string;
  productName: string;
  productSlug: string;
  productImage: string | null;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  division: string;
  district: string;
  area: string | null;
  postalCode: string;
}

export interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  couponCode: string | null;
  notes: string | null;
  cancellationReason: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  shippingAddress: OrderShippingAddress;
  payments: Array<{ method: string; status: string }>;
  items: OrderDetailItem[];
}

/**
 * Get a single order by order number (authenticated user).
 */
export async function getOrderByNumber(orderNumber: string): Promise<OrderDetail> {
  const response = await apiClient.get<OrderDetail>(`/orders/${encodeURIComponent(orderNumber)}`);
  return response.data;
}

/**
 * Cancel an order (customer-initiated).
 */
export async function cancelOrder(orderId: string, reason?: string): Promise<OrderDetail> {
  const response = await apiClient.post<OrderDetail>(`/orders/${orderId}/cancel`, { reason });
  return response.data;
}

// ──────────────────────────────────────────────────────────
// Checkout / Place Order
// ──────────────────────────────────────────────────────────

export interface PlaceOrderPayload {
  addressId?: string;
  shippingMethodId: string;
  paymentMethod: 'CARD' | 'COD' | 'BKASH';
  couponCode?: string;
  // Guest contact
  guestFullName?: string;
  guestEmail?: string;
  guestPhone?: string;
  // Inline shipping address (guests)
  shippingFullName?: string;
  shippingPhone?: string;
  shippingAddressLine1?: string;
  shippingAddressLine2?: string;
  shippingDivision?: string;
  shippingDistrict?: string;
  shippingArea?: string;
  shippingPostalCode?: string;
}

export interface PlaceOrderResult {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  paymentMethod: string;
}

/**
 * Place a new order (authenticated or guest).
 */
export async function placeOrder(
  payload: PlaceOrderPayload,
  sessionId?: string,
): Promise<PlaceOrderResult> {
  const headers: Record<string, string> = {};
  if (sessionId) {
    headers['X-Session-Id'] = sessionId;
  }

  const response = await apiClient.post<{
    success: boolean;
    data: PlaceOrderResult;
  }>('/orders', payload, { headers });

  return response.data.data;
}

/**
 * Validate checkout data before placing an order.
 */
export async function validateCheckout(
  payload: PlaceOrderPayload,
  sessionId?: string,
): Promise<{ valid: boolean; errors?: string[]; warnings?: string[] }> {
  const headers: Record<string, string> = {};
  if (sessionId) {
    headers['X-Session-Id'] = sessionId;
  }

  const response = await apiClient.post<{
    success: boolean;
    data: { valid: boolean; errors?: string[]; warnings?: string[] };
  }>('/checkout/validate', payload, { headers });

  return response.data.data;
}

/**
 * Look up a guest order by order number and email.
 */
export async function trackGuestOrder(orderNumber: string, email: string): Promise<Order> {
  const response = await apiClient.get<{
    success: boolean;
    data: Order;
  }>(
    `/orders/guest?orderNumber=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(email)}`,
  );

  return response.data.data;
}

// ──────────────────────────────────────────────────────────
// Shipping
// ──────────────────────────────────────────────────────────

export interface ShippingMethod {
  id: string;
  name: string;
  zone: 'INSIDE_DHAKA' | 'OUTSIDE_DHAKA';
  /** Rate-card cost before any free-shipping discount. */
  baseCost: number;
  /** Effective cost the customer pays (0 when isFree). */
  cost: number;
  estimatedDays: string;
  freeAbove: number;
  isFree: boolean;
}

export interface ShippingCalculation {
  zone: 'INSIDE_DHAKA' | 'OUTSIDE_DHAKA';
  methods: ShippingMethod[];
  subtotal: number;
  qualifiesForFreeShipping: boolean;
  freeShippingThreshold: number;
}

/**
 * Calculate shipping options for a saved address or by division.
 * Passing `subtotal` lets the API apply the admin free-shipping
 * threshold against the same number the cart sidebar displays.
 */
export async function calculateShipping(params: {
  addressId?: string;
  division?: string;
  subtotal?: number;
}): Promise<ShippingCalculation> {
  const searchParams = new URLSearchParams();
  if (params.addressId) {
    searchParams.set('addressId', params.addressId);
  }
  if (params.division) {
    searchParams.set('division', params.division);
  }
  if (params.subtotal !== undefined && Number.isFinite(params.subtotal)) {
    searchParams.set('subtotal', String(params.subtotal));
  }

  const response = await apiClient.get<{
    success: boolean;
    data: ShippingCalculation;
  }>(`/shipping/calculate?${searchParams.toString()}`);

  return response.data.data;
}

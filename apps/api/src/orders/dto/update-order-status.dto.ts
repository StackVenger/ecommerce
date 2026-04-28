import { IsNotEmpty, IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';

/**
 * Valid order statuses and their allowed transitions.
 *
 * PENDING     → CONFIRMED, CANCELLED
 * CONFIRMED   → PROCESSING, CANCELLED
 * PROCESSING  → SHIPPED, CANCELLED
 * SHIPPED     → DELIVERED
 * DELIVERED   → (terminal state)
 * CANCELLED   → (terminal state)
 * REFUNDED    → (terminal state)
 */
export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

/**
 * Map of allowed status transitions.
 * Each key is a current status, and its value is the array of statuses
 * it can transition to.
 */
export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUNDED]: [],
};

/**
 * DTO for updating an order's status.
 *
 * PATCH /admin/orders/:id/status
 */
export class UpdateOrderStatusDto {
  /** The new order status */
  @IsEnum(OrderStatus, {
    message: `status must be one of: ${Object.values(OrderStatus).join(', ')}`,
  })
  @IsNotEmpty()
  status: OrderStatus;

  /** Optional note about why the status was changed */
  @IsString()
  @IsOptional()
  note?: string;

  /** When true, send the customer an email notifying them of the new status. */
  @IsBoolean()
  @IsOptional()
  notifyCustomer?: boolean;
}

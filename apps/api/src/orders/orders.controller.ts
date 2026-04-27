import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  Header,
  Res,
  StreamableFile,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { Response } from 'express';

import { CheckoutDto } from './dto/checkout.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { InvoiceService } from './invoice.service';
import { OrdersService } from './orders.service';
import { ShippingService } from './shipping.service';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

/**
 * Orders controller.
 *
 * Handles order creation, retrieval, status management, and cancellation.
 * Checkout and order creation support both authenticated and guest users.
 * Admin endpoints require ADMIN role.
 */
@Controller()
@UseGuards(OptionalAuthGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly shippingService: ShippingService,
    private readonly invoiceService: InvoiceService,
  ) {}

  // ─── Checkout ─────────────────────────────────────────────────────────────────

  /**
   * Validate checkout data before placing an order.
   * Supports both authenticated users and guests (via X-Session-Id header).
   *
   * POST /checkout/validate
   */
  @Post('checkout/validate')
  async validateCheckout(
    @Body() dto: CheckoutDto,
    @CurrentUser() user: AuthenticatedUser | null,
    @Headers('x-session-id') sessionId?: string,
  ) {
    return this.ordersService.validateCheckout(dto, user?.id, sessionId);
  }

  // ─── Order Creation ───────────────────────────────────────────────────────────

  /**
   * Create a new order from the user's or guest's cart.
   *
   * POST /orders
   */
  @Post('orders')
  async createOrder(
    @Body() dto: CheckoutDto,
    @CurrentUser() user: AuthenticatedUser | null,
    @Headers('x-session-id') sessionId?: string,
  ) {
    const order = await this.ordersService.createOrder(dto, user?.id, sessionId);
    return {
      success: true,
      data: order,
    };
  }

  // ─── Guest Order Lookup ─────────────────────────────────────────────────────

  /**
   * Look up a guest order by order number + email.
   *
   * GET /orders/guest?orderNumber=X&email=Y
   */
  @Get('orders/guest')
  async findGuestOrder(@Query('orderNumber') orderNumber: string, @Query('email') email: string) {
    return this.ordersService.findGuestOrder(orderNumber, email);
  }

  // ─── Order Listing ────────────────────────────────────────────────────────────

  /**
   * Get the authenticated user's orders (paginated).
   *
   * GET /orders?page=1&limit=10
   */
  @Get('orders')
  @UseGuards(JwtAuthGuard)
  async findUserOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.ordersService.findUserOrders(user.id, { page, limit });
  }

  /**
   * Get a single order by order number.
   *
   * GET /orders/:orderNumber
   */
  @Get('orders/:orderNumber')
  @UseGuards(JwtAuthGuard)
  async findOrderByNumber(
    @Param('orderNumber') orderNumber: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.findOrderByNumber(orderNumber, user.id);
  }

  // ─── Order Cancellation ───────────────────────────────────────────────────────

  /**
   * Cancel an order (customer-initiated).
   *
   * POST /orders/:id/cancel
   */
  @Post('orders/:id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelOrder(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body('reason') reason?: string,
  ) {
    return this.ordersService.cancelOrder(id, user.id, reason);
  }

  // ─── Shipping ─────────────────────────────────────────────────────────────────

  /**
   * Calculate shipping cost for the given address or division.
   *
   * GET /shipping/calculate?addressId=x or GET /shipping/calculate?division=Dhaka
   */
  @Get('shipping/calculate')
  async calculateShipping(
    @Query('addressId') addressId?: string,
    @Query('division') division?: string,
    @CurrentUser() user?: AuthenticatedUser | null,
  ) {
    if (addressId) {
      return this.shippingService.calculateShipping(addressId, user?.id);
    }
    return this.shippingService.calculateShippingByDivision(division || 'Dhaka');
  }

  // ─── Admin: Order Management ──────────────────────────────────────────────────

  /**
   * Get all orders (admin view) with optional status filter.
   *
   * GET /admin/orders?page=1&limit=20&status=PENDING
   */
  @Get('admin/orders')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async findAllOrders(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.ordersService.findAllOrders({ page, limit, status });
  }

  /**
   * Export filtered orders as CSV. Declared before `admin/orders/:id`
   * so Nest's path matcher resolves the literal `export` segment first
   * instead of treating it as an :id.
   *
   * GET /admin/orders/export?status=PENDING&paymentStatus=PAID&dateFrom=…&dateTo=…
   */
  @Get('admin/orders/export')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async exportOrders(
    @Query('status') status: string | undefined,
    @Query('paymentStatus') paymentStatus: string | undefined,
    @Query('dateFrom') dateFrom: string | undefined,
    @Query('dateTo') dateTo: string | undefined,
    @Res() res: Response,
  ) {
    const csv = await this.ordersService.exportOrdersCsv({
      status,
      paymentStatus,
      dateFrom,
      dateTo,
    });
    const today = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="orders-${today}.csv"`);
    res.send(csv);
  }

  /**
   * Download invoice as PDF for a given order.
   *
   * GET /admin/orders/:id/invoice
   */
  @Get('admin/orders/:id/invoice')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/pdf')
  async downloadInvoice(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const pdfBuffer = await this.invoiceService.generateInvoice(id);
    res.set({
      'Content-Disposition': `attachment; filename="invoice-${id}.pdf"`,
    });
    return new StreamableFile(pdfBuffer);
  }

  /**
   * Get invoice data as JSON (used by frontend print page).
   *
   * GET /admin/orders/:id/invoice-data
   */
  @Get('admin/orders/:id/invoice-data')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getInvoiceData(@Param('id') id: string) {
    const data = await this.invoiceService.getInvoiceData(id);
    return { success: true, data };
  }

  /**
   * Get a single order by ID (admin view).
   *
   * GET /admin/orders/:id
   */
  @Get('admin/orders/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async findOrderById(@Param('id') id: string) {
    return this.ordersService.findOrderById(id);
  }

  /**
   * Update an order's status (admin only).
   *
   * PATCH /admin/orders/:id/status
   */
  @Patch('admin/orders/:id/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async updateOrderStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }

  /**
   * Cancel an order (admin-initiated).
   *
   * POST /admin/orders/:id/cancel
   */
  @Post('admin/orders/:id/cancel')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async adminCancelOrder(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.ordersService.adminCancelOrder(id, reason);
  }
}

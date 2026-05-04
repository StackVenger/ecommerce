import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { DashboardService } from './dashboard.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

/**
 * Admin Dashboard controller.
 *
 * Provides dashboard statistics, chart data, and activity feeds
 * for the admin panel. All endpoints require ADMIN or SUPER_ADMIN role.
 *
 * All monetary values are in BDT (৳).
 */
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // ─── Dashboard Stats ──────────────────────────────────────────────────────

  /**
   * Get overall dashboard statistics for the requested date range.
   *
   * Returns revenue, orders, customers, and products metrics with
   * growth percentages compared to the immediately preceding window.
   * Defaults to the last 30 days when startDate/endDate are omitted.
   *
   * GET /admin/dashboard/stats?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   */
  @Get('stats')
  async getStats(@Query() query: DashboardQueryDto) {
    const stats = await this.dashboardService.getStats(query);

    return {
      success: true,
      data: stats,
    };
  }

  // ─── Charts Data ──────────────────────────────────────────────────────────

  /**
   * Get chart data for the admin dashboard.
   *
   * Returns revenue/orders over time, top-selling products, and
   * revenue breakdown by category for the requested date range.
   * Defaults to the last 30 days. All values in BDT (৳).
   *
   * GET /admin/dashboard/charts?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   */
  @Get('charts')
  async getChartsData(@Query() query: DashboardQueryDto) {
    const charts = await this.dashboardService.getChartsData(query);

    return {
      success: true,
      data: charts,
    };
  }

  // ─── Activity Feed ────────────────────────────────────────────────────────

  /**
   * Get recent activity for the admin dashboard.
   *
   * Returns recent orders, new customer registrations, and low stock alerts.
   *
   * GET /admin/dashboard/activity
   */
  @Get('activity')
  async getActivity() {
    const activity = await this.dashboardService.getActivity();

    return {
      success: true,
      data: activity,
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { EmailQueueService } from './email-queue.service';

interface UserRegisteredEvent {
  userId: string;
  email: string;
  name: string;
  locale: 'en' | 'bn';
}

interface EmailVerificationEvent {
  email: string;
  name: string;
  verifyUrl: string;
  locale: 'en' | 'bn';
}

interface PasswordResetEvent {
  email: string;
  name: string;
  resetUrl: string;
  locale: 'en' | 'bn';
}

interface PasswordChangedEvent {
  email: string;
  name: string;
  changedAt: Date;
  locale: 'en' | 'bn';
}

interface OrderEvent {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  subtotal: number;
  shipping: number;
  discount?: number;
  total: number;
  trackingUrl?: string;
  locale: 'en' | 'bn';
}

interface OrderShippedEvent {
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  carrier: string;
  trackingNumber: string;
  estimatedDelivery: Date;
  locale: 'en' | 'bn';
}

interface RefundEvent {
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  refundAmount: number;
  refundMethod: string;
  refundReference: string;
  locale: 'en' | 'bn';
}

@Injectable()
export class EmailEventsService {
  private readonly logger = new Logger(EmailEventsService.name);
  private readonly baseUrl = process.env.FRONTEND_URL || 'https://bdshop.com.bd';

  constructor(private emailQueue: EmailQueueService) {}

  @OnEvent('user.registered')
  async handleUserRegistered(event: UserRegisteredEvent): Promise<void> {
    this.logger.log(`Sending welcome email to ${event.email}`);
    await this.emailQueue.addToQueue({
      to: event.email,
      subject: event.locale === 'bn' ? 'বিডিশপ-এ স্বাগতম!' : 'Welcome to BDShop!',
      template: 'welcome',
      context: { name: event.name, shopUrl: this.baseUrl },
      locale: event.locale,
      priority: 'high',
    });
  }

  @OnEvent('user.email-verification')
  async handleEmailVerification(event: EmailVerificationEvent): Promise<void> {
    await this.emailQueue.addToQueue({
      to: event.email,
      subject: event.locale === 'bn' ? 'ইমেইল যাচাই করুন' : 'Verify Your Email',
      template: 'verify-email',
      context: { name: event.name, verifyUrl: event.verifyUrl, expiresIn: '24 hours' },
      locale: event.locale,
      priority: 'high',
    });
  }

  @OnEvent('user.password-reset')
  async handlePasswordReset(event: PasswordResetEvent): Promise<void> {
    await this.emailQueue.addToQueue({
      to: event.email,
      subject: event.locale === 'bn' ? 'পাসওয়ার্ড রিসেট' : 'Password Reset Request',
      template: 'password-reset',
      context: { name: event.name, resetUrl: event.resetUrl, expiresIn: '1 hour' },
      locale: event.locale,
      priority: 'high',
    });
  }

  @OnEvent('user.password-changed')
  async handlePasswordChanged(event: PasswordChangedEvent): Promise<void> {
    await this.emailQueue.addToQueue({
      to: event.email,
      subject: event.locale === 'bn' ? 'পাসওয়ার্ড পরিবর্তিত হয়েছে' : 'Password Changed',
      template: 'password-changed',
      context: {
        name: event.name,
        changedAt: event.changedAt,
        supportUrl: `${this.baseUrl}/support`,
      },
      locale: event.locale,
      priority: 'high',
    });
  }

  @OnEvent('order.confirmed')
  async handleOrderConfirmed(event: OrderEvent): Promise<void> {
    this.logger.log(`Sending order confirmation for #${event.orderNumber}`);
    await this.emailQueue.addToQueue({
      to: event.customerEmail,
      subject:
        event.locale === 'bn'
          ? `অর্ডার নিশ্চিত - #${event.orderNumber}`
          : `Order Confirmed - #${event.orderNumber}`,
      template: 'order-confirmation',
      context: {
        customerName: event.customerName,
        orderNumber: event.orderNumber,
        items: event.items,
        subtotal: event.subtotal,
        shipping: event.shipping,
        discount: event.discount,
        total: event.total,
        trackingUrl:
          event.trackingUrl ?? `${this.baseUrl}/orders/track?orderNumber=${event.orderNumber}`,
      },
      locale: event.locale,
      priority: 'high',
    });
  }

  @OnEvent('order.shipped')
  async handleOrderShipped(event: OrderShippedEvent): Promise<void> {
    await this.emailQueue.addToQueue({
      to: event.customerEmail,
      subject:
        event.locale === 'bn'
          ? `অর্ডার শিপ হয়েছে - #${event.orderNumber}`
          : `Order Shipped - #${event.orderNumber}`,
      template: 'order-shipped',
      context: {
        customerName: event.customerName,
        orderNumber: event.orderNumber,
        carrier: event.carrier,
        trackingNumber: event.trackingNumber,
        estimatedDelivery: event.estimatedDelivery,
        trackingUrl: `${this.baseUrl}/orders/track/${event.trackingNumber}`,
      },
      locale: event.locale,
    });
  }

  @OnEvent('order.cancelled')
  async handleOrderCancelled(event: OrderEvent & { reason: string }): Promise<void> {
    await this.emailQueue.addToQueue({
      to: event.customerEmail,
      subject:
        event.locale === 'bn'
          ? `অর্ডার বাতিল - #${event.orderNumber}`
          : `Order Cancelled - #${event.orderNumber}`,
      template: 'order-cancelled',
      context: {
        customerName: event.customerName,
        orderNumber: event.orderNumber,
        reason: event.reason,
        refundAmount: event.total,
        shopUrl: this.baseUrl,
      },
      locale: event.locale,
    });
  }

  @OnEvent('payment.refunded')
  async handleRefundProcessed(event: RefundEvent): Promise<void> {
    await this.emailQueue.addToQueue({
      to: event.customerEmail,
      subject:
        event.locale === 'bn'
          ? `রিফান্ড প্রক্রিয়া সম্পন্ন - #${event.orderNumber}`
          : `Refund Processed - #${event.orderNumber}`,
      template: 'refund-processed',
      context: {
        customerName: event.customerName,
        orderNumber: event.orderNumber,
        refundAmount: event.refundAmount,
        refundMethod: event.refundMethod,
        refundReference: event.refundReference,
      },
      locale: event.locale,
    });
  }
}

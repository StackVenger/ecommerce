import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Stripe from 'stripe';

import { PrismaService } from '../prisma/prisma.service';
import { RefundType } from './dto/refund.dto';

const BDT_TO_USD_RATE = 0.0091;

export function convertBDTtoUSDCents(amountBDT: number): number {
  const usd = amountBDT * BDT_TO_USD_RATE;
  return Math.round(usd * 100);
}

export function formatBDT(amount: number): string {
  return `৳${amount.toLocaleString('en-BD')}`;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly stripe: Stripe | null;
  private readonly webhookSecret: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    const stripeKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey && stripeKey !== 'sk_test_...') {
      this.stripe = new Stripe(stripeKey, {
        apiVersion: '2024-04-10',
      });
    } else {
      this.stripe = null;
      this.logger.warn('Stripe not configured - payment features disabled');
    }
    this.webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';
  }

  getStripeInstance(): Stripe | null {
    return this.stripe;
  }

  private ensureStripe(): Stripe {
    if (!this.stripe) {
      throw new BadRequestException(
        'Stripe is not configured. Set STRIPE_SECRET_KEY in environment variables.',
      );
    }
    return this.stripe;
  }

  async createCheckoutSession(params: {
    orderId: string;
    items: Array<{
      name: string;
      description?: string;
      image?: string;
      quantity: number;
      priceBDT: number;
    }>;
    customerEmail: string;
    shippingCostBDT?: number;
  }) {
    const { orderId, items, customerEmail, shippingCostBDT = 0 } = params;

    this.logger.log(`Creating Stripe checkout session for order ${orderId}`);

    const totalBDT = items.reduce(
      (sum, item) => sum + item.priceBDT * item.quantity,
      0,
    ) + shippingCostBDT;

    this.validateAmount(totalBDT);

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(
      (item) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            description: item.description || `Price: ${formatBDT(item.priceBDT)}`,
            ...(item.image && { images: [item.image] }),
          },
          unit_amount: convertBDTtoUSDCents(item.priceBDT),
        },
        quantity: item.quantity,
      }),
    );

    if (shippingCostBDT > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Shipping',
            description: `Shipping cost: ${formatBDT(shippingCostBDT)}`,
          },
          unit_amount: convertBDTtoUSDCents(shippingCostBDT),
        },
        quantity: 1,
      });
    }

    const successUrl = `${this.config.get('FRONTEND_URL')}/checkout/payment/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`;
    const cancelUrl = `${this.config.get('FRONTEND_URL')}/checkout/payment/cancel?order_id=${orderId}`;

    const stripe = this.ensureStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: customerEmail,
      line_items: lineItems,
      metadata: {
        orderId,
        totalBDT: totalBDT.toString(),
        currency: 'BDT',
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    await this.createPaymentRecord({
      orderId,
      method: 'STRIPE',
      amount: totalBDT,
      currency: 'BDT',
      status: 'PENDING',
      stripeSessionId: session.id,
    });

    this.logger.log(
      `Checkout session created: ${session.id} for ${formatBDT(totalBDT)} (${convertBDTtoUSDCents(totalBDT)} USD cents)`,
    );

    return {
      sessionId: session.id,
      sessionUrl: session.url,
      totalBDT,
      totalFormatted: formatBDT(totalBDT),
      totalUSDCents: convertBDTtoUSDCents(totalBDT),
    };
  }

  async handleWebhook(payload: Buffer, signature: string) {
    let event: Stripe.Event;

    const stripe = this.ensureStripe();
    try {
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret,
      );
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Processing webhook event: ${event.type} (${event.id})`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutSessionCompleted(session);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await this.handlePaymentIntentSucceeded(paymentIntent);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await this.handlePaymentIntentFailed(paymentIntent);
        break;
      }

      default:
        this.logger.log(`Unhandled webhook event type: ${event.type}`);
    }

    return { received: true, eventType: event.type };
  }

  async processRefund(
    orderId: string,
    type: RefundType,
    amountBDT?: number,
    reason?: string,
  ) {
    const payment = await this.getPaymentByOrderId(orderId);

    if (payment.status !== 'COMPLETED') {
      throw new BadRequestException(
        `Cannot refund payment with status ${payment.status}. Only COMPLETED payments can be refunded.`,
      );
    }

    if (payment.method !== 'STRIPE' || !payment.stripePaymentIntentId) {
      throw new BadRequestException(
        'Only Stripe payments with a payment intent can be refunded',
      );
    }

    let refundAmountBDT: number;

    if (type === RefundType.FULL) {
      refundAmountBDT = payment.amount;
    } else {
      if (!amountBDT || amountBDT <= 0) {
        throw new BadRequestException(
          'Partial refund requires a valid amount in ৳ (BDT)',
        );
      }
      if (amountBDT > payment.amount) {
        throw new BadRequestException(
          `Refund amount ${formatBDT(amountBDT)} exceeds payment amount ${formatBDT(payment.amount)}`,
        );
      }
      refundAmountBDT = amountBDT;
    }

    const refundAmountUSDCents = convertBDTtoUSDCents(refundAmountBDT);

    this.logger.log(
      `Processing ${type} refund for order ${orderId}: ${formatBDT(refundAmountBDT)} (${refundAmountUSDCents} USD cents)`,
    );

    const stripe = this.ensureStripe();
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      amount: type === RefundType.PARTIAL ? refundAmountUSDCents : undefined,
      reason: 'requested_by_customer',
      metadata: {
        orderId,
        refundType: type,
        refundAmountBDT: refundAmountBDT.toString(),
        refundReason: reason || 'No reason provided',
      },
    });

    const newStatus = type === RefundType.FULL ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        metadata: {
          refundId: refund.id,
          refundType: type,
          refundAmountBDT,
          refundReason: reason,
          refundedAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      },
    });

    // Order has no paymentStatus column — Payment.status is the source of
    // truth. Only mirror the order-level transition for full refunds.
    if (type === RefundType.FULL) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED', updatedAt: new Date() },
      });
    }

    this.logger.log(
      `Refund ${refund.id} processed for order ${orderId}: ${formatBDT(refundAmountBDT)}`,
    );

    return {
      refundId: refund.id,
      type,
      amountBDT: refundAmountBDT,
      amountFormatted: formatBDT(refundAmountBDT),
      status: refund.status,
      reason,
    };
  }

  async createCODPayment(orderId: string, amountBDT: number) {
    this.logger.log(
      `Creating Cash on Delivery payment for order ${orderId}: ${formatBDT(amountBDT)}`,
    );

    this.validateAmount(amountBDT);

    const existingPayment = await this.prisma.payment.findFirst({
      where: { orderId },
    });

    if (existingPayment) {
      throw new BadRequestException(
        `Payment already exists for order ${orderId}`,
      );
    }

    const payment = await this.createPaymentRecord({
      orderId,
      method: 'COD',
      amount: amountBDT,
      currency: 'BDT',
      status: 'PENDING',
    });

    // Order has no paymentStatus column — Payment.status (PENDING) is the SOT.
    // Flip order to CONFIRMED so customer-facing status reflects the booked sale.
    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'CONFIRMED', updatedAt: new Date() },
    });

    this.logger.log(
      `COD payment created for order ${orderId}: ${formatBDT(amountBDT)}`,
    );

    return {
      paymentId: payment.id,
      method: 'COD',
      amountBDT,
      amountFormatted: formatBDT(amountBDT),
      status: 'PENDING',
      message: `Cash on Delivery: ${formatBDT(amountBDT)} to be collected upon delivery`,
    };
  }

  async markCODPaid(orderId: string) {
    const payment = await this.getPaymentByOrderId(orderId);

    if (payment.method !== 'COD') {
      throw new BadRequestException(
        'This payment is not a Cash on Delivery payment',
      );
    }

    if (payment.status === 'COMPLETED') {
      throw new BadRequestException('This COD payment is already marked as paid');
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED',
        metadata: {
          collectedAt: new Date().toISOString(),
          collectionMethod: 'CASH',
        },
        updatedAt: new Date(),
      },
    });

    // Payment.status is the SOT for payment state — Order.status stays
    // wherever the admin/fulfilment moved it last. No order.update here.
    this.logger.log(
      `COD payment for order ${orderId} marked as PAID: ${formatBDT(payment.amount)}`,
    );

    // Customer-facing "we received your payment" email. Listeners can be
    // added in email-events.service.ts; the emit is safe with no subscribers.
    this.eventEmitter.emit('payment.received', {
      orderId,
      paymentId: payment.id,
      method: 'COD',
      amountBDT: Number(payment.amount),
    });

    return {
      paymentId: payment.id,
      orderId,
      amountBDT: payment.amount,
      amountFormatted: formatBDT(payment.amount),
      status: 'COMPLETED',
      message: `Cash on Delivery payment of ${formatBDT(payment.amount)} collected successfully`,
    };
  }

  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const orderId = session.metadata?.orderId;
    if (!orderId) {
      this.logger.warn('Checkout session completed without orderId in metadata');
      return;
    }

    this.logger.log(`Checkout session completed for order ${orderId}`);

    const payment = await this.prisma.payment.findFirst({
      where: { stripeSessionId: session.id },
    });

    if (payment) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          stripePaymentIntentId: session.payment_intent as string,
          updatedAt: new Date(),
        },
      });

      // Order has no paymentStatus column — Payment.status (COMPLETED) is the SOT.
      // Flip order status to CONFIRMED for fulfilment.
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'CONFIRMED', updatedAt: new Date() },
      });

      this.logger.log(`Order ${orderId} payment marked as PAID`);

      this.eventEmitter.emit('payment.received', {
        orderId,
        paymentId: payment.id,
        method: 'STRIPE',
        amountBDT: Number(payment.amount),
      });
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    this.logger.log(`Payment intent succeeded: ${paymentIntent.id}`);

    const payment = await this.prisma.payment.findFirst({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (payment && payment.status !== 'COMPLETED') {
      await this.updatePaymentStatus(payment.id, 'COMPLETED');
    }
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    this.logger.warn(`Payment intent failed: ${paymentIntent.id}`);

    const payment = await this.prisma.payment.findFirst({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (payment) {
      await this.updatePaymentStatus(payment.id, 'FAILED', {
        failureMessage: paymentIntent.last_payment_error?.message,
        failureCode: paymentIntent.last_payment_error?.code,
      });
    }
  }

  async getPaymentByOrderId(orderId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { orderId },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment not found for order ${orderId}`);
    }

    return payment;
  }

  async createPaymentRecord(data: {
    orderId: string;
    method: 'STRIPE' | 'COD';
    amount: number;
    currency: string;
    status: string;
    stripeSessionId?: string;
    stripePaymentIntentId?: string;
  }) {
    this.logger.log(
      `Creating payment record for order ${data.orderId}: ${formatBDT(data.amount)}`,
    );

    return this.prisma.payment.create({
      data: {
        orderId: data.orderId,
        method: data.method,
        amount: data.amount,
        currency: data.currency || 'BDT',
        status: data.status,
        stripeSessionId: data.stripeSessionId,
        stripePaymentIntentId: data.stripePaymentIntentId,
      },
    });
  }

  async updatePaymentStatus(paymentId: string, status: string, metadata?: Record<string, any>) {
    this.logger.log(`Updating payment ${paymentId} status to ${status}`);

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status,
        ...(metadata && { metadata }),
        updatedAt: new Date(),
      },
    });
  }

  async getPaymentStats() {
    const [totalRevenue, totalPayments, pendingPayments] = await Promise.all([
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'COMPLETED' },
      }),
      this.prisma.payment.count({ where: { status: 'COMPLETED' } }),
      this.prisma.payment.count({ where: { status: 'PENDING' } }),
    ]);

    return {
      totalRevenue: totalRevenue._sum.amount || 0,
      totalRevenueFormatted: formatBDT(totalRevenue._sum.amount || 0),
      totalPayments,
      pendingPayments,
      currency: 'BDT',
    };
  }

  validateAmount(amount: number): void {
    if (!amount || amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than ৳0');
    }

    if (amount > 500000) {
      throw new BadRequestException('Payment amount cannot exceed ৳500,000');
    }
  }
}

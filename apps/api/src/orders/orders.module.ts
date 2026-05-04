import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { InvoiceService } from './invoice.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ShippingService } from './shipping.service';
import { TaxService } from './tax.service';

@Module({
  imports: [EventEmitterModule],
  controllers: [OrdersController],
  providers: [OrdersService, ShippingService, TaxService, InvoiceService],
  exports: [OrdersService, ShippingService, TaxService],
})
export class OrdersModule {}

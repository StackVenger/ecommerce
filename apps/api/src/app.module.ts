import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { BannersModule } from './banners/banners.module';
import { BrandsModule } from './brands/brands.module';
import { CartModule } from './cart/cart.module';
import { CategoriesModule } from './categories/categories.module';
import { ChatModule } from './chat/chat.module';
import { AuditInterceptor } from './common/audit/audit.interceptor';
import { RevalidateModule } from './common/revalidate/revalidate.module';
import { CouponsModule } from './coupons/coupons.module';
import { EmailModule } from './email/email.module';
import { EmailTemplatesModule } from './email-templates/email-templates.module';
import { HealthModule } from './health/health.module';
import { MenusModule } from './menus/menus.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { OrdersModule } from './orders/orders.module';
import { PagesModule } from './pages/pages.module';
import { PaymentModule } from './payment/payment.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SearchModule } from './search/search.module';
import { SettingsModule } from './settings/settings.module';
import { ShippingMethodsModule } from './shipping-methods/shipping-methods.module';
import { ThemeModule } from './theme/theme.module';
import { UploadModule } from './upload/upload.module';
import { UsersModule } from './users/users.module';
import { WishlistModule } from './wishlist/wishlist.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
      expandVariables: true,
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: config.get<string>('REDIS_URL', 'redis://localhost:6379'),
      }),
    }),
    // Global rate limits. Admin mutations don't need protection — the
    // JwtAuthGuard already stops unauthenticated abuse — but the public
    // catalog + settings + theme endpoints are hot paths that benefit
    // from a sane default cap. Individual controllers can tighten or
    // loosen with @Throttle(); @SkipThrottle() opts out entirely.
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000, // 1 minute
        limit: 120, // 120 req/min per IP; plenty for a browsing user
      },
    ]),
    PrismaModule,
    RevalidateModule,
    AdminModule,
    AuditModule,
    AuthModule,
    BannersModule,
    BrandsModule,
    CartModule,
    ChatModule,
    CategoriesModule,
    CouponsModule,
    EmailModule,
    EmailTemplatesModule,
    HealthModule,
    MenusModule,
    NewsletterModule,
    OrdersModule,
    PagesModule,
    PaymentModule,
    ProductsModule,
    ReviewsModule,
    SearchModule,
    SettingsModule,
    ShippingMethodsModule,
    ThemeModule,
    UploadModule,
    UsersModule,
    WishlistModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global ThrottlerGuard so every endpoint picks up the default
    // cap. Individual routes that need different behaviour use the
    // @Throttle / @SkipThrottle decorators.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Global AuditInterceptor: any handler decorated with @AuditLog
    // lands an AuditLog row on successful completion. No-op for
    // everything else.
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}

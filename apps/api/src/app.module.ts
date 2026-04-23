import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

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
import { RevalidateModule } from './common/revalidate/revalidate.module';
import { CouponsModule } from './coupons/coupons.module';
import { EmailModule } from './email/email.module';
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
    ThemeModule,
    UploadModule,
    UsersModule,
    WishlistModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { PermissionsGuard } from "./common/guards/permissions.guard";
import { UsersModule } from "./modules/users/users.module";
import { RbacModule } from "./modules/rbac/rbac.module";
import { SpecialistsModule } from "./modules/specialists/specialists.module";
import { CategoriesModule } from "./modules/categories/categories.module";
import { ProductsModule } from "./modules/products/products.module";
import { CartModule } from "./modules/cart/cart.module";
import { ShippingModule } from "./modules/shipping/shipping.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { ServicesModule } from "./modules/services/services.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({ global: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    RbacModule,
    SpecialistsModule,
    CategoriesModule,
    ProductsModule,
    CartModule,
    ShippingModule,
    OrdersModule,
    PaymentsModule,
    ServicesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}

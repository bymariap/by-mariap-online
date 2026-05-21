import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { Request, Response } from "express";
import { Public } from "../../common/decorators/public.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import type { AuthUser } from "../../common/types/auth-user";
import { OrderStatus } from "@prisma/client";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { ensureGuestToken, readGuestToken } from "../cart/guest-token";

@Controller()
export class OrdersController {
  constructor(private svc: OrdersService) {}

  @Public()
  @Post("store/orders")
  create(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: CreateOrderDto,
  ) {
    const user = (req as any).user as AuthUser | undefined;
    if (user) {
      return this.svc.createFromCart(
        { userId: user.id, guestToken: null },
        dto,
      );
    }
    const guestToken = readGuestToken(req);
    if (!guestToken) {
      ensureGuestToken(req, res);
      throw new UnauthorizedException("No cart found");
    }
    return this.svc.createFromCart({ userId: null, guestToken }, dto);
  }

  @Public()
  @Get("store/orders/:reference")
  byReference(@Param("reference") reference: string) {
    return this.svc.findByReference(reference);
  }

  @Get("me/orders")
  myOrders(@CurrentUser() user: AuthUser) {
    return this.svc.listForUser(user.id);
  }

  @Get("admin/orders")
  @RequirePermissions("orders:read")
  list(@Query("status") status?: OrderStatus) {
    return this.svc.listAdmin(status);
  }

  @Get("admin/orders/:id")
  @RequirePermissions("orders:read")
  get(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.svc.findById(id, user);
  }

  @Patch("admin/orders/:id/status")
  @RequirePermissions("orders:write:status")
  setStatus(@Param("id") id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.svc.updateStatus(id, dto.status);
  }
}

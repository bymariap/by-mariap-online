import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { Request, Response } from "express";
import { Public } from "../../common/decorators/public.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthUser } from "../../common/types/auth-user";
import { CartService, CartOwner } from "./cart.service";
import { ensureGuestToken } from "./guest-token";
import { AddItemDto } from "./dto/add-item.dto";
import { UpdateItemDto } from "./dto/update-item.dto";

@Public()
@Controller("store/cart")
export class CartController {
  constructor(private cart: CartService) {}

  @Get()
  async get(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const owner = this.owner(req, res);
    return owner.userId
      ? this.cart.getForUser(owner.userId)
      : this.cart.getForGuest(owner.guestToken!);
  }

  @Post("items")
  add(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: AddItemDto,
  ) {
    return this.cart.addItem(this.owner(req, res), dto);
  }

  @Patch("items/:id")
  update(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Param("id") id: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.cart.updateItem(this.owner(req, res), id, dto);
  }

  @Delete("items/:id")
  remove(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Param("id") id: string,
  ) {
    return this.cart.removeItem(this.owner(req, res), id);
  }

  private owner(req: Request, res: Response): CartOwner {
    const user = (req as any).user as AuthUser | undefined;
    if (user) return { userId: user.id, guestToken: null };
    const guestToken = ensureGuestToken(req, res);
    return { userId: null, guestToken };
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { Public } from "../../common/decorators/public.decorator";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { ProductsService } from "./products.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { ListProductsQuery } from "./dto/list-products.query";

@Controller()
export class ProductsController {
  constructor(private svc: ProductsService) {}

  @Public()
  @Get("store/products")
  publicList(@Query() q: ListProductsQuery) {
    return this.svc.findPublic(q);
  }

  @Public()
  @Get("store/products/:slug")
  publicBySlug(@Param("slug") slug: string) {
    return this.svc.findBySlug(slug);
  }

  @Get("admin/products")
  @RequirePermissions("products:read")
  list(@Query() q: ListProductsQuery) {
    return this.svc.findAdmin(q);
  }

  @Get("admin/products/:id")
  @RequirePermissions("products:read")
  get(@Param("id") id: string) {
    return this.svc.findById(id);
  }

  @Post("admin/products")
  @RequirePermissions("products:write")
  create(@Body() dto: CreateProductDto) {
    return this.svc.create(dto);
  }

  @Patch("admin/products/:id")
  @RequirePermissions("products:write")
  update(@Param("id") id: string, @Body() dto: UpdateProductDto) {
    return this.svc.update(id, dto);
  }

  @Delete("admin/products/:id")
  @RequirePermissions("products:write")
  remove(@Param("id") id: string) {
    return this.svc.remove(id);
  }
}

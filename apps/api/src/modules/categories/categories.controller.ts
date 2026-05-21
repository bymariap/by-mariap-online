import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { Public } from "../../common/decorators/public.decorator";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";

@Controller()
export class CategoriesController {
  constructor(private svc: CategoriesService) {}

  @Public()
  @Get("store/categories")
  publicList() {
    return this.svc.findAll();
  }

  @Get("admin/categories")
  @RequirePermissions("products:write")
  list() {
    return this.svc.findAll();
  }

  @Get("admin/categories/:id")
  @RequirePermissions("products:write")
  get(@Param("id") id: string) {
    return this.svc.findById(id);
  }

  @Post("admin/categories")
  @RequirePermissions("products:write")
  create(@Body() dto: CreateCategoryDto) {
    return this.svc.create(dto);
  }

  @Patch("admin/categories/:id")
  @RequirePermissions("products:write")
  update(@Param("id") id: string, @Body() dto: UpdateCategoryDto) {
    return this.svc.update(id, dto);
  }

  @Delete("admin/categories/:id")
  @RequirePermissions("products:write")
  remove(@Param("id") id: string) {
    return this.svc.remove(id);
  }
}

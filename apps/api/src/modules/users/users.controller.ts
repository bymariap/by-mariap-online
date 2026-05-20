import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import type { AuthUser } from "../../common/types/auth-user";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UpdateMeDto } from "./dto/update-me.dto";

@Controller()
export class UsersController {
  constructor(private users: UsersService) {}

  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.users.findMe(user.id);
  }

  @Patch("me")
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    return this.users.updateMe(user.id, dto);
  }

  @Get("admin/users")
  @RequirePermissions("users:read")
  list() {
    return this.users.findAll();
  }

  @Get("admin/users/:id")
  @RequirePermissions("users:read")
  get(@Param("id") id: string) {
    return this.users.findById(id);
  }

  @Post("admin/users")
  @RequirePermissions("users:write")
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Patch("admin/users/:id")
  @RequirePermissions("users:write")
  update(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }

  @Delete("admin/users/:id")
  @RequirePermissions("users:write")
  remove(@Param("id") id: string) {
    return this.users.remove(id);
  }
}

import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RbacService } from './rbac.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';

@Controller('admin/rbac')
@RequirePermissions('rbac:write')
export class RbacController {
  constructor(private rbac: RbacService) {}

  @Get('roles')
  listRoles() {
    return this.rbac.listRoles();
  }

  @Post('roles')
  createRole(@Body() dto: CreateRoleDto) {
    return this.rbac.createRole(dto);
  }

  @Get('permissions')
  listPerms() {
    return this.rbac.listPermissions();
  }

  @Put('roles/:id/permissions')
  assign(@Param('id') id: string, @Body() dto: AssignPermissionsDto) {
    return this.rbac.assignPermissions(id, dto.permissionKeys);
  }
}

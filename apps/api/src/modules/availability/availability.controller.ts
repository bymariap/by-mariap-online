import {
  BadRequestException, Body, Controller, Delete, Get, Param, Post, Query,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import type { AuthUser } from '../../common/types/auth-user';
import { AvailabilityService } from './availability.service';
import { PublishAvailabilityDto } from './dto/publish-availability.dto';
import { ListAvailabilityQuery } from './dto/list-availability.query';

@Controller()
export class AvailabilityController {
  constructor(private svc: AvailabilityService) {}

  @Public()
  @Get('store/availability')
  storeSlots(
    @Query('serviceId') serviceId: string,
    @Query('specialistId') specialistId: string,
    @Query('date') date: string,
  ) {
    if (!serviceId || !specialistId || !date) {
      throw new BadRequestException('serviceId, specialistId and date are required');
    }
    return this.svc.getSlots({ serviceId, specialistId, date });
  }

  // Specialist publishing their own windows. The specialist id is resolved from
  // the DB by user id (not the JWT), so a freshly assigned profile works without
  // re-login.
  @Post('me/availability')
  @RequirePermissions('availability:write:own')
  async publishMine(@CurrentUser() user: AuthUser, @Body() dto: PublishAvailabilityDto) {
    const specialistId = await this.svc.resolveSpecialistId(user.id);
    return this.svc.publish(specialistId, dto);
  }

  @Get('me/availability')
  @RequirePermissions('availability:write:own')
  async listMine(@CurrentUser() user: AuthUser, @Query() q: ListAvailabilityQuery) {
    const specialistId = await this.svc.resolveSpecialistId(user.id);
    return this.svc.listForSpecialist(specialistId, q.fromDate, q.toDate);
  }

  @Delete('me/availability/:id')
  @RequirePermissions('availability:write:own')
  async removeMine(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const specialistId = await this.svc.resolveSpecialistId(user.id);
    return this.svc.remove(specialistId, id);
  }

  // Admin can read any specialist's windows.
  @Get('admin/availability')
  @RequirePermissions('availability:read')
  listAny(@Query() q: ListAvailabilityQuery) {
    if (!q.specialistId) throw new BadRequestException('specialistId required');
    return this.svc.listForSpecialist(q.specialistId, q.fromDate, q.toDate);
  }
}

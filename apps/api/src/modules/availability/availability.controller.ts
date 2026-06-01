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

  // Specialist publishing their own windows.
  @Post('me/availability')
  @RequirePermissions('availability:write:own')
  publishMine(@CurrentUser() user: AuthUser, @Body() dto: PublishAvailabilityDto) {
    if (!user.specialistId) throw new BadRequestException('User is not a specialist');
    return this.svc.publish(user.specialistId, dto);
  }

  @Get('me/availability')
  @RequirePermissions('availability:write:own')
  listMine(@CurrentUser() user: AuthUser, @Query() q: ListAvailabilityQuery) {
    if (!user.specialistId) throw new BadRequestException('User is not a specialist');
    return this.svc.listForSpecialist(user.specialistId, q.fromDate, q.toDate);
  }

  @Delete('me/availability/:id')
  @RequirePermissions('availability:write:own')
  removeMine(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    if (!user.specialistId) throw new BadRequestException('User is not a specialist');
    return this.svc.remove(user.specialistId, id);
  }

  // Admin can read any specialist's windows.
  @Get('admin/availability')
  @RequirePermissions('availability:read')
  listAny(@Query() q: ListAvailabilityQuery) {
    if (!q.specialistId) throw new BadRequestException('specialistId required');
    return this.svc.listForSpecialist(q.specialistId, q.fromDate, q.toDate);
  }
}

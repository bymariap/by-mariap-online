import {
  BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import type { AuthUser } from '../../common/types/auth-user';
import { AppointmentStatus } from '@prisma/client';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';

@Controller()
export class AppointmentsController {
  constructor(private svc: AppointmentsService) {}

  @Public()
  @Post('store/appointments')
  create(@Req() req: Request, @Body() dto: CreateAppointmentDto) {
    const user = (req as any).user as AuthUser | undefined;
    return this.svc.create({ userId: user?.id ?? null }, dto);
  }

  @Get('me/appointments')
  myAppointments(@CurrentUser() user: AuthUser) {
    if (user.role === 'specialist') {
      if (!user.specialistId) throw new BadRequestException();
      return this.svc.listForSpecialist(user.specialistId);
    }
    return this.svc.listForUser(user.id);
  }

  @Post('me/appointments/:id/cancel')
  cancelMine(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    if (user.role !== 'customer') throw new BadRequestException('Only customers can self-cancel');
    return this.svc.cancelByCustomer(user.id, id);
  }

  @Get('admin/appointments')
  @RequirePermissions('appointments:read')
  list(
    @Query('status') status?: AppointmentStatus,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.listAdmin(status, from, to);
  }

  @Get('admin/appointments/:id')
  @RequirePermissions('appointments:read')
  get(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.svc.findById(id, user);
  }

  @Patch('admin/appointments/:id/status')
  @RequirePermissions('appointments:write')
  setStatus(@Param('id') id: string, @Body() dto: UpdateAppointmentStatusDto) {
    return this.svc.adminUpdateStatus(id, dto.status);
  }
}

import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Controller()
export class ServicesController {
  constructor(private svc: ServicesService) {}

  @Public() @Get('store/services')                public_(){ return this.svc.findPublic(); }
  @Public() @Get('store/services/:slug')         bySlug(@Param('slug') slug: string){ return this.svc.findBySlug(slug); }

  @Get('admin/services')      @RequirePermissions('services:read')  list(){ return this.svc.findAdmin(); }
  @Get('admin/services/:id')  @RequirePermissions('services:read')  get(@Param('id') id: string){ return this.svc.findById(id); }
  @Post('admin/services')     @RequirePermissions('services:write') create(@Body() dto: CreateServiceDto){ return this.svc.create(dto); }
  @Patch('admin/services/:id') @RequirePermissions('services:write') update(@Param('id') id: string, @Body() dto: UpdateServiceDto){ return this.svc.update(id, dto); }
  @Delete('admin/services/:id') @RequirePermissions('services:write') remove(@Param('id') id: string){ return this.svc.remove(id); }
}

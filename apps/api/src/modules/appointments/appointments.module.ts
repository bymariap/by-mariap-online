import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AvailabilityModule } from '../availability/availability.module';
import { ServicesModule } from '../services/services.module';

@Module({
  imports: [AvailabilityModule, ServicesModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}

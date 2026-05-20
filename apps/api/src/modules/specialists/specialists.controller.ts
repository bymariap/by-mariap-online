import { Body, Controller, Delete, Get, Param, Put } from "@nestjs/common";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { SpecialistsService } from "./specialists.service";
import { UpsertSpecialistDto } from "./dto/upsert-specialist.dto";

@Controller("admin/specialists")
@RequirePermissions("users:write")
export class SpecialistsController {
  constructor(private svc: SpecialistsService) {}

  @Get()
  list() {
    return this.svc.findAll();
  }

  @Get(":userId")
  get(@Param("userId") userId: string) {
    return this.svc.findByUserId(userId);
  }

  @Put(":userId")
  upsert(@Param("userId") userId: string, @Body() dto: UpsertSpecialistDto) {
    return this.svc.upsert(userId, dto);
  }

  @Delete(":userId")
  remove(@Param("userId") userId: string) {
    return this.svc.remove(userId);
  }
}

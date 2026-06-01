import { Body, Controller, Delete, Get, Param, Put } from "@nestjs/common";
import { Public } from "../../common/decorators/public.decorator";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { SpecialistsService } from "./specialists.service";
import { UpsertSpecialistDto } from "./dto/upsert-specialist.dto";

@Controller()
@RequirePermissions("users:write")
export class SpecialistsController {
  constructor(private svc: SpecialistsService) {}

  @Public()
  @Get("store/specialists")
  publicList() {
    return this.svc.findAll().then((rows) => rows.map((s) => ({
      id: s.id, userId: s.userId, user: { fullName: s.user.fullName },
      specialties: s.specialties, avatarUrl: s.avatarUrl,
    })));
  }

  @Get("admin/specialists")
  list() {
    return this.svc.findAll();
  }

  @Get("admin/specialists/:userId")
  get(@Param("userId") userId: string) {
    return this.svc.findByUserId(userId);
  }

  @Put("admin/specialists/:userId")
  upsert(@Param("userId") userId: string, @Body() dto: UpsertSpecialistDto) {
    return this.svc.upsert(userId, dto);
  }

  @Delete("admin/specialists/:userId")
  remove(@Param("userId") userId: string) {
    return this.svc.remove(userId);
  }
}

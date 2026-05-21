import { Controller, Get, Query } from "@nestjs/common";
import { Public } from "../../common/decorators/public.decorator";
import { ShippingService } from "./shipping.service";

@Public()
@Controller("store/shipping")
export class ShippingController {
  constructor(private svc: ShippingService) {}

  @Get("options")
  options(@Query("city") city: string) {
    return this.svc.findOptionsByCity(city ?? "");
  }
}

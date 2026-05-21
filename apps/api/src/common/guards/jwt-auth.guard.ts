import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwt: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    const req = ctx.switchToHttp().getRequest();
    const token = req.cookies?.access_token;

    if (token) {
      try {
        const payload = await this.jwt.verifyAsync(token, {
          secret: process.env.JWT_ACCESS_SECRET,
        });
        req.user = {
          id: payload.sub,
          email: payload.email,
          role: payload.role,
          permissions: payload.permissions ?? [],
          specialistId: payload.specialistId,
        };
        return true;
      } catch {
        if (!isPublic) throw new UnauthorizedException();
      }
    } else if (!isPublic) {
      throw new UnauthorizedException();
    }

    return true;
  }
}

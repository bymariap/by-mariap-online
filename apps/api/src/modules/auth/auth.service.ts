import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { verifyPassword } from "../../common/crypto/password";
import { TokenPair, RefreshTokenPayload } from "./auth.types";

const ACCESS_TTL = () => Number(process.env.JWT_ACCESS_TTL ?? 3600);
const REFRESH_TTL = () => Number(process.env.JWT_REFRESH_TTL ?? 604800);

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
        specialist: true,
      },
    });
    if (!user) throw new UnauthorizedException();
    if (!(await verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException();
    }
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException();
    }

    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(refreshToken) },
    });
    if (!row || row.revokedAt || row.expiresAt < new Date()) {
      throw new UnauthorizedException();
    }

    await this.prisma.refreshToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
        specialist: true,
      },
    });
    if (!user) throw new UnauthorizedException();
    return this.issueTokens(user);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(user: any): Promise<TokenPair> {
    const permissions = user.role.permissions.map(
      (rp: any) => rp.permission.key,
    );
    const accessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      permissions,
      specialistId: user.specialist?.id,
    };
    const refreshJti = randomUUID();
    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: ACCESS_TTL(),
    });
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, jti: refreshJti },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: REFRESH_TTL() },
    );
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL() * 1000),
      },
    });
    return { accessToken, refreshToken };
  }
}

export function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

import { Body, Controller, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { AuthService, TokenPair } from './auth.service';

const cookieOpts = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.COOKIE_SECURE === 'true',
  domain: process.env.COOKIE_DOMAIN,
  path: '/',
});

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.auth.login(dto.email, dto.password);
    this.writeCookies(res, tokens);
    res.json({ ok: true });
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.refresh_token;
    if (!token) throw new UnauthorizedException();
    const tokens = await this.auth.refresh(token);
    this.writeCookies(res, tokens);
    res.json({ ok: true });
  }

  @Public()
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.refresh_token);
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    res.json({ ok: true });
  }

  private writeCookies(res: Response, tokens: TokenPair) {
    const accessMaxAge = Number(process.env.JWT_ACCESS_TTL ?? 3600) * 1000;
    const refreshMaxAge = Number(process.env.JWT_REFRESH_TTL ?? 604800) * 1000;
    res.cookie('access_token', tokens.accessToken, { ...cookieOpts(), maxAge: accessMaxAge });
    res.cookie('refresh_token', tokens.refreshToken, { ...cookieOpts(), maxAge: refreshMaxAge });
  }
}

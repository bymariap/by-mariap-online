import { AuthController } from './auth.controller';
import { mock } from 'jest-mock-extended';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  const svc = mock<AuthService>();
  const ctrl = new AuthController(svc);

  it('sets cookies on login', async () => {
    svc.login.mockResolvedValueOnce({ accessToken: 'a', refreshToken: 'r' });
    const res: any = { cookie: jest.fn(), json: jest.fn() };
    await ctrl.login({ email: 'a@b.c', password: 'pw123456' }, res);
    expect(res.cookie).toHaveBeenCalledWith('access_token', 'a', expect.objectContaining({ httpOnly: true }));
    expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'r', expect.objectContaining({ httpOnly: true }));
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it('clears cookies on logout', async () => {
    const res: any = { clearCookie: jest.fn(), json: jest.fn() };
    await ctrl.logout({ cookies: { refresh_token: 'r' } } as any, res);
    expect(svc.logout).toHaveBeenCalledWith('r');
    expect(res.clearCookie).toHaveBeenCalledWith('access_token');
    expect(res.clearCookie).toHaveBeenCalledWith('refresh_token');
  });
});

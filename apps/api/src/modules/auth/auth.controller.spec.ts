import { AuthController } from "./auth.controller";
import { mock } from "jest-mock-extended";
import { AuthService } from "./auth.service";
import { CartService } from "../cart/cart.service";

describe("AuthController", () => {
  const svc = mock<AuthService>();
  const cart = mock<CartService>();
  const ctrl = new AuthController(svc, cart);

  beforeEach(() => jest.resetAllMocks());

  function makeAccessToken(sub: string): string {
    const payload = Buffer.from(JSON.stringify({ sub })).toString("base64url");
    return `header.${payload}.sig`;
  }

  it("sets cookies on login", async () => {
    svc.login.mockResolvedValueOnce({
      accessToken: makeAccessToken("u1"),
      refreshToken: "r",
    });
    const res: any = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
      json: jest.fn(),
    };
    const req: any = { cookies: {} };
    await ctrl.login({ email: "a@b.c", password: "pw123456" }, req, res);
    expect(res.cookie).toHaveBeenCalledWith(
      "access_token",
      expect.any(String),
      expect.objectContaining({ httpOnly: true }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      "refresh_token",
      "r",
      expect.objectContaining({ httpOnly: true }),
    );
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it("merges guest cart on login when guest_token cookie present", async () => {
    svc.login.mockResolvedValueOnce({
      accessToken: makeAccessToken("u1"),
      refreshToken: "r",
    });
    const res: any = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
      json: jest.fn(),
    };
    const req: any = { cookies: { guest_token: "gt1" } };
    await ctrl.login({ email: "a@b.c", password: "pw123456" }, req, res);
    expect(cart.mergeGuestIntoUser).toHaveBeenCalledWith("gt1", "u1");
    expect(res.clearCookie).toHaveBeenCalledWith(
      "guest_token",
      expect.any(Object),
    );
  });

  it("clears cookies on logout with matching cookie options (so prod domain cookies are removed)", async () => {
    const res: any = { clearCookie: jest.fn(), json: jest.fn() };
    await ctrl.logout({ cookies: { refresh_token: "r" } } as any, res);
    expect(svc.logout).toHaveBeenCalledWith("r");
    expect(res.clearCookie).toHaveBeenCalledWith(
      "access_token",
      expect.objectContaining({ httpOnly: true, path: "/" }),
    );
    expect(res.clearCookie).toHaveBeenCalledWith(
      "refresh_token",
      expect.objectContaining({ httpOnly: true, path: "/" }),
    );
  });

  it("forces Secure when sameSite=none (browsers reject None without Secure)", async () => {
    const prev = process.env.COOKIE_SAMESITE;
    process.env.COOKIE_SAMESITE = "none";
    svc.login.mockResolvedValueOnce({
      accessToken: makeAccessToken("u1"),
      refreshToken: "r",
    });
    const res: any = { cookie: jest.fn(), clearCookie: jest.fn(), json: jest.fn() };
    await ctrl.login(
      { email: "a@b.c", password: "pw123456" },
      { cookies: {} } as any,
      res,
    );
    expect(res.cookie).toHaveBeenCalledWith(
      "access_token",
      expect.any(String),
      expect.objectContaining({ sameSite: "none", secure: true }),
    );
    process.env.COOKIE_SAMESITE = prev;
  });

  it("defaults to sameSite=lax when COOKIE_SAMESITE is unset", async () => {
    const prev = process.env.COOKIE_SAMESITE;
    delete process.env.COOKIE_SAMESITE;
    svc.login.mockResolvedValueOnce({
      accessToken: makeAccessToken("u1"),
      refreshToken: "r",
    });
    const res: any = { cookie: jest.fn(), clearCookie: jest.fn(), json: jest.fn() };
    await ctrl.login(
      { email: "a@b.c", password: "pw123456" },
      { cookies: {} } as any,
      res,
    );
    expect(res.cookie).toHaveBeenCalledWith(
      "access_token",
      expect.any(String),
      expect.objectContaining({ sameSite: "lax" }),
    );
    process.env.COOKIE_SAMESITE = prev;
  });
});

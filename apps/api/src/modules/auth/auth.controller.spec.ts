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

  it("clears cookies on logout", async () => {
    const res: any = { clearCookie: jest.fn(), json: jest.fn() };
    await ctrl.logout({ cookies: { refresh_token: "r" } } as any, res);
    expect(svc.logout).toHaveBeenCalledWith("r");
    expect(res.clearCookie).toHaveBeenCalledWith("access_token");
    expect(res.clearCookie).toHaveBeenCalledWith("refresh_token");
  });
});

import { mockDeep, mockReset } from "jest-mock-extended";
import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UsersService } from "./users.service";

const prisma = mockDeep<PrismaService>();
const svc = new UsersService(prisma);

describe("UsersService.findMe", () => {
  beforeEach(() => mockReset(prisma));

  it("returns the current user without password hash", async () => {
    (prisma.user as any).findUnique.mockResolvedValueOnce({
      id: "u1",
      email: "a@b.c",
      fullName: "A",
      phone: null,
      passwordHash: "h",
      roleId: "r1",
      role: { name: "admin" },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const out = await svc.findMe("u1");
    expect(out).not.toHaveProperty("passwordHash");
    expect(out.email).toBe("a@b.c");
  });

  it("throws 404 if user gone", async () => {
    (prisma.user as any).findUnique.mockResolvedValueOnce(null);
    await expect(svc.findMe("u1")).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("UsersService.updateMe", () => {
  beforeEach(() => mockReset(prisma));

  it("updates fullName and phone only", async () => {
    (prisma.user as any).update.mockResolvedValueOnce({
      id: "u1",
      email: "a@b.c",
      fullName: "New",
      phone: "300",
      passwordHash: "h",
      roleId: "r1",
      role: { name: "admin" },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const out = await svc.updateMe("u1", { fullName: "New", phone: "300" });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { fullName: "New", phone: "300" },
      include: { role: true },
    });
    expect(out.fullName).toBe("New");
  });
});

describe("UsersService admin ops", () => {
  beforeEach(() => mockReset(prisma));

  it("creates a user with hashed password", async () => {
    (prisma.user as any).create.mockResolvedValueOnce({
      id: "u2",
      email: "x@y.z",
      fullName: "X",
      phone: null,
      passwordHash: "HASHED",
      roleId: "r1",
      role: { name: "admin" },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const out = await svc.create({
      email: "x@y.z",
      password: "password1",
      fullName: "X",
      roleId: "r1",
    });
    const call = (prisma.user.create as jest.Mock).mock.calls[0][0];
    expect(call.data.passwordHash).not.toBe("password1");
    expect(call.data.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(out).not.toHaveProperty("passwordHash");
  });

  it("lists users without password hashes", async () => {
    (prisma.user as any).findMany.mockResolvedValueOnce([
      {
        id: "u1",
        email: "a@b.c",
        fullName: "A",
        phone: null,
        passwordHash: "h",
        roleId: "r1",
        role: { name: "admin" },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const out = await svc.findAll();
    expect(out[0]).not.toHaveProperty("passwordHash");
  });
});

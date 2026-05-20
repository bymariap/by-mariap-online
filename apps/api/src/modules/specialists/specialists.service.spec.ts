import { mockDeep, mockReset } from "jest-mock-extended";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { SpecialistsService } from "./specialists.service";

const prisma = mockDeep<PrismaService>();
const svc = new SpecialistsService(prisma);

describe("SpecialistsService", () => {
  beforeEach(() => mockReset(prisma));

  it("upserts a specialist when user has role specialist", async () => {
    (prisma.user as any).findUnique.mockResolvedValueOnce({
      id: "u1",
      role: { name: "specialist" },
    });
    (prisma.specialist as any).upsert.mockResolvedValueOnce({
      id: "s1",
      userId: "u1",
      bio: "hi",
      specialties: ["cejas"],
      avatarUrl: null,
    });
    const out = await svc.upsert("u1", { bio: "hi", specialties: ["cejas"] });
    expect(out.id).toBe("s1");
    expect(prisma.specialist.upsert).toHaveBeenCalledWith({
      where: { userId: "u1" },
      create: {
        userId: "u1",
        bio: "hi",
        specialties: ["cejas"],
        avatarUrl: undefined,
      },
      update: { bio: "hi", specialties: ["cejas"], avatarUrl: undefined },
    });
  });

  it("rejects when user role is not specialist", async () => {
    (prisma.user as any).findUnique.mockResolvedValueOnce({
      id: "u1",
      role: { name: "customer" },
    });
    await expect(svc.upsert("u1", {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("throws 404 when user not found", async () => {
    (prisma.user as any).findUnique.mockResolvedValueOnce(null);
    await expect(svc.upsert("x", {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it("lists specialists with linked user data", async () => {
    (prisma.specialist as any).findMany.mockResolvedValueOnce([
      {
        id: "s1",
        userId: "u1",
        bio: null,
        specialties: [],
        avatarUrl: null,
        user: { id: "u1", fullName: "A", email: "a@b.c" },
      },
    ]);
    const out = await svc.findAll();
    expect(out[0].user.fullName).toBe("A");
  });
});

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const PERMISSIONS: string[] = [
  "*",
  // users
  "users:read",
  "users:write",
  // rbac
  "rbac:read",
  "rbac:write",
  // products (defined for later phases, seeded now so role mapping is stable)
  "products:read",
  "products:write",
  // orders
  "orders:read",
  "orders:read:own",
  "orders:write",
  "orders:write:status",
  // invoices
  "invoices:read",
  // analytics
  "analytics:read",
  // customers
  "customers:read",
  // me
  "me:read",
  "me:write",
  // cart
  "cart:read:own",
  "cart:write:own",
  // appointments
  "appointments:read",
  "appointments:read:own",
  "appointments:write",
  "appointments:write:own",
  // availability
  "availability:read",
  "availability:write:own",
  // services
  "services:read",
  "services:write",
  // client-record
  "client-record:read:own_assigned",
  "client-record:write:own_assigned",
];

const ROLE_PERMS: Record<string, string[]> = {
  admin: ["*"],
  finance: [
    "orders:read",
    "orders:write:status",
    "invoices:read",
    "analytics:read",
    "customers:read",
  ],
  specialist: [
    "appointments:read:own",
    "appointments:write:own",
    "availability:write:own",
    "client-record:read:own_assigned",
    "client-record:write:own_assigned",
    "services:read",
  ],
  customer: [
    "cart:read:own",
    "cart:write:own",
    "orders:read:own",
    "appointments:read:own",
    "appointments:write:own",
    "me:read",
    "me:write",
  ],
};

async function main() {
  for (const key of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key },
    });
  }

  for (const roleName of Object.keys(ROLE_PERMS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
    const perms = await prisma.permission.findMany({
      where: { key: { in: ROLE_PERMS[roleName] } },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });
  }

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: "admin" },
  });
  const email = process.env.SEED_ADMIN_EMAIL!;
  const pw = process.env.SEED_ADMIN_PASSWORD!;
  if (!email || !pw)
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD required");
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      fullName: "Admin",
      roleId: adminRole.id,
      passwordHash: await bcrypt.hash(pw, 12),
    },
  });
  console.log("seed: ok");
}

main().finally(() => prisma.$disconnect());

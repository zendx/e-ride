import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await hash("Passw0rd!", 12);

  const carrygoAdmin = await prisma.user.upsert({
    where: { email: "superadmin@carrygo.com" },
    update: {},
    create: {
      email: "superadmin@carrygo.com",
      fullName: "CarryGo Super Admin",
      role: Role.super_admin,
      passwordHash: password
    }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: carrygoAdmin.id,
      actorRole: Role.super_admin,
      action: "seed.initialized",
      entityType: "platform",
      entityId: carrygoAdmin.id,
      afterJson: { superAdminEmail: carrygoAdmin.email }
    }
  });

  console.log("Seed complete");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// Backfills missing (role, permission) rows for every school that already has
// a customised permission matrix — used when the permission catalog grows so
// existing schools gain the new permissions without losing customisations.
// Run: npm run backfill:perms
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { DEFAULT_ROLE_PERMISSIONS } = require('../src/utils/permissions');

const backfill = async () => {
  const schools = await prisma.school.findMany({ select: { id: true } });
  let added = 0;
  for (const school of schools) {
    for (const [role, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      const existing = await prisma.rolePermission.findMany({
        where: { schoolId: school.id, role },
        select: { permission: true },
      });
      if (existing.length === 0) continue; // school uses code defaults — nothing to add
      const have = new Set(existing.map((e) => e.permission));
      const missing = permissions.filter((p) => !have.has(p));
      if (missing.length > 0) {
        await prisma.rolePermission.createMany({
          data: missing.map((permission) => ({ schoolId: school.id, role, permission })),
        });
        added += missing.length;
        console.log(`school ${school.id}: ${role} +${missing.length} (${missing.join(', ')})`);
      }
    }
  }
  console.log(`Backfill complete — ${added} permission(s) added.`);
};

backfill()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

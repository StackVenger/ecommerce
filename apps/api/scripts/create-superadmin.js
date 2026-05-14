/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/explicit-function-return-type */
/*
 * Idempotent super-admin bootstrap for a fresh deploy.
 *
 * Run inside the API container:
 *   docker compose exec api node /app/apps/api/scripts/create-superadmin.js
 *
 * Env overrides (optional):
 *   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FIRST_NAME, ADMIN_LAST_NAME
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const EMAIL = process.env.ADMIN_EMAIL || 'admin@tanjib.com';
const PASSWORD = process.env.ADMIN_PASSWORD || 'Takay$ane';
const FIRST = process.env.ADMIN_FIRST_NAME || 'Super';
const LAST = process.env.ADMIN_LAST_NAME || 'Admin';

async function main() {
  const prisma = new PrismaClient();
  try {
    const hash = await bcrypt.hash(PASSWORD, 10);
    const user = await prisma.user.upsert({
      where: { email: EMAIL },
      update: {
        password: hash,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        emailVerified: true,
        firstName: FIRST,
        lastName: LAST,
      },
      create: {
        email: EMAIL,
        password: hash,
        firstName: FIRST,
        lastName: LAST,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        emailVerified: true,
      },
      select: { id: true, email: true, role: true, status: true, emailVerified: true },
    });
    console.log('[create-superadmin] OK', user);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[create-superadmin] FAILED', err);
  process.exit(1);
});

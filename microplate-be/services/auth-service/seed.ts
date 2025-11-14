import { PrismaClient } from '@prisma/client';
import { PasswordUtil } from './src/utils/password.util';
import { logger } from './src/utils/logger';

const prisma = new PrismaClient();

async function main() {
  logger.info('🌱 Starting database seeding...');

  // Create default roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'Administrator role with full access',
      permissions: ['*']
    }
  });

  const userRole = await prisma.role.upsert({
    where: { name: 'user' },
    update: {},
    create: {
      name: 'user',
      description: 'Regular user role',
      permissions: ['read', 'write']
    }
  });

  logger.info('✅ Roles created');

  // Create test user
  const hashedPassword = await PasswordUtil.hash('password123');
  
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      username: 'testuser',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
      emailVerified: true
    }
  });

  // Assign user role to test user
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: testUser.id,
        roleId: userRole.id
      }
    },
    update: {},
    create: {
      userId: testUser.id,
      roleId: userRole.id
    }
  });

  logger.info('✅ Test user created', {
    email: 'test@example.com',
    username: 'testuser',
  });
  logger.info('🔑 Temporary password issued for test user', { password: 'password123' });

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      username: 'admin',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      isActive: true,
      emailVerified: true
    }
  });

  // Assign admin role to admin user
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id
      }
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id
    }
  });

  logger.info('✅ Admin user created', {
    email: 'admin@example.com',
    username: 'admin',
  });
  logger.info('🔑 Temporary password issued for admin user', { password: 'password123' });

  logger.info('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    logger.error('❌ Seeding failed', { error: e });
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

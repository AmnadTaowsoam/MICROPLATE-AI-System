import { PrismaClient } from '@prisma/client';
import { PasswordUtil } from './src/utils/password.util';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

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

  console.log('✅ Roles created');

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

  console.log('✅ Test user created');
  console.log('📧 Email: test@example.com');
  console.log('👤 Username: testuser');
  console.log('🔑 Password: password123');

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

  console.log('✅ Admin user created');
  console.log('📧 Email: admin@example.com');
  console.log('👤 Username: admin');
  console.log('🔑 Password: password123');

  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

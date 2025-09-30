import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupTestUser() {
  console.log('🧹 Cleaning up test user and subscriptions...');

  try {
    const testEmail = 'test-notifications@wisc.edu';

    // Find the test user
    const testUser = await prisma.user.findUnique({
      where: { email: testEmail },
      include: {
        subscriptions: true,
        settings: true
      }
    });

    if (!testUser) {
      console.log('✅ No test user found - already clean!');
      return;
    }

    console.log(`Found test user: ${testUser.email}`);
    console.log(`- Subscriptions: ${testUser.subscriptions.length}`);
    console.log(`- Settings: ${testUser.settings ? 'Yes' : 'No'}`);

    // Delete subscriptions first
    if (testUser.subscriptions.length > 0) {
      await prisma.subscription.deleteMany({
        where: { userId: testUser.id }
      });
      console.log(`🗑️ Deleted ${testUser.subscriptions.length} subscriptions`);
    }

    // Delete settings if they exist
    if (testUser.settings) {
      await prisma.userSettings.delete({
        where: { userId: testUser.id }
      });
      console.log('🗑️ Deleted user settings');
    }

    // Delete the user
    await prisma.user.delete({
      where: { id: testUser.id }
    });

    console.log('✅ Test user and all related data deleted successfully!');
    console.log('🎉 No more bounce emails should be sent to test-notifications@wisc.edu');

  } catch (error) {
    console.error('❌ Error cleaning up test user:', error);
  }
}

cleanupTestUser()
  .finally(() => {
    prisma.$disconnect();
    process.exit(0);
  });
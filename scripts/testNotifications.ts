import { NotificationService } from '../utils/emailService';
import { SubscriptionService } from '../utils/subscriptionService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const notificationService = new NotificationService();
const subscriptionService = new SubscriptionService();

async function testNotificationSystem() {
  console.log('🧪 Testing notification system...\n');

  try {
    // Step 1: Create a test subscription
    console.log('1. Creating test subscription...');
    
    // First, let's see what menu items we have for today
    const today = new Date().toISOString().split('T')[0];
    const todayMenuItems = await prisma.menuItem.findMany({
      where: { date: today },
      take: 1
    });

    if (todayMenuItems.length === 0) {
      console.log('❌ No menu items found for today. Let\'s check what dates we have data for:');
      const availableDates = await prisma.menuItem.findMany({
        select: { date: true },
        distinct: ['date'],
        orderBy: { date: 'desc' },
        take: 5
      });
      console.log('Available dates:', availableDates.map(item => item.date));
      
      if (availableDates.length > 0) {
        const testDate = availableDates[0].date;
        console.log(`\nUsing test date: ${testDate}`);
        
        const testMenuItem = await prisma.menuItem.findFirst({
          where: { date: testDate }
        });
        
        if (testMenuItem) {
          console.log('Creating subscription for:', testMenuItem.name);
          // Note: Using your actual email for testing to avoid bounce-backs
          // Change this to your real email address when testing
          const testEmail = process.env.TEST_EMAIL || 'your-email@example.com';
          console.log(`Using test email: ${testEmail}`);

          await subscriptionService.createSubscription({
            email: testEmail,
            foodId: testMenuItem.foodId,
            foodName: testMenuItem.name
          });
          
          // Test notifications for that specific date
          console.log(`\n2. Testing notifications for ${testDate}...`);
          const testDateObj = new Date(testDate);
          const result = await notificationService.checkAndSendNotifications(testDateObj);
          console.log(`Notification test result: ${result} notifications would be sent`);
        }
      }
    } else {
      const testMenuItem = todayMenuItems[0];
      console.log('Creating subscription for today\'s item:', testMenuItem.name);
      
      // Note: Using your actual email for testing to avoid bounce-backs
      // Change this to your real email address when testing
      const testEmail = process.env.TEST_EMAIL || 'your-email@example.com';
      console.log(`Using test email: ${testEmail}`);

      await subscriptionService.createSubscription({
        email: testEmail,
        foodId: testMenuItem.foodId,
        foodName: testMenuItem.name
      });

      // Step 2: Test notification checking
      console.log('\n2. Testing notification system for today...');
      const result = await notificationService.checkAndSendNotifications();
      console.log(`Notification test result: ${result} notifications would be sent`);
    }

    // Step 3: Show what would happen without actually sending emails
    console.log('\n3. Testing notification logic (dry run)...');
    const testEmail = process.env.TEST_EMAIL || 'your-email@example.com';
    const users = await prisma.user.findMany({
      where: { email: testEmail },
      include: {
        subscriptions: {
          where: { isActive: true }
        }
      }
    });

    if (users.length > 0) {
      const user = users[0];
      console.log('Test user subscriptions:', user.subscriptions.map(s => s.foodName));
      
      for (const subscription of user.subscriptions) {
        const matches = await prisma.menuItem.findMany({
          where: {
            foodId: subscription.foodId
          },
          take: 3
        });
        console.log(`Matches for "${subscription.foodName}":`, matches.length);
      }
    }

    console.log('\n✅ Notification system test completed!');
    console.log('\n📧 Note: To actually send emails, you need to configure these environment variables:');
    console.log('- SMTP_HOST');
    console.log('- SMTP_USER');
    console.log('- SMTP_PASS');
    console.log('- SMTP_FROM');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testNotificationSystem()
  .finally(() => {
    prisma.$disconnect();
    process.exit(0);
  });
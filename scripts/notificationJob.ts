import { NotificationService } from '../utils/emailService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const notificationService = new NotificationService();

async function runNotificationJob() {
  console.log('🚀 Starting daily notification job...');
  
  try {
    // Check for today's menu items and send notifications
    const notificationCount = await notificationService.checkAndSendNotifications();
    
    if (notificationCount > 0) {
      console.log(`✅ Successfully sent ${notificationCount} notifications`);
    } else {
      console.log('📭 No notifications sent (no matches found)');
    }
    
  } catch (error) {
    console.error('❌ Error running notification job:', error);
    process.exit(1);
  }
}

runNotificationJob()
  .catch((error) => {
    console.error('Fatal error in notification job:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('🏁 Notification job completed');
    prisma.$disconnect();
  });
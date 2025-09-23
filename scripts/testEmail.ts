import { EmailService } from '../utils/emailService';

async function testEmail() {
  console.log('🧪 Testing email configuration...');

  const emailService = new EmailService();

  // Test notification
  const testNotification = {
    email: process.env.SMTP_USER!, // Send test email to yourself
    matches: [
      {
        foodId: 'test-123',
        foodName: 'Test Pizza',
        diningHall: 'gordon-avenue-market',
        meal: 'dinner',
        date: new Date().toISOString().split('T')[0]
      }
    ]
  };

  try {
    const result = await emailService.sendNotification(testNotification);

    if (result) {
      console.log('✅ Email sent successfully!');
      console.log(`Check your inbox at ${process.env.SMTP_USER}`);
    } else {
      console.log('❌ Email failed to send');
    }
  } catch (error) {
    console.error('❌ Email error:', error);
  }
}

testEmail();
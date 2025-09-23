import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface MenuMatch {
  foodId: string;
  foodName: string;
  diningHall: string;
  meal: string;
  date: string;
}

export interface UserNotification {
  email: string;
  matches: MenuMatch[];
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure email transporter - you'll need to set these environment variables
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendNotification(notification: UserNotification) {
    const subject = `🍽️ Your favorite foods are available today!`;
    
    const htmlContent = this.generateEmailHTML(notification);
    const textContent = this.generateEmailText(notification);

    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"Bucky\'s Menu" <noreply@buckys-menu.com>',
        to: notification.email,
        subject: subject,
        text: textContent,
        html: htmlContent,
      });

      console.log(`Email sent to ${notification.email}:`, info.messageId);
      return true;
    } catch (error) {
      console.error(`Failed to send email to ${notification.email}:`, error);
      return false;
    }
  }

  private generateEmailHTML(notification: UserNotification): string {
    const matchesHTML = notification.matches.map(match => `
      <div style="background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 8px;">
        <h3 style="margin: 0 0 10px 0; color: #c5050c;">${match.foodName}</h3>
        <p style="margin: 5px 0; color: #666;">
          <strong>Location:</strong> ${this.formatDiningHall(match.diningHall)}<br>
          <strong>Meal:</strong> ${this.formatMeal(match.meal)}<br>
          <strong>Date:</strong> ${this.formatDate(match.date)}
        </p>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Your Menu Notifications</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #c5050c;">🍽️ Bucky's Menu Alert</h1>
          <p style="color: #666; font-size: 16px;">Your subscribed foods are available today!</p>
        </div>
        
        <div>
          ${matchesHTML}
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px;">
          <p>You're receiving this because you subscribed to menu notifications.</p>
          <p>Don't want these emails? Reply to unsubscribe.</p>
        </div>
      </body>
      </html>
    `;
  }

  private generateEmailText(notification: UserNotification): string {
    const matchesText = notification.matches.map(match => 
      `• ${match.foodName} at ${this.formatDiningHall(match.diningHall)} (${this.formatMeal(match.meal)}) on ${this.formatDate(match.date)}`
    ).join('\n');

    return `
🍽️ Bucky's Menu Alert

Your subscribed foods are available today!

${matchesText}

---
You're receiving this because you subscribed to menu notifications.
Don't want these emails? Reply to unsubscribe.
    `.trim();
  }

  private formatDiningHall(diningHall: string): string {
    return diningHall
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private formatMeal(meal: string): string {
    return meal.charAt(0).toUpperCase() + meal.slice(1);
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
}

export class NotificationService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  async checkAndSendNotifications(targetDate?: Date): Promise<number> {
    const date = targetDate || new Date();
    const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    console.log(`Checking for menu notifications for ${dateString}...`);

    // Get all active subscriptions
    const users = await prisma.user.findMany({
      include: {
        subscriptions: {
          where: { isActive: true }
        }
      }
    });

    let notificationsSent = 0;

    for (const user of users) {
      if (user.subscriptions.length === 0) continue;

      // Find menu items that match user's subscriptions for today
      const matches: MenuMatch[] = [];
      
      for (const subscription of user.subscriptions) {
        const menuItems = await prisma.menuItem.findMany({
          where: {
            foodId: subscription.foodId,
            date: dateString
          }
        });

        for (const menuItem of menuItems) {
          matches.push({
            foodId: menuItem.foodId,
            foodName: subscription.foodName,
            diningHall: menuItem.diningHall,
            meal: menuItem.meal,
            date: menuItem.date
          });
        }
      }

      // Send notification if there are matches
      if (matches.length > 0) {
        const notification: UserNotification = {
          email: user.email,
          matches: matches
        };

        const sent = await this.emailService.sendNotification(notification);
        if (sent) {
          notificationsSent++;
          console.log(`✅ Sent notification to ${user.email} for ${matches.length} items`);
        } else {
          console.log(`❌ Failed to send notification to ${user.email}`);
        }
      }
    }

    console.log(`📧 Sent ${notificationsSent} notifications total`);
    return notificationsSent;
  }
}
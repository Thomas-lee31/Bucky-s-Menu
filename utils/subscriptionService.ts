import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateSubscriptionData {
  email: string;
  foodId: string;
  foodName: string;
}

export interface SubscriptionResponse {
  id: string;
  foodId: string;
  foodName: string;
  isActive: boolean;
  createdAt: Date;
}

export class SubscriptionService {
  async createUser(email: string) {
    try {
      const user = await prisma.user.create({
        data: { email }
      });
      return user;
    } catch (error: any) {
      if (error.code === 'P2002') {
        const existingUser = await prisma.user.findUnique({
          where: { email }
        });
        return existingUser;
      }
      throw error;
    }
  }

  async createSubscription(data: CreateSubscriptionData): Promise<SubscriptionResponse> {
    const user = await this.createUser(data.email);
    
    if (!user) {
      throw new Error('Failed to create or find user');
    }

    const subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        foodId: data.foodId,
        foodName: data.foodName,
        isActive: true
      }
    });

    return {
      id: subscription.id,
      foodId: subscription.foodId,
      foodName: subscription.foodName,
      isActive: subscription.isActive,
      createdAt: subscription.createdAt
    };
  }

  async getUserSubscriptions(email: string): Promise<SubscriptionResponse[]> {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        subscriptions: {
          where: { isActive: true }
        }
      }
    });

    if (!user) {
      return [];
    }

    return user.subscriptions.map(sub => ({
      id: sub.id,
      foodId: sub.foodId,
      foodName: sub.foodName,
      isActive: sub.isActive,
      createdAt: sub.createdAt
    }));
  }

  async removeSubscription(email: string, foodId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return false;
    }

    const result = await prisma.subscription.updateMany({
      where: {
        userId: user.id,
        foodId: foodId
      },
      data: {
        isActive: false
      }
    });

    return result.count > 0;
  }

  async getActiveSubscriptions(): Promise<Array<{
    email: string;
    subscriptions: SubscriptionResponse[];
  }>> {
    const users = await prisma.user.findMany({
      include: {
        subscriptions: {
          where: { isActive: true }
        }
      }
    });

    return users
      .filter(user => user.subscriptions.length > 0)
      .map(user => ({
        email: user.email,
        subscriptions: user.subscriptions.map(sub => ({
          id: sub.id,
          foodId: sub.foodId,
          foodName: sub.foodName,
          isActive: sub.isActive,
          createdAt: sub.createdAt
        }))
      }));
  }
}
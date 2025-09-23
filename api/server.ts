import express from 'express';
import cors from 'cors';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { SubscriptionService } from '../utils/subscriptionService';
import { AuthService } from '../utils/authService';

const app = express();
const port = process.env.PORT || 3000;
const prisma = new PrismaClient();
const subscriptionService = new SubscriptionService();
const authService = new AuthService();

app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Config endpoint for frontend
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY
  });
});

// Auth endpoints
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    const result = await authService.signUp({ email, password });

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json({ user: result.user });
  } catch (error: any) {
    console.error('Sign up error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    const result = await authService.signIn({ email, password });

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ user: result.user });
  } catch (error: any) {
    console.error('Sign in error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/google', async (req, res) => {
  try {
    const redirectUrl = req.query.redirect as string;
    const result = await authService.signInWithGoogle(redirectUrl);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    if (result.url) {
      return res.redirect(result.url);
    }

    res.status(400).json({ error: 'Failed to initiate Google sign in' });
  } catch (error: any) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/auth/callback', async (req, res) => {
  try {
    console.log('🔍 OAuth callback received:', {
      query: req.query,
      url: req.url
    });

    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      console.log('❌ Missing or invalid code parameter:', { code, query: req.query });
      return res.redirect('/?error=missing_code');
    }

    const result = await authService.handleOAuthCallback(code);

    if (result.error) {
      return res.redirect(`/?error=${encodeURIComponent(result.error)}`);
    }

    // Redirect to frontend with success
    res.redirect('/?auth=success');
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    res.redirect('/?error=callback_failed');
  }
});

app.post('/api/auth/signout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ error: 'Access token required' });
    }

    const accessToken = authHeader.substring(7);
    const result = await authService.signOut(accessToken);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ message: 'Signed out successfully' });
  } catch (error: any) {
    console.error('Sign out error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const accessToken = authHeader.substring(7);
    const result = await authService.verifyToken(accessToken);

    if (result.error) {
      return res.status(401).json({ error: result.error });
    }

    res.json({ user: result.user });
  } catch (error: any) {
    console.error('Auth verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Auth middleware
async function requireAuth(req: any, res: any, next: any) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const accessToken = authHeader.substring(7);
    const result = await authService.verifyToken(accessToken);

    if (result.error) {
      return res.status(401).json({ error: result.error });
    }

    req.user = result.user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

// Create subscription (now requires authentication)
app.post('/api/subscribe', requireAuth, async (req: any, res) => {
  try {
    const { foodId, foodName } = req.body;

    if (!foodId || !foodName) {
      return res.status(400).json({
        error: 'Missing required fields: foodId, foodName'
      });
    }

    const subscription = await subscriptionService.createSubscription({
      email: req.user.email,
      foodId,
      foodName
    });

    res.status(201).json(subscription);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'Subscription already exists for this food'
      });
    }

    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user subscriptions (now requires authentication)
app.get('/api/subscriptions', requireAuth, async (req: any, res) => {
  try {
    const subscriptions = await subscriptionService.getUserSubscriptions(req.user.email);
    res.json(subscriptions);
  } catch (error) {
    console.error('Error getting subscriptions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove subscription (now requires authentication)
app.delete('/api/unsubscribe', requireAuth, async (req: any, res) => {
  try {
    const { foodId } = req.body;

    if (!foodId) {
      return res.status(400).json({
        error: 'Missing required field: foodId'
      });
    }

    const success = await subscriptionService.removeSubscription(req.user.email, foodId);

    if (!success) {
      return res.status(404).json({
        error: 'Subscription not found'
      });
    }

    res.json({ message: 'Subscription removed successfully' });
  } catch (error) {
    console.error('Error removing subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search foods for autocomplete
app.get('/api/foods/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    if (q.length < 2) {
      return res.json([]);
    }

    // Search for unique food names that contain the query (case insensitive)
    const foods = await prisma.menuItem.findMany({
      where: {
        name: {
          contains: q,
          mode: 'insensitive'
        }
      },
      select: {
        foodId: true,
        name: true
      },
      distinct: ['foodId'],
      take: 20
    });

    res.json(foods);
  } catch (error) {
    console.error('Error searching foods:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get today's menu by dining hall and meal
app.get('/api/menu/today', async (req, res) => {
  try {
    const { diningHall, meal } = req.query;
    const today = new Date().toISOString().split('T')[0];

    const where: any = { date: today };
    if (diningHall) where.diningHall = diningHall;
    if (meal) where.meal = meal;

    const menuItems = await prisma.menuItem.findMany({
      where,
      orderBy: [
        { diningHall: 'asc' },
        { meal: 'asc' },
        { name: 'asc' }
      ]
    });

    res.json(menuItems);
  } catch (error) {
    console.error('Error getting today\'s menu:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler - must be last
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(port, () => {
  console.log(`🚀 API server running on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});
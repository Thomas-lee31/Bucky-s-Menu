import { createClient, SupabaseClient, User, AuthError } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_ANON_KEY');
}

export interface AuthUser {
  id: string;
  email: string;
  supabaseId: string;
}

export interface SignUpData {
  email: string;
  password: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: AuthUser | null;
  error: string | null;
}

export class AuthService {
  private supabase: SupabaseClient;
  private prisma: PrismaClient;

  constructor(prismaClient: PrismaClient) {
    this.supabase = createClient(supabaseUrl!, supabaseAnonKey!);
    this.prisma = prismaClient;
  }

  async signUp(data: SignUpData): Promise<AuthResponse> {
    try {
      const { data: authData, error } = await this.supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (!authData.user) {
        return { user: null, error: 'Failed to create user' };
      }

      // Create user in our database
      const user = await this.createOrGetUser(authData.user);

      return {
        user: {
          id: user.id,
          email: user.email,
          supabaseId: user.supabaseId
        },
        error: null
      };
    } catch (error: any) {
      return { user: null, error: error.message || 'Sign up failed' };
    }
  }

  async signIn(data: SignInData): Promise<AuthResponse> {
    try {
      const { data: authData, error } = await this.supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (!authData.user) {
        return { user: null, error: 'Sign in failed' };
      }

      // Get or create user in our database
      const user = await this.createOrGetUser(authData.user);

      return {
        user: {
          id: user.id,
          email: user.email,
          supabaseId: user.supabaseId
        },
        error: null
      };
    } catch (error: any) {
      return { user: null, error: error.message || 'Sign in failed' };
    }
  }

  async signInWithGoogle(redirectUrl?: string): Promise<{ url: string | null; error: string | null }> {
    try {
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl || `${process.env.APP_URL || 'http://localhost:3000'}`,
          scopes: 'email profile'
        }
      });

      if (error) {
        return { url: null, error: error.message };
      }

      return { url: data.url, error: null };
    } catch (error: any) {
      return { url: null, error: error.message || 'Google sign in failed' };
    }
  }

  async signOut(accessToken: string): Promise<{ error: string | null }> {
    try {
      // Simply call signOut - Supabase will handle invalidating the token
      const { error } = await this.supabase.auth.signOut();

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error: any) {
      return { error: error.message || 'Sign out failed' };
    }
  }

  async verifyToken(accessToken: string): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      // Create a temporary client with the user's session
      const tempClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

      // Set the session using the access token
      const { data: { user }, error } = await tempClient.auth.getUser(accessToken);

      if (error) {
        return { user: null, error: error.message };
      }

      if (!user) {
        return { user: null, error: 'Invalid token' };
      }

      // Get user from our database
      const dbUser = await this.createOrGetUser(user);

      return {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          supabaseId: dbUser.supabaseId
        },
        error: null
      };
    } catch (error: any) {
      return { user: null, error: error.message || 'Token verification failed' };
    }
  }

  async handleOAuthCallback(code: string): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabase.auth.exchangeCodeForSession(code);

      if (error) {
        return { user: null, error: error.message };
      }

      if (!data.user) {
        return { user: null, error: 'OAuth callback failed' };
      }

      // Create or get user in our database
      const user = await this.createOrGetUser(data.user);

      return {
        user: {
          id: user.id,
          email: user.email,
          supabaseId: user.supabaseId
        },
        error: null
      };
    } catch (error: any) {
      return { user: null, error: error.message || 'OAuth callback failed' };
    }
  }

  private async createOrGetUser(supabaseUser: User) {
    try {
      // Try to find existing user by supabaseId
      let user = await this.prisma.user.findUnique({
        where: { supabaseId: supabaseUser.id }
      });

      if (!user) {
        // Try to find by email (for migration purposes)
        const existingEmailUser = await this.prisma.user.findUnique({
          where: { email: supabaseUser.email! }
        });

        if (existingEmailUser) {
          // Update existing user with supabaseId
          user = await this.prisma.user.update({
            where: { id: existingEmailUser.id },
            data: { supabaseId: supabaseUser.id }
          });
        } else {
          // Create new user
          user = await this.prisma.user.create({
            data: {
              supabaseId: supabaseUser.id,
              email: supabaseUser.email!,
            }
          });
        }
      }

      return user;
    } catch (error) {
      console.error('Error creating/getting user:', error);
      throw error;
    }
  }

  // Helper method to get current user from session
  async getCurrentUser(accessToken: string): Promise<AuthUser | null> {
    const result = await this.verifyToken(accessToken);
    return result.user;
  }
}
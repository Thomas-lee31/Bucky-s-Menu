# Deployment Guide - Render

## Database Connection String

**IMPORTANT**: Your DATABASE_URL must use port **6543** (Supabase Transaction Pooler) for serverless environments like Render.

### Correct Format:
```
postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### Key Points:
- Port: **6543** (transaction pooler, NOT 5432)
- Include `?pgbouncer=true` query parameter
- Use `pooler.supabase.com` subdomain

### Why Port 6543?
- **Port 5432**: Direct connection - maintains state, requires persistent connections
- **Port 6543**: Transaction pooler - stateless, perfect for serverless/Render
  - Automatically handles connection pooling
  - Works with short-lived containers
  - Prevents "Can't reach database server" errors

## Environment Variables in Render

Set these in your Render dashboard:

1. **DATABASE_URL**: Use the format above with port 6543
2. **SUPABASE_URL**: Your Supabase project URL
3. **SUPABASE_ANON_KEY**: Your Supabase anon/public key
4. **SMTP_HOST**: Email server host
5. **SMTP_PORT**: Email server port
6. **SMTP_USER**: Email username
7. **SMTP_PASS**: Email password
8. **SMTP_FROM**: From email address
9. **NODE_ENV**: `production`
10. **FRONTEND_URL**: Your frontend deployment URL (for CORS)

## Supabase Configuration

### Add Redirect URLs:
In Supabase Dashboard → Authentication → URL Configuration, add:
- `https://your-render-url.onrender.com/auth/callback`
- Your frontend deployment URL

### Verify Database Settings:
- Connection pooling: Enabled
- Transaction mode: Enabled (for port 6543)

## Deployment Steps

1. Push code to GitHub
2. Connect Render to your GitHub repo
3. Use `render.yaml` for configuration (already in repo)
4. Set environment variables in Render dashboard
5. Deploy!

## Troubleshooting

### "Can't reach database server" errors:
- ✅ Verify DATABASE_URL uses port **6543**
- ✅ Check `?pgbouncer=true` is in connection string
- ✅ Verify password is correctly included in URL
- ✅ Check Supabase project is not paused

### Auth not working:
- ✅ Add Render URL to Supabase redirect URLs
- ✅ Verify SUPABASE_URL and SUPABASE_ANON_KEY are set correctly
- ✅ Check CORS configuration includes your frontend URL

### Health Check:
Visit `https://your-app.onrender.com/health` to verify:
- Server is running
- Database connection is working

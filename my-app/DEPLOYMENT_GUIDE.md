# Vercel Deployment Guide for Next-CRM

## ✅ Issues Fixed

1. **Middleware Deprecation** - Migrated from `middleware.ts` to `proxy.ts` for Next.js 16 compatibility
2. **Duplicate Mongoose Indexes** - Removed duplicate indexes from User, Invoice, and Product models
3. **TSConfig JSX Setting** - Changed from `react-jsx` to `preserve` for Next.js
4. **Configuration Files** - Added `vercel.json` and environment template

## 📋 Pre-Deployment Checklist

### 1. Environment Variables Setup

You need to configure the following environment variables in your Vercel dashboard:

**Required Variables:**
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/crm-database?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

**Optional Variables:**
```
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NODE_ENV=production
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourapp.com
```

### 2. Vercel Project Settings

Configure these settings in your Vercel project dashboard:

- **Framework Preset:** Next.js
- **Root Directory:** `my-app` (if deploying from the nested structure)
- **Build Command:** `npm run build` (default)
- **Output Directory:** `.next` (default)
- **Install Command:** `npm install` (default)
- **Node.js Version:** 20.x (recommended)

### 3. MongoDB Atlas Setup

Ensure your MongoDB Atlas cluster is configured:

1. **Whitelist Vercel IPs:** Add `0.0.0.0/0` to allow connections from anywhere (Vercel uses dynamic IPs)
2. **Database User:** Create a database user with read/write permissions
3. **Connection String:** Copy the connection string and add it to Vercel environment variables

## 🚀 Deployment Steps

### Option 1: Deploy via Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your Git repository
4. Configure the settings:
   - Set **Root Directory** to `my-app`
   - Add all environment variables
5. Click "Deploy"

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to the project directory
cd my-app

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

## 🔍 Troubleshooting Common Issues

### Build Fails with "Module not found"

**Solution:** Ensure all imports use the `@/` alias correctly and all dependencies are in `package.json`

### Database Connection Error

**Symptoms:**
```
Error: Please define the MONGODB_URI environment variable
```

**Solution:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `MONGODB_URI` with your MongoDB connection string
3. Redeploy the project

### JWT Authentication Error

**Symptoms:**
```
Error: JWT_SECRET is not defined
```

**Solution:**
1. Add `JWT_SECRET` to Vercel environment variables
2. Use a strong, random string (at least 32 characters)
3. Redeploy the project

### Middleware/Proxy Error

**Symptoms:**
```
Error: Both middleware file and proxy file are detected
```

**Solution:**
- The old `middleware.ts` file has been removed
- Only `proxy.ts` should exist in the root directory
- If you still see this error, ensure `middleware.ts` is deleted and not in your Git repository

### Build Timeout

**Symptoms:**
```
Error: Build exceeded maximum duration
```

**Solution:**
1. Optimize dependencies
2. Remove unused packages
3. Consider upgrading to a Vercel Pro plan for longer build times

## 📊 Post-Deployment Verification

After deployment, verify the following:

1. **Homepage loads:** Visit your Vercel URL
2. **Database connection:** Try logging in or signing up
3. **API routes work:** Check `/api/auth/login` and other endpoints
4. **Authentication:** Ensure JWT tokens are being set correctly
5. **Dashboard access:** Verify protected routes redirect to login

## 🔐 Security Checklist

- [ ] `JWT_SECRET` is a strong, random string
- [ ] MongoDB connection string is secure and not exposed
- [ ] Environment variables are set in Vercel dashboard, not in code
- [ ] `.env.local` is in `.gitignore`
- [ ] CORS is properly configured for production domain
- [ ] Rate limiting is enabled for API routes (if applicable)

## 📝 Environment Variables Template

Copy this to your Vercel dashboard:

```bash
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/crm-database?retryWrites=true&w=majority

# Authentication
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NODE_ENV=production

# Email (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM=noreply@yourapp.com
```

## 🎯 Next Steps After Deployment

1. **Custom Domain:** Add a custom domain in Vercel settings
2. **SSL Certificate:** Vercel automatically provisions SSL certificates
3. **Monitoring:** Set up Vercel Analytics and monitoring
4. **Error Tracking:** Consider integrating Sentry or similar
5. **Performance:** Monitor Core Web Vitals in Vercel dashboard

## 📞 Support

If you encounter issues:

1. Check Vercel deployment logs
2. Review the build output for errors
3. Verify all environment variables are set correctly
4. Check MongoDB Atlas network access settings
5. Review the `VERCEL_DEPLOYMENT_ISSUES.md` file for detailed troubleshooting

## 🔄 Redeployment

To redeploy after making changes:

1. Push changes to your Git repository
2. Vercel will automatically trigger a new deployment
3. Or manually redeploy from Vercel dashboard

---

**Last Updated:** December 10, 2025
**Next.js Version:** 16.0.5
**Node.js Version:** 20.x

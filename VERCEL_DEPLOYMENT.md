# Vercel Deployment Guide for XueTong App

This guide will help you deploy your XueTong Chinese learning app to Vercel.

## Prerequisites

1. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository** - Your code should be on GitHub
3. **DeepSeek API Key** - Get from [platform.deepseek.com](https://platform.deepseek.com)

## Quick Deployment Steps

### Step 1: Push Code to GitHub

If you haven't already, push your code to GitHub:

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push
```

### Step 2: Deploy to Vercel

**Option A: Via Vercel Dashboard (Recommended)**

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Vercel will automatically detect your `vercel.json` configuration
5. Click **"Deploy"**

**Option B: Via Vercel CLI**

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### Step 3: Configure Environment Variables

After deployment, add your DeepSeek API key:

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

| Variable | Value | Description |
|----------|--------|-------------|
| `DEEPSEEK_API_KEY` | Your API key | DeepSeek API authentication |
| `NODE_ENV` | `production` | Environment mode |

4. Click **Save**
5. **Redeploy** your project (Settings → Deployments → Redeploy)

## Configuration Explained

Your `vercel.json` file is configured as:

### Functions (Serverless API)

| Function | Path | Memory | Duration |
|----------|-------|---------|-----------|
| Chat API | `/api/chat` | 1024 MB | 30s |
| Online Count | `/api/online-count` | 512 MB | 10s |
| Ping | `/api/ping` | 512 MB | 10s |

### Routes & Rewrites

- **API Routes:** `/api/*` → Serverless functions
- **Frontend Routes:** All routes → `xuetong-latest.html`
- **Output Directory:** Root directory (`.`)

## Deployment Features

✅ **Automatic HTTPS** - SSL certificates included
✅ **Global CDN** - Fast worldwide delivery
✅ **Serverless Functions** - Scalable API endpoints
✅ **Automatic Deployments** - Updates on git push
✅ **Preview Deployments** - Test changes before production
✅ **Custom Domains** - Add your own domain (optional)

## Testing Your Deployment

### 1. Check Deployment Status

After deployment, Vercel will provide:
- **Production URL:** `https://your-project.vercel.app`
- **Deployment Logs:** View in Vercel Dashboard

### 2. Test Frontend

Open your production URL and test:
- ✅ HSK vocabulary loading
- ✅ Flashcards
- ✅ Practice quizzes
- ✅ Progress tracking
- ✅ Search functionality
- ✅ Dark/Light mode

### 3. Test Backend (AI Tutor)

1. Go to **AI Tutor** tab
2. Send a test message
3. Verify you receive a response
4. Check browser console for errors

## Troubleshooting

### Issue 1: Build Fails

**Solution:**
- Check `vercel.json` syntax is valid JSON
- Verify all function files exist in `netlify/functions/api/`
- Check Vercel build logs for specific errors

### Issue 2: API Not Working

**Solution:**
- Verify `DEEPSEEK_API_KEY` is set in Vercel environment variables
- Check API key is valid and active
- View function logs in Vercel Dashboard
- Check browser console for API errors

### Issue 3: 404 Errors

**Solution:**
- Verify `xuetong-latest.html` is in repository root
- Check `vercel.json` routes configuration
- Ensure all files are committed to Git

### Issue 4: Functions Not Deploying

**Solution:**
- Verify function files have `exports.handler` export
- Check function syntax is correct
- Ensure `node_modules` is in `.vercelignore`
- Redeploy after changes

## Environment Variables Reference

### Required Variables:

```env
DEEPSEEK_API_KEY=your_actual_api_key_here
NODE_ENV=production
```

### Getting DeepSeek API Key:

1. Go to [platform.deepseek.com](https://platform.deepseek.com)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-`)
6. Add to Vercel environment variables

## Custom Domain (Optional)

### Add Your Own Domain:

1. Go to **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter your domain (e.g., `xuetong.yourdomain.com`)
4. Update DNS records as instructed
5. Wait for DNS propagation (5-10 minutes)

### Update DNS Records:

| Type | Name | Value |
|------|------|--------|
| CNAME | @ | cname.vercel-dns.com |

## Performance Optimization

### 1. Enable Caching

Vercel automatically caches static assets. To optimize:

```json
{
  "headers": [
    {
      "source": "/images/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 2. Optimize Images

- Use WebP format when possible
- Compress images before uploading
- Lazy load images in HTML

### 3. Minify Assets

Vercel automatically minifies:
- JavaScript files
- CSS files
- HTML files

## Monitoring & Analytics

### View Deployment Logs:

1. Go to Vercel Dashboard
2. Select your project
3. Click **"Deployments"**
4. Click on any deployment to view logs

### View Function Logs:

1. Go to **Functions** tab
2. Click on a function
3. View real-time logs and errors

### Analytics:

Vercel provides:
- Visitor analytics
- Performance metrics
- Error tracking
- Geographic distribution

## Updating Your App

### Automatic Deployments:

Every push to your main branch triggers automatic deployment:

```bash
git add .
git commit -m "Update feature"
git push
```

### Manual Redeploy:

1. Go to Vercel Dashboard
2. Select your project
3. Go to **Deployments**
4. Click **"Redeploy"**

### Preview Deployments:

For pull requests, Vercel creates preview URLs:
- Test changes before merging
- Share preview URLs with team
- Automatic cleanup after merge

## Security Best Practices

1. **Never commit API keys** to Git
2. **Use environment variables** for sensitive data
3. **Enable HTTPS** (automatic with Vercel)
4. **Regular updates** - Keep dependencies updated
5. **Monitor logs** - Check Vercel function logs regularly
6. **Rate limiting** - Implement rate limiting for API calls if needed

## Cost & Limits

### Vercel Free Tier:

✅ **Unlimited deployments**
✅ **100 GB bandwidth/month**
✅ **Serverless functions:** 100 GB-hours/month
✅ **Edge functions:** 100 GB-hours/month
✅ **Automatic HTTPS**
✅ **Global CDN**

### Pro Plan (if needed):

- Unlimited bandwidth
- More function execution time
- Priority support
- Advanced analytics

## Comparison: Vercel vs Netlify

| Feature | Vercel | Netlify |
|---------|---------|----------|
| Free Tier | Excellent | Excellent |
| Serverless Functions | ✅ | ✅ |
| Automatic HTTPS | ✅ | ✅ |
| Global CDN | ✅ | ✅ |
| Preview Deployments | ✅ | ✅ |
| Build Time | Very Fast | Fast |
| Edge Functions | ✅ | ✅ |
| Analytics | Built-in | Built-in |

## Support & Resources

- **Vercel Documentation:** [vercel.com/docs](https://vercel.com/docs)
- **Vercel Functions:** [vercel.com/docs/functions](https://vercel.com/docs/functions)
- **DeepSeek API:** [platform.deepseek.com](https://platform.deepseek.com)
- **Community Forum:** [github.com/vercel/vercel/discussions](https://github.com/vercel/vercel/discussions)

## Quick Reference Commands

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to production
vercel --prod

# Deploy to preview
vercel

# View logs
vercel logs

# List deployments
vercel ls

# Remove deployment
vercel rm <deployment-url>
```

## Summary

- ✅ **Push to GitHub** - Your code is already there
- ✅ **Deploy to Vercel** - Import repository in dashboard
- ✅ **Add API Key** - Set environment variable
- ✅ **Test** - Verify all features work
- ✅ **Done!** - Your app is live!

Your XueTong app is now ready for Vercel deployment! 🚀

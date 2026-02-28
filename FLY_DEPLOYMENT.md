# Fly.io Deployment Guide for XueTong App

This guide will help you deploy your XueTong Chinese learning app to Fly.io.

## Prerequisites

1. **Fly.io Account** - Sign up at [fly.io](https://fly.io)
2. **Fly CLI** - Install Fly CLI tool
3. **GitHub Repository** - Your code should be on GitHub
4. **DeepSeek API Key** - Get from [platform.deepseek.com](https://platform.deepseek.com)

## Quick Deployment Steps

### Step 1: Install Fly CLI

```bash
# On macOS/Linux
curl -L https://fly.io/install.sh | sh

# On Windows (PowerShell)
iwr -usebypassnamingchecks -outf fly.exe https://github.com/superfly/flyctl/releases/download/v0.2.0/flyctl.exe

# Or using npm
npm install -g flyctl
```

### Step 2: Login to Fly.io

```bash
flyctl auth login
```

This will open your browser for authentication.

### Step 3: Initialize Fly.io

```bash
cd "e:\PYTHON PROJECT UNI\xuetong app Updated - Final - Copy - Copy"
flyctl launch
```

Fly.io will detect your project and ask questions:
- **App name:** Choose a unique name (e.g., xuetong-app)
- **Region:** Choose closest region (e.g., sin for Singapore)
- **Database:** No (you're using serverless functions)

### Step 4: Configure Environment Variables

After deployment, add your DeepSeek API key:

```bash
flyctl secrets set DEEPSEEK_API_KEY=your_actual_api_key_here
flyctl secrets set NODE_ENV=production
```

### Step 5: Deploy Your App

```bash
flyctl deploy
```

---

## Configuration Files

### fly.toml Configuration

Your `fly.toml` file is already configured:

```toml
app = "xuetong-app"
primary_region = "sin"

[build]
  [build.args]
    CMD = "node server.js"

[env]
  PORT = "3000"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  min_machines_running = 0

[processes]
  app = "xuetong-app"
  executor = "node"
  
  [processes.app]
    command = "node server.js"

[vm]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 512

[[services]]
  protocol = "tcp"
  internal_port = 3000

[[services.ports]]
  port = 80
  handlers = ["http"]
  force_https = true

[[services.tcp_checks]]
  interval = 15000
  timeout = 2000
  grace_period = "5s"
  restart_limit = 0

[[services.http_checks]]
  interval = 15000
  timeout = 2000
  grace_period = "5s"
  restart_limit = 0
  method = "GET"
  path = "/health"
  protocol = "http"
```

---

## Deployment Features

✅ **Automatic HTTPS** - SSL certificates included
✅ **Global CDN** - Fast worldwide delivery
✅ **Serverless Functions** - Scalable API endpoints
✅ **Auto Scaling** - Automatically scales with traffic
✅ **Health Checks** - Automatic restarts on failure
✅ **Database Support** - Built-in PostgreSQL (optional)
✅ **Custom Domains** - Add your own domain (optional)

---

## Testing Your Deployment

### 1. Check Deployment Status

After deployment, Fly.io will provide:
- **App URL:** `https://xuetong-app.fly.dev`
- **Deployment Logs:** View with `flyctl logs`

### 2. Test Frontend

Open your app URL and test:
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
4. Check logs: `flyctl logs`

---

## Troubleshooting

### Issue 1: Build Fails

**Solution:**
- Check `fly.toml` syntax is valid TOML
- Verify all dependencies are in `package.json`
- Check Fly.io build logs for specific errors

### Issue 2: API Not Working

**Solution:**
- Verify `DEEPSEEK_API_KEY` is set: `flyctl secrets list`
- Check API key is valid and active
- View function logs: `flyctl logs`
- Check browser console for API errors

### Issue 3: 502 Bad Gateway

**Solution:**
- Check if app is running: `flyctl status`
- View logs for errors: `flyctl logs`
- Increase memory in `fly.toml` if needed

### Issue 4: Functions Not Deploying

**Solution:**
- Verify function files have proper exports
- Check function syntax is correct
- Ensure dependencies are installed
- Redeploy after changes

---

## Environment Variables Reference

### Required Variables:

```bash
flyctl secrets set DEEPSEEK_API_KEY=your_actual_api_key_here
flyctl secrets set NODE_ENV=production
```

### Getting DeepSeek API Key:

1. Go to [platform.deepseek.com](https://platform.deepseek.com)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-`)
6. Set in Fly.io: `flyctl secrets set DEEPSEEK_API_KEY=sk-...`

---

## Custom Domain (Optional)

### Add Your Own Domain:

```bash
# Add custom domain
flyctl certs add yourdomain.com

# Update DNS records
# Follow Fly.io instructions for DNS setup
```

### Update DNS Records:

| Type | Name | Value |
|------|------|-------|
| CNAME | @ | xuetong-app.fly.dev |

---

## Performance Optimization

### 1. Enable Caching

Fly.io automatically caches static assets.

### 2. Optimize Images

- Use WebP format when possible
- Compress images before uploading
- Lazy load images in HTML

### 3. Minify Assets

Fly.io automatically minifies:
- JavaScript files
- CSS files
- HTML files

---

## Monitoring & Analytics

### View Deployment Logs:

```bash
# View all logs
flyctl logs

# View real-time logs
flyctl logs --tail

# View logs for specific machine
flyctl logs --machine <machine-id>
```

### View App Status:

```bash
# Check app status
flyctl status

# View app info
flyctl info

# List all apps
flyctl apps
```

### Scale Your App:

```bash
# Scale up
flyctl scale count 2

# Scale down
flyctl scale count 1

# Scale memory
flyctl scale memory 1024
```

---

## Updating Your App

### Automatic Deployments:

Every push to your main branch triggers automatic deployment:

```bash
git add .
git commit -m "Update feature"
git push
```

### Manual Redeploy:

```bash
flyctl deploy
```

### Rollback to Previous Version:

```bash
flyctl releases rollback
```

---

## Security Best Practices

1. **Never commit API keys** to Git
2. **Use Fly.io secrets** for sensitive data
3. **Enable HTTPS** (automatic with Fly.io)
4. **Regular updates** - Keep dependencies updated
5. **Monitor logs** - Check Fly.io logs regularly
6. **Rate limiting** - Implement rate limiting for API calls if needed

---

## Cost & Limits

### Fly.io Free Tier:

✅ **3 shared CPUs**
✅ **256MB RAM per machine**
✅ **3GB bandwidth per month**
✅ **Automatic HTTPS**
✅ **Global CDN**

### Paid Plans (if needed):

- More CPU and memory
- More bandwidth
- Dedicated IPs
- Priority support

---

## Comparison: Fly.io vs Vercel

| Feature | Fly.io | Vercel |
|---------|--------|--------|
| **Best For** | Full-stack apps | Static sites |
| **Backend** | ✅ Excellent | ⚠️ Limited |
| **Database** | ✅ Built-in | ❌ No |
| **Scaling** | ✅ Auto | ⚠️ Limited |
| **Free Tier** | ✅ Generous | ✅ Generous |
| **Setup** | ⚠️ CLI required | ✅ Dashboard only |

---

## Support & Resources

- **Fly.io Documentation:** [fly.io/docs](https://fly.io/docs)
- **Fly.io CLI:** [fly.io/docs/hands-on](https://fly.io/docs/hands-on)
- **DeepSeek API:** [platform.deepseek.com](https://platform.deepseek.com)
- **Community Forum:** [community.fly.io](https://community.fly.io)

---

## Quick Reference Commands

```bash
# Install Fly CLI
npm install -g flyctl

# Login
flyctl auth login

# Deploy
flyctl deploy

# View logs
flyctl logs

# Check status
flyctl status

# Set secrets
flyctl secrets set KEY=value

# List secrets
flyctl secrets list

# Scale app
flyctl scale count 2

# SSH into app
flyctl ssh console

# Open app in browser
flyctl open
```

---

## Summary

- ✅ **Install Fly CLI** - `npm install -g flyctl`
- ✅ **Login to Fly.io** - `flyctl auth login`
- ✅ **Initialize app** - `flyctl launch`
- ✅ **Set API key** - `flyctl secrets set DEEPSEEK_API_KEY=...`
- ✅ **Deploy** - `flyctl deploy`
- ✅ **Done!** - Your app is live at `https://your-app.fly.dev`

Your XueTong app is now ready for Fly.io deployment! 🚀

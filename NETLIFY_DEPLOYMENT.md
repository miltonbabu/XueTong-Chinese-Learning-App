# Netlify Deployment Guide for XueTong App

This guide provides two deployment options for Netlify:

## Option 1: Static Site Deployment (Recommended for Quick Start)

**Best for:** Quick deployment, testing, or if you don't need the AI chat feature.

### Features Included:
- ✅ All HSK vocabulary (HSK 1-6)
- ✅ Flashcards
- ✅ Practice quizzes
- ✅ Progress tracking
- ✅ Search functionality
- ✅ Dark/Light mode
- ❌ AI Tutor (requires backend)

### Deployment Steps:

#### 1. Prepare Your Files

Make sure you have these files in your project root:
- `xuetong-latest.html` (main HTML file)
- `script.js`
- `styles.css`
- `ui-enhancements.js`
- `share.js`
- `images/` folder
- `csv_files/` folder
- `netlify-static.toml` (configuration file)

#### 2. Deploy via Netlify Dashboard

**Method A: Drag and Drop (Easiest)**

1. Go to [app.netlify.com](https://app.netlify.com)
2. Sign up or log in
3. Click "Add new site" → "Deploy manually"
4. Drag and drop your project folder (containing all files)
5. Wait for deployment to complete
6. Your site will be live at `https://your-site-name.netlify.app`

**Method B: Git Integration (Recommended)**

1. Push your code to GitHub/GitLab/Bitbucket
2. In Netlify, click "Add new site" → "Import an existing project"
3. Connect your Git provider
4. Select your repository
5. Configure build settings:
   - **Build command:** (leave empty)
   - **Publish directory:** `.` (root directory)
6. Click "Deploy site"

#### 3. Configure Site Settings

1. Go to **Site Settings** → **General**
2. Change site name if desired
3. Set up custom domain (optional)

#### 4. Test Your Site

- Visit your Netlify URL
- Test all features except AI Tutor
- Verify images load correctly
- Check mobile responsiveness

---

## Option 2: Full Stack Deployment (Complete App)

**Best for:** Production deployment with all features including AI Tutor.

### Features Included:
- ✅ All HSK vocabulary (HSK 1-6)
- ✅ Flashcards
- ✅ Practice quizzes
- ✅ Progress tracking
- ✅ Search functionality
- ✅ Dark/Light mode
- ✅ **AI Tutor** (fully functional)

### Prerequisites:
- DeepSeek API key (get from [platform.deepseek.com](https://platform.deepseek.com))
- Git repository (GitHub, GitLab, or Bitbucket)
- Netlify account

### Deployment Steps:

#### 1. Prepare Your Project Structure

Ensure your project has this structure:
```
xuetong-app/
├── netlify/
│   └── functions/
│       └── api/
│           ├── chat.js
│           ├── online-count.js
│           └── ping.js
├── xuetong-latest.html
├── script.js
├── styles.css
├── ui-enhancements.js
├── share.js
├── images/
├── csv_files/
├── server/
│   ├── .env.example
│   └── package.json
└── netlify-fullstack.toml
```

#### 2. Create Environment Variables

Create a `.env` file in the `server/` directory:
```env
DEEPSEEK_API_KEY=your_actual_deepseek_api_key_here
PORT=3000
```

**Important:** Never commit `.env` file to Git! Add it to `.gitignore`.

#### 3. Deploy via Netlify Dashboard

**Step 1: Connect Git Repository**

1. Go to [app.netlify.com](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect your Git provider (GitHub/GitLab/Bitbucket)
4. Select your `xuetong-app` repository

**Step 2: Configure Build Settings**

1. **Build command:** `cd server && npm install`
2. **Publish directory:** `.` (root directory)
3. **Branch to deploy:** `main` (or your default branch)

**Step 3: Add Environment Variables**

1. Go to **Site Settings** → **Environment variables**
2. Click "Add variable"
3. Add these variables:
   - `DEEPSEEK_API_KEY`: Your DeepSeek API key
   - `PORT`: `3000`
4. Click "Save"

**Step 4: Deploy**

1. Click "Deploy site"
2. Wait for build and deployment (1-2 minutes)
3. Your site will be live at `https://your-site-name.netlify.app`

#### 4. Configure netlify-fullstack.toml

The `netlify-fullstack.toml` file should be in your project root with these contents:

```toml
[build]
  publish = "."
  command = "cd server && npm install"

[build.environment]
  NODE_VERSION = "18"

[functions]
  directory = "netlify/functions"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/xuetong-latest.html"
  status = 200
  force = false
```

#### 5. Test Your Deployment

1. **Test Frontend:**
   - Visit your Netlify URL
   - Navigate through all tabs
   - Test flashcards and quizzes
   - Verify search functionality

2. **Test Backend (AI Tutor):**
   - Go to AI Tutor tab
   - Send a test message
   - Verify you receive a response
   - Check browser console for errors

3. **Test Online Counter:**
   - Check if online users counter works
   - Open in multiple browsers to verify

---

## Troubleshooting

### Common Issues

#### Issue 1: Build Fails

**Solution:**
- Check Node.js version in `netlify.toml` (should be 18 or higher)
- Verify `server/package.json` has all dependencies
- Check Netlify build logs for specific errors

#### Issue 2: AI Tutor Not Working

**Solution:**
- Verify `DEEPSEEK_API_KEY` is set in Netlify environment variables
- Check API key is valid and active
- Verify function logs in Netlify dashboard
- Check browser console for API errors

#### Issue 3: Images Not Loading

**Solution:**
- Ensure `images/` folder is in root directory
- Check file paths in HTML are correct
- Verify images are committed to Git

#### Issue 4: 404 Errors

**Solution:**
- Check `netlify.toml` redirects configuration
- Verify file names match exactly (case-sensitive)
- Ensure all files are in the correct directories

#### Issue 5: Functions Not Deploying

**Solution:**
- Verify `netlify/functions/api/` directory structure
- Check function files have `exports.handler`
- Ensure functions are committed to Git
- Check Netlify Functions logs

---

## Environment Variables Reference

### Required for Full Stack Deployment:

| Variable | Value | Description |
|----------|-------|-------------|
| `DEEPSEEK_API_KEY` | Your API key | DeepSeek API authentication |
| `PORT` | `3000` | Server port (Netlify uses this internally) |

### Getting DeepSeek API Key:

1. Go to [platform.deepseek.com](https://platform.deepseek.com)
2. Sign up or log in
3. Go to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-`)
6. Add it to Netlify environment variables

---

## Deployment Checklist

### For Static Deployment:
- [ ] All HTML, CSS, JS files in root directory
- [ ] `images/` folder with all images
- [ ] `csv_files/` folder with HSK data
- [ ] `netlify-static.toml` configuration file
- [ ] Files pushed to Git (optional)
- [ ] Deployed to Netlify
- [ ] Tested all features

### For Full Stack Deployment:
- [ ] `netlify/functions/api/` directory with function files
- [ ] `server/package.json` with dependencies
- [ ] `netlify-fullstack.toml` configuration file
- [ ] `DEEPSEEK_API_KEY` environment variable set
- [ ] `PORT` environment variable set
- [ ] All files committed to Git
- [ ] Repository connected to Netlify
- [ ] Build settings configured
- [ ] Environment variables added
- [ ] Deployed successfully
- [ ] Tested frontend features
- [ ] Tested AI Tutor functionality
- [ ] Verified online counter works

---

## Post-Deployment Steps

### 1. Set Up Custom Domain (Optional)

1. Go to **Site Settings** → **Domain management**
2. Click "Add custom domain"
3. Enter your domain (e.g., `xuetong.yourdomain.com`)
4. Update DNS records as instructed
5. Enable HTTPS (automatic with Netlify)

### 2. Configure Analytics (Optional)

1. Go to **Site Settings** → **Analytics**
2. Enable Netlify Analytics
3. View visitor data in dashboard

### 3. Set Up Form Handling (Optional)

If you have forms in your app:
1. Go to **Site Settings** → **Forms**
2. Enable form handling
3. Configure notifications

### 4. Enable Password Protection (Optional)

1. Go to **Site Settings** → **Site protection**
2. Enable password protection
3. Set username and password

---

## Updating Your Deployment

### For Static Deployment:

1. Make changes to your files
2. Drag and drop updated folder to Netlify (or push to Git)
3. Netlify automatically detects changes and redeploys

### For Full Stack Deployment:

1. Make changes to your code
2. Commit and push to Git
3. Netlify automatically triggers new build and deployment
4. Wait for deployment to complete

---

## Performance Optimization

### 1. Enable CDN Caching

Netlify automatically uses CDN. To optimize:
- Add cache headers in `netlify.toml`:
```toml
[[headers]]
  for = "/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### 2. Optimize Images

- Compress images before uploading
- Use WebP format when possible
- Lazy load images in HTML

### 3. Minify CSS and JS

Netlify automatically minifies files during build. For manual optimization:
- Use tools like [CSSNano](https://cssnano.co/)
- Use [Terser](https://terser.org/) for JavaScript

---

## Security Best Practices

1. **Never commit API keys** to Git
2. **Use environment variables** for sensitive data
3. **Enable HTTPS** (automatic with Netlify)
4. **Regular updates** - keep dependencies updated
5. **Monitor logs** - check Netlify function logs regularly
6. **Rate limiting** - implement rate limiting for API calls if needed

---

## Support and Resources

- **Netlify Documentation:** [docs.netlify.com](https://docs.netlify.com)
- **Netlify Functions:** [docs.netlify.com/functions](https://docs.netlify.com/functions)
- **DeepSeek API:** [platform.deepseek.com](https://platform.deepseek.com)
- **Community Forum:** [answers.netlify.com](https://answers.netlify.com)

---

## Quick Reference Commands

### Netlify CLI (Optional)

Install Netlify CLI:
```bash
npm install -g netlify-cli
```

Login to Netlify:
```bash
netlify login
```

Deploy from command line:
```bash
netlify deploy --prod
```

View site logs:
```bash
netlify logs
```

---

## Summary

- **Static Deployment:** Quick, easy, no backend, no AI Tutor
- **Full Stack Deployment:** Complete app with AI Tutor, requires setup
- **Both options** are free on Netlify's free tier
- **Git integration** recommended for easy updates
- **Environment variables** required for AI functionality

Choose the option that best fits your needs!

# XueTong - HSK Chinese Learning App

A comprehensive Chinese learning application with HSK 1-6 vocabulary, flashcards, quizzes, and AI-powered tutor.

## 🚀 Deployment Guide

### Vercel Deployment

This project is configured for deployment on Vercel.

#### Prerequisites

- Node.js 14.x or higher
- Vercel CLI installed (`npm i -g vercel`)
- Vercel account

#### Deployment Steps

1. **Install Dependencies**

   ```bash
   cd server
   npm install
   ```

2. **Set Environment Variables**
   Create a `.env` file in the `server` directory:

   ```env
   DEEPSEEK_API_KEY=your_deepseek_api_key_here
   PORT=3000
   ```

3. **Deploy to Vercel**

   ```bash
   # From project root
   vercel

   # Or with specific project name
   vercel --prod xuetong-app
   ```

4. **Add Environment Variables in Vercel Dashboard**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `DEEPSEEK_API_KEY` (your actual API key)
   - Add: `PORT` (value: `3000`)

5. **Access Your App**
   Vercel will provide a URL like: `https://xuetong-app.vercel.app`

### Alternative Deployment Options

#### Netlify

1. Create `netlify.toml`:

   ```toml
   [build]
     command = "cd server && npm install"

   [functions]
     directory = "server"
   ```

2. Deploy via Netlify dashboard

#### Render

1. **Connect GitHub repository**
2. \*\*Configure build command: `cd server && npm install`
3. **Add environment variable: `DEEPSEEK_API_KEY`**

#### Railway / Fly.io

1. Connect GitHub repository
2. Add environment variables
3. Deploy automatically

### Render Deployment

Render is a cloud platform that provides free hosting for web services with automatic SSL and global CDN.

#### Prerequisites

- Node.js 14.x or higher
- Render account (free tier available)
- GitHub repository

#### Deployment Steps

1. **Prepare Your Repository**

   ```bash
   # Ensure all deployment files are committed
   git add .
   git commit -m "Add Render deployment configuration"
   git push origin main
   ```

2. **Create Render Account**
   - Go to [render.com](https://render.com/)
   - Sign up or log in (free tier available)
   - Click "New +" to create a new web service

3. **Connect GitHub Repository**
   - In Render dashboard, click "New +"
   - Select "Web Service"
   - Choose "Connect GitHub repository"
   - Select your `xuetong-app` repository
   - Render will automatically detect `render.yaml`

4. **Configure Build & Runtime**
   - **Runtime**: Node.js 18
   - **Build Command**: `npm install`
   - **Start Command**: `node server/server.js`
   - **Root Directory**: `server`

5. **Add Environment Variables**
   - Go to your service in Render dashboard
   - Navigate to "Environment" tab
   - Add the following variables:
     - `DEEPSEEK_API_KEY`: Your DeepSeek API key
     - `PORT`: `3000`

6. **Deploy**
   - Click "Create Web Service" (or "Deploy" if connected)
   - Render will build and deploy your app
   - Wait for deployment to complete (usually 1-2 minutes)

7. **Access Your App**
   - Render will provide a URL like: `https://xuetong-app.onrender.com`
   - Your app is now live with automatic SSL!

#### Environment Variables for Render

Required:

- `DEEPSEEK_API_KEY` - Your DeepSeek API key
- `PORT` - Server port (value: `3000`)

#### Render Configuration

- `render.yaml` - Deployment configuration
- `.github/workflows/deploy-render.yml` - GitHub Actions for auto-deploy

#### Benefits of Render

- ✅ **Free tier available** with 750 hours/month
- ✅ **Automatic SSL** certificates
- ✅ **Global CDN** for fast content delivery
- ✅ **Automatic deployments** from GitHub
- ✅ **Zero downtime** deployments
- ✅ **Custom domains** supported
- ✅ **Preview environments** for testing
- ✅ **Built-in monitoring** and logs
- ✅ **Auto-scaling** available (paid plans)

#### Troubleshooting Render

**Build Fails:**

- Check Node.js version in `render.yaml` (>=14.x)
- Verify all dependencies are listed in `server/package.json`
- Check Render build logs for specific errors

**Environment Variables Not Working:**

- Ensure variables are added in Render dashboard (not just in render.yaml)
- Redeploy service after adding variables
- Check for typos in variable names

**Service Not Starting:**

- Check Render service logs in dashboard
- Verify build command is correct
- Check for port conflicts (PORT should be 3000)

#### GitHub Actions Auto-Deploy

Your project includes `.github/workflows/deploy-render.yml` for automated deployments:

**Required Secrets:**

- `RENDER_SERVICE_ID` - Your Render service ID
- `RENDER_API_KEY` - Your Render API key

**Setup Steps:**

1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Add `RENDER_SERVICE_ID` (get from Render dashboard)
3. Add `RENDER_API_KEY` (get from Render dashboard)
4. Push to main branch → Auto-deploys to Render

### Alternative Deployment Options## 📁 Project Structure

```
xuetong-app/
├── server/              # Backend server
│   ├── server.js        # Express server with DeepSeek AI
│   ├── .env.example     # Environment variables template
│   └── package.json    # Backend dependencies
├── xuetong-latest.html # Main frontend file
├── script.js            # Frontend logic
├── styles.css            # Styles
├── ui-enhancements.js  # UI enhancements
├── share.js             # Share functionality
├── images/              # App images and icons
├── csv_files/           # HSK vocabulary data
├── vercel.json          # Vercel configuration
├── package.json          # Root package.json
└── .vercelignore        # Files to ignore in deployment
```

## 🔧 Configuration

### Environment Variables

Required:

- `DEEPSEEK_API_KEY` - Your DeepSeek API key
- `PORT` - Server port (default: 3000)

### Vercel Configuration

- `vercel.json` - Deployment configuration
- `.vercelignore` - Files to exclude from deployment

## 📊 Features

- 📚 HSK 1-6 Vocabulary (5000+ words)
- 🎴 Interactive Flashcards
- ✍️ Practice Quizzes
- 🧠 AI-Powered Tutor
- 📊 Progress Tracking
- 🔊 Audio Pronunciation
- 🔍 Search Functionality
- 🌙 Dark/Light Mode
- 📱 Responsive Design

## 🛠️ Troubleshooting

### Deployment Issues

1. **Build Fails**
   - Check Node.js version (>= 14.x)
   - Verify all dependencies are installed
   - Check for syntax errors in `server.js`

2. **Environment Variables Missing**
   - Ensure `DEEPSEEK_API_KEY` is set in Vercel dashboard
   - Redeploy after adding variables

3. **Static Files Not Loading**
   - Check `vercel.json` output directory
   - Verify paths in `server.js`

### Runtime Issues

1. **API Not Responding**
   - Check API key validity
   - Verify DeepSeek API status
   - Check Vercel function logs

2. **CORS Errors**
   - Verify CORS configuration
   - Check allowed origins

## 📝 Development

### Local Development

1. Install dependencies:

   ```bash
   cd server
   npm install
   ```

2. Set up environment:

   ```bash
   cp .env.example .env
   # Edit .env with your API key
   ```

3. Start server:

   ```bash
   npm start
   ```

4. Open browser:
   ```
   http://localhost:3000/xuetong-latest.html
   ```

## 📄 License

© 2026 XueTong 学通. All rights reserved.

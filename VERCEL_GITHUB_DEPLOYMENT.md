# 🚀 GenBridge: GitHub & Vercel Deployment Guide

This guide walks you step-by-step through publishing your **GenBridge** repository to **GitHub** and deploying it live on **Vercel** with global CDN distribution and serverless API execution.

---

## 📋 Architecture Overview

GenBridge is architected to be 100% cloud-native and serverless-ready:
- **Frontend**: Served directly from Vercel's global Edge CDN via `public/` directory with automatic asset caching.
- **Backend API**: Executes on-demand in Vercel Serverless Functions (`api/index.js`), using Node.js 22 built-in modules (`node:crypto`, `node:sqlite`).
- **Database**: 
  - **On Vercel (Serverless)**: Automatically boots and writes to `/tmp/genbridge.sqlite` with instant table creation and pre-seeded demo data (Admin, Creator, Backer, active campaigns).
  - **On Local / VPS**: Persists directly in `database/genbridge.sqlite`.
  - **For Cloud Production**: Ready for MySQL / MariaDB (Aiven, PlanetScale, Railway) using [schema.mysql.sql](file:///c:/Users/PIYUSH%20PRATAP%20SINGH/Documents/GenBridge/database/schema.mysql.sql).

---

## 🛠️ Step 1: Push Code to GitHub

### Option A: Using the Command Line (Terminal / PowerShell)

1. **Verify your local git status**:
   ```bash
   git status
   ```

2. **Commit all project files**:
   ```bash
   git add .
   git commit -m "feat: complete GenBridge platform ready for GitHub and Vercel"
   ```

3. **Create a new repository on GitHub**:
   - Go to [https://github.com/new](https://github.com/new).
   - Enter Repository name: `GenBridge` (or your preferred name).
   - Choose **Public** or **Private**.
   - **Do NOT** initialize with a README, .gitignore, or license (we already have them).
   - Click **Create repository**.

4. **Link and push to GitHub**:
   Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username:
   ```bash
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/GenBridge.git
   git branch -M main
   git push -u origin main
   ```

---

## ⚡ Step 2: Deploy to Vercel

### Option A: Via the Vercel Web Dashboard (Recommended & Easiest)

1. **Sign in to Vercel**:
   - Go to [https://vercel.com](https://vercel.com) and log in with your GitHub account.

2. **Import your GitHub Repository**:
   - On your Vercel Dashboard, click **"Add New..."** → **"Project"**.
   - Find your `GenBridge` repository in the list and click **"Import"**.

3. **Configure Project Settings**:
   - **Project Name**: `genbridge` (or custom name).
   - **Framework Preset**: Leave as **Other** (Vercel automatically detects `vercel.json`).
   - **Root Directory**: `./` (default).
   - **Build and Output Settings**:
     - Vercel automatically reads `package.json` (`npm run build`) and `vercel.json`.
     - No override needed.

4. **Environment Variables (Optional)**:
   You can optionally configure:
   | Variable | Example Value | Description |
   |---|---|---|
   | `JWT_SECRET` | `your_long_random_secret_key_here` | Secret token for HMAC session signing |
   | `NODE_ENV` | `production` | Production environment flag |

5. **Click "Deploy"**:
   - Vercel will install, verify routes, build functions, and deploy your site in ~30 seconds.
   - You will receive a live URL: `https://genbridge-xxxxxx.vercel.app`!

---

### Option B: Via the Vercel CLI (For Terminal Power Users)

If you have Node.js installed, you can deploy in one command right from your terminal:

```bash
# Deploy preview build
npx vercel

# Deploy directly to production
npx vercel --prod
```

Follow the prompts:
- *Set up and deploy?* → `y`
- *Which scope?* → Select your personal account
- *Link to existing project?* → `n`
- *What's your project's name?* → `genbridge`
- *In which directory is your code located?* → `./`

---

## 🔍 Step 3: Verify Your Live Deployment

Once deployed, visit your Vercel URL:
1. **Frontend Landing Page**: `https://your-project.vercel.app/`
2. **API Health Check**: `https://your-project.vercel.app/api/health`
   - Expected response: `{"status":"healthy","timestamp":"..."}`
3. **API Platform Settings**: `https://your-project.vercel.app/api/settings`
   - Expected response: JSON containing `platform_name: "GenBridge"`, `platform_commission: "5"`, etc.
4. **Discover Page**: `https://your-project.vercel.app/#/discover`
5. **Admin Governance**: `https://your-project.vercel.app/#/admin`

---

## 👤 Pre-Seeded Demo Accounts on Live Deployment

The system initializes with these ready-to-use accounts on first launch:

| Role | Email | Password | Access Rights |
|---|---|---|---|
| **Admin** | `admin@genbridge.org` | `admin123` | Full governance, edit settings, approve campaigns |
| **Promoter (Creator)** | `alex@creator.com` | `promoter123` | Creator Studio, post pitches, update milestones |
| **Investor (User)** | `robert@investor.com` | `user123` | Back ideas, track milestone deliveries |

---

## 📁 Repository Structure for Vercel

```text
GenBridge/
├── .github/
│   └── workflows/
│       └── ci.yml            # Automated GitHub Actions test on push
├── api/
│   └── index.js              # Vercel Serverless Function entry point
├── database/
│   ├── db.js                 # SQLite engine (with /tmp serverless support)
│   └── schema.mysql.sql      # Production MySQL DDL schema
├── public/
│   ├── assets/
│   │   └── GenBridge.jpg     # Platform logo & favicon
│   ├── css/
│   │   └── styles.css        # Minimalist Orange & Blue light theme styles
│   ├── js/
│   │   ├── app.js            # Client router, modals, API client
│   │   └── matrix.js         # Digital stream ambient canvas engine
│   └── index.html            # Main single-page application
├── .gitignore                # Excludes local sqlite databases, logs, node_modules
├── package.json              # Node 22+ engine constraint & scripts
├── server.js                 # Unified Node.js server + static file streamer
├── vercel.json               # Vercel route rewrites & CDN cache headers
├── README.md                 # Project overview and quickstart
├── MYSQL_GUIDE.md            # Complete MySQL guide
├── DEPLOYMENT_GUIDE.md       # Traditional VPS & Docker guide
└── VERCEL_GITHUB_DEPLOYMENT.md # This guide
```

---

## 💡 Troubleshooting & FAQs

### 1. Does SQLite reset on Vercel?
In Vercel serverless functions, the filesystem is ephemeral (`/tmp`). While each warm container retains state, cold boots re-initialize the database with pristine seed data.
- **For Demos / Hackathons**: Perfect out-of-the-box with zero configuration or cost.
- **For Permanent Cloud Production**: Connect a hosted MySQL or PostgreSQL database (Supabase / PlanetScale / Aiven) using the provided [schema.mysql.sql](file:///c:/Users/PIYUSH%20PRATAP%20SINGH/Documents/GenBridge/database/schema.mysql.sql).

### 2. Why is Node 22 specified in `package.json`?
Node.js 22 provides native built-in `node:sqlite` (`DatabaseSync`) and `node:crypto` (`scryptSync`). This guarantees zero external npm dependency vulnerabilities, zero build compilation steps, and sub-second deployments on Vercel.

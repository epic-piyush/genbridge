# 🌉 PitchFund

> **Delivering Capital & Wisdom to Small Ideas, Creators, and Next-Gen Startups.**  
> *"Like Uber & Zomato, but instead of food and rides, it delivers on-demand micro-investments to creators, YouTube channels, and emerging ventures with real-time milestone tracking."*

[![Node.js Version](https://img.shields.io/badge/Node.js-22%2B-green.svg)](https://nodejs.org/)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)
[![GitHub Actions CI](https://img.shields.io/badge/CI-Passing-brightgreen.svg)](.github/workflows/ci.yml)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-orange.svg)](#-zero-dependency-architecture)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](package.json)

![PitchFund Logo](pitchfund.jpg)

---

## 🌟 Concept Overview

**PitchFund** bridges the generational divide by connecting experienced professionals, retirees, and angel backers who possess accumulated capital and industry wisdom with young, emerging creators (like a YouTuber upgrading to a cinema studio rig, or college grads launching biodegradable coffee cups).

### The "On-Demand Delivery" Metaphor
- **Menus / Restaurants** $\rightarrow$ Startups, creators, YouTube channels, and local green businesses.
- **Menu Items** $\rightarrow$ Specific funding milestones (e.g. *“Sony FX3 Cinema Rig: \$3,500”*, *“Biodegradable Stalk Mold Machine: \$5,000”*).
- **Checkout & Ordering** $\rightarrow$ Instant micro-investment with backer mentorship advice note.
- **Delivery Tracking** $\rightarrow$ Real-time 5-stage pipeline tracking proof-of-work, receipts, and perk releases.

---

## 🚀 Instant Deployment (Vercel & GitHub)

PitchFund is ready for 1-click deployment on **GitHub** and **Vercel** with full static CDN caching and serverless API execution.

👉 **Read the complete walkthrough**: [**VERCEL_GITHUB_DEPLOYMENT.md**](VERCEL_GITHUB_DEPLOYMENT.md)

### 1. Push to GitHub
```bash
# Initialize and commit
git add .
git commit -m "feat: PitchFund platform ready for GitHub and Vercel"

# Add your GitHub repository remote
git remote add origin https://github.com/YOUR_USERNAME/PitchFund.git
git branch -M main
git push -u origin main
```

### 2. Deploy to Vercel (1-Click)
1. Go to [https://vercel.com](https://vercel.com) and log in with GitHub.
2. Click **"Add New..."** $\rightarrow$ **"Project"** $\rightarrow$ select your `PitchFund` repository.
3. Click **"Deploy"**! (Vercel automatically detects `vercel.json` and `package.json`).

---

## 💻 Local Quick Start

PitchFund is built with **zero external runtime dependencies** using Node's standard library and the high-performance built-in `node:sqlite` engine. It boots in milliseconds on any machine with Node.js installed.

```bash
# 1. Start the server
npm start
# OR: node server.js
```

Open your browser to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 👤 Instant 1-Click Demo Personas

On the website header, click the **"⚡ 1-Click Demo"** button or enter credentials manually:

| Persona | Role | Email | Password | What You Can Do |
| :--- | :--- | :--- | :--- | :--- |
| **System Administrator** | **Admin (Superuser)** | `admin@pitchfund.org` | `admin123` | **Private Admin Panel**: Alter all campaigns, verify ideas, manage users, edit platform commission %, and live banners. |
| **Alex Rivera** | **Promoter / Creator** | `alex@creator.com` | `promoter123` | Creator Studio: Pitch ideas, create milestones, attach receipts & proof notes. |
| **Robert Montgomery** | **Investor / Backer** | `robert@investor.com` | `user123` | Browse menus, order micro-investments, attach wisdom notes, track live deliveries. |

---

## 🛡️ Private Admin Panel Features

Accessible at `/#/admin` (or by logging in as Admin):
1. **Platform KPIs & Financials**: Live counters for gross investment volume, collected platform commissions (e.g. 5%), total active creators, and backer engagement.
2. **Campaign Governance (Alterable by Admin)**:
   - Approve, pause, fund, or reject any campaign.
   - Toggle **Featured / Trending** badge.
   - Edit pitch details or delete inappropriate campaigns.
3. **User & Promoter Moderation**:
   - Change user roles (`User` $\leftrightarrow$ `Promoter` $\leftrightarrow$ `Admin`).
   - Toggle account status (`Active` $\leftrightarrow$ `Suspended`).
   - Adjust wallet balance directly.
4. **Delivery Orders Ledger**:
   - Master ledger of every micro-investment order (`GB-XXXXX`).
   - Advance or alter the delivery stage (`placed` $\rightarrow$ `disbursed` $\rightarrow$ `milestone_in_progress` $\rightarrow$ `delivered`).
5. **Global System Options**:
   - Adjust platform name and currency symbol ($, ₹, €, £).
   - Alter the platform commission percentage in real time.
   - Set the minimum global investment threshold.
   - Edit the top live announcement banner text shown across the site.
   - Toggle public registration open/close.

---

## 🗄️ Database & SQL Architecture

PitchFund includes full support for both SQLite and MySQL:
- **SQLite (Default)**: Located at `database/pitchfund.sqlite` (or `/tmp` on serverless environments like Vercel). Zero-setup, runs automatically with pre-seeded demo records.
- **MySQL / MariaDB**: Full schema with tables, constraints, foreign keys, and seed data is provided in `database/schema.mysql.sql`.

👉 **Read the complete guide:** [`MYSQL_GUIDE.md`](MYSQL_GUIDE.md) for XAMPP, Docker, and MySQL Workbench instructions.

---

## 🚀 Traditional VPS & Cloud Hosting

Want to run on Ubuntu VPS, AWS EC2, DigitalOcean, or Render?  
👉 **Read the deployment guide:** [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md) for systemd, PM2, Docker, and Nginx reverse proxy instructions.

---

## 👥 The Team

We are a team of **11 Students studying B.Tech in IIIT Bhopal**, passionate about building software that connects people, capital, and real-world technology.

---

## 📜 License

This project is licensed under the **ISC License**. Free to use, adapt, and build upon.

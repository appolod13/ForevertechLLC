# Hybrid Deployment Guide: Vercel + Cloudflare (Free Live Production)

This guide will walk you through setting up a hybrid deployment:
- **Vercel**: For public-catalog frontend (easy updates, PR previews, Next.js optimization)
- **Cloudflare**: For your existing go-live stack (Traefik, quantum-image-gen, DNS)

---

## Prerequisites
✅ Public-catalog project (we've already set this up!)
✅ GitHub account (for code hosting)
✅ Vercel account (free tier)
✅ Cloudflare account (your existing setup)
✅ Supabase project (from our earlier setup)

---

## Step 1: Push Your Code to GitHub

First, let's get your code on GitHub:

### 1.1 Initialize Git (if not already done)
```bash
cd /Users/Administrator/Documents/ForevertechLLC-1
git init
```

### 1.2 Create a .gitignore at the root (if needed)
Create `/Users/Administrator/Documents/ForevertechLLC-1/.gitignore` with:
```
# Dependencies
node_modules/

# Build outputs
.next/
out/
build/

# Environment files
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/

# OS files
.DS_Store
Thumbs.db

# Vercel
.vercel/

# TypeScript
*.tsbuildinfo
```

### 1.3 Commit your code
```bash
git add .
git commit -m "Initial commit: public-catalog with Supabase & Vercel config"
```

### 1.4 Create a GitHub Repository
1. Go to [github.com/new](https://github.com/new)
2. Name your repo: `foreverteck-public-catalog`
3. Choose **Public** or **Private** (up to you!)
4. **Don't** initialize with README, .gitignore, or license
5. Click "Create repository"

### 1.5 Push to GitHub
Follow the instructions on GitHub to push your code:
```bash
git remote add origin https://github.com/your-username/foreverteck-public-catalog.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy to Vercel

### 2.1 Import Your Repo to Vercel
1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Continue with GitHub" (if needed)
3. Find your `foreverteck-public-catalog` repo and click "Import"

### 2.2 Configure Your Vercel Project
1. **Project Name**: `foreverteck-public-catalog` (or whatever you want)
2. **Framework Preset**: `Next.js` (Vercel should detect this automatically)
3. **Root Directory**: Set this to `public-catalog` (important!)
4. **Build Command**: Leave as `npm run build`
5. **Output Directory**: Leave as `.next`

### 2.3 Add Environment Variables
In the "Environment Variables" section, add **all** variables from your `public-catalog/.env.example.supabase`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- And all other required variables (Stripe, Printify, Twitter, etc.)

**Important**: Make sure the "Automatically expose System Environment Variables" option is checked.

### 2.4 Deploy!
Click "Deploy"! 🚀 Vercel will now build and deploy your app. This takes a few minutes.

---

## Step 3: Set Up Supabase for Vercel

### 3.1 Add Vercel Domain to Supabase
1. After deployment, copy your Vercel production URL (looks like `https://foreverteck-public-catalog.vercel.app`)
2. Go to your Supabase project:
   - **Authentication → URL Configuration**
   - Add your Vercel URL to:
     - Site URL
     - Redirect URLs
3. Go to **Settings → API**:
   - Add your Vercel URL to "Additional CORS Origins"

---

## Step 4: (Optional) Use Cloudflare DNS for Your Custom Domain

If you want to use your own domain (e.g., `catalog.yourdomain.com`):

### 4.1 Add Custom Domain in Vercel
1. In Vercel, go to your project → **Settings → Domains**
2. Enter your domain (e.g., `catalog.yourdomain.com`) and click "Add"
3. Vercel will give you DNS records to add (usually a CNAME record pointing to `cname.vercel-dns.com`)

### 4.2 Add DNS Records in Cloudflare
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → Your domain → **DNS**
2. Add the records from Vercel
3. **Proxy Status**:
   - Choose **DNS Only** (gray cloud) for simple setup
   - Choose **Proxied** (orange cloud) if you want Cloudflare's DDoS/WAF protection in front of Vercel!

---

## Step 5: Test Your Deployment!

1. Open your Vercel URL (or custom domain)
2. Generate an image in the Studio
3. Check that it appears in the Gallery
4. Verify the image is saved in Supabase (Table Editor → gallery_items)

---

## Step 6: Use Vercel Preview Deployments for Easy Test → Production

This is the magic part! Vercel makes test → production effortless:

### 6.1 Create a Feature Branch
```bash
git checkout -b feature/my-awesome-update
```

### 6.2 Make Your Changes
Edit files, add features, fix bugs!

### 6.3 Commit and Push
```bash
git add .
git commit -m "My awesome update"
git push -u origin feature/my-awesome-update
```

### 6.4 Open a Pull Request
1. Go to your GitHub repo
2. Click "Compare & pull request"
3. Fill in details and click "Create pull request"

### 6.5 Test the Preview Deployment
Vercel will **automatically create a preview deployment** for your PR!
- The preview URL will be: `https://foreverteck-public-catalog-git-feature-my-awesome-update-your-username.vercel.app`
- Test your changes here!

### 6.6 Merge to Production
When you're ready:
1. Click "Merge pull request" on GitHub
2. Vercel will **automatically deploy to production**! 🎉

---

## Keep Your Existing Cloudflare Stack!

Your existing Cloudflare setup (Traefik, quantum-image-gen, etc.) stays exactly as it is! You don't need to change anything there—this hybrid setup means:
- `catalog.yourdomain.com` → Vercel (public-catalog)
- `yourdomain.com` → Cloudflare Traefik stack (quantum-image-gen, etc.)

---

## Troubleshooting

### Build fails on Vercel?
- Double-check your environment variables are all set correctly in Vercel
- Check Vercel's deployment logs (Vercel → Your Project → Deployments)
- Make sure your root directory is set to `public-catalog` in Vercel project settings

### Images not showing up in Gallery?
- Verify your Supabase environment variables are correct
- Check that your Vercel URL is added to Supabase CORS/URL settings
- Check the browser console for errors

### Custom domain not working?
- Wait 5-10 minutes for DNS to propagate
- Double-check your DNS records in Cloudflare
- Make sure there are no typos in your domain

---

## What We've Built

✅ Public-catalog ready for Vercel deployment  
✅ Supabase integration with fallback to in-memory store  
✅ Vercel configuration files  
✅ Step-by-step guide for test → production with PR previews  
✅ Hybrid setup with Cloudflare for your existing stack  

---

## Free Tier Limits (Both Vercel & Cloudflare)

### Vercel Free Tier:
- 100GB bandwidth/month
- 6000 build minutes/month
- 100GB-hours of serverless functions
- Unlimited preview deployments

### Cloudflare Free Tier:
- Unlimited DNS
- 100,000 Workers requests/day
- 3 Page Rules
- DDoS protection

### Supabase Free Tier:
- 500MB database storage
- 1GB bandwidth/month
- 2GB file storage
- 50,000 monthly active users

These limits are perfect for getting started and small to medium projects!

---

## Next Steps
- Set up Supabase Auth for user logins
- Enable Supabase Real-time for live updates
- Add more RLS policies for better security
- Set up Vercel Analytics
- Configure custom error pages in Vercel

---

You're all set! Now go deploy and start building! 🚀

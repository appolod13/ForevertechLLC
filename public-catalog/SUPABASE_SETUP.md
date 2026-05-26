# Public-Catalog + Supabase Setup Guide (Free Production)

This guide will walk you through setting up Supabase with public-catalog for free live production.

---

## Prerequisites
- A Supabase account (free tier available)
- Your public-catalog project ready
- Node.js and npm installed

---

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up for a free account
2. Click "New Project"
3. Fill in:
   - **Name**: `foreverteck-public-catalog`
   - **Database Password**: Create a strong password (save this securely!)
   - **Region**: Choose the region closest to your users
4. Click "Create new project" and wait ~2 minutes for provisioning

---

## Step 2: Get Your Supabase Credentials

1. In your Supabase project, go to **Project Settings → API**
2. Copy these values:
   - `Project URL` (e.g., `https://abcdefghijklmnopqrst.supabase.co`)
   - `anon public` key (for client-side use)
   - `service_role` key (for server-side use, keep this SECRET!)
3. Go to **Project Settings → Database**
4. Copy the `Connection String` (URI)

---

## Step 3: Run the Database Schema in Supabase

1. In your Supabase project, go to **SQL Editor**
2. Click "New query"
3. Copy and paste the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Click "Run" to execute the SQL
5. Verify the tables were created by going to **Table Editor** (you should see `gallery_items`, `orders`, and `order_items`)

---

## Step 4: Configure Environment Variables

1. In your `public-catalog` directory, copy the example env file:
   ```bash
   cp .env.example.supabase .env
   ```
2. Open `.env` and fill in your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   DATABASE_URL=postgresql://postgres:your-password@db.your-project-id.supabase.co:5432/postgres
   ```
3. Fill in any other required environment variables (Stripe, Printify, etc.)

---

## Step 5: Test Locally

1. Start your development server:
   ```bash
   npm run dev
   ```
2. Open [http://localhost:3001](http://localhost:3001)
3. Generate an image in the Studio and verify it appears in your Gallery
4. Check your Supabase Table Editor - the new gallery item should be in `gallery_items`!

---

## Step 6: Deploy to Vercel (Free)

Vercel is the easiest way to deploy Next.js apps for free.

### 6.1: Push Your Code to GitHub
1. Create a GitHub repository for public-catalog
2. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit with Supabase setup"
   git remote add origin https://github.com/your-username/your-repo.git
   git push -u origin main
   ```

### 6.2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign up
2. Click "New Project"
3. Import your GitHub repository
4. In "Environment Variables", add ALL the variables from your `.env` file
5. Click "Deploy"!

### 6.3: Update Supabase URL and CORS
1. After deployment, copy your Vercel URL (e.g., `https://your-app.vercel.app`)
2. In Supabase, go to **Authentication → URL Configuration**
3. Add your Vercel URL to:
   - Site URL
   - Redirect URLs
4. In Supabase, go to **Settings → API**
5. Add your Vercel URL to "Additional CORS Origins"

---

## Step 7: Verify Production

1. Open your Vercel URL
2. Generate an image
3. Check that it shows up in Gallery
4. Check Supabase Table Editor - the item should be there!

---

## What's Included in the Setup?

- ✅ Gallery items stored in Supabase PostgreSQL
- ✅ Favorite toggle functionality
- ✅ Orders table for checkout/purchases
- ✅ Order items table for line items
- ✅ Row Level Security (RLS) for basic security
- ✅ Indexes for fast queries
- ✅ Supabase client utilities
- ✅ API routes updated to use Supabase

---

## Next Steps

- Set up Supabase Auth for user authentication
- Use Supabase Storage for image uploads
- Enable Supabase Real-time for live updates
- Add more RLS policies for better security
- Set up Supabase Edge Functions for serverless logic

---

## Troubleshooting

**Images not showing up in Gallery?**
- Check that your environment variables are correct
- Check the browser console for errors
- Verify the item exists in Supabase Table Editor

**Supabase connection errors?**
- Double-check your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Make sure your service role key is correct in server-side code
- Check that your IP is not blocked in Supabase

**Deployment issues?**
- Make sure all environment variables are set in Vercel
- Check Vercel's deployment logs
- Verify your CORS settings in Supabase

---

## Free Tier Limits (Supabase)

- 500 MB database storage
- 1 GB bandwidth/month
- 2 GB file storage
- 50,000 monthly active users
- Unlimited API requests (fair use)

These limits are perfect for getting started and small to medium projects!

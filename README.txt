# How to use this folder
# ========================

## Step 1 — Copy everything into your project

Open your project folder:
    D:\Models\ship-inspection-platform\

Copy these two folders FROM this zip INTO your project (say YES to overwrite):
    src\       →  ship-inspection-platform\src\
    public\    →  ship-inspection-platform\public\

Also copy .env.local INTO your project root (or just add the 3 AUTH_ lines to your existing .env.local).

## Step 2 — Put your logo in public\

Rename  AUK_Logo.png  →  auk-logo.png
Place it in:  ship-inspection-platform\public\auk-logo.png

## Step 3 — Fill in .env.local

Open ship-inspection-platform\.env.local and set:
    AUTH_SECRET=any-long-random-text-at-least-32-characters
    AUTH_EMAIL=ashp1966@gmail.com
    AUTH_PASSWORD=your-chosen-password

Your DATABASE_URL is already there from before — don't change it.

## Step 4 — Install the one new package

In your terminal (inside the project folder):
    npm i jose

## Step 5 — Run

    npm run dev

Go to http://localhost:3000 — you will be redirected to the login page.
Enter the email + password you set in .env.local → into the dashboard.

## Step 6 — Add auth vars to Vercel (before deploying)

Vercel → your project → Settings → Environment Variables → Add:
    AUTH_SECRET    (same value as .env.local)
    AUTH_EMAIL     (same value)
    AUTH_PASSWORD  (same value)

Then push to GitHub → Vercel auto-deploys with login protection.

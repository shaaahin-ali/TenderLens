# Deployment Guide

This guide covers deploying the TenderLens application to **Vercel** (frontend) and **Render** (backend).

---

## Project Structure

- `frontend/` - Next.js frontend application
- Root directory - FastAPI backend application

---

## Backend Deployment (Render)

### 1. Push Code to GitHub

Ensure all changes are committed and pushed to your GitHub repository.

### 2. Create Render Account

1. Go to [render.com](https://render.com) and sign up/login
2. Connect your GitHub account

### 3. Create Web Service

1. Click **"New +"** → **"Web Service"**
2. Select your repository
3. Configure the service:
   - **Name**: `tenderlens-api` (or your preferred name)
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120`
   - **Plan**: Free (or paid for better performance)

4. Add Environment Variables:
   - Key: `HF_API_KEY`
   - Value: `your_huggingface_token_here` (get free token at https://huggingface.co/settings/tokens)
   - Key: `CORS_ORIGINS`
   - Value: `*` (for development) or your Vercel domain(s) like `https://your-app.vercel.app`

5. Click **"Create Web Service"**

6. Wait for deployment to complete and note the URL (e.g., `https://tenderlens-api.onrender.com`)

---

## Frontend Deployment (Vercel)

### 1. Update Environment Variable

Before deploying, update the API URL in the frontend:

Edit `frontend/env.example` and rename to `.env.local`:

```env
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
```

Replace `your-backend.onrender.com` with your actual Render URL.

### 2. Deploy to Vercel

#### Option A: Vercel CLI

```bash
cd frontend
vercel
```

#### Option B: Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `next build`
   - **Output Directory**: `dist`
5. Add Environment Variable:
   - Key: `NEXT_PUBLIC_API_URL`
   - Value: `https://your-backend.onrender.com`
6. Click **"Deploy"**

---

## Post-Deployment Configuration

### Update CORS Origins (Backend)

After deploying the frontend, update the backend CORS to allow only your Vercel domain:

1. Go to your Render dashboard
2. Select your web service
3. Go to **Environment** tab
4. Update `CORS_ORIGINS`:
   ```
   https://your-app.vercel.app,https://your-app-git-main-yourusername.vercel.app
   ```
5. The service will redeploy automatically

---

## Local Development

### Backend

```bash
pip install -r requirements.txt
uvicorn app:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Troubleshooting

### CORS Errors

- Ensure `CORS_ORIGINS` is set correctly on Render
- Check that the Vercel URL is in the allowed origins list

### API Connection Issues

- Verify `NEXT_PUBLIC_API_URL` is set correctly in Vercel
- Ensure the Render service is running (free tier sleeps after inactivity)

### Build Failures

- Check that `requirements.txt` includes all dependencies
- Verify `next.config.ts` has `output: 'export'` enabled

---

## Important Notes

1. **HuggingFace API Limits**: Free tier allows 1,000 requests/month. Each PDF validation uses multiple API calls (one per requirement). This is sufficient for testing but upgrade if you need more.

2. **API Key Security**: Never commit `HF_API_KEY` to git. Set it only in Render dashboard Environment Variables.

3. **File Upload Limits**: Render free tier has request size limits. Large PDFs may fail.

4. **Data Persistence**: Uploaded files are stored temporarily in the `data/` folder and are lost on redeploy.

5. **Security**: In production, restrict `CORS_ORIGINS` to your specific Vercel domain(s) rather than using `*`.

---

## Getting HuggingFace API Token

1. Go to https://huggingface.co/settings/tokens
2. Click **"New Token"**
3. Name it "TenderLens" (or anything)
4. Select **"read"** role (enough for inference API)
5. Copy the token and paste it in Render as `HF_API_KEY`

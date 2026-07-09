# 🚀 Complete Deployment Guide - IDEACON App

## Phase 1: Local Setup ✅ COMPLETE
- ✅ Backend running on http://localhost:8000
- ✅ Frontend running on http://localhost:8081
- ✅ All tests passing (25/25)

---

## Phase 2: Cloud Deployment 🔄 IN PROGRESS

### Step 1: Push Code to GitHub

```bash
cd /app
git push origin HEAD:main
```

**What gets pushed:**
- Backend: FastAPI server + Docker configuration
- Frontend: Expo React Native app
- CI/CD: 3 GitHub Actions workflows
- Docs: Deployment guides

---

### Step 2: Configure GitHub Secrets

**Option A: Using GitHub CLI (Recommended)**

```bash
# From your local machine with gh CLI installed:
bash setup-github-secrets.sh
```

**Option B: Manual GitHub Web UI**

Go to: `GitHub Repo → Settings → Secrets and variables → Actions`

Add these 5 secrets:

| Secret Name | Value |
|------------|-------|
| `RENDER_SERVICE_ID` | `redis://red-d97u1m8k1i2s73eqbtug:6379` |
| `RENDER_API_KEY` | `tea-d3g9gtm3jp1c73eimhs0` |
| `EXPO_TOKEN` | `81kkxIHAmu12hEs9SLhw_KYxRfa0z7KHF8O1Jtqs` |
| `EXPO_PUBLIC_BACKEND_URL` | `https://your-render-backend.onrender.com` |
| `EAS_BUILD_ANDROID_SERVICE_ACCOUNT_JSON` | *(Full JSON from play-store-service-account.json)* |

**⚠️ IMPORTANT:**
- Update `EXPO_PUBLIC_BACKEND_URL` with your actual Render backend URL (after first deployment)
- Replace Play Store JSON with your actual service account credentials

---

### Step 3: Trigger Automated Deployments

**Manual Trigger:**
```bash
# Backend Docker build + Render deployment
git push origin HEAD:main

# This triggers:
# 1. .github/workflows/docker-image.yml
#    → Builds Docker image
#    → Pushes to GHCR (GitHub Container Registry)
#    → Triggers Render deployment via API
```

**Status Check:**
1. Go to GitHub Repo → Actions
2. Monitor workflow runs
3. Check Render Dashboard for deployment status

---

### Step 4: Generate Android APK/AAB

**Via GitHub Actions (Automatic):**
```bash
git push origin HEAD:main
# Triggers .github/workflows/eas-android.yml
# Result: AAB generated and submitted to Play Store internal track
```

**Manually (for testing):**
```bash
cd /app/frontend
export EXPO_TOKEN="81kkxIHAmu12hEs9SLhw_KYxRfa0z7KHF8O1Jtqs"
export EXPO_PUBLIC_BACKEND_URL="https://your-render-backend.onrender.com"

eas build --platform android --profile production
# Output: AAB file location + Play Store submission details
```

---

## Phase 3: Play Store Publishing 📱

### Prerequisites:
- ✅ Google Play Developer account ($25 fee, one-time)
- ✅ Service account JSON (from Google Play Console)
- ✅ App signed and configured

### Auto-Publishing (via GitHub Actions):
- When AAB builds successfully, workflow automatically:
  - Submits to `internal` track for testing
  - Can be promoted to production manually

### Manual Publishing:
```bash
eas submit --platform android --latest
# Follow prompts to submit to Play Store
```

---

## 📊 Deployment Architecture

```
┌─────────────────────────────────────────┐
│    Your Local Machine                   │
│  ┌──────────────────────────────────┐   │
│  │ git push origin HEAD:main        │   │
│  └──────────────────────────────────┘   │
└─────────────────┬───────────────────────┘
                  │
                  ▼
        ┌─────────────────────┐
        │   GitHub Actions    │
        │   (3 workflows)     │
        └─────┬───────┬───────┘
              │       │
      ┌───────▼────┐  │
      │  Docker    │  │
      │  Build     │  │
      │   + Push   │  │
      │   to GHCR  │  │
      └───────┬────┘  │
              │       │
      ┌───────▼───────────────┐
      │  Render Deploy        │
      │  (API trigger)        │
      └───────┬───────────────┘
              │       │
              ▼       ▼
        ┌─────────────────────┐
        │  Production Stack   │
        │  - Backend (port 8000)
        │  - MongoDB          │
        │  - SSL/TLS          │
        └─────────────────────┘
              │
              └──◄ Mobile App ──► ┌──────────────┐
                                  │ Google Play  │
                                  │ Store        │
                                  └──────────────┘
```

---

## 🔍 Monitoring & Verification

### Backend Health:
```bash
curl https://your-render-backend.onrender.com/docs
# Should show Swagger UI
```

### Frontend Status:
- Download app from Play Store
- Login with test credentials
- Verify connection to backend

### GitHub Actions Logs:
```
GitHub Repo → Actions → Click workflow run → View logs
```

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Git push fails | Run from machine with GitHub SSH keys |
| Secrets not found | Verify in GitHub Settings → Secrets |
| Build fails | Check GitHub Actions workflow logs |
| Play Store rejection | Review app store compliance guide |

---

## ✅ Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] 5 GitHub Secrets configured
- [ ] Docker build successful (check Actions)
- [ ] Render deployment complete
- [ ] Backend health check passing
- [ ] AAB generated successfully
- [ ] Play Store internal track submission
- [ ] App tested on device
- [ ] Promoted to production track

---

## 📞 Next Steps

1. **From your local machine**, run:
   ```bash
   bash setup-github-secrets.sh
   ```

2. **Push code to GitHub**:
   ```bash
   cd /app
   git push origin HEAD:main
   ```

3. **Monitor GitHub Actions** (5-10 minutes for first build)

4. **Test on device** once deployed

---

**Estimated Total Time:** 15-30 minutes (first deployment)  
**Subsequent Deployments:** 5 minutes (fully automated via CI/CD)

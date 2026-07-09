# 🚀 ONE-PAGE DEPLOYMENT GUIDE

## ⚡ Super Quick (3 Commands)

From your local machine terminal:

```bash
# 1️⃣ Navigate to app
cd /app

# 2️⃣ Run deployment
bash deploy.sh

# 3️⃣ Watch the magic happen
# → Open: https://github.com/himanshusinghRajput1076/APP/actions
```

**That's it!** The script will:
- ✅ Push code to GitHub
- ✅ Add all 5 GitHub Secrets
- ✅ Trigger all 3 CI/CD workflows
- ✅ Open GitHub Actions dashboard

---

## ⏱️ Timeline

| Stage | Time | What's Happening |
|-------|------|-----------------|
| Push to GitHub | 1 min | Your code uploads |
| Docker Build | 3-5 min | Backend container created |
| Render Deploy | 2-3 min | Backend goes live on cloud |
| EAS Build | 5-10 min | Android APK/AAB generated |
| Play Store Submit | 1 min | App submitted to internal track |
| **TOTAL** | **15-20 min** | ✅ Complete! |

---

## 📊 What Gets Deployed

**Backend** → Render Cloud
- FastAPI server
- MongoDB database
- Public API endpoint
- Live immediately after build

**Mobile App** → Google Play Store
- Android app (AAB format)
- Internal testing track
- Ready for QA → Production

---

## ✅ Prerequisites (Check These First)

```bash
# 1. Git installed?
git --version

# 2. GitHub CLI installed?
gh --version
# If not: brew install gh (Mac) or check https://cli.github.com

# 3. GitHub authenticated?
gh auth status
# If not: gh auth login

# 4. SSH keys set up (for push)?
ssh -T git@github.com
# Should say "Hi [username]! You've successfully authenticated"
```

---

## 🔧 Manual Steps (If Script Fails)

### Option 1: Git Push
```bash
cd /app
git push origin HEAD:main
```

### Option 2: Add Secrets Manually
Visit: https://github.com/himanshusinghRajput1076/APP/settings/secrets/actions

Click "New repository secret" for each:

```
RENDER_SERVICE_ID = redis://red-d97u1m8k1i2s73eqbtug:6379
RENDER_API_KEY = tea-d3g9gtm3jp1c73eimhs0
EXPO_TOKEN = 81kkxIHAmu12hEs9SLhw_KYxRfa0z7KHF8O1Jtqs
EXPO_PUBLIC_BACKEND_URL = https://ideacon-api.onrender.com
EAS_BUILD_ANDROID_SERVICE_ACCOUNT_JSON = <full JSON from play-store-service-account.json>
```

### Option 3: Manual Workflow Trigger
1. Go to: https://github.com/himanshusinghRajput1076/APP/actions
2. Select a workflow
3. Click "Run workflow"

---

## 🔍 Monitoring

### GitHub Actions
```
https://github.com/himanshusinghRajput1076/APP/actions
```
- Shows each workflow status
- Real-time logs
- Success/failure details

### Render Backend
```
https://dashboard.render.com
```
- Click your service
- View deployment logs
- Get public URL
- Monitor resource usage

### Google Play Console
```
https://play.google.com/console
```
- Go to IDEACON app
- Internal Testing track
- Monitor submission status
- Approve for production

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| `Permission denied (publickey)` | Add SSH key: `ssh-add ~/.ssh/id_rsa` |
| `gh: command not found` | Install GitHub CLI: `brew install gh` |
| `Not authenticated with GitHub` | Run: `gh auth login` |
| Workflow stuck/failed | Check GitHub Actions logs |
| Play Store build failed | Check EAS build logs in Actions |
| Backend not responding | Check Render deployment logs |

---

## 📞 Get Help

### Check These First:
1. **GitHub Actions Log** - Most detailed info
   - Click failed workflow → View logs
2. **Render Dashboard** - Backend deployment status
3. **EAS Console** - Mobile app build status
4. **Google Play Console** - Store submission status

### Common Issues:
- **Docker build fails?** Check Docker image size
- **Render deploy fails?** Check MongoDB connection URL
- **EAS build fails?** Check Play Store service account JSON
- **App not visible in Play Store?** Check internal testing track first

---

## 🎯 Success Checklist

After running deploy.sh:

- [ ] Git push succeeded (GitHub shows new commit)
- [ ] All 5 secrets added to GitHub
- [ ] Docker workflow started (check Actions)
- [ ] Backend deploy started (check Render)
- [ ] EAS build started (check Actions)
- [ ] Backend health check passing (curl https://your-backend-url/docs)
- [ ] App visible in Play Store internal testing track
- [ ] App downloaded and tested on device

---

## 🎉 You're Done When:

```
✅ GitHub Actions: All workflows green
✅ Render: Backend running (check status)
✅ EAS: AAB generated successfully
✅ Play Store: Internal testing track active
✅ Device: App works with cloud backend
```

---

## 📋 Quick Reference

| Component | Local | Cloud | Play Store |
|-----------|-------|-------|-----------|
| Backend | http://localhost:8000 | https://ideacon-api.onrender.com | - |
| Frontend | http://localhost:8081 | - | Google Play Store |
| Status | 25/25 tests pass ✓ | Via Render dashboard | Internal track |

---

## 🚀 Ready?

```bash
cd /app && bash deploy.sh
```

**Estimated total time: 15-20 minutes**

---

**Questions?** Check detailed guides:
- `DEPLOYMENT_COMPLETE.md` - Full documentation
- `README_DEPLOY.md` - Architecture details
- `frontend/README_EAS.md` - Play Store setup

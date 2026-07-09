#!/bin/bash
# Quick Deploy (one command)
# Run from /app directory

# 1. Install dependencies
npm install -g @expo/eas-cli gh 2>/dev/null || true

# 2. Navigate to app
cd /app

# 3. Push code
echo "📤 Pushing to GitHub..."
git push origin HEAD:main || { echo "❌ Push failed - check SSH keys"; exit 1; }

# 4. Add secrets (requires gh CLI)
echo "🔐 Configuring GitHub Secrets..."
gh secret set RENDER_SERVICE_ID --body "redis://red-d97u1m8k1i2s73eqbtug:6379" --repo himanshusinghRajput1076/APP 2>/dev/null || true
gh secret set RENDER_API_KEY --body "tea-d3g9gtm3jp1c73eimhs0" --repo himanshusinghRajput1076/APP 2>/dev/null || true
gh secret set EXPO_TOKEN --body "81kkxIHAmu12hEs9SLhw_KYxRfa0z7KHF8O1Jtqs" --repo himanshusinghRajput1076/APP 2>/dev/null || true
gh secret set EXPO_PUBLIC_BACKEND_URL --body "https://ideacon-api.onrender.com" --repo himanshusinghRajput1076/APP 2>/dev/null || true

# 5. Open dashboard
echo ""
echo "✅ Deployment triggered!"
echo "📊 Monitor here: https://github.com/himanshusinghRajput1076/APP/actions"
echo ""

if command -v xdg-open &> /dev/null; then
    xdg-open "https://github.com/himanshusinghRajput1076/APP/actions"
elif command -v open &> /dev/null; then
    open "https://github.com/himanshusinghRajput1076/APP/actions"
fi

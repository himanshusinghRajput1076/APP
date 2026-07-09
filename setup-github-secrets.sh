#!/bin/bash
# Setup GitHub Secrets for IDEACON Deployment
# Run this from your local machine with: bash setup-github-secrets.sh

set -e

REPO="himanshusinghRajput1076/APP"

echo "🔐 Setting up GitHub Secrets for $REPO..."
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) not installed. Install it from: https://cli.github.com"
    exit 1
fi

# Authenticate if needed
gh auth status || gh auth login

echo "📝 Adding secrets..."

# Add Render secrets
gh secret set RENDER_SERVICE_ID --body "redis://red-d97u1m8k1i2s73eqbtug:6379" --repo "$REPO"
echo "✅ RENDER_SERVICE_ID added"

gh secret set RENDER_API_KEY --body "tea-d3g9gtm3jp1c73eimhs0" --repo "$REPO"
echo "✅ RENDER_API_KEY added"

# Add Expo secrets
gh secret set EXPO_TOKEN --body "81kkxIHAmu12hEs9SLhw_KYxRfa0z7KHF8O1Jtqs" --repo "$REPO"
echo "✅ EXPO_TOKEN added"

gh secret set EXPO_PUBLIC_BACKEND_URL --body "http://localhost:8000" --repo "$REPO"
echo "✅ EXPO_PUBLIC_BACKEND_URL added"

# Add Play Store service account (read from file or stdin)
if [ -f "play-store-service-account.json" ]; then
    gh secret set EAS_BUILD_ANDROID_SERVICE_ACCOUNT_JSON --body "$(cat play-store-service-account.json)" --repo "$REPO"
    echo "✅ EAS_BUILD_ANDROID_SERVICE_ACCOUNT_JSON added"
else
    echo "⚠️  Play Store service account not found at play-store-service-account.json"
    echo "   Run: echo '{...json...}' > play-store-service-account.json"
    echo "   Then: gh secret set EAS_BUILD_ANDROID_SERVICE_ACCOUNT_JSON --body \"\$(cat play-store-service-account.json)\" --repo \"$REPO\""
fi

echo ""
echo "✅ All secrets configured! GitHub Actions workflows can now:"
echo "   - Build Docker images and deploy to Render"
echo "   - Build Android APK/AAB with EAS"
echo "   - Submit to Google Play Store"

#!/bin/bash
# 🚀 MASTER DEPLOYMENT SCRIPT
# Copy this entire file and run on your local machine

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                 IDEACON CLOUD DEPLOYMENT                       ║"
echo "║              Full Stack • Render • Play Store                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Configuration
REPO="himanshusinghRajput1076/APP"
APP_PATH="/app"  # Adjust if needed

echo "📋 Deployment Configuration:"
echo "   Repository: $REPO"
echo "   App Path: $APP_PATH"
echo ""

# =============================================================================
# STEP 1: PRE-FLIGHT CHECKS
# =============================================================================
echo "🔍 STEP 1: Pre-flight checks..."

check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo "❌ ERROR: $1 not installed"
        echo "   Install from: $2"
        exit 1
    fi
}

check_command "git" "https://git-scm.com/downloads"
echo "   ✅ git installed"

check_command "gh" "https://cli.github.com"
echo "   ✅ GitHub CLI installed"

if ! gh auth status &> /dev/null; then
    echo "❌ ERROR: Not authenticated with GitHub"
    echo "   Run: gh auth login"
    exit 1
fi
echo "   ✅ GitHub authenticated"

cd "$APP_PATH" || { echo "❌ Directory not found: $APP_PATH"; exit 1; }
echo "   ✅ App directory accessible"

if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ ERROR: Not a git repository"
    exit 1
fi
echo "   ✅ Git repository verified"

echo ""

# =============================================================================
# STEP 2: PUSH CODE TO GITHUB
# =============================================================================
echo "📤 STEP 2: Pushing code to GitHub..."

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "   Current branch: $CURRENT_BRANCH"

COMMIT_COUNT=$(git rev-list --count @{u}..HEAD 2>/dev/null || echo "0")
if [ "$COMMIT_COUNT" -gt 0 ]; then
    echo "   📊 Commits to push: $COMMIT_COUNT"
else
    echo "   ℹ️  Repository up to date"
fi

if git push origin HEAD:main; then
    echo "   ✅ Code pushed successfully"
else
    echo "❌ ERROR: Git push failed"
    echo "   Troubleshooting:"
    echo "   1. Check SSH keys: ssh -T git@github.com"
    echo "   2. Or use HTTPS: git remote set-url origin https://github.com/$REPO.git"
    exit 1
fi

LATEST_COMMIT=$(git rev-parse --short HEAD)
echo "   ✅ Latest commit: $LATEST_COMMIT"
echo ""

# =============================================================================
# STEP 3: CONFIGURE GITHUB SECRETS
# =============================================================================
echo "🔐 STEP 3: Configuring GitHub Secrets..."

declare -A SECRETS=(
    [RENDER_SERVICE_ID]="redis://red-d97u1m8k1i2s73eqbtug:6379"
    [RENDER_API_KEY]="tea-d3g9gtm3jp1c73eimhs0"
    [EXPO_TOKEN]="81kkxIHAmu12hEs9SLhw_KYxRfa0z7KHF8O1Jtqs"
    [EXPO_PUBLIC_BACKEND_URL]="https://ideacon-api.onrender.com"
)

for SECRET_NAME in "${!SECRETS[@]}"; do
    SECRET_VALUE="${SECRETS[$SECRET_NAME]}"
    if gh secret set "$SECRET_NAME" --body "$SECRET_VALUE" --repo "$REPO" 2>&1 | grep -q "updated\|set"; then
        echo "   ✅ $SECRET_NAME"
    else
        echo "   ⚠️  $SECRET_NAME (check if already exists)"
    fi
done

# Try to add Play Store service account if file exists
if [ -f "play-store-service-account.json" ]; then
    echo "   📱 Adding Play Store service account..."
    if gh secret set EAS_BUILD_ANDROID_SERVICE_ACCOUNT_JSON \
        --body "$(cat play-store-service-account.json)" \
        --repo "$REPO" 2>&1 | grep -q "updated\|set"; then
        echo "   ✅ EAS_BUILD_ANDROID_SERVICE_ACCOUNT_JSON"
    fi
else
    echo "   ℹ️  play-store-service-account.json not found (skipped)"
fi

echo ""

# =============================================================================
# STEP 4: VERIFY WORKFLOWS
# =============================================================================
echo "⚙️  STEP 4: Verifying CI/CD workflows..."

WORKFLOWS=(
    "docker-image.yml"
    "backend-render-deploy.yml"
    "eas-android.yml"
)

for workflow in "${WORKFLOWS[@]}"; do
    if [ -f ".github/workflows/$workflow" ]; then
        echo "   ✅ $workflow"
    else
        echo "   ⚠️  $workflow not found"
    fi
done

echo ""

# =============================================================================
# STEP 5: TRIGGER DEPLOYMENT
# =============================================================================
echo "🚀 STEP 5: Deployment triggered!"
echo ""

WORKFLOW_URL="https://github.com/$REPO/actions"
echo "📊 Monitor your deployment:"
echo "   $WORKFLOW_URL"
echo ""

echo "⏱️  Expected timeline:"
echo "   • Docker build: 3-5 minutes"
echo "   • Render deploy: 2-3 minutes"
echo "   • EAS Android build: 5-10 minutes"
echo "   • Play Store submit: 1 minute"
echo "   ─────────────────────────────"
echo "   📈 Total: 15-20 minutes"
echo ""

# =============================================================================
# STEP 6: NEXT STEPS
# =============================================================================
echo "✅ DEPLOYMENT INITIATED"
echo ""
echo "📋 Next steps:"
echo ""
echo "1️⃣  Monitor GitHub Actions:"
echo "    → Open: $WORKFLOW_URL"
echo "    → All 3 workflows should show as running/pending"
echo ""
echo "2️⃣  Get your backend URL from Render:"
echo "    → After docker-image workflow completes"
echo "    → Visit: https://dashboard.render.com"
echo "    → Copy the service URL"
echo ""
echo "3️⃣  Update EXPO_PUBLIC_BACKEND_URL secret:"
echo "    → Open: https://github.com/$REPO/settings/secrets/actions"
echo "    → Edit EXPO_PUBLIC_BACKEND_URL"
echo "    → Paste your Render backend URL"
echo "    → This triggers a fresh EAS build with the correct backend"
echo ""
echo "4️⃣  Wait for all workflows to complete (green checkmarks)"
echo ""
echo "5️⃣  Test the app:"
echo "    → Go to: https://play.google.com/console"
echo "    → IDEACON app → Internal Testing"
echo "    → Download to your device"
echo "    → Test login and API calls"
echo ""
echo "6️⃣  Promote to production (when ready):"
echo "    → Internal Testing → Production track"
echo "    → Submit for review"
echo ""

# Optional: Try to open in browser
if command -v xdg-open &> /dev/null; then
    xdg-open "$WORKFLOW_URL"
elif command -v open &> /dev/null; then
    open "$WORKFLOW_URL"
fi

echo ""
echo "═════════════════════════════════════════════════════════════════"
echo "✨ Your app is being deployed!"
echo "═════════════════════════════════════════════════════════════════"
echo ""

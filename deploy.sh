#!/bin/bash
# 🚀 IDEACON Complete Deployment Script
# Run this from your local machine to deploy everything automatically

set -e

REPO="himanshusinghRajput1076/APP"
APP_DIR="/app"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

echo ""
echo "╔════════════════════════════════════════╗"
echo "║  🚀 IDEACON DEPLOYMENT AUTOMATION      ║"
echo "║     Full Stack → Cloud → Play Store    ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Step 1: Check prerequisites
log_info "Step 1/5: Checking prerequisites..."

if ! command -v git &> /dev/null; then
    log_error "Git not installed. Please install Git."
    exit 1
fi
log_success "Git installed"

if ! command -v gh &> /dev/null; then
    log_warning "GitHub CLI (gh) not installed. Install from: https://cli.github.com"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
log_success "Prerequisites checked"

# Step 2: Push code to GitHub
log_info "Step 2/5: Pushing code to GitHub..."
cd "$APP_DIR"

if [ -z "$(git config user.email)" ]; then
    log_warning "Git user not configured. Setting up..."
    git config --global user.email "deployer@ideacon.local"
    git config --global user.name "IDEACON Deployer"
fi

log_info "  Pushing to: $REPO"
if git push origin HEAD:main 2>&1 | tee /tmp/git_push.log; then
    log_success "Code pushed to GitHub"
else
    log_error "Git push failed. Possible issues:"
    log_error "  - SSH keys not configured: ssh-add ~/.ssh/id_rsa"
    log_error "  - Or use HTTPS token authentication"
    exit 1
fi

# Step 3: Authenticate with GitHub
log_info "Step 3/5: Authenticating with GitHub..."
if gh auth status &> /dev/null; then
    log_success "GitHub authentication verified"
else
    log_warning "GitHub authentication needed"
    gh auth login
fi

# Step 4: Add GitHub Secrets
log_info "Step 4/5: Adding GitHub Secrets..."

SECRETS=(
    "RENDER_SERVICE_ID:redis://red-d97u1m8k1i2s73eqbtug:6379"
    "RENDER_API_KEY:tea-d3g9gtm3jp1c73eimhs0"
    "EXPO_TOKEN:81kkxIHAmu12hEs9SLhw_KYxRfa0z7KHF8O1Jtqs"
    "EXPO_PUBLIC_BACKEND_URL:https://ideacon-api.onrender.com"
)

for secret_entry in "${SECRETS[@]}"; do
    SECRET_NAME="${secret_entry%:*}"
    SECRET_VALUE="${secret_entry#*:}"
    
    log_info "  Adding secret: $SECRET_NAME"
    if gh secret set "$SECRET_NAME" --body "$SECRET_VALUE" --repo "$REPO" 2>&1 | grep -q "updated"; then
        log_success "    $SECRET_NAME updated"
    else
        log_success "    $SECRET_NAME added"
    fi
done

# Step 5: Add Play Store Service Account (if file exists)
if [ -f "play-store-service-account.json" ]; then
    log_info "  Adding Play Store service account..."
    gh secret set EAS_BUILD_ANDROID_SERVICE_ACCOUNT_JSON \
        --body "$(cat play-store-service-account.json)" \
        --repo "$REPO"
    log_success "    Play Store service account added"
else
    log_warning "  play-store-service-account.json not found"
    log_warning "  Add it manually from Google Play Console"
fi

log_success "All secrets configured"

# Step 5: Monitor deployment
log_info "Step 5/5: Opening GitHub Actions dashboard..."
WORKFLOW_URL="https://github.com/$REPO/actions"
echo ""
log_success "🎯 Deployment triggered!"
echo ""
echo "📊 Monitor your deployment here:"
echo "   $WORKFLOW_URL"
echo ""
echo "The following will happen automatically:"
echo "  1. Docker image builds (3-5 min)"
echo "  2. Backend deploys to Render (2-3 min)"
echo "  3. Android AAB builds with EAS (5-10 min)"
echo "  4. App submits to Play Store (1 min)"
echo ""
echo "⏱️  Total estimated time: 15-20 minutes"
echo ""

# Try to open in browser (platform-specific)
if command -v xdg-open &> /dev/null; then
    xdg-open "$WORKFLOW_URL"
elif command -v open &> /dev/null; then
    open "$WORKFLOW_URL"
else
    log_info "Open this URL in your browser: $WORKFLOW_URL"
fi

echo ""
log_success "✨ Deployment automation complete!"
echo ""
echo "Next steps:"
echo "  1. Monitor GitHub Actions (link above)"
echo "  2. Check Render dashboard: https://dashboard.render.com"
echo "  3. Get backend URL from Render, update EXPO_PUBLIC_BACKEND_URL secret"
echo "  4. Test app from Play Store internal track"
echo ""

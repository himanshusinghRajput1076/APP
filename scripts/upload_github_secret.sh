#!/usr/bin/env bash
# Upload a JSON key file as GitHub Actions secret `GCLOUD_SERVICE_KEY`
set -euo pipefail

REPO=${1:-himanshusinghRajput1076/APP}
KEY_FILE=${2:-key.json}

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not found. Install it: https://cli.github.com/"
  exit 1
fi

if [ ! -f "$KEY_FILE" ]; then
  echo "Key file $KEY_FILE not found"
  exit 1
fi

echo "Uploading $KEY_FILE to GitHub repo $REPO as secret GCLOUD_SERVICE_KEY"
gh auth status || echo "Ensure gh is authenticated (gh auth login)"
gh secret set GCLOUD_SERVICE_KEY --body "$(cat $KEY_FILE)" -R "$REPO"

echo "Uploaded. Trigger the workflow: gh workflow run flutterfire-configure.yml -R $REPO"

#!/usr/bin/env bash
# Creates a GCP service account and downloads a key.json
set -euo pipefail

PROJECT_ID=${1:-plan-b-a539d}
SA_NAME=${2:-flutterfire-sa}
KEY_FILE=${3:-key.json}

echo "Using project: $PROJECT_ID"

gcloud config set project "$PROJECT_ID"

echo "Creating service account: $SA_NAME"
gcloud iam service-accounts create "$SA_NAME" \
  --display-name="flutterfire CI service account"

SA_EMAIL="$SA_NAME@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Granting roles/editor to $SA_EMAIL (adjust as needed)"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/editor"

echo "Creating key file: $KEY_FILE"
gcloud iam service-accounts keys create "$KEY_FILE" \
  --iam-account="$SA_EMAIL"

echo "Created $KEY_FILE. Keep it secret. To upload to GitHub as secret, run scripts/upload_github_secret.sh"

#!/usr/bin/env bash
# Run flutterfire configure locally using a service account key
set -euo pipefail

FLUTTER_DIR=${1:-"${PWD}/flutter"}
KEY_FILE=${2:-"key.json"}
PROJECT_ID=${3:-"plan-b-a539d"}

echo "Using Flutter project directory: $FLUTTER_DIR"

if ! command -v flutter >/dev/null 2>&1 && ! command -v dart >/dev/null 2>&1; then
  echo "Flutter or Dart not found. Install Flutter: https://flutter.dev/docs/get-started/install"
  exit 1
fi

export PATH="$PATH:$HOME/.pub-cache/bin"
export GOOGLE_APPLICATION_CREDENTIALS="$KEY_FILE"

echo "Activating flutterfire_cli"
dart pub global activate flutterfire_cli || flutter pub global activate flutterfire_cli

cd "$FLUTTER_DIR"
flutter pub get
flutterfire configure --project="$PROJECT_ID"

echo "Generated lib/firebase_options.dart (if successful)"

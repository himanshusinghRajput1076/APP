EAS Play Store publish checklist

1. Install `eas-cli` and authenticate:

```
npm install -g eas-cli
eas login
```

2. Configure Play Console:
- Create a Google Play Console account and a project for the app.
- Create a service account and grant `Release Manager` / `Play Console` permissions.
- Download the JSON key and keep it secure.

3. Let EAS manage credentials or provide the service account:

```
cd frontend
eas credentials
# follow prompts to upload service account JSON
```

4. Build and submit:

```
eas build --platform android --profile production
eas submit -p android --latest
```

Notes:
- `eas.json` already contains a `production` profile with `app-bundle`.
- CI automation for EAS builds can be added; you'll need to store the Play service account JSON as a secure secret in the CI provider.

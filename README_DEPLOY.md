**Deploy guide — backend & Android (EAS)**

- Backend: Docker image + MongoDB. CI builds image to GitHub Container Registry (see .github/workflows/docker-image.yml).
- Mobile: use Expo EAS to build an Android app bundle (AAB) and publish to Play Store.

Backend quick start (local):

```
# build and start services
docker-compose build
docker-compose up -d

# backend will be available at http://localhost:8000
```

CI / registry notes:
- The provided workflow builds and pushes `ghcr.io/<owner>/<repo>-backend:latest`.
- Set `GITHUB_TOKEN` (automatically provided) or use a PAT for other registries.
- For Render deployment, create `RENDER_SERVICE_ID` and `RENDER_API_KEY` secrets and the workflow will trigger a new Render deploy.

Render deployment notes:
- Use the `backend-render-deploy.yml` GitHub Action to build the backend image and trigger a Render service deploy.
- The backend source is packaged from `backend/` and uses `backend/Dockerfile`.
- Render must be configured to pull the image from GHCR or run the deploy from source.

EAS Android (Play Store) notes:
- Install `eas-cli` and login to your Expo account.
- Ensure `eas.json` has a `production` profile with `android.buildType: "app-bundle"` (already present).
- To create a Play Store release using EAS:

```
npm install -g eas-cli
cd frontend
eas login           # interactive
eas build --profile production --platform android
eas submit -p android --latest
```

- You will need Play Console access and to provide service account credentials to EAS (see Expo docs).

If you want, I can:
- create a Render / DigitalOcean App spec to deploy the Docker image automatically (need target platform choice and credentials),
- or prepare Terraform/Cloud Run manifests for GCP.

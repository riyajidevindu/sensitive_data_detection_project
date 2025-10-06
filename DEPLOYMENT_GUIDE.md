# Deployment & CI/CD Guide

This document guides a junior DevOps engineer through deploying the project:

- Backend (FastAPI) -> Google Cloud Run
- Frontend (React) -> Vercel
- Container images stored in Docker Hub
- Automated CI/CD via GitHub Actions

---
## 1. Prerequisites

### Accounts & Tools
- GitHub repository (already present)
- Docker Hub organization (e.g. `yourdockerorg`)
- Google Cloud Project (Billing enabled)
- Vercel account (import GitHub repo optional)
- Service Account in GCP with roles:
  - Cloud Run Admin
  - Service Account User
  - Storage Admin (if pulling from Artifact Registry later)
  - Viewer (basic)
- Generated JSON key for the service account
- Installed: `gcloud`, `docker` (locally if testing)

### Naming (adjust as needed)
| Component | Suggested Name |
|-----------|----------------|
| Cloud Run Service | `sensitive-data-backend` |
| Docker image | `yourdockerorg/sensitive-data-backend` |
| GCP Region | `us-central1` (or choose geographically close) |

---
## 2. Backend Container Build (Local Test)
```bash
# From repo root
# Build image (uses updated Dockerfile optimized for Cloud Run)
docker build -t yourdockerorg/sensitive-data-backend:dev -f backend/Dockerfile .

# Run locally
docker run -p 8000:8000 yourdockerorg/sensitive-data-backend:dev
# Visit http://localhost:8000/docs
```

---
## 3. Push Image to Docker Hub (Manual First Time)
```bash
docker login -u YOUR_DOCKERHUB_USERNAME
docker push yourdockerorg/sensitive-data-backend:dev
```
*GitHub Actions will later push `:shortsha` and `:latest` automatically.*

---
## 4. Google Cloud Setup
```bash
# Set project
gcloud config set project <PROJECT_ID>

# Enable required APIs
gcloud services enable run.googleapis.com artifactregistry.googleapis.com

# (Optional) Create dedicated service account
gcloud iam service-accounts create cicd-runner \
  --display-name "CI/CD GitHub Actions Runner"

# Grant roles
gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:cicd-runner@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:cicd-runner@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Create key
gcloud iam service-accounts keys create key.json \
  --iam-account=cicd-runner@<PROJECT_ID>.iam.gserviceaccount.com
```
Base64 encode `key.json` (if you prefer) otherwise paste raw JSON into GitHub Secret `GCP_SA_KEY`.

Initial deploy (uses Docker Hub image):
```bash
gcloud run deploy sensitive-data-backend \
  --image yourdockerorg/sensitive-data-backend:dev \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --cpu=2 --memory=2Gi
```

---
## 5. Vercel Frontend Setup
1. Create a new Vercel project.
2. Framework preset: Create React App (auto-detected).
3. Build Command: `npm run build`
4. Output Directory: `frontend/build` (if root is repo root set the project root to `frontend`).
5. Add environment variable `REACT_APP_API_BASE_URL` pointing to the Cloud Run URL once backend is deployed (e.g. `https://sensitive-data-backend-xxxx-uc.a.run.app`).
6. Obtain:
   - `VERCEL_TOKEN` (personal/token)
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`

Add them to GitHub Secrets.

---
## 6. GitHub Secrets Required
Add under Repo Settings -> Secrets & Variables -> Actions:

| Secret | Purpose |
|--------|---------|
| `DOCKERHUB_USERNAME` | Docker Hub login |
| `DOCKERHUB_TOKEN` | Docker Hub PAT / password |
| `DOCKERHUB_ORG` | Organization / username (value used in workflow env) |
| `GCP_PROJECT_ID` | GCP project id |
| `GCP_REGION` | Region for Cloud Run (e.g. `us-central1`) |
| `GCP_SA_KEY` | JSON key of service account |
| `VERCEL_TOKEN` | Deploy token |
| `VERCEL_ORG_ID` | Vercel org id |
| `VERCEL_PROJECT_ID` | Vercel project id |

Optional future:
| Secret | Purpose |
|--------|---------|
| `REACT_APP_API_BASE_URL` | (If you want to inject at build via workflow) |

---
## 7. CI/CD Workflows Overview

### Backend (`.github/workflows/backend-ci-cd.yml`)
Steps:
1. Trigger on push/PR to `main` touching backend or model.
2. Install deps and run pytest.
3. Build Docker image and push to Docker Hub (`:shortsha` + `:latest` on main).
4. Deploy to Cloud Run using Docker Hub image (only on main branch push).

### Frontend (`.github/workflows/frontend-ci-cd.yml`)
Steps:
1. Trigger on push/PR to `main` touching frontend.
2. Install dependencies, (placeholder lint/tests), build.
3. Upload build artifact.
4. Deploy to Vercel with `--prod` (only on main branch push).

---
## 8. Environment Variables (Runtime)
Backend (Cloud Run) environment variables can be set or updated by adding `--set-env-vars` flags in deploy step (modify workflow if needed), e.g.:
```
--set-env-vars=PYTHONUNBUFFERED=1,LOG_LEVEL=info,MODEL_PATH=/app/model/best.onnx
```
If you later need secrets (API keys, etc.) consider using:
- Secret Manager + `gcloud secrets versions access` during container start
- Or `--set-secrets` flag on Cloud Run (newer feature)

Frontend uses environment variables with `REACT_APP_` prefix at build time.

---
## 9. Updating the Backend Image Source
Currently the Cloud Run deploy uses the `latest` tag from Docker Hub. For stricter immutability you can instead:
1. Capture the built tag (short SHA) as an artifact / output.
2. Pass it to the deploy job and deploy that immutable tag.
3. Optionally promote by retagging to `prod`.

---
## 10. Common Troubleshooting
| Issue | Cause | Fix |
|-------|-------|-----|
| Cloud Run 503 cold starts | Large image sizes | Use smaller base, prune, multi-stage, remove dev deps |
| Model file missing | Build context wrong | Ensure `docker build -f backend/Dockerfile .` run at repo root (includes `model/`) |
| Vercel build fails | Wrong project root | Set root directory to `frontend` in Vercel project settings |
| CORS errors | Frontend calling different origin | Add CORSMiddleware in FastAPI allowing Vercel domain |
| Rate limited Docker pulls | Too many deployments | Enable Docker Hub Authed pulls (already via login) |

---
## 11. Next Improvements
- Add caching / model download step checksum.
- Add security scans (`anchore/grype`, `trivy`) in backend pipeline.
- Integrate CD only after successful manual approval (environments protection).
- Add Jest + React Testing Library for frontend tests.
- Use Artifact Registry instead of Docker Hub (better locality & IAM control).
- Add IaC (Terraform) for reproducible infra.

---
## 12. Quick Recap for Junior Engineer
1. Create Docker Hub org & push first manual image.
2. Create GCP service account & add JSON key to GitHub secrets.
3. Enable Cloud Run API & do first manual deploy.
4. Setup Vercel project pointing at `frontend` folder.
5. Add all secrets to GitHub.
6. Merge to `main` → GitHub Actions builds & deploys automatically.
7. Update frontend env var with backend URL and redeploy.

You're done! Monitor Cloud Run dashboard and Vercel deployments.

---
Questions or issues? Check workflow run logs in GitHub Actions tab.

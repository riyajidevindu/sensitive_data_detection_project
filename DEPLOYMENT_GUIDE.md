# Deployment & CI/CD Guide

This document guides a junior DevOps engineer through deploying the project.

Primary reference stacks:

- Option A (initial): Backend (FastAPI) -> Google Cloud Run
- Option B (alternative): Backend (FastAPI) -> Railway
- Option C (unified): Backend + Frontend in a single container (Railway fullstack)
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
## 4. (Option A) Google Cloud Run Setup
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
## 5. (Option B) Railway Backend Deployment

Choose Railway if you prefer a simpler PaaS experience without managing GCP IAM.

### 5.1 Create Railway Project & Service
1. Sign in to https://railway.app
2. Create a new project (e.g. `sensitive-data-detector`).
3. Add a service:
  - Either: Deploy from GitHub (Railway builds the Dockerfile automatically)
  - Or: Configure service to deploy from an external image (Docker Hub). In that case you will specify `yourdockerorg/sensitive-data-backend:latest` initially.
4. Note the project ID (visible in CLI after linking) and service name.

### 5.2 Generate a Railway Token
In dashboard: Account > API Tokens. Create a token and store as GitHub secret `RAILWAY_TOKEN`.

### 5.3 Environment Variables (Railway)
Set in Railway service:
```
PYTHONUNBUFFERED=1
LOG_LEVEL=INFO
MODEL_PATH=/app/model/best.pt
# Adjust CORS; example Vercel prod domain
BACKEND_CORS_ORIGINS=https://your-frontend.vercel.app,https://localhost:3000
```
If you produce outputs you need persisted, remember Railway ephemeral filesystem resets on redeploy. Consider an object storage off-platform if persistence is required.

### 5.4 Deployment Strategies
| Strategy | Description | Pros | Cons |
|----------|-------------|------|------|
| Direct GitHub build | Railway builds from repo on push | Simple | Less control over image scan pipeline |
| External image (recommended with CI) | GitHub Actions builds, scans, pushes to Docker Hub; Railway deploys that immutable tag | Security + reproducibility | Needs extra secrets & action |

### 5.5 GitHub Secrets for Railway
Add (in addition to Docker Hub + frontend):
| Secret | Purpose |
|--------|---------|
| `RAILWAY_TOKEN` | Auth for CLI/API |
| `RAILWAY_PROJECT_ID` | Project link id (used by CLI) |
| `RAILWAY_ENVIRONMENT` | (Optional) environment name if you have multiple |
| `RAILWAY_SERVICE_NAME` | Explicit service name for deploy command |

### 5.6 CI/CD Workflow (Railway)
A new workflow `.github/workflows/backend-railway-ci-cd.yml` was added:
### 5.8 Unified Fullstack Deployment (Single Service)
If you prefer one service hosting both API and React UI:

1. Use the root `Dockerfile` (multi-stage) added to the repository.
2. Enable the workflow `.github/workflows/fullstack-railway-ci-cd.yml` (already present).
3. Ensure `SERVE_FRONTEND=true` (default in image) OR set as Railway environment variable.
4. Frontend static files are built into `/app/frontend_build` and served at `/`.
5. API remains under `/api/v1/*`.

Client code should call relative URLs (e.g. `/api/v1/health`). If currently hard-coded to `http://localhost:8000`, update frontend services to use `window.location.origin` + `/api/v1` or an env var.

Pros:
- One container & domain
- Simpler CORS (same origin)

Cons:
- Larger image (Node build + Python runtime)
- Frontend rebuild always required for backend-only changes (unless you separate workflows)

To switch: point your Railway service to build the root and stop the separate backend/frontend services.

1. Runs tests & builds Docker image
2. Pushes image with short SHA tag (and `latest` on `main`)
3. Deploys to Railway using the CLI with the immutable tag

You can disable the previous Cloud Run workflow if solely using Railway.

### 5.7 Manual Local Deploy Test (Railway image)
```bash
docker build -t yourdockerorg/sensitive-data-backend:test -f backend/Dockerfile .
docker run -p 8000:8000 yourdockerorg/sensitive-data-backend:test
# After verifying, push and let workflow deploy.
```

---
## 6. Vercel Frontend Setup
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
## 7. GitHub Secrets Required (Consolidated)
Add under Repo Settings -> Secrets & Variables -> Actions:

| Secret | Purpose |
|--------|---------|
| `DOCKERHUB_USERNAME` | Docker Hub login |
| `DOCKERHUB_TOKEN` | Docker Hub PAT / password |
| `DOCKERHUB_ORG` | Organization / username (value used in workflow env) |
| `GCP_PROJECT_ID` | (Cloud Run only) GCP project id |
| `GCP_REGION` | (Cloud Run only) Region for Cloud Run |
| `GCP_SA_KEY` | (Cloud Run only) JSON key of service account |
| `RAILWAY_TOKEN` | (Railway only) API token |
| `RAILWAY_PROJECT_ID` | (Railway only) Project ID |
| `RAILWAY_ENVIRONMENT` | (Railway optional) Env name |
| `RAILWAY_SERVICE_NAME` | (Railway optional) Service name override |
| `VERCEL_TOKEN` | Deploy token |
| `VERCEL_ORG_ID` | Vercel org id |
| `VERCEL_PROJECT_ID` | Vercel project id |

Optional future:
| Secret | Purpose |
|--------|---------|
| `REACT_APP_API_BASE_URL` | (If you want to inject at build via workflow) |

---
## 8. CI/CD Workflows Overview

### Backend (Cloud Run) - `.github/workflows/backend-ci-cd.yml`
Steps:
1. Trigger on push/PR to `main` touching backend or model.
2. Install deps and run pytest.
3. Build Docker image and push to Docker Hub (`:shortsha` + `:latest` on main).
4. Deploy to Cloud Run using Docker Hub image (only on main branch push).

### Backend (Railway) - `.github/workflows/backend-railway-ci-cd.yml`
Steps:
1. Build & test
2. Push image (short SHA)
3. Deploy using Railway CLI with immutable tag

### Frontend (`.github/workflows/frontend-ci-cd.yml`)
Steps:
1. Trigger on push/PR to `main` touching frontend.
2. Install dependencies, (placeholder lint/tests), build.
3. Upload build artifact.
4. Deploy to Vercel with `--prod` (only on main branch push).

---
## 9. Environment Variables (Runtime)
Backend (Cloud Run) environment variables can be set or updated by adding `--set-env-vars` flags in deploy step (modify workflow if needed), e.g.:
```
--set-env-vars=PYTHONUNBUFFERED=1,LOG_LEVEL=info,MODEL_PATH=/app/model/best.onnx
```
If you later need secrets (API keys, etc.) consider using:
- Secret Manager + `gcloud secrets versions access` during container start
- Or `--set-secrets` flag on Cloud Run (newer feature)

Frontend uses environment variables with `REACT_APP_` prefix at build time.

---
## 10. Updating the Backend Image Source
Currently the Cloud Run deploy uses the `latest` tag from Docker Hub. For stricter immutability you can instead:
1. Capture the built tag (short SHA) as an artifact / output.
2. Pass it to the deploy job and deploy that immutable tag.
3. Optionally promote by retagging to `prod`.

---
## 11. Common Troubleshooting
| Issue | Platform | Cause | Fix |
|-------|----------|-------|-----|
| 404 after deploy | Railway | Service not listening on provided PORT | Ensure app uses `$PORT` env (already handled) |
| Files disappear on redeploy | Railway | Ephemeral FS | External storage (S3/R2) or database |
| Slow cold start | Railway/Cloud Run | Large image size | Multi-stage build, slim base, precompile models |
| Issue | Cause | Fix |
|-------|-------|-----|
| Cloud Run 503 cold starts | Large image sizes | Use smaller base, prune, multi-stage, remove dev deps |
| Model file missing | Build context wrong | Ensure `docker build -f backend/Dockerfile .` run at repo root (includes `model/`) |
| Vercel build fails | Wrong project root | Set root directory to `frontend` in Vercel project settings |
| CORS errors | Frontend calling different origin | Add CORSMiddleware in FastAPI allowing Vercel domain |
| Rate limited Docker pulls | Too many deployments | Enable Docker Hub Authed pulls (already via login) |

---
## 12. Next Improvements
- Add caching / model download step checksum.
- Add security scans (`anchore/grype`, `trivy`) in backend pipeline.
- Integrate CD only after successful manual approval (environments protection).
- Add Jest + React Testing Library for frontend tests.
- Use Artifact Registry instead of Docker Hub (better locality & IAM control).
- Add IaC (Terraform) for reproducible infra.

---
## 13. Quick Recap for Junior Engineer (Railway Path)
1. Create Railway project + service.
2. Add required secrets to GitHub (Railway + Docker Hub + Vercel).
3. Push to `dev` or `main`; workflow builds image & deploys.
4. Obtain Railway domain and set `REACT_APP_API_BASE_URL` in Vercel.
5. Confirm CORS origins updated via Railway env var.

If using Cloud Run instead, follow earlier Option A steps.
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

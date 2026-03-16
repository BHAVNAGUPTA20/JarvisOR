#!/usr/bin/env bash
set -euo pipefail

# ─── Jarvis OR Guardian — Automated Cloud Run Deployment ─────────
#
# Usage:
#   ./deploy.sh                          # uses defaults
#   ./deploy.sh --project my-gcp-project # override project
#   ./deploy.sh --region us-east1        # override region
#
# Prerequisites:
#   - gcloud CLI authenticated (gcloud auth login)
#   - Docker (for local build option)
#   - GEMINI_API_KEY set in environment or passed via --api-key

SERVICE_NAME="jarvis-or"
REGION="us-central1"
PROJECT_ID=""
GEMINI_API_KEY="${GEMINI_API_KEY:-}"
MEMORY="1Gi"
CPU="2"
MAX_INSTANCES="10"
USE_SOURCE_DEPLOY="true"

while [[ $# -gt 0 ]]; do
    case $1 in
        --project)    PROJECT_ID="$2";       shift 2 ;;
        --region)     REGION="$2";           shift 2 ;;
        --api-key)    GEMINI_API_KEY="$2";   shift 2 ;;
        --memory)     MEMORY="$2";           shift 2 ;;
        --cpu)        CPU="$2";              shift 2 ;;
        --image)      USE_SOURCE_DEPLOY="false"; shift ;;
        *)            echo "Unknown option: $1"; exit 1 ;;
    esac
done

if [[ -z "$PROJECT_ID" ]]; then
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
    if [[ -z "$PROJECT_ID" ]]; then
        echo "ERROR: No GCP project set. Use --project <id> or run: gcloud config set project <id>"
        exit 1
    fi
fi

echo "╔══════════════════════════════════════════════════╗"
echo "║   Jarvis OR Guardian — Cloud Run Deployment      ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║  Project:  $PROJECT_ID"
echo "║  Region:   $REGION"
echo "║  Service:  $SERVICE_NAME"
echo "║  Memory:   $MEMORY  |  CPU: $CPU"
echo "║  Method:   $([ "$USE_SOURCE_DEPLOY" = "true" ] && echo "Source deploy" || echo "Container image")"
echo "╚══════════════════════════════════════════════════╝"
echo ""

gcloud config set project "$PROJECT_ID"

# Enable required APIs
echo "→ Enabling required Google Cloud APIs..."
gcloud services enable \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    containerregistry.googleapis.com \
    artifactregistry.googleapis.com \
    2>/dev/null || true

ENV_VARS="GEMINI_MODEL=gemini-2.5-flash"
if [[ -n "$GEMINI_API_KEY" ]]; then
    ENV_VARS="${ENV_VARS},GEMINI_API_KEY=${GEMINI_API_KEY}"
fi

if [[ "$USE_SOURCE_DEPLOY" == "true" ]]; then
    echo "→ Deploying from source (Cloud Build + Cloud Run)..."
    gcloud run deploy "$SERVICE_NAME" \
        --source . \
        --region "$REGION" \
        --platform managed \
        --allow-unauthenticated \
        --memory "$MEMORY" \
        --cpu "$CPU" \
        --max-instances "$MAX_INSTANCES" \
        --timeout 300 \
        --set-env-vars "$ENV_VARS"
else
    IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"

    echo "→ Building container image..."
    gcloud builds submit --tag "$IMAGE"

    echo "→ Deploying container to Cloud Run..."
    gcloud run deploy "$SERVICE_NAME" \
        --image "$IMAGE" \
        --region "$REGION" \
        --platform managed \
        --allow-unauthenticated \
        --memory "$MEMORY" \
        --cpu "$CPU" \
        --max-instances "$MAX_INSTANCES" \
        --timeout 300 \
        --set-env-vars "$ENV_VARS"
fi

echo ""
echo "→ Fetching service URL..."
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --region "$REGION" \
    --format "value(status.url)")

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   Deployment Complete                            ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║  URL: $SERVICE_URL"
echo "╚══════════════════════════════════════════════════╝"
echo ""

echo "→ Running health check..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${SERVICE_URL}/health")
if [[ "$HTTP_STATUS" == "200" ]]; then
    echo "✓ Health check passed (HTTP $HTTP_STATUS)"
else
    echo "⚠ Health check returned HTTP $HTTP_STATUS"
fi

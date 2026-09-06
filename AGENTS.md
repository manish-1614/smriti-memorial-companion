# Project Operational Directives

## Cloud Run Deployment Requirement
Always use the following format for deploying the `smriti` application to Google Cloud Run, including the mandatory `--clear-base-image` flag:

```bash
cd ~/smriti

gcloud run deploy smriti \
  --source . \
  --port 8080 \
  --memory 1Gi \
  --region asia-southeast1 \
  --clear-base-image \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --set-env-vars NEXT_PUBLIC_FIREBASE_PROJECT_ID=smriti-87d70,NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBNokx9zxnVs2TWyAhblpVlSXVUnqbqQe8,NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=smriti-87d70.firebaseapp.com,NEXT_PUBLIC_FIREBASE_DATABASE_ID=\(default\) \
  --labels dev-tutorial=cloud-run-ai-challenge
```

And update verification label if needed:
```bash
gcloud run services update smriti \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=asia-southeast1
```

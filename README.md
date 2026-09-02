# Smriti — Digital Memorial Companion

Smriti is an authentic, user-authenticated digital memorial companion application grounded in personal stories, anecdotes, and memories using Google Gemini API (`text-embedding-004` and `gemini-2.5-flash`) and Cloud Firestore, deployable as a secure container on Google Cloud Run.

---

## 🌟 Key Features

1. **Google Sign-In with Firebase Authentication**: Passwordless federated login securing personal memorials with zero custom password storage.
2. **Memorial Profiles**: Individual profiles with static emoji/photo avatars, relationship markers, personality traits, and custom voice/tone notes.
3. **Memory Vector Indexing**: Stories, anecdotes, quotes, routines, and life lessons converted to vector embeddings via Gemini `text-embedding-004`.
4. **Traceable Grounded Companion**: Real-time companion chat that retrieves the most relevant memories via vector cosine similarity search and system instructions, never fabricating false facts.
5. **Traceability & Grounding Badges**: Visual inspection pills in chat showing the exact memory anchors and vector similarity scores that informed each response.
6. **Chronological Dialogue History**: Multi-session conversation management saved securely under user-isolated paths in Cloud Firestore.
7. **Production Cloud Run Container**: Complete Dockerfile and Cloud Run deployment flow.

---

## 🔒 Security Architecture & Firestore Rules

All data is strictly owner-isolated in Firestore under `/users/{userId}/...` path hierarchy:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Isolated per user
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /memorials/{memorialId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;

        match /memories/{memoryId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }

        match /conversations/{conversationId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;

          match /messages/{messageId} {
            allow read, write: if request.auth != null && request.auth.uid == userId;
          }
        }
      }
    }
  }
}
```

---

## 🚀 Cloud Run Deployment & Verification Guide

### 1. Prerequisites & GCP APIs Setup

Enable the required Google Cloud APIs:
```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  cloudbuild.googleapis.com
```

### 2. Secret Manager Configuration

Store your Gemini API key in Google Cloud Secret Manager:

```bash
# Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the default Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Deploy to Google Cloud Run

Deploy directly from source container with Secret Manager binding and mandatory campaign verification labeling:

```bash
gcloud run deploy smriti \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --set-env-vars NEXT_PUBLIC_FIREBASE_PROJECT_ID=gen-lang-client-0588761303 \
  --labels dev-tutorial=cloud-run-ai-challenge
```

### 4. Automated Verification Label Binding

```bash
gcloud run services update smriti \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 🧪 Functional Walkthrough & Test Guide

Every user interaction has a corresponding verification scenario:

1. **Authentication Flow**:
   - **Test 1.1**: Open landing page $\rightarrow$ Verify "Sign In with Google" triggers Google OAuth popup.
   - **Test 1.2**: On successful authentication $\rightarrow$ Dashboard renders with user name and avatar in top navigation.
   - **Test 1.3**: Sign out button $\rightarrow$ User session terminates, returning to landing page.

2. **Memorial Profile Management**:
   - **Test 2.1**: Click "Create Memorial Profile" $\rightarrow$ Modal opens.
   - **Test 2.2**: Input Name, Relationship, Emoji/Photo avatar, Personality traits $\rightarrow$ Click "Create Memorial".
   - **Test 2.3**: Verify card appears in dashboard grid with Firestore persistence.
   - **Test 2.4**: Edit profile $\rightarrow$ Updates reflect instantly in Firestore.
   - **Test 2.5**: Delete profile $\rightarrow$ Deletes memorial document and removes card.

3. **Memory Recording & Vector Embedding**:
   - **Test 3.1**: Open "Memories" on profile $\rightarrow$ Click "Add New Memory".
   - **Test 3.2**: Fill Title, Category (Anecdote, Quote, Lesson, etc.), Story text $\rightarrow$ Click "Save & Embed Memory".
   - **Test 3.3**: Verify server API `/api/memories/embed` runs `text-embedding-004` and stores the vector array in Firestore document.
   - **Test 3.4**: Memory card displays green "Vector Indexed" badge.
   - **Test 3.5**: Test search and category filtering bars.

4. **Grounded Companion Chat**:
   - **Test 4.1**: Click "Converse" or "Open Companion Chat".
   - **Test 4.2**: Send a question referencing a saved memory (e.g. "What recipe did you love making?").
   - **Test 4.3**: Server computes query embedding, calculates cosine similarity against memory vectors, and includes relevant stories in Gemini `gemini-2.5-flash` context.
   - **Test 4.4**: AI companion replies with warmth grounded specifically in that memory.
   - **Test 4.5**: Click "Grounded in X stored memories" dropdown on the assistant bubble $\rightarrow$ Verify vector match similarity score and memory anchor snippets are visible.

5. **Chronological Conversation History**:
   - **Test 5.1**: Sidebar lists past dialogues ordered by timestamp.
   - **Test 5.2**: Click "New" $\rightarrow$ Creates new conversation session in Firestore.
   - **Test 5.3**: Switching between dialogues restores past messages accurately.

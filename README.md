# ReturnMinder

<div align="center">
  <h3>An autonomous AI agent that monitors your inbox, extracts return policies, and proactively saves you from missing return deadlines.</h3>
  <p>Built for the <strong>All Things Agentic Hackathon</strong> (Track: <em>The Taskmaster</em>)</p>
</div>

---

## Features

* **Zero-Click Autonomous Tracking:** No manual data entry. Forward a receipt or let the webhook watch your inbox, and ReturnMinder handles the rest.
* **Multimodal UX (Vision AI):** Snap a photo of a physical store receipt. Gemini 3.5 Flash's vision model reads the crumpled paper, finds the fine-print return policy, and calculates the exact deadline.
* **Event-Driven Ingestion:** Built on Google Cloud Pub/Sub. No infinite polling. Gmail instantly pushes webhooks to the Node.js backend the millisecond an email arrives.
* **Proactive Alerts:** A background cron job constantly audits your Firestore memory bank. If a return window is closing in 7 days or 1 day, it autonomously dispatches a rich HTML warning email so you never lose money.

---

## Architecture

ReturnMinder is a robust, completely decoupled system built for production-scale resilience.

![ReturnMinder Architecture](Architecture.jpeg)

[View interactive diagram on Excalidraw](https://excalidraw.com/#json=pk5l4Zv3f7aA23MlJ9Umh,nInwi02KRXe5rS-XKseKmg)

### Tech Stack
* **Frontend:** Next.js (React), TailwindCSS, Lucide Icons.
* **Backend:** Node.js, Express, TypeScript.
* **Agent Framework:** Google AI SDK (`@google/genai`).
* **AI Model:** Gemini 3.5 Flash (Text & Vision).
* **Cloud Infrastructure:** Google Cloud Pub/Sub (Event ingestion) and Firebase/Firestore (NoSQL database).

---

## Local Spin-Up Instructions

### Prerequisites
* Node.js (v18+)
* A Google Cloud Project with the Gmail API enabled.
* A Firebase Project (Firestore).
* A Gemini API Key from Google AI Studio.

### 1. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:
```env
PORT=8080
GEMINI_API_KEY="your-gemini-api-key"
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:8080/api/auth/callback"
GOOGLE_PROJECT_ID="your-gcp-project-id"
# Optional overrides:
NEXT_PUBLIC_FRONTEND_URL="http://localhost:3000"
```

Start the backend:
```bash
npm run dev
```
*(The backend will run on http://localhost:8080)*

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env.local` file in the `frontend/` directory:
```env
NEXT_PUBLIC_BACKEND_URL="http://localhost:8080"
```

Start the frontend:
```bash
npm run dev
```
*(The frontend will run on http://localhost:3000)*

### 3. Usage
* Open `http://localhost:3000` in your browser.
* Click the "Connect Gmail" button or visit `http://localhost:8080/api/auth/google` directly to authenticate.
* Your background agent is now active! Any forwarded receipts or uploaded images will automatically populate the dashboard.

---

## License

This project is licensed under the **MIT License** - see the below text for details.

```text
MIT License

Copyright (c) 2026 Sai Nihal

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

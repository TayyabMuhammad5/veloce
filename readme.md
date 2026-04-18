# Veloce: AI-Powered Project Intake & Estimation Engine

Veloce is a full-stack Next.js application designed for digital agencies to automate project intake, estimate complexities using AI, and manage their pipeline via a real-time Kanban board.

## 🚀 Live Demo & Links
- **Deployed URL:** [Insert your Vercel URL here]
- **Repository:** [Insert your GitHub URL here]

---

## 🛠️ Local Setup Instructions

1. **Clone the repository:**
   \`\`\`bash
   git clone <your-repo-url>
   cd veloce
   \`\`\`

2. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

3. **Set up Environment Variables:**
   Create a `.env` file in the root directory and add the following keys:
   \`\`\`env
   DATABASE_URL="your_neon_postgres_url"
   AUTH_SECRET="generate_a_random_secret_string"
   GROQ_API_KEY="your_groq_api_key"
   WEBHOOK_SECRET="my_super_secret_webhook_key_123"
   UPSTASH_REDIS_REST_URL="your_upstash_url"
   UPSTASH_REDIS_REST_TOKEN="your_upstash_token"
   \`\`\`

4. **Initialize the Database:**
   Push the Prisma schema to your database and generate the client.
   \`\`\`bash
   npx prisma db push
   npx prisma generate
   \`\`\`

5. **Create the Admin Account:**
   Start the development server, then navigate to `/setup` once to automatically create the default Admin account.
   \`\`\`bash
   npm run dev
   \`\`\`
   - Go to: `http://localhost:3000/setup`
   - **Login Email:** admin@agency.com
   - **Login Password:** password123

---

## 🏗️ Architecture Write-up

### 1. Data Model Decisions
The database is heavily normalized to ensure data integrity and separate concerns:
- **`Brief`:** The core entity representing the client submission.
- **`AIAnalysis` (1-to-1):** Separated from the `Brief` so that the AI pipeline can process asynchronously and attach data later without locking the main brief record. Includes a `manualOverrideReason` for human-in-the-loop corrections.
- **`BriefEvent` (1-to-Many):** An append-only audit log tracking stage transitions for the Kanban board timeline.
- **`Note` (1-to-Many):** Allows for threaded internal communication linked to a specific brief and authored by a specific User.
- **Indexing for Scale:** To support highly performant **Cursor-Based Pagination** on the Kanban board without falling back to slow offset pagination, I applied a composite index: `@@index([status, createdAt])`. This specifically optimizes the exact filtering and sorting requirements of the Kanban view, preventing full table scans.

### 2. Caching & Rate-Limiting Strategy (Upstash Redis)
- **Rate Limiting:** The public-facing intake form uses Upstash `@upstash/ratelimit` with a sliding window algorithm (3 requests per minute per IP) to prevent malicious bot spam and protect the LLM API quota.
- **Dashboard Caching:** The Analytics Dashboard performs heavy aggregations (sums, averages, grouping by stage). This query is cached in Redis (`analytics:pipeline`) with a 1-hour TTL fallback.
- **Cache Invalidation:** I utilized a strict manual invalidation strategy. Whenever a mutation occurs that affects pipeline metrics (a new brief is submitted, a card changes stages, or an AI estimate is overridden), the Server Action explicitly calls `redis.del('analytics:pipeline')` to instantly purge the stale data, ensuring the dashboard is always perfectly in sync without unnecessary database hits.

### 3. AI Pipeline Design
- **Asynchronous Execution:** The intake form writes the initial brief to the Postgres database and immediately returns a success response to the user. The AI pipeline is triggered asynchronously in the background. This ensures the user is never stuck waiting on an LLM network request.
- **Provider:** I utilized `groq` with the `llama-3.3-70b-versatile` model via the Vercel AI SDK for its incredibly fast inference speeds, which is crucial for real-time dashboard updates.
- **Structured Output:** The prompt is engineered to enforce a strict, predictable JSON schema. The resulting text is sanitized (stripping accidental markdown blocks) and parsed before being inserted into the `AIAnalysis` table.

### 4. AI Tools Used During Development
To accelerate development, I utilized **Gemini (Google)** as an AI pair programmer. 
- **Use Cases:** I leveraged Gemini to brainstorm the optimal Prisma schema relationships, navigate breaking changes in NextAuth v5 (Auth.js) session callbacks, rapidly generate the boilerplate for Tailwind CSS layouts, and debug strict TypeScript typing errors when merging the Server-Sent Events (SSE) logic with the React Kanban component.

### 5. Future Improvements (Given More Time)
If I had more time to expand this architecture for a production environment, I would implement:
- **Message Queues:** Replace the simple asynchronous function call for the AI pipeline with a robust queuing system (like Inngest, BullMQ, or AWS SQS). This would provide automatic retries, dead-letter queues, and graceful handling of LLM rate limits/outages.
- **WebSockets vs. SSE:** While Server-Sent Events (SSE) work well for broadcasting simple refresh signals, I would migrate to WebSockets (via Socket.io or Pusher) to support bi-directional real-time chat in the internal Notes section, including "user is typing" indicators.
- **Robust Webhook Security:** Currently, the webhook uses a shared HMAC secret. I would upgrade this to support dynamic, per-client webhook subscriptions with rotating API keys.
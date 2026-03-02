# OrgPilot — School Ops Co-pilot

An autonomous AI agent that watches school org inputs (forms, emails) and turns them into structured tasks, reminders, and status dashboards. Built for hackathon speed, production quality.

## Tech Stack

- **Next.js 16** — App Router, TypeScript, React 19
- **Vercel AI SDK v6** — Agent tool-calling, multi-step reasoning
- **Prisma 7 + SQLite** — Portable schema (swap to Postgres anytime)
- **Tailwind CSS v4** — Minimal, functional UI
- **OpenAI gpt-4o-mini** — Cost-effective LLM (works without API key via mock agent)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Optional: add a real OPENAI_API_KEY for LLM-powered agent

# 3. Run migrations + seed
npx prisma migrate dev
npx prisma db seed

# 4. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

## Architecture

```
┌─────────────────┐     ┌─────────────────────┐     ┌──────────────┐
│  Google Forms /  │────>│  /api/webhooks/forms │────>│  SchoolOps   │
│  Email / Manual  │     │  /api/webhooks/email │     │  Agent       │
└─────────────────┘     └─────────────────────┘     │  (AI SDK v6) │
                                                      │              │
                                                      │  Tools:      │
                                                      │  - createTask│
                                                      │  - updateTask│
                                                      │  - notify    │
                                                      │  - approve   │
                                                      └──────┬───────┘
                                                             │
                              ┌───────────────────────────────┘
                              v
                        ┌──────────┐    ┌──────────────┐
                        │  SQLite  │    │  Dashboard   │
                        │  (Prisma)│<-->│  (React)     │
                        └──────────┘    └──────────────┘
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhooks/forms` | Receive form submissions, agent processes |
| POST | `/api/webhooks/email` | Email webhook (stub) |
| POST | `/api/agent/process` | Direct agent invocation |
| GET | `/api/tasks` | List tasks (filterable by status/type/owner) |
| POST | `/api/tasks` | Create task manually |
| GET/PATCH | `/api/tasks/[id]` | Get or update a specific task |
| GET | `/api/logs` | Agent action log entries |
| POST | `/api/approvals/[id]` | Approve or dismiss a pending action |

## Demo: Simulate a Form Submission

```bash
# While dev server is running:
bash scripts/demo-form-submission.sh

# Or manually:
curl -X POST http://localhost:3000/api/webhooks/forms \
  -H "Content-Type: application/json" \
  -d '{
    "formType": "EVENT_REQUEST",
    "payload": {
      "title": "Annual Science Fair",
      "description": "Book auditorium, arrange judges, set up registration",
      "requestedBy": "Maria Lopez",
      "preferredDate": "2026-04-15",
      "estimatedAttendees": 200
    }
  }'
```

## Agent Behavior

The SchoolOpsAgent uses a tool-calling loop to:

1. **Parse** incoming events (form submissions, emails)
2. **Create tasks** with appropriate type, priority, owner, and due date
3. **Update tasks** when follow-up events arrive
4. **Notify** officers for urgent items
5. **Request approval** for high-impact actions (cancellations, budget commits)

### Mock vs Real LLM

- **No API key / placeholder**: Agent uses deterministic heuristics (mock mode). Fully functional for demos.
- **Real OPENAI_API_KEY**: Agent uses gpt-4o-mini for intelligent reasoning and tool selection.

## Data Model

- **User** — Org officers (President, VP, Secretary, Treasurer, Logistics)
- **Task** — Work items (EVENT_REQUEST, FACILITY, FINANCE, ISSUE, OTHER)
- **AgentActionLog** — Full audit trail of agent decisions

## Testing

```bash
npm test
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm test` | Run tests (Vitest) |
| `npm run seed` | Seed database |
| `npm run db:migrate` | Run migrations |
| `npm run db:studio` | Open Prisma Studio |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | SQLite: `file:./prisma/dev.db` / Postgres: `postgresql://...` |
| `OPENAI_API_KEY` | No | OpenAI key. Omit for mock agent mode. |

## Switching to Postgres

1. Change `provider = "sqlite"` to `provider = "postgresql"` in `prisma/schema.prisma`
2. Update `DATABASE_URL` in `.env`
3. Install `@prisma/adapter-pg` and swap the adapter in `lib/db/prisma.ts`
4. Run `npx prisma migrate dev`

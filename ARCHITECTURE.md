# ReconLogic: Architecture and Implementation Specification

## Core Concept

ReconLogic is a B2B SaaS reconciliation tool built for small-to-mid-sized CPA firms. It automates the matching of unstructured financial documents (e.g., scanned PDF invoices, bank statements) against accounting system exports (e.g., general ledgers). It strictly separates AI data extraction from mathematical calculation to eliminate hallucination risks. It features deterministic matching, provides bounding-box evidence links for every flagged item, requires human sign-off, and focuses entirely on reconciliation exceptions.

---

## Recommended Tech Stack

**Frontend:** Next.js (App Router, React 19, Server Components), TypeScript (strict), Tailwind CSS v4, shadcn/ui, TanStack Query v5, react-pdf / pdf.js for PDF rendering + overlay.

**Backend:** Python 3.14 with FastAPI, Pydantic v2 (with `pydantic-settings`), SQLAlchemy 2.0 (async), Alembic migrations, Pandas 2.x, `decimal.Decimal` for all money math (never `float`), `pypdf` / `pdfplumber` for local PDF handling. Use UV for project setup.

**Database:** PostgreSQL (managed via Supabase; AWS RDS for enterprise) with SQLAlchemy async ORM.

**AI/OCR:** AWS Textract (for bounding-box OCR) + OpenAI GPT-4o-mini (strictly for structured JSON mapping via Structured Outputs). Optional fallback: AWS Bedrock for zero-retention compliance.

**Authentication:** Supabase Auth (JWT validated via JWKS).

**Queue / Async:** Upstash Redis + ARQ (or Celery / Dramatiq) for async job processing.

**Infrastructure:** Vercel (Frontend), Railway / Fly.io / Render (FastAPI Backend + worker), S3 / Cloudflare R2 (file storage with pre-signed URLs), Sentry (error tracking), GitHub Actions (CI/CD).

---

## System Architecture

### Data Flow

1. User uploads PDF invoices and CSV General Ledger (GL) via Next.js frontend.
2. Frontend requests pre-signed URLs from FastAPI; browser uploads directly to S3/R2.
3. FastAPI enqueues a job (ARQ/Celery) and returns `job_id`.
4. Worker calls AWS Textract → raw text + bounding-box coordinates.
5. Worker sends raw text to LLM (OpenAI Structured Outputs) to extract a strict JSON schema (Vendor, Date, Amount, Invoice Number). LLM maps values back to Textract coordinate IDs.
6. Worker executes deterministic Python logic (`Decimal` + Pandas) to compare extracted JSON against the GL CSV.
7. Exceptions/Matches are saved to PostgreSQL in a single transaction.
8. Frontend polls job status and fetches results.
9. Clicking a value renders the PDF and draws a bounding box over the source number.

### Diagram

```mermaid
graph TD
    A[Next.js Client] -->|1. Request pre-signed URLs| B[FastAPI Backend]
    A -->|2. Direct upload| C[S3 / R2 Storage]
    A -->|3. Create job| B
    B -->|4. Enqueue| Q[(Redis Queue)]
    Q -->|5. Process| W[Worker: ARQ/Celery]
    W -->|6. OCR w/ boxes| D[AWS Textract]
    D -->|Raw text + boxes| W
    W -->|7. Structured Outputs| E[OpenAI API]
    E -->|Strict JSON| W
    W -->|8. Deterministic match| W
    W -->|9. Persist| F[(PostgreSQL)]
    A -->|10. Poll status| B
    B -->|Read results| F
    F -->|Return data| A
```

---

## Project Structure

```text
reconlogic/
├── client/                     # Next.js frontend
│   ├── src/
│   │   ├── app/                # App Router (dashboard, jobs, results)
│   │   ├── components/         # UI, PDF viewer, bounding-box overlay
│   │   ├── lib/                # API client, auth helpers, query hooks
│   │   ├── hooks/              # TanStack Query hooks
│   │   └── types/              # TypeScript interfaces (generated from OpenAPI)
│   ├── public/
│   ├── tailwind.config.ts
│   └── package.json
├── server/                     # FastAPI backend
│   ├── app/
│   │   ├── api/v1/             # API routing
│   │   ├── core/               # Config, security, DB setup
│   │   ├── models/             # SQLAlchemy models
│   │   ├── schemas/            # Pydantic v2 validation schemas
│   │   ├── services/           # AI extraction, Textract, matching logic
│   │   ├── workers/            # ARQ / Celery tasks
│   │   └── utils/              # PDF handling, decimal math helpers
│   ├── alembic/
│   ├── tests/
│   ├── pyproject.toml
│   └── .env.example
├── infra/
│   ├── docker-compose.yml      # Postgres + Redis + backend
│   └── github-actions/
└── README.md
```

---

## Data Model

- **Organization:** `id`, `name`, `created_at`
- **User:** `id`, `org_id`, `role`, `email`
- **ReconciliationJob:** `id`, `org_id`, `status` (`pending`, `processing`, `human_review`, `completed`, `failed`), `created_at`, `updated_at`
- **TransactionRecord** (from GL): `id`, `job_id`, `date`, `amount` (NUMERIC(18,4)), `description`, `status` (`matched`, `exception`)
- **ExtractedInvoice:** `id`, `job_id`, `s3_key`, `vendor_name`, `amount` (NUMERIC(18,4)), `date`, `bounding_boxes` (JSONB), `raw_text`
- **MatchResult:** `id`, `job_id`, `transaction_id`, `invoice_id`, `confidence_score`, `human_approved` (boolean), `reviewed_by`, `reviewed_at`

> ⚠️ Use `NUMERIC(18,4)` for money in Postgres and `Decimal` in Python. **Never** use `float` for money.

---

## API Specification

Base path: `/api/v1`

| Method  | Endpoint                  | Purpose                                                       |
| ------- | ------------------------- | ------------------------------------------------------------- |
| `POST`  | `/jobs`                   | Create new reconciliation job + return pre-signed upload URLs |
| `GET`   | `/jobs/{id}`              | Polling endpoint for job status                               |
| `GET`   | `/jobs/{id}/results`      | Retrieve paginated match results and exceptions               |
| `GET`   | `/invoices/{id}/evidence` | Bounding boxes + signed PDF URL                               |
| `PATCH` | `/results/{id}/approve`   | Human sign-off endpoint                                       |
| `GET`   | `/health`                 | Liveness/readiness                                            |

**Auth:** All endpoints require `Bearer <JWT>` validated against Supabase JWKS. Org scoping enforced at the query layer.

---

## AI Implementation

### Strict Rules

- The LLM must **NEVER** perform arithmetic.
- The LLM returns **only** what is explicitly written; missing fields → `null`.
- Every extracted value must include the **exact source string** so the backend can map it back to a Textract bounding box.

### Extraction Contract

Use OpenAI's Structured Outputs (`response_format: { type: "json_schema" }`) with a schema like:

```python
class InvoiceField(BaseModel):
    value: str | None
    source_string: str | None  # exact substring as it appears in OCR text

class ExtractedInvoice(BaseModel):
    vendor_name: InvoiceField
    invoice_number: InvoiceField
    date: InvoiceField          # ISO 8601 if unambiguously parseable, else null
    total_amount: InvoiceField  # decimal string, as written
```

### Prompting

> "Extract the vendor, invoice number, date, and total amount from this invoice text. Do **not** calculate missing fields. Return `null` for any field not explicitly written. For every returned value, also return the exact substring from the input text where it appears."

### Traceability

`source_string` → match against Textract word/line tokens → attach `BoundingBox` (page, left, top, width, height) → persist in `ExtractedInvoice.bounding_boxes`.

---

## Security and Environment Management

- Store sensitive data using environment variables. **Never** hardcode.
- OpenAI usage must be on a **zero-day retention** tier (or use AWS Bedrock for full compliance).
- Pre-signed S3/R2 URLs only; no public buckets.
- Row-level org scoping enforced in every query.

### `.env.example`

```dotenv
# --- Database ---
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/reconlogic

# --- Auth ---
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_JWT_SECRET=your_jwt_secret
SUPABASE_JWKS_URL=https://xxxx.supabase.co/auth/v1/.well-known/jwks.json

# --- OpenAI ---
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# --- AWS ---
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET_NAME=reconlogic-dev
S3_ENDPOINT_URL=            # leave blank for AWS; set for R2/MinIO

# --- Queue ---
REDIS_URL=redis://localhost:6379/0

# --- App ---
ENVIRONMENT=development
LOG_LEVEL=INFO
```

Validate config at backend startup using `pydantic-settings` `BaseSettings`.

---

## Best Practices

- **Type Safety:** Shared types between FastAPI (Pydantic) and Next.js (TypeScript) via generated OpenAPI specs (`openapi-typescript`).
- **Transactions:** Wrap database writes for `MatchResult` in SQL transactions to prevent orphaned records.
- **Resilience:** Implement ARQ (or Celery) in FastAPI for processing large PDF batches asynchronously.
- **Idempotency:** Job creation and worker tasks keyed by `job_id` + content hash.
- **Observability:** Structured JSON logs, Sentry, OpenTelemetry traces across the pipeline.
- **Money Math:** `decimal.Decimal` with explicit `quantize`; reject `float` in matching code via lint rule.

---

## Development and Deployment

- **Local:** Docker Compose to spin up PostgreSQL + Redis + FastAPI + worker. Node.js for frontend.
- **Migrations:** Alembic for Python backend (`alembic revision --autogenerate`).
- **CI/CD:** GitHub Actions to run Pytest + Ruff + mypy (backend) and Vitest + ESLint + `tsc` (frontend) on PRs.
- **Deploy:** Vercel (frontend), Railway/Fly (backend + worker), Neon/Supabase (Postgres), Upstash (Redis).

---

## Testing and Quality Checks

- **Required:** 300 labeled transactions must be tested prior to production deployment.
- **Unit Tests:** Python tests for the deterministic matching logic (must handle date formatting quirks and floating-point math safely — use `Decimal`, not `float`).
- **Integration Tests:** Mock AWS Textract and OpenAI to test the full processing pipeline.
- **Coverage Target:** ≥ 85% on `services/matching`.

---

## Implementation Plan

- **Phase 1:** DB setup, Auth, and basic API scaffolding.
- **Phase 2:** AWS Textract integration and OpenAI JSON extraction pipeline.
- **Phase 3:** Deterministic matching logic (Python Pandas + `Decimal`).
- **Phase 4:** Next.js frontend with PDF viewer and bounding-box overlay.
- **Phase 5:** Testing on 300 labeled transactions and accuracy tuning.

---

## Claude Code Instructions

**CRITICAL — Read Before Executing Anything:**

1. **DO NOT create, scaffold, or generate the project files yourself.** This document is an architecture spec. The human user will build the project.
2. **DO NOT run scaffolding commands** (`create-next-app`, `alembic init`, `npm install`, `pip install`, `docker compose up`, etc.) on your own initiative.
3. **DO NOT write boilerplate project structure to disk** unless the user explicitly asks for a specific file at a specific path.
4. **Provide the user with a clear, ordered list of commands they will run one-by-one themselves** to set up the project properly. Wait for the user to confirm success after each step before moving to the next.
5. When the user asks "what's next?", give **exactly one command** (or one tightly-scoped step) and stop — let them execute and report back.

**When the user explicitly asks you to write code for a specific module:**

1. **Do not use mock data generators** for the AI extraction phase — implement real AWS Textract and OpenAI calls.
2. **Do not skip the bounding box mapping logic.** This is the core value proposition.
3. Build the Next.js UI using standard Tailwind + shadcn/ui components; prefer **Server Components** over client-side state where possible.
4. Check edge cases for floating-point arithmetic in Python — **use `decimal.Decimal`, not `float`**, for all money math.
5. Follow the data model and API spec exactly as defined in this document.

**General Principles for All Responses:**

- Prefer Server Components in Next.js; avoid complex client-side state management.
- Enforce type safety end-to-end via OpenAPI-generated TypeScript types.
- Every database write involving `MatchResult` must be wrapped in a SQL transaction.
- All secrets come from environment variables — never hardcode.
- All money values in Python must be `Decimal`, never `float`.
- When suggesting commands, give them **one at a time** and wait for confirmation.

---

## Definition of Done

- [ ] Users can upload a GL CSV and 10+ PDFs.
- [ ] System automatically extracts data and performs math-free matching.
- [ ] UI displays flagged exceptions.
- [ ] Clicking an exception shows the PDF with a highlighted bounding box.
- [ ] Human sign-off updates the database state.
- [ ] 300-transaction test achieves > 95% accuracy.

# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router, React 19, Server Components, TypeScript strict, Tailwind CSS v4, shadcn/ui, TanStack Query v5, react-pdf/pdf.js) + FastAPI (Python 3.14, Pydantic v2, SQLAlchemy 2.0 async, Alembic) + AWS Textract + OpenAI GPT-4o-mini (Structured Outputs with `response_format: json_schema`) + PostgreSQL (managed, `NUMERIC(18,4)` for all money) + Supabase Auth (JWT/JWKS) + Redis/Upstash (ARQ/Celery) + S3 / Cloudflare R2 + Sentry

## Users

- **Primary:** Small-to-mid-sized CPA firm staff performing monthly/quarterly reconciliation
- **Secondary:** Firm managers reviewing exception reports and sign-off status
- **Interaction mode:** Upload PDFs + CSV GL → review exceptions with bounding-box evidence → sign off matches

## Product Purpose

ReconLogic automates the matching of unstructured financial documents (scanned PDF invoices, bank statements) against accounting system exports (general ledgers). It strictly separates AI data extraction from mathematical calculation to eliminate hallucination risk, provides bounding-box evidence links for every flagged item, requires human sign-off, and focuses entirely on reconciliation exceptions.

## Positioning

Not another generic AI document parser: every extracted value includes the exact `source_string` mapped to Textract bounding-box coordinates, and the back-end uses deterministic `Decimal` + Pandas logic — never an LLM — to compare values against the GL CSV.

## Operating Context

1. User uploads PDF invoices and CSV General Ledger (GL) via the Next.js frontend
2. Frontend requests pre-signed URLs from FastAPI; browser uploads directly to S3/R2 (no server-proxy upload)
3. FastAPI enqueues a job and returns `job_id`
4. Worker calls AWS Textract → raw text + bounding-box coordinates
5. Worker sends raw text to OpenAI GPT-4o-mini Structured Outputs to extract strict JSON schema (`vendor_name`, `invoice_number`, `date`, `total_amount` — all with `value` + `source_string` for traceability)
6. LLM maps extracted values back to Textract coordinate IDs
7. Worker executes deterministic Python logic (`Decimal` + Pandas) to compare extracted JSON against GL CSV
8. Exceptions / Matches saved to PostgreSQL in a single transaction
9. Frontend polls job status and fetches paginated results
10. Clicking an exception renders the PDF with a bounding box drawn over the source number; human sign-off updates `MatchResult.human_approved`

## Capabilities and Constraints

- PDF + CSV upload with pre-signed S3/R2 URLs
- AWS Textract OCR with bounding-box evidence for every extracted field
- Structured JSON extraction via OpenAI (`json_schema` response format) — LLM never performs arithmetic
- Every field includes `source_string` (exact substring from OCR text) for traceability
- Bounding box mapping: `source_string` → match against Textract word/line tokens → attach `BoundingBox` (page, left, top, width, height) → persist in `ExtractedInvoice.bounding_boxes`
- Deterministic matching: `Decimal` with explicit `quantize`; `float` rejected by lint rule
- Money stored as `NUMERIC(18,4)` in Postgres; `Decimal` in Python; never `float`
- Job status polling (`pending` → `processing` → `human_review` → `completed` / `failed`)
- Human sign-off endpoint: `PATCH /results/{id}/approve` updates `human_approved`, `reviewed_by`, `reviewed_at`
- Org scoping enforced at query layer on all endpoints; JWT validated against Supabase JWKS
- Idempotency: `job_id` + content hash key for creation and worker tasks
- Transactions: `MatchResult` writes wrapped in SQL transactions; no orphaned records
- Zero-day retention OpenAI tier or AWS Bedrock fallback for full compliance
- 300 labeled transactions must be tested before production (target >95% accuracy; coverage ≥85% on `services/matching`)
- All secrets in environment variables (`pydantic-settings` `BaseSettings` validation)

## Brand Commitments

- Name: ReconLogic
- Voice: Precise, audit-ready, and accountable — designed for CPAs, not casual users
- Evidence-first: every number has a source; every exception requires a human
- Compliance posture: defensible to auditors and regulators; zero-day retention option available

## Evidence on Hand

- `recon-logic/ARCHITECTURE.md` — full architecture spec
- `recon-logic/server/app/` — FastAPI scaffold with `main.py`, `core/`, `models/`, `schemas/`, `services/` (`extraction.py`, `matching.py`), `workers/tasks.py`, `api/v1/`
- `recon-logic/client/src/app/` — dashboard page (`# Client dashboard page` — placeholder only), `components/pdf-viewer.tsx`, `lib/api.ts`, `types/openapi.ts`
- `recon-logic/client/src/app/page.tsx` — empty
- `recon-logic/infra/` — `docker-compose.yml`, GitHub Actions
- `recon-logic/README.md`, `SETUP_GUIDE.md`
- `recon-logic/server/alembic/` — Alembic migrations directory
- `recon-logic/server/app/core/decimal_math.py` — deterministic decimal math

**Critical absence:** Client dashboard (`page.tsx`) is empty; only a comment exists. The PDF viewer (`pdf-viewer.tsx`) exists but is unverified against real data. No 300-transaction test dataset exists.

## Product Principles

1. The LLM extracts; the code calculates — arithmetic is never delegated to a model, eliminating hallucination on the numbers that matter.
2. Every number has a source: `source_string` → Textract bounding box means every exception can be traced to the exact pixel in the PDF.
3. Human sign-off is required: no exception is considered resolved until `PATCH /results/{id}/approve` updates the record with `reviewed_by` and `reviewed_at`.
4. The pipeline is deterministic: `Decimal` + Pandas, covered by tests at ≥85%, validated against 300 labeled transactions before production.
5. The data stays within the org: JWT-scoped queries, pre-signed URLs (no public buckets), zero-day retention option, RLS enforced.

## Accessibility & Inclusion

- Professional dashboard with clear exception lists, status indicators, and pagination
- PDF viewer with bounding-box overlay for visual evidence of flagged values
- Sign-off controls clearly labeled (`human_approved`, `reviewed_by`, `reviewed_at`)
- Responsive design across desktop (primary) and tablet
- All interactive elements accessible via keyboard and screen-reader (semantic HTML, ARIA where custom components are used)
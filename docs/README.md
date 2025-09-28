# Microplate AI System — Architecture & API Spec (v0.1)

**Owner:** notto
**Domain:** AI-assisted microplate image capture, analysis, and interfacing to Labware
**Style:** Microservices (Node.js/TS + Fastify + Prisma + OpenAPI, Python services for vision), PostgreSQL 17, Object Storage (MinIO/S3), React + TS + Tailwind for FE
**Goal:** Deliver a production-ready blueprint (BE/FE) with schemas, APIs, and flows to implement end‑to‑end capture → predict → aggregate → interface CSV.

---

## 0) Scope & Principles

* Strictly **microservice** oriented: each capability isolated behind its own API.
* **Stateless** services with **12-factor** configs; state only in Postgres + Object Storage.
* **Observability-first**: health, metrics, structured logs, trace IDs across services.
* **Security**: JWT access + refresh, service-to-service auth via gateway; signed URLs for images.
* **Idempotency** for ingestion and interface generation.
* **Eventually consistent** aggregates (sum\_by\_sample\_no) with DB trigger + optional worker.

---

## 1) High-Level Architecture

```mermaid
flowchart LR
    subgraph Device Layer
        VC[vision-capture-service (Python)]
    end

    subgraph Application Layer
        AUTH[auth-service (Node/TS + Prisma) :6401]
        IMG[image-ingestion-service (Node/TS) :6402]
        INF[vision-inference-service (Python) :6403]
        RES[result-api-service (Node/TS) :6404]
        LAB[labware-interface-service (Node/TS) :6405]
        PDB[prediction-db-service (Node/TS + Prisma) :6406]
        PG[(PostgreSQL 17)]
        OBJ[(Object Storage: MinIO/S3)]
    end

    subgraph Web Application
        FE[React + TS + Tailwind]
    end

    FE -- capture/preview --> VC
    FE -- upload/query --> IMG
    FE -- predict --> INF
    INF -- write results --> PDB
    INF -- write annotated img --> IMG -- store --> OBJ
    RES -- read aggregates --> PDB
    FE -- sample detail/summary --> RES
    FE -- interface CSV --> LAB -- write CSV --> FS[Shared Folder]
```

### 1.1 Service Responsibilities

* **vision-capture-service (Python)**: controls the USB/CSI camera, exposes `/capture`, `/preview`, returns image bytes/URL.
* **image-ingestion-service (Node/TS)**: receives raw & annotated images, writes metadata to DB, stores file into `raw-images` / `annotated-images` buckets (MinIO/S3) or mounted folder; returns signed URLs.
* **vision-inference-service (Python)**: runs model inference, computes domain logic, persists results (normalized), requests IMG to persist annotated images.
* **prediction-db-service (Node/TS)**: database operations for prediction data, CRUD APIs, data validation and integrity.
* **result-api-service (Node/TS)**: query endpoints for FE; emits/maintains aggregates (`sum_by_sample_no`) into `sample_summary` (aka `interface_data`).
* **labware-interface-service (Node/TS)**: transforms results/summary into per-sample CSV files; writes to shared folder for Labware pickup.
* **auth-service (Node/TS)**: users, roles, permissions, login, refresh, reset/forgot password.

---

## 2) Storage & Buckets

* **PostgreSQL 17** with schema `microplates` for domain, `auth` for identity.
* **Object Storage (MinIO/S3)** buckets:

  * `raw-images/` → original uploads/captures
  * `annotated-images/` → images with bounding boxes
  * Naming: `{sample_no}/{run_id}/{ts}-{uuid}.jpg`
  * Signed URLs (15–60 min) for FE display

---

## 3) Database Design (Microplates)

> You provided a solid baseline. We’ll keep your DDL and add one view + optional NOTIFY trigger to drive workers. Prisma mapping is in §7.

### 3.1 Your DDL (kept)

* `microplates.prediction_run` — one row per inference run; **1 sample can have many runs** (store all runs)
* `microplates.row_counts` — JSONB row counts per run
* `microplates.interface_results` — JSONB domain result per run (contains `distribution` node used for summary)
* `microplates.well_prediction` — normalized predictions per detection
* `microplates.image_file` — file metadata (raw/annotated)
* `microplates.sample_summary` — aggregated by `sample_no`, `{ distribution: {...} }`
* Trigger `trg_upsert_sample_summary` maintains `sample_summary` after insert/update `interface_results`

### 3.2 Additional Objects (recommended)

```sql
-- View used by result-api-service for a stable interface name
CREATE OR REPLACE VIEW microplates.interface_data AS
SELECT
  sample_no,
  summary->'distribution' AS distribution
FROM microplates.sample_summary;

-- Optional: event trigger to notify workers (LISTEN/NOTIFY pattern)
CREATE OR REPLACE FUNCTION microplates.fn_notify_interface_results() RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('interface_results_new', NEW.run_id::text);
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_interface_results ON microplates.interface_results;
CREATE TRIGGER trg_notify_interface_results
AFTER INSERT ON microplates.interface_results
FOR EACH ROW EXECUTE FUNCTION microplates.fn_notify_interface_results();
```

---

## 4) Authentication & Authorization

* **Identity**: `auth-service` manages Users, Roles, (optional) Permissions.
* **JWT**: short-lived **access\_token** (e.g., 15m), long-lived **refresh\_token** (e.g., 7–30d) with rotation & revocation.
* **Flows**:

  * **Register** (admin-only or open w/ email verification)
  * **Login** → access + refresh
  * **Refresh** → rotate refresh, revoke old (token table)
  * **Forgot password** → email OTP or signed link
  * **Reset password** → verify token, enforce password policy
  * **Logout** → revoke refresh token(s)
* **Service-to-service**: gateway enforces; internal calls carry **service JWT** or mTLS (optional).

---

## 5) API Surface (by Service)

> All endpoints JSON unless noted. Use OpenAPI 3 with schemas.
> Prefix with `/api/v1`. Every service exposes `/healthz`, `/readyz`, `/metrics`.

---

### 5.1 auth-service (Fastify + Prisma)

**Entities**: User, Role, UserRole, RefreshToken, PasswordResetToken, EmailVerificationToken (optional)

**Endpoints**

* `POST /api/v1/auth/register` → {email, username, password}
* `POST /api/v1/auth/login` → {username|email, password} → {access\_token, refresh\_token}
* `POST /api/v1/auth/refresh` → {refresh\_token} → rotate tokens
* `POST /api/v1/auth/logout` → revoke current refresh token
* `POST /api/v1/auth/forgot-password` → {email}
* `POST /api/v1/auth/reset-password` → {token, new\_password}
* `GET  /api/v1/auth/me` → user profile (requires access token)
* `GET  /api/v1/auth/roles` → list roles (admin)
* `POST /api/v1/auth/users/:id/roles` → assign roles (admin)

**Notes**

* **Password hashing**: Argon2id
* **Refresh rotation**: store token family, detect reuse → revoke family
* **Token claims**: `sub`, `roles`, `jti`, `exp`

---

### 5.2 image-ingestion-service (Fastify + Prisma)

**Responsibilities**: persist image metadata; upload to object storage; produce signed URLs; link to `prediction_run`.

**Endpoints**

* `POST /api/v1/images` (multipart or JSON with presigned PUT) → {sample\_no, run\_id?, file\_type: "raw"|"annotated", file}
* `POST /api/v1/images/presign` → returns {upload\_url, path}
* `GET  /api/v1/images/:id` → metadata + signed URL
* `GET  /api/v1/images/by-run/:run_id` → list images (raw/annotated)
* `DELETE /api/v1/images/:id` → soft-delete/mark

**Buckets**

* `raw-images` / `annotated-images`

---

### 5.3 vision-capture-service (Python)

**Responsibilities**: control camera; capture still image; optional preview stream.

**Endpoints**

* `POST /api/v1/capture` → {sample\_no, options?} → returns `{path, url, run_seed}`
* `GET  /api/v1/preview` (optional MJPEG) → live stream
* `GET  /api/v1/healthz`

**Implementation notes**

* UVC/V4L2 (Linux) or DirectShow (Windows) abstraction
* Expose brightness/exposure params (optional)

---

### 5.4 vision-inference-service (Python)

**Responsibilities**: predict & compute logic; persist to DB; request annotated upload via image-ingestion.

**Endpoints**

* `POST /api/v1/inference/predict` → body: `{ sample_no, image_path|image_url, model_version? }`

  * Steps:

    1. Load image
    2. Run model → boxes, classes, confidences
    3. Domain logic compute → row\_counts, interface\_results
    4. Save: `prediction_run`, `well_prediction`, `row_counts`, `interface_results`
    5. Draw boxes → save annotated → call IMG `/images` (file\_type="annotated")
    6. Update `prediction_run.annotated_image_path`
  * Returns: `{ run_id, sample_no, predict_at, annotated_url, stats }`

**Notes**

* Handle **multiple runs per sample**; never overwrite; always append.
* Emit NOTIFY via DB or simply rely on trigger in §3.2 for summary updates.

---

### 5.5 result-api-service (Fastify + Prisma)

**Responsibilities**: FE-facing queries; aggregate by sample; optional background worker reading NOTIFY.

**Endpoints (read)**

* `GET /api/v1/results/run/:run_id` → details of a run (predictions, row\_counts, interface\_results, images)
* `GET /api/v1/results/sample/:sample_no/runs` → list runs for a sample (paged)
* `GET /api/v1/results/sample/:sample_no/summary` → from `interface_data` view
* `GET /api/v1/results/sample/:sample_no/last` → most recent run metadata + annotated URL

**Worker**

* Subscribes `LISTEN interface_results_new` (optional) and queries the changed `sample_no` to ensure `sample_summary` consistency (idempotent). If DB trigger exists, worker only verifies/repairs.

---

### 5.6 labware-interface-service (Fastify + Prisma)

**Responsibilities**: generate CSV per sample for Labware.

**Endpoints**

* `POST /api/v1/interface/generate` → `{ sample_no }` → returns `{ csv_path, csv_url? }`
* `GET  /api/v1/interface/by-sample/:sample_no` → latest CSV metadata

**CSV Contract (example)**

```
# Filename: {sample_no}_{yyyyMMddHHmmss}.csv
sample_no,well,label,class,confidence,xmin,ymin,xmax,ymax
S123,A1,obj,positive,0.98,12,34,56,78
...
# or aggregated sheet:
sample_no,key,count
S123,positive,37
S123,negative,59
```

* Choose **normalized** (per detection) or **aggregated** (distribution). Many labs prefer **aggregated**.
* Write to shared folder `//labshare/inbox/` or `/mnt/labshare/inbox/`.

---

## 6) OpenAPI – Example Fragments

> Keep each service’s spec in its repo at `openapi.yaml` and publish via `/docs`.

```yaml
openapi: 3.0.3
info:
  title: result-api-service
  version: 1.0.0
paths:
  /api/v1/results/sample/{sample_no}/summary:
    get:
      summary: Get aggregated distribution for a sample
      parameters:
        - name: sample_no
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  sample_no: { type: string }
                  distribution:
                    type: object
                    additionalProperties:
                      type: integer
```

---

## 7) Prisma Schema (PostgreSQL 17, multi-schema)

> Requires Prisma ≥5.7 for `schemas` / `@@schema`. Map to your existing snake\_case tables.

```prisma
// schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["public", "auth", "microplates"]
}

// =========================
// AUTH SCHEMA
// =========================
model User {
  id        String   @id @default(uuid()) @db.Uuid
  email     String   @unique
  username  String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  roles     UserRole[]
  refreshes RefreshToken[]
}
@@schema("auth")

model Role {
  id    Int       @id @default(autoincrement())
  name  String    @unique
  users UserRole[]
}
@@schema("auth")

model UserRole {
  userId String @db.Uuid
  roleId Int
  user   User   @relation(fields: [userId], references: [id])
  role   Role   @relation(fields: [roleId], references: [id])
  @@id([userId, roleId])
}
@@schema("auth")

model RefreshToken {
  id           String   @id @default(uuid()) @db.Uuid
  userId       String   @db.Uuid
  token        String   @unique
  family       String   // rotation family id
  issuedAt     DateTime @default(now())
  expiresAt    DateTime
  revokedAt    DateTime?
  user         User     @relation(fields: [userId], references: [id])
  reused       Boolean  @default(false)
}
@@schema("auth")

model PasswordResetToken {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  token     String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  user      User     @relation(fields: [userId], references: [id])
}
@@schema("auth")

// =========================
// MICROPLATES SCHEMA (maps to your tables)
// =========================
model PredictionRun {
  id                   Int       @id @default(autoincrement()) @map("id")
  sampleNo             String    @map("sample_no")
  description          String?   @map("description")
  predictAt            DateTime  @default(now()) @map("predict_at")
  annotatedImagePath   String    @map("annotated_image_path")
  modelVersion         String?   @map("model_version")
  status               String    @default("pending") @map("status")
  errorMsg             String?   @map("error_msg")
  rowCounts            RowCounts[]
  interfaceResults     InterfaceResults[]
  wellPredictions      WellPrediction[]
  imageFiles           ImageFile[]
  @@map("prediction_run")
}
@@schema("microplates")

model RowCounts {
  id        Int      @id @default(autoincrement())
  runId     Int      @map("run_id")
  counts    Json     @map("counts")
  createdAt DateTime @default(now()) @map("created_at")
  run       PredictionRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  @@map("row_counts")
}
@@schema("microplates")

model InterfaceResults {
  id        Int      @id @default(autoincrement())
  runId     Int      @map("run_id")
  results   Json     @map("results")
  createdAt DateTime @default(now()) @map("created_at")
  run       PredictionRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  @@map("interface_results")
}
@@schema("microplates")

model WellPrediction {
  id         Int      @id @default(autoincrement())
  runId      Int      @map("run_id")
  label      String   @map("label")
  class_     String   @map("class")
  confidence Float    @map("confidence")
  bbox       Json     @map("bbox")
  createdAt  DateTime @default(now()) @map("created_at")
  run        PredictionRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  @@map("well_prediction")
}
@@schema("microplates")

model ImageFile {
  id        Int      @id @default(autoincrement())
  runId     Int      @map("run_id")
  sampleNo  String   @map("sample_no")
  fileType  String   @map("file_type")
  path      String   @map("path")
  createdAt DateTime @default(now()) @map("created_at")
  run       PredictionRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  @@map("image_file")
}
@@schema("microplates")

// Optional: a read-only model mapped to the view for convenience
model InterfaceData {
  sampleNo     String @id @map("sample_no")
  distribution Json   @map("distribution")
  @@map("interface_data")
}
@@schema("microplates")
```

**Notes**

* Use `prisma migrate dev` to add new objects (view creation via SQL migration).
* For existing tables, use `prisma db pull` then adjust mappings.

---

## 8) Service Implementation Notes

### 8.1 Common Fastify Plugins

* `@fastify/jwt` for access token verification (gateway), but auth logic stays in **auth-service**
* `@fastify/helmet`, `@fastify/rate-limit`, `@fastify/cors`
* `pino` logs with `requestId`: include `sample_no`, `run_id` in child loggers
* `@fastify/swagger` + `@fastify/swagger-ui` for `/docs`

### 8.2 Error Model

```json
{
  "error": "BadRequestError",
  "message": "sample_no is required",
  "code": "E_BAD_REQUEST",
  "requestId": "..."
}
```

### 8.3 Object Storage Access

* Prefer pre-signed **PUT** from FE for raw images: FE uploads to `raw-images`, then calls **inference** with the returned `path`.
* Annotated images saved by **inference** via `image-ingestion-service`.

### 8.4 Aggregation Strategy

* Your DB **trigger** is the source of truth for `sample_summary`.
* `result-api-service` worker is **optional**, reacts to NOTIFY to validate/repair aggregates.

---

## 9) Frontend (React + TS + Tailwind)

**Design goals**: white background, clean, premium/professional, fast keyboard/QR entry.

### 9.1 Pages

* **/capture**: input (text/QR) for `{sample_no, submission_no?}`; large center image panel; right sidebar with tabs **Predict** (last run) & **Summary** (sum\_by\_sample\_no); buttons: **Capture**, **Predict**, **Interface**.
* **/samples/{sample\_no}**: history of runs, thumbnails, open annotated.
* **/auth**: login/reset flows.

### 9.2 Layout Wireframe

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Header (logo, user menu)                                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│ Sample Input [  S123456  ] [Scan QR]     (Capture) (Predict) (Interface)     │
├───────────────────────────────┬───────────────────────────────────────────────┤
│                               │                                               │
│  [ Center Image Panel ]       │  Sidebar                                      │
│  - shows last captured/pred   │  ┌─Predict (Run)────────────┐                │
│  - swaps to annotated image   │  │ boxes, confidences, meta │                │
│                               │  └──────────────────────────┘                │
│                               │  ┌─Summary (Aggregated)─────┐                │
│                               │  │ key → count              │                │
│                               │  └──────────────────────────┘                │
├───────────────────────────────┴───────────────────────────────────────────────┤
│ Footer (version, latency)                                                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 9.3 Component Tree

* `AppShell` (Header, Footer)
* `CapturePage`

  * `SampleForm` (text + QR)
  * `ImagePanel`
  * `ActionsBar` (Capture, Predict, Interface)
  * `PredictTab`, `SummaryTab`
* `SampleHistory`

### 9.4 State & Data Fetching

* **TanStack Query** for `/results/*` + cache by `sample_no`.
* Global `AuthProvider` storing access token (refresh on 401 → call `/auth/refresh`).

### 9.5 Minimal API Calls

* Capture: `POST /capture` (returns path) → display image via signed URL.
* Predict: `POST /inference/predict { sample_no, image_path }` → then refresh **Predict** + **Summary** tabs.
* Summary: `GET /results/sample/{sample_no}/summary`.
* Last run: `GET /results/sample/{sample_no}/last` → annotated URL → show in `ImagePanel`.
* Interface: `POST /interface/generate { sample_no }` → toast with CSV path.

### 9.6 Tailwind Style Hints

* White background `bg-white`, generous whitespace, 12-column layout, cards with `rounded-2xl shadow-sm border`.
* Use neutral grays for text; primary accent = blue for CTA.

---

## 10) Config & DevOps

### 10.1 .env Examples

```
# Shared
NODE_ENV=production
LOG_LEVEL=info
JWT_SECRET=change-me
SERVICE_JWT=internal-service-token
OBJECT_STORAGE_ENDPOINT=http://minio:9000
OBJECT_STORAGE_ACCESS_KEY=...
OBJECT_STORAGE_SECRET_KEY=...
OBJECT_STORAGE_BUCKET_RAW=raw-images
OBJECT_STORAGE_BUCKET_ANN=annotated-images

# Database
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/microplates

# Services (Direct Access)
# Auth Service
AUTH_PORT=6401

# Image Ingestion Service  
IMAGE_PORT=6402

# Vision Inference Service
INFERENCE_PORT=6403

# Result API Service
RESULT_PORT=6404

# Labware Interface Service
LABWARE_PORT=6405

# Prediction DB Service
PREDICTION_PORT=6406

# Vision Capture Service
CAPTURE_PORT=6407
```

### 10.2 Health/Readiness/Metrics

* `/healthz` returns `{status:"ok"}` when process is alive.
* `/readyz` checks DB + object storage connectivity.
* `/metrics` (Prometheus) per service.

### 10.3 Logging

* Pino JSON logs; include `requestId`, `sample_no`, `run_id` where available.

---

## 11) Security Details

* **Access JWT** verified at each service; pass user claims via headers
* **Refresh JWT** handled only in `auth-service` with rotation
* **CORS**: FE origin allowlist at each service
* **RBAC** roles: `admin`, `operator`, `viewer`
* **Signed URLs** for images; no public bucket

---

## 12) Testing Strategy

* **Contract tests** per service using OpenAPI schemas.
* **Integration**: docker-compose for services + Postgres + MinIO.
* **Synthetic data**: seed scripts generating fake runs and summaries.
* **E2E**: Cypress (FE) interacting with gateway.

---

## 13) Example Sequences

### 13.1 Capture → Predict → Display

```mermaid
sequenceDiagram
  participant FE
  participant VC as vision-capture-service
  participant INF as vision-inference-service
  participant IMG as image-ingestion-service
  participant PG as Postgres

  FE->>VC: POST /api/v1/capture {sample_no}
  VC-->>FE: {path, url}
  FE->>INF: POST /api/v1/inference/predict {sample_no, image_path}
  INF->>PG: INSERT prediction_run, well_prediction, row_counts, interface_results
  INF->>IMG: POST /images (annotated)
  IMG->>OBJ: store annotated
  IMG-->>INF: {annotated_url}
  INF->>PG: UPDATE prediction_run.annotated_image_path
  FE->>RES: GET /api/v1/results/sample/{sample}/last
  RES->>PG: query
  RES-->>FE: {annotated_url}
```

### 13.2 New Interface Results → Aggregate

```mermaid
sequenceDiagram
  participant INF as vision-inference-service
  participant PG as Postgres
  participant RES as result-api-service (worker)

  INF->>PG: INSERT interface_results
  Note over PG: Trigger updates sample_summary
  PG-->>RES: NOTIFY interface_results_new (run_id)
  RES->>PG: SELECT to verify sample_summary for sample_no
  RES-->>RES: (Optional) repair if mismatch
```

---

## 14) Additional Recommendations

* **Version your models**: `model_version` recorded; keep model registry (table) if needed.
* **Confidence calibration**: store thresholds in config table, expose `/config` in result-api-service.
* **Idempotent interface generation**: if same `{sample_no}` called within N minutes & no new runs, return existing CSV.
* **Audit trail**: who clicked Interface; store in a small table.
* **Permissions**: only `operator` can trigger predict/interface; `viewer` is read-only.

---

## 15) Backlog (Next)

* Add **permissions** table (fine-grained), policy cache at gateway.
* Add **OpenTelemetry** tracing across services.
* Add **background reprocessing** job for retrospectively applying new logic on old runs.

---

## 16) Appendix – Sample Fastify Route (result-api-service)

```ts
fastify.get('/api/v1/results/sample/:sample_no/summary', async (req, reply) => {
  const { sample_no } = req.params as { sample_no: string };
  const row = await prisma.interfaceData.findUnique({ where: { sampleNo: sample_no } });
  if (!row) return reply.code(404).send({ error: 'NotFound', message: 'No summary' });
  return { sample_no, distribution: row.distribution };
});
```

## 17) Appendix – Password Reset Flow (auth-service)

* `POST /forgot-password` → generate token row (expires 30 min) + email link
* `POST /reset-password` → validate token, set new hash, invalidate token family (all refresh)
* `POST /logout` → revoke current refresh token

---

**This spec is ready for team development.**

* Start with DB & Prisma models (§7), wire up `result-api-service` reads.
* Implement `vision-inference-service` writing normalized results (§5.5).
* FE can already display **last run** and **summary** once reads exist (§9).

---

## Service Port Allocation

| Service | Port | Protocol | Description |
|---------|------|----------|-------------|
| **Auth Service** | 6401 | HTTP | User authentication and authorization |
| **Image Ingestion Service** | 6402 | HTTP | Image storage and management |
| **Vision Inference Service** | 6403 | HTTP | AI model inference and analysis |
| **Result API Service** | 6404 | HTTP/WebSocket | Data aggregation and real-time updates |
| **Labware Interface Service** | 6405 | HTTP | CSV generation and delivery |
| **Prediction DB Service** | 6406 | HTTP | Database operations for prediction data |
| **Vision Capture Service** | 6407 | HTTP/WebSocket | Camera capture and real-time status |

For detailed service configuration and Docker integration, see **14-Service-Port-Allocation.md**.

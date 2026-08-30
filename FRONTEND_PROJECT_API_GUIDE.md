# Kraios Project Workflow — Frontend Integration Guide

This document is the frontend contract for the complete Kraios project flow:

```text
Create Project
  -> Step 1: 2D Floor Plan
  -> Step 2: 3D Rendering
  -> Step 3: BOQ
  -> Step 4: Output
  -> Finish
```

## Important: AI status

Real AI pipelines are **not implemented yet**.

The API, database persistence, versions, conversations, approvals, files,
background jobs, polling, WebSockets, and output flow are implemented. Current
Celery jobs return placeholder results:

- 2D generation/edit: placeholder PNG
- 3D generation/edit/angle: placeholder PNG
- BOQ generation: placeholder structured JSON
- Job progress: simulated progress
- ZIP creation: real archive generation from stored project files

Frontend integration should use the real API contract now. When AI is added,
the backend will replace the task internals; the frontend flow should not need
to change.

## 1. API base URL and proxy setup

Use relative URLs in browser code:

```ts
export const API_V1 = '/api/v1';
export const PROJECTS_API = `${API_V1}/projects`;
```

Do not hardcode an ngrok URL inside components.

Recommended routing:

- Local Vite: proxy `/api` and `/ws` to the backend/ngrok server.
- Vercel development: rewrite `/api` to the backend/ngrok server.
- Final VPS: Nginx routes `/api` and `/ws` to Django/Daphne.

Using relative URLs keeps browser requests same-origin and makes HttpOnly auth
cookies work consistently.

The frontend route must use the real project UUID returned by the API:

```text
/dashboard/projects/{project.id}/upload
```

Do not use a fake value such as `project-001` for API requests.

## 2. Authentication, cookies, and CSRF

Authentication tokens are stored by the backend in HttpOnly cookies.

Frontend rules:

- Always use `credentials: 'include'`.
- Never store access or refresh tokens in `localStorage` or `sessionStorage`.
- Send `X-CSRFToken` on `POST`, `PATCH`, and `DELETE`.
- Do not try to read the authentication cookies with JavaScript.

Initialize CSRF once when the application starts:

```ts
let csrfToken = '';

export async function initializeCsrf(): Promise<string> {
  const response = await fetch('/api/v1/auth/csrf/', {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Unable to initialize CSRF protection.');
  }

  const data = await response.json();
  csrfToken = data.csrfToken;
  return csrfToken;
}
```

Recommended API wrapper:

```ts
type ApiErrorBody = Record<string, unknown>;

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody;

  constructor(status: number, body: ApiErrorBody) {
    super(`API request failed with status ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function refreshSession(): Promise<boolean> {
  if (!csrfToken) await initializeCsrf();

  const response = await fetch('/api/v1/auth/refresh/', {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-CSRFToken': csrfToken },
  });

  return response.ok;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  mayRefresh = true,
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(method);

  if (unsafe && !csrfToken) await initializeCsrf();

  const headers = new Headers(options.headers);
  if (unsafe) headers.set('X-CSRFToken', csrfToken);

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && mayRefresh) {
    const refreshed = await refreshSession();
    if (refreshed) return apiFetch<T>(path, options, false);
  }

  if (!response.ok) {
    let body: ApiErrorBody = { detail: 'Request failed.' };
    try {
      body = await response.json();
    } catch {
      // Response was not JSON.
    }
    throw new ApiError(response.status, body);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
```

When sending JSON:

```ts
await apiFetch('/api/v1/projects/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Villa Project' }),
});
```

When sending `FormData`, do **not** set `Content-Type`; the browser must create
the multipart boundary:

```ts
const form = new FormData();
form.append('file', file);

await apiFetch(url, {
  method: 'POST',
  body: form,
});
```

## 3. Shared frontend types

```ts
type UUID = string;
type ISODateTime = string;

type JobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

type JobType =
  | 'FLOOR_PLAN_GENERATE'
  | 'FLOOR_PLAN_EDIT'
  | 'THREE_D_GENERATE'
  | 'THREE_D_EDIT'
  | 'THREE_D_ANGLE'
  | 'BOQ_GENERATE'
  | 'PROJECT_ARCHIVE';

interface WorkflowState {
  current_step: 1 | 2 | 3 | 4;
  step_1_complete: boolean;
  step_2_complete: boolean;
  step_3_complete: boolean;
  boq_skipped: boolean;
  is_finished: boolean;
}

interface Project {
  id: UUID;
  name: string;
  workflow: 'COMPLETE' | 'STEP_1_ONLY' | 'STEP_2_ONLY' | 'STEP_3_ONLY';
  workflow_display: string;
  selected_floor_plan: UUID | null;
  selected_three_d: UUID | null;
  selected_boq: UUID | null;
  step_1_completed_at: ISODateTime | null;
  step_2_completed_at: ISODateTime | null;
  step_3_completed_at: ISODateTime | null;
  boq_skipped_at: ISODateTime | null;
  completed_at: ISODateTime | null;
  workflow_state: WorkflowState;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

type AssetKind =
  | 'FLOOR_PLAN'
  | 'THREE_D_IMAGE'
  | 'MASK'
  | 'BOQ_FILE'
  | 'DOCUMENT'
  | 'UPLOAD'
  | 'ARCHIVE';

interface ProjectAsset {
  id: UUID;
  kind: AssetKind;
  original_name: string;
  content_type: string;
  size: number;
  metadata: Record<string, unknown>;
  download_url: string;
  created_at: ISODateTime;
}

interface ProcessingJob {
  id: UUID;
  project: UUID;
  job_type: JobType;
  status: JobStatus;
  progress: number;
  message: string;
  error: string;
  parameters: Record<string, unknown>;
  output_asset: UUID | null;
  websocket_path: string;
  created_at: ISODateTime;
  started_at: ISODateTime | null;
  completed_at: ISODateTime | null;
  updated_at: ISODateTime;
}

type JobSocketUpdate = Pick<
  ProcessingJob,
  | 'id'
  | 'project'
  | 'job_type'
  | 'status'
  | 'progress'
  | 'message'
  | 'error'
  | 'parameters'
  | 'output_asset'
  | 'updated_at'
>;

interface ConversationMessage {
  id: UUID;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  metadata: Record<string, unknown>;
  attachments: ProjectAsset[];
  created_at: ISODateTime;
}

interface FloorPlanVersion {
  id: UUID;
  source: 'UPLOADED' | 'GENERATED' | 'EDITED';
  prompt: string;
  instruction: string;
  prompt_message: ConversationMessage | null;
  parent: UUID | null;
  image: ProjectAsset | null;
  mask: ProjectAsset | null;
  job: ProcessingJob | null;
  status: JobStatus;
  selected: boolean;
  created_at: ISODateTime;
  completed_at: ISODateTime | null;
}

interface ThreeDVersion {
  id: UUID;
  source: 'GENERATED' | 'EDITED' | 'ANGLE';
  render_style: 'SKETCHUP' | 'PHOTOREALISTIC';
  angle: 'ORIGINAL' | 'ISOMETRIC_45';
  prompt_message: ConversationMessage | null;
  floor_plan: UUID | null;
  parent: UUID | null;
  mask: ProjectAsset | null;
  instruction: string;
  image: ProjectAsset | null;
  job: ProcessingJob | null;
  status: JobStatus;
  selected: boolean;
  created_at: ISODateTime;
  completed_at: ISODateTime | null;
}

interface BOQVersion {
  id: UUID;
  version_number: number;
  source: 'GENERATED' | 'MANUAL';
  source_message: UUID | null;
  parent: UUID | null;
  structured_data: Record<string, unknown> | unknown[];
  job: ProcessingJob | null;
  status: JobStatus;
  selected: boolean;
  created_at: ISODateTime;
  completed_at: ISODateTime | null;
}

type DocumentType =
  | 'GENERAL'
  | 'PROJECT_BRIEF'
  | 'STRUCTURAL_DRAWING'
  | 'ESTIMATION'
  | 'MATERIAL_SPECIFICATION'
  | 'THREE_D_MODEL'
  | 'OTHER';

interface ProjectDocument {
  id: UUID;
  title: string;
  document_type: DocumentType;
  document_type_display: string;
  asset: ProjectAsset;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}
```

## 4. Complete endpoint index

Every URL below starts with `/api/v1/projects`.

### Project and workflow state

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/` | List the current user's projects |
| `POST` | `/` | Create project; workflow defaults to full |
| `GET` | `/{project_id}/` | Load project and resume state |
| `PATCH` | `/{project_id}/` | Rename project |
| `DELETE` | `/{project_id}/` | Permanently delete project and files |
| `GET` | `/{project_id}/output/` | Get grouped Step 4 deliverables |
| `POST` | `/{project_id}/finish/` | Mark the valid workflow finished |

### Step 1 — 2D floor plan

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/{project_id}/step-1/conversation/` | 2D assistant history |
| `GET` | `/{project_id}/step-1/history/` | All 2D versions |
| `POST` | `/{project_id}/step-1/upload/` | Upload floor plan |
| `POST` | `/{project_id}/step-1/generate/` | Queue generation or text revision |
| `POST` | `/{project_id}/step-1/edit/` | Queue traced-mask edit |
| `POST` | `/{project_id}/step-1/versions/{version_id}/approve/` | Approve 2D version |

### Step 2 — 3D rendering

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/{project_id}/step-2/conversation/` | 3D assistant history |
| `GET` | `/{project_id}/step-2/history/` | All 3D versions |
| `POST` | `/{project_id}/step-2/generate/` | Queue 3D generation |
| `POST` | `/{project_id}/step-2/edit/` | Queue traced-mask edit |
| `POST` | `/{project_id}/step-2/angle/` | Queue angle conversion |
| `POST` | `/{project_id}/step-2/versions/{version_id}/approve/` | Approve 3D version |
| `POST` | `/{project_id}/step-2/input/` | Only for future `STEP_2_ONLY` projects |

### Step 3 — BOQ

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/{project_id}/step-3/conversation/` | BOQ conversation history |
| `POST` | `/{project_id}/step-3/conversation/` | Save text-only BOQ message |
| `POST` | `/{project_id}/step-3/generate/` | Queue BOQ generation |
| `GET` | `/{project_id}/step-3/versions/` | List BOQ versions |
| `POST` | `/{project_id}/step-3/versions/manual/` | Save edited table as new version |
| `POST` | `/{project_id}/step-3/versions/{version_id}/approve/` | Approve BOQ version |
| `GET` | `/{project_id}/step-3/versions/{version_id}/download-csv/` | Download BOQ CSV |
| `POST` | `/{project_id}/step-3/skip/` | Skip optional BOQ |
| `GET`/`POST` | `/{project_id}/step-3/documents/` | List/upload BOQ documents |
| `GET`/`PATCH`/`DELETE` | `/{project_id}/step-3/documents/{document_id}/` | Document operations |

### Messages, jobs, and downloads

| Method | Path | Purpose |
| --- | --- | --- |
| `DELETE` | `/{project_id}/conversations/messages/{message_id}/` | Delete user/bot message |
| `GET` | `/jobs/{job_id}/` | Poll background job |
| `GET` | `/{project_id}/assets/` | List assets; optional `?kind=` filter |
| `GET` | `/{project_id}/assets/{asset_id}/download/` | Download one asset |
| `POST` | `/{project_id}/download-all/` | Queue full/category ZIP |

Legacy `/select/` routes still work for version selection, but new frontend
code should use `/approve/` because it matches the UI wording.

## 5. Resume and routing logic

On project-card click or page refresh:

```http
GET /api/v1/projects/{project_id}/
```

Use `project.workflow_state.current_step` as the backend source of truth:

```ts
function projectRoute(project: Project): string {
  const base = `/dashboard/projects/${project.id}`;

  if (project.workflow_state.current_step === 1) return `${base}/upload`;
  if (project.workflow_state.current_step === 2) return `${base}/rendering`;
  if (project.workflow_state.current_step === 3) return `${base}/boq`;
  return `${base}/output`;
}
```

Do not determine progress only from local React state. Refetch the project:

- after upload
- after every approval
- after BOQ skip
- after finish
- when reopening a project

## 6. Create Project screen

Request:

```http
POST /api/v1/projects/
Content-Type: application/json
```

```json
{
  "name": "Residence Project"
}
```

The backend automatically sets:

```json
{
  "workflow": "COMPLETE",
  "workflow_display": "Complete workflow"
}
```

The frontend currently must not show workflow selection. Future frontend code
may send one of:

```text
COMPLETE
STEP_1_ONLY
STEP_2_ONLY
STEP_3_ONLY
```

Workflow is immutable after project creation.

Project names are unique per user, case-insensitively. A duplicate normally
returns:

```json
{
  "name": ["You already have a project with this name."]
}
```

After `201 Created`, store `response.id` and navigate to Step 1.

## 7. Step 1 — Upload flow

### Upload a floor plan

```http
POST /api/v1/projects/{project_id}/step-1/upload/
Content-Type: multipart/form-data
```

```ts
const form = new FormData();
form.append('file', selectedFile);

const version = await apiFetch<FloorPlanVersion>(
  `/api/v1/projects/${projectId}/step-1/upload/`,
  { method: 'POST', body: form },
);
```

Supported floor-plan types:

```text
PDF
PNG
JPEG/JPG
WebP
```

Default maximum file size is 25 MB. It may be changed by backend environment
configuration.

A successful upload returns `201 Created`, creates a completed version,
automatically approves it, and moves backend workflow state to Step 2.

After success:

1. Refetch the project.
2. Confirm `workflow_state.step_1_complete === true`.
3. Navigate to the rendering page.

## 8. Step 1 — Generate/edit assistant

When the assistant page opens, fetch both calls in parallel:

```http
GET /api/v1/projects/{project_id}/step-1/conversation/
GET /api/v1/projects/{project_id}/step-1/history/
```

Render conversation messages in returned order. Render version cards/images
from history. Multiple generated/edited versions must remain visible.

### Generate a new 2D plan

```http
POST /api/v1/projects/{project_id}/step-1/generate/
Content-Type: application/json
```

```json
{
  "prompt": "Create a three-bedroom family house with an open kitchen."
}
```

Response: `202 Accepted` with a `FloorPlanVersion`. Read:

```ts
const jobId = version.job!.id;
```

Poll the job. When completed, refetch conversation and history.

### Text-only revision

The same generation endpoint supports an existing version as parent:

```json
{
  "prompt": "Move the kitchen next to the dining room.",
  "parent_version_id": "COMPLETED_FLOOR_PLAN_VERSION_UUID"
}
```

### Canvas/traced-mask edit

The canvas must export the user's marked region as an image file. Send the
original version, instruction, and mask:

```http
POST /api/v1/projects/{project_id}/step-1/edit/
Content-Type: multipart/form-data
```

```ts
const form = new FormData();
form.append('original_version_id', versionId);
form.append('instruction', 'Expand the living-room wall.');
form.append('mask', maskFile);
```

Mask types: PNG, JPEG, or WebP. Response: `202 Accepted`. Monitor the nested
job, then refetch history and conversation.

### Approve the final 2D version

```http
POST /api/v1/projects/{project_id}/step-1/versions/{version_id}/approve/
```

The version must be `COMPLETED` and contain an image/file. Success returns the
updated project.

Approval behavior:

- `selected_floor_plan` becomes this version ID.
- Step 1 becomes complete.
- If a different 2D version is approved later, downstream 3D/BOQ approvals are
  cleared because they were based on the previous plan.

Navigate to Step 2 only after the approve response confirms
`workflow_state.current_step === 2`.

## 9. Step 2 — 3D assistant

When the page opens, load:

```http
GET /api/v1/projects/{project_id}/
GET /api/v1/projects/{project_id}/step-1/history/
GET /api/v1/projects/{project_id}/step-2/conversation/
GET /api/v1/projects/{project_id}/step-2/history/
```

Use Step 1 history for the “2D Floor Plans” dropdown. A suitable item is a
completed uploaded version or the currently approved generated version.

For the normal `COMPLETE` workflow, do not call `/step-2/input/`; Step 2 uses
the approved Step 1 plan.

### Generate a 3D render

```http
POST /api/v1/projects/{project_id}/step-2/generate/
Content-Type: application/json
```

```json
{
  "prompt": "Create a furnished modern layout.",
  "floor_plan_version_id": "FLOOR_PLAN_VERSION_UUID",
  "render_style": "SKETCHUP"
}
```

`floor_plan_version_id` is optional. If omitted, the backend uses the approved
or latest completed floor plan.

Allowed `render_style` values:

```text
SKETCHUP
PHOTOREALISTIC
```

Response: `202 Accepted` with a `ThreeDVersion` and nested job. Poll, then
refetch Step 2 conversation and history.

### Canvas/traced-mask 3D edit

```http
POST /api/v1/projects/{project_id}/step-2/edit/
Content-Type: multipart/form-data
```

```ts
const form = new FormData();
form.append('original_version_id', versionId);
form.append('instruction', 'Add a modern sliding glass door.');
form.append('mask', maskFile);
```

The original version must be completed and have an image. The edited version
inherits its render style and viewing angle.

### Generate an isometric angle

```http
POST /api/v1/projects/{project_id}/step-2/angle/
Content-Type: application/json
```

```json
{
  "original_version_id": "COMPLETED_3D_VERSION_UUID",
  "angle": "ISOMETRIC_45"
}
```

Current allowed angle values:

```text
ORIGINAL
ISOMETRIC_45
```

This creates another 3D version with `source: "ANGLE"`; it does not overwrite
the original.

### Approve the final 3D version

```http
POST /api/v1/projects/{project_id}/step-2/versions/{version_id}/approve/
```

Approval behavior:

- `selected_three_d` becomes the approved version ID.
- Step 2 becomes complete.
- Approving a different 3D version later clears an existing BOQ approval/skip.

Navigate to BOQ only after `workflow_state.current_step === 3`.

## 10. Delete a conversation message

The same endpoint works for 2D, 3D, and BOQ messages, including user and bot
responses:

```http
DELETE /api/v1/projects/{project_id}/conversations/messages/{message_id}/
```

Success: `204 No Content`.

Deleting a message does not delete generated versions or project assets. If a
prompt is deleted while its job is running, the job may still complete, but a
new assistant message is not required to be created for that deleted prompt.

After deletion, remove the message from local cache or refetch the relevant
conversation.

## 11. Step 3 — BOQ documents

Documents are intentionally separate from conversation-message attachments.

Do not send files to the BOQ conversation or BOQ generation endpoints. Upload
them first through the document API. BOQ generation records the document IDs
available at the moment the job is submitted.

### List documents

```http
GET /api/v1/projects/{project_id}/step-3/documents/
```

### Upload a document

```http
POST /api/v1/projects/{project_id}/step-3/documents/
Content-Type: multipart/form-data
```

```ts
const form = new FormData();
form.append('file', file);
form.append('title', 'Structural Drawings'); // optional
form.append('document_type', 'STRUCTURAL_DRAWING');
```

If `title` is omitted/blank, the original file name is used.

Allowed `document_type` values:

```text
GENERAL
PROJECT_BRIEF
STRUCTURAL_DRAWING
ESTIMATION
MATERIAL_SPECIFICATION
THREE_D_MODEL
OTHER
```

The document response contains a nested `asset` with its authenticated
`download_url`.

### Update document metadata

```http
PATCH /api/v1/projects/{project_id}/step-3/documents/{document_id}/
Content-Type: application/json
```

```json
{
  "title": "Updated structural drawings",
  "document_type": "STRUCTURAL_DRAWING"
}
```

At least one field is required.

### Replace the document file

Use the same `PATCH` endpoint with multipart data:

```ts
const form = new FormData();
form.append('file', replacementFile);
form.append('title', 'Revised structural drawings');
```

The backend removes the previous stored asset after replacement.

### Delete a document

```http
DELETE /api/v1/projects/{project_id}/step-3/documents/{document_id}/
```

Success: `204 No Content`. This deletes both document metadata and its file.

## 12. Step 3 — BOQ conversation and versions

When the BOQ assistant opens, load in parallel:

```http
GET /api/v1/projects/{project_id}/step-3/conversation/
GET /api/v1/projects/{project_id}/step-3/versions/
GET /api/v1/projects/{project_id}/step-3/documents/
```

### Save a conversation message without generation

```http
POST /api/v1/projects/{project_id}/step-3/conversation/
Content-Type: application/json
```

```json
{
  "content": "Use metric units for all quantities."
}
```

This stores a text-only user message and returns `201`. It does not queue a bot
response.

### Request BOQ generation

Use this endpoint when the user expects an assistant response/table:

```http
POST /api/v1/projects/{project_id}/step-3/generate/
Content-Type: application/json
```

```json
{
  "prompt": "Generate a complete BOQ with quantities and units."
}
```

For a full workflow, a completed/approved 3D version is required. Response:
`202 Accepted` with a `BOQVersion` and nested job. Poll the job, then refetch
conversation and versions.

### Save frontend table edits as a new version

Never overwrite an existing BOQ version only in browser state. Save edits as a
new immutable version:

```http
POST /api/v1/projects/{project_id}/step-3/versions/manual/
Content-Type: application/json
```

```json
{
  "parent_version_id": "OPTIONAL_COMPLETED_BOQ_VERSION_UUID",
  "structured_data": {
    "columns": ["Item", "Description", "Quantity", "Unit", "Rate", "Amount"],
    "rows": [
      {
        "Item": "1",
        "Description": "Concrete",
        "Quantity": 10,
        "Unit": "m3",
        "Rate": 0,
        "Amount": 0
      }
    ]
  }
}
```

`structured_data` may be a JSON object or array. Response: `201 Created` with
a completed `MANUAL` version.

### Approve the BOQ

```http
POST /api/v1/projects/{project_id}/step-3/versions/{version_id}/approve/
```

The version must be completed. Approval sets `selected_boq`, completes Step 3,
and clears a previous skip state.

### Skip optional BOQ

```http
POST /api/v1/projects/{project_id}/step-3/skip/
```

This clears any selected BOQ, records `boq_skipped_at`, and makes Step 4 the
current step. Always show a confirmation dialog before skipping.

### Download a BOQ as CSV

```http
GET /api/v1/projects/{project_id}/step-3/versions/{version_id}/download-csv/
```

This returns `text/csv`, not JSON. Use the download helper from the next
section.

## 13. Step 4 — Grouped output

Load the whole output page with one request:

```http
GET /api/v1/projects/{project_id}/output/
```

Response shape:

```ts
interface ProjectOutput {
  project: Project;
  summary: {
    total_deliverables: number;
    floor_plans: number;
    three_d_renders: number;
    boq_versions: number;
    documents: number;
  };
  floor_plans: FloorPlanVersion[];
  three_d_renders: ThreeDVersion[];
  boq_versions: BOQVersion[];
  documents: ProjectDocument[];
}
```

Use `selected: true` to display “Approved Latest”. Do not assume the first item
is approved.

### List raw assets

```http
GET /api/v1/projects/{project_id}/assets/
```

Optional exact kind filter:

```http
GET /api/v1/projects/{project_id}/assets/?kind=THREE_D_IMAGE
```

### Download a file/blob

Authenticated downloads should use `fetch`:

```ts
export async function downloadFile(
  path: string,
  filename: string,
): Promise<void> {
  const response = await fetch(path, { credentials: 'include' });
  if (!response.ok) throw new Error('Download failed.');

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
```

Individual asset path:

```text
/api/v1/projects/{project_id}/assets/{asset_id}/download/
```

During proxy-based development, prefer this relative path instead of blindly
using an absolute ngrok `download_url`.

BOQ CSV can use the same helper with a generated file name.

### Queue full/category ZIP

```http
POST /api/v1/projects/{project_id}/download-all/
Content-Type: application/json
```

```json
{
  "scope": "ALL"
}
```

Allowed scopes:

```text
ALL
FLOOR_PLANS
THREE_D
BOQ
DOCUMENTS
```

Response: `202 Accepted` with a direct `ProcessingJob` object—not a nested job.

```ts
const archiveJob = await apiFetch<ProcessingJob>(url, options);
await waitForJob(archiveJob.id);
```

When completed, `job.output_asset` is the ZIP asset ID. Download it through the
individual asset endpoint.

If the same archive scope is already queued/processing, the backend returns
that active job instead of creating a duplicate.

### Finish project

```http
POST /api/v1/projects/{project_id}/finish/
```

For the default full workflow, finish succeeds only when:

- a 2D floor plan is approved
- a 3D render is approved
- a BOQ is approved **or** BOQ was explicitly skipped

Success returns the project with:

```json
{
  "workflow_state": {
    "current_step": 4,
    "is_finished": true
  }
}
```

## 14. Background job polling

Generation/edit/archive endpoints return quickly with HTTP `202`. Never keep a
request open waiting for AI work.

Generation responses contain a nested job:

```ts
const jobId = generatedVersion.job!.id;
```

Archive response is itself a job:

```ts
const jobId = archiveResponse.id;
```

Poll:

```http
GET /api/v1/projects/jobs/{job_id}/
```

Recommended implementation:

```ts
export async function waitForJob(
  jobId: UUID,
  signal?: AbortSignal,
): Promise<ProcessingJob> {
  while (!signal?.aborted) {
    const job = await apiFetch<ProcessingJob>(
      `/api/v1/projects/jobs/${jobId}/`,
      { signal },
    );

    if (job.status === 'COMPLETED') return job;
    if (job.status === 'FAILED') {
      throw new Error(job.error || 'Processing failed.');
    }

    await new Promise((resolve) => window.setTimeout(resolve, 1500));
  }

  throw new DOMException('Polling cancelled.', 'AbortError');
}
```

Frontend must:

- show `job.progress` and `job.message`
- stop on `COMPLETED` or `FAILED`
- cancel polling when the component unmounts
- refetch history/conversation/output after completion
- allow polling to resume after page reload
- avoid submitting the same operation repeatedly while its job is active

Current job-state sequence:

```text
QUEUED -> PROCESSING -> COMPLETED
                     -> FAILED
```

## 15. Optional WebSocket integration

REST polling is required as a fallback. WebSockets are optional.

Connect to the job's returned `websocket_path`:

```text
ws://HOST/ws/jobs/{job_id}/
wss://HOST/ws/jobs/{job_id}/
```

Example:

```ts
function jobSocketUrl(path: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${path}`;
}

const socket = new WebSocket(jobSocketUrl(job.websocket_path));
socket.onmessage = (event) => {
  const updatedJob = JSON.parse(event.data) as JobSocketUpdate;
  // Update progress UI.
};
```

The server sends the current job immediately and then pushes updates. Relevant
close codes:

```text
4401 = authentication missing/expired
4404 = job missing or belongs to another user
```

If the socket cannot connect through Vercel/ngrok, use REST polling.

## 16. Suggested frontend query/state structure

Suggested query keys:

```ts
['projects']
['project', projectId]
['project', projectId, 'floor-plans']
['project', projectId, 'floor-plan-conversation']
['project', projectId, 'three-d']
['project', projectId, 'three-d-conversation']
['project', projectId, 'boq-versions']
['project', projectId, 'boq-conversation']
['project', projectId, 'documents']
['project', projectId, 'output']
['job', jobId]
```

Invalidate/refetch:

| Mutation | Refetch |
| --- | --- |
| Create/rename/delete project | project list |
| Upload/approve 2D | project, 2D history, output |
| Complete 2D job | 2D history, 2D conversation, output |
| Approve 3D | project, 3D history, output |
| Complete 3D job | 3D history, 3D conversation, output |
| Upload/update/delete document | documents, output |
| Complete BOQ job/manual edit | BOQ versions, BOQ conversation, output |
| Approve/skip BOQ | project, BOQ versions, output |
| Delete message | relevant conversation |
| Complete archive job | assets/output |
| Finish | project/project list |

Do not place `File`, `Blob`, WebSocket, timer, or `AbortController` objects into
persisted Redux/local-storage state.

## 17. Error handling

Handle these statuses consistently:

| Status | Frontend action |
| --- | --- |
| `200`/`201` | Apply response and refetch dependent state |
| `202` | Start job monitoring |
| `204` | Do not call `response.json()` |
| `400` | Display field validation errors |
| `401` | Refresh once, retry once, then send to login |
| `403` | Reinitialize CSRF or show permission error |
| `404` | Resource missing or not owned by current user |
| `429` | Disable retry temporarily and show rate-limit message |
| `500` | Preserve user input and show generic server error |

Common validation examples:

```json
{
  "floor_plan": "A completed 2D floor plan is required for Step 2."
}
```

```json
{
  "three_d": "A completed 3D image is required for Step 3."
}
```

```json
{
  "mask": "Only PNG, JPEG, and WebP images are supported."
}
```

Never display raw backend exception text or stack traces.

## 18. Frontend integration order

Integrate in this order so each screen has the prerequisite state it needs:

1. Shared `apiFetch`, CSRF, refresh, error normalization.
2. Project list/create/detail/rename/delete.
3. Route resume logic from `workflow_state.current_step`.
4. Step 1 upload and approval.
5. Generic job polling.
6. Step 1 conversation, generation, history, and canvas edit.
7. Step 2 conversation, style generation, angle, canvas edit, and approval.
8. Separate BOQ document CRUD.
9. BOQ conversation, generation, versions, table editing, approval, and skip.
10. Output aggregation, asset/CSV downloads, scoped ZIP, and finish.
11. Optional WebSocket updates after REST polling works.

## 19. Final integration checklist

- [ ] Browser calls relative `/api/v1` URLs.
- [ ] Vite/Vercel/Nginx forwards `/api`; WebSocket setup forwards `/ws`.
- [ ] Every request uses `credentials: 'include'`.
- [ ] Unsafe requests include `X-CSRFToken`.
- [ ] Tokens are never copied into browser storage.
- [ ] Project creation sends only `name` for the current UI.
- [ ] Real project UUID replaces mock `project-001` routes/data.
- [ ] Resume navigation uses `workflow_state.current_step`.
- [ ] Upload form accepts PDF/PNG/JPEG/WebP and handles 25 MB validation.
- [ ] Generation/edit endpoints handle `202` and poll nested jobs.
- [ ] Canvas exports a mask file for 2D/3D edit requests.
- [ ] Step 1 and Step 2 display all persisted versions.
- [ ] Approval is sent to backend; it is not only local UI state.
- [ ] 3D requests send exact style/angle enum values.
- [ ] BOQ documents use document CRUD, never chat attachments.
- [ ] BOQ table edits create manual versions.
- [ ] BOQ skip requires confirmation.
- [ ] User and assistant messages can be deleted.
- [ ] Output uses the grouped `/output/` response.
- [ ] File and CSV downloads are handled as blobs.
- [ ] ZIP response is treated as a direct job object.
- [ ] REST polling survives/restarts after navigation or refresh.
- [ ] WebSockets have a polling fallback.
- [ ] Placeholder images/BOQ are not presented as real AI quality.
- [ ] Finish is called only after backend workflow prerequisites are satisfied.

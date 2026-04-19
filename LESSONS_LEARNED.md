# Lessons Learned - Dashboard Demo Deploy

## 1. Cloud Run CPU Throttling breaks BullMQ workers

**Problem:** App builds via Cloud Build API failed with "metadata server unreachable" even though the metadata server worked fine in HTTP request handlers.

**Root cause:** Cloud Run default mode is "CPU allocated only during request processing." BullMQ job processors run in the background without an active HTTP request, so Cloud Run deallocates CPU and restricts network access - including the GCP metadata server needed to obtain access tokens.

**Fix:**
```bash
gcloud run services update <SERVICE> --region=<REGION> --project=<PROJECT> --no-cpu-throttling
```

This sets annotation `run.googleapis.com/cpu-throttling: "false"`, keeping CPU and network active even without requests.

**How we found it:** Created a `/v1/health/gcp-token` debug endpoint that tested metadata server access from an HTTP request context - it worked perfectly. The same code failed in BullMQ context, confirming the issue was CPU/network deallocation in background processing.

**Documented in:** `infra-scripts/gcp/cloud-run/DOOOR_OS.md`

## 2. Next.js static pages bake errors at build time

**Problem:** Dashboard page showed "Database not connected" even though the database was running and API routes worked.

**Root cause:** The dashboard page (`/`) was a server component without `export const dynamic = 'force-dynamic'`. Next.js pre-rendered it as static HTML at build time, when no DATABASE_URL was available. The Prisma error got frozen into the static HTML.

**Fix:** Add `export const dynamic = 'force-dynamic'` to any page that queries the database.

## 3. Empty directories are not tracked by git

**Problem:** Dockerfile `COPY --from=builder /app/public ./public` failed because the `public/` directory was empty and not committed to git.

**Fix:** Add a `.gitkeep` file to empty directories that the Dockerfile depends on.

## 4. Prisma schema defaults matter for Cloud environments

**Problem:** `managedDatabase` model had `id String @id` without `@default(uuid())`, causing Prisma to require `id` in every create call.

**Fix:** Always use `@default(uuid())` for id fields and `@updatedAt` for timestamp fields.

## 5. NestJS module dependency for @UseApiKey() decorator

**Problem:** Adding `@UseApiKey()` to controllers requires `ApiKeysModule` to be imported in that module. Missing import causes a runtime crash: "Nest can't resolve dependencies of ApiKeyGuard."

**Fix:** Every module using `@UseApiKey()` must import `ApiKeysModule` in its module definition.

## 6. MCP server should only need one credential

**Problem:** MCP server required both `DOOOR_API_KEY` and `DOOOR_WORKSPACE_ID` as env vars. Users shouldn't manage two credentials.

**Fix:** Added `/api-keys/whoami` endpoint that resolves workspace from the API key itself. MCP server now auto-resolves workspace on startup with just `DOOOR_API_KEY`.

## 7. K8s RBAC must include CRD api groups

**Problem:** Database provisioning failed with 403 because the K8s service account ClusterRole didn't include `postgresql.cnpg.io` api group for CNPG operator resources.

**Fix:** ClusterRole must explicitly list CRD api groups (postgresql.cnpg.io, traefik.io, etc.) alongside core resources. Updated `infrastructure/kubernetes/base/rbac.yaml`.

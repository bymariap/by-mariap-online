# File Storage (Cloudflare R2) — Design

**Date:** 2026-07-17
**Status:** Approved (pending spec review)
**Scope:** Nivel 1 — upload capability wired into existing image fields (products, specialist avatars). Banner/gallery content management is out of scope (future cycle).

## Goal

Replace the current "paste-a-URL" workflow with real file uploads. Admin/staff pick an image file in the panel; the API validates and stores it in object storage; the resulting public URL is saved into the fields that already exist (`Product.imageUrls`, `Specialist.avatarUrl`).

## Non-goals (explicit YAGNI)

- No server-side transformation pipeline / on-the-fly thumbnails (the storefront's `next/image` already optimizes delivery).
- No automatic deletion of orphaned files when an image is replaced (storage cost is negligible at this scale; cleanup can be added later).
- No banner / "Nuestras transformaciones" gallery management (needs new DB models + admin CRUD + storefront rewiring — separate cycle). Those home sections remain hardcoded placeholders for now.
- No customer-facing uploads (admin/staff only).

## Provider decision: Cloudflare R2

Chosen over Vercel Blob and DigitalOcean Spaces because:

- **Zero egress fees** + 10 GB free storage → effectively $0/month at this scale.
- The domain is already on Cloudflare → serve images from a first-party subdomain (`cdn.bymariap.com`) through the CDN we already control, no new DNS/CDN vendor.
- **S3-compatible** → integrates via the standard `@aws-sdk/client-s3`. If we ever switch providers, only `StorageService` changes.

## Architecture

```
Admin (Vercel)  --multipart-->  API NestJS (Railway)  --S3 SDK-->  R2 bucket
   <ImageUpload>                  StorageModule                    (bymariap-media)
                                  validate + sharp downscale             |
                                  + upload                               v
Storefront  <----------  cdn.bymariap.com  (R2 public custom domain via Cloudflare)
   next/image
```

### Serving path — data vs. bytes

Two separate things:

1. **Data (JSON):** the storefront calls the API (`GET /store/products`, etc.); the response contains image URLs like `https://cdn.bymariap.com/products/<uuid>.webp`.
2. **Bytes:** the browser loads the actual image directly from `cdn.bymariap.com` (R2 via Cloudflare CDN). **Image bytes never pass through the API on read.** With `next/image`, Vercel's optimizer fetches the original from the CDN, re-encodes to WebP/AVIF at the requested size, and caches the result (shared across all users).

The API only touches image bytes **once**, on upload.

### Upload flow — proxy through the API (not presigned URLs)

Chosen for this scale because it enables robust server-side validation, keeps R2 credentials on the server, and avoids bucket CORS + the multi-step presigned dance. Passing a ≤8 MB file through Railway on an admin-only, low-volume path is negligible. Migrating to presigned URLs later is a contained change.

### Bucket privacy

**Public-read bucket.** These are catalog/marketing images meant to be displayed; nothing sensitive. Simplifies serving and leverages the CDN.

## API design

### `StorageModule` / `StorageService`

Thin abstraction over the S3 SDK pointed at R2. Isolates the provider — swapping to another S3-compatible provider touches only this file.

- Config from env: `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`.
- Method: `upload(buffer, key, contentType) -> publicUrl`.
- A `delete(key)` method exists but is unused in v1 (see non-goals).

### `UploadsController`

Single generic endpoint:

```
POST /admin/uploads          (multipart: file + folder)
  @RequirePermissions("media:write")
  -> 201 { "url": "https://cdn.bymariap.com/products/<uuid>.webp" }
```

- **Auth/RBAC:** new permission `media:write`, seeded to admin/staff roles (matches the existing `RequirePermissions` + seed model).
- **`folder`:** controlled enum (`products` | `avatars`) — determines the destination prefix. No client-supplied free paths (prevents path traversal).
- **Validation (server-side):**
  - Type: `image/jpeg`, `image/png`, `image/webp` only.
  - Size: max **8 MB** (multer limit, early rejection).
- **Filename:** server-generated `${folder}/${uuid}.${ext}`. Never derived from the original name.
- **Processing (`sharp`):** if width > 2500px, downscale proportionally to 2500px width (aspect ratio preserved, never upscales); re-encode at quality ~80 (also strips EXIF). Images ≤2500px keep their dimensions. Typical phone photo (~8 MB, 4032px) → ~500–800 KB, 2500px, no visible quality loss.
- **Returns** the final public URL, which the admin form stores in `imageUrls[]` / `avatarUrl`.

## Admin design

### `<ImageUpload>` component (reusable)

Encapsulates the whole upload flow, two modes:

- **single** (avatar): one file; preview; a new upload replaces the previous.
- **multiple** (product): each successful upload appends its URL to the array; thumbnail grid with remove buttons.

Behavior:

1. User picks a file (click or drag-drop).
2. **Client-side pre-validation** (type + size ≤ 8 MB) for instant feedback.
3. `POST /admin/uploads` with `FormData` (file + folder); shows uploading state.
4. On `{ url }`, store the URL in the form field.
5. Explicit error handling: too large, invalid type, network failure → clear message in the widget.

**Admin API helper:** add a multipart variant to the existing client (send `FormData` without forcing `Content-Type` so the browser sets the boundary; reuse cookie auth).

### Integration points

- **Product form** (`apps/admin/src/features/products/product-form-page.tsx`): the `imageUrls` `useFieldArray` switches from text inputs to `<ImageUpload multiple>`. Existing products (already holding URLs) render as thumbnails — backward compatible, no data migration.
- **Specialist dialog** (`apps/admin/src/features/specialists/specialist-form-dialog.tsx`): the `avatarUrl` text input switches to `<ImageUpload single>` with preview.

UX:

- The form's save button is **disabled while an upload is in progress** (prevents saving half-uploaded URLs).
- Admin thumbnails load the already-downscaled original (~700 KB) scaled by CSS. Sufficient for v1. (A small dedicated thumbnail variant is a future add-on if a large grid feels heavy.)

## Configuration / env

- **API (Railway):** `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL` (= `https://cdn.bymariap.com`). Documented in `.env.example` and `.env.production.example`.
- **Storefront (Vercel):** add `cdn.bymariap.com` to `images.remotePatterns` in `next.config` (otherwise Next refuses to optimize images from that host).
- **Admin:** no new env — uses the existing cookie-authenticated API client.

## Cloudflare provisioning (one-time, manual)

1. Create R2 bucket `bymariap-media`.
2. Connect public custom domain `cdn.bymariap.com` to the bucket (R2 → Public access → Custom domain).
3. Create an R2 API token (S3 keys) → set in Railway env.

## Error handling

Consistent with the existing `AllExceptionsFilter`:

| Scenario | Response |
|----------|----------|
| Invalid type / file > 8 MB | `400 Bad Request`, clear message |
| No session / missing `media:write` | `401` / `403` |
| R2 failure (network, credentials) | `502 Bad Gateway`, server-side log, no internal details leaked |
| Invalid `folder` | `400` |

Each maps to an understandable message in the admin widget.

## Testing (jest unit + e2e, matching existing conventions)

- **Unit — `StorageService`:** with the S3 client mocked, assert correct key generation (`folder/uuid.ext`), that `sharp` downscales when width > 2500px and skips when ≤ 2500px, and that the public URL is assembled correctly.
- **Unit — `UploadsController`:** rejects invalid type and oversized files; requires `media:write`.
- **E2E — `POST /admin/uploads`:** with a small fixture image, authenticated with permission → `201` + correct URL shape; without permission → `403`; oversized file → `400`. The S3/R2 client is mocked (no real R2 in tests).
- **Admin:** type/size covered by client pre-validation; no heavy UI tests (consistent with the current suite).

## Operational notes

- `sharp` ships native binaries (built on `libvips`); ensure the correct linux build in the Railway Docker image. It is already present in the dependency tree (as a Next dependency), so risk is low — noted for the implementation plan.

# File Storage (Cloudflare R2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real image uploads (admin → API → Cloudflare R2) and wire the returned public URLs into the product and specialist-avatar forms that currently accept pasted URLs.

**Architecture:** A NestJS `StorageService` wraps the S3 SDK pointed at R2; it downscales images with `sharp` and stores them in a public bucket served via `cdn.bymariap.com`. A single protected endpoint `POST /admin/uploads` validates type/size and delegates to `StorageService`. A reusable admin `<ImageUpload>` component posts files and stores the resulting URL in the existing form fields.

**Tech Stack:** NestJS 10, `@aws-sdk/client-s3`, `sharp`, Prisma seed (RBAC), React + Vite + react-hook-form (admin), Cloudflare R2.

## Global Constraints

- Package manager: `pnpm` workspaces + Turbo. API package: `@bymariap/api`. Admin package: `@bymariap/admin`.
- **Line endings:** do NOT convert files to CRLF (the user handles that manually).
- **Commit messages:** single concise line, conventional-commit format, NO `Co-Authored-By` trailer.
- Tests: jest (unit `*.spec.ts` beside source; e2e `apps/api/test/*.e2e-spec.ts` — e2e needs Docker via testcontainers).
- Allowed image types: `image/jpeg`, `image/png`, `image/webp` only.
- Max upload size: **8 MB**.
- Downscale rule: if width > **2500px**, resize proportionally to 2500px width (never upscale); re-encode at quality 80 keeping the input format.
- RBAC permission for uploads: **`media:write`** (the `admin` role already has `"*"`, which satisfies it).
- Upload folders (enum): `products` | `avatars`.
- Public asset host: `https://cdn.bymariap.com`. Bucket: `bymariap-media`.
- `sharp` pinned to `^0.34.0` (matches the version already in the workspace tree).

---

### Task 1: StorageService + StorageModule (R2 + sharp)

**Files:**
- Modify: `apps/api/package.json` (add deps)
- Create: `apps/api/src/modules/storage/storage.module.ts`
- Create: `apps/api/src/modules/storage/storage.service.ts`
- Test: `apps/api/src/modules/storage/storage.service.spec.ts`

**Interfaces:**
- Produces:
  - `type MediaFolder = "products" | "avatars"` (exported from `storage.service.ts`)
  - `StorageService.store(file: { buffer: Buffer; mimetype: string }, folder: MediaFolder): Promise<string>` — processes with sharp, generates `folder/<uuid>.<ext>`, uploads to R2, returns the public URL.
  - `StorageModule` (exports `StorageService`).
  - Injection token `S3_CLIENT` (exported from `storage.service.ts` to avoid a module↔service circular import).

- [ ] **Step 1: Add dependencies**

Edit `apps/api/package.json` — add to `"dependencies"` (alphabetical order is fine):

```json
"@aws-sdk/client-s3": "^3.700.0",
"sharp": "^0.34.0",
```

Add to `"devDependencies"`:

```json
"@types/multer": "^1.4.12",
```

Then install from the repo root:

Run: `pnpm install`
Expected: completes; `apps/api/node_modules/.pnpm` now resolves `@aws-sdk/client-s3` and `sharp`.

- [ ] **Step 2: Write the failing test**

Create `apps/api/src/modules/storage/storage.service.spec.ts`:

```typescript
import sharp from "sharp";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { StorageService } from "./storage.service";

function fakeConfig() {
  const values: Record<string, string> = {
    R2_BUCKET: "bymariap-media",
    R2_PUBLIC_BASE_URL: "https://cdn.bymariap.com",
  };
  return { getOrThrow: (k: string) => values[k] } as any;
}

async function makeImage(width: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height: Math.round(width * 0.75),
      channels: 3,
      background: { r: 120, g: 80, b: 60 },
    },
  })
    .jpeg()
    .toBuffer();
}

describe("StorageService", () => {
  it("downscales wide images to 2500px, keys them, and returns the public URL", async () => {
    const s3 = { send: jest.fn().mockResolvedValue({}) };
    const svc = new StorageService(s3 as any, fakeConfig());

    const input = await makeImage(3000);
    const url = await svc.store(
      { buffer: input, mimetype: "image/jpeg" },
      "products",
    );

    const cmd = s3.send.mock.calls[0][0] as PutObjectCommand;
    expect(cmd.input.Key).toMatch(
      /^products\/[0-9a-f-]{36}\.jpg$/,
    );
    expect(cmd.input.ContentType).toBe("image/jpeg");
    const outMeta = await sharp(cmd.input.Body as Buffer).metadata();
    expect(outMeta.width).toBe(2500);
    expect(url).toBe(`https://cdn.bymariap.com/${cmd.input.Key}`);
  });

  it("leaves images <= 2500px at their original width and preserves png", async () => {
    const s3 = { send: jest.fn().mockResolvedValue({}) };
    const svc = new StorageService(s3 as any, fakeConfig());

    const input = await sharp({
      create: {
        width: 1200,
        height: 900,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toBuffer();

    await svc.store({ buffer: input, mimetype: "image/png" }, "avatars");

    const cmd = s3.send.mock.calls[0][0] as PutObjectCommand;
    expect(cmd.input.Key).toMatch(/^avatars\/[0-9a-f-]{36}\.png$/);
    expect(cmd.input.ContentType).toBe("image/png");
    const outMeta = await sharp(cmd.input.Body as Buffer).metadata();
    expect(outMeta.width).toBe(1200);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @bymariap/api exec jest src/modules/storage/storage.service.spec.ts`
Expected: FAIL — cannot find module `./storage.service`.

- [ ] **Step 4: Write the module**

Create `apps/api/src/modules/storage/storage.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client } from "@aws-sdk/client-s3";
import { StorageService, S3_CLIENT } from "./storage.service";

@Module({
  providers: [
    {
      provide: S3_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new S3Client({
          region: "auto",
          endpoint: config.get<string>("R2_ENDPOINT") ?? "",
          credentials: {
            accessKeyId: config.get<string>("R2_ACCESS_KEY_ID") ?? "",
            secretAccessKey: config.get<string>("R2_SECRET_ACCESS_KEY") ?? "",
          },
        }),
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
```

- [ ] **Step 5: Write the service**

Create `apps/api/src/modules/storage/storage.service.ts`:

```typescript
import { randomUUID } from "crypto";
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";

export const S3_CLIENT = "S3_CLIENT";

export type MediaFolder = "products" | "avatars";

const MAX_WIDTH = 2500;

interface ProcessedImage {
  buffer: Buffer;
  ext: string;
  contentType: string;
}

@Injectable()
export class StorageService {
  private readonly bucket: string;
  private readonly publicBase: string;

  constructor(
    @Inject(S3_CLIENT) private readonly s3: S3Client,
    config: ConfigService,
  ) {
    this.bucket = config.getOrThrow<string>("R2_BUCKET");
    this.publicBase = config
      .getOrThrow<string>("R2_PUBLIC_BASE_URL")
      .replace(/\/$/, "");
  }

  async store(
    file: { buffer: Buffer; mimetype: string },
    folder: MediaFolder,
  ): Promise<string> {
    const processed = await this.process(file);
    const key = `${folder}/${randomUUID()}.${processed.ext}`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: processed.buffer,
        ContentType: processed.contentType,
      }),
    );
    return `${this.publicBase}/${key}`;
  }

  private async process(file: {
    buffer: Buffer;
    mimetype: string;
  }): Promise<ProcessedImage> {
    const img = sharp(file.buffer);
    const meta = await img.metadata();
    if (meta.width && meta.width > MAX_WIDTH) {
      img.resize({ width: MAX_WIDTH });
    }
    switch (file.mimetype) {
      case "image/png":
        return {
          buffer: await img.png({ quality: 80 }).toBuffer(),
          ext: "png",
          contentType: "image/png",
        };
      case "image/webp":
        return {
          buffer: await img.webp({ quality: 80 }).toBuffer(),
          ext: "webp",
          contentType: "image/webp",
        };
      default:
        return {
          buffer: await img.jpeg({ quality: 80 }).toBuffer(),
          ext: "jpg",
          contentType: "image/jpeg",
        };
    }
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm --filter @bymariap/api exec jest src/modules/storage/storage.service.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add apps/api/package.json apps/api/pnpm-lock.yaml pnpm-lock.yaml apps/api/src/modules/storage
git commit -m "feat(api): add StorageService for R2 uploads with sharp downscale"
```

(If `pnpm-lock.yaml` only changed at the repo root, adjust the `git add` accordingly — stage whichever lockfile actually changed.)

---

### Task 2: Upload endpoint (`POST /admin/uploads`)

**Files:**
- Create: `apps/api/src/modules/uploads/uploads.controller.ts`
- Create: `apps/api/src/modules/uploads/uploads.module.ts`
- Test: `apps/api/src/modules/uploads/uploads.controller.spec.ts`
- Test: `apps/api/test/uploads.e2e-spec.ts`
- Modify: `apps/api/src/app.module.ts` (import `UploadsModule`)
- Modify: `apps/api/prisma/seed.ts` (register `media:write`)
- Modify: `apps/api/.env.example`, `apps/api/.env.production.example` (document R2 vars)

**Interfaces:**
- Consumes: `StorageService.store(...)` and `MediaFolder` from Task 1.
- Produces: `POST /admin/uploads` (multipart `file` + text field `folder`) → `201 { url: string }`. Requires permission `media:write`.

- [ ] **Step 1: Write the controller unit test**

Create `apps/api/src/modules/uploads/uploads.controller.spec.ts`:

```typescript
import { BadGatewayException, BadRequestException } from "@nestjs/common";
import { UploadsController } from "./uploads.controller";

describe("UploadsController", () => {
  const storage = { store: jest.fn().mockResolvedValue("https://cdn/x.jpg") };
  const ctrl = new UploadsController(storage as any);

  beforeEach(() => storage.store.mockClear());

  const file = { buffer: Buffer.from("x"), mimetype: "image/jpeg" } as any;

  it("stores the file and returns the url", async () => {
    const res = await ctrl.upload(file, "products");
    expect(res).toEqual({ url: "https://cdn/x.jpg" });
    expect(storage.store).toHaveBeenCalledWith(
      { buffer: file.buffer, mimetype: "image/jpeg" },
      "products",
    );
  });

  it("rejects an invalid folder", async () => {
    await expect(ctrl.upload(file, "banners")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(storage.store).not.toHaveBeenCalled();
  });

  it("maps a storage failure to 502 Bad Gateway", async () => {
    storage.store.mockRejectedValueOnce(new Error("R2 down"));
    await expect(ctrl.upload(file, "products")).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @bymariap/api exec jest src/modules/uploads/uploads.controller.spec.ts`
Expected: FAIL — cannot find module `./uploads.controller`.

- [ ] **Step 3: Write the controller**

Create `apps/api/src/modules/uploads/uploads.controller.ts`:

```typescript
import {
  BadGatewayException,
  BadRequestException,
  Body,
  Controller,
  FileTypeValidator,
  HttpStatus,
  Logger,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { StorageService, MediaFolder } from "../storage/storage.service";

const MAX_SIZE = 8 * 1024 * 1024;
const FOLDERS: MediaFolder[] = ["products", "avatars"];

@Controller()
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  constructor(private readonly storage: StorageService) {}

  @Post("admin/uploads")
  @RequirePermissions("media:write")
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 20 * 1024 * 1024 } }),
  )
  async upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_SIZE }),
          new FileTypeValidator({ fileType: /^image\/(jpe?g|png|webp)$/ }),
        ],
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      }),
    )
    file: Express.Multer.File,
    @Body("folder") folder: string,
  ): Promise<{ url: string }> {
    if (!FOLDERS.includes(folder as MediaFolder)) {
      throw new BadRequestException('folder must be "products" or "avatars"');
    }
    try {
      const url = await this.storage.store(
        { buffer: file.buffer, mimetype: file.mimetype },
        folder as MediaFolder,
      );
      return { url };
    } catch (err) {
      this.logger.error("R2 upload failed", err as Error);
      throw new BadGatewayException("No se pudo almacenar la imagen");
    }
  }
}
```

- [ ] **Step 4: Write the module**

Create `apps/api/src/modules/uploads/uploads.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { StorageModule } from "../storage/storage.module";
import { UploadsController } from "./uploads.controller";

@Module({
  imports: [StorageModule],
  controllers: [UploadsController],
})
export class UploadsModule {}
```

- [ ] **Step 5: Register the module in AppModule**

In `apps/api/src/app.module.ts`, add the import near the other module imports:

```typescript
import { UploadsModule } from "./modules/uploads/uploads.module";
```

And add `UploadsModule` to the `imports: [...]` array (append after `AppointmentsModule`).

- [ ] **Step 6: Run the controller test to verify it passes**

Run: `pnpm --filter @bymariap/api exec jest src/modules/uploads/uploads.controller.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Register the `media:write` permission in the seed**

In `apps/api/prisma/seed.ts`, add to the `PERMISSIONS` array (after the `products:write` line):

```typescript
  // media
  "media:write",
```

(No `ROLE_PERMS` change needed — `admin` already maps to `"*"`.)

- [ ] **Step 8: Document the R2 env vars**

Append to `apps/api/.env.example`:

```dotenv
# --- Storage (Cloudflare R2) ---
R2_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=bymariap-media
R2_PUBLIC_BASE_URL=http://localhost:9000
```

Append to `apps/api/.env.production.example`:

```dotenv
# --- Storage (Cloudflare R2) ---
R2_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=bymariap-media
R2_PUBLIC_BASE_URL=https://cdn.bymariap.com
```

- [ ] **Step 9: Write the e2e test**

Create `apps/api/test/uploads.e2e-spec.ts`:

```typescript
import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";
import request from "supertest";
import { execSync } from "child_process";
import path from "path";
import { AppModule } from "../src/app.module";
import { StorageService } from "../src/modules/storage/storage.service";
import { startTestDb } from "./helpers/db";

describe("Uploads E2E", () => {
  let app: INestApplication;
  let stopDb: () => Promise<void>;

  beforeAll(async () => {
    const db = await startTestDb();
    stopDb = db.stop;
    process.env.JWT_ACCESS_SECRET = "test-access";
    process.env.JWT_REFRESH_SECRET = "test-refresh";
    process.env.SEED_ADMIN_EMAIL = "admin@bymariap.com";
    process.env.SEED_ADMIN_PASSWORD = "admin-pass-123";

    const apiDir = path.resolve(__dirname, "..");
    execSync("pnpm exec ts-node prisma/seed.ts", {
      stdio: "inherit",
      env: process.env,
      cwd: apiDir,
    });

    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(StorageService)
      .useValue({
        store: jest
          .fn()
          .mockResolvedValue("https://cdn.bymariap.com/products/fake.jpg"),
      })
      .compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  }, 120_000);

  afterAll(async () => {
    await app.close();
    await stopDb();
  });

  async function adminCookies(): Promise<string[]> {
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "admin@bymariap.com", password: "admin-pass-123" })
      .expect(201);
    return login.headers["set-cookie"] as unknown as string[];
  }

  it("rejects upload without a session", async () => {
    await request(app.getHttpServer())
      .post("/admin/uploads")
      .attach("file", Buffer.from("x"), {
        filename: "a.jpg",
        contentType: "image/jpeg",
      })
      .field("folder", "products")
      .expect(401);
  });

  it("uploads a valid image and returns a url", async () => {
    const cookies = await adminCookies();
    const res = await request(app.getHttpServer())
      .post("/admin/uploads")
      .set("Cookie", cookies)
      .attach("file", Buffer.from("small-image-bytes"), {
        filename: "a.jpg",
        contentType: "image/jpeg",
      })
      .field("folder", "products")
      .expect(201);
    expect(res.body.url).toBe("https://cdn.bymariap.com/products/fake.jpg");
  });

  it("rejects a file larger than 8MB", async () => {
    const cookies = await adminCookies();
    await request(app.getHttpServer())
      .post("/admin/uploads")
      .set("Cookie", cookies)
      .attach("file", Buffer.alloc(9 * 1024 * 1024, 1), {
        filename: "big.jpg",
        contentType: "image/jpeg",
      })
      .field("folder", "products")
      .expect(400);
  });
});
```

- [ ] **Step 10: Run the e2e test (needs Docker)**

Run: `pnpm --filter @bymariap/api test:e2e -- --testPathPattern=uploads`
Expected: PASS (3 tests). Requires Docker running.

- [ ] **Step 11: Run the full API unit suite + typecheck**

Run: `pnpm --filter @bymariap/api test && pnpm --filter @bymariap/api typecheck`
Expected: all pass.

- [ ] **Step 12: Commit**

```bash
git add apps/api/src/modules/uploads apps/api/src/app.module.ts apps/api/prisma/seed.ts apps/api/.env.example apps/api/.env.production.example apps/api/test/uploads.e2e-spec.ts
git commit -m "feat(api): add POST /admin/uploads endpoint with media:write and validation"
```

---

### Task 3: Admin upload helper + `<ImageUpload>` component

**Files:**
- Modify: `apps/admin/src/lib/api.ts` (add `upload` helper)
- Create: `apps/admin/src/components/image-upload.tsx`

**Interfaces:**
- Produces:
  - `api.upload<T>(path: string, form: FormData): Promise<T>`
  - `<ImageUpload value={string[]} onChange={(urls: string[]) => void} folder={"products" | "avatars"} max={number} onUploadingChange={(u: boolean) => void} />`

- [ ] **Step 1: Add the multipart upload helper**

In `apps/admin/src/lib/api.ts`, add this function above the `export const api` block:

```typescript
async function upload<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  if (!res.ok) {
    const data = await safeJson(res);
    throw new ApiError(
      res.status,
      data,
      (data as any)?.message ?? res.statusText,
    );
  }
  return (await res.json()) as T;
}
```

Then add `upload` to the exported `api` object:

```typescript
export const api = {
  get: <T>(p: string) => request<T>("GET", p),
  post: <T>(p: string, body?: unknown) => request<T>("POST", p, body),
  patch: <T>(p: string, body?: unknown) => request<T>("PATCH", p, body),
  put: <T>(p: string, body?: unknown) => request<T>("PUT", p, body),
  delete: <T = void>(p: string) => request<T>("DELETE", p),
  upload,
};
```

- [ ] **Step 2: Create the `<ImageUpload>` component**

Create `apps/admin/src/components/image-upload.tsx`:

```typescript
import { useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 8 * 1024 * 1024;

export function ImageUpload({
  value,
  onChange,
  folder,
  max,
  onUploadingChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  folder: "products" | "avatars";
  max: number;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  function setBusy(b: boolean) {
    setUploading(b);
    onUploadingChange?.(b);
  }

  async function handleFile(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Formato no permitido (usa JPG, PNG o WebP)");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("La imagen supera los 8 MB");
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", folder);
      const { url } = await api.upload<{ url: string }>("/admin/uploads", form);
      onChange([...value, url]);
    } catch (e: any) {
      toast.error(e?.message ?? "Error al subir la imagen");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((url) => (
          <div key={url} className="relative">
            <img
              src={url}
              alt=""
              className="h-20 w-20 rounded object-cover border"
            />
            <button
              type="button"
              onClick={() => onChange(value.filter((u) => u !== url))}
              className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-destructive text-xs text-white"
              aria-label="Quitar imagen"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {value.length < max && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Subiendo…" : "+ Subir imagen"}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck the admin package**

Run: `pnpm --filter @bymariap/admin build`
Expected: builds without type errors.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/lib/api.ts apps/admin/src/components/image-upload.tsx
git commit -m "feat(admin): add ImageUpload component and multipart upload helper"
```

---

### Task 4: Wire `<ImageUpload>` into the product form

**Files:**
- Modify: `apps/admin/src/features/products/product-form-page.tsx`

**Interfaces:**
- Consumes: `<ImageUpload>` from Task 3.

- [ ] **Step 1: Simplify the `imageUrls` schema to a plain string array**

In `apps/admin/src/features/products/product-form-page.tsx`, change the schema line:

```typescript
  imageUrls: z.array(z.object({ value: z.string().url() })).max(10),
```

to:

```typescript
  imageUrls: z.array(z.string().url()).max(10),
```

- [ ] **Step 2: Remove the `useFieldArray` wiring and add uploading state**

Delete this line:

```typescript
  const imgs = useFieldArray({ control: form.control, name: "imageUrls" });
```

Add, right after the `const form = useForm(...)` block:

```typescript
  const [uploading, setUploading] = useState(false);
```

Update the imports at the top:
- Remove `useFieldArray` from the `react-hook-form` import (leave `useForm`).
- Add `useState` to the `react` import: `import { useEffect, useState } from "react";`
- Add: `import { ImageUpload } from "@/components/image-upload";`

- [ ] **Step 3: Fix the `reset` and payload mapping**

In the `useEffect` that calls `form.reset({...})`, change:

```typescript
        imageUrls: prod.data.imageUrls.map((value) => ({ value })),
```

to:

```typescript
        imageUrls: prod.data.imageUrls,
```

In the `save` mutation, change the payload:

```typescript
      const payload = {
        ...values,
        imageUrls: values.imageUrls.map((v) => v.value),
      };
```

to:

```typescript
      const payload = { ...values };
```

- [ ] **Step 4: Replace the "Imágenes (URLs)" field block**

Replace the entire `<Field label="Imágenes (URLs)"> … </Field>` block with:

```tsx
      <Field
        label="Imágenes"
        error={form.formState.errors.imageUrls?.message}
      >
        <ImageUpload
          value={form.watch("imageUrls")}
          onChange={(urls) =>
            form.setValue("imageUrls", urls, { shouldValidate: true })
          }
          folder="products"
          max={10}
          onUploadingChange={setUploading}
        />
      </Field>
```

- [ ] **Step 5: Disable submit while uploading**

Change the submit button:

```tsx
        <Button type="submit" disabled={save.isPending}>
```

to:

```tsx
        <Button type="submit" disabled={save.isPending || uploading}>
```

- [ ] **Step 6: Typecheck the admin package**

Run: `pnpm --filter @bymariap/admin build`
Expected: builds without type errors.

- [ ] **Step 7: Commit**

```bash
git add apps/admin/src/features/products/product-form-page.tsx
git commit -m "feat(admin): use ImageUpload for product images"
```

---

### Task 5: Wire `<ImageUpload>` into the specialist dialog

**Files:**
- Modify: `apps/admin/src/features/specialists/specialist-form-dialog.tsx`

**Interfaces:**
- Consumes: `<ImageUpload>` from Task 3. `avatarUrl` is a single string; adapt to the array API via `max={1}`.

- [ ] **Step 1: Add imports and uploading state**

In `apps/admin/src/features/specialists/specialist-form-dialog.tsx`:
- Change the react import to include `useState`: `import { useEffect, useState } from "react";`
- Add: `import { ImageUpload } from "@/components/image-upload";`
- After the `const form = useForm<FormValues>(...)` block, add:

```typescript
  const [uploading, setUploading] = useState(false);
```

- [ ] **Step 2: Replace the avatar URL text input with `<ImageUpload>`**

Replace this block:

```tsx
        <div className="space-y-1">
          <Label>Avatar URL</Label>
          <Input {...form.register("avatarUrl")} />
        </div>
```

with:

```tsx
        <div className="space-y-1">
          <Label>Avatar</Label>
          <ImageUpload
            value={form.watch("avatarUrl") ? [form.watch("avatarUrl")] : []}
            onChange={(urls) => form.setValue("avatarUrl", urls[0] ?? "")}
            folder="avatars"
            max={1}
            onUploadingChange={setUploading}
          />
        </div>
```

- [ ] **Step 3: Disable the save button while uploading**

Change:

```tsx
        <Button type="submit" disabled={save.isPending}>
          Guardar
        </Button>
```

to:

```tsx
        <Button type="submit" disabled={save.isPending || uploading}>
          Guardar
        </Button>
```

- [ ] **Step 4: Typecheck the admin package**

Run: `pnpm --filter @bymariap/admin build`
Expected: builds without type errors.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/features/specialists/specialist-form-dialog.tsx
git commit -m "feat(admin): use ImageUpload for specialist avatar"
```

---

### Task 6: Provisioning + end-to-end verification

**Files:** none (infrastructure + manual verification). This task is the reviewer gate that the whole feature works against real R2.

**Cloudflare provisioning (done by the project owner in the Cloudflare dashboard):**

- [ ] **Step 1: Create the R2 bucket**

In Cloudflare → R2 → Create bucket → name `bymariap-media`.

- [ ] **Step 2: Connect the public custom domain**

R2 → `bymariap-media` → Settings → Public access → Connect a custom domain → `cdn.bymariap.com`. Wait until it reports active (creates the DNS record automatically).

- [ ] **Step 3: Create R2 API credentials**

R2 → Manage API Tokens → Create token (Object Read & Write, scoped to `bymariap-media`). Record the Access Key ID, Secret Access Key, and the S3 endpoint `https://<accountid>.r2.cloudflarestorage.com`.

- [ ] **Step 4: Set the env vars in Railway (API service)**

Set `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET=bymariap-media`, `R2_PUBLIC_BASE_URL=https://cdn.bymariap.com`. Redeploy the API.

- [ ] **Step 5: Confirm the storefront already allows the CDN host**

Run: `grep -n "remotePatterns" apps/storefront/next.config.mjs`
Expected: shows `hostname: "**"` (wildcard) — `cdn.bymariap.com` is already permitted, no change needed. (If a future change tightens this, add `{ protocol: "https", hostname: "cdn.bymariap.com" }`.)

- [ ] **Step 6: Verify sharp's linux binary is in the API Docker image**

`sharp` ships platform-specific native binaries. After the Railway build, check the deploy logs for a successful `sharp` install (no "Could not load the sharp module" error at boot). If it fails, ensure the Docker build runs `pnpm install` on linux (it does — the build context is the repo root) so the linux `@img/sharp-*` optional dependency is fetched.

- [ ] **Step 7: End-to-end smoke test (production or local against real R2)**

1. Log into the admin panel.
2. Open a product → upload an image → confirm a thumbnail appears and Save succeeds.
3. Inspect the saved product: its `imageUrls` contains a `https://cdn.bymariap.com/products/<uuid>.<ext>` URL that loads in the browser.
4. Open the storefront product page → the image renders via `next/image`.
5. Repeat for a specialist avatar (`folder=avatars`).

Expected: images upload, are served from `cdn.bymariap.com`, and render on the storefront.

- [ ] **Step 8: (No commit)** — this task is infrastructure + verification only.

---

## Notes for the implementer

- **Orphaned files:** replacing/removing an image in the admin does NOT delete the old object from R2 (by design for v1). Do not add deletion logic.
- **Banners / "Nuestras transformaciones" gallery:** out of scope. Do not add DB models or admin CRUD for them.
- **Presigned URLs:** not used; uploads proxy through the API on purpose.

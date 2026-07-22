# Phase 6: Client Record (encrypted) + Consent + Audit Log + Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Habeas Data-sensitive features: AES-256-GCM-encrypted client records with mandatory access auditing, versioned consents, right-to-be-forgotten account deletion, and the MVP WhatsApp-assisted reminder system (link generation + daily 8am COT cron + admin UI).

**Architecture:**
- **Crypto first (spec §13 risk mitigation):** a standalone `crypto` helper (AES-256-GCM, key from `CLIENT_RECORD_ENCRYPTION_KEY`) is built and exhaustively unit-tested *before* any module depends on it.
- **`client-record`:** stores sensitive fields encrypted at rest. Accessible only by `admin` and the `specialist` assigned to that customer's appointments (scoping `:own_assigned`, applied manually per spec §5). Every read/update/delete/export writes a row to `data_access_log`.
- **`consent`:** versioned consent records. New policy version → customer must re-accept. Public storefront endpoint to accept; admin endpoint to publish a version.
- **Right to be forgotten:** `DELETE /me/account` performs real deletion of personal data, preserving only anonymized aggregates (no `customerId` linkage).
- **`notifications`:** MVP generates `wa.me` links for tomorrow's appointments. A `@nestjs/schedule` cron at 8am COT (UTC-5, configurable) precomputes the list. Admin UI shows cards with "Enviar" buttons. The module's public interface (`getReminders(date)`, `buildReminderMessage(appointment)`) is designed so Phase 3 (Meta Cloud API) can swap internals without changing callers.

**Tech Stack additions:** node `crypto` (built-in), `@nestjs/schedule`.

**Prerequisites:** Phases 1-5 executed and merged. `Appointment`, `Specialist`, `User`, `Consent`, `DataAccessLog` models exist (Consent + DataAccessLog were created in Phase 1's schema). `client-record` permissions (`client-record:read:own_assigned`, `client-record:write:own_assigned`) are seeded.

**Scope (does NOT include):** Meta WhatsApp Cloud API (explicitly Phase 3 / post-MVP — only the internal swap seam is prepared), automated customer-facing email/SMS, key rotation tooling beyond env-var swap, encrypted file/photo storage backend (we store encrypted URL strings; the upload pipeline is out of scope), DIAN, analytics (Phase 7).

---

## File Structure (changes from Phase 5)

```
apps/api/
├── prisma/
│   └── schema.prisma                                  # +ClientRecord, +policy version table; Consent/DataAccessLog already exist
└── src/
    ├── app.module.ts                                  # +ClientRecordModule, ConsentModule, NotificationsModule, ScheduleModule
    ├── common/
    │   └── crypto/
    │       ├── field-crypto.ts                        # AES-256-GCM helper (BUILT + TESTED FIRST)
    │       └── field-crypto.spec.ts
    └── modules/
        ├── client-record/
        │   ├── client-record.module.ts
        │   ├── client-record.controller.ts
        │   ├── client-record.service.ts
        │   ├── client-record.service.spec.ts
        │   ├── access-log.service.ts
        │   ├── access-log.service.spec.ts
        │   └── dto/
        │       └── upsert-client-record.dto.ts
        ├── consent/
        │   ├── consent.module.ts
        │   ├── consent.controller.ts
        │   ├── consent.service.ts
        │   ├── consent.service.spec.ts
        │   └── dto/
        │       ├── accept-consent.dto.ts
        │       └── publish-policy.dto.ts
        ├── account/
        │   ├── account.module.ts
        │   ├── account.controller.ts
        │   ├── account.service.ts
        │   └── account.service.spec.ts
        └── notifications/
            ├── notifications.module.ts
            ├── notifications.controller.ts
            ├── notifications.service.ts
            ├── notifications.service.spec.ts
            ├── reminders.cron.ts
            └── reminders.cron.spec.ts

apps/admin/src/features/
├── client-records/
│   ├── client-record-page.tsx                         # search customer → view/edit record
│   └── api.ts
└── notifications/
    ├── reminders-page.tsx                             # cards with "Enviar" buttons
    └── api.ts

apps/storefront/src/
├── app/mi-cuenta/
│   ├── privacidad/page.tsx                            # consent status + re-accept + delete account
│   └── ...
└── lib/consent/api.ts

packages/types/src/index.ts                            # +ClientRecordDTO, ConsentDTO, PolicyVersionDTO, ReminderDTO
```

---

## Task 1: AES-256-GCM field crypto helper (TDD — built first, per spec §13)

**Files:**
- Create: `apps/api/src/common/crypto/field-crypto.ts`
- Create: `apps/api/src/common/crypto/field-crypto.spec.ts`

- [ ] **Step 1: Write the failing test `field-crypto.spec.ts`**

```ts
import { FieldCrypto } from './field-crypto';

// 32-byte key as base64 (256-bit). Generated once for tests.
const TEST_KEY_B64 = Buffer.alloc(32, 7).toString('base64');

describe('FieldCrypto', () => {
  const crypto = new FieldCrypto(TEST_KEY_B64);

  it('round-trips a string', () => {
    const cipher = crypto.encrypt('alergia al látex');
    expect(cipher).not.toBe('alergia al látex');
    expect(crypto.decrypt(cipher)).toBe('alergia al látex');
  });

  it('produces a different ciphertext each call (random IV)', () => {
    const a = crypto.encrypt('same');
    const b = crypto.encrypt('same');
    expect(a).not.toBe(b);
    expect(crypto.decrypt(a)).toBe('same');
    expect(crypto.decrypt(b)).toBe('same');
  });

  it('ciphertext format is iv:tag:data (3 base64 parts)', () => {
    const cipher = crypto.encrypt('x');
    expect(cipher.split(':')).toHaveLength(3);
  });

  it('throws if the auth tag / ciphertext is tampered', () => {
    const cipher = crypto.encrypt('secret');
    const [iv, tag, data] = cipher.split(':');
    const tampered = `${iv}:${tag}:${Buffer.from('garbage').toString('base64')}`;
    expect(() => crypto.decrypt(tampered)).toThrow();
  });

  it('encryptNullable returns null for null/undefined', () => {
    expect(crypto.encryptNullable(null)).toBeNull();
    expect(crypto.encryptNullable(undefined)).toBeNull();
    expect(crypto.decryptNullable(null)).toBeNull();
  });

  it('encrypts/decrypts an array of strings', () => {
    const arr = ['https://a/1.jpg', 'https://a/2.jpg'];
    const enc = crypto.encryptArray(arr);
    expect(enc).toHaveLength(2);
    expect(enc[0]).not.toBe(arr[0]);
    expect(crypto.decryptArray(enc)).toEqual(arr);
  });

  it('rejects a key that is not 32 bytes', () => {
    expect(() => new FieldCrypto(Buffer.alloc(16, 1).toString('base64'))).toThrow(/32 bytes/);
  });

  it('handles unicode and long text', () => {
    const text = '🌿 condición médica: ' + 'x'.repeat(5000);
    expect(crypto.decrypt(crypto.encrypt(text))).toBe(text);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @bymariap/api test -- field-crypto.spec`. Expected: module not found.

- [ ] **Step 3: Implement `field-crypto.ts`**

```ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM

export class FieldCrypto {
  private readonly key: Buffer;

  constructor(keyBase64: string) {
    const key = Buffer.from(keyBase64, 'base64');
    if (key.length !== 32) {
      throw new Error('CLIENT_RECORD_ENCRYPTION_KEY must decode to 32 bytes (256-bit)');
    }
    this.key = key;
  }

  encrypt(plain: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
  }

  decrypt(payload: string): string {
    const [ivB64, tagB64, dataB64] = payload.split(':');
    if (!ivB64 || !tagB64 || !dataB64) throw new Error('Malformed ciphertext');
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }

  encryptNullable(plain: string | null | undefined): string | null {
    return plain == null ? null : this.encrypt(plain);
  }

  decryptNullable(payload: string | null | undefined): string | null {
    return payload == null ? null : this.decrypt(payload);
  }

  encryptArray(values: string[]): string[] {
    return values.map((v) => this.encrypt(v));
  }

  decryptArray(values: string[]): string[] {
    return values.map((v) => this.decrypt(v));
  }
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm --filter @bymariap/api test -- field-crypto.spec`. Expected: 8 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/common/crypto
git commit -m "feat(api): AES-256-GCM field crypto helper (tested first per habeas data risk)"
```

---

## Task 2: Provide FieldCrypto via DI + env

**Files:**
- Create: `apps/api/src/common/crypto/field-crypto.module.ts`
- Modify: `apps/api/.env.example`

- [ ] **Step 1: Write `field-crypto.module.ts`**

```ts
import { Global, Module } from '@nestjs/common';
import { FieldCrypto } from './field-crypto';

export const FIELD_CRYPTO = 'FIELD_CRYPTO';

@Global()
@Module({
  providers: [
    {
      provide: FIELD_CRYPTO,
      useFactory: () => {
        const key = process.env.CLIENT_RECORD_ENCRYPTION_KEY;
        if (!key) throw new Error('CLIENT_RECORD_ENCRYPTION_KEY is required');
        return new FieldCrypto(key);
      },
    },
  ],
  exports: [FIELD_CRYPTO],
})
export class FieldCryptoModule {}
```

- [ ] **Step 2: Register in `apps/api/src/app.module.ts`**

Add `FieldCryptoModule` to `imports`.

- [ ] **Step 3: Update `apps/api/.env.example`**

Append:
```
# 32-byte key, base64-encoded. Generate with:
#   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
CLIENT_RECORD_ENCRYPTION_KEY=
# Cron timezone for reminders (Colombia)
REMINDERS_TIMEZONE=America/Bogota
REMINDERS_CRON=0 8 * * *
# Business WhatsApp display number, for building wa.me links is the CUSTOMER's number;
# this is just the default country code prefix.
WHATSAPP_DEFAULT_COUNTRY_CODE=57
```

- [ ] **Step 4: Build + commit**

```bash
pnpm --filter @bymariap/api build
git add apps/api/src apps/api/.env.example
git commit -m "feat(api): provide FieldCrypto via global DI + env config"
```

---

## Task 3: Extend Prisma schema (ClientRecord + PolicyVersion)

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Add `ClientRecord` and `PolicyVersion` models**

Append after the existing `Appointment` model. (`Consent` and `DataAccessLog` already exist from Phase 1.)

```prisma
// ---------- Client record (encrypted) ----------

model ClientRecord {
  id                  String   @id @default(cuid())
  customerId          String   @unique
  customer            User     @relation(fields: [customerId], references: [id], onDelete: Cascade)
  allergiesEncrypted  String?
  conditionsEncrypted String?
  notesEncrypted      String?
  photosEncryptedUrls String[] @default([]) // each element is an encrypted URL string
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

// ---------- Habeas Data: versioned policy text ----------

model PolicyVersion {
  id         String   @id @default(cuid())
  version    String   @unique  // e.g. "1.0", "1.1"
  text       String              // full policy text snapshot
  publishedAt DateTime @default(now())
  isCurrent  Boolean  @default(false)
}
```

- [ ] **Step 2: Add the `clientRecord` back-relation to `User`**

Find the `model User` block and add the relation line alongside the others:

```prisma
  clientRecord  ClientRecord?
```

(Insert it next to `specialist Specialist?` — keep every other field intact.)

- [ ] **Step 3: Create migration**

Run:
```bash
pnpm --filter @bymariap/api prisma migrate dev --name client_record_and_policy
```

Expected: new migration directory; `ClientRecord` and `PolicyVersion` tables exist.

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma
git commit -m "feat(api): prisma models for encrypted client record + policy versions"
```

---

## Task 4: Shared types

**Files:**
- Modify: `packages/types/src/index.ts`

- [ ] **Step 1: Append**

```ts
export interface ClientRecordDTO {
  id: string;
  customerId: string;
  allergies: string | null;
  conditions: string | null;
  notes: string | null;
  photoUrls: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ConsentDTO {
  id: string;
  customerId: string;
  version: string;
  acceptedAt: string;
}

export interface PolicyVersionDTO {
  id: string;
  version: string;
  text: string;
  publishedAt: string;
  isCurrent: boolean;
}

export interface ConsentStatusDTO {
  currentVersion: string | null;
  acceptedVersion: string | null;
  needsAcceptance: boolean;
}

export interface ReminderDTO {
  appointmentId: string;
  customerName: string;
  phone: string;
  appointmentAt: string; // ISO UTC
  appointmentLocal: string; // "lunes 2 de junio, 09:00"
  serviceName: string;
  waMeLink: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/types
git commit -m "feat(types): client record, consent, policy, reminder DTOs"
```

---

## Task 5: AccessLogService (TDD — audit is mandatory)

**Files:**
- Create: `apps/api/src/modules/client-record/access-log.service.ts`
- Create: `apps/api/src/modules/client-record/access-log.service.spec.ts`

- [ ] **Step 1: Write failing test**

```ts
import { mock, mockReset } from 'jest-mock-extended';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessLogService } from './access-log.service';

const prisma = mock<PrismaService>();
const svc = new AccessLogService(prisma);

describe('AccessLogService', () => {
  beforeEach(() => mockReset(prisma));

  it('records an access event', async () => {
    (prisma.dataAccessLog as any).create.mockResolvedValueOnce({});
    await svc.record({ accessorUserId: 'u1', accessedRecordId: 'r1', action: 'read' });
    expect(prisma.dataAccessLog.create).toHaveBeenCalledWith({
      data: { accessorUserId: 'u1', accessedRecordId: 'r1', action: 'read' },
    });
  });

  it('lists logs for a record newest-first', async () => {
    (prisma.dataAccessLog as any).findMany.mockResolvedValueOnce([]);
    await svc.listForRecord('r1');
    const call = (prisma.dataAccessLog.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({ accessedRecordId: 'r1' });
    expect(call.orderBy).toEqual({ accessedAt: 'desc' });
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @bymariap/api test -- access-log.service.spec`.

- [ ] **Step 3: Implement `access-log.service.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type AccessAction = 'read' | 'update' | 'delete' | 'export';

@Injectable()
export class AccessLogService {
  constructor(private prisma: PrismaService) {}

  async record(input: { accessorUserId: string; accessedRecordId: string; action: AccessAction }) {
    await this.prisma.dataAccessLog.create({ data: input });
  }

  listForRecord(recordId: string) {
    return this.prisma.dataAccessLog.findMany({
      where: { accessedRecordId: recordId },
      orderBy: { accessedAt: 'desc' },
    });
  }
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm --filter @bymariap/api test -- access-log.service.spec`. Expected: 2 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/client-record/access-log.service.ts apps/api/src/modules/client-record/access-log.service.spec.ts
git commit -m "feat(api): AccessLogService for habeas data audit trail"
```

---

## Task 6: ClientRecordService — encryption + scoping + audit (TDD)

**Files:**
- Create: `apps/api/src/modules/client-record/client-record.service.ts`
- Create: `apps/api/src/modules/client-record/client-record.service.spec.ts`
- Create: `apps/api/src/modules/client-record/dto/upsert-client-record.dto.ts`

- [ ] **Step 1: Write DTO**

`upsert-client-record.dto.ts`:
```ts
import { ArrayMaxSize, IsArray, IsOptional, IsString, IsUrl, Length } from 'class-validator';

export class UpsertClientRecordDto {
  @IsOptional() @IsString() @Length(0, 2000) allergies?: string;
  @IsOptional() @IsString() @Length(0, 2000) conditions?: string;
  @IsOptional() @IsString() @Length(0, 5000) notes?: string;
  @IsOptional() @IsArray() @IsUrl({}, { each: true }) @ArrayMaxSize(20) photoUrls?: string[];
}
```

- [ ] **Step 2: Write failing test `client-record.service.spec.ts`**

```ts
import { mock, mockReset } from 'jest-mock-extended';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessLogService } from './access-log.service';
import { FieldCrypto } from '../../common/crypto/field-crypto';
import { ClientRecordService } from './client-record.service';
import type { AuthUser } from '../../common/types/auth-user';

const prisma = mock<PrismaService>();
const accessLog = mock<AccessLogService>();
const crypto = new FieldCrypto(Buffer.alloc(32, 7).toString('base64'));
const svc = new ClientRecordService(prisma, accessLog, crypto);

const admin: AuthUser = { id: 'admin1', email: 'a', role: 'admin', permissions: ['*'] };
const specialist: AuthUser = {
  id: 'spec-user', email: 's', role: 'specialist', specialistId: 'spec1',
  permissions: ['client-record:read:own_assigned', 'client-record:write:own_assigned'],
};
const otherSpecialist: AuthUser = {
  id: 'spec-user-2', email: 's2', role: 'specialist', specialistId: 'spec2',
  permissions: ['client-record:read:own_assigned'],
};

describe('ClientRecordService.get', () => {
  beforeEach(() => { mockReset(prisma); mockReset(accessLog); });

  it('admin reads any record + decrypts + logs the read', async () => {
    (prisma.clientRecord as any).findUnique.mockResolvedValueOnce({
      id: 'r1', customerId: 'cust1',
      allergiesEncrypted: crypto.encrypt('látex'),
      conditionsEncrypted: null, notesEncrypted: crypto.encrypt('nota'),
      photosEncryptedUrls: [crypto.encrypt('https://x/1.jpg')],
      createdAt: new Date(), updatedAt: new Date(),
    });
    const out = await svc.getByCustomer('cust1', admin);
    expect(out.allergies).toBe('látex');
    expect(out.notes).toBe('nota');
    expect(out.photoUrls).toEqual(['https://x/1.jpg']);
    expect(accessLog.record).toHaveBeenCalledWith({
      accessorUserId: 'admin1', accessedRecordId: 'r1', action: 'read',
    });
  });

  it('assigned specialist can read', async () => {
    (prisma.appointment as any).count.mockResolvedValueOnce(1); // has an appointment with this customer
    (prisma.clientRecord as any).findUnique.mockResolvedValueOnce({
      id: 'r1', customerId: 'cust1', allergiesEncrypted: null, conditionsEncrypted: null,
      notesEncrypted: null, photosEncryptedUrls: [], createdAt: new Date(), updatedAt: new Date(),
    });
    const out = await svc.getByCustomer('cust1', specialist);
    expect(out.customerId).toBe('cust1');
    expect(accessLog.record).toHaveBeenCalled();
  });

  it('non-assigned specialist is forbidden + no log', async () => {
    (prisma.appointment as any).count.mockResolvedValueOnce(0);
    await expect(svc.getByCustomer('cust1', otherSpecialist)).rejects.toBeInstanceOf(ForbiddenException);
    expect(accessLog.record).not.toHaveBeenCalled();
  });

  it('throws 404 when record missing (after authorization)', async () => {
    (prisma.clientRecord as any).findUnique.mockResolvedValueOnce(null);
    await expect(svc.getByCustomer('cust1', admin)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ClientRecordService.upsert', () => {
  beforeEach(() => { mockReset(prisma); mockReset(accessLog); });

  it('encrypts fields before persisting + logs update', async () => {
    (prisma.clientRecord as any).upsert.mockResolvedValueOnce({
      id: 'r1', customerId: 'cust1',
      allergiesEncrypted: crypto.encrypt('x'), conditionsEncrypted: null,
      notesEncrypted: null, photosEncryptedUrls: [], createdAt: new Date(), updatedAt: new Date(),
    });
    await svc.upsert('cust1', { allergies: 'maní' }, admin);

    const call = (prisma.clientRecord.upsert as jest.Mock).mock.calls[0][0];
    // ciphertext, not plaintext
    expect(call.create.allergiesEncrypted).not.toBe('maní');
    expect(crypto.decrypt(call.create.allergiesEncrypted)).toBe('maní');
    expect(accessLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'update', accessorUserId: 'admin1' }),
    );
  });
});
```

- [ ] **Step 3: Run — expect FAIL**

Run: `pnpm --filter @bymariap/api test -- client-record.service.spec`.

- [ ] **Step 4: Implement `client-record.service.ts`**

```ts
import {
  ForbiddenException, Inject, Injectable, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessLogService } from './access-log.service';
import { FieldCrypto } from '../../common/crypto/field-crypto';
import { FIELD_CRYPTO } from '../../common/crypto/field-crypto.module';
import { UpsertClientRecordDto } from './dto/upsert-client-record.dto';
import type { AuthUser } from '../../common/types/auth-user';

@Injectable()
export class ClientRecordService {
  constructor(
    private prisma: PrismaService,
    private accessLog: AccessLogService,
    @Inject(FIELD_CRYPTO) private crypto: FieldCrypto,
  ) {}

  private async assertCanAccess(customerId: string, actor: AuthUser): Promise<void> {
    const wide = actor.permissions.includes('*')
      || actor.permissions.includes('client-record:read')
      || actor.permissions.includes('client-record:write');
    if (wide) return;

    const scopedRead = actor.permissions.includes('client-record:read:own_assigned')
      || actor.permissions.includes('client-record:write:own_assigned');
    if (scopedRead && actor.role === 'specialist' && actor.specialistId) {
      const count = await this.prisma.appointment.count({
        where: { specialistId: actor.specialistId, customerId },
      });
      if (count > 0) return;
    }
    throw new ForbiddenException();
  }

  async getByCustomer(customerId: string, actor: AuthUser) {
    await this.assertCanAccess(customerId, actor);
    const row = await this.prisma.clientRecord.findUnique({ where: { customerId } });
    if (!row) throw new NotFoundException();
    await this.accessLog.record({
      accessorUserId: actor.id, accessedRecordId: row.id, action: 'read',
    });
    return this.shape(row);
  }

  async upsert(customerId: string, dto: UpsertClientRecordDto, actor: AuthUser) {
    await this.assertCanAccess(customerId, actor);

    const data = {
      allergiesEncrypted: this.crypto.encryptNullable(dto.allergies),
      conditionsEncrypted: this.crypto.encryptNullable(dto.conditions),
      notesEncrypted: this.crypto.encryptNullable(dto.notes),
      photosEncryptedUrls: dto.photoUrls ? this.crypto.encryptArray(dto.photoUrls) : [],
    };

    const row = await this.prisma.clientRecord.upsert({
      where: { customerId },
      create: { customerId, ...data },
      update: data,
    });

    await this.accessLog.record({
      accessorUserId: actor.id, accessedRecordId: row.id, action: 'update',
    });
    return this.shape(row);
  }

  async listAccessLog(customerId: string, actor: AuthUser) {
    await this.assertCanAccess(customerId, actor);
    const row = await this.prisma.clientRecord.findUnique({ where: { customerId } });
    if (!row) throw new NotFoundException();
    return this.accessLog.listForRecord(row.id);
  }

  private shape(row: any) {
    return {
      id: row.id,
      customerId: row.customerId,
      allergies: this.crypto.decryptNullable(row.allergiesEncrypted),
      conditions: this.crypto.decryptNullable(row.conditionsEncrypted),
      notes: this.crypto.decryptNullable(row.notesEncrypted),
      photoUrls: this.crypto.decryptArray(row.photosEncryptedUrls ?? []),
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    };
  }
}
```

- [ ] **Step 5: Run — expect PASS**

Run: `pnpm --filter @bymariap/api test -- client-record.service.spec`. Expected: 6 passing.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/client-record
git commit -m "feat(api): ClientRecordService — encrypted fields, own_assigned scoping, audit"
```

---

## Task 7: ClientRecordController + module

**Files:**
- Create: `apps/api/src/modules/client-record/client-record.controller.ts`
- Create: `apps/api/src/modules/client-record/client-record.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Write controller**

```ts
import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import type { AuthUser } from '../../common/types/auth-user';
import { ClientRecordService } from './client-record.service';
import { UpsertClientRecordDto } from './dto/upsert-client-record.dto';

@Controller('admin/client-records')
export class ClientRecordController {
  constructor(private svc: ClientRecordService) {}

  @Get(':customerId')
  @RequirePermissions('client-record:read:own_assigned')
  get(@Param('customerId') customerId: string, @CurrentUser() user: AuthUser) {
    return this.svc.getByCustomer(customerId, user);
  }

  @Put(':customerId')
  @RequirePermissions('client-record:write:own_assigned')
  upsert(@Param('customerId') customerId: string, @Body() dto: UpsertClientRecordDto, @CurrentUser() user: AuthUser) {
    return this.svc.upsert(customerId, dto, user);
  }

  @Get(':customerId/access-log')
  @RequirePermissions('client-record:read:own_assigned')
  accessLog(@Param('customerId') customerId: string, @CurrentUser() user: AuthUser) {
    return this.svc.listAccessLog(customerId, user);
  }
}
```

> Note: `@RequirePermissions('client-record:read:own_assigned')` passes for admin via the wildcard `*`, and for the assigned specialist via the scope-coverage rule (`client-record:read` covers `:own_assigned`). The service's `assertCanAccess` enforces the actual row-level scope — the guard only gates the action verb.

- [ ] **Step 2: Write `client-record.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { ClientRecordController } from './client-record.controller';
import { ClientRecordService } from './client-record.service';
import { AccessLogService } from './access-log.service';

@Module({
  controllers: [ClientRecordController],
  providers: [ClientRecordService, AccessLogService],
  exports: [ClientRecordService, AccessLogService],
})
export class ClientRecordModule {}
```

- [ ] **Step 3: Register in `apps/api/src/app.module.ts`**

Add `ClientRecordModule` to `imports`.

- [ ] **Step 4: Build + commit**

```bash
pnpm --filter @bymariap/api build
git add apps/api/src
git commit -m "feat(api): client-record controller + module"
```

---

## Task 8: ConsentService — versioned policy + acceptance (TDD)

**Files:**
- Create: `apps/api/src/modules/consent/consent.service.ts`
- Create: `apps/api/src/modules/consent/consent.service.spec.ts`
- Create: `apps/api/src/modules/consent/dto/accept-consent.dto.ts`
- Create: `apps/api/src/modules/consent/dto/publish-policy.dto.ts`

- [ ] **Step 1: Write DTOs**

`accept-consent.dto.ts`:
```ts
import { IsString } from 'class-validator';

export class AcceptConsentDto {
  @IsString() version!: string;
}
```

`publish-policy.dto.ts`:
```ts
import { IsString, Length, Matches } from 'class-validator';

export class PublishPolicyDto {
  @IsString() @Matches(/^\d+\.\d+$/, { message: 'version must be like "1.0"' }) version!: string;
  @IsString() @Length(20, 100000) text!: string;
}
```

- [ ] **Step 2: Write failing test**

```ts
import { mock, mockReset } from 'jest-mock-extended';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConsentService } from './consent.service';

const prisma = mock<PrismaService>();
const svc = new ConsentService(prisma);

describe('ConsentService.publishPolicy', () => {
  beforeEach(() => mockReset(prisma));

  it('creates a version and marks it current, unsetting the previous current', async () => {
    (prisma.$transaction as any).mockImplementationOnce(async (fn: any) => fn({
      policyVersion: {
        updateMany: jest.fn().mockResolvedValueOnce({}),
        create: jest.fn().mockResolvedValueOnce({
          id: 'p2', version: '1.1', text: 'nuevo', publishedAt: new Date(), isCurrent: true,
        }),
      },
    }));
    const out = await svc.publishPolicy({ version: '1.1', text: 'nuevo texto de política' });
    expect(out.isCurrent).toBe(true);
  });
});

describe('ConsentService.getStatus', () => {
  beforeEach(() => mockReset(prisma));

  it('needsAcceptance=true when accepted version differs from current', async () => {
    (prisma.policyVersion as any).findFirst.mockResolvedValueOnce({ version: '1.1' });
    (prisma.consent as any).findFirst.mockResolvedValueOnce({ version: '1.0' });
    const out = await svc.getStatus('cust1');
    expect(out).toEqual({ currentVersion: '1.1', acceptedVersion: '1.0', needsAcceptance: true });
  });

  it('needsAcceptance=false when versions match', async () => {
    (prisma.policyVersion as any).findFirst.mockResolvedValueOnce({ version: '1.1' });
    (prisma.consent as any).findFirst.mockResolvedValueOnce({ version: '1.1' });
    const out = await svc.getStatus('cust1');
    expect(out.needsAcceptance).toBe(false);
  });

  it('needsAcceptance=true when customer never accepted', async () => {
    (prisma.policyVersion as any).findFirst.mockResolvedValueOnce({ version: '1.0' });
    (prisma.consent as any).findFirst.mockResolvedValueOnce(null);
    const out = await svc.getStatus('cust1');
    expect(out).toEqual({ currentVersion: '1.0', acceptedVersion: null, needsAcceptance: true });
  });
});

describe('ConsentService.accept', () => {
  beforeEach(() => mockReset(prisma));

  it('records consent with the current policy text snapshot + ip', async () => {
    (prisma.policyVersion as any).findFirst.mockResolvedValueOnce({
      version: '1.1', text: 'texto vigente',
    });
    (prisma.consent as any).create.mockResolvedValueOnce({
      id: 'c1', customerId: 'cust1', version: '1.1', acceptedAt: new Date(),
    });
    await svc.accept('cust1', '1.1', '1.2.3.4');
    const call = (prisma.consent.create as jest.Mock).mock.calls[0][0];
    expect(call.data.policyTextSnapshot).toBe('texto vigente');
    expect(call.data.ip).toBe('1.2.3.4');
  });

  it('rejects accepting a non-current version', async () => {
    (prisma.policyVersion as any).findFirst.mockResolvedValueOnce({ version: '1.1', text: 't' });
    await expect(svc.accept('cust1', '1.0', '1.2.3.4')).rejects.toBeInstanceOf(BadRequestException);
  });
});
```

- [ ] **Step 3: Run — expect FAIL**

Run: `pnpm --filter @bymariap/api test -- consent.service.spec`.

- [ ] **Step 4: Implement `consent.service.ts`**

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PublishPolicyDto } from './dto/publish-policy.dto';

@Injectable()
export class ConsentService {
  constructor(private prisma: PrismaService) {}

  async publishPolicy(dto: PublishPolicyDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.policyVersion.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } });
      return tx.policyVersion.create({
        data: { version: dto.version, text: dto.text, isCurrent: true },
      });
    });
  }

  async getCurrentPolicy() {
    const p = await this.prisma.policyVersion.findFirst({ where: { isCurrent: true } });
    if (!p) throw new NotFoundException('No policy published');
    return p;
  }

  async getStatus(customerId: string) {
    const current = await this.prisma.policyVersion.findFirst({ where: { isCurrent: true } });
    const accepted = await this.prisma.consent.findFirst({
      where: { customerId },
      orderBy: { acceptedAt: 'desc' },
    });
    const currentVersion = current?.version ?? null;
    const acceptedVersion = accepted?.version ?? null;
    return {
      currentVersion,
      acceptedVersion,
      needsAcceptance: Boolean(currentVersion) && currentVersion !== acceptedVersion,
    };
  }

  async accept(customerId: string, version: string, ip: string) {
    const current = await this.prisma.policyVersion.findFirst({ where: { isCurrent: true } });
    if (!current) throw new NotFoundException('No policy published');
    if (current.version !== version) {
      throw new BadRequestException('Can only accept the current policy version');
    }
    return this.prisma.consent.create({
      data: {
        customerId,
        version,
        ip,
        policyTextSnapshot: current.text,
      },
    });
  }
}
```

- [ ] **Step 5: Run — expect PASS**

Run: `pnpm --filter @bymariap/api test -- consent.service.spec`. Expected: 6 passing.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/consent
git commit -m "feat(api): ConsentService — versioned policy + acceptance with snapshot"
```

---

## Task 9: ConsentController + module

**Files:**
- Create: `apps/api/src/modules/consent/consent.controller.ts`
- Create: `apps/api/src/modules/consent/consent.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Write controller**

```ts
import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import type { AuthUser } from '../../common/types/auth-user';
import { ConsentService } from './consent.service';
import { AcceptConsentDto } from './dto/accept-consent.dto';
import { PublishPolicyDto } from './dto/publish-policy.dto';

@Controller()
export class ConsentController {
  constructor(private svc: ConsentService) {}

  @Public()
  @Get('store/policy/current')
  current() { return this.svc.getCurrentPolicy(); }

  @Get('me/consent/status')
  status(@CurrentUser() user: AuthUser) { return this.svc.getStatus(user.id); }

  @Post('me/consent/accept')
  accept(@CurrentUser() user: AuthUser, @Body() dto: AcceptConsentDto, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || 'unknown';
    return this.svc.accept(user.id, dto.version, ip);
  }

  @Post('admin/policy')
  @RequirePermissions('rbac:write')
  publish(@Body() dto: PublishPolicyDto) { return this.svc.publishPolicy(dto); }
}
```

> Admin policy publishing is gated by `rbac:write` (admin-only in the seed). If you prefer a dedicated permission, add `policy:write` to the seed and use it here — but `rbac:write` keeps the permission set lean for MVP.

- [ ] **Step 2: Write `consent.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { ConsentController } from './consent.controller';
import { ConsentService } from './consent.service';

@Module({
  controllers: [ConsentController],
  providers: [ConsentService],
  exports: [ConsentService],
})
export class ConsentModule {}
```

- [ ] **Step 3: Register in `apps/api/src/app.module.ts`**

Add `ConsentModule` to `imports`.

- [ ] **Step 4: Build + commit**

```bash
pnpm --filter @bymariap/api build
git add apps/api/src
git commit -m "feat(api): consent controller (public policy + me accept + admin publish)"
```

---

## Task 10: AccountService — right to be forgotten (TDD)

**Files:**
- Create: `apps/api/src/modules/account/account.service.ts`
- Create: `apps/api/src/modules/account/account.service.spec.ts`

- [ ] **Step 1: Write failing test**

```ts
import { mock, mockReset } from 'jest-mock-extended';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountService } from './account.service';

const prisma = mock<PrismaService>();
const svc = new AccountService(prisma);

describe('AccountService.deleteAccount', () => {
  beforeEach(() => mockReset(prisma));

  it('runs deletion inside a transaction: anonymizes orders, nulls appointment customer, deletes the user', async () => {
    const tx = {
      order: { updateMany: jest.fn().mockResolvedValue({}) },
      appointment: { updateMany: jest.fn().mockResolvedValue({}) },
      clientRecord: { deleteMany: jest.fn().mockResolvedValue({}) },
      consent: { deleteMany: jest.fn().mockResolvedValue({}) },
      cart: { deleteMany: jest.fn().mockResolvedValue({}) },
      refreshToken: { deleteMany: jest.fn().mockResolvedValue({}) },
      user: { delete: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as any).mockImplementationOnce(async (fn: any) => fn(tx));

    await svc.deleteAccount('cust1');

    // Orders kept but de-linked from the customer (anonymized aggregate retained)
    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { customerId: 'cust1' },
      data: { customerId: null, guestEmail: null, guestPhone: null },
    });
    // Appointments de-linked
    expect(tx.appointment.updateMany).toHaveBeenCalledWith({
      where: { customerId: 'cust1' },
      data: { customerId: null, guestEmail: null, guestPhone: null, guestFullName: null },
    });
    // Personal data deleted
    expect(tx.clientRecord.deleteMany).toHaveBeenCalledWith({ where: { customerId: 'cust1' } });
    expect(tx.consent.deleteMany).toHaveBeenCalledWith({ where: { customerId: 'cust1' } });
    expect(tx.cart.deleteMany).toHaveBeenCalledWith({ where: { customerId: 'cust1' } });
    expect(tx.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'cust1' } });
    // User row removed
    expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: 'cust1' } });
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @bymariap/api test -- account.service.spec`.

- [ ] **Step 3: Implement `account.service.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AccountService {
  constructor(private prisma: PrismaService) {}

  /**
   * Habeas Data right-to-be-forgotten. Real deletion of personal data.
   * Orders are retained but de-linked so anonymized sales aggregates survive
   * (analytics keeps totals without any customer association).
   */
  async deleteAccount(userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.order.updateMany({
        where: { customerId: userId },
        data: { customerId: null, guestEmail: null, guestPhone: null },
      });
      await tx.appointment.updateMany({
        where: { customerId: userId },
        data: { customerId: null, guestEmail: null, guestPhone: null, guestFullName: null },
      });
      await tx.clientRecord.deleteMany({ where: { customerId: userId } });
      await tx.consent.deleteMany({ where: { customerId: userId } });
      await tx.cart.deleteMany({ where: { customerId: userId } });
      await tx.refreshToken.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });
  }
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm --filter @bymariap/api test -- account.service.spec`. Expected: 1 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/account
git commit -m "feat(api): AccountService right-to-be-forgotten (real delete + anonymized orders)"
```

---

## Task 11: AccountController + module

**Files:**
- Create: `apps/api/src/modules/account/account.controller.ts`
- Create: `apps/api/src/modules/account/account.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Write controller**

```ts
import { Controller, Delete, Res } from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';
import { AccountService } from './account.service';

@Controller('me/account')
export class AccountController {
  constructor(private svc: AccountService) {}

  @Delete()
  async delete(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    await this.svc.deleteAccount(user.id);
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    return { ok: true };
  }
}
```

- [ ] **Step 2: Write `account.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';

@Module({ controllers: [AccountController], providers: [AccountService] })
export class AccountModule {}
```

- [ ] **Step 3: Register in `apps/api/src/app.module.ts`**

Add `AccountModule` to `imports`.

- [ ] **Step 4: Build + commit**

```bash
pnpm --filter @bymariap/api build
git add apps/api/src
git commit -m "feat(api): account controller — DELETE /me/account clears cookies"
```

---

## Task 12: NotificationsService — reminder list + wa.me links (TDD)

**Files:**
- Create: `apps/api/src/modules/notifications/notifications.service.ts`
- Create: `apps/api/src/modules/notifications/notifications.service.spec.ts`

- [ ] **Step 1: Write failing test**

```ts
import { mock, mockReset } from 'jest-mock-extended';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

const prisma = mock<PrismaService>();
const svc = new NotificationsService(prisma);

describe('NotificationsService', () => {
  beforeEach(() => { mockReset(prisma); process.env.WHATSAPP_DEFAULT_COUNTRY_CODE = '57'; });

  it('builds reminders for scheduled appointments on the given local date', async () => {
    // Appointment at 2026-06-02 09:00 Bogota = 14:00 UTC
    (prisma.appointment as any).findMany.mockResolvedValueOnce([
      {
        id: 'ap1', scheduledAt: new Date('2026-06-02T14:00:00.000Z'),
        durationMinutes: 45, status: 'scheduled',
        customer: { fullName: 'Ana Pérez', phone: '3001112222' },
        guestFullName: null, guestPhone: null,
        service: { name: 'Diseño de Cejas' },
      },
    ]);

    const reminders = await svc.getReminders('2026-06-02');
    expect(reminders).toHaveLength(1);
    expect(reminders[0].customerName).toBe('Ana Pérez');
    expect(reminders[0].phone).toBe('3001112222');
    expect(reminders[0].serviceName).toBe('Diseño de Cejas');
    // wa.me link: country code + number, message url-encoded
    expect(reminders[0].waMeLink).toMatch(/^https:\/\/wa\.me\/573001112222\?text=/);
  });

  it('uses guest fields when there is no linked customer', async () => {
    (prisma.appointment as any).findMany.mockResolvedValueOnce([
      {
        id: 'ap2', scheduledAt: new Date('2026-06-02T15:00:00.000Z'),
        durationMinutes: 45, status: 'scheduled',
        customer: null, guestFullName: 'Invitado X', guestPhone: '3019998888',
        service: { name: 'Diseño de Cejas' },
      },
    ]);
    const reminders = await svc.getReminders('2026-06-02');
    expect(reminders[0].customerName).toBe('Invitado X');
    expect(reminders[0].waMeLink).toContain('wa.me/573019998888');
  });

  it('strips non-digits and an existing country code from the phone', async () => {
    (prisma.appointment as any).findMany.mockResolvedValueOnce([
      {
        id: 'ap3', scheduledAt: new Date('2026-06-02T15:00:00.000Z'), durationMinutes: 45,
        status: 'scheduled', customer: { fullName: 'B', phone: '+57 300 111 2222' },
        guestFullName: null, guestPhone: null, service: { name: 'X' },
      },
    ]);
    const reminders = await svc.getReminders('2026-06-02');
    expect(reminders[0].waMeLink).toContain('wa.me/573001112222');
  });

  it('queries only scheduled appointments within the local-day UTC bounds', async () => {
    (prisma.appointment as any).findMany.mockResolvedValueOnce([]);
    await svc.getReminders('2026-06-02');
    const call = (prisma.appointment.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.status).toBe('scheduled');
    // local day 2026-06-02 Bogota → [2026-06-02T05:00Z, 2026-06-03T05:00Z)
    expect(call.where.scheduledAt.gte.toISOString()).toBe('2026-06-02T05:00:00.000Z');
    expect(call.where.scheduledAt.lt.toISOString()).toBe('2026-06-03T05:00:00.000Z');
  });

  it('buildReminderMessage includes name, service and local time', () => {
    const msg = svc.buildReminderMessage({
      customerName: 'Ana', serviceName: 'Cejas', appointmentLocal: 'lunes 2 de junio, 09:00',
    });
    expect(msg).toContain('Ana');
    expect(msg).toContain('Cejas');
    expect(msg).toContain('lunes 2 de junio, 09:00');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @bymariap/api test -- notifications.service.spec`.

- [ ] **Step 3: Implement `notifications.service.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { PrismaService } from '../../prisma/prisma.service';

const BOGOTA = 'America/Bogota';

export interface ReminderMessageInput {
  customerName: string;
  serviceName: string;
  appointmentLocal: string;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Public interface kept stable so Phase 3 (Meta Cloud API) can swap internals:
   *   getReminders(date) — list for a local date
   *   buildReminderMessage(input) — message text
   * A future sendReminder(appointmentId) will reuse buildReminderMessage and call the API
   * instead of returning a wa.me link.
   */
  async getReminders(localDate: string) {
    const dayStartUtc = fromZonedTime(`${localDate}T00:00:00`, BOGOTA);
    const dayEndUtc = new Date(dayStartUtc.getTime() + 24 * 60 * 60 * 1000);

    const appts = await this.prisma.appointment.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: { gte: dayStartUtc, lt: dayEndUtc },
      },
      include: {
        customer: { select: { fullName: true, phone: true } },
        service: { select: { name: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return appts.map((a) => {
      const customerName = a.customer?.fullName ?? a.guestFullName ?? 'Cliente';
      const rawPhone = a.customer?.phone ?? a.guestPhone ?? '';
      const appointmentLocal = formatInTimeZone(a.scheduledAt, BOGOTA, "EEEE d 'de' MMMM, HH:mm");
      const serviceName = a.service?.name ?? '';
      const message = this.buildReminderMessage({ customerName, serviceName, appointmentLocal });
      return {
        appointmentId: a.id,
        customerName,
        phone: rawPhone,
        appointmentAt: a.scheduledAt.toISOString(),
        appointmentLocal,
        serviceName,
        waMeLink: this.buildWaMeLink(rawPhone, message),
      };
    });
  }

  buildReminderMessage(input: ReminderMessageInput): string {
    return `Hola ${input.customerName}, te recordamos tu cita de ${input.serviceName} el ${input.appointmentLocal}. ¡Te esperamos! Responde para confirmar o reagendar.`;
  }

  private buildWaMeLink(rawPhone: string, message: string): string {
    const cc = process.env.WHATSAPP_DEFAULT_COUNTRY_CODE ?? '57';
    let digits = rawPhone.replace(/\D/g, '');
    if (digits.startsWith(cc)) digits = digits.slice(cc.length);
    const full = `${cc}${digits}`;
    return `https://wa.me/${full}?text=${encodeURIComponent(message)}`;
  }
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm --filter @bymariap/api test -- notifications.service.spec`. Expected: 6 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/notifications
git commit -m "feat(api): NotificationsService — reminder list + wa.me link builder (swap-ready)"
```

---

## Task 13: Reminders cron (TDD)

**Files:**
- Create: `apps/api/src/modules/notifications/reminders.cron.ts`
- Create: `apps/api/src/modules/notifications/reminders.cron.spec.ts`

- [ ] **Step 1: Install `@nestjs/schedule`**

Run: `pnpm --filter @bymariap/api add @nestjs/schedule`.

- [ ] **Step 2: Write failing test `reminders.cron.spec.ts`**

```ts
import { mock, mockReset } from 'jest-mock-extended';
import { NotificationsService } from './notifications.service';
import { RemindersCron } from './reminders.cron';

const notifications = mock<NotificationsService>();
const cron = new RemindersCron(notifications);

describe('RemindersCron', () => {
  beforeEach(() => mockReset(notifications));

  it('computes tomorrow in Bogota and caches the reminders', async () => {
    notifications.getReminders.mockResolvedValueOnce([
      { appointmentId: 'a1' } as any,
    ]);
    await cron.handleDailyReminders();
    expect(notifications.getReminders).toHaveBeenCalledTimes(1);
    // date passed must be YYYY-MM-DD
    const dateArg = (notifications.getReminders as jest.Mock).mock.calls[0][0];
    expect(dateArg).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(cron.getCached()).toHaveLength(1);
  });

  it('tomorrowInBogota returns a valid YYYY-MM-DD one day after the given instant', () => {
    // 2026-06-01 23:00 UTC = 2026-06-01 18:00 Bogota → tomorrow = 2026-06-02
    const d = cron.tomorrowInBogota(new Date('2026-06-01T23:00:00.000Z'));
    expect(d).toBe('2026-06-02');
  });

  it('handles the day-boundary: 2026-06-01 04:00 UTC = 2026-05-31 23:00 Bogota → tomorrow = 2026-06-01', () => {
    const d = cron.tomorrowInBogota(new Date('2026-06-01T04:00:00.000Z'));
    expect(d).toBe('2026-06-01');
  });
});
```

- [ ] **Step 3: Run — expect FAIL**

Run: `pnpm --filter @bymariap/api test -- reminders.cron.spec`.

- [ ] **Step 4: Implement `reminders.cron.ts`**

```ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { formatInTimeZone } from 'date-fns-tz';
import { NotificationsService, } from './notifications.service';

const BOGOTA = 'America/Bogota';

@Injectable()
export class RemindersCron {
  private readonly logger = new Logger(RemindersCron.name);
  private cached: Awaited<ReturnType<NotificationsService['getReminders']>> = [];

  constructor(private notifications: NotificationsService) {}

  // 8:00 every day; timezone honored via the Cron options below.
  @Cron(process.env.REMINDERS_CRON ?? '0 8 * * *', {
    name: 'daily-reminders',
    timeZone: process.env.REMINDERS_TIMEZONE ?? BOGOTA,
  })
  async handleDailyReminders(): Promise<void> {
    const date = this.tomorrowInBogota(new Date());
    this.cached = await this.notifications.getReminders(date);
    this.logger.log(`Precomputed ${this.cached.length} reminder(s) for ${date}`);
  }

  tomorrowInBogota(now: Date): string {
    const todayLocal = formatInTimeZone(now, BOGOTA, 'yyyy-MM-dd');
    const [y, m, d] = todayLocal.split('-').map(Number);
    // Construct next local day using UTC date math on the local Y-M-D (no tz drift since we only move the date).
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
  }

  getCached() {
    return this.cached;
  }
}

function pad(n: number): string { return String(n).padStart(2, '0'); }
```

- [ ] **Step 5: Run — expect PASS**

Run: `pnpm --filter @bymariap/api test -- reminders.cron.spec`. Expected: 3 passing.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/notifications pnpm-lock.yaml apps/api/package.json
git commit -m "feat(api): daily 8am COT reminders cron with cached precompute"
```

---

## Task 14: NotificationsController + module + ScheduleModule

**Files:**
- Create: `apps/api/src/modules/notifications/notifications.controller.ts`
- Create: `apps/api/src/modules/notifications/notifications.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Write controller**

```ts
import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { NotificationsService } from './notifications.service';
import { RemindersCron } from './reminders.cron';
import { formatInTimeZone } from 'date-fns-tz';

const BOGOTA = 'America/Bogota';

@Controller('admin/notifications')
export class NotificationsController {
  constructor(
    private svc: NotificationsService,
    private cron: RemindersCron,
  ) {}

  // date=tomorrow | YYYY-MM-DD ; per spec the admin UI asks for tomorrow's list
  @Get('whatsapp-reminders')
  @RequirePermissions('appointments:read')
  reminders(@Query('date') date?: string) {
    if (!date || date === 'tomorrow') {
      // Prefer the precomputed cache if present; else compute on the fly.
      const cached = this.cron.getCached();
      if (cached.length > 0) return cached;
      return this.svc.getReminders(this.cron.tomorrowInBogota(new Date()));
    }
    if (date === 'today') {
      return this.svc.getReminders(formatInTimeZone(new Date(), BOGOTA, 'yyyy-MM-dd'));
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('date must be "tomorrow", "today" or YYYY-MM-DD');
    }
    return this.svc.getReminders(date);
  }
}
```

- [ ] **Step 2: Write `notifications.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { RemindersCron } from './reminders.cron';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, RemindersCron],
  exports: [NotificationsService],
})
export class NotificationsModule {}
```

- [ ] **Step 3: Register `ScheduleModule` + `NotificationsModule` in `apps/api/src/app.module.ts`**

Add the import and module:
```ts
import { ScheduleModule } from '@nestjs/schedule';
// in imports array:
ScheduleModule.forRoot(),
NotificationsModule,
```

- [ ] **Step 4: Build + commit**

```bash
pnpm --filter @bymariap/api build
git add apps/api/src
git commit -m "feat(api): notifications controller + ScheduleModule wiring"
```

---

## Task 15: Seed initial policy version

**Files:**
- Modify: `apps/api/prisma/seed.ts`

- [ ] **Step 1: Append**

Before `console.log('seed: ok')`:

```ts
const policyCount = await prisma.policyVersion.count();
if (policyCount === 0) {
  await prisma.policyVersion.create({
    data: {
      version: '1.0',
      isCurrent: true,
      text: [
        'POLÍTICA DE TRATAMIENTO DE DATOS PERSONALES — Cejas Medellín Studio',
        '',
        'En cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013, ' +
        'Cejas Medellín Studio informa a sus clientes el tratamiento que se da a sus datos personales.',
        '',
        '1. Responsable: Cejas Medellín Studio.',
        '2. Finalidad: gestión de citas, ventas, y prestación de servicios de belleza.',
        '3. Derechos del titular: conocer, actualizar, rectificar y suprimir sus datos.',
        '4. Para ejercer sus derechos: contacte a través de los canales oficiales.',
        '',
        'Esta es la versión inicial (1.0) generada para el MVP. Reemplazar por el texto legal definitivo.',
      ].join('\n'),
    },
  });
}
```

- [ ] **Step 2: Run seed + commit**

```bash
pnpm --filter @bymariap/api prisma:seed
git add apps/api/prisma/seed.ts
git commit -m "feat(api): seed initial habeas data policy (v1.0)"
```

---

## Task 16: Admin — client records page

**Files:**
- Create: `apps/admin/src/features/client-records/api.ts`
- Create: `apps/admin/src/features/client-records/client-record-page.tsx`
- Modify: `apps/admin/src/routes.tsx`
- Modify: `apps/admin/src/components/app-shell.tsx`

- [ ] **Step 1: `features/client-records/api.ts`**

```ts
import { api } from '@/lib/api';
import type { ClientRecordDTO } from '@bymariap/types';
import type { UserRow } from '@/features/users/api';

export interface ClientRecordInput {
  allergies?: string;
  conditions?: string;
  notes?: string;
  photoUrls?: string[];
}

export interface AccessLogRow {
  id: string; accessorUserId: string; accessedRecordId: string; accessedAt: string; action: string;
}

export const clientRecordsApi = {
  customers: () => api.get<UserRow[]>('/admin/users'),
  get: (customerId: string) => api.get<ClientRecordDTO>(`/admin/client-records/${customerId}`),
  upsert: (customerId: string, data: ClientRecordInput) =>
    api.put<ClientRecordDTO>(`/admin/client-records/${customerId}`, data),
  accessLog: (customerId: string) =>
    api.get<AccessLogRow[]>(`/admin/client-records/${customerId}/access-log`),
};
```

- [ ] **Step 2: `client-record-page.tsx`**

Layout:
- Left: a searchable list of customers (reuse `/admin/users`, filter to `role.name === 'customer'`).
- Right: when a customer is selected, fetch their record (`useQuery`, handle 404 → empty form for first creation). Form fields: Alergias (textarea), Condiciones (textarea), Notas (textarea), URLs de fotos (dynamic list). Save with `useMutation` → invalidate.
- Below the form: collapsible "Historial de accesos" calling `accessLog(customerId)` — shows `accessedAt`, `action`, `accessorUserId`.

Use existing admin primitives. Handle the 404 from `get` gracefully (a record that doesn't exist yet is normal — show empty form, the first save creates it).

Notice for the user at the top of the page:
```tsx
<p className="text-xs text-muted-foreground">
  Esta sección contiene datos sensibles. Cada acceso queda registrado por ley de Habeas Data.
</p>
```

- [ ] **Step 3: Register route + nav**

In `routes.tsx`:
```tsx
{ path: '/fichas', element: <ClientRecordPage /> },
```
In `app-shell.tsx`:
```ts
{ to: '/fichas', label: 'Fichas de clientes' },
```

- [ ] **Step 4: Build + commit**

```bash
pnpm --filter @bymariap/admin build
git add apps/admin/src
git commit -m "feat(admin): client records page with access-log history"
```

---

## Task 17: Admin — WhatsApp reminders page

**Files:**
- Create: `apps/admin/src/features/notifications/api.ts`
- Create: `apps/admin/src/features/notifications/reminders-page.tsx`
- Modify: `apps/admin/src/routes.tsx`
- Modify: `apps/admin/src/components/app-shell.tsx`

- [ ] **Step 1: `features/notifications/api.ts`**

```ts
import { api } from '@/lib/api';
import type { ReminderDTO } from '@bymariap/types';

export const notificationsApi = {
  reminders: (date: 'tomorrow' | 'today' | string = 'tomorrow') =>
    api.get<ReminderDTO[]>(`/admin/notifications/whatsapp-reminders?date=${date}`),
};
```

- [ ] **Step 2: `reminders-page.tsx`**

```tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from './api';
import { Button } from '@/components/ui/button';

export function RemindersPage() {
  const [date, setDate] = useState<'tomorrow' | 'today'>('tomorrow');
  const list = useQuery({
    queryKey: ['reminders', date],
    queryFn: () => notificationsApi.reminders(date),
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Recordatorios WhatsApp</h1>
        <div className="flex gap-2">
          <Button size="sm" variant={date === 'today' ? 'default' : 'outline'} onClick={() => setDate('today')}>Hoy</Button>
          <Button size="sm" variant={date === 'tomorrow' ? 'default' : 'outline'} onClick={() => setDate('tomorrow')}>Mañana</Button>
        </div>
      </header>

      <p className="text-sm text-muted-foreground">
        Clic en "Enviar" abre WhatsApp con el mensaje listo. Envía desde tu WhatsApp Business.
      </p>

      {list.isLoading && <p>Cargando…</p>}
      {list.data && list.data.length === 0 && <p className="text-muted-foreground">No hay citas para recordar.</p>}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.data?.map((r) => (
          <div key={r.appointmentId} className="border border-border rounded-lg p-4 space-y-2">
            <p className="font-medium">{r.customerName}</p>
            <p className="text-sm text-muted-foreground">{r.appointmentLocal}</p>
            <p className="text-sm text-muted-foreground">{r.serviceName}</p>
            <p className="text-sm">{r.phone}</p>
            <a href={r.waMeLink} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="w-full">Enviar</Button>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Register route + nav**

In `routes.tsx`:
```tsx
{ path: '/recordatorios', element: <RemindersPage /> },
```
In `app-shell.tsx`:
```ts
{ to: '/recordatorios', label: 'Recordatorios' },
```

- [ ] **Step 4: Build + commit**

```bash
pnpm --filter @bymariap/admin build
git add apps/admin/src
git commit -m "feat(admin): whatsapp reminders page with send buttons"
```

---

## Task 18: Storefront — privacy page (consent + delete account) + policy page wiring

**Files:**
- Create: `apps/storefront/src/lib/consent/api.ts`
- Create: `apps/storefront/src/app/mi-cuenta/privacidad/page.tsx`
- Modify: `apps/storefront/src/app/politica-tratamiento-datos/page.tsx`
- Modify: `apps/storefront/src/app/mi-cuenta/page.tsx`

- [ ] **Step 1: `lib/consent/api.ts`** (client)

```ts
'use client';

import { api } from '@/lib/api/client';
import type { ConsentStatusDTO } from '@bymariap/types';

export const consentApi = {
  status: () => api.get<ConsentStatusDTO>('/me/consent/status'),
  accept: (version: string) => api.post<{ id: string }>('/me/consent/accept', { version }),
  deleteAccount: () => api.delete('/me/account'),
};
```

- [ ] **Step 2: Replace `app/politica-tratamiento-datos/page.tsx` to render the live current policy**

```tsx
import { serverFetch } from '@/lib/api/server';
import type { PolicyVersionDTO } from '@bymariap/types';

export const revalidate = 300;
export const metadata = { title: 'Política de tratamiento de datos' };

export default async function HabeasDataPage() {
  const policy = await serverFetch<PolicyVersionDTO>('/store/policy/current', { next: { revalidate: 300 } });
  return (
    <article className="container py-12 max-w-3xl">
      <h1 className="text-4xl font-heading mb-2">Política de tratamiento de datos</h1>
      <p className="text-sm text-muted-foreground mb-8">Versión {policy.version}</p>
      <div className="whitespace-pre-line leading-relaxed">{policy.text}</div>
    </article>
  );
}
```

- [ ] **Step 3: Create `app/mi-cuenta/privacidad/page.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { consentApi } from '@/lib/consent/api';
import { useMe } from '@/lib/auth/hooks';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function PrivacyPage() {
  const me = useMe();
  const router = useRouter();
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!me.isLoading && !me.data) router.replace('/login?next=/mi-cuenta/privacidad');
  }, [me.isLoading, me.data, router]);

  const status = useQuery({
    queryKey: ['consent-status'],
    queryFn: consentApi.status,
    enabled: Boolean(me.data),
  });

  const accept = useMutation({
    mutationFn: (version: string) => consentApi.accept(version),
    onSuccess: () => { toast.success('Consentimiento registrado'); qc.invalidateQueries({ queryKey: ['consent-status'] }); },
    onError: (e: any) => toast.error(e?.message ?? 'Error'),
  });

  const del = useMutation({
    mutationFn: () => consentApi.deleteAccount(),
    onSuccess: () => { qc.clear(); toast.success('Tu cuenta fue eliminada'); router.replace('/'); },
    onError: (e: any) => toast.error(e?.message ?? 'No se pudo eliminar'),
  });

  if (!me.data) return <div className="container py-10">Cargando…</div>;

  return (
    <div className="container py-10 max-w-2xl space-y-8">
      <h1 className="text-3xl font-heading">Privacidad y datos</h1>

      <section className="space-y-3">
        <h2 className="text-xl font-heading">Consentimiento de tratamiento de datos</h2>
        {status.data?.needsAcceptance ? (
          <div className="border border-border rounded-lg p-4 space-y-3">
            <p className="text-sm">
              Hay una nueva versión de la política ({status.data.currentVersion}). Debes aceptarla para continuar.
            </p>
            <Button onClick={() => accept.mutate(status.data!.currentVersion!)} disabled={accept.isPending}>
              Aceptar versión {status.data.currentVersion}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Has aceptado la versión vigente {status.data?.acceptedVersion ?? '—'}.
          </p>
        )}
        <a href="/politica-tratamiento-datos" className="text-sm underline">Leer la política</a>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-xl font-heading text-destructive">Eliminar mi cuenta</h2>
        <p className="text-sm text-muted-foreground">
          Esto borra tus datos personales de forma permanente (derecho al olvido, Ley 1581/2012).
          Tus pedidos se conservan de forma anonimizada.
        </p>
        {!confirmDelete ? (
          <Button variant="destructive" onClick={() => setConfirmDelete(true)}>Eliminar mi cuenta</Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="destructive" onClick={() => del.mutate()} disabled={del.isPending}>
              Confirmar eliminación
            </Button>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Add a link from `mi-cuenta/page.tsx`**

Add alongside the other account links:
```tsx
<Link href="/mi-cuenta/privacidad" className="inline-flex h-11 px-5 items-center justify-center rounded-md border border-border">Privacidad y datos</Link>
```

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/src
git commit -m "feat(storefront): privacy page (consent re-accept + delete account) + live policy page"
```

---

## Task 19: Manual smoke test

- [ ] **Step 1: Generate an encryption key + set env**

Run:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
Put the output in `apps/api/.env` as `CLIENT_RECORD_ENCRYPTION_KEY=...`. Re-seed if policy not present: `pnpm --filter @bymariap/api prisma:seed`.

- [ ] **Step 2: Bring all apps up**

```bash
pnpm --filter @bymariap/api dev
pnpm --filter @bymariap/admin dev
pnpm --filter @bymariap/storefront dev
```

- [ ] **Step 3: Walk through (admin)**

1. Login as admin → "Fichas de clientes" → pick a customer → fill alergias / condiciones / notas → save.
2. Re-open the same customer → fields show decrypted values.
3. Expand "Historial de accesos" → at least two entries (the read on open + the update on save).
4. Inspect the DB directly (`psql` or Prisma Studio): the `client_records` row columns are ciphertext (`iv:tag:data`), NOT plaintext. This is the key Habeas Data verification.
5. "Recordatorios" tab → switch Hoy/Mañana → cards render for scheduled appointments with a working "Enviar" link (opens `wa.me/57...?text=...`).

- [ ] **Step 4: Walk through (storefront)**

6. Login as a customer → `/mi-cuenta/privacidad` → if a new policy version was published, "Aceptar" appears; accept it → status flips to "aceptada".
7. `/politica-tratamiento-datos` renders the seeded v1.0 text.
8. Publish a new policy version (admin, via the API directly or a quick curl `POST /admin/policy {version:"1.1", text:"..."}`) → reload `/mi-cuenta/privacidad` → "needsAcceptance" shows v1.1.
9. Delete account flow: create a throwaway customer, place an order, then on `/mi-cuenta/privacidad` → "Eliminar mi cuenta" → confirm. Verify: user row gone, the order remains with `customerId = null`, redirect to `/`, cookies cleared.

- [ ] **Step 5: Verify the cron registration (no need to wait until 8am)**

In the API logs at startup there should be no schedule errors. Optionally, temporarily set `REMINDERS_CRON` to a near-future minute, restart, and confirm the "Precomputed N reminder(s)" log line fires; then revert to `0 8 * * *`.

- [ ] **Step 6: Commit any fixes**

```bash
git add -p
git commit -m "fix(phase6): smoke test fixes"
```

---

## Task 20: README + final verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Append Phase 6 section to `README.md`**

```markdown
## Phase 6 — Client records, consent, audit, notifications

New API surface:
- Admin: `GET/PUT /admin/client-records/:customerId`, `GET /admin/client-records/:customerId/access-log`, `GET /admin/notifications/whatsapp-reminders?date=tomorrow`, `POST /admin/policy`
- Customer: `GET /me/consent/status`, `POST /me/consent/accept`, `DELETE /me/account`
- Public: `GET /store/policy/current`

Required env on API:
- `CLIENT_RECORD_ENCRYPTION_KEY` — base64 of 32 random bytes. Generate:
  `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- `REMINDERS_TIMEZONE` (default `America/Bogota`), `REMINDERS_CRON` (default `0 8 * * *`)
- `WHATSAPP_DEFAULT_COUNTRY_CODE` (default `57`)

Habeas Data notes:
- `client_records` sensitive columns are AES-256-GCM ciphertext at rest.
- Every read/update/delete/export on a record writes to `data_access_log`.
- `DELETE /me/account` performs real deletion; orders/appointments are de-linked (anonymized), not preserved with PII.
- WhatsApp reminders are assisted (link-only) in MVP; the `NotificationsService` interface (`getReminders`, `buildReminderMessage`) is the seam for the Phase 3 Meta Cloud API swap.
```

- [ ] **Step 2: Full verification suite**

```bash
pnpm --filter @bymariap/api typecheck
pnpm --filter @bymariap/api test
pnpm --filter @bymariap/api build
pnpm --filter @bymariap/admin typecheck && pnpm --filter @bymariap/admin build
pnpm --filter @bymariap/storefront typecheck && pnpm --filter @bymariap/storefront build
```

Expected: all green.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: phase 6 client records, consent, audit, notifications"
```

---

## Acceptance criteria (Phase 6)

Crypto + client record:
- `FieldCrypto` round-trips strings/arrays, uses random IV, and rejects tampered ciphertext + non-32-byte keys (8 unit tests green).
- `client_records` sensitive columns store ciphertext in `iv:tag:data` format — verified directly in the DB.
- Admin can read + upsert any client record. The assigned specialist (has ≥1 appointment with that customer) can read + write; a non-assigned specialist gets 403 and **no** audit row is written.
- Every successful read writes a `data_access_log` row with `action: 'read'`; every upsert writes `action: 'update'`.
- `GET /admin/client-records/:id/access-log` returns the audit trail newest-first.

Consent:
- `GET /store/policy/current` (public) returns the current policy text + version.
- `GET /me/consent/status` reports `needsAcceptance` correctly across: never accepted, accepted-but-stale, accepted-current.
- `POST /me/consent/accept` stores `version`, `ip`, and a `policyTextSnapshot` of the current text; rejects accepting a non-current version.
- `POST /admin/policy` publishes a new version, marks it current, and unsets the previous current (single current invariant holds).

Right to be forgotten:
- `DELETE /me/account` deletes the user, client record, consents, cart, refresh tokens; de-links orders and appointments (`customerId = null`, PII nulled); clears cookies.

Notifications:
- `GET /admin/notifications/whatsapp-reminders?date=tomorrow` returns one entry per scheduled appointment for tomorrow (Bogota), each with a valid `wa.me/57<digits>?text=<encoded>` link.
- Phone normalization strips non-digits and a duplicated country code.
- The cron is registered with the Bogota timezone and precomputes the cache (logged at fire time); unit tests cover `tomorrowInBogota` boundaries.

All apps typecheck and build clean; API unit suite green.

## Out of scope (deferred)

- Meta WhatsApp Cloud API integration (Phase 3 / post-MVP — only the swap seam is prepared)
- Encrypted photo upload pipeline / object storage (records hold encrypted URL strings only)
- Key rotation tooling beyond env-var swap
- Customer-facing email/SMS confirmations
- Export-to-PDF of a client record (the `export` audit action value exists but no endpoint yet)
- Analytics dashboards + deploy (Phase 7)
```

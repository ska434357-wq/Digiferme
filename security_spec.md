# Security Specification — FermeFacile Avicole SaaS

## 1. Data Invariants
1. **Default Deny**: Any unmatched Firestore path is denied (`allow read, write: if false`).
2. **Master Gate on Subcollections**: Every batch, daily log, and cashflow document under `/workspaces/{workspaceId}` MUST verify the parent `/workspaces/{workspaceId}` document exists and its `ownerUid` equals `request.auth.uid` (or caller is Super Admin).
3. **PII Isolation**: `accessCodes` (containing `phone`, `farmerName`, `code`, `amountFCFA`) and `workspaces` are strictly readable only by `ownerUid == request.auth.uid` or `isAdmin()`. No blanket `isSignedIn()` reads or list queries.
4. **No Self-Assigned Roles or Subscriptions**: Only `isAdmin()` can create, renew, suspend, or delete `/accessCodes/{codeId}` or `/admins/{adminId}`. Farmers cannot escalate their `plan`, `status`, or `expiresAtMs`.
5. **Immutable Ownership & Temporal Integrity**: `ownerUid`, `workspaceId`, and `createdAt` cannot be modified after creation. `createdAt` and `updatedAt` must strictly equal `request.time`.
6. **Path Variable Hardening**: Every single-document ID (`adminId`, `codeId`, `workspaceId`, `batchId`, `logId`, `entryId`) must match `^[a-zA-Z0-9_\\-]+$` and `.size() <= 128`.
7. **Strict Validation Blueprints**: Every `create` and `update` uses `isValid[Entity]()` enforcing `keys().hasAll(...)`, `keys().hasOnly(...)`, strict types, bounded string lengths, and `affectedKeys().hasOnly(...)` on updates.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Access Code Creation**: `request.auth == null` writing to `/accessCodes/FF-MENS-9999`.
2. **Unverified Email Admin Spoof**: `request.auth.token.email == 'ska434357@gmail.com'` with `email_verified: false` reading `/accessCodes`.
3. **Self-Promoted Admin**: Farmer creates `/admins/{myUid}` with `{ uid: myUid, email: 'farmer@test.com', role: 'super_admin' }`.
4. **Farmer Creating Free Annual Code**: Verified non-admin user creates `/accessCodes/FREE-YEAR` with `{ plan: 'annuel', status: 'active' }`.
5. **Shadow Field Injection on Workspace**: Owner creates `/workspaces/ws-1` with extra ghost field `{ isSuperAdmin: true }`.
6. **Cross-Tenant Workspace Read (PII Leak)**: User B (`uidB`) tries `get(/workspaces/ws-A)` owned by `uidA`.
7. **Cross-Tenant List Scraping**: User B tries `list` on `/accessCodes` without filtering `ownerUid == uidB`.
8. **ID Poisoning**: Creating `/workspaces/${'a'.repeat(500)}/batches/b1` (>128 chars) or invalid chars `../hack`.
9. **Owner Hijack on Update**: Owner updates `/workspaces/ws-1` attempting to change `ownerUid` or `createdAt`.
10. **Subscription Extension Bypass**: Farmer updates `/accessCodes/code-1` modifying `expiresAtMs` or `status`.
11. **Timestamp Forgery**: Creating `/workspaces/ws-1/batches/b1` with backdated `createdAt` (`!= request.time`).
12. **Terminal Batch Bypass**: Updating `/workspaces/ws-1/batches/b1` when `status == 'completed'` as non-admin.

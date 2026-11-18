/**
 * Phase 0 TDD Security Test Runner for FermeFacile Avicole Firestore Rules
 * Verifies all "Dirty Dozen" adversarial payloads are rejected with PERMISSION_DENIED.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expected: 'PERMISSION_DENIED';
  payload?: Record<string, unknown>;
}

export const DIRTY_DOZEN_PAYLOADS: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Unauthenticated Access Code Creation',
    collectionPath: 'accessCodes/FF-MENS-9999',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { code: 'FF-MENS-9999', plan: 'mensuel', status: 'active' },
  },
  {
    id: 2,
    name: 'Unverified Email Admin Spoof',
    collectionPath: 'accessCodes/FF-MENS-0001',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Self-Promoted Admin Document',
    collectionPath: 'admins/attackerUid',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { uid: 'attackerUid', email: 'attacker@example.com', role: 'super_admin' },
  },
  {
    id: 4,
    name: 'Non-Admin Creating Annual Access Code',
    collectionPath: 'accessCodes/FREE-YEAR',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { code: 'FREE-YEAR', plan: 'annuel', status: 'active', amountFCFA: 0 },
  },
  {
    id: 5,
    name: 'Shadow Field Injection on Workspace',
    collectionPath: 'workspaces/ws-attacker',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { workspaceId: 'ws-attacker', ownerUid: 'attackerUid', isSuperAdmin: true },
  },
  {
    id: 6,
    name: 'Cross-Tenant Workspace Read (PII Leak)',
    collectionPath: 'workspaces/ws-victim',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Unscoped AccessCodes List Query',
    collectionPath: 'accessCodes',
    operation: 'list',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'ID Poisoning (>128 chars or path traversal)',
    collectionPath: 'workspaces/invalid..id/batches/b1',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { id: 'b1', name: 'Poisoned Batch' },
  },
  {
    id: 9,
    name: 'Owner Hijack on Workspace Update',
    collectionPath: 'workspaces/ws-1',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    payload: { ownerUid: 'otherUid' },
  },
  {
    id: 10,
    name: 'Subscription Expiry Tampering by Farmer',
    collectionPath: 'accessCodes/code-1',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    payload: { expiresAtMs: 9999999999999, status: 'active' },
  },
  {
    id: 11,
    name: 'Backdated Server Timestamp Forgery',
    collectionPath: 'workspaces/ws-1/batches/b1',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { id: 'b1', createdAt: '2020-01-01T00:00:00Z' },
  },
  {
    id: 12,
    name: 'Modifying Completed Batch (Terminal State Lock)',
    collectionPath: 'workspaces/ws-1/batches/b-done',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    payload: { initialChicks: 99999 },
  },
];

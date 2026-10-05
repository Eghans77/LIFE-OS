/**
 * Firestore Security Rules Test Specification (Dirty Dozen Verification)
 * Verifies that all 12 adversarial payloads in security_spec.md return PERMISSION_DENIED.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collection: string;
  docId: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  authUid: string | null;
  emailVerified: boolean;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED' | 'ALLOWED';
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on Task Create',
    collection: 'tasks',
    docId: 'task_1',
    operation: 'create',
    authUid: 'user_1',
    emailVerified: true,
    payload: { userId: 'victim_uid_999', title: 'Spoofed Task' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Shadow Field Injection on Project Create',
    collection: 'projects',
    docId: 'proj_1',
    operation: 'create',
    authUid: 'user_1',
    emailVerified: true,
    payload: { userId: 'user_1', name: 'Project', isAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unverified Email Write Attempt',
    collection: 'tasks',
    docId: 'task_2',
    operation: 'create',
    authUid: 'user_1',
    emailVerified: false,
    payload: { userId: 'user_1', title: 'Unverified Write' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Cross-Tenant PII Read on /users/victim_uid',
    collection: 'users',
    docId: 'victim_uid',
    operation: 'get',
    authUid: 'user_1',
    emailVerified: true,
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Unfiltered List Scraping on /notes',
    collection: 'notes',
    docId: '*',
    operation: 'list',
    authUid: 'user_1',
    emailVerified: true,
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Ownership Hijack on Goal Update',
    collection: 'goals',
    docId: 'goal_1',
    operation: 'update',
    authUid: 'user_1',
    emailVerified: true,
    payload: { userId: 'attacker_uid' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Timestamp Forgery on Event Create',
    collection: 'events',
    docId: 'evt_1',
    operation: 'create',
    authUid: 'user_1',
    emailVerified: true,
    payload: { userId: 'user_1', createdAt: '2020-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Denial-of-Wallet Oversized String Injection',
    collection: 'tasks',
    docId: 'task_1',
    operation: 'update',
    authUid: 'user_1',
    emailVerified: true,
    payload: { title: 'A'.repeat(1000) },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'ID Poisoning Attack',
    collection: 'tasks',
    docId: 'invalid$id!@#',
    operation: 'create',
    authUid: 'user_1',
    emailVerified: true,
    payload: { userId: 'user_1', title: 'Valid Title' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Unbounded Array Exhaustion on Notes',
    collection: 'notes',
    docId: 'note_1',
    operation: 'create',
    authUid: 'user_1',
    emailVerified: true,
    payload: { userId: 'user_1', tags: new Array(50).fill('tag') },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Terminal State Bypass on Locked Task',
    collection: 'tasks',
    docId: 'task_locked',
    operation: 'update',
    authUid: 'user_1',
    emailVerified: true,
    payload: { status: 'todo' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Negative Financial Transaction Injection',
    collection: 'transactions',
    docId: 'tx_1',
    operation: 'create',
    authUid: 'user_1',
    emailVerified: true,
    payload: { userId: 'user_1', title: 'Bad Tx', amount: -500 },
    expectedResult: 'PERMISSION_DENIED',
  },
];

# LIFE OS — Zero-Trust Firestore Security Specification

## 1. Data Invariants

1. **Strict Tenant Isolation**: Every document across `/users/{userId}`, `/tasks/{taskId}`, `/projects/{projectId}`, `/goals/{goalId}`, `/events/{eventId}`, `/notes/{noteId}`, `/habits/{habitId}`, `/learning/{learningId}`, `/transactions/{transactionId}`, and `/dailyPlans/{planId}` belongs to exactly one authenticated, email-verified user (`userId == request.auth.uid`).
2. **No Blanket Reads or Unfiltered Queries**: No collection allows blanket `isSignedIn()` reads or lists. All `list` operations enforce `resource.data.userId == request.auth.uid`. `/users/{userId}` forbids `list` entirely and restricts `get` to `request.auth.uid == userId`.
3. **Immutable Ownership & Creation Timestamps**: Once created, `userId` and `createdAt` can never be mutated during an `update`.
4. **Temporal Integrity**: On `create`, `createdAt == request.time` and `updatedAt == request.time`. On `update`, `updatedAt == request.time`.
5. **Terminal State Locking**: Any entity whose `status` reaches `'locked'` cannot be updated further.
6. **Path Variable Hardening**: All single-document operations (`get`, `create`, `update`, `delete`) validate the document ID via `isValidId(id)` (`^[a-zA-Z0-9_\-]+$`, length `1..128`).
7. **Strict Schema & Key Whitelisting**: Every `create` and `update` invokes `isValid[Entity](incoming())`, enforcing `.hasAll()` and `.hasOnly()` key sets, string length bounds, numeric ranges, and bounded list sizes.

---

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 (Identity Spoofing on Task Create)**:
   `{ "userId": "victim_uid_999", "title": "Spoofed Task", ... }` -> Rejected (`incoming().userId == request.auth.uid` fails).
2. **Payload 2 (Shadow Field Injection on Project Create)**:
   `{ "userId": "user_1", "name": "Valid", ..., "isAdmin": true }` -> Rejected (`data.keys().hasOnly(...)` fails).
3. **Payload 3 (Unverified Email Write Attempt)**:
   Auth token with `email_verified: false` attempting `create` on `/tasks/task_1` -> Rejected (`isVerified()` fails).
4. **Payload 4 (Cross-Tenant PII Read on `/users/victim_uid`)**:
   Authenticated `user_1` attempting `get /users/victim_uid` -> Rejected (`request.auth.uid == userId` fails).
5. **Payload 5 (Unfiltered List Scraping on `/notes`)**:
   Authenticated `user_1` running `getDocs(collection(db, 'notes'))` without `where('userId', '==', uid)` -> Rejected (`resource.data.userId == request.auth.uid` fails).
6. **Payload 6 (Ownership Hijack on Update)**:
   Updating `/goals/goal_1` with `{ "userId": "attacker_uid" }` -> Rejected (`incoming().userId == existing().userId` fails).
7. **Payload 7 (Timestamp Forgery on Create)**:
   Creating `/events/evt_1` with client-forged past `createdAt` timestamp -> Rejected (`incoming().createdAt == request.time` fails).
8. **Payload 8 (Denial-of-Wallet 1MB String Injection)**:
   Updating `/tasks/task_1` with a 50,000-character `title` -> Rejected (`data.title.size() <= 200` fails).
9. **Payload 9 (ID Poisoning Attack)**:
   Creating document with invalid path ID `/tasks/bad$id!@#` -> Rejected (`isValidId(taskId)` fails).
10. **Payload 10 (Unbounded Array Exhaustion)**:
    Creating `/notes/note_1` with 500 tags in `tags` array -> Rejected (`data.tags.size() <= 10` fails).
11. **Payload 11 (Terminal State Bypass)**:
    Updating `/tasks/task_locked` when `existing().status == 'locked'` -> Rejected (`existing().status != 'locked'` fails).
12. **Payload 12 (Negative Financial Transaction Injection)**:
    Creating `/transactions/tx_1` with `amount: -500` -> Rejected (`data.amount > 0` fails).

/**
 * Atomic consumption of a single-use client magic-link token.
 *
 * `api/client-login-validate.ts` previously did:
 *
 *   1. doc.get()                        (reads used:false)
 *   2. if (login.used) reject           (in-memory check)
 *   3. doc.update({ used: true })       (separate write)
 *
 * Between steps 1 and 3 a second request for the same token can also pass
 * step 2, so two concurrent redemptions both succeeded. The README promises
 * "Client magic-link tokens are single-use and validated server-side", so the
 * read and the consume must land in one atomic step.
 *
 * `consumeClientLogin` does that with a single Firestore transaction: it reads
 * the document and, inside the same transaction, marks it used. Firestore
 * serializes overlapping transactions on the same document, so two concurrent
 * redemptions cannot both commit the `used: true` write. Whichever lands
 * second is retried, re-reads the now-used document, and is rejected with
 * `ALREADY_USED`. The result is a discriminated union so the handler can map
 * it onto the exact HTTP statuses the old code returned.
 *
 * The module is written against a small structural interface
 * (`FirestoreLike`) rather than the concrete `firebase-admin` `Firestore`
 * type. The real Firestore satisfies it (its `DocumentReference` is an object,
 * `transaction.get(ref)` resolves to a snapshot with `exists`/`data()`, and
 * `transaction.update(ref, data)` performs the write), and a test fake
 * reproduces the one concurrency behavior that matters for this bug:
 * serialized commits that abort-and-retry when a write's preimage changed.
 */

/** A document reference: any non-primitive object address (the real
 *  `DocumentReference`, or a fake carrying an `__id`). */
export type LoginDocRef = object;

export interface LoginSnapshot {
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}

export interface LoginTransaction {
  get(ref: LoginDocRef): Promise<LoginSnapshot>;
  update(ref: LoginDocRef, data: Record<string, unknown>): unknown;
}

export interface FirestoreLike {
  collection(name: string): { doc(id: string): LoginDocRef };
  runTransaction<T>(fn: (txn: LoginTransaction) => Promise<T>): Promise<T>;
}

export type ConsumeResult =
  | { status: 'OK'; clientId: string; email: string }
  | { status: 'INVALID' }
  | { status: 'ALREADY_USED' }
  | { status: 'EXPIRED' };

/**
 * Atomically claim the magic-link token `token` (marking it used) or report
 * why it cannot be claimed.
 *
 * `now` is injected for the expiry check so the rule is testable without
 * clock manipulation.
 */
export async function consumeClientLogin(
  db: FirestoreLike,
  token: string,
  now: Date = new Date(),
): Promise<ConsumeResult> {
  return db.runTransaction(async (txn) => {
    const ref = db.collection('client_logins').doc(String(token));
    const snap = await txn.get(ref);

    if (!snap.exists) {
      return { status: 'INVALID' as const };
    }

    const login = snap.data();
    if (!login) {
      return { status: 'INVALID' as const };
    }

    if (login.used) {
      return { status: 'ALREADY_USED' as const };
    }

    if (new Date(login.expiresAt as string) < now) {
      return { status: 'EXPIRED' as const };
    }

    txn.update(ref, { used: true, usedAt: now.toISOString() });

    return {
      status: 'OK' as const,
      clientId: String(login.clientId),
      email: String(login.email),
    };
  });
}

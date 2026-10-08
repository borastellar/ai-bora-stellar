/**
 * Concurrency + behavior tests for the atomic magic-link token consumer.
 *
 * Run (from the repo root or back/):
 *   node --experimental-strip-types --test back/test/client-login-consume.test.ts
 *
 * There is no Firestore emulator in this environment and no test framework is
 * configured in back/, so this exercises the changed unit directly
 * (consumeClientLogin in services/client-login-consume.ts) against a fake that
 * reproduces the ONE Firestore behavior that matters for this bug:
 *
 *   - Concurrent transactions commit in a serialized order.
 *   - A commit whose write's preimage (the version read at txn start) no longer
 *     matches the document's current version is ABORTED, and the whole
 *     transaction is re-run from the top (a fresh read).
 *
 * That is exactly the server-side guarantee that turns "read, check used:false,
 * write used:true" into an atomic claim: of two concurrent redemptions of the
 * same fresh token, exactly one commits used=true and the other reports
 * ALREADY_USED.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  consumeClientLogin,
  type FirestoreLike,
} from '../services/client-login-consume.ts';

// --- Firestore-faithful transaction fake ---------------------------------

type Doc = { data: Record<string, unknown>; version: number };

class ConflictError extends Error {
  constructor() {
    super('COMMIT_FAILED: preimage changed');
    this.name = 'ConflictError';
  }
}

interface PendingWrite {
  id: string;
  data: Record<string, unknown>;
  baseVersion: number | null; // version the txn read; null = "must not exist"
}

type Ref = { __id: string };

class FakeFirestore implements FirestoreLike {
  private docs = new Map<string, Doc>();
  private queue: Promise<unknown> = Promise.resolve();

  // Test helpers.
  setToken(id: string, data: Record<string, unknown>): void {
    this.docs.set(id, { data: { ...data }, version: 0 });
  }

  getToken(id: string): Record<string, unknown> | undefined {
    const d = this.docs.get(id);
    return d ? { ...d.data } : undefined;
  }

  collection(_name: string) {
    return {
      doc: (id: string) => {
        const ref = { __id: id } as Ref;
        return ref;
      },
    };
  }

  runTransaction<T>(fn: (txn: unknown) => Promise<T>): Promise<T> {
    // Chain onto the commit queue so concurrent transactions serialize.
    const chained = this.queue.then(async () => {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const state = this.beginTxn();
        const result = await fn(state.txn); // read phase + record writes
        try {
          this.commit(state.writes);
          return result as T;
        } catch (err) {
          if (!(err instanceof ConflictError) || attempt === 7) throw err;
          // Preimage changed: abort, re-run the whole transaction (fresh read).
        }
      }
      throw new ConflictError();
    });
    this.queue = chained.then(
      () => undefined,
      (err) => {
        throw err;
      },
    );
    return chained as Promise<T>;
  }

  private beginTxn() {
    const reads = new Map<string, number | null>();
    const writes: PendingWrite[] = [];

    const txn = {
      get: (ref: Ref) => {
        const doc = this.docs.get(ref.__id);
        reads.set(ref.__id, doc ? doc.version : null);
        return Promise.resolve({
          exists: doc !== undefined,
          data: () => (doc ? { ...doc.data } : undefined),
        });
      },
      update: (ref: Ref, data: Record<string, unknown>) => {
        writes.push({ id: ref.__id, data, baseVersion: reads.get(ref.__id) ?? null });
      },
    };

    return { txn, writes };
  }

  private commit(writes: PendingWrite[]): void {
    if (writes.length === 0) return;
    for (const w of writes) {
      const doc = this.docs.get(w.id);
      const current = doc ? doc.version : null;
      const ok =
        w.baseVersion === current ||
        (w.baseVersion === null && doc === undefined);
      if (!ok) throw new ConflictError();
    }
    for (const w of writes) {
      const existing = this.docs.get(w.id);
      if (existing) {
        existing.data = { ...existing.data, ...w.data };
        existing.version += 1;
      } else {
        this.docs.set(w.id, { data: { ...w.data }, version: 1 });
      }
    }
  }
}

// --- Tests ---------------------------------------------------------------

const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 60 * 60 * 1000).toISOString();

test('a single redemption of a fresh token succeeds and marks it used', async () => {
  const db = new FakeFirestore();
  db.setToken('tok1', {
    clientId: 'c1',
    email: 'a@b.c',
    used: false,
    expiresAt: FUTURE,
  });

  const result = await consumeClientLogin(db, 'tok1');
  assert.equal(result.status, 'OK');
  if (result.status === 'OK') {
    assert.equal(result.clientId, 'c1');
    assert.equal(result.email, 'a@b.c');
  }
  assert.equal(db.getToken('tok1')?.used, true);
});

test('an already-used token returns ALREADY_USED (existing "Link already used")', async () => {
  const db = new FakeFirestore();
  db.setToken('tok2', {
    clientId: 'c2',
    email: 'a@b.c',
    used: true,
    expiresAt: FUTURE,
  });

  const result = await consumeClientLogin(db, 'tok2');
  assert.equal(result.status, 'ALREADY_USED');
});

test('an expired unused token returns EXPIRED', async () => {
  const db = new FakeFirestore();
  db.setToken('tok3', {
    clientId: 'c3',
    email: 'a@b.c',
    used: false,
    expiresAt: PAST,
  });

  const result = await consumeClientLogin(db, 'tok3');
  assert.equal(result.status, 'EXPIRED');
});

test('an unknown token returns INVALID (existing "Link invalid")', async () => {
  const db = new FakeFirestore();
  const result = await consumeClientLogin(db, 'does-not-exist');
  assert.equal(result.status, 'INVALID');
});

test('TWO CONCURRENT redemptions of one fresh token -> exactly one OK', async () => {
  const db = new FakeFirestore();
  db.setToken('race', {
    clientId: 'cr',
    email: 'a@b.c',
    used: false,
    expiresAt: FUTURE,
  });

  const [r1, r2] = await Promise.all([
    consumeClientLogin(db, 'race'),
    consumeClientLogin(db, 'race'),
  ]);

  const statuses = [r1.status, r2.status].sort();
  assert.deepEqual(statuses, ['ALREADY_USED', 'OK']);
  assert.equal(db.getToken('race')?.used, true);
});

test('a burst of 8 concurrent redemptions of one token -> exactly one OK', async () => {
  const db = new FakeFirestore();
  db.setToken('burst', {
    clientId: 'cb',
    email: 'a@b.c',
    used: false,
    expiresAt: FUTURE,
  });

  const results = await Promise.all(
    Array.from({ length: 8 }, () => consumeClientLogin(db, 'burst')),
  );

  const okCount = results.filter((r) => r.status === 'OK').length;
  const usedCount = results.filter((r) => r.status === 'ALREADY_USED').length;
  assert.equal(okCount, 1, 'exactly one concurrent redemption must win');
  assert.equal(usedCount, 7, 'the other seven must be rejected as used');
  assert.equal(db.getToken('burst')?.used, true);
});

test('sequential redemptions: first OK, second ALREADY_USED', async () => {
  const db = new FakeFirestore();
  db.setToken('seq', {
    clientId: 'cs',
    email: 'a@b.c',
    used: false,
    expiresAt: FUTURE,
  });

  const first = await consumeClientLogin(db, 'seq');
  const second = await consumeClientLogin(db, 'seq');
  assert.equal(first.status, 'OK');
  assert.equal(second.status, 'ALREADY_USED');
});

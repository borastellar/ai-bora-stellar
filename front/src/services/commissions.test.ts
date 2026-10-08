import { getCommissionDocId } from './commissions';

/**
 * Asserts commission document ID scheme matches between task and invoice writers,
 * ensuring deterministic idempotency.
 */
export function runCommissionIdSchemeTests(): boolean {
  const taskId = 'task_abc_123';
  const invoiceId = 'inv_xyz_789';

  const taskDocId = getCommissionDocId(taskId);
  const invoiceDocId = getCommissionDocId(invoiceId);

  if (taskDocId !== 'comm_task_abc_123') {
    throw new Error(`Expected comm_task_abc_123 but got ${taskDocId}`);
  }

  if (invoiceDocId !== 'comm_inv_xyz_789') {
    throw new Error(`Expected comm_inv_xyz_789 but got ${invoiceDocId}`);
  }

  // Idempotency
  if (getCommissionDocId(taskId) !== taskDocId) {
    throw new Error('Key generation is not deterministic for tasks');
  }
  if (getCommissionDocId(invoiceId) !== invoiceDocId) {
    throw new Error('Key generation is not deterministic for invoices');
  }

  // Empty check
  let threw = false;
  try {
    getCommissionDocId('');
  } catch {
    threw = true;
  }
  if (!threw) {
    throw new Error('Expected getCommissionDocId to throw on empty string');
  }

  return true;
}

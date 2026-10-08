import { getCommissionDocId } from './commissions';
import { db } from './firebase';
import { collection, doc, setDoc, getDoc, updateDoc, deleteDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { generateId } from './firebase';
import { createInvoice } from './invoices';
import { sendInvoiceEmail } from './emailService';
import { createNotification } from './notifications';

export type TaskStatus = 
  | 'available'            // Open to any collaborator
  | 'pending_assignment'   // Collaborator requested; awaiting admin approval
  | 'assigned'             // Admin approved collaborator request
  | 'in_analysis'            // Collaborator reviewing / understanding
  | 'in_progress'           // Collaborator actively working
  | 'in_revision'            // Work submitted; admin review
  | 'approved'              // Admin approved delivery
  | 'approved_admin'        // Admin approved delivery (legacy)
  | 'approved_client'      // Client approved the delivery
  | 'delivered'              // Sent to client for approval
  | 'paid';                 // Client paid the invoice

export const TASK_STATUSES: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'available', label: 'Available', color: '#22c55e' },
  { value: 'pending_assignment', label: 'Awaiting approval', color: '#f59e0b' },
  { value: 'assigned', label: 'Assigned', color: '#3b82f6' },
  { value: 'in_analysis', label: 'In review', color: '#8b5cf6' },
  { value: 'in_progress', label: 'In progress', color: '#ec4899' },
  { value: 'in_revision', label: 'In revision', color: '#14b8a6' },
  { value: 'approved', label: 'Approved', color: '#10b981' },
  { value: 'delivered', label: 'Delivered to client', color: '#f97316' },
  { value: 'paid', label: 'Paid', color: '#65a30d' },
];

export interface Task {
  id: string;
  title: string;
  description?: string;
  serviceId?: string;
  serviceName?: string;
  clientId: string;
  clientName?: string;
  clientEmail?: string;
  proposalId?: string;
  clientAmount?: number;
  collaboratorPercentage?: number;
  salesRepPercentage?: number;
  recurring?: boolean;
  periodicidade?: 'monthly' | 'one_time';
  status: TaskStatus;
  requesters?: string[];
  requesterInfo?: { id: string; name: string; data: string }[];
  assignedA?: string;
  assignedName?: string;
  deliveryFiles?: string[];
  deliveryLinks?: string[];
  deliveryNote?: string;
  deliveryData?: string;
  reviewNote?: string;
  requestDate?: string;
  dataAssignment?: string;
  startDate?: string;
  deliveryDate?: string;
  dataApproval?: string;
  deliveredAt?: string;
  paymentDate?: string;
  prazo?: string;
  collaboratorCommissionAmount?: number;
  collaboratorCommissionType?: 'fixed' | 'percentage';
  createdAt: string;
  updatedAt?: string;
}

export async function createTask(data: Partial<Task>): Promise<string> {
  const id = 'tarea-' + generateId();
  await setDoc(doc(db, 'tasks', id), {
    ...data,
    createdAt: new Date().toISOString()
  });
  return id;
}

export async function getTask(id: string): Promise<Task | null> {
  const docSnap = await getDoc(doc(db, 'tasks', id));
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Task;
  }
  return null;
}

export async function updateTask(id: string, data: Partial<Task>): Promise<void> {
  await updateDoc(doc(db, 'tasks', id), {
    ...data,
    updatedAt: new Date().toISOString()
  });
}

export async function deleteTask(id: string): Promise<void> {
  await deleteDoc(doc(db, 'tasks', id));
}

export async function listTasks(limitNum = 100): Promise<Task[]> {
  const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'), limit(limitNum));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
}

export async function listTasksAvailable(limitNum = 100): Promise<Task[]> {
  const q = query(collection(db, 'tasks'), where('status', '==', 'available'), orderBy('createdAt', 'desc'), limit(limitNum));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
}

export async function listTasksBySalesRep(salesRepId: string): Promise<Task[]> {
  const q = query(collection(db, 'tasks'), where('assignedA', '==', salesRepId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
}

export async function listTasksByClient(clientId: string): Promise<Task[]> {
  const q = query(collection(db, 'tasks'), where('clientId', '==', clientId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
}

export async function requestTask(taskId: string, salesRepId: string, salesRepName: string): Promise<void> {
  const task = await getTask(taskId);
  if (!task) return;
  
  const requesters = task.requesters || [];
  const requesterInfo = task.requesterInfo || [];
  
  if (!requesters.includes(salesRepId)) {
    requesters.push(salesRepId);
    requesterInfo.push({ id: salesRepId, name: salesRepName, data: new Date().toISOString() });
  }
  
  await updateTask(taskId, {
    requesters,
    requesterInfo,
    status: 'pending_assignment',
    requestDate: new Date().toISOString()
  });

  await createNotification({
    type: 'new_task_requested',
    title: 'New task request',
    message: `${salesRepName} requested to work on "${task.title}". Approve or reject?`,
    taskId: taskId,
    clientId: task.clientId
  });
}

export async function approveTaskRequest(taskId: string, salesRepId: string, salesRepName: string): Promise<void> {
  const task = await getTask(taskId);
  if (!task) return;

  await updateTask(taskId, {
    assignedA: salesRepId,
    assignedName: salesRepName,
    status: 'assigned',
    dataAssignment: new Date().toISOString()
  });

  await createNotification({
    type: 'task_approved',
    title: 'Task assigned',
    message: `Your request for "${task.title}" was approved. You can start.`,
    taskId: taskId,
    salesRepId
  });
}

export async function rejectTaskRequest(taskId: string, salesRepId: string, _salesRepName: string, reason?: string): Promise<void> {
  const task = await getTask(taskId);
  if (!task) return;

  const requesters = (task.requesters || []).filter(id => id !== salesRepId);
  const requesterInfo = (task.requesterInfo || []).filter(s => s.id !== salesRepId);

  await updateTask(taskId, {
    requesters,
    requesterInfo,
    status: requesters.length > 0 ? 'pending_assignment' : 'available'
  });

  await createNotification({
    type: 'task_rejected',
    title: 'Request rejected',
    message: `Your request for "${task.title}" was rejected. ${reason ? `Reason: ${reason}` : ''}`,
    taskId: taskId,
    salesRepId
  });
}

export async function startTask(taskId: string): Promise<void> {
  await updateTask(taskId, {
    status: 'in_analysis',
    startDate: new Date().toISOString()
  });
}

export async function executeTask(taskId: string): Promise<void> {
  await updateTask(taskId, {
    status: 'in_progress'
  });
}

export async function deliverTask(taskId: string, files?: string[], links?: string[], note?: string): Promise<void> {
  const task = await getTask(taskId);
  if (!task) return;

  await updateTask(taskId, {
    deliveryFiles: files,
    deliveryLinks: links,
    deliveryNote: note,
    deliveryData: new Date().toISOString(),
    status: 'in_revision'
  });

  await createNotification({
    type: 'task_delivered',
    title: 'Task submitted for review',
    message: `"${task.title}" was submitted. Review and approve or request changes.`,
    taskId: taskId,
    clientId: task.clientId
  });
}

export async function approveTaskDelivery(taskId: string): Promise<void> {
  const task = await getTask(taskId);
  if (!task) return;

  await updateTask(taskId, {
    status: 'approved',
    reviewNote: 'Approved by admin',
    dataApproval: new Date().toISOString()
  });

  await createNotification({
    type: 'task_approved',
    title: 'Delivery approved',
    message: `Your delivery for "${task.title}" was approved by admin.`,
    taskId: taskId,
    salesRepId: task.assignedA
  });
}

export async function requestChanges(taskId: string, note: string): Promise<void> {
  const task = await getTask(taskId);
  if (!task) return;

  await updateTask(taskId, {
    status: 'in_progress',
    reviewNote: note
  });

  await createNotification({
    type: 'task_rejected',
    title: 'Changes requested',
    message: `Admin requested changes on "${task.title}": ${note}`,
    taskId: taskId,
    salesRepId: task.assignedA
  });
}

export async function sendToClient(taskId: string): Promise<void> {
  const task = await getTask(taskId);
  if (!task) return;

  await updateTask(taskId, {
    status: 'delivered',
    deliveredAt: new Date().toISOString()
  });
}

export async function markTaskPaid(taskId: string): Promise<void> {
  const taskRef = doc(db, 'tasks', taskId);
  const taskSnap = await getDoc(taskRef);
  const task = taskSnap.data();
  
  if (task?.clientAmount && task.clientAmount > 0) {
    const commission = {
      taskId,
      clientId: task.clientId,
      salesRepId: task.salesRepCaptou || task.salesRepId,
      collaboratorId: task.assignedA,
      montoVenta: task.clientAmount,
      commissionSalesRep: (task.clientAmount * (task.salesRepPercentage || 10) / 100),
      commissionCollaborator: (task.clientAmount * (task.collaboratorPercentage || 60) / 100),
      fecha: new Date().toISOString(),
      status: 'pending'
    };
    
    await setDoc(doc(db, 'commissions', getCommissionDocId(taskId)), commission);
  }
  
  await updateTask(taskId, {
    status: 'paid',
    paymentDate: new Date().toISOString()
  });

  if (task?.assignedA) {
    await createNotification({
      type: 'invoice_paid',
      title: 'Task paid — commission available',
      message: `Task "${task.title}" was paid. Your commission is available for payout.`,
      taskId: taskId,
      salesRepId: task.assignedA
    });
  }
}

export async function assignTask(
  taskId: string, 
  salesRepId: string, 
  salesRepName: string, 
  prazo: string, 
  commissionAmount?: number, 
  commissionType?: 'fixed' | 'percentage'
): Promise<void> {
  await updateTask(taskId, {
    assignedA: salesRepId,
    assignedName: salesRepName,
    prazo,
    collaboratorCommissionAmount: commissionAmount,
    collaboratorCommissionType: commissionType,
    status: 'assigned',
    dataAssignment: new Date().toISOString()
  });

  await createNotification({
    type: 'task_approved',
    title: 'Task assigned',
    message: `You were assigned task "${await getTask(taskId).then(t => t?.title)}". Deadline: ${prazo}`,
    taskId: taskId,
    salesRepId
  });
}

export async function approveTask(taskId: string): Promise<void> {
  await updateTask(taskId, {
    status: 'approved',
    dataApproval: new Date().toISOString()
  });
}

export async function approveTaskByClient(clientId: string, taskId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const task = await getTask(taskId);
    if (!task) {
      return { success: false, error: 'Task not found.' };
    }
    
    if (task.clientId !== clientId) {
      return { success: false, error: 'Access denied: this task belongs to another client.' };
    }

    await updateTask(taskId, {
      status: 'approved_client',
      updatedAt: new Date().toISOString()
    });

    const docSnap = await getDoc(doc(db, 'clients', clientId));
    const client = docSnap.exists() ? docSnap.data() : null;

    const invoiceId = await createInvoice({
      clientId,
      clientName: client?.name || task.clientName || 'Independent client',
      clientEmail: client?.email || task.clientEmail,
      clientTaxId: client?.taxId,
      clientCompany: client?.company,
      services: [{
        name: task.title,
        description: task.description || 'Service delivered',
        price: task.clientAmount || 0
      }],
      salesRepId: task.assignedA || client?.salesRepId,
      proposalId: task.proposalId,
      taskId
    });

    const originalAmount = task.clientAmount || 0;
    const amountWithVat = (originalAmount * 1.23).toFixed(2);
    
    if (client?.email || task.clientEmail) {
      await sendInvoiceEmail(
        client?.email || task.clientEmail || '',
        client?.name || task.clientName || 'Client',
        `${amountWithVat} €`,
        `https://aibora.pt/pagar/${invoiceId}`,
        new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-PT')
      );
    }

    return { success: true };
  } catch (err: any) {
    console.error('Approval error:', err);
    return { success: false, error: err.message };
  }
}

export async function updateTaskByInvoiceId(invoiceId: string): Promise<void> {
  const invoiceSnap = await getDoc(doc(db, 'invoices', invoiceId));
  const invoice = invoiceSnap.exists() ? invoiceSnap.data() : null;
  if (!invoice?.taskId) return;

  await updateTask(invoice.taskId, {
    status: 'paid',
    paymentDate: new Date().toISOString()
  });
}
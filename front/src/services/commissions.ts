import { db } from './firebase';
import { collection, doc, setDoc, query, where, getDocs, updateDoc } from 'firebase/firestore';

export interface Commission {
  id: string;
  invoiceId?: string;
  taskId?: string;
  clientId?: string;
  salesRepId?: string;
  collaboratorId?: string;
  montoVenta?: number;
  saleAmount?: number;
  salesRepPercentage: number;
  collaboratorPercentage: number;
  commissionSalesRep?: number;
  commissionCollaborator?: number;
  salesRepAmount?: number;
  collaboratorAmount?: number;
  status: 'pending' | 'paid';
  createdAt?: Date;
  fecha?: string;
}

export function getCommissionDocId(sourceId: string): string {
  if (!sourceId) {
    throw new Error('sourceId is required to generate commission document ID');
  }
  return `comm_${sourceId}`;
}

export function calculateCommissions(saleAmount: number, _typeService?: string) {
  // Logic standard
  const salesRepPercentage = 10;
  const collaboratorPercentage = 60;
  
  return {
    salesRepAmount: saleAmount * (salesRepPercentage / 100),
    collaboratorAmount: saleAmount * (collaboratorPercentage / 100),
    salesRepPercentage,
    collaboratorPercentage
  };
}

export async function generateCommission(
  invoiceId: string, 
  saleData: {
    saleAmount: number;
    salesRepId?: string;
    collaboratorId?: string;
  }
): Promise<string> {
  const percentuais = calculateCommissions(saleData.saleAmount);
  
  const id = getCommissionDocId(invoiceId);

  const commission: Omit<Commission, 'id'> = {
    invoiceId,
    salesRepId: saleData.salesRepId,
    collaboratorId: saleData.collaboratorId,
    saleAmount: saleData.saleAmount,
    salesRepPercentage: percentuais.salesRepPercentage,
    collaboratorPercentage: percentuais.collaboratorPercentage,
    salesRepAmount: percentuais.salesRepAmount,
    collaboratorAmount: percentuais.collaboratorAmount,
    status: 'pending',
    createdAt: new Date()
  };

  await setDoc(doc(db, 'commissions', id), commission);
  return id;
}

export async function getCommissions(userId: string, type: 'salesRep' | 'collaborator'): Promise<Commission[]> {
  const queryField = type === 'salesRep' ? 'salesRepId' : 'collaboratorId';
  const q = query(collection(db, 'commissions'), where(queryField, '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Commission));
}

export async function markCommissionPaid(id: string): Promise<void> {
  await updateDoc(doc(db, 'commissions', id), {
    status: 'paid'
  });
}

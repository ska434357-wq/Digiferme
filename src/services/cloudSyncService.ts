import { signInWithPopup, signOut } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import { SaaSUserAccount, UserWorkspaceSnapshot } from '../types';

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120);
  return cleaned.length > 0 ? cleaned : `id-${Date.now()}`;
}

function sanitizeCode(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 32);
  return cleaned.length >= 4 ? cleaned : 'FF-CODE';
}

function mapPaymentMethod(method: string): 'wave' | 'orange_money' | 'mtn_momo' | 'moov_money' | 'cash' {
  if (method === 'moov') return 'moov_money';
  if (
    method === 'wave' ||
    method === 'orange_money' ||
    method === 'mtn_momo' ||
    method === 'moov_money' ||
    method === 'cash'
  ) {
    return method;
  }
  return 'cash';
}

export async function signInWithGoogleCloud() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutGoogleCloud() {
  await signOut(auth);
}

export async function syncAccessCodeToFirestore(account: SaaSUserAccount): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;

  const codeId = sanitizeId(account.id);
  const path = `accessCodes/${codeId}`;

  try {
    const ref = doc(db, 'accessCodes', codeId);
    const existingSnap = await getDoc(ref);
    const payload = {
      code: sanitizeCode(account.code),
      userId: sanitizeId(account.id),
      ownerUid: sanitizeId(user.uid),
      farmerName: account.farmerName.trim().slice(0, 120) || 'Éleveur',
      farmName: account.farmName.trim().slice(0, 120) || 'Ferme Avicole',
      phone: account.phone.trim().slice(0, 30) || '00000000',
      country: account.country,
      plan: account.plan,
      status: account.status,
      paymentMethod: mapPaymentMethod(account.paymentMethod),
      amountFCFA: Math.max(0, Number(account.amountFCFA) || 0),
      durationDays: Math.max(1, Math.min(366, Math.round(account.durationDays || 30))),
      expiresAtMs: Math.max(1, Math.round(account.expiresAtMs || Date.now() + 86400000)),
      updatedAt: serverTimestamp(),
    };

    if (existingSnap.exists()) {
      await updateDoc(ref, {
        plan: payload.plan,
        status: payload.status,
        expiresAtMs: payload.expiresAtMs,
        durationDays: payload.durationDays,
        amountFCFA: payload.amountFCFA,
        paymentMethod: payload.paymentMethod,
        farmerName: payload.farmerName,
        farmName: payload.farmName,
        phone: payload.phone,
        country: payload.country,
        ownerUid: payload.ownerUid,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchMyAccessCodesFromFirestore(): Promise<SaaSUserAccount[]> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return [];

  const path = 'accessCodes';
  try {
    const q = query(collection(db, 'accessCodes'), where('ownerUid', '==', user.uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: String(data.userId || d.id),
        code: String(data.code || ''),
        farmerName: String(data.farmerName || ''),
        farmName: String(data.farmName || ''),
        phone: String(data.phone || ''),
        country: data.country || 'CI',
        plan: data.plan || 'mensuel',
        status: data.status || 'active',
        paymentMethod: data.paymentMethod || 'wave',
        amountFCFA: Number(data.amountFCFA || 0),
        durationDays: Number(data.durationDays || 30),
        createdAtMs: Date.now(),
        expiresAtMs: Number(data.expiresAtMs || Date.now()),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function subscribeMyWorkspaces(
  onUpdate: (count: number) => void,
  onErr?: (err: Error) => void
): Unsubscribe | null {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return null;

  const path = 'workspaces';
  const q = query(collection(db, 'workspaces'), where('ownerUid', '==', user.uid));
  return onSnapshot(
    q,
    (snapshot) => {
      onUpdate(snapshot.size);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onErr && wrapped instanceof Error) {
          onErr(wrapped);
        }
      }
    }
  );
}

export async function syncWorkspaceToFirestore(
  account: SaaSUserAccount,
  snapshot: UserWorkspaceSnapshot
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;

  const workspaceId = sanitizeId(account.id);
  const workspacePath = `workspaces/${workspaceId}`;

  try {
    const wsRef = doc(db, 'workspaces', workspaceId);
    const existingWs = await getDoc(wsRef);

    if (existingWs.exists()) {
      await updateDoc(wsRef, {
        farmerName: account.farmerName.trim().slice(0, 120) || 'Éleveur',
        farmName: account.farmName.trim().slice(0, 120) || 'Ferme Avicole',
        country: snapshot.country,
        themeMode: snapshot.themeMode,
        isAudioEnabled: Boolean(snapshot.isAudioEnabled),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(wsRef, {
        workspaceId,
        ownerUid: sanitizeId(user.uid),
        accessCode: sanitizeCode(account.code),
        farmerName: account.farmerName.trim().slice(0, 120) || 'Éleveur',
        farmName: account.farmName.trim().slice(0, 120) || 'Ferme Avicole',
        country: snapshot.country,
        themeMode: snapshot.themeMode,
        isAudioEnabled: Boolean(snapshot.isAudioEnabled),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // Sync up to 10 most recent batches to stay lean
    for (const batch of snapshot.batches.slice(0, 10)) {
      const batchId = sanitizeId(batch.id);
      const batchRef = doc(db, 'workspaces', workspaceId, 'batches', batchId);
      const batchSnap = await getDoc(batchRef);
      const status = batch.status === 'archived' ? 'completed' : batch.status;
      if (batchSnap.exists()) {
        if (batchSnap.data()?.status === 'completed') {
          continue;
        }
        await updateDoc(batchRef, {
          name: batch.name.slice(0, 140) || 'Lot',
          status,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(batchRef, {
          id: batchId,
          workspaceId,
          ownerUid: sanitizeId(user.uid),
          name: batch.name.slice(0, 140) || 'Lot',
          startDate: batch.startDate.slice(0, 32),
          initialChicks: Math.max(1, Math.min(100000, Math.round(batch.initialChicks))),
          pricePerChickFCFA: Math.max(0, Number(batch.pricePerChickFCFA) || 0),
          breed: batch.breed.slice(0, 64),
          supplier: batch.supplier.slice(0, 120) || 'Couvoir',
          status,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, workspacePath);
  }
}

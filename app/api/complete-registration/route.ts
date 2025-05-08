import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { firebaseApp } from '@/lib/firebase'; 

const db = getFirestore(firebaseApp);

export async function POST(req: NextRequest) {
  const { token, uid, email } = await req.json();

  if (!token || !uid || !email) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const q = query(collection(db, 'registrationTokens'), where('token', '==', token));
  const snap = await getDocs(q);

  if (snap.empty) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
  }

  const tokenDoc = snap.docs[0];
  const data = tokenDoc.data();

  if (data.used) {
    return NextResponse.json({ error: 'Token already used' }, { status: 400 });
  }

  // Mark token as used
  await updateDoc(tokenDoc.ref, { used: true, usedBy: uid, usedAt: new Date() });

  // Link user to purchase
  await setDoc(doc(db, 'users', uid), {
    email,
    purchases: [
      ...(data.productId ? [{ productId: data.productId, orderId: data.orderId, purchasedAt: data.createdAt }] : [])
    ],
  }, { merge: true });

  return NextResponse.json({ success: true });
}
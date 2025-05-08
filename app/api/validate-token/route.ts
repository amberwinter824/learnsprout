import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { firebaseApp } from '@/lib/firebase'; // Adjust path if needed

const db = getFirestore(firebaseApp);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  const q = query(collection(db, 'registrationTokens'), where('token', '==', token));
  const snap = await getDocs(q);

  if (snap.empty) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
  }

  const doc = snap.docs[0];
  const data = doc.data();

  if (data.used) {
    return NextResponse.json({ error: 'Token already used' }, { status: 400 });
  }

  return NextResponse.json({
    email: data.email,
    productId: data.productId,
    orderId: data.orderId,
  });
}
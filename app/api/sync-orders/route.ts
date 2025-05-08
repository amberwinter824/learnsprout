import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { firebaseApp } from '@/lib/firebase';
import { sendRegistrationEmail } from '@/lib/emailService';

const db = getFirestore(firebaseApp);

const SQUARESPACE_API_KEY = process.env.SQUARESPACE_API_KEY;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://learnsprout.vercel.app';

export async function GET(req: NextRequest) {
  // Security: Only allow requests with the correct CRON_SECRET
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Fetch orders from Squarespace
  const { data } = await axios.get(
    'https://api.squarespace.com/1.0/commerce/orders',
    {
      headers: {
        'Authorization': `Bearer ${SQUARESPACE_API_KEY}`,
        'User-Agent': 'LearnSproutOrderSync/1.0',
        'X-Squarespace-Api-Key': SQUARESPACE_API_KEY,
      }
    }
  );

  const orders = data.result;

  let processed = 0;
  for (const order of orders) {
    const email = order.customerEmail;
    const productId = order.lineItems[0]?.productId;
    const orderId = order.id;

    // 2. Check if already processed
    const q = query(collection(db, 'registrationTokens'), where('orderId', '==', orderId));
    const existing = await getDocs(q);
    if (!email || !productId || !orderId || !order.lineItems.length) continue;
    if (!existing.empty) continue;

    // 3. Generate token and store
    const token = uuidv4();
    await addDoc(collection(db, 'registrationTokens'), {
      token,
      email,
      productId,
      orderId,
      used: false,
      createdAt: new Date()
    });

    // 4. Send registration email
    const registrationUrl = `${BASE_URL}/signup?token=${token}`;
    await sendRegistrationEmail(email, registrationUrl);
    processed++;
  }

  return NextResponse.json({ success: true, processed });
} 
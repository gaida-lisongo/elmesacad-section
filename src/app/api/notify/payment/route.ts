// /app/notify/payment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function POST(req: NextRequest) {
  try {
    const commande = await req.json();

    // Structuration du payload pour le chef de section
    const notificationPayload = {
      type: 'PAYMENT_VALIDATED',
      timestamp: new Date().toISOString(),
      commande
    };

    // Publication dans le stream des chefs de section
    await redis.xadd('stream:payment', '*', notificationPayload);

    return NextResponse.json({ success: true, message: 'Notification envoyée au chef de section' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}
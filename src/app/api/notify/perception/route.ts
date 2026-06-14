// /app/notify/perception/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function POST(req: NextRequest) {
  try {
    const commande = await req.json();

    // Structuration du payload pour le percepteur
    const notificationPayload = {
      type: 'NEW_PAYMENT_SLIP',
      timestamp: new Date().toISOString(),
      commande
    };

    // Publication dans le stream des percepteurs
    await redis.xadd('stream:perception', '*', notificationPayload);

    return NextResponse.json({ success: true, message: 'Notification envoyée aux percepteurs' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}
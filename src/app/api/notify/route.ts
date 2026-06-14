// /app/notify/route.ts
import { NextRequest } from 'next/server';
import { Redis } from '@upstash/redis';

export const runtime = 'edge'; // Utiliser le runtime Edge pour éviter les timeouts Serverless

const redis = Redis.fromEnv();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const channel = searchParams.get('channel');

  if (!channel) return new Response('Channel manquant', { status: 400 });

  const responseStream = new ReadableStream({
    async start(controller) {
      const sendMessage = (data: any) => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      };

      // Avec Upstash, on utilise les Serverless Streams ou une boucle de lecture (polling ultra-rapide)
      // Car les connexions TCP persistantes classiques (comme node-redis) ne fonctionnent pas en Edge/Serverless
      let lastId = '$'; 

      const interval = setInterval(async () => {
        try {
          // On lit les nouveaux messages arrivés dans le flux Redis depuis le dernier ID
          const results: any[] = await redis.xread(
            [`stream:${channel}`],
            [lastId],
            { count: 10, blockMS: 1000 }
          );

          if (results && results.length > 0) {
            const messages = results[0][1];
            for (const msg of messages) {
              lastId = msg[0]; // On met à jour l'ID pour ne pas relire le même message
              sendMessage(msg[1]); // msg[1] contient les données de la notification
            }
          }
        } catch (err) {
          console.error("Erreur de lecture Redis Stream:", err);
        }
      }, 1000); // Vérification toutes les secondes (très léger sur Redis)

      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
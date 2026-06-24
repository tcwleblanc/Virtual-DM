import PusherServer from 'pusher';
import PusherClient from 'pusher-js';

// 1. Extend the global NodeJS namespace to include our Pusher Client
declare global {
  var pusherClient: PusherClient | undefined;
}

// 2. The Server instance
export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

// 3. The Client instance with the singleton pattern
export const pusherClient = 
  global.pusherClient || 
  new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  });

if (process.env.NODE_ENV !== 'production') global.pusherClient = pusherClient;
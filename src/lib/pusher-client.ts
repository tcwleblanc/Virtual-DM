// Import default Pusher class
import Pusher from 'pusher-js';

// Ensure this only initializes in the browser, preventing SSR crashes
export const pusherClient = typeof window !== 'undefined' 
  ? new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })
  : ({} as any); // Provide a dummy object during server evaluation
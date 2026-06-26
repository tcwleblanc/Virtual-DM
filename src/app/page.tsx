import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

export default async function SplashPage() {
  // Check authentication status on the server
  const { userId } = await auth();
  
  // If the user is already logged in, skip the splash screen
  if (userId) {
    redirect('/dashboard');
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-zinc-950 overflow-hidden">
      {/* Background visual flair */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-zinc-950 to-zinc-950"></div>
      
      <div className="relative z-10 max-w-4xl px-6 text-center flex flex-col items-center">
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-red-500 via-orange-500 to-amber-500 mb-6 drop-shadow-2xl">
          FORGE YOUR WORLD
        </h1>
        
        <p className="text-xl md:text-2xl text-zinc-300 mb-12 font-medium max-w-2xl leading-relaxed">
          An infinite virtual tabletop powered by advanced AI. Build campaigns, manage characters, and experience campaigns where the only limit is your imagination.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link
            href="/sign-in"
            className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-[0_0_30px_rgba(79,70,229,0.2)] hover:shadow-[0_0_40px_rgba(79,70,229,0.4)] text-lg"
          >
            Enter the Tavern
          </Link>
          <Link
            href="/sign-up"
            className="px-10 py-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold rounded-xl transition-all text-lg"
          >
            Create Player Profile
          </Link>
        </div>
      </div>
    </main>
  );
}
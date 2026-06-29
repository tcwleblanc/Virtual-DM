import type { Metadata } from "next";
import { ClerkProvider, SignInButton, UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server'; // 1. Import the server-side auth helper
import "./globals.css";
import MainNav from "@/components/MainNav"; 

export const metadata: Metadata = {
  title: "AI DM VTT",
  description: "An AI-powered Virtual Tabletop",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 2. Fetch the current user's authentication state on the server
  const { userId } = await auth();

  return (
    <ClerkProvider>
      <html lang="en">
        <body className="bg-neutral-950 text-neutral-200 antialiased h-screen flex flex-col">
          
          <header className="flex justify-between items-center p-4 bg-neutral-900 border-b border-neutral-800 shadow-md z-50">
            <h1 className="text-xl font-bold tracking-widest text-indigo-400">AI DM ARCHITECT</h1>
            <div>
              {/* 3. Standard React conditional rendering based on userId */}
              {userId ? (
                // If userId exists (User is logged in)
                <UserButton appearance={{ elements: { avatarBox: "w-10 h-10" } }} />
              ) : (
                // If userId is null (User is logged out)
                <SignInButton mode="modal" fallbackRedirectUrl="/dashboard">
                  <button className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg transition-colors">
                    Sign In
                  </button>
                </SignInButton>
              )}
            </div>
          </header>

          <div className="px-4 pt-4 shrink-0">
             <MainNav />
          </div>

          <main className="flex-1 overflow-hidden">
            {children}
          </main>

        </body>
      </html>
    </ClerkProvider>
  );
}
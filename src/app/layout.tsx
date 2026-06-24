import type { Metadata } from "next";
import { ClerkProvider, SignInButton, Show, UserButton } from '@clerk/nextjs'
import "./globals.css";

export const metadata: Metadata = {
  title: "AI DM VTT",
  description: "An AI-powered Virtual Tabletop",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="bg-neutral-950 text-neutral-200 antialiased h-screen flex flex-col">
          
          {/* Top Navigation Bar */}
          <header className="flex justify-between items-center p-4 bg-neutral-900 border-b border-neutral-800 shadow-md">
            <h1 className="text-xl font-bold tracking-widest text-indigo-400">AI DM ARCHITECT</h1>
            
            {/* Clerk Authentication UI */}
            <div>
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-md font-bold transition-colors">
                    Enter the Realm
                  </button>
                </SignInButton>
              </Show>
              <Show when="signed-in">
                <UserButton appearance={{ elements: { avatarBox: "w-10 h-10" } }} />
              </Show>
            </div>
          </header>

          {/* The Main Application Content */}
          <main className="flex-1 overflow-hidden">
            {children}
          </main>

        </body>
      </html>
    </ClerkProvider>
  );
}
import type { Metadata } from "next";
import { ClerkProvider, SignInButton, Show, UserButton } from '@clerk/nextjs'
import "./globals.css";
import MainNav from "@/components/MainNav"; // 1. Import the Nav

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
          
          <header className="flex justify-between items-center p-4 bg-neutral-900 border-b border-neutral-800 shadow-md z-50">
            <h1 className="text-xl font-bold tracking-widest text-indigo-400">AI DM ARCHITECT</h1>
            <div>
              <Show when="signed-out">
                {/* ... */}
              </Show>
              <Show when="signed-in">
                <UserButton appearance={{ elements: { avatarBox: "w-10 h-10" } }} />
              </Show>
            </div>
          </header>

          {/* 2. Add the navigation directly under the header */}
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
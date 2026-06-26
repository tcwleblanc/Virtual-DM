'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Map, Users, PlusCircle } from 'lucide-react';

interface MainNavProps {
  // Allows you to pass custom Tailwind classes (like 'flex-col' for a sidebar or 'w-full' for a top bar)
  className?: string; 
}

export default function MainNav({ className = '' }: MainNavProps) {
  const pathname = usePathname();

  const navLinks = [
    {
      name: 'My Campaigns',
      href: '/dashboard',
      icon: Map,
      description: 'Your active worlds'
    },
    {
      name: 'My Characters',
      href: '/characters', // Note: You will need to create a src/app/characters/page.tsx for this!
      icon: Users,
      description: 'Your hero roster'
    },
    {
      name: 'Forge New World',
      href: '/campaign/new',
      icon: PlusCircle,
      description: 'Start a new adventure'
    }
  ];

  return (
    <nav className={`flex gap-2 p-2 bg-neutral-900/50 backdrop-blur-md border border-neutral-800 rounded-2xl shadow-lg ${className}`}>
      {navLinks.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href;

        return (
          <Link
            key={link.name}
            href={link.href}
            className={`
              relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all group
              ${isActive 
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/30' 
                : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 border border-transparent'
              }
            `}
          >
            <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-indigo-400' : 'text-neutral-500'}`} />
            
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-wide">{link.name}</span>
              {/* Optional: A tiny sub-label that appears on hover or active states */}
              <span className={`text-[10px] uppercase tracking-wider transition-opacity ${isActive ? 'opacity-100 text-indigo-500/70' : 'opacity-0 group-hover:opacity-100 text-neutral-500'}`}>
                {link.description}
              </span>
            </div>

            {/* Glowing dot indicator for the active tab */}
            {isActive && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
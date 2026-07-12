'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Map,
  MessageSquare,
  FileText,
  Mic,
  BookOpen,
  LineChart,
  ClipboardList,
  Settings,
  GraduationCap
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/roadmap', label: 'Roadmap', icon: Map },
  { href: '/tutor', label: 'AI Tutor', icon: MessageSquare },
  { href: '/writing', label: 'Writing Evaluation', icon: FileText },
  { href: '/reading', label: 'Reading Practice', icon: BookOpen },
  { href: '/speaking', label: 'Speaking Evaluation', icon: Mic },
  { href: '/vocabulary', label: 'Vocabulary Builder', icon: BookOpen },
  { href: '/mock-test', label: 'Mock Test Center', icon: ClipboardList },
  { href: '/analytics', label: 'Analytics', icon: LineChart },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border bg-card/50 backdrop-blur-sm hidden md:flex flex-col h-[calc(100vh-73px)] sticky top-[73px] p-4 space-y-2 justify-between">
      <div className="flex flex-col space-y-1">
        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Learning Center
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border border-transparent",
                isActive
                  ? "bg-primary/10 text-primary border-primary/20 shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="bg-secondary/40 border border-border p-4 rounded-2xl flex flex-col items-center text-center space-y-3">
        <GraduationCap className="h-10 w-10 text-primary animate-pulse" />
        <div>
          <h4 className="text-sm font-semibold">Stuck on a Topic?</h4>
          <p className="text-xs text-muted-foreground mt-1">Ask the IELTS AI Tutor for explanations and examples!</p>
        </div>
        <Link
          href="/tutor"
          className="w-full bg-primary hover:bg-primary/95 text-primary-foreground text-xs py-2 rounded-xl font-semibold transition-all"
        >
          Ask Tutor
        </Link>
      </div>
    </aside>
  );
}

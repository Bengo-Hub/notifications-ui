'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-slate-200/50 dark:border-white/5 bg-white/50 dark:bg-brand-dark/50 backdrop-blur-md py-6 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500 dark:text-brand-beige/40">
        <span className="tracking-wide">All Rights Reserved. Codevertex IT Solutions &copy; {new Date().getFullYear()}.</span>
        <a
          href="https://codevertexitsolutions.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 group transition-all"
        >
          <span className="opacity-70 group-hover:opacity-100 transition-opacity">Powered by</span>
          <span className="font-black text-slate-900 dark:text-brand-orange uppercase tracking-tighter transition-all group-hover:scale-105">Codevertex IT Solutions</span>
          <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-brand-orange" />
        </a>
      </div>
    </footer>
  );
}

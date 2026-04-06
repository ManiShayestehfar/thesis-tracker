'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTheme } from './ThemeProvider';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '⬡' },
  { href: '/chapters', label: 'Chapters', icon: '§' },
  { href: '/proofs', label: 'Proofs', icon: '∴' },
  { href: '/log', label: 'Research Log', icon: '✏' },
  { href: '/references', label: 'References', icon: '⊕' },
  { href: '/milestones', label: 'Milestones', icon: '◎' },
  { href: '/notation', label: 'Notation', icon: 'Σ' },
];

interface Props {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: Props) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [title, setTitle] = useState('');

  useEffect(() => {
    fetch('/api/thesis')
      .then(r => r.json())
      .then(j => { if (j.data?.title) setTitle(j.data.title); })
      .catch(() => {});
  }, []);

  return (
    <aside className="w-full flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 h-full">
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <p className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1">Thesis</p>
        <h1 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 leading-snug">
          {title || 'Thesis Tracker'}
        </h1>
      </div>

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-medium'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
            >
              <span className="w-4 text-center font-mono text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-neutral-200 dark:border-neutral-800">
        <button
          onClick={toggle}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          <span>{theme === 'dark' ? '☀' : '☽'}</span>
        </button>
      </div>
    </aside>
  );
}

'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationItem {
  label: string;
  href: string;
  external?: boolean;
}

// This would normally come from your settings/database
const defaultNavigation: NavigationItem[] = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contact', href: '/contact' },
];

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [navigation] = useState<NavigationItem[]>(defaultNavigation);

  // Initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && systemPreference);
    
    setIsDarkMode(shouldBeDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
  }, []);

  // Toggle theme
  const toggleTheme = () => {
    const newIsDarkMode = !isDarkMode;
    setIsDarkMode(newIsDarkMode);
    localStorage.setItem('theme', newIsDarkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newIsDarkMode);
  };

  // In a real app, you would fetch navigation from your settings
  useEffect(() => {
    // TODO: Fetch navigation items from settings database
    // const fetchNavigation = async () => {
    //   try {
    //     const navSettings = await getAllSettings('navigation');
    //     // Process navigation settings and update state
    //   } catch (error) {
    //     console.error('Failed to fetch navigation:', error);
    //   }
    // };
    // fetchNavigation();
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link 
            href="/" 
            className="text-xl font-bold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Modern CMS
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className={cn(
          'md:hidden overflow-hidden transition-all duration-300 ease-in-out',
          isMenuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
        )}>
          <nav className="py-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                className="block py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
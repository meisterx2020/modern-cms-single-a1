import Link from 'next/link';
import { Github, Twitter, Linkedin, Mail } from 'lucide-react';

const socialLinks = [
  { name: 'GitHub', href: 'https://github.com', icon: Github },
  { name: 'Twitter', href: 'https://twitter.com', icon: Twitter },
  { name: 'LinkedIn', href: 'https://linkedin.com', icon: Linkedin },
  { name: 'Email', href: 'mailto:hello@example.com', icon: Mail },
];

const footerLinks = {
  'Product': [
    { name: 'Features', href: '/features' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Documentation', href: '/docs' },
    { name: 'API', href: '/api' },
  ],
  'Company': [
    { name: 'About', href: '/about' },
    { name: 'Blog', href: '/blog' },
    { name: 'Careers', href: '/careers' },
    { name: 'Contact', href: '/contact' },
  ],
  'Support': [
    { name: 'Help Center', href: '/help' },
    { name: 'Community', href: '/community' },
    { name: 'Status', href: '/status' },
    { name: 'Updates', href: '/updates' },
  ],
  'Legal': [
    { name: 'Privacy', href: '/privacy' },
    { name: 'Terms', href: '/terms' },
    { name: 'Security', href: '/security' },
    { name: 'Cookies', href: '/cookies' },
  ],
};

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <Link 
              href="/" 
              className="text-xl font-bold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Modern CMS
            </Link>
            <p className="mt-4 text-gray-600 dark:text-gray-300 max-w-md">
              A modern, flexible content management system built with Next.js, TypeScript, and modern web technologies.
            </p>
            
            {/* Social Links */}
            <div className="mt-6 flex space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label={social.name}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Footer Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-wider uppercase">
                {category}
              </h3>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              © {currentYear} Modern CMS. All rights reserved.
            </p>
            
            <div className="flex items-center space-x-6 text-sm">
              <Link 
                href="/privacy" 
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                Privacy Policy
              </Link>
              <Link 
                href="/terms" 
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
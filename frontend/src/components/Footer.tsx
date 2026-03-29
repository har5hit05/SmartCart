import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 text-gray-700">
            <ShoppingCart className="h-5 w-5 text-indigo-600" />
            <span className="font-semibold">SmartCart</span>
          </div>

          <p className="text-sm text-gray-500">
            Built with React, Node.js, PostgreSQL &amp; AI
          </p>

          <div className="flex gap-6 text-sm">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 transition hover:text-indigo-600"
            >
              GitHub
            </a>
            <Link
              to="/api/docs"
              className="text-gray-500 transition hover:text-indigo-600"
            >
              API Docs
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} SmartCart. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

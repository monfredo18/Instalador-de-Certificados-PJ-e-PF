import React from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Sun, Moon } from 'lucide-react';

export interface AppLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  title: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ sidebar, children, title }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans">
      <aside className="w-64 flex-shrink-0 bg-sidebar-light dark:bg-sidebar-dark border-r border-gray-200 dark:border-gray-800 flex flex-col h-full overflow-y-auto hidden md:flex">
        {sidebar}
      </aside>

      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <h1 className="text-xl font-semibold truncate">{title}</h1>
          
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? <Sun size={20} className="text-gray-400 hover:text-yellow-400" /> : <Moon size={20} className="text-gray-500 hover:text-indigo-600" />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-950">
          {children}
        </main>
      </div>
    </div>
  );
};

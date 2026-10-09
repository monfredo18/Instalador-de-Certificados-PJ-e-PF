import React from 'react';
import * as Tabs from '@radix-ui/react-tabs';

export interface TabItem {
  value: string;
  label: string;
  count?: number;
}

export interface TabGroupProps {
  tabs: TabItem[];
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}

export const TabGroup: React.FC<TabGroupProps> = ({ tabs, value, onChange, children }) => {
  return (
    <Tabs.Root value={value} onValueChange={onChange} className="w-full flex flex-col">
      <Tabs.List className="flex border-b border-gray-200 dark:border-gray-700 w-full mb-6">
        {tabs.map((tab) => (
          <Tabs.Trigger
            key={tab.value}
            value={tab.value}
            className="flex-1 sm:flex-none px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary dark:data-[state=active]:text-primary transition-all duration-200 flex items-center justify-center space-x-2 focus:outline-none"
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                {tab.count}
              </span>
            )}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {children}
    </Tabs.Root>
  );
};

export const TabPanel = Tabs.Content;

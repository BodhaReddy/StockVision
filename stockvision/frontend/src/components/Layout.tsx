import React from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex h-screen overflow-hidden bg-page text-ink font-sans transition-colors">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <Navbar />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

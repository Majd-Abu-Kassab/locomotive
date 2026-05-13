'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import './app-layout.css';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="app-layout">
            <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
            {mobileMenuOpen && (
                <div 
                    className="mobile-overlay" 
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}
            <div className="app-main">
                <Topbar onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />
                <main className="app-content">
                    {children}
                </main>
            </div>
        </div>
    );
}

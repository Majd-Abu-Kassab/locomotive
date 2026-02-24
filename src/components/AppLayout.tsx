'use client';

import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import './app-layout.css';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="app-layout">
            <Sidebar />
            <div className="app-main">
                <Topbar />
                <main className="app-content">
                    {children}
                </main>
            </div>
        </div>
    );
}

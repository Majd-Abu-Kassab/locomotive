'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    FileEdit,
    Rocket,
    Calendar,
    BookOpen,
    FlaskConical,
    Atom,
    Calculator,
    Puzzle,
    Globe2,
    BookOpenCheck,
    BarChart3,
    ClipboardList,
    HelpCircle,
    MessageSquare,
    Crown,
    ChevronLeft,
    ChevronRight,
    GraduationCap,
    Settings,
    Receipt,
    X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import './Sidebar.css';

const navItems = [
    {
        category: 'CORE',
        items: [
            { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
            { name: 'Create Test', href: '/create-test', icon: FileEdit },
            { name: 'IMAT Starter Pack', href: '/starter-pack', icon: Rocket },
        ],
    },
    {
        category: 'STUDY',
        items: [
            { name: 'Schedule', href: '/schedule', icon: Calendar },
            { name: 'Biology', href: '/courses/biology', icon: BookOpen },
            { name: 'Chemistry', href: '/courses/chemistry', icon: FlaskConical },
            { name: 'Physics', href: '/courses/physics', icon: Atom },
            { name: 'Mathematics', href: '/courses/mathematics', icon: Calculator },
            { name: 'Logic', href: '/courses/logic', icon: Puzzle },
            { name: 'General Knowledge', href: '/courses/general-knowledge', icon: Globe2 },
            { name: 'Reading', href: '/courses/reading-comprehension', icon: BookOpenCheck },
        ],
    },
    {
        category: 'REVIEW',
        items: [
            { name: 'Performance', href: '/analytics', icon: BarChart3 },
            { name: 'Previous Tests', href: '/previous-tests', icon: ClipboardList },
        ],
    },
    {
        category: 'SUPPORT',
        items: [
            { name: 'FAQs', href: '/faq', icon: HelpCircle },
            { name: 'Contact Support', href: '/contact', icon: MessageSquare },
            { name: 'Order History', href: '/order-history', icon: Receipt },
            { name: 'Upgrade Plan', href: '/upgrade', icon: Crown },
        ],
    },
];

const adminItems = {
    category: 'ADMIN',
    items: [
        { name: 'Admin Panel', href: '/admin', icon: Settings },
    ],
};

interface SidebarProps {
    mobileMenuOpen?: boolean;
    setMobileMenuOpen?: (open: boolean) => void;
}

export default function Sidebar({ mobileMenuOpen, setMobileMenuOpen }: SidebarProps) {
    const [collapsed, setCollapsed] = useState(false);
    const pathname = usePathname();
    const { profile } = useAuth();

    const trialDays = profile?.trial_days_remaining ?? 0;
    const isPaidPlan = profile?.plan && profile.plan !== 'free-trial';

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <div className="sidebar-header">
                <Link href="/dashboard" className="sidebar-logo">
                    <div className="logo-icon">
                        <GraduationCap size={24} />
                    </div>
                    {!collapsed && <span className="logo-text">LOCOMOTIVE</span>}
                </Link>
                <button
                    className="collapse-btn desktop-only"
                    onClick={() => setCollapsed(!collapsed)}
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
                {setMobileMenuOpen && (
                    <button
                        className="collapse-btn mobile-only"
                        onClick={() => setMobileMenuOpen(false)}
                        aria-label="Close sidebar"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            <nav className="sidebar-nav">
                {navItems.map((section) => (
                    <div key={section.category} className="nav-section">
                        {!collapsed && <span className="nav-category">{section.category}</span>}
                        <ul className="nav-list">
                            {section.items.map((item) => {
                                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                                const Icon = item.icon;
                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            className={`nav-item ${isActive ? 'active' : ''} ${item.name === 'Upgrade Plan' ? 'upgrade-item' : ''}`}
                                            title={collapsed ? item.name : undefined}
                                            onClick={() => setMobileMenuOpen && setMobileMenuOpen(false)}
                                        >
                                            <Icon size={18} />
                                            {!collapsed && <span>{item.name}</span>}
                                            {isActive && <div className="active-indicator" />}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}

                {!!profile?.admin_role && (
                    <div className="nav-section">
                        {!collapsed && <span className="nav-category">{adminItems.category}</span>}
                        <ul className="nav-list">
                            {adminItems.items.map((item) => {
                                const isActive = pathname === item.href;
                                const Icon = item.icon;
                                return (
                                    <li key={item.href}>
                                        <Link 
                                            href={item.href} 
                                            className={`nav-item ${isActive ? 'active' : ''}`} 
                                            title={collapsed ? item.name : undefined}
                                            onClick={() => setMobileMenuOpen && setMobileMenuOpen(false)}
                                        >
                                            <Icon size={18} />
                                            {!collapsed && <span>{item.name}</span>}
                                            {isActive && <div className="active-indicator" />}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </nav>

            {!collapsed && !isPaidPlan && (
                <div className="sidebar-footer">
                    <div className="trial-badge">
                        <Crown size={14} />
                        <span>{trialDays} day{trialDays !== 1 ? 's' : ''} left on trial</span>
                    </div>
                </div>
            )}
        </aside>
    );
}


'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    FileEdit,
    Rocket,
    Calendar,
    BookOpen,
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
import { useSupabase } from '@/contexts/SupabaseContext';
import { getCourses, CourseWithModules } from '@/lib/api';
import './Sidebar.css';

const baseNavItems = [
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
    const supabase = useSupabase();
    const [courses, setCourses] = useState<CourseWithModules[]>([]);

    useEffect(() => {
        getCourses(supabase).then(setCourses).catch(console.error);
    }, [supabase]);

    // Dynamically insert courses into the STUDY category
    const navItems = baseNavItems.map(section => {
        if (section.category === 'STUDY') {
            const dynamicCourses = courses.map(course => ({
                name: course.name,
                href: `/courses/${course.id}`,
                emoji: course.icon || '📚',
            }));
            return {
                ...section,
                items: [...section.items, ...dynamicCourses]
            };
        }
        return section;
    });

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
                            {section.items.map((item: any) => {
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
                                            {Icon ? <Icon size={18} /> : <span style={{ fontSize: '18px', width: '18px', display: 'inline-block', textAlign: 'center' }}>{item.emoji}</span>}
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

        </aside>
    );
}

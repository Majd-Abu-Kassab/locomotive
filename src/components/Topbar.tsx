'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Search, Bell, User, ChevronDown, LogOut, Settings, BookOpen, HelpCircle, X, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/contexts/SupabaseContext';
import { useAbortController, isAbortError } from '@/hooks/useAbortController';
import { getCourses, CourseWithModules, getNotifications, markNotificationAsRead, markAllNotificationsAsRead, NotificationRow } from '@/lib/api';
import './Topbar.css';

interface SearchResult {
    type: 'course' | 'topic' | 'module';
    label: string;
    tag: string;
    href: string;
    icon: React.ReactNode;
}

interface TopbarProps {
    onMenuToggle?: () => void;
}

export default function Topbar({ onMenuToggle }: TopbarProps) {
    const { profile, user, signOut } = useAuth();
    const supabase = useSupabase();
    const { getSignal } = useAbortController();
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [allData, setAllData] = useState<CourseWithModules[]>([]);
    const [showSearch, setShowSearch] = useState(false);
    const [notifications, setNotifications] = useState<NotificationRow[]>([]);
    const hasUnread = notifications.some(n => !n.is_read);
    const searchRef = useRef<HTMLDivElement>(null);

    // Fall back to email from auth user if profile not loaded yet
    const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
        || profile?.email?.split('@')[0]
        || user?.email?.split('@')[0]
        || 'User';
    const displayEmail = profile?.email || user?.email || '';

    // Load searchable data once
    useEffect(() => {
        const signal = getSignal();
        getCourses(supabase, undefined, signal)
            .then(setAllData)
            .catch(err => {
                if (!isAbortError(err)) console.error('Topbar search load error:', err);
            });
            
        if (user) {
            getNotifications(supabase, user.id, signal)
                .then(setNotifications)
                .catch(err => {
                    if (!isAbortError(err)) console.error('Notifications load error:', err);
                });
        }
    }, [supabase, user, getSignal]);

    // Close search on click outside
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowSearch(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Search logic
    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setSearchResults([]);
            setShowSearch(false);
            return;
        }

        const q = query.toLowerCase();
        const results: SearchResult[] = [];

        allData.forEach(course => {
            // Match courses
            if (course.name.toLowerCase().includes(q)) {
                results.push({
                    type: 'course',
                    label: course.name,
                    tag: 'Course',
                    href: `/courses/${course.id}`,
                    icon: <BookOpen size={14} />,
                });
            }

            course.modules.forEach(mod => {
                // Match modules
                if (mod.name.toLowerCase().includes(q)) {
                    results.push({
                        type: 'module',
                        label: mod.name,
                        tag: course.name,
                        href: `/courses/${course.id}`,
                        icon: <BookOpen size={14} />,
                    });
                }

                // Match topics
                mod.topics.forEach(topic => {
                    if (topic.name.toLowerCase().includes(q)) {
                        results.push({
                            type: 'topic',
                            label: topic.name,
                            tag: course.name,
                            href: `/courses/${course.id}/${topic.id}`,
                            icon: <HelpCircle size={14} />,
                        });
                    }
                });
            });
        });

        setSearchResults(results.slice(0, 8));
        setShowSearch(results.length > 0);
    }, [allData]);

    const handleSignOut = async () => {
        setShowDropdown(false);
        await signOut();
        window.location.href = '/login';
    };

    const markAllRead = async () => {
        if (!user) return;
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        await markAllNotificationsAsRead(supabase, user.id);
    };

    const handleNotificationClick = async (n: NotificationRow) => {
        if (!n.is_read) {
            setNotifications(prev => prev.map(notif => notif.id === n.id ? { ...notif, is_read: true } : notif));
            await markNotificationAsRead(supabase, n.id);
        }
        if (n.link) {
            window.location.href = n.link;
        }
    };

    return (
        <header className="topbar">
            <div className="topbar-left-actions">
                {onMenuToggle && (
                    <button 
                        className="mobile-menu-btn" 
                        onClick={onMenuToggle}
                        aria-label="Toggle menu"
                    >
                        <Menu size={20} />
                    </button>
                )}
            </div>
            
            <div className="topbar-search" ref={searchRef}>
                <Search size={18} className="search-icon" />
                <input
                    type="text"
                    className="search-input"
                    placeholder='Search topics, e.g. "Genetics", "Logic"...'
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => searchQuery.trim() && searchResults.length > 0 && setShowSearch(true)}
                />
                {searchQuery && (
                    <button
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4 }}
                        onClick={() => { setSearchQuery(''); setShowSearch(false); }}
                    >
                        <X size={14} />
                    </button>
                )}
                {showSearch && searchResults.length > 0 && (
                    <div className="search-results">
                        {searchResults.map((r, i) => (
                            <Link
                                key={i}
                                href={r.href}
                                className="search-result-item"
                                onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                            >
                                <span className="search-result-tag">{r.tag}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {r.icon} {r.label}
                                </span>
                            </Link>
                        ))}
                        <div style={{ padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                        </div>
                    </div>
                )}
                {showSearch && searchResults.length === 0 && searchQuery.trim() && (
                    <div className="search-results">
                        <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)' }}>
                            No results for &ldquo;{searchQuery}&rdquo;
                        </div>
                    </div>
                )}
            </div>

            <div className="topbar-actions">
                <div className="notification-wrapper">
                    <button
                        className="topbar-btn"
                        onClick={() => { setShowNotifications(!showNotifications); setShowDropdown(false); }}
                    >
                        <Bell size={18} />
                        {hasUnread && <span className="notification-dot" />}
                    </button>
                    {showNotifications && (
                        <div className="notification-dropdown">
                            <div className="notification-header">
                                <span className="font-semibold">Notifications</span>
                                <button
                                    className="text-sm text-accent"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand-accent-light)', fontSize: 'var(--fs-xs)' }}
                                    onClick={markAllRead}
                                    disabled={!hasUnread}
                                >
                                    Mark all read
                                </button>
                            </div>
                            {notifications.length === 0 ? (
                                <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)' }}>
                                    No notifications
                                </div>
                            ) : notifications.map((n) => (
                                <div key={n.id} className={`notification-item ${!n.is_read ? 'unread' : ''}`} onClick={() => handleNotificationClick(n)} style={{ cursor: n.link || !n.is_read ? 'pointer' : 'default' }}>
                                    <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', marginBottom: 2 }}>{n.title}</div>
                                    <p>{n.message}</p>
                                    <span className="notification-time">{new Date(n.created_at).toLocaleDateString()}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="user-menu-wrapper">
                    <button
                        className="user-menu-btn"
                        onClick={() => { setShowDropdown(!showDropdown); setShowNotifications(false); }}
                    >
                        <div className="user-avatar">
                            <User size={16} />
                        </div>
                        <span className="user-name">{displayName}</span>
                        <ChevronDown size={14} />
                    </button>
                    {showDropdown && (
                        <div className="user-dropdown">
                            <div className="dropdown-header">
                                <div className="user-avatar-lg"><User size={20} /></div>
                                <div>
                                    <div className="font-semibold">{displayName}</div>
                                    <div className="text-sm text-secondary">{displayEmail}</div>
                                </div>
                            </div>
                            <div className="dropdown-divider" />
                            <Link href="/profile" className="dropdown-item" onClick={() => setShowDropdown(false)}>
                                <Settings size={16} />
                                <span>Profile Settings</span>
                            </Link>
                            <button className="dropdown-item" onClick={handleSignOut} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', color: 'inherit', textAlign: 'left' }}>
                                <LogOut size={16} />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

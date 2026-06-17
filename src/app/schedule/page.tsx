'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalIcon, X, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/contexts/SupabaseContext';
import { useAbortController, isAbortError } from '@/hooks/useAbortController';
import { getScheduleEvents, saveScheduleEvent, deleteScheduleEvent, ScheduleEventRow } from '@/lib/api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function SchedulePage() {
    const { user } = useAuth();
    const supabase = useSupabase();
    const { getSignal } = useAbortController();
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [events, setEvents] = useState<ScheduleEventRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    const [newEvent, setNewEvent] = useState({ title: '', type: 'study' as 'study' | 'test' | 'dayoff', duration: '2h' });
    const [savingEvent, setSavingEvent] = useState(false);

    useEffect(() => {
        const signal = getSignal();
        async function load() {
            try {
                if (user) {
                    const data = await getScheduleEvents(supabase, user.id, signal);
                    setEvents(data);
                }
            } catch (err) {
                if (isAbortError(err)) return;
                console.error('Error fetching schedule events:', err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [user, supabase, getSignal]);

    const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);

    const getEventsForDay = (day: number) => {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return events.filter(e => e.date === dateStr);
    };

    const prevMonth = () => {
        if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
        else setCurrentMonth(m => m - 1);
    };

    const nextMonth = () => {
        if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
        else setCurrentMonth(m => m + 1);
    };

    const handleAddEvent = async () => {
        if (!user || selectedDay === null || !newEvent.title.trim()) return;
        setSavingEvent(true);
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
        const { id } = await saveScheduleEvent(supabase, {
            user_id: user.id,
            date: dateStr,
            title: newEvent.title,
            type: newEvent.type,
            duration: newEvent.duration,
        });
        if (id) {
            setEvents(prev => [...prev, { id, user_id: user.id, date: dateStr, ...newEvent }]);
        }
        setShowAddModal(false);
        setNewEvent({ title: '', type: 'study', duration: '2h' });
        setSavingEvent(false);
    };

    const handleDeleteEvent = async (eventId: string) => {
        await deleteScheduleEvent(supabase, eventId);
        setEvents(prev => prev.filter(e => e.id !== eventId));
    };

    const typeColors: Record<string, string> = {
        study: 'var(--brand-accent)',
        test: 'var(--color-danger)',
        dayoff: 'var(--color-success)',
    };

    const typeEmoji: Record<string, string> = {
        study: '📚',
        test: '📝',
        dayoff: '🏖️',
    };

    if (loading) {
        return (
            <AppLayout>
                <div className="page-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                    <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-tertiary)' }} />
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="page-wrapper" style={{ maxWidth: '1000px' }}>
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1>Study Schedule</h1>
                        <p>Plan your study sessions and track your progress</p>
                    </div>
                </div>

                {/* Month Nav */}
                <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
                        <button className="btn btn-ghost btn-sm" onClick={prevMonth}><ChevronLeft size={18} /></button>
                        <h2 style={{ fontSize: 'var(--fs-xl)', fontWeight: 600 }}>
                            <CalIcon size={20} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                            {MONTHS[currentMonth]} {currentYear}
                        </h2>
                        <button className="btn btn-ghost btn-sm" onClick={nextMonth}><ChevronRight size={18} /></button>
                    </div>

                    {/* Calendar Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: 'var(--border-secondary)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                        {DAYS.map(d => (
                            <div key={d} style={{ padding: 'var(--space-2)', textAlign: 'center', fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-tertiary)', background: 'var(--bg-secondary)' }}>
                                {d}
                            </div>
                        ))}
                        {Array(firstDay).fill(null).map((_, i) => (
                            <div key={`empty-${i}`} style={{ background: 'var(--bg-secondary)', minHeight: 80 }} />
                        ))}
                        {Array(daysInMonth).fill(null).map((_, i) => {
                            const day = i + 1;
                            const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                            const dayEvents = getEventsForDay(day);
                            return (
                                <div
                                    key={day}
                                    style={{
                                        background: 'var(--bg-secondary)',
                                        minHeight: 80,
                                        padding: 'var(--space-1)',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        transition: 'background var(--transition-fast)',
                                    }}
                                    onClick={() => { setSelectedDay(day); setShowAddModal(true); }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                                >
                                    <div style={{
                                        fontSize: 'var(--fs-xs)',
                                        fontWeight: isToday ? 700 : 400,
                                        color: isToday ? 'var(--brand-accent-light)' : 'var(--text-secondary)',
                                        width: 22, height: 22,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        borderRadius: '50%',
                                        background: isToday ? 'rgba(37, 99, 235, 0.2)' : 'transparent',
                                    }}>
                                        {day}
                                    </div>
                                    {dayEvents.map(ev => (
                                        <div key={ev.id} style={{
                                            fontSize: '10px',
                                            padding: '1px 4px',
                                            borderRadius: 3,
                                            background: `${typeColors[ev.type]}22`,
                                            color: typeColors[ev.type],
                                            marginTop: 2,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {typeEmoji[ev.type]} {ev.title}
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: 'var(--space-6)', fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
                    <span>📚 Study Session</span>
                    <span>📝 Practice Test</span>
                    <span>🏖️ Day Off</span>
                </div>
            </div>

            {/* Add Event Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
                            <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600 }}>
                                {MONTHS[currentMonth]} {selectedDay}, {currentYear}
                            </h2>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowAddModal(false)}><X size={16} /></button>
                        </div>

                        {/* Existing events for this day */}
                        {selectedDay && getEventsForDay(selectedDay).length > 0 && (
                            <div style={{ marginBottom: 'var(--space-5)' }}>
                                <h3 className="text-sm font-semibold" style={{ marginBottom: 'var(--space-2)' }}>Events</h3>
                                {getEventsForDay(selectedDay).map(ev => (
                                    <div key={ev.id} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: 'var(--space-2) var(--space-3)',
                                        background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)',
                                        marginBottom: 'var(--space-2)',
                                    }}>
                                        <span className="text-sm">{typeEmoji[ev.type]} {ev.title} <span className="text-xs text-secondary">({ev.duration})</span></span>
                                        <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteEvent(ev.id)} style={{ color: 'var(--color-danger)' }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="divider" style={{ margin: 'var(--space-4) 0' }} />

                        <h3 className="text-sm font-semibold" style={{ marginBottom: 'var(--space-3)' }}>Add Event</h3>
                        <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
                            <label>Title</label>
                            <input className="input" placeholder="e.g., Biology Review" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
                            <div className="input-group">
                                <label>Type</label>
                                <select className="select" value={newEvent.type} onChange={e => setNewEvent({ ...newEvent, type: e.target.value as 'study' | 'test' | 'dayoff' })}>
                                    <option value="study">📚 Study</option>
                                    <option value="test">📝 Test</option>
                                    <option value="dayoff">🏖️ Day Off</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Duration</label>
                                <select className="select" value={newEvent.duration} onChange={e => setNewEvent({ ...newEvent, duration: e.target.value })}>
                                    <option value="30m">30 minutes</option>
                                    <option value="1h">1 hour</option>
                                    <option value="2h">2 hours</option>
                                    <option value="3h">3 hours</option>
                                    <option value="4h">4 hours</option>
                                </select>
                            </div>
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleAddEvent} disabled={savingEvent || !newEvent.title.trim()}>
                            {savingEvent ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><Plus size={16} /> Add Event</>}
                        </button>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}

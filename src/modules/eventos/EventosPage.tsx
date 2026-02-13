import React, { useEffect, useMemo, useState } from 'react';
import AppShell from '@components/AppShell';
import { useAuth } from '@contexts/AuthContext';
import { addEvent, deleteEvent, updateEvent, EventItem, getEvents } from '@services/eventService';
import { useNotifications } from '@contexts/NotificationContext';

export default function EventosPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'todos' | 'confirmado' | 'pendente' | 'cancelado'>('todos');
  const [form, setForm] = useState({ title: '', date: '', time: '', leader: '' });
  const { profile } = useAuth();
  const isMaster = profile?.role === 'MASTER';
  const { addNotification } = useNotifications();

  useEffect(() => {
    let active = true;
    getEvents()
      .then((data) => {
        if (!active) return;
        setEvents(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'todos') {
      return events;
    }
    return events.filter((event) => event.status === filter);
  }, [events, filter]);

  const handleAddEvent = async () => {
    if (!form.title || !form.date || !form.time || !form.leader) {
      return;
    }
    const payload: Omit<EventItem, 'id'> = {
      title: form.title,
      date: form.date,
      time: form.time,
      leader: form.leader,
      status: 'pendente',
      created_at: new Date().toISOString(),
    };
    const id = await addEvent(payload);
    setEvents((prev) => [{ id, ...payload }, ...prev]);
    setForm({ title: '', date: '', time: '', leader: '' });
    addNotification({
      message: `Novo evento criado: ${payload.title}`,
      path: '/eventos',
    });
  };

  const handleDeleteEvent = async (event: EventItem) => {
    if (!event.id) return;
    const confirmed = window.confirm(`Remover o evento "${event.title}"?`);
    if (!confirmed) return;
    await deleteEvent(event.id);
    setEvents((prev) => prev.filter((item) => item.id !== event.id));
  };

  const handleStatusChange = async (event: EventItem, status: EventItem['status']) => {
    if (!event.id) return;
    await updateEvent(event.id, { status });
    setEvents((prev) => prev.map((item) => (item.id === event.id ? { ...item, status } : item)));
  };

  return (
    <AppShell
      title="Eventos e Cultos"
      subtitle="Planejamento de agendas, equipes e responsáveis."
      actions={
        <button
          onClick={handleAddEvent}
          disabled={!isMaster}
          className="w-full rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 disabled:opacity-60 sm:w-auto"
        >
          Criar evento
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_2fr]">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Novo evento</div>
          <div className="mt-4 flex flex-col gap-3">
            <input
              className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
              placeholder="Título"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              disabled={!isMaster}
            />
            <div className="flex gap-2">
              <input
                className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
                placeholder="Data (dd/mm/aaaa)"
                value={form.date}
                onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                disabled={!isMaster}
              />
              <input
                className="w-32 rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
                placeholder="Hora"
                value={form.time}
                onChange={(event) => setForm((prev) => ({ ...prev, time: event.target.value }))}
                disabled={!isMaster}
              />
            </div>
            <input
              className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
              placeholder="Responsável"
              value={form.leader}
              onChange={(event) => setForm((prev) => ({ ...prev, leader: event.target.value }))}
              disabled={!isMaster}
            />
            <div className="rounded-xl border border-ink-100 bg-ink-50 p-3 text-xs text-ink-500">
              Novos eventos entram como pendentes até confirmação.
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Agenda</div>
              <div className="text-lg font-semibold text-ink-900">Eventos programados</div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-400">
              <button
                onClick={() => setFilter('todos')}
                className={`rounded-full px-3 py-1 ${filter === 'todos' ? 'bg-ink-900 text-white' : 'bg-ink-100'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilter('confirmado')}
                className={`rounded-full px-3 py-1 ${
                  filter === 'confirmado' ? 'bg-emerald-500 text-white' : 'bg-ink-100'
                }`}
              >
                Confirmados
              </button>
              <button
                onClick={() => setFilter('pendente')}
                className={`rounded-full px-3 py-1 ${
                  filter === 'pendente' ? 'bg-amber-500 text-white' : 'bg-ink-100'
                }`}
              >
                Pendentes
              </button>
              <button
                onClick={() => setFilter('cancelado')}
                className={`rounded-full px-3 py-1 ${
                  filter === 'cancelado' ? 'bg-rose-500 text-white' : 'bg-ink-100'
                }`}
              >
                Cancelados
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {filtered.map((event) => (
              <div key={event.id} className="rounded-2xl border border-ink-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-ink-900">{event.title}</div>
                    <div className="text-xs text-ink-400">
                      {event.date} • {event.time} • {event.leader}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 md:flex-row md:items-center">
                    <select
                      value={event.status}
                      onChange={(e) => handleStatusChange(event, e.target.value as EventItem['status'])}
                      disabled={!isMaster}
                      className="rounded-lg border border-ink-200 bg-white px-3 py-1 text-xs font-semibold text-ink-700 hover:border-ink-300"
                    >
                      <option value="pendente">Pendente</option>
                      <option value="confirmado">Confirmado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        event.status === 'confirmado'
                          ? 'bg-emerald-100 text-emerald-700'
                          : event.status === 'cancelado'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {event.status === 'confirmado'
                        ? 'Confirmado'
                        : event.status === 'cancelado'
                        ? 'Cancelado'
                        : 'Pendente'}
                    </span>
                    <button
                      onClick={() => handleDeleteEvent(event)}
                      disabled={!isMaster}
                      className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:border-rose-300 disabled:opacity-60"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="py-8 text-center text-sm text-ink-400">Carregando eventos...</div>
            )}
            {filtered.length === 0 && (
              <div className="py-8 text-center text-sm text-ink-400">Nenhum evento para este filtro.</div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

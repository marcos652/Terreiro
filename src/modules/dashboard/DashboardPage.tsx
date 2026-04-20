import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@contexts/AuthContext';
import { useToast } from '@contexts/ToastContext';
import AppShell from '@components/AppShell';
import LineChart from '@components/charts/LineChart';
import ConfirmModal from '@components/ConfirmModal';
import SkeletonLoader from '@components/SkeletonLoader';
import { seedFirestoreBaseData } from '@services/seedService';
import { db } from '@services/firebase';
import {
  useDashboardData,
  formatBRL,
  type ActionItem,
} from './useDashboardData';

const DashboardPage = () => {
  const { user, loading, profile } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const isMaster = (profile?.role || '').trim().toUpperCase() === 'MASTER';

  const dashboard = useDashboardData(user);

  const [focusNote, setFocusNote] = useState('');
  const [focusSaving, setFocusSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [clearingCash, setClearingCash] = useState(false);
  const [actionText, setActionText] = useState('');
  const [actionSaving, setActionSaving] = useState(false);
  const [confirmClearCash, setConfirmClearCash] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // ── Handlers ──
  const handleSeed = async () => {
    if (!db) { showToast('Configuração do Firebase não encontrada.', 'error'); return; }
    setSeeding(true);
    try {
      await seedFirestoreBaseData();
      showToast('Campos base criados no Firestore!', 'success');
    } catch {
      showToast('Erro ao criar campos base.', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const handleClearCash = async () => {
    if (!db) { showToast('Configuração do Firebase não encontrada.', 'error'); return; }
    setClearingCash(true);
    try {
      await dashboard.clearCashTransactions();
      showToast('Movimentos do caixa limpos.', 'success');
    } catch {
      showToast('Erro ao limpar caixa.', 'error');
    } finally {
      setClearingCash(false);
      setConfirmClearCash(false);
    }
  };

  const handleFocusSave = async () => {
    const message = focusNote.trim();
    if (!message) return;
    setFocusSaving(true);
    try {
      await dashboard.saveFocusNote(message);
      setFocusNote('');
      showToast('Sugestão enviada!', 'success');
    } catch {
      showToast('Erro ao salvar sugestão.', 'error');
    } finally {
      setFocusSaving(false);
    }
  };

  const handleAddAction = async () => {
    if (!user) { showToast('Você precisa estar logado.', 'warning'); return; }
    const title = actionText.trim();
    if (!title) return;
    setActionSaving(true);
    try {
      await dashboard.addAction(title, profile?.name || user.email || 'Membro', user.uid);
      setActionText('');
      showToast('Tarefa adicionada!', 'success');
    } catch {
      showToast('Não foi possível salvar a tarefa.', 'error');
    } finally {
      setActionSaving(false);
    }
  };

  const handleUpdateActionStatus = async (item: ActionItem, status: ActionItem['status']) => {
    if (!user) return;
    const canEdit = isMaster || item.created_by === user.uid;
    if (!canEdit) return;
    try {
      await dashboard.updateActionStatus(item.id, status);
    } catch {
      showToast('Não foi possível atualizar a tarefa.', 'error');
    }
  };

  const handleDeleteAction = async (item: ActionItem) => {
    if (!isMaster) return;
    const confirmed = window.confirm(`Remover a tarefa "${item.title}"?`);
    if (!confirmed) return;
    try {
      await dashboard.deleteAction(item.id);
      showToast('Tarefa removida.', 'success');
    } catch {
      showToast('Não foi possível remover a tarefa.', 'error');
    }
  };

  if (loading || (!user && typeof window !== 'undefined')) {
    return <SkeletonLoader />;
  }

  return (
    <>
    <AppShell
      title="Dashboard"
      subtitle="Panorama geral das finanças, presença e operações do terreiro."
      actions={
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
          <button
            onClick={handleSeed}
            disabled={seeding || !isMaster}
            className="w-full rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:border-ink-300 disabled:opacity-60 sm:w-auto"
          >
            {seeding ? 'Criando campos...' : 'Criar campos base'}
          </button>
        </div>
      }
    >
      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {/* Caixa */}
        <div id="card-caixa" className="rounded-2xl border border-ink-100 bg-white p-8 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Caixa atual</div>
          <div className="mt-2 text-2xl font-semibold text-ink-900">
            {dashboard.hasCashData ? `R$ ${formatBRL(dashboard.cashTotal)}` : '—'}
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-ink-500">
            <span className={`rounded-full px-2 py-1 ${dashboard.cashStatus.className}`}>{dashboard.cashStatus.label}</span>
            <span>{dashboard.hasCashData ? 'Movimentação acumulada' : 'Atualize para exibir valores'}</span>
          </div>
        </div>

        {/* Mensalidades */}
        <div id="card-mensalidades" className="rounded-2xl border border-ink-100 bg-white p-8 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Mensalidades</div>
          <div className="mt-2 text-2xl font-semibold text-ink-900">
            {dashboard.hasMembershipData ? `R$ ${formatBRL(dashboard.membersPaid.paid)}` : '—'}
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-ink-100">
            <div className="h-2 rounded-full bg-purple-500" style={{ width: `${dashboard.membershipProgress}%` }} />
          </div>
          <div className="mt-2 text-xs text-ink-500">
            {dashboard.hasMembershipData
              ? `R$ ${formatBRL(dashboard.membersPaid.paid)} de R$ ${formatBRL(dashboard.membersPaid.total)}`
              : 'Sem dados'}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-ink-500">
            <span className={`rounded-full px-2 py-1 ${dashboard.membershipStatus.className}`}>{dashboard.membershipStatus.label}</span>
            <span>{dashboard.membershipProgress.toFixed(0)}% do objetivo</span>
          </div>
        </div>

        {/* Próxima gira */}
        <div id="card-proxima-gira" className="rounded-2xl border border-ink-100 bg-white p-8 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Próxima gira</div>
          <div className="mt-2 text-lg font-semibold text-ink-900">
            {dashboard.nextEvent ? `${dashboard.nextEvent.date} • ${dashboard.nextEvent.time}` : 'Sem eventos'}
          </div>
          <div className="mt-1 text-sm text-ink-500">
            {dashboard.nextEvent ? `Tema: ${dashboard.nextEvent.title}` : 'Sem informações'}
          </div>
        </div>

        {/* Estoque crítico */}
        <div id="card-estoque-critico" className="rounded-2xl border border-ink-100 bg-white p-8 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Estoque crítico</div>
          <div className="mt-2 text-2xl font-semibold text-ink-900">
            {dashboard.hasStockData ? `${dashboard.criticalStock} itens` : '—'}
          </div>
          <div className="mt-2 text-xs text-ink-500">
            <span className={`rounded-full px-2 py-1 ${dashboard.stockStatus.className}`}>{dashboard.stockStatus.label}</span>
          </div>
        </div>
      </div>

      {/* ── DRE Simplificado ── */}
      <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Demonstrativo Financeiro</div>
            <div className="text-lg font-semibold text-ink-900">Receita vs Despesa</div>
          </div>
          <span className="rounded-full bg-purple-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-purple-700">Consolidado</span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
              </div>
              <div className="text-[11px] uppercase tracking-[0.15em] text-emerald-600">Receita Total</div>
            </div>
            <div className="mt-2 text-xl font-semibold text-emerald-700">
              R$ {formatBRL((dashboard.membersPaid?.paid || 0) + (dashboard.donationsTotal || 0))}
            </div>
            <div className="mt-1 text-[10px] text-emerald-500">
              Mensalidades R$ {formatBRL(dashboard.membersPaid?.paid || 0)} + Doações R$ {formatBRL(dashboard.donationsTotal || 0)}
            </div>
          </div>
          <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
              </div>
              <div className="text-[11px] uppercase tracking-[0.15em] text-rose-600">Despesas</div>
            </div>
            <div className="mt-2 text-xl font-semibold text-rose-600">
              R$ {formatBRL(dashboard.cashExpenses || 0)}
            </div>
            <div className="mt-1 text-[10px] text-rose-400">Saídas do caixa</div>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
              </div>
              <div className="text-[11px] uppercase tracking-[0.15em] text-indigo-600">Resultado</div>
            </div>
            {(() => {
              const result = ((dashboard.membersPaid?.paid || 0) + (dashboard.donationsTotal || 0)) - (dashboard.cashExpenses || 0);
              return (
                <>
                  <div className={`mt-2 text-xl font-semibold ${result >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {result >= 0 ? '+' : '-'} R$ {formatBRL(Math.abs(result))}
                  </div>
                  <div className={`mt-1 text-[10px] ${result >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>
                    {result >= 0 ? 'Superávit' : 'Déficit'}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          {/* Trend Chart */}
          <div id="card-tendencia" className="rounded-2xl border border-ink-100 bg-white p-4 shadow-floating">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Tendência</div>
                <div className="flex items-center gap-2">
                  <div className="text-lg font-semibold text-ink-900">Balanço do Caixa</div>
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-purple-700">
                    Roxo
                  </span>
                </div>
                <div className="mt-2 h-1 w-20 rounded-full bg-gradient-to-r from-purple-500 via-purple-300 to-transparent" />
              </div>
              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                Atualizado hoje
              </span>
            </div>
            <LineChart
              data={dashboard.cashSeries}
              height={240}
              strokeColor="#7c3aed"
              fillColor="rgba(124,58,237,0.32)"
              dotColor="#6d28d9"
              labels={dashboard.cashLabels}
              valueFormatter={(value) => `R$ ${formatBRL(value)}`}
            />
          </div>

          {/* Activity Feed */}
          <div id="card-atividade" className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Atividade recente</div>
                <div className="text-lg font-semibold text-ink-900">Últimos lançamentos</div>
              </div>
              <div className="flex items-center gap-3">
                <button className="text-xs font-semibold text-ink-400 hover:text-ink-600">Ver tudo</button>
                <button
                  onClick={() => setConfirmClearCash(true)}
                  disabled={clearingCash || !isMaster}
                  className="text-xs font-semibold text-rose-500 hover:text-rose-600 disabled:opacity-60"
                >
                  {clearingCash ? 'Limpando...' : 'Limpar'}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {dashboard.activity.length === 0 && (
                <div className="rounded-xl border border-ink-100 bg-ink-50/50 px-4 py-6 text-sm text-ink-400">
                  Sem atividade registrada.
                </div>
              )}
              {dashboard.activity.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-ink-100 bg-ink-50/50 px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-ink-900">{item.label}</div>
                    <div className="text-xs text-ink-400">{item.time}</div>
                  </div>
                  <span className={`text-sm font-semibold ${item.tone === 'pos' ? 'text-emerald-600' : item.tone === 'neg' ? 'text-rose-500' : 'text-ink-500'}`}>
                    {item.amount || '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* Suggestions Panel */}
          <div id="card-sugestoes" className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
            <div className="mb-2 text-xs uppercase tracking-[0.2em] text-ink-300">Sugestões próximo toque</div>
            <p className="text-sm text-ink-600">
              Envie ideias ou necessidades; o histórico fica salvo e só o admin pode limpar.
            </p>
            <div className="mt-4 rounded-2xl border border-ink-200 bg-ink-50/70 p-3 shadow-sm">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-500">Sugestão</div>
              <textarea
                value={focusNote}
                onChange={(event) => setFocusNote(event.target.value)}
                className="min-h-[140px] w-full rounded-xl border border-ink-200 bg-white p-3 text-sm text-ink-800 shadow-sm focus:border-ink-500 focus:outline-none focus:ring-2 focus:ring-ink-200"
                placeholder="Ex.: confirmar equipe de acolhimento, separar ervas, revisar som."
              />
            </div>
            <button
              onClick={handleFocusSave}
              disabled={focusSaving || focusNote.trim().length === 0}
              className="mt-3 w-full rounded-xl bg-ink-900 px-4 py-3 text-xs font-semibold text-white shadow-sm hover:bg-ink-700 disabled:opacity-60"
            >
              {focusSaving ? 'Enviando...' : 'Enviar'}
            </button>
            <div className="mt-4 rounded-xl border border-ink-200 bg-white px-3 py-3 text-sm text-ink-700 shadow-sm">
              {dashboard.focusSavedNote ? (
                <div className="flex flex-col gap-1">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-400">Mensagem salva</div>
                  <div className="text-sm text-ink-800">{dashboard.focusSavedNote}</div>
                  {dashboard.focusSavedAt && <div className="text-xs text-ink-400">{dashboard.focusSavedAt}</div>}
                </div>
              ) : (
                <div className="text-xs text-ink-400">Nenhuma mensagem salva ainda.</div>
              )}
            </div>
            <div className="mt-3 rounded-xl border border-ink-100 bg-ink-50/70 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-ink-400">Últimas enviadas</div>
              {dashboard.focusHistory.length === 0 && (
                <div className="mt-2 text-xs text-ink-400">Sem histórico recente.</div>
              )}
              <div className="mt-2 flex flex-col gap-2">
                {dashboard.focusHistory.map((item, index) => (
                  <div key={item.id} className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-xs text-ink-600 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink-800">{index === 0 ? 'Mais recente' : `#${index + 1}`}</span>
                      <span className="text-[10px] text-ink-400">{item.created_at}</span>
                    </div>
                    <div className="mt-1">{item.message}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div id="card-checklist" className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Checklist do toque</div>
                <div className="text-lg font-semibold text-ink-900">Tarefas em tempo real</div>
              </div>
              <span className="rounded-full bg-ink-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                Colaborativo
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
                  placeholder="Adicionar tarefa"
                  value={actionText}
                  onChange={(e) => setActionText(e.target.value)}
                />
                <button
                  onClick={handleAddAction}
                  disabled={actionSaving || actionText.trim().length === 0}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-60"
                >
                  {actionSaving ? 'Salvando...' : 'Enviar'}
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {dashboard.actionItems.map((item) => {
                  const statusPill =
                    item.status === 'concluido' ? 'bg-emerald-100 text-emerald-700'
                    : item.status === 'em_andamento' ? 'bg-amber-100 text-amber-800'
                    : 'bg-ink-100 text-ink-700';
                  const canEdit = isMaster || item.created_by === user?.uid;
                  return (
                    <div key={item.id} className="flex items-center justify-between rounded-xl border border-ink-100 bg-ink-50/60 px-3 py-2">
                      <div>
                        <div className="text-sm font-semibold text-ink-900">{item.title}</div>
                        <div className="text-[11px] text-ink-400">Resp.: {item.owner}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={item.status}
                          onChange={(e) => handleUpdateActionStatus(item, e.target.value as ActionItem['status'])}
                          disabled={!canEdit}
                          className="rounded-lg border border-ink-200 bg-white px-2 py-1 text-xs text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
                        >
                          <option value="pendente">Pendente</option>
                          <option value="em_andamento">Em andamento</option>
                          <option value="concluido">Concluído</option>
                        </select>
                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusPill}`}>
                          {item.status === 'em_andamento' ? 'Em andamento' : item.status === 'concluido' ? 'Concluído' : 'Pendente'}
                        </span>
                        {isMaster && (
                          <button
                            onClick={() => handleDeleteAction(item)}
                            className="rounded-lg border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:border-rose-300"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {dashboard.actionItems.length === 0 && (
                  <div className="rounded-xl border border-ink-100 bg-white px-3 py-4 text-xs text-ink-400">
                    Nenhuma tarefa cadastrada ainda.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Agenda */}
          <div id="card-agenda" className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Agenda viva</div>
                <div className="text-lg font-semibold text-ink-900">Próximos toques</div>
              </div>
              <a className="text-xs font-semibold text-teal-600 hover:text-teal-700" href="/eventos">
                Ver eventos
              </a>
            </div>
            <div className="flex flex-col gap-2">
              {dashboard.agendaList.map((event) => (
                <div key={event.id} className="flex items-center justify-between rounded-xl border border-ink-100 bg-ink-50/60 px-3 py-2">
                  <div>
                    <div className="text-sm font-semibold text-ink-900">{event.title}</div>
                    <div className="text-[11px] text-ink-400">
                      {event.date} • {event.time} {event.leader ? `• ${event.leader}` : ''}
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                    event.status === 'confirmado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {event.status === 'confirmado' ? 'Confirmado' : 'Pendente'}
                  </span>
                </div>
              ))}
              {dashboard.agendaList.length === 0 && (
                <div className="rounded-xl border border-ink-100 bg-white px-3 py-4 text-xs text-ink-400">
                  Nenhum evento próximo cadastrado.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>

    <ConfirmModal
      open={confirmClearCash}
      title="Limpar movimentos do caixa"
      message="Deseja apagar todos os movimentos do caixa? Esta ação é irreversível."
      confirmLabel="Limpar tudo"
      variant="danger"
      onConfirm={handleClearCash}
      onCancel={() => setConfirmClearCash(false)}
    />
    </>
  );
};

export default DashboardPage;

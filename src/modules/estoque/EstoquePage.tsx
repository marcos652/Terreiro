import React, { useEffect, useMemo, useState } from 'react';
import AppShell from '@components/AppShell';
import { useAuth } from '@contexts/AuthContext';
import {
  addStockItem,
  clearStockItems,
  deleteStockItem,
  getStockItems,
  StockItem,
  updateStockItem,
} from '@services/stockService';
import { logService } from '@services/logService';

const initialItems: StockItem[] = [];

export default function EstoquePage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [search, setSearch] = useState('');
  const [newItem, setNewItem] = useState({
    name: '',
    category: '',
    quantity: 0,
    unit: 'un',
    supplier: '',
    color: '',
    price: 0,
  });
  const [loading, setLoading] = useState(true);
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { profile } = useAuth();
  const isMaster = profile?.role === 'MASTER';

  useEffect(() => {
    let active = true;
    getStockItems()
      .then((data) => {
        if (!active) return;
        setItems(data);
        const drafts = data.reduce<Record<string, string>>((acc, item) => {
          if (item.id) {
            acc[item.id] = String(item.quantity ?? 0);
          }
          return acc;
        }, {});
        setQuantityDrafts(drafts);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredItems = useMemo(
    () =>
      items.filter((item) =>
        `${item.name} ${item.category} ${item.supplier}`.toLowerCase().includes(search.toLowerCase())
      ),
    [items, search]
  );

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.category || !newItem.supplier) {
      return;
    }
    const payload: Omit<StockItem, 'id'> = {
      name: newItem.name,
      category: newItem.category,
      quantity: Number(newItem.quantity) || 0,
      unit: newItem.unit,
      supplier: newItem.supplier,
      color: newItem.color || 'N/A',
      price: Number(newItem.price) || 0,
      created_at: new Date().toISOString(),
    };
    const id = await addStockItem(payload, profile?.email);
    setItems((prev) => [{ id, ...payload }, ...prev]);
    setNewItem({ name: '', category: '', quantity: 0, unit: 'un', supplier: '', color: '', price: 0 });
  };

  const handleUpdateQuantity = async (item: StockItem, nextQuantity: number) => {
    if (!item.id) return;
    const safeQuantity = Math.max(0, Number(nextQuantity) || 0);
    setUpdatingId(item.id);
    try {
      await updateStockItem(item.id, { quantity: safeQuantity }, profile?.email);
      setItems((prev) =>
        prev.map((entry) => (entry.id === item.id ? { ...entry, quantity: safeQuantity } : entry))
      );
      setQuantityDrafts((prev) => ({ ...prev, [item.id as string]: String(safeQuantity) }));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteItem = async (item: StockItem) => {
    if (!item.id) return;
    const confirmed = window.confirm(`Remover o item "${item.name}"?`);
    if (!confirmed) return;
    setDeletingId(item.id);
    try {
      await deleteStockItem(item.id, profile?.email);
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    const confirmed = window.confirm('Deseja apagar todo o estoque?');
    if (!confirmed) return;
    setClearingAll(true);
    try {
      await clearStockItems(profile?.email);
      setItems([]);
      setQuantityDrafts({});
    } finally {
      setClearingAll(false);
    }
  };

  return (
    <AppShell
      title="Gestão de Estoque"
      subtitle="Controle de itens, alertas de reposição e fornecedores."
      actions={
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
          <button
            onClick={handleClearAll}
            disabled={clearingAll || !isMaster}
            className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm hover:border-rose-300 disabled:opacity-60 sm:w-auto"
          >
            {clearingAll ? 'Limpando...' : 'Limpar estoque'}
          </button>
          <button
            onClick={handleAddItem}
            disabled={!isMaster}
            className="w-full rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-400 disabled:opacity-60 sm:w-auto"
          >
            Adicionar item
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_2fr]">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Novo item</div>
          <div className="mt-4 flex flex-col gap-3">
            <input
              className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
              placeholder="Nome do item"
              value={newItem.name}
              onChange={(event) => setNewItem((prev) => ({ ...prev, name: event.target.value }))}
            />
            <input
              className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
              placeholder="Categoria"
              value={newItem.category}
              onChange={(event) => setNewItem((prev) => ({ ...prev, category: event.target.value }))}
            />
            <div className="flex gap-2">
              <input
                className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                placeholder="Cor"
                value={newItem.color}
                onChange={(event) => setNewItem((prev) => ({ ...prev, color: event.target.value }))}
              />
              <input
                type="number"
                className="w-32 rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                placeholder="R$"
                value={newItem.price}
                onChange={(event) => setNewItem((prev) => ({ ...prev, price: Number(event.target.value) }))}
              />
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                placeholder="Quantidade"
                value={newItem.quantity}
                onChange={(event) => setNewItem((prev) => ({ ...prev, quantity: Number(event.target.value) }))}
              />
              <input
                className="w-24 rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                placeholder="Un."
                value={newItem.unit}
                onChange={(event) => setNewItem((prev) => ({ ...prev, unit: event.target.value }))}
              />
            </div>
            <input
              className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
              placeholder="Fornecedor"
              value={newItem.supplier}
              onChange={(event) => setNewItem((prev) => ({ ...prev, supplier: event.target.value }))}
            />
            <div className="rounded-xl border border-ink-100 bg-ink-50 p-3 text-xs text-ink-500">
              Itens com poucas unidades são destacados para reposição.
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Inventário</div>
              <div className="text-lg font-semibold text-ink-900">Itens ativos</div>
            </div>
            <input
              className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 md:w-72"
              placeholder="Buscar item..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="mt-4 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.16em] text-ink-300">
                <tr>
                  <th className="py-2">Item</th>
                  <th className="py-2">Categoria</th>
                  <th className="py-2">Qtd.</th>
                  <th className="py-2">Fornecedor</th>
                  <th className="py-2">AÃ§Ãµes</th>
                  <th className="py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
            {filteredItems.map((item) => {
                  const low = item.quantity <= 0;
                  return (
                    <tr key={item.id} className="border-t border-ink-100">
                      <td className="py-3 font-semibold text-ink-900">{item.name}</td>
                      <td className="py-3 text-ink-500">{item.category}</td>
                      <td className="py-3 text-ink-500">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-3 text-ink-500">{item.supplier}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
                            disabled={!isMaster || updatingId === item.id}
                            className="h-7 w-7 rounded-lg border border-ink-200 text-sm font-semibold text-ink-600 hover:border-ink-300 disabled:opacity-60"
                          >
                            -
                          </button>
                          <button
                            onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                            disabled={!isMaster || updatingId === item.id}
                            className="h-7 w-7 rounded-lg border border-ink-200 text-sm font-semibold text-ink-600 hover:border-ink-300 disabled:opacity-60"
                          >
                            +
                          </button>
                          <input
                            type="number"
                            className="w-20 rounded-lg border border-ink-200 px-2 py-1 text-sm text-ink-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                            value={quantityDrafts[item.id || ''] ?? String(item.quantity ?? 0)}
                            onChange={(event) =>
                              setQuantityDrafts((prev) => ({
                                ...prev,
                                [item.id as string]: event.target.value,
                              }))
                            }
                            disabled={!isMaster}
                          />
                          <button
                            onClick={() =>
                              handleUpdateQuantity(item, Number(quantityDrafts[item.id || ''] ?? item.quantity))
                            }
                            disabled={!isMaster || updatingId === item.id}
                            className="rounded-lg border border-ink-200 px-3 py-1 text-xs font-semibold text-ink-600 hover:border-ink-300 disabled:opacity-60"
                          >
                            Atualizar
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item)}
                            disabled={!isMaster || deletingId === item.id}
                            className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:border-rose-300 disabled:opacity-60"
                          >
                            {deletingId === item.id ? 'Removendo...' : 'Remover'}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            low ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {low ? 'Repor' : 'Ok'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {loading && (
              <div className="py-6 text-center text-sm text-ink-400">Carregando itens...</div>
            )}
            {!loading && filteredItems.length === 0 && (
              <div className="py-8 text-center text-sm text-ink-400">Nenhum item encontrado.</div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

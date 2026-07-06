import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ordersApi } from '../api/orders.js';
import { useAuthStore } from '../store/auth.js';
import Modal from '../components/Modal.jsx';
import Spinner from '../components/Spinner.jsx';

const STATUS_CONFIG = {
  PENDING:    { label: 'En attente',      class: 'bg-yellow-100 text-yellow-800' },
  PREPARING:  { label: 'En préparation',  class: 'bg-orange-100 text-orange-800' },
  READY:      { label: 'Prêt',            class: 'bg-green-100  text-green-800'  },
  SERVED:     { label: 'Servi',           class: 'bg-blue-100   text-blue-800'   },
  PAID:       { label: 'Payé',            class: 'bg-purple-100 text-purple-800' },
  CANCELLED:  { label: 'Annulé',          class: 'bg-gray-100   text-gray-500'   },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG);

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, class: 'bg-gray-100 text-gray-600' };
  return <span className={`badge ${cfg.class}`}>{cfg.label}</span>;
}

function StatusSelect({ status, disabled, onChange }) {
  return (
    <select
      value={status}
      disabled={disabled}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value)}
      className={`badge border-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
        (STATUS_CONFIG[status] || STATUS_CONFIG.PENDING).class
      }`}
    >
      {ALL_STATUSES.map((s) => (
        <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
      ))}
    </select>
  );
}

function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('fr-MG', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatAmount(amount) {
  if (amount == null) return '-';
  return new Intl.NumberFormat('fr-MG').format(amount) + ' Ar';
}

function OrderDetailModal({ order }) {
  if (!order) return null;
  const items = order.items || [];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-gray-500">Commande n°</span>
          <p className="font-semibold">{order.orderNumber || order.id?.slice(0, 8)}</p>
        </div>
        <div>
          <span className="text-gray-500">Statut</span>
          <p><StatusBadge status={order.status} /></p>
        </div>
        <div>
          <span className="text-gray-500">Table</span>
          <p className="font-medium">{order.tableNumber ? `Table n°${order.tableNumber}` : '-'}</p>
        </div>
        <div>
          <span className="text-gray-500">Date</span>
          <p className="text-gray-700">{formatDate(order.createdAt)}</p>
        </div>
        {order.waiterName && (
          <div>
            <span className="text-gray-500">Serveur</span>
            <p className="text-gray-700">{order.waiterName}</p>
          </div>
        )}
        {order.notes && (
          <div className="col-span-2">
            <span className="text-gray-500">Notes</span>
            <p className="text-gray-700 italic">{order.notes}</p>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 pt-3">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Articles</h3>
        {items.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun article</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item, idx) => (
              <li key={item.id || idx} className="flex justify-between text-sm">
                <div>
                  <span className="font-medium">{item.menuItemName || 'Article'}</span>
                  <span className="text-gray-500 ml-1">x{item.quantity}</span>
                  {item.notes && <p className="text-xs text-gray-400 italic">{item.notes}</p>}
                  {item.modifiers?.length > 0 && (
                    <p className="text-xs text-gray-400">+ {item.modifiers.map((m) => m.name).join(', ')}</p>
                  )}
                </div>
                <span className="text-gray-700 ml-4 whitespace-nowrap">{formatAmount(item.subtotal)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-gray-200 pt-3 flex justify-between text-sm font-semibold">
        <span>Total</span>
        <span className="text-primary-700">{formatAmount(order.totalAmount)}</span>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const { restaurantId } = useParams();
  const user = useAuthStore((s) => s.user);
  const canEditStatus = user?.role !== 'WAITER' && user?.role !== 'KITCHEN';

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 20;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, size: PAGE_SIZE };
      if (statusFilter) params.status = statusFilter;
      const data = await ordersApi.list(restaurantId, params);
      if (data?.content) {
        setOrders(data.content);
        setTotalPages(data.totalPages || 1);
      } else {
        setOrders(Array.isArray(data) ? data : []);
        setTotalPages(1);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger les commandes.');
    } finally {
      setLoading(false);
    }
  }, [restaurantId, page, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { setPage(0); }, [statusFilter]);

  const handleRowClick = async (order) => {
    setDetailLoading(true);
    try {
      const full = await ordersApi.get(restaurantId, order.id);
      setSelectedOrder(full || order);
    } catch {
      setSelectedOrder(order);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusChange = async (order, newStatus) => {
    setError('');
    const previous = orders;
    setOrders((list) => list.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o)));
    try {
      await ordersApi.updateStatus(restaurantId, order.id, newStatus);
    } catch (err) {
      setOrders(previous);
      setError(err.response?.data?.message || 'Impossible de changer le statut de cette commande.');
    }
  };

  const handleHide = async (order) => {
    if (!window.confirm(`Retirer la commande #${order.orderNumber || order.id?.slice(0, 8).toUpperCase()} du tableau ? Elle reste conservée en comptabilité.`)) {
      return;
    }
    setError('');
    const previous = orders;
    setOrders((list) => list.filter((o) => o.id !== order.id));
    try {
      await ordersApi.hide(restaurantId, order.id);
    } catch (err) {
      setOrders(previous);
      setError(err.response?.data?.message || 'Impossible de retirer cette commande.');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Commandes</h1>
          <p className="text-sm text-gray-500 mt-1">
            {statusFilter
              ? `Filtre : ${STATUS_CONFIG[statusFilter]?.label}`
              : 'Toutes les commandes'}
          </p>
        </div>
        <button onClick={fetchOrders} className="btn btn-secondary flex items-center gap-2" disabled={loading}>
          <svg className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualiser
        </button>
      </div>

      {/* Filtres par statut */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setStatusFilter('')}
          className={`badge cursor-pointer transition-colors ${statusFilter === '' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Tout
        </button>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s === statusFilter ? '' : s)}
            className={`badge cursor-pointer transition-colors ${
              statusFilter === s
                ? STATUS_CONFIG[s].class + ' ring-2 ring-offset-1 ring-current'
                : STATUS_CONFIG[s].class + ' opacity-60 hover:opacity-100'
            }`}
          >
            {STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : orders.length === 0 ? (
        <div className="card p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <p className="text-gray-500 text-sm">
            {statusFilter ? `Aucune commande "${STATUS_CONFIG[statusFilter]?.label}".` : 'Aucune commande pour l\'instant.'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">N° commande</th>
                <th className="table-header">Table</th>
                <th className="table-header">Statut</th>
                <th className="table-header">Articles</th>
                <th className="table-header">Total</th>
                <th className="table-header">Heure</th>
                {canEditStatus && <th className="table-header"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-primary-50 cursor-pointer transition-colors" onClick={() => handleRowClick(order)}>
                  <td className="table-cell">
                    <span className="font-mono text-sm font-medium text-gray-900">
                      #{order.orderNumber || order.id?.slice(0, 8).toUpperCase()}
                    </span>
                  </td>
                  <td className="table-cell text-gray-700">
                    {order.tableNumber ? `Table n°${order.tableNumber}` : '-'}
                  </td>
                  <td className="table-cell">
                    {canEditStatus ? (
                      <StatusSelect
                        status={order.status}
                        onChange={(newStatus) => handleStatusChange(order, newStatus)}
                      />
                    ) : (
                      <StatusBadge status={order.status} />
                    )}
                  </td>
                  <td className="table-cell text-gray-600">{order.itemCount ?? order.items?.length ?? '-'}</td>
                  <td className="table-cell font-medium text-gray-900">{formatAmount(order.totalAmount)}</td>
                  <td className="table-cell text-gray-500 text-sm">{formatDate(order.createdAt)}</td>
                  {canEditStatus && (
                    <td className="table-cell text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleHide(order); }}
                        title="Retirer du tableau"
                        className="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">Page {page + 1} sur {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="btn btn-secondary btn-sm disabled:opacity-40">
              Précédent
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="btn btn-secondary btn-sm disabled:opacity-40">
              Suivant
            </button>
          </div>
        </div>
      )}

      <Modal
        isOpen={!!selectedOrder || detailLoading}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Commande #${selectedOrder.orderNumber || selectedOrder.id?.slice(0, 8).toUpperCase()}` : 'Chargement…'}
      >
        {detailLoading ? (
          <div className="flex justify-center py-8"><Spinner size="lg" /></div>
        ) : (
          <OrderDetailModal order={selectedOrder} />
        )}
      </Modal>
    </div>
  );
}

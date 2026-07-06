import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Client as StompClient } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { ordersApi } from '../api/orders.js';
import Spinner from '../components/Spinner.jsx';

const COLUMNS = [
  { status: 'PENDING',   label: 'En attente',     next: 'PREPARING', nextLabel: 'Démarrer', color: 'bg-yellow-50 border-yellow-200', headerColor: 'bg-yellow-100 text-yellow-800', badge: 'bg-yellow-200 text-yellow-900' },
  { status: 'PREPARING', label: 'En préparation', next: 'READY',     nextLabel: 'Prêt',     color: 'bg-orange-50 border-orange-200', headerColor: 'bg-orange-100 text-orange-800', badge: 'bg-orange-200 text-orange-900' },
  { status: 'READY',     label: 'Prêt',           next: null,        nextLabel: null,       color: 'bg-green-50  border-green-200',  headerColor: 'bg-green-100  text-green-800',  badge: 'bg-green-200  text-green-900'  },
];

function elapsed(iso) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  return `${Math.floor(diff / 3600)}h${Math.floor((diff % 3600) / 60)}min`;
}

function ElapsedTimer({ createdAt }) {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceUpdate((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);
  return <span>{elapsed(createdAt)}</span>;
}

function OrderCard({ order, col, onAdvance, advancing }) {
  const items = order.items || [];
  return (
    <div className={`rounded-lg border p-3 space-y-2 ${col.color}`}>
      <div className="flex items-center justify-between">
        <span className="font-mono font-bold text-sm text-gray-900">
          #{order.orderNumber || order.id?.slice(0, 8).toUpperCase()}
        </span>
        <span className="text-xs text-gray-500 flex items-center gap-1">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <ElapsedTimer createdAt={order.createdAt} />
        </span>
      </div>

      {order.tableNumber && (
        <div className="text-xs font-medium text-gray-600">Table n°{order.tableNumber}</div>
      )}

      {items.length > 0 ? (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={item.id || i} className="text-sm text-gray-800 flex gap-1">
              <span className="font-semibold text-gray-500 w-5 flex-shrink-0">x{item.quantity}</span>
              <div>
                <span>{item.menuItemName || 'Article'}</span>
                {item.notes && <p className="text-xs text-gray-400 italic">{item.notes}</p>}
                {item.modifiers?.length > 0 && (
                  <p className="text-xs text-gray-400">+ {item.modifiers.map((m) => m.name).join(', ')}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-400 italic">Détails indisponibles</p>
      )}

      {order.notes && (
        <div className="text-xs text-gray-500 bg-white/70 rounded p-1 italic">
          Note : {order.notes}
        </div>
      )}

      {col.next && (
        <button
          onClick={() => onAdvance(order.id, col.next)}
          disabled={advancing === order.id}
          className="w-full mt-1 py-1.5 rounded text-xs font-semibold transition-colors bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-1"
        >
          {advancing === order.id ? (
            <Spinner size="sm" />
          ) : (
            <>
              {col.nextLabel}
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      )}
    </div>
  );
}

function Column({ col, orders, onAdvance, advancing }) {
  return (
    <div className="flex flex-col min-h-0">
      <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg ${col.headerColor}`}>
        <h2 className="font-bold text-sm uppercase tracking-wide">{col.label}</h2>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${col.badge}`}>{orders.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto rounded-b-lg bg-gray-50 border border-t-0 border-gray-200 p-2 space-y-2 min-h-[200px]">
        {orders.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-sm text-gray-400">Vide</div>
        ) : (
          orders.map((order) => (
            <OrderCard key={order.id} order={order} col={col} onAdvance={onAdvance} advancing={advancing} />
          ))
        )}
      </div>
    </div>
  );
}

export default function KitchenBoardPage() {
  const { restaurantId } = useParams();

  const [board, setBoard] = useState({ PENDING: [], PREPARING: [], READY: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [wsStatus, setWsStatus] = useState('connecting');
  const [advancing, setAdvancing] = useState(null);

  const stompRef = useRef(null);

  const fetchBoard = useCallback(async () => {
    try {
      const data = await ordersApi.getKitchenBoard(restaurantId);
      if (data && typeof data === 'object') {
        setBoard({
          PENDING:   Array.isArray(data.PENDING)   ? data.PENDING   : [],
          PREPARING: Array.isArray(data.PREPARING) ? data.PREPARING : [],
          READY:     Array.isArray(data.READY)     ? data.READY     : [],
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger le tableau cuisine.');
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchBoard();
    const id = setInterval(fetchBoard, 60000);
    return () => clearInterval(id);
  }, [fetchBoard]);

  useEffect(() => {
    const raw = localStorage.getItem('auth-storage');
    let token = null;
    if (raw) { try { token = JSON.parse(raw)?.state?.accessToken; } catch { } }

    const client = new StompClient({
      webSocketFactory: () => new SockJS('/ws'),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 5000,
      onConnect: () => {
        setWsStatus('connected');
        client.subscribe(`/topic/kitchen/${restaurantId}`, () => { fetchBoard(); });
      },
      onDisconnect: () => setWsStatus('disconnected'),
      onStompError: () => setWsStatus('error'),
      onWebSocketError: () => setWsStatus('error'),
    });

    client.activate();
    stompRef.current = client;
    return () => { client.deactivate(); };
  }, [restaurantId, fetchBoard]);

  const handleAdvance = async (orderId, newStatus) => {
    setAdvancing(orderId);
    try {
      await ordersApi.updateKitchenOrderStatus(restaurantId, orderId, newStatus);
      await fetchBoard();
    } catch (err) {
      alert(err.response?.data?.message || 'Impossible de mettre à jour le statut.');
    } finally {
      setAdvancing(null);
    }
  };

  const wsIndicator = {
    connecting:   { color: 'bg-yellow-400', label: 'Connexion…' },
    connected:    { color: 'bg-green-500',  label: 'En direct' },
    disconnected: { color: 'bg-gray-400',   label: 'Déconnecté' },
    error:        { color: 'bg-red-500',    label: 'Erreur de connexion' },
  }[wsStatus] || { color: 'bg-gray-400', label: wsStatus };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau cuisine</h1>
          <p className="text-sm text-gray-500 mt-1">File de commandes en temps réel</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className={`h-2.5 w-2.5 rounded-full ${wsIndicator.color} ${wsStatus === 'connected' ? 'animate-pulse' : ''}`} />
            {wsIndicator.label}
          </div>
          <button onClick={fetchBoard} className="btn btn-secondary btn-sm flex items-center gap-1" disabled={loading}>
            <svg className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualiser
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm flex-shrink-0">
          {error}
          <button onClick={fetchBoard} className="ml-2 underline">Réessayer</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0">
          {COLUMNS.map((col) => (
            <Column key={col.status} col={col} orders={board[col.status] || []} onAdvance={handleAdvance} advancing={advancing} />
          ))}
        </div>
      )}
    </div>
  );
}

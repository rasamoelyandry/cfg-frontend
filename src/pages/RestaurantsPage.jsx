import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { restaurantsApi } from '../api/restaurants.js';
import { menuApi } from '../api/menu.js';
import { useAuthStore } from '../store/auth.js';
import Modal from '../components/Modal.jsx';
import Spinner from '../components/Spinner.jsx';

const EMPTY_FORM = {
  name: '',
  address: '',
  phone: '',
  email: '',
  currency: 'MGA',
  timezone: 'Indian/Antananarivo',
};

function RestaurantForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div>
        <label className="label">Nom du restaurant *</label>
        <input name="name" value={form.name} onChange={handleChange} className="input" required placeholder="Mon Restaurant" />
      </div>
      <div>
        <label className="label">Adresse</label>
        <input name="address" value={form.address} onChange={handleChange} className="input" placeholder="123 rue Principale, Ville" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Téléphone</label>
          <input name="phone" value={form.phone} onChange={handleChange} className="input" placeholder="+261 32 00 000 00" />
        </div>
        <div>
          <label className="label">E-mail</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} className="input" placeholder="contact@restaurant.mg" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Devise</label>
          <select name="currency" value={form.currency} onChange={handleChange} className="input">
            <option value="MGA">MGA (Ar)</option>
            <option value="EUR">EUR (€)</option>
            <option value="USD">USD ($)</option>
            <option value="GBP">GBP (£)</option>
          </select>
        </div>
        <div>
          <label className="label">Fuseau horaire</label>
          <select name="timezone" value={form.timezone} onChange={handleChange} className="input">
            <option value="Indian/Antananarivo">Indian/Antananarivo</option>
            <option value="Europe/Paris">Europe/Paris</option>
            <option value="Europe/London">Europe/London</option>
            <option value="America/New_York">America/New_York</option>
            <option value="UTC">UTC</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button type="button" onClick={onCancel} className="btn btn-secondary">Annuler</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? <Spinner size="sm" /> : initial ? 'Enregistrer' : 'Créer le restaurant'}
        </button>
      </div>
    </form>
  );
}

function DuplicateMenuModal({ restaurants, onClose, onSuccess }) {
  const [sourceId, setSourceId] = useState('');
  const [targetIds, setTargetIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const availableTargets = restaurants.filter((r) => r.id !== sourceId);

  const toggleTarget = (id) => {
    setTargetIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sourceId || targetIds.length === 0) return;
    setLoading(true);
    setResults(null);

    const outcomes = [];
    for (const targetId of targetIds) {
      const target = restaurants.find((r) => r.id === targetId);
      try {
        await menuApi.copyMenuFrom(targetId, sourceId);
        outcomes.push({ name: target?.name, ok: true });
      } catch (err) {
        outcomes.push({ name: target?.name, ok: false, msg: err.response?.data?.message || 'Erreur' });
      }
    }
    setResults(outcomes);
    setLoading(false);
    if (outcomes.every((o) => o.ok)) onSuccess();
  };

  const sourceName = restaurants.find((r) => r.id === sourceId)?.name;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Source */}
      <div>
        <label className="label">Restaurant source (menu à copier)</label>
        <select
          value={sourceId}
          onChange={(e) => { setSourceId(e.target.value); setTargetIds([]); }}
          className="input"
          required
        >
          <option value="">Sélectionner la source…</option>
          {restaurants.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      {/* Destinations */}
      {sourceId && (
        <div>
          <label className="label">
            Restaurants de destination
            <span className="text-gray-400 font-normal ml-1">(le menu existant sera remplacé)</span>
          </label>
          {availableTargets.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Aucun autre restaurant disponible.</p>
          ) : (
            <div className="border border-gray-200 rounded-md divide-y divide-gray-100 max-h-52 overflow-y-auto">
              {availableTargets.map((r) => (
                <label key={r.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={targetIds.includes(r.id)}
                    onChange={() => toggleTarget(r.id)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-700 focus:ring-primary-700"
                  />
                  <span className="text-sm text-gray-800">{r.name}</span>
                  {r.address && <span className="text-xs text-gray-400 truncate">{r.address}</span>}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Résultats */}
      {results && (
        <div className="rounded-md border border-gray-200 divide-y divide-gray-100">
          {results.map((r, i) => (
            <div key={i} className={`flex items-center gap-2 px-3 py-2 text-sm ${r.ok ? 'text-green-700' : 'text-red-600'}`}>
              {r.ok
                ? <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                : <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              }
              <span className="font-medium">{r.name}</span>
              {!r.ok && <span className="text-xs">— {r.msg}</span>}
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
        <button type="button" onClick={onClose} className="btn btn-secondary">
          {results ? 'Fermer' : 'Annuler'}
        </button>
        {!results && (
          <button
            type="submit"
            disabled={!sourceId || targetIds.length === 0 || loading}
            className="btn-primary"
          >
            {loading ? (
              <span className="flex items-center gap-2"><Spinner size="sm" />Copie en cours…</span>
            ) : (
              `Copier vers ${targetIds.length} restaurant${targetIds.length > 1 ? 's' : ''}`
            )}
          </button>
        )}
      </div>
    </form>
  );
}

export default function RestaurantsPage() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDuplicate, setShowDuplicate] = useState(false);

  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await restaurantsApi.list();
      setRestaurants(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger les restaurants.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRestaurants(); }, [fetchRestaurants]);

  const handleCreate = async (form) => {
    setFormLoading(true);
    try {
      await restaurantsApi.create(form);
      setShowCreate(false);
      fetchRestaurants();
    } catch (err) {
      alert(err.response?.data?.message || 'Impossible de créer le restaurant.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async (form) => {
    setFormLoading(true);
    try {
      await restaurantsApi.update(editTarget.id, form);
      setEditTarget(null);
      fetchRestaurants();
    } catch (err) {
      alert(err.response?.data?.message || 'Impossible de mettre à jour le restaurant.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await restaurantsApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchRestaurants();
    } catch (err) {
      alert(err.response?.data?.message || 'Impossible de supprimer le restaurant.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Restaurants</h1>
          <p className="text-sm text-gray-500 mt-1">Gérer tous les restaurants de la plateforme</p>
        </div>
        <div className="flex gap-2">
          {isSuperAdmin && restaurants.length >= 1 && (
            <button onClick={() => setShowDuplicate(true)} className="btn btn-secondary flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Dupliquer un menu
            </button>
          )}
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter un restaurant
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : restaurants.length === 0 ? (
        <div className="card p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-gray-500 text-sm">Aucun restaurant pour l'instant. Ajoutez le premier.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {restaurants.map((r) => (
            <div key={r.id} className="card p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{r.name}</h3>
                  {r.address && <p className="text-sm text-gray-500 mt-1 truncate">{r.address}</p>}
                </div>
                <span className="badge bg-green-100 text-green-800 flex-shrink-0">{r.currency}</span>
              </div>

              {(r.phone || r.email) && (
                <div className="text-xs text-gray-500 space-y-1">
                  {r.phone && <div>{r.phone}</div>}
                  {r.email && <div>{r.email}</div>}
                </div>
              )}

              <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                <Link to={`/restaurants/${r.id}/menu`} className="text-xs text-primary-700 hover:underline">Menu</Link>
                <span className="text-gray-300">|</span>
                <Link to={`/restaurants/${r.id}/tables`} className="text-xs text-primary-700 hover:underline">Tables</Link>
                <span className="text-gray-300">|</span>
                <Link to={`/restaurants/${r.id}/users`} className="text-xs text-primary-700 hover:underline">Utilisateurs</Link>
                <span className="text-gray-300">|</span>
                <Link to={`/restaurants/${r.id}/orders`} className="text-xs text-primary-700 hover:underline">Commandes</Link>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setEditTarget(r)} className="btn btn-secondary btn-sm flex-1">Modifier</button>
                <button onClick={() => setDeleteTarget(r)} className="btn btn-danger btn-sm">Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Ajouter un restaurant" size="lg">
        <RestaurantForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} loading={formLoading} />
      </Modal>

      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Modifier le restaurant" size="lg">
        {editTarget && (
          <RestaurantForm initial={editTarget} onSubmit={handleEdit} onCancel={() => setEditTarget(null)} loading={formLoading} />
        )}
      </Modal>

      <Modal isOpen={showDuplicate} onClose={() => setShowDuplicate(false)} title="Dupliquer un menu" size="lg">
        <DuplicateMenuModal
          restaurants={restaurants}
          onClose={() => setShowDuplicate(false)}
          onSuccess={() => { setShowDuplicate(false); fetchRestaurants(); }}
        />
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Supprimer le restaurant" size="sm">
        {deleteTarget && (
          <div>
            <p className="text-sm text-gray-600 mb-6">
              Supprimer <span className="font-semibold">{deleteTarget.name}</span> ? Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="btn btn-secondary">Annuler</button>
              <button onClick={handleDelete} disabled={deleteLoading} className="btn btn-danger">
                {deleteLoading ? <Spinner size="sm" /> : 'Supprimer'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

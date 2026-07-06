import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { tablesApi } from '../api/tables.js';
import { useAuthStore } from '../store/auth.js';
import Modal from '../components/Modal.jsx';
import Spinner from '../components/Spinner.jsx';

const EMPTY_FORM = { number: '', label: '', capacity: 2 };

function TableForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(
    initial
      ? { number: initial.number, label: initial.label || '', capacity: initial.capacity }
      : EMPTY_FORM
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'capacity' || name === 'number' ? Number(value) : value,
    }));
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Numéro de table *</label>
          <input name="number" type="number" min="1" value={form.number} onChange={handleChange} className="input" required placeholder="1" />
        </div>
        <div>
          <label className="label">Capacité *</label>
          <input name="capacity" type="number" min="1" max="20" value={form.capacity} onChange={handleChange} className="input" required placeholder="4" />
        </div>
      </div>
      <div>
        <label className="label">Libellé / Nom</label>
        <input name="label" value={form.label} onChange={handleChange} className="input" placeholder="ex. : Table fenêtre, Salon VIP" />
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button type="button" onClick={onCancel} className="btn btn-secondary">Annuler</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? <Spinner size="sm" /> : initial ? 'Enregistrer' : 'Ajouter la table'}
        </button>
      </div>
    </form>
  );
}

export default function TablesPage() {
  const { restaurantId } = useParams();
  const user = useAuthStore((s) => s.user);
  const canEdit = ['SUPER_ADMIN', 'OWNER', 'MANAGER'].includes(user?.role);

  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchTables = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await tablesApi.list(restaurantId);
      setTables(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger les tables.');
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  const handleCreate = async (form) => {
    setFormLoading(true);
    try {
      await tablesApi.create(restaurantId, form);
      setShowCreate(false);
      fetchTables();
    } catch (err) {
      alert(err.response?.data?.message || 'Impossible de créer la table.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async (form) => {
    setFormLoading(true);
    try {
      await tablesApi.update(restaurantId, editTarget.id, form);
      setEditTarget(null);
      fetchTables();
    } catch (err) {
      alert(err.response?.data?.message || 'Impossible de modifier la table.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await tablesApi.delete(restaurantId, deleteTarget.id);
      setDeleteTarget(null);
      fetchTables();
    } catch (err) {
      alert(err.response?.data?.message || 'Impossible de supprimer la table.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Jackson sérialise isActive → "active"
  const activeTables = tables.filter((t) => t.active !== false);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tables</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeTables.length} table{activeTables.length !== 1 ? 's' : ''} active{activeTables.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canEdit && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter une table
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : tables.length === 0 ? (
        <div className="card p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500 text-sm">Aucune table pour l'instant. Ajoutez la première.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Table n°</th>
                <th className="table-header">Libellé</th>
                <th className="table-header">Capacité</th>
                <th className="table-header">Statut</th>
                {canEdit && <th className="table-header text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {tables.map((table) => (
                <tr key={table.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-cell">
                    <div className="h-8 w-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-700 font-bold text-sm">
                      {table.number}
                    </div>
                  </td>
                  <td className="table-cell text-gray-600">{table.label || '-'}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1 text-gray-600">
                      <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {table.capacity}
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${table.active !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                      {table.active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="table-cell text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditTarget(table)} className="btn btn-secondary btn-sm">Modifier</button>
                        <button onClick={() => setDeleteTarget(table)} className="btn btn-danger btn-sm">Supprimer</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && tables.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wider">Plan de salle</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {activeTables.map((table) => (
              <div key={table.id} className="card p-3 text-center cursor-pointer hover:shadow-md transition-shadow border-2 border-transparent hover:border-primary-200">
                <div className="text-2xl font-bold text-primary-700 mb-1">{table.number}</div>
                {table.label && <div className="text-xs text-gray-500 truncate">{table.label}</div>}
                <div className="text-xs text-gray-400 mt-1">{table.capacity} places</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Ajouter une table">
        <TableForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} loading={formLoading} />
      </Modal>

      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Modifier la table">
        {editTarget && <TableForm initial={editTarget} onSubmit={handleEdit} onCancel={() => setEditTarget(null)} loading={formLoading} />}
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Supprimer la table" size="sm">
        {deleteTarget && (
          <div>
            <p className="text-sm text-gray-600 mb-6">
              Supprimer la Table <span className="font-semibold">n°{deleteTarget.number}</span>
              {deleteTarget.label ? ` (${deleteTarget.label})` : ''} ? Elle sera désactivée.
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

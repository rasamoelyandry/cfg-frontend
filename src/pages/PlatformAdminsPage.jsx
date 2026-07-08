import React, { useState, useEffect, useCallback } from 'react';
import { platformAdminsApi } from '../api/platformAdmins.js';
import { useAuthStore } from '../store/auth.js';
import Modal from '../components/Modal.jsx';
import Spinner from '../components/Spinner.jsx';

const EMPTY_FORM = { firstName: '', lastName: '', email: '', phone: '', password: '' };

function AdminForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(
    initial
      ? { firstName: initial.firstName, lastName: initial.lastName, email: initial.email, phone: initial.phone || '', password: '' }
      : EMPTY_FORM
  );
  const isEdit = !!initial;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const payload = { ...form };
        if (isEdit && !payload.password) delete payload.password;
        onSubmit(payload);
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Prénom *</label>
          <input name="firstName" value={form.firstName} onChange={handleChange} className="input" required placeholder="Jean" />
        </div>
        <div>
          <label className="label">Nom *</label>
          <input name="lastName" value={form.lastName} onChange={handleChange} className="input" required placeholder="Dupont" />
        </div>
      </div>
      <div>
        <label className="label">E-mail *</label>
        <input name="email" type="email" value={form.email} onChange={handleChange} className="input" required placeholder="admin@cfg.app" />
      </div>
      <div>
        <label className="label">Téléphone</label>
        <input name="phone" value={form.phone} onChange={handleChange} className="input" placeholder="+261 32 00 000 00" />
      </div>
      <div>
        <label className="label">
          {isEdit ? 'Nouveau mot de passe (laisser vide pour conserver)' : 'Mot de passe *'}
        </label>
        <input
          name="password" type="password" value={form.password} onChange={handleChange}
          className="input" required={!isEdit}
          placeholder={isEdit ? 'Laisser vide pour conserver' : '8 caractères minimum'}
          minLength={isEdit ? 0 : 8}
        />
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button type="button" onClick={onCancel} className="btn btn-secondary">Annuler</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? <Spinner size="sm" /> : isEdit ? 'Enregistrer' : 'Créer l\'administrateur'}
        </button>
      </div>
    </form>
  );
}

export default function PlatformAdminsPage() {
  const currentUser = useAuthStore((s) => s.user);

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await platformAdminsApi.list();
      setAdmins(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger les administrateurs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const handleCreate = async (form) => {
    setFormLoading(true);
    try {
      await platformAdminsApi.create(form);
      setShowCreate(false);
      fetchAdmins();
    } catch (err) {
      alert(err.response?.data?.message || 'Impossible de créer l\'administrateur.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async (form) => {
    setFormLoading(true);
    try {
      await platformAdminsApi.update(editTarget.id, form);
      setEditTarget(null);
      fetchAdmins();
    } catch (err) {
      alert(err.response?.data?.message || 'Impossible de modifier l\'administrateur.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeactivate = async () => {
    setDeactivateLoading(true);
    try {
      await platformAdminsApi.deactivate(deactivateTarget.id);
      setDeactivateTarget(null);
      fetchAdmins();
    } catch (err) {
      alert(err.response?.data?.message || 'Impossible de désactiver cet administrateur.');
    } finally {
      setDeactivateLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administrateurs plateforme</h1>
          <p className="text-sm text-gray-500 mt-1">
            Comptes avec accès complet à tous les restaurants — {admins.length} compte{admins.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter un administrateur
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : admins.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-500 text-sm">Aucun administrateur pour l'instant.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Nom</th>
                <th className="table-header">E-mail</th>
                <th className="table-header">Téléphone</th>
                <th className="table-header">Statut</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {admins.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-purple-700 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                        {a.firstName?.[0]}{a.lastName?.[0]}
                      </div>
                      <div>
                        <div className="font-medium">{a.firstName} {a.lastName}</div>
                        {a.id === currentUser?.id && <div className="text-xs text-gray-400">Vous</div>}
                      </div>
                    </div>
                  </td>
                  <td className="table-cell text-gray-600">{a.email}</td>
                  <td className="table-cell text-gray-600">{a.phone || '-'}</td>
                  <td className="table-cell">
                    <span className={`badge ${a.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                      {a.isActive !== false ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditTarget(a)} className="btn btn-secondary btn-sm">Modifier</button>
                      {a.id !== currentUser?.id && (
                        <button onClick={() => setDeactivateTarget(a)} className="btn btn-danger btn-sm">Désactiver</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Ajouter un administrateur" size="lg">
        <AdminForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} loading={formLoading} />
      </Modal>

      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Modifier l'administrateur" size="lg">
        {editTarget && <AdminForm initial={editTarget} onSubmit={handleEdit} onCancel={() => setEditTarget(null)} loading={formLoading} />}
      </Modal>

      <Modal isOpen={!!deactivateTarget} onClose={() => setDeactivateTarget(null)} title="Désactiver l'administrateur" size="sm">
        {deactivateTarget && (
          <div>
            <p className="text-sm text-gray-600 mb-6">
              Désactiver <span className="font-semibold">{deactivateTarget.firstName} {deactivateTarget.lastName}</span> ? Cette personne ne pourra plus se connecter.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeactivateTarget(null)} className="btn btn-secondary">Annuler</button>
              <button onClick={handleDeactivate} disabled={deactivateLoading} className="btn btn-danger">
                {deactivateLoading ? <Spinner size="sm" /> : 'Désactiver'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

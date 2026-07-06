import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { usersApi } from '../api/users.js';
import { useAuthStore } from '../store/auth.js';
import Modal from '../components/Modal.jsx';
import Spinner from '../components/Spinner.jsx';

const ROLES = ['OWNER', 'MANAGER', 'WAITER', 'KITCHEN'];
const ALL_ROLES = ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'WAITER', 'KITCHEN'];

const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  OWNER: 'Propriétaire',
  MANAGER: 'Gérant',
  WAITER: 'Serveur',
  KITCHEN: 'Cuisine',
};

const ROLE_COLORS = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-800',
  OWNER: 'bg-blue-100 text-blue-800',
  MANAGER: 'bg-green-100 text-green-800',
  WAITER: 'bg-yellow-100 text-yellow-800',
  KITCHEN: 'bg-orange-100 text-orange-800',
};

const EMPTY_FORM = { firstName: '', lastName: '', email: '', phone: '', password: '', role: 'WAITER' };

function UserForm({ initial, onSubmit, onCancel, loading, currentUserRole }) {
  const [form, setForm] = useState(
    initial
      ? { firstName: initial.firstName, lastName: initial.lastName, email: initial.email, phone: initial.phone || '', role: initial.role, password: '' }
      : EMPTY_FORM
  );
  const isEdit = !!initial;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const availableRoles = currentUserRole === 'SUPER_ADMIN' ? ALL_ROLES : ROLES;

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
        <input name="email" type="email" value={form.email} onChange={handleChange} className="input" required placeholder="jean@exemple.com" />
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
      <div>
        <label className="label">Rôle *</label>
        <select name="role" value={form.role} onChange={handleChange} className="input" required>
          {availableRoles.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button type="button" onClick={onCancel} className="btn btn-secondary">Annuler</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? <Spinner size="sm" /> : isEdit ? 'Enregistrer' : 'Créer l\'utilisateur'}
        </button>
      </div>
    </form>
  );
}

export default function UsersPage() {
  const { restaurantId } = useParams();
  const user = useAuthStore((s) => s.user);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const [roleTarget, setRoleTarget] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [roleLoading, setRoleLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await usersApi.list(restaurantId);
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger les utilisateurs.');
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreate = async (form) => {
    setFormLoading(true);
    try {
      await usersApi.create(restaurantId, form);
      setShowCreate(false);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Impossible de créer l\'utilisateur.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async (form) => {
    setFormLoading(true);
    try {
      await usersApi.update(restaurantId, editTarget.id, form);
      setEditTarget(null);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Impossible de modifier l\'utilisateur.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeactivate = async () => {
    setDeactivateLoading(true);
    try {
      await usersApi.deactivate(restaurantId, deactivateTarget.id);
      setDeactivateTarget(null);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Impossible de désactiver l\'utilisateur.');
    } finally {
      setDeactivateLoading(false);
    }
  };

  const handleRoleChange = async () => {
    setRoleLoading(true);
    try {
      await usersApi.changeRole(restaurantId, roleTarget.id, newRole);
      setRoleTarget(null);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Impossible de changer le rôle.');
    } finally {
      setRoleLoading(false);
    }
  };

  const openRoleModal = (u) => { setRoleTarget(u); setNewRole(u.role); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="text-sm text-gray-500 mt-1">{users.length} membre{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter un utilisateur
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : users.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-500 text-sm">Aucun utilisateur pour l'instant.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Nom</th>
                <th className="table-header">E-mail</th>
                <th className="table-header">Téléphone</th>
                <th className="table-header">Rôle</th>
                <th className="table-header">Statut</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary-700 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </div>
                      <div>
                        <div className="font-medium">{u.firstName} {u.lastName}</div>
                        {u.id === user?.id && <div className="text-xs text-gray-400">Vous</div>}
                      </div>
                    </div>
                  </td>
                  <td className="table-cell text-gray-600">{u.email}</td>
                  <td className="table-cell text-gray-600">{u.phone || '-'}</td>
                  <td className="table-cell">
                    <span className={`badge ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-700'}`}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${u.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                      {u.isActive !== false ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditTarget(u)} className="btn btn-secondary btn-sm">Modifier</button>
                      <button onClick={() => openRoleModal(u)} className="btn btn-secondary btn-sm">Rôle</button>
                      {u.id !== user?.id && (
                        <button onClick={() => setDeactivateTarget(u)} className="btn btn-danger btn-sm">Désactiver</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Ajouter un utilisateur" size="lg">
        <UserForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} loading={formLoading} currentUserRole={user?.role} />
      </Modal>

      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Modifier l'utilisateur" size="lg">
        {editTarget && <UserForm initial={editTarget} onSubmit={handleEdit} onCancel={() => setEditTarget(null)} loading={formLoading} currentUserRole={user?.role} />}
      </Modal>

      <Modal isOpen={!!roleTarget} onClose={() => setRoleTarget(null)} title="Changer le rôle" size="sm">
        {roleTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Changer le rôle de <span className="font-semibold">{roleTarget.firstName} {roleTarget.lastName}</span> :
            </p>
            <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="input">
              {(user?.role === 'SUPER_ADMIN' ? ALL_ROLES : ROLES).map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
              ))}
            </select>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setRoleTarget(null)} className="btn btn-secondary">Annuler</button>
              <button onClick={handleRoleChange} disabled={roleLoading} className="btn-primary">
                {roleLoading ? <Spinner size="sm" /> : 'Enregistrer le rôle'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!deactivateTarget} onClose={() => setDeactivateTarget(null)} title="Désactiver l'utilisateur" size="sm">
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

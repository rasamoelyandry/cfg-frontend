import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { menuApi } from '../api/menu.js';
import { useAuthStore } from '../store/auth.js';
import Modal from '../components/Modal.jsx';
import Spinner from '../components/Spinner.jsx';

const CATEGORY_EMPTY = { name: '', description: '', sortOrder: 0 };
const ITEM_EMPTY = { categoryId: '', name: '', description: '', price: '', sortOrder: 0, trackStock: false, stockQuantity: 0, hasModifiers: false, modifiers: [] };
const MODIFIER_EMPTY = { name: '', priceDelta: 0, isDefault: false };

function CategoryForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initial || CATEGORY_EMPTY);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === 'sortOrder' ? Number(value) : value }));
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div>
        <label className="label">Nom de la catégorie *</label>
        <input name="name" value={form.name} onChange={handleChange} className="input" required placeholder="Entrées" />
      </div>
      <div>
        <label className="label">Description</label>
        <input name="description" value={form.description} onChange={handleChange} className="input" placeholder="Description optionnelle" />
      </div>
      <div>
        <label className="label">Ordre d'affichage</label>
        <input name="sortOrder" type="number" value={form.sortOrder} onChange={handleChange} className="input" min="0" />
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button type="button" onClick={onCancel} className="btn btn-secondary">Annuler</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? <Spinner size="sm" /> : initial ? 'Enregistrer' : 'Créer la catégorie'}
        </button>
      </div>
    </form>
  );
}

function ItemForm({ initial, categories, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(
    initial
      ? {
          ...ITEM_EMPTY,
          ...initial,
          price: String(initial.price),
          hasModifiers: (initial.modifiers || []).length > 0,
          modifiers: (initial.modifiers || []).map((m) => ({ name: m.name, priceDelta: m.priceDelta, isDefault: m.isDefault })),
        }
      : ITEM_EMPTY
  );

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'sortOrder' || name === 'stockQuantity') ? Number(value) : value,
    }));
  };

  const handleModifierChange = (index, field, value) => {
    setForm((prev) => {
      const modifiers = [...prev.modifiers];
      modifiers[index] = { ...modifiers[index], [field]: field === 'priceDelta' ? Number(value) : field === 'isDefault' ? value : value };
      return { ...prev, modifiers };
    });
  };

  const addModifierRow = () => {
    setForm((prev) => ({ ...prev, modifiers: [...prev.modifiers, { ...MODIFIER_EMPTY }] }));
  };

  const removeModifierRow = (index) => {
    setForm((prev) => ({ ...prev, modifiers: prev.modifiers.filter((_, i) => i !== index) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      price: parseFloat(form.price),
      modifiers: form.hasModifiers ? form.modifiers.filter((m) => m.name.trim()) : [],
    };
    delete payload.hasModifiers;
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Catégorie *</label>
        <select name="categoryId" value={form.categoryId} onChange={handleChange} className="input" required>
          <option value="">Sélectionner une catégorie</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Nom de l'article *</label>
        <input name="name" value={form.name} onChange={handleChange} className="input" required placeholder="Saumon grillé" />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea name="description" value={form.description} onChange={handleChange} className="input" rows={2} placeholder="Description de l'article..." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Prix *</label>
          <input name="price" type="number" step="0.01" min="0" value={form.price} onChange={handleChange} className="input" required placeholder="25000" />
        </div>
        <div>
          <label className="label">Ordre d'affichage</label>
          <input name="sortOrder" type="number" value={form.sortOrder} onChange={handleChange} className="input" min="0" />
        </div>
      </div>
      <div className="border-t border-gray-200 pt-4">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="trackStock" checked={form.trackStock} onChange={handleChange} className="rounded" />
          Suivre le stock de cet article
        </label>
        {form.trackStock && (
          <div className="mt-3">
            <label className="label">Quantité en stock</label>
            <input name="stockQuantity" type="number" min="0" value={form.stockQuantity} onChange={handleChange} className="input" />
            <p className="text-xs text-gray-400 mt-1">L'article sera automatiquement masqué quand le stock atteint 0.</p>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 pt-4">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="hasModifiers" checked={form.hasModifiers} onChange={handleChange} className="rounded" />
          Accompagnement / options possibles
        </label>
        <p className="text-xs text-gray-400 mt-1">
          Ex : choix de sauce, garniture, cuisson. Laissez le prix à 0 pour un accompagnement inclus, ou indiquez un supplément.
        </p>

        {form.hasModifiers && (
          <div className="mt-3 space-y-2">
            {form.modifiers.map((mod, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={mod.name}
                  onChange={(e) => handleModifierChange(i, 'name', e.target.value)}
                  className="input flex-1"
                  placeholder="Ex : Sauce poivre"
                  required
                />
                <input
                  type="number" step="0.01"
                  value={mod.priceDelta}
                  onChange={(e) => handleModifierChange(i, 'priceDelta', e.target.value)}
                  className="input w-28"
                  placeholder="Prix +"
                />
                <label className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={mod.isDefault}
                    onChange={(e) => handleModifierChange(i, 'isDefault', e.target.checked)}
                    className="rounded"
                  />
                  défaut
                </label>
                <button type="button" onClick={() => removeModifierRow(i)} className="btn btn-danger btn-sm">✕</button>
              </div>
            ))}
            <button type="button" onClick={addModifierRow} className="btn btn-secondary btn-sm">
              + Ajouter une option
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button type="button" onClick={onCancel} className="btn btn-secondary">Annuler</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? <Spinner size="sm" /> : initial ? 'Enregistrer' : 'Ajouter l\'article'}
        </button>
      </div>
    </form>
  );
}

function CategoryAccordion({ category, canEdit, onEditCategory, onDeleteCategory, onAddItem, onEditItem, onDeleteItem, onToggleAvailability, onRestock }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
        <button className="flex items-center gap-2 flex-1 text-left" onClick={() => setOpen((v) => !v)}>
          <svg className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-semibold text-gray-900">{category.name}</span>
          <span className="text-xs text-gray-400">({category.items?.length || 0} article{category.items?.length !== 1 ? 's' : ''})</span>
        </button>
        {canEdit && (
          <div className="flex items-center gap-1 ml-2">
            <button onClick={() => onAddItem(category)} className="btn btn-secondary btn-sm">+ Article</button>
            <button onClick={() => onEditCategory(category)} className="btn btn-secondary btn-sm">Modifier</button>
            <button onClick={() => onDeleteCategory(category)} className="btn btn-danger btn-sm">Supprimer</button>
          </div>
        )}
      </div>

      {open && (
        <div>
          {!category.items || category.items.length === 0 ? (
            <p className="text-sm text-gray-400 px-5 py-4 italic">Aucun article dans cette catégorie.</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-white">
                  <th className="table-header">Nom</th>
                  <th className="table-header">Description</th>
                  <th className="table-header">Prix</th>
                  <th className="table-header">Stock</th>
                  <th className="table-header">Disponible</th>
                  {canEdit && <th className="table-header text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {category.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell font-medium">
                      {item.name}
                      {item.modifiers?.length > 0 && (
                        <span className="ml-2 badge bg-blue-100 text-blue-700 text-xs" title={item.modifiers.map((m) => m.name).join(', ')}>
                          {item.modifiers.length} option{item.modifiers.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </td>
                    <td className="table-cell text-gray-500 max-w-xs truncate">{item.description || '-'}</td>
                    <td className="table-cell">
                      <span className="font-medium">{Number(item.price).toLocaleString('fr-MG')} Ar</span>
                    </td>
                    <td className="table-cell">
                      {item.trackStock ? (
                        <div className="flex items-center gap-2">
                          <span className={`badge ${item.stockQuantity > 0 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-700'}`}>
                            {item.stockQuantity}
                          </span>
                          {canEdit && (
                            <button onClick={() => onRestock(item)} className="text-xs text-primary-700 hover:underline">
                              + Réapprovisionner
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="table-cell">
                      {item.trackStock ? (
                        <span className={`badge ${item.isAvailable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`} title="Dispo automatique liée au stock">
                          {item.isAvailable ? 'Disponible' : 'Indisponible'}
                        </span>
                      ) : canEdit ? (
                        <button
                          onClick={() => onToggleAvailability(item)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${item.isAvailable ? 'bg-green-500' : 'bg-gray-200'}`}
                          title={item.isAvailable ? 'Marquer indisponible' : 'Marquer disponible'}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${item.isAvailable ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      ) : (
                        <span className={`badge ${item.isAvailable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                          {item.isAvailable ? 'Disponible' : 'Indisponible'}
                        </span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="table-cell text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => onEditItem(item, category)} className="btn btn-secondary btn-sm">Modifier</button>
                          <button onClick={() => onDeleteItem(item)} className="btn btn-danger btn-sm">Supprimer</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default function MenuPage() {
  const { restaurantId } = useParams();
  const user = useAuthStore((s) => s.user);
  const canEdit = user?.role !== 'WAITER';

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [deleteCategory, setDeleteCategory] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [showCreateItem, setShowCreateItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [restockItem, setRestockItem] = useState(null);
  const [restockQty, setRestockQty] = useState('');

  const fetchMenu = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await menuApi.getMenu(restaurantId);
      setCategories(data?.categories || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger le menu.');
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => { fetchMenu(); }, [fetchMenu]);

  const handleCreateCategory = async (form) => {
    setFormLoading(true);
    try {
      await menuApi.createCategory(restaurantId, form);
      setShowCreateCategory(false);
      fetchMenu();
    } catch (err) {
      alert(err.response?.data?.message || 'Impossible de créer la catégorie.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditCategory = async (form) => {
    setFormLoading(true);
    try {
      await menuApi.updateCategory(restaurantId, editCategory.id, form);
      setEditCategory(null);
      fetchMenu();
    } catch (err) {
      alert(err.response?.data?.message || 'Impossible de modifier la catégorie.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCategory = async () => {
    setDeleteLoading(true);
    try {
      await menuApi.deleteCategory(restaurantId, deleteCategory.id);
      setDeleteCategory(null);
      fetchMenu();
    } catch (err) {
      alert(err.response?.data?.message || 'Impossible de supprimer la catégorie.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCreateItem = async (form) => {
    setFormLoading(true);
    try {
      await menuApi.createItem(restaurantId, form);
      setShowCreateItem(null);
      fetchMenu();
    } catch (err) {
      alert(err.response?.data?.message || 'Impossible de créer l\'article.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditItem = async (form) => {
    setFormLoading(true);
    try {
      await menuApi.updateItem(restaurantId, editItem.item.id, form);
      setEditItem(null);
      fetchMenu();
    } catch (err) {
      alert(err.response?.data?.message || 'Impossible de modifier l\'article.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteItem = async () => {
    setDeleteLoading(true);
    try {
      await menuApi.deleteItem(restaurantId, deleteItem.id);
      setDeleteItem(null);
      fetchMenu();
    } catch (err) {
      alert(err.response?.data?.message || 'Impossible de supprimer l\'article.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRestock = async (e) => {
    e.preventDefault();
    const quantity = Number(restockQty);
    if (!quantity || quantity <= 0) return;
    setFormLoading(true);
    try {
      await menuApi.restockItem(restaurantId, restockItem.id, quantity);
      setRestockItem(null);
      setRestockQty('');
      fetchMenu();
    } catch (err) {
      alert(err.response?.data?.message || 'Impossible de réapprovisionner cet article.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleAvailability = async (item) => {
    try {
      await menuApi.toggleItemAvailability(restaurantId, item.id, !item.isAvailable);
      fetchMenu();
    } catch (err) {
      alert(err.response?.data?.message || 'Impossible de modifier la disponibilité.');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu</h1>
          <p className="text-sm text-gray-500 mt-1">Gérer les catégories et les articles</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowCreateCategory(true)} className="btn-primary">
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter une catégorie
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : categories.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-500 text-sm">Aucune catégorie pour l'instant. Ajoutez votre première catégorie.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => (
            <CategoryAccordion
              key={cat.id}
              category={cat}
              canEdit={canEdit}
              onEditCategory={setEditCategory}
              onDeleteCategory={setDeleteCategory}
              onAddItem={(category) => setShowCreateItem(category)}
              onEditItem={(item, category) => setEditItem({ item, category })}
              onDeleteItem={setDeleteItem}
              onToggleAvailability={handleToggleAvailability}
              onRestock={(item) => { setRestockItem(item); setRestockQty(''); }}
            />
          ))}
        </div>
      )}

      <Modal isOpen={showCreateCategory} onClose={() => setShowCreateCategory(false)} title="Ajouter une catégorie">
        <CategoryForm onSubmit={handleCreateCategory} onCancel={() => setShowCreateCategory(false)} loading={formLoading} />
      </Modal>

      <Modal isOpen={!!editCategory} onClose={() => setEditCategory(null)} title="Modifier la catégorie">
        {editCategory && <CategoryForm initial={editCategory} onSubmit={handleEditCategory} onCancel={() => setEditCategory(null)} loading={formLoading} />}
      </Modal>

      <Modal isOpen={!!deleteCategory} onClose={() => setDeleteCategory(null)} title="Supprimer la catégorie" size="sm">
        {deleteCategory && (
          <div>
            <p className="text-sm text-gray-600 mb-6">
              Supprimer la catégorie <span className="font-semibold">{deleteCategory.name}</span> ? Tous ses articles seront également supprimés.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteCategory(null)} className="btn btn-secondary">Annuler</button>
              <button onClick={handleDeleteCategory} disabled={deleteLoading} className="btn btn-danger">
                {deleteLoading ? <Spinner size="sm" /> : 'Supprimer'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!showCreateItem} onClose={() => setShowCreateItem(null)} title="Ajouter un article" size="lg">
        {showCreateItem && (
          <ItemForm
            initial={{ ...ITEM_EMPTY, categoryId: showCreateItem.id }}
            categories={categories}
            onSubmit={handleCreateItem}
            onCancel={() => setShowCreateItem(null)}
            loading={formLoading}
          />
        )}
      </Modal>

      <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Modifier l'article" size="lg">
        {editItem && (
          <ItemForm
            initial={{ ...editItem.item, categoryId: editItem.category.id }}
            categories={categories}
            onSubmit={handleEditItem}
            onCancel={() => setEditItem(null)}
            loading={formLoading}
          />
        )}
      </Modal>

      <Modal isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} title="Supprimer l'article" size="sm">
        {deleteItem && (
          <div>
            <p className="text-sm text-gray-600 mb-6">
              Supprimer <span className="font-semibold">{deleteItem.name}</span> ?
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteItem(null)} className="btn btn-secondary">Annuler</button>
              <button onClick={handleDeleteItem} disabled={deleteLoading} className="btn btn-danger">
                {deleteLoading ? <Spinner size="sm" /> : 'Supprimer'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!restockItem} onClose={() => setRestockItem(null)} title="Réapprovisionner" size="sm">
        {restockItem && (
          <form onSubmit={handleRestock} className="space-y-4">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">{restockItem.name}</span> — stock actuel : {restockItem.stockQuantity}
            </p>
            <div>
              <label className="label">Quantité à ajouter</label>
              <input
                type="number" min="1" value={restockQty}
                onChange={(e) => setRestockQty(e.target.value)}
                className="input" required autoFocus
              />
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
              <button type="button" onClick={() => setRestockItem(null)} className="btn btn-secondary">Annuler</button>
              <button type="submit" disabled={formLoading} className="btn-primary">
                {formLoading ? <Spinner size="sm" /> : 'Ajouter au stock'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

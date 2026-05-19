'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

import { useConfirm } from '@/components/admin/ui/confirm-dialog';
import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';

interface MenuItem {
  id: string;
  label: string;
  labelBn: string;
  url: string;
  type: 'link' | 'category' | 'page' | 'custom';
  target: '_self' | '_blank';
  icon: string;
  position: number;
  parentId: string | null;
  children: MenuItem[];
  isVisible: boolean;
}

interface Menu {
  id: string;
  name: string;
  location: 'header' | 'footer' | 'sidebar' | 'mobile';
  items: MenuItem[];
  updatedAt: string;
}

interface MenuItemFormData {
  label: string;
  labelBn: string;
  url: string;
  type: 'link' | 'category' | 'page' | 'custom';
  target: '_self' | '_blank';
  icon: string;
  isVisible: boolean;
}

const defaultItemForm: MenuItemFormData = {
  label: '',
  labelBn: '',
  url: '',
  type: 'custom',
  target: '_self',
  icon: '',
  isVisible: true,
};

function MenuItemNode({
  item,
  depth,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  draggedId,
}: {
  item: MenuItem;
  depth: number;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  draggedId: string | null;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className={`${depth > 0 ? 'ml-6' : ''}`}>
      <div
        draggable
        onDragStart={() => onDragStart(item.id)}
        onDragOver={(e) => onDragOver(e, item.id)}
        onDrop={(e) => onDrop(e, item.id)}
        className={`flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-200 rounded-lg mb-2 cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow ${
          draggedId === item.id ? 'opacity-50' : ''
        } ${!item.isVisible ? 'opacity-60' : ''}`}
      >
        {/* Drag Handle */}
        <svg
          className="w-4 h-4 text-gray-400 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>

        {/* Expand/Collapse */}
        {item.children.length > 0 ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <div className="w-4" />
        )}

        {/* Item Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">{item.label}</span>
            {item.labelBn && <span className="text-xs text-gray-500">({item.labelBn})</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`text-xs px-1.5 py-0.5 rounded ${
                item.type === 'category'
                  ? 'bg-teal-100 text-teal-700'
                  : item.type === 'page'
                    ? 'bg-green-100 text-green-700'
                    : item.type === 'link'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-700'
              }`}
            >
              {item.type}
            </span>
            <span className="text-xs text-gray-400 truncate">{item.url}</span>
          </div>
        </div>

        {/* Visibility Badge */}
        {!item.isVisible && (
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Hidden</span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(item)}
            className="p-1 text-gray-400 hover:text-teal-600"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="p-1 text-gray-400 hover:text-red-600"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Children */}
      {expanded && item.children.length > 0 && (
        <div>
          {item.children.map((child) => (
            <MenuItemNode
              key={child.id}
              item={child}
              depth={depth + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              draggedId={draggedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminMenusPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemForm, setItemForm] = useState<MenuItemFormData>(defaultItemForm);
  const [saving, setSaving] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();

  const fetchMenus = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/admin/menus');
      const menus = data.data?.menus ?? data.menus;
      setMenus(menus);
      if (menus.length > 0 && !activeMenuId) {
        setActiveMenuId(menus[0].id);
      }
    } catch (error) {
      console.error('Fetch menus error:', error);
      toast.error(getApiErrorMessage(err, 'Failed to load menus'));
    } finally {
      setLoading(false);
    }
  }, [activeMenuId]);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  const activeMenu = menus.find((m) => m.id === activeMenuId);

  const handleAddItem = () => {
    setItemForm(defaultItemForm);
    setEditingItem(null);
    setShowItemForm(true);
  };

  const handleEditItem = (item: MenuItem) => {
    setItemForm({
      label: item.label,
      labelBn: item.labelBn || '',
      url: item.url || '',
      type: item.type,
      target: item.target,
      icon: item.icon || '',
      isVisible: item.isVisible,
    });
    setEditingItem(item);
    setShowItemForm(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingItem) {
        await apiClient.patch(`/admin/menus/${activeMenuId}/items/${editingItem.id}`, itemForm);
      } else {
        await apiClient.post(`/admin/menus/${activeMenuId}/items`, itemForm);
      }

      toast.success('Menu item saved');
      setShowItemForm(false);
      fetchMenus();
    } catch (error) {
      console.error('Save item error:', error);
      toast.error(getApiErrorMessage(err, 'Failed to save menu item'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    const ok = await confirm({
      title: 'Delete this menu item and all its children?',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) {
      return;
    }
    try {
      await apiClient.delete(`/admin/menus/${activeMenuId}/items/${itemId}`);
      toast.success('Menu item deleted');
      fetchMenus();
    } catch (error) {
      console.error('Delete item error:', error);
      toast.error(getApiErrorMessage(err, 'Failed to delete menu item'));
    }
  };

  const handleDragStart = (id: string) => setDraggedId(id);

  const handleDragOver = (e: React.DragEvent, _targetId: string) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    try {
      await apiClient.post(`/admin/menus/${activeMenuId}/items/${draggedId}/move`, {
        targetId,
        position: 'after',
      });
      fetchMenus();
    } catch (error) {
      console.error('Move item error:', error);
      toast.error(getApiErrorMessage(err, 'Failed to reorder menu'));
    }

    setDraggedId(null);
  };

  const handleCreateMenu = async () => {
    const name = prompt('Enter menu name (e.g., Main Navigation):');
    if (!name) {
      return;
    }

    const location = prompt('Enter location (header/footer/sidebar/mobile):');
    if (!location) {
      return;
    }

    try {
      const { data } = await apiClient.post('/admin/menus', { name, location });
      toast.success('Menu created');
      fetchMenus();
      setActiveMenuId(data.data?.id ?? data.id);
    } catch (error) {
      console.error('Create menu error:', error);
      toast.error(getApiErrorMessage(err, 'Failed to create menu'));
    }
  };

  return (
    <div className="space-y-6">
      {confirmDialog}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Navigation Menus</h1>
          <p className="text-sm text-gray-500 mt-1">Build and organize your site navigation</p>
        </div>
        <button
          onClick={handleCreateMenu}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700"
        >
          + Create Menu
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Menu List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Menus</h2>
          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : menus.length === 0 ? (
            <p className="text-sm text-gray-500">No menus yet</p>
          ) : (
            <nav className="space-y-1">
              {menus.map((menu) => (
                <button
                  key={menu.id}
                  onClick={() => setActiveMenuId(menu.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeMenuId === menu.id
                      ? 'bg-teal-50 text-teal-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div>{menu.name}</div>
                  <div className="text-xs text-gray-400 capitalize">{menu.location}</div>
                </button>
              ))}
            </nav>
          )}
        </div>

        {/* Menu Editor */}
        <div className="lg:col-span-3 space-y-4">
          {activeMenu ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{activeMenu.name}</h2>
                  <p className="text-sm text-gray-500 capitalize">
                    Location: {activeMenu.location}
                  </p>
                </div>
                <button
                  onClick={handleAddItem}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700"
                >
                  + Add Item
                </button>
              </div>

              {/* Menu Tree */}
              <div className="space-y-0">
                {activeMenu.items.length === 0 ? (
                  <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
                    <p className="text-gray-500">No menu items yet. Add your first item!</p>
                  </div>
                ) : (
                  activeMenu.items.map((item) => (
                    <MenuItemNode
                      key={item.id}
                      item={item}
                      depth={0}
                      onEdit={handleEditItem}
                      onDelete={handleDeleteItem}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      draggedId={draggedId}
                    />
                  ))
                )}
              </div>

              <p className="text-xs text-gray-400">
                Drag items to reorder. Drag onto another item to nest it as a child.
              </p>
            </>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-500">Select a menu from the left or create a new one.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Item Modal */}
      {showItemForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowItemForm(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
              </h2>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Label (English)
                </label>
                <input
                  type="text"
                  value={itemForm.label}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, label: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  লেবেল (বাংলা)
                </label>
                <input
                  type="text"
                  value={itemForm.labelBn}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, labelBn: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={itemForm.type}
                  onChange={(e) =>
                    setItemForm((prev) => ({ ...prev, type: e.target.value as any }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="custom">Custom Link</option>
                  <option value="category">Category</option>
                  <option value="page">Page</option>
                  <option value="link">External Link</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                <input
                  type="text"
                  value={itemForm.url}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, url: e.target.value }))}
                  placeholder="/categories/electronics"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target</label>
                <select
                  value={itemForm.target}
                  onChange={(e) =>
                    setItemForm((prev) => ({ ...prev, target: e.target.value as any }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="_self">Same Window</option>
                  <option value="_blank">New Tab</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Icon (optional)
                </label>
                <input
                  type="text"
                  value={itemForm.icon}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, icon: e.target.value }))}
                  placeholder="e.g., home, shopping-cart"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={itemForm.isVisible}
                  onChange={(e) =>
                    setItemForm((prev) => ({ ...prev, isVisible: e.target.checked }))
                  }
                  className="rounded border-gray-300 text-teal-600"
                />
                <span className="text-sm text-gray-700">Visible</span>
              </label>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowItemForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingItem ? 'Update' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

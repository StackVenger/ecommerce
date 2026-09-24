'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { useConfirm } from '@/components/admin/ui/confirm-dialog';
import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';

interface MenuItem {
  id: string;
  label: string;
  labelBn: string | null;
  url: string;
  type: string;
  target: string;
  icon: string;
  isVisible: boolean;
  position: number;
  children?: MenuItem[];
}

interface Menu {
  id: string;
  name: string;
  location: string;
  items: MenuItem[];
}

const LOCATION_LABELS: Record<string, string> = {
  HEADER: 'Header',
  FOOTER: 'Footer',
  SIDEBAR: 'Sidebar',
  MOBILE: 'Mobile',
  header: 'Header',
  footer: 'Footer',
  sidebar: 'Sidebar',
  mobile: 'Mobile',
};

const TYPE_OPTIONS = [
  { value: 'custom', label: 'Custom Link' },
  { value: 'category', label: 'Category' },
  { value: 'page', label: 'Page' },
  { value: 'link', label: 'External Link' },
];

const TARGET_OPTIONS = [
  { value: '_self', label: 'Same Tab' },
  { value: '_blank', label: 'New Tab' },
];

export default function AdminNavigationPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [newMenu, setNewMenu] = useState({ name: '', location: 'header' });
  const [newItem, setNewItem] = useState({
    label: '',
    labelBn: '',
    url: '',
    type: 'custom',
    target: '_self',
    icon: '',
    isVisible: true,
    parentId: '',
  });
  const { confirm, dialog: confirmDialog } = useConfirm();

  const fetchMenus = async () => {
    try {
      const { data } = await apiClient.get('/admin/menus');
      const result = data.data ?? data;
      setMenus(result.menus ?? result ?? []);
      if (!selectedMenuId && (result.menus ?? result)?.length > 0) {
        setSelectedMenuId((result.menus ?? result)[0].id);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load menus'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  const selectedMenu = menus.find((m) => m.id === selectedMenuId);

  // ─── Menu CRUD ────────────────────────────────────────────

  const createMenu = async () => {
    if (!newMenu.name.trim()) {
      return;
    }
    try {
      await apiClient.post('/admin/menus', newMenu);
      toast.success('Menu created');
      setShowAddMenu(false);
      setNewMenu({ name: '', location: 'header' });
      fetchMenus();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to create menu'));
    }
  };

  const deleteMenu = async (menuId: string) => {
    const ok = await confirm({
      title: 'Delete this menu and all its items?',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) {
      return;
    }
    try {
      await apiClient.delete(`/admin/menus/${menuId}`);
      toast.success('Menu deleted');
      if (selectedMenuId === menuId) {
        setSelectedMenuId(null);
      }
      fetchMenus();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to delete menu'));
    }
  };

  // ─── Menu Item CRUD ───────────────────────────────────────

  const addMenuItem = async () => {
    if (!selectedMenuId || !newItem.label.trim()) {
      return;
    }
    try {
      const payload: any = { ...newItem };
      if (!payload.parentId) {
        delete payload.parentId;
      }
      if (!payload.labelBn) {
        delete payload.labelBn;
      }
      if (!payload.icon) {
        delete payload.icon;
      }
      await apiClient.post(`/admin/menus/${selectedMenuId}/items`, payload);
      toast.success('Item added');
      setShowAddItem(false);
      setNewItem({
        label: '',
        labelBn: '',
        url: '',
        type: 'custom',
        target: '_self',
        icon: '',
        isVisible: true,
        parentId: '',
      });
      fetchMenus();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to add item'));
    }
  };

  const updateMenuItem = async () => {
    if (!selectedMenuId || !editingItem) {
      return;
    }
    try {
      await apiClient.patch(`/admin/menus/${selectedMenuId}/items/${editingItem.id}`, {
        label: editingItem.label,
        labelBn: editingItem.labelBn,
        url: editingItem.url,
        type: editingItem.type,
        target: editingItem.target,
        icon: editingItem.icon,
        isVisible: editingItem.isVisible,
      });
      toast.success('Item updated');
      setEditingItem(null);
      fetchMenus();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update item'));
    }
  };

  const deleteMenuItem = async (itemId: string) => {
    if (!selectedMenuId) {
      return;
    }
    const ok = await confirm({
      title: 'Delete this menu item?',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) {
      return;
    }
    try {
      await apiClient.delete(`/admin/menus/${selectedMenuId}/items/${itemId}`);
      toast.success('Item deleted');
      fetchMenus();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to delete item'));
    }
  };

  const toggleVisibility = async (item: MenuItem) => {
    if (!selectedMenuId) {
      return;
    }
    try {
      await apiClient.patch(`/admin/menus/${selectedMenuId}/items/${item.id}`, {
        isVisible: !item.isVisible,
      });
      fetchMenus();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update visibility'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-100 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {confirmDialog}
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Navigation Menus</h1>
          <p className="page-subtitle">Manage header, footer, and other navigation menus</p>
        </div>
        <button onClick={() => setShowAddMenu(true)} className="btn btn-primary">
          Create Menu
        </button>
      </div>

      {/* Create Menu Modal */}
      {showAddMenu && (
        <div className="bento-card p-6 sm:p-8">
          <h3 className="text-lg font-black text-gray-900 mb-4 tracking-tight">Create New Menu</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Menu Name</label>
              <input
                type="text"
                value={newMenu.name}
                onChange={(e) => setNewMenu({ ...newMenu, name: e.target.value })}
                placeholder="e.g., Main Navigation"
                className="field-input w-full"
              />
            </div>
            <div>
              <label className="field-label">Location</label>
              <select
                value={newMenu.location}
                onChange={(e) => setNewMenu({ ...newMenu, location: e.target.value })}
                className="field-input w-full"
              >
                <option value="header">Header</option>
                <option value="footer">Footer</option>
                <option value="sidebar">Sidebar</option>
                <option value="mobile">Mobile</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={createMenu} className="btn btn-primary">
              Create
            </button>
            <button onClick={() => setShowAddMenu(false)} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Menu List */}
        <div className="lg:col-span-1">
          <div className="bento-card overflow-hidden">
            <div className="px-4 py-3 border-b border-foreground/[0.04]">
              <h3 className="text-lg font-black tracking-tight text-gray-900">Menus</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {menus.length === 0 ? (
                <p className="px-4 py-6 text-sm text-gray-400 text-center">No menus yet</p>
              ) : (
                menus.map((menu) => (
                  <button
                    key={menu.id}
                    onClick={() => setSelectedMenuId(menu.id)}
                    className={`w-full px-4 py-3 text-left flex items-center justify-between transition-colors ${
                      selectedMenuId === menu.id ? 'bg-brand-50 text-brand-700' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium">{menu.name}</div>
                      <div className="text-xs text-gray-500">
                        {LOCATION_LABELS[menu.location] ?? menu.location} &middot;{' '}
                        {menu.items.length} items
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMenu(menu.id);
                      }}
                      className="text-gray-400 hover:text-red-500 p-1"
                      title="Delete menu"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="lg:col-span-3">
          {selectedMenu ? (
            <div className="bento-card">
              <div className="px-6 py-4 border-b border-foreground/[0.04] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-gray-900 tracking-tight">
                    {selectedMenu.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {LOCATION_LABELS[selectedMenu.location] ?? selectedMenu.location} menu
                  </p>
                </div>
                <button onClick={() => setShowAddItem(true)} className="btn btn-primary btn-sm">
                  Add Item
                </button>
              </div>

              {/* Add Item Form */}
              {showAddItem && (
                <div className="px-6 py-4 bg-brand-50 border-b border-brand-100">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">New Menu Item</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={newItem.label}
                      onChange={(e) => setNewItem({ ...newItem, label: e.target.value })}
                      placeholder="Label (English)"
                      className="field-input w-auto py-2.5"
                    />
                    <input
                      type="text"
                      value={newItem.labelBn}
                      onChange={(e) => setNewItem({ ...newItem, labelBn: e.target.value })}
                      placeholder="Label (Bangla)"
                      className="field-input w-auto py-2.5"
                    />
                    <input
                      type="text"
                      value={newItem.url}
                      onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
                      placeholder="URL (e.g., /products)"
                      className="field-input w-auto py-2.5"
                    />
                    <select
                      value={newItem.type}
                      onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
                      className="field-input w-auto py-2.5"
                    >
                      {TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={newItem.target}
                      onChange={(e) => setNewItem({ ...newItem, target: e.target.value })}
                      className="field-input w-auto py-2.5"
                    >
                      {TARGET_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={newItem.parentId}
                      onChange={(e) => setNewItem({ ...newItem, parentId: e.target.value })}
                      className="field-input w-auto py-2.5"
                    >
                      <option value="">Top Level</option>
                      {selectedMenu.items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={addMenuItem} className="btn btn-primary">
                      Add
                    </button>
                    <button onClick={() => setShowAddItem(false)} className="btn btn-secondary">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="divide-y divide-gray-100">
                {selectedMenu.items.length === 0 ? (
                  <p className="px-6 py-12 text-sm text-gray-400 text-center">
                    No items in this menu. Click &quot;Add Item&quot; to get started.
                  </p>
                ) : (
                  selectedMenu.items.map((item) => (
                    <MenuItemRow
                      key={item.id}
                      item={item}
                      level={0}
                      editingItem={editingItem}
                      onEdit={setEditingItem}
                      onSave={updateMenuItem}
                      onCancelEdit={() => setEditingItem(null)}
                      onDelete={deleteMenuItem}
                      onToggleVisibility={toggleVisibility}
                      onEditingChange={setEditingItem}
                    />
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="bento-card px-6 py-12 text-center text-sm font-bold text-gray-400">
              Select a menu from the left to manage its items
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuItemRow({
  item,
  level,
  editingItem,
  onEdit,
  onSave,
  onCancelEdit,
  onDelete,
  onToggleVisibility,
  onEditingChange,
}: {
  item: MenuItem;
  level: number;
  editingItem: MenuItem | null;
  onEdit: (item: MenuItem) => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onToggleVisibility: (item: MenuItem) => void;
  onEditingChange: (item: MenuItem) => void;
}) {
  const isEditing = editingItem?.id === item.id;

  return (
    <>
      <div
        className={`px-6 py-3 flex items-center gap-3 ${!item.isVisible ? 'opacity-50' : ''}`}
        style={{ paddingLeft: `${level * 24 + 24}px` }}
      >
        {level > 0 && <span className="text-gray-300 text-xs">&#x2514;</span>}
        {isEditing ? (
          <div className="flex-1 grid grid-cols-3 gap-2">
            <input
              type="text"
              value={editingItem.label}
              onChange={(e) => onEditingChange({ ...editingItem, label: e.target.value })}
              className="field-input w-auto py-2.5"
            />
            <input
              type="text"
              value={editingItem.url}
              onChange={(e) => onEditingChange({ ...editingItem, url: e.target.value })}
              className="field-input w-auto py-2.5"
            />
            <div className="flex gap-1">
              <button onClick={onSave} className="btn btn-primary btn-sm">
                Save
              </button>
              <button
                onClick={onCancelEdit}
                className="px-3 py-1 border rounded text-xs hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-900">{item.label}</span>
              {item.labelBn && <span className="text-xs text-gray-400 ml-2">{item.labelBn}</span>}
              <span className="text-xs text-gray-400 ml-2">{item.url || '—'}</span>
            </div>
            <span className="pill pill-neutral">{item.type}</span>
            <button
              onClick={() => onToggleVisibility(item)}
              className={`p-1 rounded ${item.isVisible ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
              title={item.isVisible ? 'Visible' : 'Hidden'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {item.isVisible ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                )}
              </svg>
            </button>
            <button
              onClick={() => onEdit({ ...item })}
              className="p-1 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all"
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
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
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
          </>
        )}
      </div>
      {/* Render children */}
      {item.children?.map((child) => (
        <MenuItemRow
          key={child.id}
          item={child}
          level={level + 1}
          editingItem={editingItem}
          onEdit={onEdit}
          onSave={onSave}
          onCancelEdit={onCancelEdit}
          onDelete={onDelete}
          onToggleVisibility={onToggleVisibility}
          onEditingChange={onEditingChange}
        />
      ))}
    </>
  );
}

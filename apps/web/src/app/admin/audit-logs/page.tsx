'use client';

import { ScrollText, Search } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { ListPagination } from '@/components/admin/list-pagination';
import { EmptyState, LoadingState, PageHeader } from '@/components/ui/bento';
import { apiClient } from '@/lib/api/client';
import { getApiErrorMessage } from '@/lib/api/errors';

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  oldValues: string | null;
  newValues: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; email: string } | null;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const ENTITY_TYPES = [
  'user',
  'product',
  'order',
  'category',
  'coupon',
  'settings',
  'role',
  'page',
  'banner',
  'menu',
];

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '30');
      if (entity) {
        params.set('entity', entity);
      }
      if (action) {
        params.set('action', action);
      }

      const { data } = await apiClient.get(`/admin/audit-logs?${params}`);
      const result = data.data ?? data;
      setLogs(result.logs ?? result ?? []);
      setPagination(result.pagination ?? null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load audit logs'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, entity]);

  const actionBadge = (act: string) => {
    const colors: Record<string, string> = {
      create: 'pill-success',
      update: 'pill-brand',
      delete: 'pill-danger',
      login: 'pill-purple',
    };
    const key = Object.keys(colors).find((k) => act.toLowerCase().includes(k));
    return <span className={`pill ${colors[key ?? ''] ?? 'pill-neutral'}`}>{act}</span>;
  };

  const formatJson = (json: string | null) => {
    if (!json) {
      return null;
    }
    try {
      return JSON.stringify(JSON.parse(json), null, 2);
    } catch (err) {
      return json;
    }
  };

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Track all administrative actions across the platform"
      />

      {/* Filters */}
      <div className="mb-6 rounded-[1.75rem] border border-foreground/[0.04] bg-card p-3 shadow-bento">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={entity}
            aria-label="Filter by entity"
            onChange={(e) => {
              setEntity(e.target.value);
              setPage(1);
            }}
            className="field-input border-transparent bg-gray-50 shadow-none sm:w-56"
          >
            <option value="">All Entities</option>
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <div className="group/search relative flex-1">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within/search:text-gray-700"
              strokeWidth={2.5}
            />
            <input
              type="text"
              value={action}
              aria-label="Filter by action"
              onChange={(e) => setAction(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
              placeholder="Filter by action... (press Enter)"
              className="field-input border-transparent bg-gray-50 pl-11 shadow-none focus:bg-card"
            />
          </div>
        </div>
      </div>

      {/* Log Table */}
      <div className="bento-card overflow-hidden p-2 sm:p-4">
        <div className="overflow-x-auto">
          <table className="bento-table min-w-[820px]">
            <thead>
              <tr>
                <th className="pl-4">Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Entity ID</th>
                <th className="pr-4">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6}>
                    <LoadingState label="Loading audit logs" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState bare icon={ScrollText} title="No audit logs found" />
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                      className={`cursor-pointer ${expandedId === log.id ? 'bg-gray-50' : ''}`}
                    >
                      <td className="whitespace-nowrap pl-4 text-xs font-bold text-gray-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap text-sm font-black text-gray-900">
                        {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                      </td>
                      <td className="whitespace-nowrap">{actionBadge(log.action)}</td>
                      <td className="whitespace-nowrap">
                        <span className="rounded-xl bg-gray-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-gray-600">
                          {log.entity}
                        </span>
                      </td>
                      <td className="whitespace-nowrap font-mono text-xs text-gray-400">
                        {log.entityId ? log.entityId.slice(0, 8) + '...' : '—'}
                      </td>
                      <td className="whitespace-nowrap pr-4 text-xs font-bold text-gray-400">
                        {log.ipAddress ?? '—'}
                      </td>
                    </tr>
                    {expandedId === log.id && (log.oldValues || log.newValues) && (
                      <tr key={`${log.id}-detail`} className="hover:bg-transparent">
                        <td colSpan={6} className="px-4 pb-4">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {log.oldValues && (
                              <div>
                                <h4 className="eyebrow mb-2">Previous Values</h4>
                                <pre className="max-h-40 overflow-auto rounded-[1.25rem] bg-gray-50 p-4 text-xs text-gray-700">
                                  {formatJson(log.oldValues)}
                                </pre>
                              </div>
                            )}
                            {log.newValues && (
                              <div>
                                <h4 className="eyebrow mb-2">New Values</h4>
                                <pre className="max-h-40 overflow-auto rounded-[1.25rem] bg-ink p-4 text-xs text-white/80">
                                  {formatJson(log.newValues)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && (
          <ListPagination
            page={page}
            totalPages={pagination.pages}
            total={pagination.total}
            limit={pagination.limit}
            noun="entries"
            onPageChange={(p) => setPage(Math.min(Math.max(1, p), pagination.pages))}
          />
        )}
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { api } from '../api';
import { useAsync } from '../hooks/useAsync';
import { useDebounce } from '../hooks/useDebounce';
import { useQueryState } from '../hooks/useQueryState';
import type { ActivityEntry } from '../types';
import { Card, PageHeader } from '../components/ui/Card';
import { Dropdown } from '../components/ui/Dropdown';
import { Avatar, SearchInput } from '../components/ui/Misc';
import { Pagination } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/ui/Skeleton';
import { formatDateTime, timeAgo } from '../lib/format';
import { dayKey } from '../lib/dates';

const TYPES: Array<{ value: NonNullable<ActivityEntry['targetType']>; label: string }> = [
  { value: 'order', label: 'Orders' }, { value: 'product', label: 'Products' }, { value: 'review', label: 'Reviews' }, { value: 'enquiry', label: 'Enquiries' }, { value: 'subscriber', label: 'Newsletter' }, { value: 'customer', label: 'Customers' }, { value: 'settings', label: 'Settings' }, { value: 'admin', label: 'Team' }, { value: 'role', label: 'Roles' },
];

function linkFor(a: ActivityEntry) {
  if (!a.target) return null;
  if (a.targetType === 'order') return `/orders/${a.target}`;
  if (a.targetType === 'role' || a.targetType === 'admin') return '/team';
  return null;
}

export default function ActivityLog() {
  const { get, getNum, set } = useQueryState();
  const [search, setSearch] = useState(get('q'));
  const q = useDebounce(search, 250);
  const type = get('type') as ActivityEntry['targetType'] | '';
  const actor = get('actor');
  const page = getNum('page', 1);
  const pageSize = 40;
  const query = useMemo(() => ({ search: q || undefined, targetType: type || undefined, actor: actor || undefined, page, pageSize }), [q, type, actor, page]);
  const { data, loading } = useAsync(() => api.listActivity(query), [query]);
  const { data: admins } = useAsync(() => api.listAdmins(), []);
  if (q !== get('q')) set({ q }, true);

  const groups = useMemo(() => {
    const m = new Map<string, ActivityEntry[]>();
    (data?.items ?? []).forEach((a) => {
      const k = dayKey(a.at);
      m.set(k, [...(m.get(k) ?? []), a]);
    });
    return [...m.entries()];
  }, [data]);
  const today = dayKey(new Date());

  return (
    <div>
      <PageHeader eyebrow="Audit" title="Activity log" subtitle="Who changed what, newest first." />
      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3.5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search actions, targets…" className="w-full md:w-80" />
          <Dropdown label="Area" value={type ?? ''} onChange={(v) => set({ type: v })} options={TYPES.map((t) => ({ value: t.value, label: t.label }))} />
          <Dropdown label="Who" value={actor} onChange={(v) => set({ actor: v })} options={(admins ?? []).map((a) => ({ value: a.name, label: a.name }))} />
        </div>
        {loading && !data ? (
          <TableSkeleton rows={10} cols={3} />
        ) : groups.length === 0 ? (
          <EmptyState icon={Activity} title="No activity" body="Actions taken in the admin are recorded here." />
        ) : (
          <div className="px-6 py-2">
            {groups.map(([day, items]) => (
              <section key={day} className="py-4">
                <p className="eyebrow mb-3">{day === today ? 'Today' : new Date(`${day}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                <ul className="space-y-1">
                  {items.map((a) => {
                    const to = linkFor(a);
                    return (
                      <li key={a.id} className="flex items-start gap-3 rounded-2xl px-2 py-2 hover:bg-cream-2">
                        <Avatar name={a.actor} size="sm" className="mt-0.5" />
                        <div className="min-w-0 flex-1 text-[13.5px]">
                          <p><b>{a.actor}</b> <span className="text-ink-2">{a.action.toLowerCase()}</span>{a.target && <> · {to ? <Link to={to} className="font-mono font-semibold hover:underline">{a.target}</Link> : <span className="font-semibold">{a.target}</span>}</>}</p>
                          {a.detail && <p className="text-xs text-ink-3">{a.detail}</p>}
                        </div>
                        {a.targetType && <Badge tone="outline" className="hidden sm:inline-flex">{TYPES.find((t) => t.value === a.targetType)?.label ?? a.targetType}</Badge>}
                        <span className="shrink-0 text-xs text-ink-3" title={formatDateTime(a.at)}>{timeAgo(a.at)}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
        {data && data.total > 0 && <Pagination page={page} pageSize={pageSize} total={data.total} onPage={(p) => set({ page: p }, false)} />}
      </Card>
    </div>
  );
}

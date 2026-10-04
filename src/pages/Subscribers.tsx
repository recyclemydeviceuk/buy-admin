import { useMemo, useState, type FormEvent } from 'react';
import { Download, Mail, Plus, Trash2, UserMinus, UserPlus } from 'lucide-react';
import { api } from '../api';
import { useAsync } from '../hooks/useAsync';
import { useDebounce } from '../hooks/useDebounce';
import { useQueryState } from '../hooks/useQueryState';
import { useToast } from '../store/toast';
import type { Subscriber } from '../types';
import { Card, PageHeader, Stat } from '../components/ui/Card';
import { Button, IconButton } from '../components/ui/Button';
import { SearchInput, Segmented } from '../components/ui/Misc';
import { Pagination, Table, type Column } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Field } from '../components/ui/Field';
import { formatDateTime, number, timeAgo } from '../lib/format';
import { downloadCsv } from '../lib/csv';

export default function Subscribers() {
  const toast = useToast();
  const { get, getNum, set } = useQueryState();
  const [search, setSearch] = useState(get('q'));
  const q = useDebounce(search, 250);
  const status = (get('status', 'subscribed') as Subscriber['status'] | 'all') || 'subscribed';
  const page = getNum('page', 1);
  const pageSize = 30;
  const query = useMemo(() => ({ search: q || undefined, status, page, pageSize }), [q, status, page]);
  const { data, loading, reload } = useAsync(() => api.listSubscribers(query), [query]);
  if (q !== get('q')) set({ q }, true);
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  async function add(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.addSubscriber(email);
      toast.success('Subscriber added');
      setAdding(false);
      setEmail('');
      reload();
    } catch (err) {
      toast.error('Could not add', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(s: Subscriber) {
    await api.setSubscriberStatus(s.id, s.status === 'subscribed' ? 'unsubscribed' : 'subscribed');
    toast.success(s.status === 'subscribed' ? 'Unsubscribed' : 'Re-subscribed');
    reload();
  }

  async function exportCsv() {
    const all = await api.listSubscribers({ ...query, page: 1, pageSize: 10000 });
    downloadCsv(`buyupon-subscribers-${new Date().toISOString().slice(0, 10)}.csv`, all.items.map((s) => ({ email: s.email, status: s.status, source: s.source, subscribedAt: s.subscribedAt })));
    toast.success('CSV exported', `${all.items.length} emails. Import into Brevo as a list.`);
  }

  const columns: Column<Subscriber>[] = [
    { key: 'email', header: 'Email', render: (s) => <span className="font-semibold">{s.email}</span> },
    { key: 'status', header: 'Status', render: (s) => (s.status === 'subscribed' ? <Badge tone="mint" dot>Subscribed</Badge> : <Badge tone="neutral" dot>Unsubscribed</Badge>) },
    { key: 'source', header: 'Source', render: (s) => <span className="text-[13px] capitalize text-ink-2">{s.source}</span> },
    { key: 'when', header: 'Joined', align: 'right', render: (s) => <span className="text-xs text-ink-3" title={formatDateTime(s.subscribedAt)}>{timeAgo(s.subscribedAt)}</span> },
    { key: 'actions', header: '', align: 'right', width: '90px', render: (s) => (
      <span className="inline-flex gap-1">
        <IconButton label={s.status === 'subscribed' ? 'Unsubscribe' : 'Re-subscribe'} onClick={() => void toggle(s)}>{s.status === 'subscribed' ? <UserMinus size={15} /> : <UserPlus size={15} />}</IconButton>
        <IconButton label="Delete" className="hover:text-brand-700" onClick={async () => { await api.deleteSubscriber(s.id); toast.success('Removed'); reload(); }}><Trash2 size={15} /></IconButton>
      </span>
    ) },
  ];

  return (
    <div>
      <PageHeader eyebrow="Marketing" title="Newsletter" subtitle="Emails collected from the storefront footer and checkout." actions={<><Button size="sm" variant="secondary" onClick={() => void exportCsv()}><Download size={15} /> Export CSV</Button><Button size="sm" onClick={() => setAdding(true)}><Plus size={15} /> Add email</Button></>} />
      {data && (
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
          <Stat label="Subscribed" value={number(data.counts.subscribed)} className="bg-tint-mint/60" />
          <Stat label="Unsubscribed" value={number(data.counts.unsubscribed)} className="border border-line bg-white" />
          <Stat label="Opt-in rate" value={`${Math.round((data.counts.subscribed / Math.max(1, data.counts.subscribed + data.counts.unsubscribed)) * 100)}%`} sub="of everyone who signed up" className="border border-line bg-white" />
        </div>
      )}
      <div className="mb-4"><Segmented value={status} onChange={(v) => set({ status: v })} options={[{ value: 'subscribed', label: 'Subscribed' }, { value: 'unsubscribed', label: 'Unsubscribed' }, { value: 'all', label: 'All' }]} /></div>
      <Card padded={false}>
        <div className="border-b border-line p-3.5"><SearchInput value={search} onChange={setSearch} placeholder="Search email…" className="w-full md:w-80" /></div>
        <Table columns={columns} rows={data?.items ?? []} rowKey={(s) => s.id} loading={loading} empty={<EmptyState icon={Mail} title="No subscribers" body="Sign-ups from the storefront will appear here." />} />
        {data && data.total > 0 && <Pagination page={page} pageSize={pageSize} total={data.total} onPage={(p) => set({ page: p }, false)} />}
      </Card>
      <Modal open={adding} onClose={() => setAdding(false)} title="Add a subscriber" size="sm" footer={<><Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button><Button size="sm" loading={busy} type="submit" form="add-sub">Add</Button></>}>
        <form id="add-sub" onSubmit={add}><Field label="Email" type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" hint="Only add people who have asked to receive emails." /></form>
      </Modal>
    </div>
  );
}

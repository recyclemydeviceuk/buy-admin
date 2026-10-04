import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, Inbox, Mail, Send } from 'lucide-react';
import { api } from '../api';
import { useAsync } from '../hooks/useAsync';
import { useDebounce } from '../hooks/useDebounce';
import { useQueryState } from '../hooks/useQueryState';
import { useToast } from '../store/toast';
import type { Enquiry, EnquiryStatus } from '../types';
import { Card, PageHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TextArea } from '../components/ui/Field';
import { Avatar, SearchInput, Segmented } from '../components/ui/Misc';
import { Pagination } from '../components/ui/Table';
import { EnquiryBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/ui/Skeleton';
import { formatDateTime, timeAgo } from '../lib/format';
import { cn } from '../lib/cn';

const TEMPLATES: Array<{ label: string; text: string }> = [
  { label: 'Dispatch update', text: 'Hi {name},\n\nThanks for getting in touch. Your order {order} is being packed today and you will receive a dispatch email with tracking as soon as it leaves us. Next-day orders placed before 3pm arrive the following working day.\n\nBest wishes,\nCashMyMobile' },
  { label: 'Returns label', text: 'Hi {name},\n\nNo problem at all. Every phone comes with 30-day returns. I have attached a prepaid Royal Mail returns label; please include the order number {order} inside the parcel. Refunds go back to your PayPal within 3 working days of the phone arriving.\n\nBest wishes,\nCashMyMobile' },
  { label: 'What is included', text: 'Hi {name},\n\nThanks for asking. Every phone ships fully tested with a USB-C (or Lightning) cable and our 12-month warranty. Chargers and earphones are not included, but any standard USB-C charger will work.\n\nBest wishes,\nCashMyMobile' },
];

export default function Enquiries() {
  const toast = useToast();
  const { get, getNum, set } = useQueryState();
  const [search, setSearch] = useState(get('q'));
  const q = useDebounce(search, 250);
  const status = (get('status', 'open') as EnquiryStatus | 'all') || 'open';
  const page = getNum('page', 1);
  const pageSize = 20;
  const openId = get('open');
  const query = useMemo(() => ({ search: q || undefined, status, page, pageSize }), [q, status, page]);
  const { data, loading, reload, setData } = useAsync(() => api.listEnquiries(query), [query]);
  if (q !== get('q')) set({ q }, true);
  const [activeId, setActiveId] = useState<string | null>(openId || null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (openId) {
      setActiveId(openId);
      set({ status: 'all', open: '' }, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);
  useEffect(() => {
    if (data && !activeId && data.items[0]) setActiveId(data.items[0].id);
  }, [data, activeId]);

  const active = data?.items.find((e) => e.id === activeId) ?? null;
  useEffect(() => setReply(active?.reply ?? ''), [active?.id, active?.reply]);

  async function update(e: Enquiry, patch: Parameters<typeof api.updateEnquiry>[1], msg: string) {
    setBusy(true);
    try {
      const updated = await api.updateEnquiry(e.id, patch);
      setData((d) => (d ? { ...d, items: d.items.map((x) => (x.id === e.id ? updated : x)) } : d));
      toast.success(msg);
      setTimeout(reload, 300);
    } catch (err) {
      toast.error('Could not update', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  const fill = (t: string, e: Enquiry) => t.replace('{name}', e.name.split(' ')[0]).replace('{order}', e.orderNumber ?? 'your order');

  return (
    <div>
      <PageHeader eyebrow="Support" title="Enquiries" subtitle="Messages from the storefront contact form." />
      <div className="mb-4"><Segmented value={status} onChange={(v) => { set({ status: v }); setActiveId(null); }} options={[{ value: 'open', label: 'Open', count: data?.counts.open }, { value: 'replied', label: 'Replied', count: data?.counts.replied }, { value: 'closed', label: 'Closed', count: data?.counts.closed }, { value: 'all', label: 'All' }]} /></div>
      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <Card padded={false} className="overflow-hidden">
          <div className="border-b border-line p-3"><SearchInput value={search} onChange={setSearch} placeholder="Name, email, message…" /></div>
          {loading && !data ? (
            <TableSkeleton rows={6} cols={2} />
          ) : data && data.items.length === 0 ? (
            <EmptyState icon={Inbox} title="Inbox zero" body={status === 'open' ? 'No open enquiries. Nice.' : 'Nothing here.'} />
          ) : (
            <ul className="max-h-[70vh] divide-y divide-line-2 overflow-y-auto">
              {data?.items.map((e) => (
                <li key={e.id}>
                  <button onClick={() => setActiveId(e.id)} className={cn('flex w-full gap-3 px-4 py-3.5 text-left transition-colors', activeId === e.id ? 'bg-cream' : 'hover:bg-cream-2')}>
                    <Avatar name={e.name} size="sm" className="mt-0.5" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2"><span className="truncate text-[13.5px] font-bold">{e.name}</span><span className="shrink-0 text-[11px] text-ink-3">{timeAgo(e.createdAt)}</span></span>
                      <span className="mt-0.5 line-clamp-2 block text-[12.5px] text-ink-2">{e.message}</span>
                      <span className="mt-1.5 block"><EnquiryBadge status={e.status} /></span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {data && data.total > pageSize && <Pagination page={page} pageSize={pageSize} total={data.total} onPage={(p) => set({ page: p }, false)} />}
        </Card>

        <Card padded={false} className="min-h-[480px]">
          {active ? (
            <div className="flex h-full flex-col">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-6 py-5">
                <div className="flex items-center gap-3">
                  <Avatar name={active.name} />
                  <div>
                    <p className="text-[15px] font-bold">{active.name}</p>
                    <p className="text-xs text-ink-3"><a href={`mailto:${active.email}`} className="hover:underline">{active.email}</a> · {formatDateTime(active.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <EnquiryBadge status={active.status} />
                  {active.status !== 'closed' ? <Button size="xs" variant="secondary" onClick={() => void update(active, { status: 'closed' }, 'Enquiry closed')}><Archive size={13} /> Close</Button> : <Button size="xs" variant="secondary" onClick={() => void update(active, { status: 'open' }, 'Enquiry reopened')}>Reopen</Button>}
                </div>
              </div>
              <div className="flex-1 space-y-4 px-6 py-5">
                {active.orderNumber && (
                  <p className="text-[13px]">About order <Link to={`/orders/${active.orderNumber}`} className="font-mono font-semibold hover:underline">{active.orderNumber}</Link> · <Link to={`/customers/${encodeURIComponent(active.email.toLowerCase())}`} className="font-semibold hover:underline">customer profile</Link></p>
                )}
                <div className="rounded-2xl bg-cream px-5 py-4 text-[14px] leading-relaxed">{active.message}</div>
                {active.reply && active.repliedAt && (
                  <div className="ml-6 rounded-2xl border border-line px-5 py-4 text-[14px] leading-relaxed">
                    <p className="eyebrow mb-1.5 text-[10px]">Replied {formatDateTime(active.repliedAt)}{active.assignee && ` · ${active.assignee}`}</p>
                    <p className="whitespace-pre-wrap">{active.reply}</p>
                  </div>
                )}
              </div>
              <div className="border-t border-line px-6 py-5">
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-xs font-semibold text-ink-3">Templates:</span>
                  {TEMPLATES.map((t) => <button key={t.label} onClick={() => setReply(fill(t.text, active))} className="rounded-full border border-line bg-white px-2.5 py-1 text-xs font-semibold hover:border-ink">{t.label}</button>)}
                </div>
                <TextArea value={reply} onChange={(e) => setReply(e.target.value)} placeholder={`Reply to ${active.name.split(' ')[0]}…`} />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-ink-3">Saving records the reply here and sends it to {active.email}.</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" href={`mailto:${active.email}?subject=${encodeURIComponent(`Re: your enquiry${active.orderNumber ? ` about ${active.orderNumber}` : ''}`)}&body=${encodeURIComponent(reply)}`}><Mail size={14} /> Open in mail app</Button>
                    <Button size="sm" loading={busy} disabled={!reply.trim()} onClick={() => void update(active, { reply: reply.trim(), status: 'replied' }, 'Reply sent')}><Send size={14} /> Send reply</Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState icon={Mail} title="Select an enquiry" body="Pick a message on the left to read and reply." />
          )}
        </Card>
      </div>
    </div>
  );
}

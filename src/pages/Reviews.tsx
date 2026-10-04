import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, MessageSquareReply, Star, Trash2, X } from 'lucide-react';
import { api } from '../api';
import { useAsync } from '../hooks/useAsync';
import { useDebounce } from '../hooks/useDebounce';
import { useQueryState } from '../hooks/useQueryState';
import { useToast } from '../store/toast';
import type { AdminReview, ReviewStatus } from '../types';
import { Card, PageHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TextArea } from '../components/ui/Field';
import { Dropdown } from '../components/ui/Dropdown';
import { Avatar, SearchInput, Segmented, Stars } from '../components/ui/Misc';
import { Pagination } from '../components/ui/Table';
import { Badge, ReviewBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog, Modal } from '../components/ui/Modal';
import { TableSkeleton } from '../components/ui/Skeleton';
import { formatDate, timeAgo } from '../lib/format';

export default function Reviews() {
  const toast = useToast();
  const { get, getNum, set } = useQueryState();
  const [search, setSearch] = useState(get('q'));
  const q = useDebounce(search, 250);
  const status = (get('status', 'pending') as ReviewStatus | 'all') || 'pending';
  const rating = getNum('rating', 0);
  const page = getNum('page', 1);
  const pageSize = 20;
  const query = useMemo(() => ({ search: q || undefined, status, rating: rating || undefined, page, pageSize }), [q, status, rating, page]);
  const { data, loading, reload, setData } = useAsync(() => api.listReviews(query), [query]);
  if (q !== get('q')) set({ q }, true);
  const [reply, setReply] = useState<AdminReview | null>(null);
  const [replyText, setReplyText] = useState('');
  const [del, setDel] = useState<AdminReview | null>(null);
  const [busy, setBusy] = useState(false);

  async function setStatus(r: AdminReview, s: ReviewStatus) {
    try {
      const updated = await api.setReviewStatus(r.id, s);
      setData((d) => (d ? { ...d, items: d.items.map((x) => (x.id === r.id ? updated : x)) } : d));
      toast.success(s === 'approved' ? 'Review published' : s === 'rejected' ? 'Review hidden' : 'Review reopened');
      setTimeout(reload, 400);
    } catch (e) {
      toast.error('Could not update', e instanceof Error ? e.message : undefined);
    }
  }

  async function saveReply() {
    if (!reply) return;
    setBusy(true);
    try {
      await api.replyToReview(reply.id, replyText);
      toast.success('Reply saved');
      setReply(null);
      reload();
    } catch (e) {
      toast.error('Could not save reply', e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!del) return;
    setBusy(true);
    await api.deleteReview(del.id);
    setBusy(false);
    setDel(null);
    toast.success('Review deleted');
    reload();
  }

  const avg = data && data.items.length ? data.items.reduce((s, r) => s + r.rating, 0) / data.items.length : 0;

  return (
    <div>
      <PageHeader eyebrow="Reputation" title="Reviews" subtitle="Approve reviews to show them on product pages. Ratings update automatically." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented value={status} onChange={(v) => set({ status: v })} options={[{ value: 'pending', label: 'To moderate', count: data?.counts.pending }, { value: 'approved', label: 'Published', count: data?.counts.approved }, { value: 'rejected', label: 'Hidden', count: data?.counts.rejected }, { value: 'all', label: 'All' }]} />
      </div>
      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3.5">
          <SearchInput value={search} onChange={setSearch} placeholder="Author, product, text…" className="w-full md:w-80" />
          <Dropdown label="Rating" value={rating ? String(rating) : ''} onChange={(v) => set({ rating: v })} options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${'★'.repeat(n)} ${n} star${n > 1 ? 's' : ''}` }))} />
          {data && data.items.length > 0 && <span className="ml-auto text-xs text-ink-3">Average on this page ★ {avg.toFixed(1)}</span>}
        </div>
        {loading && !data ? (
          <TableSkeleton rows={5} cols={3} />
        ) : data && data.items.length === 0 ? (
          <EmptyState icon={Star} title={status === 'pending' ? 'Nothing to moderate' : 'No reviews match'} body={status === 'pending' ? 'New reviews from customers will land here.' : 'Try another filter.'} />
        ) : (
          <ul className="divide-y divide-line-2">
            {data?.items.map((r) => (
              <li key={r.id} className="grid gap-4 px-5 py-5 md:grid-cols-[1fr_auto] md:px-6">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Stars rating={r.rating} size={14} />
                    <ReviewBadge status={r.status} />
                    {r.verified && <Badge tone="outline">Verified purchase</Badge>}
                    <span className="text-xs text-ink-3" title={formatDate(r.date)}>{timeAgo(r.date)}</span>
                  </div>
                  <p className="mt-2 text-[15px] font-bold">{r.title}</p>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">{r.body}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
                    <span className="inline-flex items-center gap-1.5"><Avatar name={r.author} size="sm" /> <b className="text-ink">{r.author}</b> · {r.email}</span>
                    <span>on <Link to={`/products/${r.productId}`} className="font-semibold text-ink hover:underline">{r.productName}</Link></span>
                    {r.orderNumber && <Link to={`/orders/${r.orderNumber}`} className="font-mono hover:underline">{r.orderNumber}</Link>}
                  </div>
                  {r.reply && (
                    <div className="mt-3 rounded-2xl bg-cream px-4 py-3 text-[13px]">
                      <p className="eyebrow mb-1 text-[10px]">Reply from CashMyMobile</p>
                      {r.reply}
                    </div>
                  )}
                </div>
                <div className="flex flex-row flex-wrap items-start gap-2 md:flex-col md:items-stretch">
                  {r.status !== 'approved' && <Button size="sm" onClick={() => void setStatus(r, 'approved')}><Check size={14} /> Approve</Button>}
                  {r.status !== 'rejected' && <Button size="sm" variant="secondary" onClick={() => void setStatus(r, 'rejected')}><X size={14} /> Hide</Button>}
                  {r.status === 'rejected' && <Button size="sm" variant="secondary" onClick={() => void setStatus(r, 'pending')}>Reopen</Button>}
                  <Button size="sm" variant="ghost" onClick={() => { setReply(r); setReplyText(r.reply ?? ''); }}><MessageSquareReply size={14} /> {r.reply ? 'Edit reply' : 'Reply'}</Button>
                  <Button size="sm" variant="ghost" className="text-brand-700" onClick={() => setDel(r)}><Trash2 size={14} /> Delete</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {data && data.total > 0 && <Pagination page={page} pageSize={pageSize} total={data.total} onPage={(p) => set({ page: p }, false)} />}
      </Card>

      <Modal open={!!reply} onClose={() => setReply(null)} title="Reply publicly" subtitle={reply ? `To ${reply.author}'s review of ${reply.productName}` : ''} size="sm" footer={<><Button size="sm" variant="ghost" onClick={() => setReply(null)}>Cancel</Button><Button size="sm" loading={busy} onClick={() => void saveReply()}>Save reply</Button></>}>
        <TextArea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Thanks for the feedback…" hint="Shown under the review on the product page once approved. Leave empty to remove the reply." />
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={() => void remove()} loading={busy} danger title="Delete this review?" confirmLabel="Delete" body="This removes the review permanently. Prefer “Hide” if you might want it back." />
    </div>
  );
}

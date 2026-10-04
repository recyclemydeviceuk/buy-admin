import { useEffect, useState } from 'react';
import { AlertTriangle, Plus, Star, X } from 'lucide-react';
import { api } from '../api';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../store/auth';
import { useToast } from '../store/toast';
import type { Settings as SettingsT } from '../types';
import { Button, IconButton } from '../components/ui/Button';
import { Card, CardHeader, PageHeader } from '../components/ui/Card';
import { Field, Select, TextArea, Toggle } from '../components/ui/Field';
import { ProductThumb, Tabs } from '../components/ui/Misc';
import { Skeleton } from '../components/ui/Skeleton';
import { imageUrl, money, storageIndex } from '../lib/format';
import { cn } from '../lib/cn';

type Tab = 'store' | 'delivery' | 'catalogue' | 'featured' | 'payments' | 'notifications' | 'system';

export default function Settings() {
  const toast = useToast();
  const { can } = useAuth();
  const { data: loaded, reload } = useAsync(() => api.getSettings(), []);
  const [tab, setTab] = useState<Tab>('store');
  const [s, setS] = useState<SettingsT | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (loaded) setS(loaded); }, [loaded]);
  const dirty = s && loaded ? JSON.stringify(s) !== JSON.stringify(loaded) : false;
  const readOnly = !can('settings.edit');

  async function save() {
    if (!s) return;
    setSaving(true);
    try {
      await api.updateSettings(s);
      toast.success('Settings saved');
      reload();
    } catch (e) {
      toast.error('Could not save', e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  if (!s) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 rounded-3xl" /></div>;
  const patch = (p: Partial<SettingsT>) => setS({ ...s, ...p });

  return (
    <div>
      <PageHeader eyebrow="Configuration" title="Settings" subtitle={readOnly ? 'You can view settings. Changing them needs the “Edit settings” permission.' : 'Store details, delivery, catalogue options, payments and notifications. Admins and roles live under Team & roles.'} actions={!readOnly && tab !== 'system' && <Button size="sm" variant="primary" disabled={!dirty} loading={saving} onClick={() => void save()}>Save changes</Button>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'store', label: 'Store' }, { value: 'delivery', label: 'Delivery' }, { value: 'catalogue', label: 'Catalogue' }, { value: 'featured', label: 'Featured' }, { value: 'payments', label: 'Payments' }, { value: 'notifications', label: 'Notifications' }, { value: 'system', label: 'System' }]} />
      <div className="mt-6 max-w-3xl">
        <fieldset disabled={readOnly} className="contents">
          {tab === 'store' && (
            <Card>
              <CardHeader title="Store details" subtitle="Shown in the storefront footer, contact page and emails." />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Store name" value={s.store.name} onChange={(e) => patch({ store: { ...s.store, name: e.target.value } })} />
                <Field label="Site URL" value={s.store.siteUrl} onChange={(e) => patch({ store: { ...s.store, siteUrl: e.target.value } })} />
                <Field label="Support email" type="email" value={s.store.supportEmail} onChange={(e) => patch({ store: { ...s.store, supportEmail: e.target.value } })} />
                <Field label="WhatsApp number" value={s.store.whatsapp} onChange={(e) => patch({ store: { ...s.store, whatsapp: e.target.value.replace(/\D/g, '') } })} hint="E.164 without the plus, e.g. 447700900123" />
                <Field label="Support hours" className="sm:col-span-2" value={s.store.hours} onChange={(e) => patch({ store: { ...s.store, hours: e.target.value } })} />
                <Field label="Warranty" suffix="months" type="number" min={0} value={s.store.warrantyMonths} onChange={(e) => patch({ store: { ...s.store, warrantyMonths: Number(e.target.value) } })} />
                <Field label="Returns window" suffix="days" type="number" min={0} value={s.store.returnsDays} onChange={(e) => patch({ store: { ...s.store, returnsDays: Number(e.target.value) } })} />
              </div>
            </Card>
          )}

          {tab === 'delivery' && (
            <Card>
              <CardHeader title="Delivery options" subtitle="What customers choose at checkout. Fees are in whole pounds; £0 shows as “Free”." />
              <div className="space-y-4">
                {s.delivery.map((d, i) => (
                  <div key={d.id} className={cn('rounded-2xl border p-4', d.enabled ? 'border-line' : 'border-dashed border-line bg-cream-2')}>
                    <div className="mb-3 flex items-center justify-between"><p className="font-bold">{d.label} <span className="font-mono text-xs font-normal text-ink-3">· {d.id}</span></p><Toggle checked={d.enabled} onChange={(v) => patch({ delivery: s.delivery.map((x, j) => (j === i ? { ...x, enabled: v } : x)) })} label="Enabled" /></div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Label" value={d.label} onChange={(e) => patch({ delivery: s.delivery.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                      <Field label="Fee" prefix="£" type="number" min={0} value={d.fee} onChange={(e) => patch({ delivery: s.delivery.map((x, j) => (j === i ? { ...x, fee: Number(e.target.value) } : x)) })} />
                      <Field label="Delivery time" suffix="days" type="number" min={1} value={d.etaDays} onChange={(e) => patch({ delivery: s.delivery.map((x, j) => (j === i ? { ...x, etaDays: Number(e.target.value) } : x)) })} />
                      <Field label="Order cut-off" type="time" value={d.cutoff} onChange={(e) => patch({ delivery: s.delivery.map((x, j) => (j === i ? { ...x, cutoff: e.target.value } : x)) })} />
                      <Field label="Description" className="sm:col-span-2" value={d.description} onChange={(e) => patch({ delivery: s.delivery.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)) })} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {tab === 'catalogue' && (
            <div className="space-y-5">
              <Card>
                <CardHeader title="Networks" subtitle="Order here is the order on the storefront. Unlocked should stay first." />
                <ChipList items={s.networks} onChange={(networks) => patch({ networks })} placeholder="e.g. giffgaff" />
              </Card>
              <Card>
                <CardHeader title="Storage sizes" subtitle="Options offered when building a product's variant matrix." />
                <ChipList items={s.storages} onChange={(storages) => patch({ storages: [...storages].sort((a, b) => storageIndex(a) - storageIndex(b)) })} placeholder="e.g. 2TB" normalise={(v) => v.toUpperCase().replace(/\s/g, '')} validate={(v) => /^\d+(GB|TB)$/.test(v)} />
              </Card>
              <Card>
                <CardHeader title="Condition grades" subtitle="Copy shown in the grading guide and on product pages. Keys are fixed: excellent, good, fair." />
                <div className="space-y-4">
                  {s.conditions.map((c, i) => (
                    <div key={c.key} className="rounded-2xl border border-line p-4">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Field label="Label" value={c.label} onChange={(e) => patch({ conditions: s.conditions.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                        <Field label="Short line" value={c.short} onChange={(e) => patch({ conditions: s.conditions.map((x, j) => (j === i ? { ...x, short: e.target.value } : x)) })} />
                        <Field label="Minimum battery" suffix="%" type="number" min={50} max={100} value={c.minBattery} onChange={(e) => patch({ conditions: s.conditions.map((x, j) => (j === i ? { ...x, minBattery: Number(e.target.value) } : x)) })} />
                        <TextArea label="Blurb" className="sm:col-span-3" value={c.blurb} onChange={(e) => patch({ conditions: s.conditions.map((x, j) => (j === i ? { ...x, blurb: e.target.value } : x)) })} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <CardHeader title="Stock alerts" />
                <Field label="Low stock threshold" suffix="units" type="number" min={0} className="max-w-xs" value={s.lowStockThreshold} onChange={(e) => patch({ lowStockThreshold: Number(e.target.value) })} hint="Variants at or below this count are flagged across the admin." />
              </Card>
            </div>
          )}

          {tab === 'featured' && <FeaturedEditor slugs={s.featuredSlugs} onChange={(featuredSlugs) => patch({ featuredSlugs })} />}

          {tab === 'payments' && (
            <Card>
              <CardHeader title="PayPal" subtitle="PayPal is the only payment method. The storefront loads the PayPal JS SDK with this client ID; secrets stay on the backend." />
              <div className="grid gap-4 sm:grid-cols-2">
                <Select label="Mode" value={s.payments.mode} onChange={(e) => patch({ payments: { ...s.payments, mode: e.target.value as 'sandbox' | 'live' } })}><option value="sandbox">Sandbox (test payments)</option><option value="live">Live</option></Select>
                <Field label="Merchant email" type="email" value={s.payments.merchantEmail} onChange={(e) => patch({ payments: { ...s.payments, merchantEmail: e.target.value } })} />
                <Field label="Client ID" className="sm:col-span-2" value={s.payments.clientId} onChange={(e) => patch({ payments: { ...s.payments, clientId: e.target.value } })} placeholder="AZ…" hint="Public key. The client secret is configured on the server, never here." />
              </div>
              {s.payments.mode === 'live' && !s.payments.clientId && <p className="mt-4 flex items-start gap-2 rounded-2xl bg-tint-peach px-4 py-3 text-[13px] text-brand-700"><AlertTriangle size={15} className="mt-0.5 shrink-0" /> Live mode without a client ID means checkout cannot load PayPal.</p>}
            </Card>
          )}

          {tab === 'notifications' && (
            <Card>
              <CardHeader title="Admin notifications" subtitle="Emails sent to the team, not to customers." />
              <div className="space-y-4">
                <Field label="Send to" type="email" className="max-w-sm" value={s.notifications.notifyTo} onChange={(e) => patch({ notifications: { ...s.notifications, notifyTo: e.target.value } })} />
                <Toggle checked={s.notifications.orderEmail} onChange={(v) => patch({ notifications: { ...s.notifications, orderEmail: v } })} label="New order" description="Every paid order, with a link to the order page." />
                <Toggle checked={s.notifications.lowStockEmail} onChange={(v) => patch({ notifications: { ...s.notifications, lowStockEmail: v } })} label="Low stock digest" description="A daily summary of variants at or below the threshold." />
                <Toggle checked={s.notifications.enquiryEmail} onChange={(v) => patch({ notifications: { ...s.notifications, enquiryEmail: v } })} label="New enquiry" description="When the contact form is submitted." />
                <Toggle checked={s.notifications.reviewEmail} onChange={(v) => patch({ notifications: { ...s.notifications, reviewEmail: v } })} label="New review to moderate" />
              </div>
            </Card>
          )}
        </fieldset>

        {tab === 'system' && <SystemPanel />}
      </div>
    </div>
  );
}

function ChipList({ items, onChange, placeholder, normalise = (v) => v.trim(), validate = (v) => v.length > 0 }: { items: string[]; onChange: (items: string[]) => void; placeholder: string; normalise?: (v: string) => string; validate?: (v: string) => boolean }) {
  const [v, setV] = useState('');
  function add() {
    const n = normalise(v);
    if (!validate(n) || items.includes(n)) return;
    onChange([...items, n]);
    setV('');
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((it, i) => (
        <span key={it} className="inline-flex items-center gap-1 rounded-full border border-line bg-white py-1 pl-3 pr-1 text-[13px] font-semibold">
          {it}
          <button type="button" onClick={() => move(i, -1)} className="rounded-full px-1 text-ink-3 hover:bg-cream disabled:opacity-30" disabled={i === 0} aria-label="Move left">‹</button>
          <button type="button" onClick={() => move(i, 1)} className="rounded-full px-1 text-ink-3 hover:bg-cream disabled:opacity-30" disabled={i === items.length - 1} aria-label="Move right">›</button>
          <button type="button" onClick={() => onChange(items.filter((x) => x !== it))} className="rounded-full p-1 text-ink-3 hover:bg-brand-50 hover:text-brand-700" aria-label={`Remove ${it}`}><X size={12} /></button>
        </span>
      ))}
      <span className="inline-flex items-center gap-1">
        <input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} placeholder={placeholder} className="input input-sm w-32" />
        <Button type="button" size="xs" variant="secondary" onClick={add}><Plus size={13} /> Add</Button>
      </span>
    </div>
  );
}

function FeaturedEditor({ slugs, onChange }: { slugs: string[]; onChange: (s: string[]) => void }) {
  const { data } = useAsync(() => api.listProducts({ status: 'active', pageSize: 500, sort: 'name' }), []);
  const [q, setQ] = useState('');
  const products = data?.items ?? [];
  const featured = slugs.map((s) => products.find((p) => p.slug === s)).filter(Boolean) as typeof products;
  const candidates = products.filter((p) => !slugs.includes(p.slug) && (!q || `${p.brand} ${p.name}`.toLowerCase().includes(q.toLowerCase()))).slice(0, 8);
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= slugs.length) return;
    const next = [...slugs];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  return (
    <Card>
      <CardHeader title="Featured products" subtitle="The home page bestseller rail, in this order. Eight works best." />
      <ol className="space-y-2">
        {featured.map((p, i) => (
          <li key={p.slug} className="flex items-center gap-3 rounded-2xl border border-line px-3 py-2">
            <span className="w-5 text-center text-xs font-bold text-ink-4">{i + 1}</span>
            <ProductThumb src={imageUrl(p.image)} size="sm" />
            <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-bold">{p.brand} {p.name}</span><span className="block text-xs text-ink-3">from {money(p.fromPrice)}</span></span>
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded-full p-1.5 hover:bg-cream disabled:opacity-30" aria-label="Move up">↑</button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === featured.length - 1} className="rounded-full p-1.5 hover:bg-cream disabled:opacity-30" aria-label="Move down">↓</button>
            <IconButton label="Remove" onClick={() => onChange(slugs.filter((s) => s !== p.slug))}><X size={15} /></IconButton>
          </li>
        ))}
        {featured.length === 0 && <li className="rounded-2xl bg-cream px-4 py-6 text-center text-sm text-ink-3">Nothing featured yet. Add products below.</li>}
      </ol>
      <div className="mt-5 border-t border-line pt-5">
        <Field label="Add a product" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search active products…" />
        {q && (
          <ul className="mt-2 divide-y divide-line-2 rounded-2xl border border-line">
            {candidates.map((p) => (
              <li key={p.slug}>
                <button type="button" onClick={() => { onChange([...slugs, p.slug]); setQ(''); }} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-cream-2">
                  <ProductThumb src={imageUrl(p.image)} size="sm" /><span className="flex-1 text-[13.5px] font-semibold">{p.brand} {p.name}</span><Star size={14} className="text-ink-3" />
                </button>
              </li>
            ))}
            {candidates.length === 0 && <li className="px-3 py-3 text-sm text-ink-3">No matches.</li>}
          </ul>
        )}
      </div>
    </Card>
  );
}

function SystemPanel() {
  const { data, loading, error, reload } = useAsync(() => api.getSystem(), []);
  if (loading && !data) return <Skeleton className="h-64 rounded-3xl" />;
  if (!data) return <Card><p className="text-sm text-brand-700">Could not reach the backend{error ? `: ${error}` : ''}.</p><Button size="sm" variant="secondary" className="mt-3" onClick={reload}>Retry</Button></Card>;
  const ok = (v: boolean) => (v ? 'bg-tint-mint text-success' : 'bg-tint-peach text-brand-700');
  const rows: Array<[string, string, boolean]> = [
    ['Backend', `${data.env} · v${data.version} · up ${Math.round(data.uptimeSeconds / 60)} min`, true],
    ['Database', data.database, true],
    ['Email', data.email === 'brevo' ? `Brevo · from ${data.emailFrom}` : 'Not configured', data.email === 'brevo'],
    ['PayPal', data.paypal === 'not configured' ? 'Not configured · checkout cannot take real payments' : `${data.paypal} mode`, data.paypal === 'live'],
    ['Storefront', data.storefrontUrl, true],
  ];
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Connections" subtitle={`Checked ${new Date(data.time).toLocaleTimeString('en-GB')}`} actions={<Button size="xs" variant="secondary" onClick={reload}>Refresh</Button>} />
        <ul className="divide-y divide-line-2">
          {rows.map(([k, v, good]) => (
            <li key={k} className="flex items-center justify-between gap-4 py-3 text-[13.5px]"><span className="font-semibold">{k}</span><span className={cn('rounded-full px-2.5 py-1 text-[12px] font-semibold', ok(good))}>{v}</span></li>
          ))}
        </ul>
      </Card>
      <Card>
        <CardHeader title="Data" subtitle="Live counts in the buy database." />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {Object.entries(data.counts).map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-cream px-4 py-3"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-3">{k}</p><p className="mt-1 font-display text-xl font-bold tabular">{v.toLocaleString('en-GB')}</p></div>
          ))}
        </div>
        <p className="mt-4 text-xs text-ink-3">Last order {data.lastOrderAt ? new Date(data.lastOrderAt).toLocaleString('en-GB') : 'none yet'}.</p>
      </Card>
    </div>
  );
}

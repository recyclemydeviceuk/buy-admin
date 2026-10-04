import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Grid3X3, Image as ImageIcon, Plus, Star, Trash2, Wand2, X } from 'lucide-react';
import { api } from '../api';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../store/auth';
import { useToast } from '../store/toast';
import type { AdminProduct, Condition, ProductInput, ProductStatus, Variant } from '../types';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, PageHeader, Stat } from '../components/ui/Card';
import { Field, Select, TextArea, Toggle } from '../components/ui/Field';
import { ConfirmDialog, Modal } from '../components/ui/Modal';
import { Segmented } from '../components/ui/Misc';
import { ProductBadge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { VariantMatrix } from '../components/products/VariantMatrix';
import { CONDITION_LABEL, CONDITION_ORDER, imageUrl, money, number, savingsPct, slugify, storageIndex, STOREFRONT_URL } from '../lib/format';
import { cn } from '../lib/cn';

const SERIES: Record<string, string[]> = { Apple: ['iPhone'], Samsung: ['Galaxy S', 'Galaxy Z', 'Galaxy A', 'Galaxy Note'] };

function blank(): ProductInput {
  return {
    slug: '', brand: 'Apple', name: '', series: 'iPhone', releaseYear: new Date().getFullYear(), image: '', rrp: 0, status: 'draft', featured: false, description: '',
    specs: { display: '', chip: '', camera: '', battery: '', connectivity: '5G' }, storages: [], networks: [], variants: [],
  };
}

export default function ProductEdit() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useAuth();
  const { data: loaded, loading } = useAsync(() => (id ? api.getProduct(id) : Promise.resolve(null)), [id]);
  const { data: settings } = useAsync(() => api.getSettings(), []);
  const [form, setForm] = useState<ProductInput | null>(isNew ? blank() : null);
  const [original, setOriginal] = useState<string>('');
  const [matrixMode, setMatrixMode] = useState<'price' | 'stock'>('price');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [generator, setGenerator] = useState<null | { base: number; stepGood: number; stepFair: number; lockedDiscount: number; stock: number; storageStep: number }>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugTouched, setSlugTouched] = useState(!isNew);

  useEffect(() => {
    if (loaded) {
      const { id: _id, createdAt: _c, updatedAt: _u, fromPrice: _f, ...rest } = loaded;
      setForm(rest);
      setOriginal(JSON.stringify(rest));
    }
  }, [loaded]);

  const dirty = form ? JSON.stringify(form) !== original : false;
  const editable = can('products.edit');
  const networks = settings?.networks ?? ['Unlocked', 'EE', 'Vodafone', 'O2', 'Three'];
  const low = settings?.lowStockThreshold ?? 2;

  const stats = useMemo(() => {
    if (!form) return null;
    const inStock = form.variants.filter((v) => v.stock > 0);
    const units = form.variants.reduce((s, v) => s + v.stock, 0);
    const value = form.variants.reduce((s, v) => s + v.stock * v.price, 0);
    const from = inStock.length ? Math.min(...inStock.map((v) => v.price)) : 0;
    return { units, value, from, out: form.variants.filter((v) => v.stock === 0).length, low: form.variants.filter((v) => v.stock > 0 && v.stock <= low).length };
  }, [form, low]);

  if (!form || (loading && !loaded && !isNew)) {
    if (!isNew && !loading && !loaded) {
      return (
        <div className="py-20 text-center">
          <p className="font-display text-xl font-bold">Product not found</p>
          <Button className="mt-5" variant="secondary" size="sm" to="/products"><ArrowLeft size={14} /> Back to products</Button>
        </div>
      );
    }
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 rounded-3xl" /></div>;
  }

  const patch = (p: Partial<ProductInput>) => setForm((f) => (f ? { ...f, ...p } : f));
  const setSpec = (k: keyof ProductInput['specs'], v: string) => patch({ specs: { ...form.specs, [k]: v } });

  function setName(name: string) {
    patch({ name, ...(slugTouched ? {} : { slug: slugify(`${form!.brand} ${name}`) }) });
  }

  function toggleList(key: 'storages' | 'networks', value: string) {
    const list = form![key];
    const next = list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
    const sorted = key === 'storages' ? next.sort((a, b) => storageIndex(a) - storageIndex(b)) : next.sort((a, b) => networks.indexOf(a) - networks.indexOf(b));
    // Drop variants for removed options; keep the rest.
    const variants = form!.variants.filter((v) => (key === 'storages' ? sorted.includes(v.storage) : sorted.includes(v.network)));
    patch({ [key]: sorted, variants } as Partial<ProductInput>);
  }

  function ensureMatrix() {
    const existing = new Map(form!.variants.map((v) => [`${v.storage}|${v.network}|${v.condition}`, v]));
    const variants: Variant[] = [];
    form!.storages.forEach((s) => form!.networks.forEach((n) => CONDITION_ORDER.forEach((c) => variants.push(existing.get(`${s}|${n}|${c}`) ?? { storage: s, network: n, condition: c, price: 0, stock: 0 }))));
    patch({ variants });
    toast.info(`${variants.length} variant cells ready`, 'Fill in prices and stock below.');
  }

  function generate() {
    if (!generator) return;
    const { base, stepGood, stepFair, lockedDiscount, stock, storageStep } = generator;
    const variants: Variant[] = [];
    form!.storages.forEach((s, si) =>
      form!.networks.forEach((n) =>
        CONDITION_ORDER.forEach((c) => {
          let price = base + si * storageStep;
          if (c === 'good') price = price * (1 - stepGood / 100);
          if (c === 'fair') price = price * (1 - stepFair / 100);
          if (n !== 'Unlocked') price = price * (1 - lockedDiscount / 100);
          variants.push({ storage: s, network: n, condition: c, price: Math.round((price - 9) / 10) * 10 + 9, stock });
        }),
      ),
    );
    patch({ variants });
    setGenerator(null);
    toast.success('Prices generated', `${variants.length} variants. Adjust any cell before saving.`);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form!.name.trim()) e.name = 'Give the product a name.';
    if (!/^[a-z0-9-]+$/.test(form!.slug)) e.slug = 'Lowercase letters, numbers and hyphens only.';
    if (!form!.image.trim()) e.image = 'Add an image URL or path.';
    if (!(form!.rrp > 0)) e.rrp = 'Enter the launch RRP.';
    if (!form!.storages.length) e.storages = 'Pick at least one storage size.';
    if (!form!.networks.length) e.networks = 'Pick at least one network.';
    if (form!.status === 'active' && !form!.variants.some((v) => v.price > 0)) e.variants = 'An active product needs at least one priced variant.';
    setErrors(e);
    if (Object.keys(e).length) toast.error('Check the highlighted fields');
    return Object.keys(e).length === 0;
  }

  async function save(andClose = false) {
    if (!validate()) return;
    setSaving(true);
    try {
      let saved: AdminProduct;
      if (isNew) {
        saved = await api.createProduct(form!);
        toast.success('Product created');
        navigate(`/products/${saved.id}`, { replace: true });
      } else {
        saved = await api.updateProduct(id!, form!);
        toast.success('Saved');
        const { id: _id, createdAt: _c, updatedAt: _u, fromPrice: _f, ...rest } = saved;
        setForm(rest);
        setOriginal(JSON.stringify(rest));
      }
      if (andClose) navigate('/products');
    } catch (e) {
      toast.error('Could not save', e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    try {
      await api.deleteProduct(id!);
      toast.success('Product removed');
      navigate('/products');
    } catch (e) {
      toast.error('Could not delete', e instanceof Error ? e.message : undefined);
      setSaving(false);
    }
  }

  const storageOptions = [...new Set([...(settings?.storages ?? []), ...form.storages])].sort((a, b) => storageIndex(a) - storageIndex(b));

  return (
    <div>
      <PageHeader
        back={<Link to="/products" className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-3 hover:text-ink"><ArrowLeft size={14} /> Products</Link>}
        title={<span className="flex flex-wrap items-center gap-3">{isNew ? 'New product' : `${form.brand} ${form.name}`}<ProductBadge status={form.status} />{form.featured && <Star size={16} className="fill-amber-400 text-amber-400" />}</span>}
        subtitle={isNew ? 'Add a model to the buy catalogue. Save as draft until prices and stock are ready.' : <>Slug <span className="font-mono">{form.slug}</span>{loaded && <> · created {new Date(loaded.createdAt).toLocaleDateString('en-GB')}</>}</>}
        actions={
          <>
            {!isNew && <Button size="sm" variant="ghost" href={`${STOREFRONT_URL}/phones/${form.slug}`}><ExternalLink size={14} /> View</Button>}
            {!isNew && can('products.delete') && <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}><Trash2 size={14} /> Delete</Button>}
            {editable && <Button size="sm" variant="secondary" onClick={() => void save(true)} loading={saving} disabled={!dirty && !isNew}>Save and close</Button>}
            {editable && <Button size="sm" variant="primary" onClick={() => void save()} loading={saving} disabled={!dirty && !isNew}>{isNew ? 'Create product' : 'Save changes'}</Button>}
          </>
        }
      />

      {dirty && !isNew && editable && <p className="mb-4 rounded-2xl bg-tint-lemon px-4 py-2.5 text-[13px] font-semibold text-warn">You have unsaved changes.</p>}
      {!editable && <p className="mb-4 rounded-2xl bg-cream px-4 py-2.5 text-[13px] text-ink-2">Read-only: your role can view products but not edit them.</p>}

      <fieldset disabled={!editable} className="contents">
      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card>
            <CardHeader title="Details" subtitle="What the storefront shows on the product page and in the mega menu." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Brand" value={form.brand} onChange={(e) => patch({ brand: e.target.value, series: SERIES[e.target.value]?.[0] ?? form.series })}><option>Apple</option><option>Samsung</option></Select>
              <Select label="Series" value={form.series} onChange={(e) => patch({ series: e.target.value })}>{(SERIES[form.brand] ?? [form.series]).map((s) => <option key={s}>{s}</option>)}</Select>
              <Field label="Model name" value={form.name} onChange={(e) => setName(e.target.value)} placeholder="e.g. iPhone 16 Pro" error={errors.name} hint="Without the brand; the storefront prefixes it." />
              <Field label="Slug" value={form.slug} onChange={(e) => { setSlugTouched(true); patch({ slug: slugify(e.target.value) }); }} error={errors.slug} hint={`URL: /phones/${form.slug || '…'}`} />
              <Field label="Release year" type="number" min={2015} max={2030} value={form.releaseYear} onChange={(e) => patch({ releaseYear: Number(e.target.value) })} />
              <Field label="Launch RRP" prefix="£" type="number" min={0} value={form.rrp || ''} onChange={(e) => patch({ rrp: Number(e.target.value) })} error={errors.rrp} hint="Used for the “£x off new” badge." />
              <TextArea className="sm:col-span-2" label="Description" value={form.description} onChange={(e) => patch({ description: e.target.value })} placeholder="What is included, how it is tested, warranty…" />
            </div>
          </Card>

          <Card>
            <CardHeader title="Specifications" subtitle="Shown in the specs panel on the product page." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Display" value={form.specs.display} onChange={(e) => setSpec('display', e.target.value)} placeholder='6.1" Super Retina XDR' />
              <Field label="Chip" value={form.specs.chip} onChange={(e) => setSpec('chip', e.target.value)} placeholder="A18 Pro" />
              <Field label="Camera" value={form.specs.camera} onChange={(e) => setSpec('camera', e.target.value)} placeholder="48MP triple" />
              <Field label="Battery" value={form.specs.battery} onChange={(e) => setSpec('battery', e.target.value)} placeholder="3,582 mAh" />
              <Field label="Connectivity" value={form.specs.connectivity} onChange={(e) => setSpec('connectivity', e.target.value)} placeholder="5G" />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Variants, prices and stock"
              subtitle={`${form.variants.length} of ${form.storages.length * form.networks.length * 3} cells · the storefront hides a variant when stock is 0.`}
              actions={
                <>
                  <Segmented size="sm" value={matrixMode} onChange={setMatrixMode} options={[{ value: 'price', label: 'Prices' }, { value: 'stock', label: 'Stock' }]} />
                  <Button size="xs" variant="secondary" onClick={ensureMatrix} disabled={!form.storages.length || !form.networks.length}><Grid3X3 size={13} /> Fill matrix</Button>
                  <Button size="xs" variant="secondary" onClick={() => setGenerator({ base: form.rrp ? Math.round(form.rrp * 0.55) : 299, stepGood: 12, stepFair: 24, lockedDiscount: 6, stock: 3, storageStep: 40 })} disabled={!form.storages.length || !form.networks.length}><Wand2 size={13} /> Generate prices</Button>
                </>
              }
            />
            <div className="mb-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-[13px] font-semibold">Storage sizes {errors.storages && <span className="ml-2 text-xs text-brand-600">{errors.storages}</span>}</p>
                <div className="flex flex-wrap gap-1.5">
                  {storageOptions.map((s) => (
                    <button key={s} type="button" onClick={() => toggleList('storages', s)} className={cn('rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors', form.storages.includes(s) ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-ink')}>{s}</button>
                  ))}
                  <AddChip onAdd={(v) => { const s = v.toUpperCase().replace(/\s/g, ''); if (/^\d+(GB|TB)$/.test(s) && !form.storages.includes(s)) toggleList('storages', s); }} placeholder="e.g. 2TB" />
                </div>
              </div>
              <div>
                <p className="mb-2 text-[13px] font-semibold">Networks {errors.networks && <span className="ml-2 text-xs text-brand-600">{errors.networks}</span>}</p>
                <div className="flex flex-wrap gap-1.5">
                  {networks.map((n) => (
                    <button key={n} type="button" onClick={() => toggleList('networks', n)} className={cn('rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors', form.networks.includes(n) ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-ink')}>{n}</button>
                  ))}
                </div>
              </div>
            </div>
            {errors.variants && <p className="mb-3 text-xs font-semibold text-brand-600">{errors.variants}</p>}
            {form.storages.length && form.networks.length ? (
              <VariantMatrix variants={form.variants} storages={form.storages} networks={form.networks} lowStock={low} mode={matrixMode} onChange={(variants) => patch({ variants })} />
            ) : (
              <p className="rounded-2xl bg-cream px-4 py-6 text-center text-sm text-ink-3">Pick storage sizes and networks to build the variant matrix.</p>
            )}
            <p className="mt-3 text-xs text-ink-4">Tip: tab moves across cells. Grade order is {CONDITION_ORDER.map((c) => CONDITION_LABEL[c]).join(' → ')}.</p>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Visibility" />
            <div className="space-y-4">
              <Select label="Status" value={form.status} onChange={(e) => patch({ status: e.target.value as ProductStatus })}>
                <option value="active">Active · live on the storefront</option>
                <option value="draft">Draft · hidden</option>
                <option value="archived">Archived · hidden, kept for order history</option>
              </Select>
              <Toggle checked={form.featured} onChange={(v) => patch({ featured: v })} label="Featured on the home page" description="Shown in the bestseller rail and mega menu quick picks." />
            </div>
          </Card>

          <Card>
            <CardHeader title="Image" subtitle="Real device photo on white; the storefront blends the background away." />
            <div className="flex h-44 items-center justify-center rounded-2xl bg-cream p-4">
              {form.image ? <img src={imageUrl(form.image)} alt="" className="h-full product-img" onError={(e) => ((e.target as HTMLImageElement).style.opacity = '0.2')} /> : <ImageIcon size={28} className="text-ink-4" />}
            </div>
            <Field className="mt-3" label="Image URL or path" value={form.image} onChange={(e) => patch({ image: e.target.value })} placeholder="/phones/apple-iphone-16-pro.webp or https://…" error={errors.image} hint="Relative paths resolve against the storefront." />
          </Card>

          {stats && (
            <Card>
              <CardHeader title="At a glance" />
              <div className="grid grid-cols-2 gap-2">
                <Stat label="From price" value={stats.from ? money(stats.from) : '—'} sub={form.rrp && stats.from ? `${savingsPct(stats.from, form.rrp)}% off new` : undefined} />
                <Stat label="Units" value={number(stats.units)} sub={`${money(stats.value)} at sale price`} />
                <Stat label="Out of stock" value={number(stats.out)} sub="variants" />
                <Stat label="Low stock" value={number(stats.low)} sub={`≤ ${low} units`} />
              </div>
              {!isNew && loaded && <p className="mt-4 text-xs text-ink-3">Rating ★ {loaded.rating.toFixed(1)} from {loaded.reviewCount} reviews. Ratings update automatically from approved reviews.</p>}
            </Card>
          )}
        </div>
      </div>

      </fieldset>

      <Modal open={!!generator} onClose={() => setGenerator(null)} title="Generate prices" subtitle="Fills every cell from a base price. You can still edit cells afterwards." size="sm" footer={<><Button size="sm" variant="ghost" onClick={() => setGenerator(null)}>Cancel</Button><Button size="sm" onClick={generate}><Wand2 size={14} /> Generate</Button></>}>
        {generator && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Base price (Excellent, Unlocked, smallest storage)" prefix="£" type="number" className="sm:col-span-2" value={generator.base} onChange={(e) => setGenerator({ ...generator, base: Number(e.target.value) })} />
            <Field label="Each storage step adds" prefix="£" type="number" value={generator.storageStep} onChange={(e) => setGenerator({ ...generator, storageStep: Number(e.target.value) })} />
            <Field label="Network-locked discount" suffix="%" type="number" value={generator.lockedDiscount} onChange={(e) => setGenerator({ ...generator, lockedDiscount: Number(e.target.value) })} />
            <Field label="Good is cheaper by" suffix="%" type="number" value={generator.stepGood} onChange={(e) => setGenerator({ ...generator, stepGood: Number(e.target.value) })} />
            <Field label="Fair is cheaper by" suffix="%" type="number" value={generator.stepFair} onChange={(e) => setGenerator({ ...generator, stepFair: Number(e.target.value) })} />
            <Field label="Stock per variant" type="number" className="sm:col-span-2" value={generator.stock} onChange={(e) => setGenerator({ ...generator, stock: Number(e.target.value) })} />
            <p className="text-xs text-ink-3 sm:col-span-2">Prices are rounded to end in £9.</p>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={() => void remove()} loading={saving} danger title="Delete this product?" confirmLabel="Delete" body={<>If the product has ever been ordered it is archived instead so order history keeps working. Otherwise it is removed permanently.</>} />
    </div>
  );
}

function AddChip({ onAdd, placeholder }: { onAdd: (v: string) => void; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState('');
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-3 py-1.5 text-[13px] font-semibold text-ink-3 hover:border-ink hover:text-ink"><Plus size={13} /> Add</button>;
  return (
    <span className="inline-flex items-center gap-1">
      <input autoFocus value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { onAdd(v); setV(''); setOpen(false); } if (e.key === 'Escape') setOpen(false); }} placeholder={placeholder} className="input input-sm w-24" />
      <button type="button" onClick={() => { onAdd(v); setV(''); setOpen(false); }} className="rounded-full p-1.5 hover:bg-cream"><Plus size={14} /></button>
      <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1.5 hover:bg-cream"><X size={14} /></button>
    </span>
  );
}

export type { Condition };

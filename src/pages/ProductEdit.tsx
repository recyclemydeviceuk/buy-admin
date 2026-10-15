import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Grid3X3, Image as ImageIcon, Plus, Star, Trash2, Wand2, X } from 'lucide-react';
import { api } from '../api';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../store/auth';
import { useToast } from '../store/toast';
import type { AdminProduct, Colour, Condition, ProductInput, ProductStatus, Variant } from '../types';
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
    specs: { display: '', chip: '', camera: '', battery: '', connectivity: '5G' }, storages: [], colours: [], variants: [],
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
  const [generator, setGenerator] = useState<null | { base: number; stepPremium: number; stepGood: number; stepFair: number; stock: number; storageStep: number }>(null);
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

  function toggleStorage(value: string) {
    const next = form!.storages.includes(value) ? form!.storages.filter((x) => x !== value) : [...form!.storages, value];
    const storages = next.sort((a, b) => storageIndex(a) - storageIndex(b));
    // Drop variants for a removed size; keep the rest.
    patch({ storages, variants: form!.variants.filter((v) => storages.includes(v.storage)) });
  }

  /** Every variant belongs to one of the product's colours, so its rows follow the colour list as it is edited. */
  function setColours(colours: Colour[]) {
    const before = form!.colours;
    let variants = form!.variants;
    if (!before.length && colours.length) variants = variants.map((v) => ({ ...v, colour: colours[0].name })); // first colour takes the existing prices
    else if (before.length && !colours.length) variants = variants.filter((v) => v.colour === before[0].name).map((v) => ({ ...v, colour: '' }));
    else if (colours.length === before.length) variants = variants.map((v) => { const i = before.findIndex((c) => c.name === v.colour); return i === -1 ? v : { ...v, colour: colours[i].name }; }); // renamed
    else variants = variants.filter((v) => colours.some((c) => c.name === v.colour)); // removed
    patch({ colours, variants });
  }

  /** The matrix rows: one per colour, or a single colourless row for a product with no colours yet. */
  const colourNames = () => (form!.colours.length ? form!.colours.map((c) => c.name) : ['']);

  function ensureMatrix() {
    const existing = new Map(form!.variants.map((v) => [`${v.storage}|${v.colour}|${v.condition}`, v]));
    // A new colour starts from the prices of one that is already filled in.
    const priceElsewhere = (s: string, c: Condition) => form!.variants.find((v) => v.storage === s && v.condition === c && v.price > 0)?.price ?? 0;
    const variants: Variant[] = [];
    form!.storages.forEach((s) => colourNames().forEach((n) => CONDITION_ORDER.forEach((c) => variants.push(existing.get(`${s}|${n}|${c}`) ?? { storage: s, colour: n, condition: c, price: priceElsewhere(s, c), stock: 0 }))));
    patch({ variants });
    toast.info(`${variants.length} variant cells ready`, 'Fill in prices and stock below.');
  }

  function generate() {
    if (!generator) return;
    const { base, stepPremium, stepGood, stepFair, stock, storageStep } = generator;
    const variants: Variant[] = [];
    form!.storages.forEach((s, si) =>
      colourNames().forEach((n) =>
        CONDITION_ORDER.forEach((c) => {
          let price = base + si * storageStep;
          if (c === 'premium') price = price * (1 + stepPremium / 100);
          if (c === 'good') price = price * (1 - stepGood / 100);
          if (c === 'fair') price = price * (1 - stepFair / 100);
          variants.push({ storage: s, colour: n, condition: c, price: Math.round((price - 9) / 10) * 10 + 9, stock });
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
    const names = form!.colours.map((c) => c.name.trim().toLowerCase());
    if (names.some((n) => !n)) e.colours = 'Give every colour a name.';
    else if (new Set(names).size !== names.length) e.colours = 'Two colours have the same name.';
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
              subtitle={`${form.variants.length} of ${form.storages.length * Math.max(1, form.colours.length) * CONDITION_ORDER.length} cells · the storefront hides a variant when stock is 0.`}
              actions={
                <>
                  <Segmented size="sm" value={matrixMode} onChange={setMatrixMode} options={[{ value: 'price', label: 'Prices' }, { value: 'stock', label: 'Stock' }]} />
                  <Button size="xs" variant="secondary" onClick={ensureMatrix} disabled={!form.storages.length}><Grid3X3 size={13} /> Fill matrix</Button>
                  <Button size="xs" variant="secondary" onClick={() => setGenerator({ base: form.rrp ? Math.round(form.rrp * 0.55) : 299, stepPremium: 8, stepGood: 12, stepFair: 24, stock: 0, storageStep: 40 })} disabled={!form.storages.length}><Wand2 size={13} /> Generate prices</Button>
                </>
              }
            />
            <div className="mb-5 space-y-5">
              <div>
                <p className="mb-2 text-[13px] font-semibold">Storage sizes {errors.storages && <span className="ml-2 text-xs text-brand-600">{errors.storages}</span>}</p>
                <div className="flex flex-wrap gap-1.5">
                  {storageOptions.map((s) => (
                    <button key={s} type="button" onClick={() => toggleStorage(s)} className={cn('rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors', form.storages.includes(s) ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-ink')}>{s}</button>
                  ))}
                  <AddChip onAdd={(v) => { const s = v.toUpperCase().replace(/\s/g, ''); if (/^\d+(GB|TB)$/.test(s) && !form.storages.includes(s)) toggleStorage(s); }} placeholder="e.g. 2TB" />
                </div>
              </div>
              <div>
                <p className="mb-2 text-[13px] font-semibold">Colours {errors.colours && <span className="ml-2 text-xs text-brand-600">{errors.colours}</span>}</p>
                <ColourList colours={form.colours} onChange={setColours} />
              </div>
            </div>
            {errors.variants && <p className="mb-3 text-xs font-semibold text-brand-600">{errors.variants}</p>}
            {form.storages.length ? (
              <VariantMatrix variants={form.variants} storages={form.storages} colours={form.colours} lowStock={low} mode={matrixMode} onChange={(variants) => patch({ variants })} />
            ) : (
              <p className="rounded-2xl bg-cream px-4 py-6 text-center text-sm text-ink-3">Pick storage sizes to build the variant matrix.</p>
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
            <CardHeader title="Image" subtitle="Real device photo on white; the storefront blends the background away. Shown when a colour has no photo of its own." />
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
            <Field label="Base price (Excellent, smallest storage)" prefix="£" type="number" className="sm:col-span-2" value={generator.base} onChange={(e) => setGenerator({ ...generator, base: Number(e.target.value) })} />
            <Field label="Each storage step adds" prefix="£" type="number" value={generator.storageStep} onChange={(e) => setGenerator({ ...generator, storageStep: Number(e.target.value) })} />
            <Field label="Premium costs more by" suffix="%" type="number" value={generator.stepPremium} onChange={(e) => setGenerator({ ...generator, stepPremium: Number(e.target.value) })} />
            <Field label="Good is cheaper by" suffix="%" type="number" value={generator.stepGood} onChange={(e) => setGenerator({ ...generator, stepGood: Number(e.target.value) })} />
            <Field label="Fair is cheaper by" suffix="%" type="number" value={generator.stepFair} onChange={(e) => setGenerator({ ...generator, stepFair: Number(e.target.value) })} />
            <Field label="Stock per variant" type="number" value={generator.stock} onChange={(e) => setGenerator({ ...generator, stock: Number(e.target.value) })} hint="Leave at 0 and enter real stock afterwards." />
            <p className="text-xs text-ink-3 sm:col-span-2">Prices are rounded to end in £9. Every colour gets the same prices.</p>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={() => void remove()} loading={saving} danger title="Delete this product?" confirmLabel="Delete" body={<>If the product has ever been ordered it is archived instead so order history keeps working. Otherwise it is removed permanently.</>} />
    </div>
  );
}

/** The finishes a product is sold in. Each has a swatch for the storefront picker and its own photo. */
function ColourList({ colours, onChange }: { colours: Colour[]; onChange: (next: Colour[]) => void }) {
  const set = (i: number, p: Partial<Colour>) => onChange(colours.map((c, j) => (j === i ? { ...c, ...p } : c)));
  return (
    <div className="space-y-2">
      {colours.map((c, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 rounded-2xl border border-line p-2">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cream">{c.image ? <img src={imageUrl(c.image)} alt="" className="h-9 w-9 product-img" /> : <ImageIcon size={16} className="text-ink-4" />}</span>
          <input type="color" value={c.hex} onChange={(e) => set(i, { hex: e.target.value })} aria-label={`${c.name || 'Colour'} swatch`} className="h-9 w-9 shrink-0 cursor-pointer rounded-full border border-line bg-white p-0.5" />
          <ColourName value={c.name} taken={colours.filter((_, j) => j !== i).map((x) => x.name.toLowerCase())} onCommit={(name) => set(i, { name })} />
          <input value={c.image} onChange={(e) => set(i, { image: e.target.value.trim() })} placeholder="Photo URL for this colour (https://…)" aria-label={`${c.name || 'Colour'} photo URL`} className="input input-sm min-w-0 flex-1" />
          <button type="button" onClick={() => onChange(colours.filter((_, j) => j !== i))} className="rounded-full p-2 text-ink-3 hover:bg-cream hover:text-brand-600" aria-label={`Remove ${c.name || 'colour'}`}><X size={14} /></button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...colours, { name: '', hex: '#1F2933', image: '' }])} className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-3 py-1.5 text-[13px] font-semibold text-ink-3 hover:border-ink hover:text-ink"><Plus size={13} /> Add colour</button>
      <p className="text-xs text-ink-4">{colours.length ? 'Removing a colour removes its prices and stock. New colours start empty: use Fill matrix to copy the prices across.' : 'No colours yet: the phone is sold without a colour choice. The first colour you add takes the existing prices.'}</p>
    </div>
  );
}

/** Variants are tied to their colour by name, so a rename is applied once, when the field is left, and never to a name already in use. */
function ColourName({ value, taken, onCommit }: { value: string; taken: string[]; onCommit: (name: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const clash = !!draft.trim() && taken.includes(draft.trim().toLowerCase());
  const commit = () => {
    const name = draft.trim();
    if (clash) return setDraft(value);
    if (name !== value) onCommit(name);
    setDraft(name);
  };
  return <input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} placeholder="Colour name, e.g. Deep Blue" aria-label="Colour name" aria-invalid={clash} title={clash ? 'Another colour already has this name' : undefined} className={cn('input input-sm w-44', clash && 'border-brand-600')} />;
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

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Lock, Minus, Plus, Shield, Trash2, UserMinus, UserPlus, Users, X } from 'lucide-react';
import { api } from '../api';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../store/auth';
import { useToast } from '../store/toast';
import type { AdminUser, Permission, Role, RoleColor, RoleInput } from '../types';
import { Button, IconButton } from '../components/ui/Button';
import { Card, CardHeader, PageHeader, Stat } from '../components/ui/Card';
import { Field, TextArea } from '../components/ui/Field';
import { Dropdown } from '../components/ui/Dropdown';
import { Avatar, Menu, Segmented, Tabs } from '../components/ui/Misc';
import { Badge, RoleBadge, ROLE_TONE } from '../components/ui/Badge';
import { ConfirmDialog, Modal } from '../components/ui/Modal';
import { Table, type Column } from '../components/ui/Table';
import { Skeleton } from '../components/ui/Skeleton';
import { ALL_PERMISSIONS, PERMISSION_GROUPS } from '../lib/permissions';
import { formatDate, number, timeAgo } from '../lib/format';
import { cn } from '../lib/cn';

type RoleRow = Role & { members: number };
const COLORS: RoleColor[] = ['ink', 'brand', 'sky', 'mint', 'lilac', 'lemon', 'peach'];

export default function Team() {
  const { can, user: me } = useAuth();
  const toast = useToast();
  const manage = can('team.manage');
  const [tab, setTab] = useState<'members' | 'roles' | 'matrix'>('members');
  const { data: admins, reload: reloadAdmins } = useAsync(() => api.listAdmins(), []);
  const { data: roles, reload: reloadRoles } = useAsync(() => api.listRoles(), []);
  const reload = () => {
    reloadAdmins();
    reloadRoles();
  };
  const roleOf = (id: string) => roles?.find((r) => r.id === id);

  // Members state
  const [invite, setInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', roleId: 'role_staff' });
  const [removing, setRemoving] = useState<AdminUser | null>(null);
  const [busy, setBusy] = useState(false);

  async function act(label: string, fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      toast.success(label);
      reload();
      return true;
    } catch (e) {
      toast.error('Could not complete that', e instanceof Error ? e.message : undefined);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const memberColumns: Column<AdminUser>[] = [
    { key: 'who', header: 'Admin', render: (u) => (
      <div className="flex items-center gap-3">
        <Avatar name={u.name} />
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate font-bold">{u.name}{u.id === me?.id && <Badge tone="outline">You</Badge>}</p>
          <p className="truncate text-xs text-ink-3">{u.email}</p>
        </div>
      </div>
    ) },
    { key: 'role', header: 'Role', render: (u) => {
      const r = roleOf(u.roleId);
      if (!manage || u.id === me?.id) return r ? <RoleBadge role={r} /> : <span className="text-ink-3">—</span>;
      return (
        <Dropdown
          value={u.roleId}
          clearable={false}
          menuWidth="300px"
          options={(roles ?? []).map((x) => ({ value: x.id, label: x.name, description: `${x.permissions.length} permissions`, icon: <span className={cn('h-2.5 w-2.5 rounded-full', { ink: 'bg-ink', brand: 'bg-brand-600', sky: 'bg-info', mint: 'bg-success', lilac: 'bg-violet', lemon: 'bg-warn', peach: 'bg-brand-700' }[x.color])} /> }))}
          onChange={(v) => v && void act(`${u.name} moved to ${roleOf(v)?.name}`, () => api.updateAdmin(u.id, { roleId: v }))}
        />
      );
    } },
    { key: 'status', header: 'Status', render: (u) => (u.status === 'active' ? <Badge tone="mint" dot>Active</Badge> : <Badge tone="peach" dot>Suspended</Badge>) },
    { key: 'last', header: 'Last sign-in', hideBelow: 'md', render: (u) => <span className="text-xs text-ink-3">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : 'Never'}</span> },
    { key: 'added', header: 'Added', hideBelow: 'lg', render: (u) => <span className="text-xs text-ink-3">{formatDate(u.createdAt)}</span> },
    { key: 'actions', header: '', align: 'right', width: '56px', render: (u) =>
      manage && u.id !== me?.id ? (
        <Menu
          trigger={<IconButton label="Actions"><Minus className="rotate-90" size={16} /></IconButton>}
          items={[
            u.status === 'active'
              ? { label: 'Suspend access', icon: <UserMinus size={14} />, onClick: () => void act(`${u.name} suspended`, () => api.updateAdmin(u.id, { status: 'suspended' })) }
              : { label: 'Restore access', icon: <UserPlus size={14} />, onClick: () => void act(`${u.name} restored`, () => api.updateAdmin(u.id, { status: 'active' })) },
            'divider',
            { label: 'Remove from team', icon: <Trash2 size={14} />, danger: true, onClick: () => setRemoving(u) },
          ]}
        />
      ) : null },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Manage"
        title="Team & roles"
        subtitle="Who can sign in, and exactly what each role can do. Sign-in is by emailed code, so there are no passwords."
        actions={manage && tab === 'members' && <Button size="sm" onClick={() => setInvite(true)}><Plus size={15} /> Invite admin</Button>}
      />
      {admins && roles && (
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Admins" value={number(admins.length)} sub={`${admins.filter((a) => a.status === 'active').length} active`} className="border border-line bg-white" />
          <Stat label="Roles" value={number(roles.length)} sub={`${roles.filter((r) => !r.system).length} custom`} className="border border-line bg-white" />
          <Stat label="Owners" value={number(admins.filter((a) => a.roleId === 'role_owner' && a.status === 'active').length)} sub="full access" className="border border-line bg-white" />
          <Stat label="Permissions" value={number(ALL_PERMISSIONS.length)} sub="available to assign" className="border border-line bg-white" />
        </div>
      )}
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'members', label: 'Members', count: admins?.length }, { value: 'roles', label: 'Roles', count: roles?.length }, { value: 'matrix', label: 'Permission matrix' }]} />

      <div className="mt-5">
        {tab === 'members' && (
          <Card padded={false}>
            <Table columns={memberColumns} rows={admins ?? []} rowKey={(u) => u.id} loading={!admins} density="comfortable" />
            {!manage && <p className="border-t border-line px-4 py-3 text-xs text-ink-3"><Lock size={11} className="mr-1 inline" /> You can view the team. Managing members needs the “Manage team and roles” permission.</p>}
          </Card>
        )}
        {tab === 'roles' && roles && <RolesEditor roles={roles} manage={manage} onChanged={reload} />}
        {tab === 'matrix' && roles && <Matrix roles={roles} />}
      </div>

      <Modal open={invite} onClose={() => setInvite(false)} title="Invite an admin" subtitle="They sign in with a code emailed to this address." size="sm" footer={<><Button size="sm" variant="ghost" onClick={() => setInvite(false)}>Cancel</Button><Button size="sm" loading={busy} disabled={!inviteForm.email.includes('@')} onClick={async () => { const ok = await act('Invitation added', () => api.addAdmin(inviteForm)); if (ok) { setInvite(false); setInviteForm({ email: '', name: '', roleId: 'role_staff' }); } }}>Add admin</Button></>}>
        <div className="space-y-3">
          <Field label="Email" type="email" autoFocus value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="name@cashmymobile.co.uk" />
          <Field label="Name" value={inviteForm.name} onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })} />
          <Dropdown variant="field" fieldLabel="Role" clearable={false} value={inviteForm.roleId} onChange={(v) => v && setInviteForm({ ...inviteForm, roleId: v })} options={(roles ?? []).map((r) => ({ value: r.id, label: r.name, description: r.description }))} />
        </div>
      </Modal>
      <ConfirmDialog open={!!removing} onClose={() => setRemoving(null)} loading={busy} danger title={`Remove ${removing?.name}?`} confirmLabel="Remove" body="They will no longer be able to sign in. Their past actions stay in the activity log." onConfirm={async () => { if (!removing) return; const ok = await act('Admin removed', () => api.removeAdmin(removing.id)); if (ok) setRemoving(null); }} />
    </div>
  );
}

function RolesEditor({ roles, manage, onChanged }: { roles: RoleRow[]; manage: boolean; onChanged: () => void }) {
  const toast = useToast();
  const [selectedId, setSelectedId] = useState<string>(roles[0]?.id);
  const [draft, setDraft] = useState<RoleInput | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const selected = roles.find((r) => r.id === selectedId) ?? null;
  const locked = !manage || (selected?.id === 'role_owner' && !creating);

  useEffect(() => {
    if (creating) return;
    if (selected) setDraft({ name: selected.name, description: selected.description, permissions: [...selected.permissions], color: selected.color });
  }, [selected, creating]);

  const dirty = useMemo(() => {
    if (!draft) return false;
    if (creating) return true;
    if (!selected) return false;
    return draft.name !== selected.name || draft.description !== selected.description || draft.color !== selected.color || [...draft.permissions].sort().join() !== [...selected.permissions].sort().join();
  }, [draft, selected, creating]);

  function startCreate(from?: Role) {
    setCreating(true);
    setDraft(from ? { name: `${from.name} copy`, description: from.description, permissions: [...from.permissions], color: from.color } : { name: '', description: '', permissions: ['dashboard.view'], color: 'sky' });
  }
  function toggle(p: Permission) {
    if (!draft || locked) return;
    setDraft({ ...draft, permissions: draft.permissions.includes(p) ? draft.permissions.filter((x) => x !== p) : [...draft.permissions, p] });
  }
  function toggleGroup(keys: Permission[]) {
    if (!draft || locked) return;
    const all = keys.every((k) => draft.permissions.includes(k));
    setDraft({ ...draft, permissions: all ? draft.permissions.filter((x) => !keys.includes(x)) : [...new Set([...draft.permissions, ...keys])] });
  }
  async function save() {
    if (!draft) return;
    setBusy(true);
    try {
      if (creating) {
        const r = await api.createRole(draft);
        toast.success('Role created', `${r.name} · ${r.permissions.length} permissions`);
        setCreating(false);
        setSelectedId(r.id);
      } else if (selected) {
        await api.updateRole(selected.id, draft);
        toast.success('Role saved');
      }
      onChanged();
    } catch (e) {
      toast.error('Could not save role', e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!selected) return;
    setBusy(true);
    try {
      await api.deleteRole(selected.id);
      toast.success('Role deleted');
      setConfirmDelete(false);
      setSelectedId(roles[0].id);
      onChanged();
    } catch (e) {
      toast.error('Could not delete role', e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  const dot: Record<RoleColor, string> = { ink: 'bg-ink', brand: 'bg-brand-600', sky: 'bg-info', mint: 'bg-success', lilac: 'bg-violet', lemon: 'bg-warn', peach: 'bg-brand-700' };

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
      <Card padded={false}>
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="text-[13px] font-bold">Roles</p>
          {manage && <Button size="xs" variant="secondary" onClick={() => startCreate()}><Plus size={13} /> New role</Button>}
        </div>
        <ul className="divide-y divide-line-2">
          {roles.map((r) => (
            <li key={r.id}>
              <button onClick={() => { setCreating(false); setSelectedId(r.id); }} className={cn('flex w-full items-start gap-3 px-4 py-3 text-left transition-colors', selectedId === r.id && !creating ? 'bg-cream' : 'hover:bg-cream-2')}>
                <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', dot[r.color])} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[13.5px] font-bold">{r.name}{r.system && <Lock size={11} className="text-ink-4" />}</span>
                  <span className="block truncate text-xs text-ink-3">{r.permissions.length === ALL_PERMISSIONS.length ? 'All permissions' : `${r.permissions.length} of ${ALL_PERMISSIONS.length} permissions`} · {r.members} {r.members === 1 ? 'member' : 'members'}</span>
                </span>
              </button>
            </li>
          ))}
          {creating && (
            <li className="flex items-start gap-3 bg-cream px-4 py-3">
              <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', dot[draft?.color ?? 'sky'])} />
              <span className="text-[13.5px] font-bold">{draft?.name || 'New role'}</span>
            </li>
          )}
        </ul>
        <p className="border-t border-line px-4 py-3 text-xs text-ink-3">Built-in roles are marked with a lock. Owner cannot be edited; Manager and Staff can be tuned but not deleted.</p>
      </Card>

      {draft ? (
        <Card padded={false}>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-6 py-5">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-[18px] font-bold">{creating ? 'New role' : selected?.name}</h2>
                {!creating && selected && <RoleBadge role={{ name: selected.system ? 'Built-in' : 'Custom', color: selected.system ? 'ink' : selected.color }} />}
                {!creating && selected && <span className="text-xs text-ink-3">{selected.members} {selected.members === 1 ? 'member' : 'members'} · updated {timeAgo(selected.updatedAt)}</span>}
              </div>
              {locked && !creating && <p className="mt-1 text-xs text-ink-3"><Lock size={11} className="mr-1 inline" />{manage ? 'The Owner role always has every permission.' : 'You can view roles but not change them.'}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {manage && !creating && selected && <Button size="sm" variant="secondary" onClick={() => startCreate(selected)}><Copy size={14} /> Duplicate</Button>}
              {manage && !creating && selected && !selected.system && <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}><Trash2 size={14} /> Delete</Button>}
              {creating && <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>}
              {!locked && <Button size="sm" variant="primary" disabled={!dirty || !draft.name.trim()} loading={busy} onClick={() => void save()}>{creating ? 'Create role' : 'Save changes'}</Button>}
            </div>
          </div>

          <fieldset disabled={locked} className="px-6 py-5">
            <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
              <Field label="Role name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Warehouse lead" />
              <TextArea label="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="What this role is for" className="[&_textarea]:min-h-[44px]" rows={1} />
              <div>
                <p className="mb-1.5 text-[13px] font-semibold">Colour</p>
                <div className="flex gap-1.5">
                  {COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setDraft({ ...draft, color: c })} className={cn('flex h-7 w-7 items-center justify-center rounded-full ring-offset-2 transition-all', dot[c], draft.color === c ? 'ring-2 ring-ink' : 'opacity-70 hover:opacity-100')} aria-label={c}>
                      {draft.color === c && <Check size={13} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <p className="text-[13.5px] font-bold">Permissions <span className="ml-1 rounded-full bg-cream px-2 py-0.5 text-[11px] font-bold tabular text-ink-3">{draft.permissions.length} / {ALL_PERMISSIONS.length}</span></p>
              {!locked && (
                <Segmented
                  size="sm"
                  value={draft.permissions.length === ALL_PERMISSIONS.length ? 'all' : draft.permissions.length === 0 ? 'none' : 'custom'}
                  onChange={(v) => setDraft({ ...draft, permissions: v === 'all' ? [...ALL_PERMISSIONS] : v === 'none' ? [] : draft.permissions })}
                  options={[{ value: 'all', label: 'Everything' }, { value: 'none', label: 'Nothing' }, { value: 'custom', label: 'Custom' }]}
                />
              )}
            </div>
            <div className="mt-3 overflow-hidden rounded-2xl border border-line">
              {PERMISSION_GROUPS.map((g) => {
                const keys = g.items.map((i) => i.key);
                const on = keys.filter((k) => draft.permissions.includes(k)).length;
                return (
                  <div key={g.key} className="border-b border-line last:border-b-0">
                    <button type="button" onClick={() => toggleGroup(keys)} className="flex w-full items-center gap-3 bg-cream-2/70 px-4 py-2.5 text-left hover:bg-cream disabled:cursor-default">
                      <span className={cn('flex h-[18px] w-[18px] items-center justify-center rounded-[6px] border transition-colors', on === keys.length ? 'border-ink bg-ink text-white' : on > 0 ? 'border-ink bg-ink text-white' : 'border-ink/30 bg-white')}>
                        {on === keys.length ? <Check size={12} strokeWidth={3.5} /> : on > 0 ? <span className="h-0.5 w-2.5 rounded bg-white" /> : null}
                      </span>
                      <span className="flex-1 text-[13px] font-bold">{g.label}</span>
                      <span className="text-[11px] font-semibold tabular text-ink-3">{on} / {keys.length}</span>
                    </button>
                    <ul className="grid sm:grid-cols-2">
                      {g.items.map((it) => {
                        const checked = draft.permissions.includes(it.key);
                        return (
                          <li key={it.key} className="border-t border-line-2 sm:odd:border-r">
                            <button type="button" onClick={() => toggle(it.key)} className={cn('flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-cream-2 disabled:cursor-default', checked && 'bg-white')}>
                              <span className={cn('mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border transition-colors', checked ? 'border-ink bg-ink text-white' : 'border-ink/30 bg-white')}>{checked && <Check size={12} strokeWidth={3.5} />}</span>
                              <span className="min-w-0">
                                <span className="block text-[13px] font-semibold">{it.label}</span>
                                <span className="block text-[11.5px] leading-snug text-ink-3">{it.description}</span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </fieldset>
        </Card>
      ) : (
        <Skeleton className="h-96 rounded-3xl" />
      )}
      <ConfirmDialog open={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={() => void remove()} loading={busy} danger title={`Delete ${selected?.name}?`} confirmLabel="Delete role" body="Only roles with no members can be deleted. Move members to another role first." />
    </div>
  );
}

function Matrix({ roles }: { roles: RoleRow[] }) {
  return (
    <Card padded={false}>
      <CardHeader className="px-6 pb-0 pt-5" title="Who can do what" subtitle="Every permission against every role. Edit a role on the Roles tab." />
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-[13px]">
          <thead className="bg-cream-2/70">
            <tr>
              <th className="sticky left-0 z-[1] bg-cream-2 px-6 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-3">Permission</th>
              {roles.map((r) => (
                <th key={r.id} className="px-3 py-2.5 text-center">
                  <RoleBadge role={r} />
                  <p className="mt-1 text-[10.5px] font-semibold text-ink-3">{r.members} {r.members === 1 ? 'member' : 'members'}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_GROUPS.map((g) => (
              <Group key={g.key} label={g.label} items={g.items} roles={roles} />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Group({ label, items, roles }: { label: string; items: Array<{ key: Permission; label: string }>; roles: RoleRow[] }) {
  return (
    <>
      <tr className="border-t border-line bg-cream/60"><td colSpan={roles.length + 1} className="px-6 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-3">{label}</td></tr>
      {items.map((it) => (
        <tr key={it.key} className="border-t border-line-2 hover:bg-cream-2/60">
          <td className="sticky left-0 z-[1] bg-white px-6 py-2 font-medium">{it.label}</td>
          {roles.map((r) => (
            <td key={r.id} className="px-3 py-2 text-center">
              {r.permissions.includes(it.key) ? <span className={cn('inline-flex h-5 w-5 items-center justify-center rounded-full', `bg-${ROLE_TONE[r.color] === 'ink' ? 'ink' : 'tint-mint'}`, 'bg-tint-mint text-success')}><Check size={12} strokeWidth={3} /></span> : <span className="inline-flex h-5 w-5 items-center justify-center text-ink-4"><X size={12} /></span>}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export { Users, Shield };

// Copie Zentrix Academy : src/pages/AdminUsersPage.tsx
import { useCallback, useEffect, useState } from "react";
import { useSetPageContext } from "@/hooks/usePageContext";
import { toast } from "sonner";
import { ConfirmDialog, CONFIRM_CLOSED, type ConfirmDialogState } from "@/components/ui/confirm-dialog";
import {
  Crown, Edit2, Loader2, Plus, RefreshCw, Save, School,
  Trash2, UserCheck, UserPlus, Users, X, Shield,
} from "lucide-react";
import {
  apiGetAdminUsers, apiUpdateUserRole, apiDeleteUser, apiAdminCreateUser,
  type AdminUser,
} from "@/lib/api-client";

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  admin:     { label: "Admin",      color: "text-[#FF6B00] bg-[#FF6B00]/10",                                               icon: <Crown    className="h-3 w-3" /> },
  professor: { label: "Professeur", color: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20",             icon: <School   className="h-3 w-3" /> },
  student:   { label: "Étudiant",   color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20", icon: <UserCheck className="h-3 w-3" /> },
};

function RoleBadge({ role }: { role: string }) {
  const c = ROLE_CONFIG[role] ?? ROLE_CONFIG.student;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${c.color}`}>
      {c.icon}{c.label}
    </span>
  );
}

// ── Create user modal ──────────────────────────────────────────────────────────
function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: (u: AdminUser) => void }) {
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "student" });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password.trim()) return;
    setSaving(true); setError(null);
    try {
      const created = await apiAdminCreateUser({ email: form.email, password: form.password, name: form.full_name, role: form.role });
      onCreated(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <h2 className="font-bold text-slate-900 dark:text-white">Créer un utilisateur</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{error}</div>}
          {[
            { field: "email",     label: "Email *",          type: "email",    placeholder: "prenom@example.com" },
            { field: "password",  label: "Mot de passe *",   type: "password", placeholder: "••••••••" },
            { field: "full_name", label: "Nom complet",      type: "text",     placeholder: "Prénom Nom" },
          ].map(({ field, label, type, placeholder }) => (
            <div key={field}>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</label>
              <input
                type={type}
                placeholder={placeholder}
                value={(form as Record<string, string>)[field]}
                onChange={e => setForm({ ...form, [field]: e.target.value })}
                required={field !== "full_name"}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#FF6B00] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          ))}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Rôle</label>
            <select
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#FF6B00] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="student">Étudiant</option>
              <option value="professor">Professeur</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-lg bg-[#FF6B00] px-5 py-2 text-sm font-bold text-white hover:bg-[#e56000] disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const [users,      setUsers]      = useState<AdminUser[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [editingId,  setEditingId]  = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    apiGetAdminUsers()
      .then(setUsers)
      .catch(e => setError(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(CONFIRM_CLOSED);

  const handleRoleChange = async (user: AdminUser, newRole: string) => {
    setUpdatingId(user.id);
    try {
      const updated = await apiUpdateUserRole(user.id, newRole);
      setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, role: updated.role } : u));
      setEditingId(null);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erreur lors du changement de rôle"); }
    finally { setUpdatingId(null); }
  };

  const handleDelete = (user: AdminUser) => {
    setConfirmDialog({
      open: true,
      title: "Supprimer cet utilisateur ?",
      description: `« ${user.email} » sera supprimé définitivement. Cette action est irréversible.`,
      confirmLabel: "Supprimer",
      onConfirm: async () => {
        setConfirmDialog(CONFIRM_CLOSED);
        setDeletingId(user.id);
        try {
          await apiDeleteUser(user.id);
          setUsers(prev => prev.filter(u => u.id !== user.id));
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Erreur lors de la suppression");
          setDeletingId(null);
        }
      },
    });
  };

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole   = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const counts = {
    total:     users.length,
    students:  users.filter(u => u.role === "student").length,
    profs:     users.filter(u => u.role === "professor").length,
    admins:    users.filter(u => u.role === "admin").length,
  };

  useSetPageContext({
    current_page: "admin-users",
    page_title: "Administration — Gestion des utilisateurs",
    page_data: {
      total_users: counts.total,
      students_count: counts.students,
      instructors_count: counts.profs,
      admins_count: counts.admins,
      filtered_count: filtered.length,
      search_query: search || null,
      role_filter: roleFilter,
      users_preview: filtered.slice(0, 15).map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
      })),
    },
  });

  return (
    <div className="min-h-full bg-[#f4f6fb] p-5 dark:bg-slate-950 sm:p-6">

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF6B00]">
            <Shield className="h-3.5 w-3.5" />
            Administration
          </div>
          <h1 className="mt-1 text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
            Gestion des utilisateurs
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {counts.total} inscrits · {counts.students} étudiants · {counts.profs} professeurs · {counts.admins} admins
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:border-[#FF6B00] hover:text-[#FF6B00] dark:border-slate-700 transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition hover:from-[#1D4ED8] hover:to-[#1E3A8A] hover:shadow-blue-500/35"
          >
            <UserPlus className="h-4 w-4" />
            Créer un utilisateur
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total",       value: counts.total,    color: "text-[#FF6B00]",    bg: "bg-[#FF6B00]/10",    icon: <Users className="h-5 w-5 text-[#FF6B00]" /> },
          { label: "Étudiants",   value: counts.students, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20", icon: <UserCheck className="h-5 w-5 text-emerald-500" /> },
          { label: "Professeurs", value: counts.profs,    color: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-50 dark:bg-blue-900/20",       icon: <School className="h-5 w-5 text-blue-500" /> },
          { label: "Admins",      value: counts.admins,   color: "text-[#FF6B00]",    bg: "bg-[#FF6B00]/10",    icon: <Crown className="h-5 w-5 text-[#FF6B00]" /> },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${s.bg}`}>{s.icon}</div>
            <div>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#FF6B00] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
        <div className="flex gap-1.5">
          {[
            { val: "all",       label: "Tous" },
            { val: "student",   label: "Étudiants" },
            { val: "professor", label: "Profs" },
            { val: "admin",     label: "Admins" },
          ].map(({ val, label }) => (
            <button
              key={val}
              onClick={() => setRoleFilter(val)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold border transition-colors ${
                roleFilter === val
                  ? "bg-[#FF6B00] text-white border-[#FF6B00]"
                  : "border-slate-200 text-slate-500 hover:border-[#FF6B00] hover:text-[#FF6B00] dark:border-slate-700 dark:text-slate-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF6B00]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center dark:border-slate-700 dark:bg-slate-900">
          <Users className="h-12 w-12 text-slate-200 dark:text-slate-700" />
          <p className="text-sm text-slate-400">{search || roleFilter !== "all" ? "Aucun utilisateur trouvé." : "Aucun utilisateur."}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60">
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">#</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Utilisateur</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Inscriptions</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Rôle</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(user => (
                  <tr key={user.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 text-xs text-slate-400">{user.id}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{user.name || "—"}</p>
                        <p className="text-xs text-slate-400">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{user.enrollment_count ?? 0} cours</td>
                    <td className="px-4 py-3">
                      {editingId === user.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            defaultValue={user.role}
                            onChange={e => handleRoleChange(user, e.target.value)}
                            disabled={updatingId === user.id}
                            className="rounded-lg border border-[#FF6B00] bg-white px-2 py-1 text-xs font-semibold outline-none dark:bg-slate-800 dark:text-white"
                          >
                            <option value="student">Étudiant</option>
                            <option value="professor">Professeur</option>
                            <option value="admin">Admin</option>
                          </select>
                          {updatingId === user.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FF6B00]" />}
                          <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <RoleBadge role={user.role} />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditingId(editingId === user.id ? null : user.id)}
                          title="Modifier le rôle"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#FF6B00] dark:hover:bg-slate-800"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          disabled={deletingId === user.id}
                          title="Supprimer"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-900/20"
                        >
                          {deletingId === user.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={u => setUsers(prev => [u, ...prev])}
        />
      )}
      <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(CONFIRM_CLOSED)} />
    </div>
  );
}

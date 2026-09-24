import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Power } from 'lucide-react';
import { adminListStaff, adminCreateStaff, adminUpdateStaff, adminSetStaffActive } from '../../services/admin.api';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../services/api';
import { initials, fromNow } from '../../utils/format';

function emptyForm() {
  return { name: '', email: '', password: '', phone: '' };
}

export default function AdminStaffPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const query = useQuery({ queryKey: ['admin', 'staff'], queryFn: adminListStaff });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'staff'] });

  const createMut = useMutation({
    mutationFn: (payload) => adminCreateStaff(payload),
    onSuccess: () => {
      toast.success('Staff account created.');
      setEditorOpen(false);
      invalidate();
    },
    onError: (err) => toast.error(getErrorMessage(err).message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => adminUpdateStaff(id, payload),
    onSuccess: () => {
      toast.success('Staff member updated.');
      setEditorOpen(false);
      invalidate();
    },
    onError: (err) => toast.error(getErrorMessage(err).message),
  });

  const activeMut = useMutation({
    mutationFn: ({ id, isActive }) => adminSetStaffActive(id, isActive),
    onSuccess: (r) => {
      toast.success(`${r.name} ${r.isActive ? 'activated' : 'deactivated'}.`);
      invalidate();
    },
    onError: (err) => toast.error(getErrorMessage(err).message),
  });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setEditorOpen(true);
  };

  const openEdit = (member) => {
    setEditing(member);
    setForm({ name: member.name, email: member.email, password: '', phone: member.phone || '' });
    setEditorOpen(true);
  };

  const submit = () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required.');
      return;
    }
    if (editing) {
      updateMut.mutate({ id: editing.id, payload: { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() } });
    } else {
      if (!form.password) {
        toast.error('A password is required for a new staff account.');
        return;
      }
      createMut.mutate({ name: form.name.trim(), email: form.email.trim(), password: form.password, phone: form.phone.trim() });
    }
  };

  if (query.isLoading) return <LoadingSpinner label="Loading staff…" />;
  if (query.isError) return <ErrorState title="Unable to load staff" onRetry={() => query.refetch()} />;

  return (
    <div className="stack">
      <div className="page-header flex-between">
        <div>
          <h1>Manage staff</h1>
          <p className="page-sub">Front desk and operations team accounts.</p>
        </div>
        <Button onClick={openAdd}>
          <Plus size={14} /> Add staff
        </Button>
      </div>

      {query.data.staff.length === 0 ? (
        <div className="card">
          <EmptyState title="No staff accounts" description="Create reception and operations accounts to get started." />
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Added</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {query.data.staff.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="flex" style={{ gap: 10 }}>
                        <div className="doc-avatar" style={{ width: 34, height: 34, fontSize: 12 }}>
                          {initials(member.name)}
                        </div>
                        <span className="t-primary" style={{ alignSelf: 'center' }}>
                          {member.name}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="t-stack">
                        <span className="t-primary">{member.email}</span>
                        <span className="t-sub">{member.phone || '—'}</span>
                      </div>
                    </td>
                    <td className="muted tiny">{fromNow(member.createdAt) || '—'}</td>
                    <td>{member.isActive ? <StatusBadge status="SCHEDULED" label="Active" /> : <StatusBadge status="CANCELLED" label="Deactivated" />}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex-end" style={{ gap: 6 }}>
                        <Button variant="secondary" size="sm" onClick={() => openEdit(member)}>
                          <Pencil size={12} /> Edit
                        </Button>
                        <Button
                          variant={member.isActive ? 'danger' : 'secondary'}
                          size="sm"
                          onClick={() => activeMut.mutate({ id: member.id, isActive: !member.isActive })}
                          disabled={activeMut.isPending}
                        >
                          <Power size={12} /> {member.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={editorOpen}
        title={editing ? 'Edit staff member' : 'Add staff account'}
        onClose={() => setEditorOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} loading={createMut.isPending || updateMut.isPending}>
              {editing ? 'Save changes' : 'Create account'}
            </Button>
          </>
        }
      >
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="field">
            <label>Full name *</label>
            <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Riya Menon" />
          </div>
          <div className="field">
            <label>Email *</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="reception@mediqueue.com" />
          </div>
          <div className="field">
            <label>Password {editing ? '(leave blank to keep current)' : '*'}</label>
            <input className="input" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Min 8 chars, letters + numbers" />
          </div>
          <div className="field">
            <label>Phone</label>
            <input className="input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+91 98xxx xxxxx" />
          </div>
        </form>
      </Modal>
    </div>
  );
}
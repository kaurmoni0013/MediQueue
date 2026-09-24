import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stethoscope, Plus, Pencil, Power } from 'lucide-react';
import {
  adminListDoctors,
  adminCreateDoctor,
  adminUpdateDoctor,
  adminSetDoctorActive,
} from '../../services/admin.api';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../services/api';
import { initials } from '../../utils/format';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DEFAULT_AVAILABILITY = [
  { day: 1, ranges: [{ start: '09:00', end: '13:00' }] },
  { day: 2, ranges: [{ start: '09:00', end: '13:00' }] },
  { day: 3, ranges: [{ start: '09:00', end: '13:00' }] },
  { day: 4, ranges: [{ start: '09:00', end: '13:00' }] },
  { day: 5, ranges: [{ start: '09:00', end: '13:00' }] },
  { day: 6, ranges: [{ start: '09:00', end: '13:00' }] },
];

function formatAvailability(days) {
  const entries = (days || []).map((d) => ({ ...d, checked: true }));
  for (const day of DAY_NAMES.map((_, i) => i)) {
    if (!entries.some((e) => e.day === day)) entries.push({ day, ranges: [], checked: false });
  }
  return entries.sort((a, b) => a.day - b.day);
}

function emptyForm() {
  return {
    name: '',
    email: '',
    password: '',
    phone: '',
    specialization: '',
    qualification: '',
    experienceYears: '',
    consultationDuration: 15,
    fees: '',
    bio: '',
    availability: formatAvailability(DEFAULT_AVAILABILITY),
  };
}

export default function AdminDoctorsPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const query = useQuery({ queryKey: ['admin', 'doctors'], queryFn: adminListDoctors });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'doctors'] });

  const createMut = useMutation({
    mutationFn: (payload) => adminCreateDoctor(payload),
    onSuccess: () => {
      toast.success('Doctor added to the roster.');
      setEditorOpen(false);
      invalidate();
    },
    onError: (err) => toast.error(getErrorMessage(err).message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => adminUpdateDoctor(id, payload),
    onSuccess: () => {
      toast.success('Doctor updated.');
      setEditorOpen(false);
      invalidate();
    },
    onError: (err) => toast.error(getErrorMessage(err).message),
  });

  const activeMut = useMutation({
    mutationFn: ({ id, isActive }) => adminSetDoctorActive(id, isActive),
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

  const openEdit = (doc) => {
    setEditing(doc);
    setForm({
      name: doc.name,
      email: doc.email,
      password: '',
      phone: doc.phone || '',
      specialization: doc.specialization,
      qualification: doc.qualification || '',
      experienceYears: String(doc.experienceYears),
      consultationDuration: doc.consultationDuration,
      fees: String(doc.fees || ''),
      bio: doc.bio || '',
      availability: formatAvailability(doc.availability),
    });
    setEditorOpen(true);
  };

  const daysAvailable = form.availability.filter((a) => a.checked);

  const submit = () => {
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      specialization: form.specialization.trim(),
      qualification: form.qualification.trim(),
      experienceYears: Number(form.experienceYears) || 0,
      consultationDuration: Number(form.consultationDuration) || 15,
      fees: Number(form.fees) || 0,
      bio: form.bio.trim(),
      availability: daysAvailable.map((a) => ({ day: a.day, ranges: a.ranges.filter((r) => r.start && r.end) })),
    };
    if (!payload.name || !payload.email || !payload.specialization) {
      toast.error('Name, email and specialization are required.');
      return;
    }
    if (editing) {
      updateMut.mutate({ id: editing.id, payload });
    } else {
      if (!form.password) {
        toast.error('A password is required for a new doctor account.');
        return;
      }
      createMut.mutate({ ...payload, password: form.password });
    }
  };

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const toggleDay = (idx) =>
    setForm((f) => ({ ...f, availability: f.availability.map((a, i) => (i === idx ? { ...a, checked: !a.checked } : a)) }));
  const ensureRange = (idx, prefix) =>
    setForm((f) => ({
      ...f,
      availability: f.availability.map((a, i) =>
        i === idx && a.ranges.length === 0 ? { ...a, ranges: [DEFAULT_AVAILABILITY.find((d) => d.day === a.day).ranges[0]] } : a
      ),
    }));
  const setRangeStart = (idx, value) => {
    ensureRange(idx);
    setForm((f) => ({
      ...f,
      availability: f.availability.map((a, i) =>
        i === idx ? { ...a, ranges: [{ ...a.ranges[0], start: value }] } : a
      ),
    }));
  };
  const setRangeEnd = (idx, value) => {
    ensureRange(idx);
    setForm((f) => ({
      ...f,
      availability: f.availability.map((a, i) =>
        i === idx ? { ...a, ranges: [{ ...a.ranges[0], end: value }] } : a
      ),
    }));
  };

  if (query.isLoading) return <LoadingSpinner label="Loading doctors…" />;
  if (query.isError) return <ErrorState title="Unable to load doctors" onRetry={() => query.refetch()} />;

  return (
    <div className="stack">
      <div className="page-header flex-between">
        <div>
          <h1>Manage doctors</h1>
          <p className="page-sub">Add new doctors or update their practice details and schedules.</p>
        </div>
        <Button onClick={openAdd}>
          <Plus size={14} /> Add doctor
        </Button>
      </div>

      {query.data.doctors.length === 0 ? (
        <div className="card">
          <EmptyState title="No doctors yet" description="Add your first doctor to start building the roster." />
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Specialization</th>
                  <th>Experience</th>
                  <th>Fees</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {query.data.doctors.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <div className="flex" style={{ gap: 10 }}>
                        <div className="doc-avatar" style={{ width: 34, height: 34, fontSize: 12 }}>
                          {initials(doc.name)}
                        </div>
                        <div className="t-stack">
                          <span className="t-primary">{doc.name}</span>
                          <span className="t-sub">{doc.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="t-primary">{doc.specialization}</td>
                    <td className="num">{doc.experienceYears || 0} yrs</td>
                    <td className="num">{doc.fees ? `₹${doc.fees}` : '—'}</td>
                    <td>
                      {doc.isActive ? (
                        <StatusBadge status="SCHEDULED" label="Active" />
                      ) : (
                        <button className="badge" style={{ background: 'var(--cancelled-bg)', color: 'var(--cancelled-text)', border: 'none', cursor: 'pointer' }} title="Click to activate">
                          Deactivated
                        </button>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex-end" style={{ gap: 6 }}>
                        <Button variant="secondary" size="sm" onClick={() => openEdit(doc)}>
                          <Pencil size={12} /> Edit
                        </Button>
                        <Button
                          variant={doc.isActive ? 'danger' : 'secondary'}
                          size="sm"
                          onClick={() => activeMut.mutate({ id: doc.id, isActive: !doc.isActive })}
                          disabled={activeMut.isPending}
                        >
                          <Power size={12} /> {doc.isActive ? 'Deactivate' : 'Activate'}
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
        title={editing ? 'Edit doctor' : 'Add doctor'}
        onClose={() => setEditorOpen(false)}
        width="680px"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} loading={createMut.isPending || updateMut.isPending}>
              {editing ? 'Save changes' : 'Add doctor'}
            </Button>
          </>
        }
      >
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="form-row">
            <div className="field">
              <label>Full name *</label>
              <input className="input" value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Dr. Priya Nair" />
            </div>
            <div className="field">
              <label>Specialization *</label>
              <input className="input" value={form.specialization} onChange={(e) => setField('specialization', e.target.value)} placeholder="Cardiology" />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>Email *</label>
              <input className="input" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="doctor@mediqueue.com" />
            </div>
            <div className="field">
              <label>Password {editing ? '(leave blank to keep current)' : '*'}</label>
              <input className="input" type="password" value={form.password} onChange={(e) => setField('password', e.target.value)} placeholder="Min 8 chars, letters + numbers" />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>Phone</label>
              <input className="input" value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="+91 98xxx xxxxx" />
            </div>
            <div className="field">
              <label>Qualification</label>
              <input className="input" value={form.qualification} onChange={(e) => setField('qualification', e.target.value)} placeholder="MBBS, MD" />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>Experience (years)</label>
              <input className="input" type="number" min="0" value={form.experienceYears} onChange={(e) => setField('experienceYears', e.target.value)} />
            </div>
            <div className="field">
              <label>Consultation fee (₹)</label>
              <input className="input" type="number" min="0" value={form.fees} onChange={(e) => setField('fees', e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Consultation duration (minutes)</label>
            <input className="input" type="number" min="5" step="5" value={form.consultationDuration} onChange={(e) => setField('consultationDuration', e.target.value)} />
          </div>
          <div className="field">
            <label>Bio</label>
            <textarea className="textarea" value={form.bio} onChange={(e) => setField('bio', e.target.value)} placeholder="Short clinical profile shown to patients (max 500 chars)" maxLength="500" />
          </div>

          <div className="field">
            <label>Working days &amp; hours</label>
            <div className="card" style={{ padding: 14, background: 'var(--surface-subtle)' }}>
              {form.availability.map((a, i) => (
                <div key={a.day} className="flex-between" style={{ gap: 12, padding: '6px 0', borderBottom: i < form.availability.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <label className="flex" style={{ gap: 8, alignItems: 'center', flexShrink: 0, width: 130 }}>
                    <input type="checkbox" checked={a.checked} onChange={() => toggleDay(i)} />
                    <span style={{ fontSize: 13 }}>{DAY_NAMES[a.day]}</span>
                  </label>
                  {a.checked ? (
                    <div className="flex" style={{ gap: 8, flexWrap: 'wrap' }}>
                      <span className="muted tiny" style={{ alignSelf: 'center' }}>
                        From
                      </span>
                      <input type="time" className="input" style={{ width: 110, padding: '5px 8px' }} value={a.ranges[0]?.start || '09:00'} onChange={(e) => setRangeStart(i, e.target.value)} />
                      <span className="muted tiny" style={{ alignSelf: 'center' }}>
                        to
                      </span>
                      <input type="time" className="input" style={{ width: 110, padding: '5px 8px' }} value={a.ranges[0]?.end || '17:00'} onChange={(e) => setRangeEnd(i, e.target.value)} />
                    </div>
                  ) : null}
                </div>
              ))}
              <div className="field-hint mt-2">Time range applies to all working days. Set convenience hours per specialty.</div>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
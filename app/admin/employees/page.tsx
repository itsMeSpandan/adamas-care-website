"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BRAND } from "@/lib/brand";

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  bio: string;
  imageUrl: string;
  yearsExperience: number;
  instagramHandle?: string;
  serviceIds: string[];
  rating: number;
  reviewCount: number;
}

interface Service {
  id: string;
  name: string;
  category: string;
}

const emptyForm = {
  name: "",
  email: "",
  role: "",
  bio: "",
  imageUrl: "",
  yearsExperience: 0,
  instagramHandle: "",
  serviceIds: [] as string[],
};

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [generatedEmail, setGeneratedEmail] = useState<string | null>(null);

  const fetchData = () => {
    Promise.all([
      fetch("/api/employees").then((r) => r.json()),
      fetch("/api/services").then((r) => r.json()),
    ]).then(([e, s]) => {
      setEmployees(e);
      setServices(s);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setGeneratedEmail(null);
    setModalOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setForm({
      name: emp.name,
      email: emp.email || "",
      role: emp.role,
      bio: emp.bio,
      imageUrl: emp.imageUrl,
      yearsExperience: emp.yearsExperience,
      instagramHandle: emp.instagramHandle || "",
      serviceIds: emp.serviceIds,
    });
    setGeneratedEmail(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setGeneratedEmail(null);
    try {
      if (editingId) {
        await fetch(`/api/employees/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        const res = await fetch("/api/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (data.email) {
          setGeneratedEmail(data.email);
        }
      }
      setModalOpen(false);
      fetchData();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDeleteConfirm(null);
      fetchData();
    }
  };

  const toggleService = (svcId: string) => {
    setForm((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(svcId)
        ? prev.serviceIds.filter((id) => id !== svcId)
        : [...prev.serviceIds, svcId],
    }));
  };

  // Email is now fetched from the Employee record in the database
  const displayEmail = form.email || "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-beige-700">Employees</h1>
          <p className="mt-1 text-beige-600">Manage your team members</p>
        </div>
        <button onClick={openAdd} className="btn-primary text-sm">
          <span className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" /></svg>
            Add Employee
          </span>
        </button>
      </div>

      {/* Generated email notification */}
      <AnimatePresence>
        {generatedEmail && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-card border border-emerald-200 bg-emerald-50 px-6 py-4"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-700">Employee created successfully!</p>
                <p className="mt-1 text-sm text-emerald-600">
                  Auto-generated email: <span className="font-mono font-semibold">{generatedEmail}</span>
                </p>
              </div>
              <button onClick={() => setGeneratedEmail(null)} className="ml-auto text-emerald-400 hover:text-emerald-600">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Employees grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-beige-300 border-t-beige-600" />
        </div>
      ) : employees.length === 0 ? (
        <div className="rounded-card border border-beige-200 bg-white p-12 text-center shadow-card">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-beige-100">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-beige-400">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" x2="19" y1="8" y2="14" /><line x1="22" x2="16" y1="11" y2="11" />
            </svg>
          </div>
          <h3 className="font-serif text-lg font-semibold text-beige-700">No employees yet</h3>
          <p className="mt-1 text-sm text-beige-500">Add your first team member to get started.</p>
          <button onClick={openAdd} className="btn-primary mt-4 text-sm">Add Employee</button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="group rounded-card border border-beige-200 bg-white p-5 shadow-card transition-all hover:shadow-card-hover"
            >
              <div className="flex items-start gap-4">
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border-2 border-beige-200">
                  <img src={emp.imageUrl} alt={emp.name} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-serif text-lg font-semibold text-beige-700">{emp.name}</h3>
                      <p className="text-sm text-beige-500">{emp.role}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => openEdit(emp)}
                        className="rounded-lg p-1.5 text-beige-400 transition-colors hover:bg-beige-50 hover:text-beige-600"
                        aria-label="Edit employee"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(emp.id)}
                        className="rounded-lg p-1.5 text-beige-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        aria-label="Delete employee"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {emp.bio && (
                <p className="mt-3 text-sm text-beige-600 line-clamp-2">{emp.bio}</p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-beige-100 pt-3 text-xs text-beige-500">
                <span>{emp.yearsExperience} yrs exp</span>
                {emp.instagramHandle && (
                  <span className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                    </svg>
                    {emp.instagramHandle}
                  </span>
                )}
                {emp.serviceIds.length > 0 && (
                  <span>{emp.serviceIds.length} service{emp.serviceIds.length !== 1 ? "s" : ""}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-beige-900/40 p-4 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm overflow-hidden rounded-card border border-beige-200 bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-serif text-lg font-semibold text-beige-700">Delete Employee?</h3>
              <p className="mt-2 text-sm text-beige-600">This action cannot be undone. The employee record will be permanently removed.</p>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="btn-outline text-sm">Cancel</button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="inline-flex items-center justify-center rounded-xl bg-red-600 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-beige-900/40 p-4 pt-12 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg overflow-hidden rounded-card border border-beige-200 bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-beige-100 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-xl font-semibold text-beige-700">
                    {editingId ? "Edit Employee" : "Add New Employee"}
                  </h2>
                  <button onClick={() => setModalOpen(false)} className="text-beige-400 hover:text-beige-600">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-beige-700">Full Name *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Sarah Johnson"
                      className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-beige-700">Email *</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder={`employee@${BRAND.domain}`}
                      className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                    />
                    {displayEmail && !editingId && (
                      <p className="mt-1.5 text-xs text-beige-500">
                        Employee email: <span className="font-mono font-medium text-beige-700">{displayEmail}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-beige-700">Role *</label>
                    <input
                      type="text"
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      placeholder="e.g. Senior Stylist"
                      className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-beige-700">Bio</label>
                    <textarea
                      value={form.bio}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                      placeholder="Tell us about this team member..."
                      rows={3}
                      className="w-full resize-none rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-beige-700">Years Experience</label>
                      <input
                        type="number"
                        min={0}
                        value={form.yearsExperience}
                        onChange={(e) => setForm({ ...form, yearsExperience: Number(e.target.value) })}
                        className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-beige-700">Instagram Handle</label>
                      <input
                        type="text"
                        value={form.instagramHandle}
                        onChange={(e) => setForm({ ...form, instagramHandle: e.target.value })}
                        placeholder="@handle"
                        className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-beige-700">Image URL</label>
                    <input
                      type="url"
                      value={form.imageUrl}
                      onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                      placeholder="https://... (optional, auto-generated from name)"
                      className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                    />
                  </div>

                  {services.length > 0 && (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-beige-700">Assign Services</label>
                      <div className="flex flex-wrap gap-2">
                        {services.map((svc) => (
                          <button
                            key={svc.id}
                            type="button"
                            onClick={() => toggleService(svc.id)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                              form.serviceIds.includes(svc.id)
                                ? "border-beige-600 bg-beige-600 text-white"
                                : "border-beige-300 bg-white text-beige-600 hover:border-beige-400"
                            }`}
                          >
                            {svc.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-beige-100 px-6 py-4 flex justify-end gap-3">
                <button onClick={() => setModalOpen(false)} className="btn-outline text-sm">Cancel</button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name || !form.role}
                  className="btn-primary text-sm"
                >
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Create Employee"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

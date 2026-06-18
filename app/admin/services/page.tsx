"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice, formatDuration } from "@/lib/utils";

interface Service {
  id: string;
  name: string;
  category: string;
  description: string;
  longDescription: string;
  durationMinutes: number;
  price: number;
  imageUrl: string;
  featured: boolean;
  employeeIds: string[];
}

interface Employee {
  id: string;
  name: string;
  role: string;
}

const categories = ["Hair", "Skin", "Nails", "Body", "Bridal"];

const categoryColors: Record<string, string> = {
  Hair: "bg-amber-100 text-amber-800",
  Skin: "bg-rose-100 text-rose-800",
  Nails: "bg-pink-100 text-pink-800",
  Body: "bg-emerald-100 text-emerald-800",
  Bridal: "bg-purple-100 text-purple-800",
};

const emptyForm = {
  name: "",
  category: "Hair",
  description: "",
  longDescription: "",
  durationMinutes: 60,
  price: 0,
  imageUrl: "",
  featured: false,
  employeeIds: [] as string[],
};

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchData = () => {
    Promise.all([
      fetch("/api/services").then((r) => r.json()),
      fetch("/api/employees").then((r) => r.json()),
    ]).then(([s, e]) => {
      setServices(s);
      setEmployees(e);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (svc: Service) => {
    setEditingId(svc.id);
    setForm({
      name: svc.name,
      category: svc.category,
      description: svc.description,
      longDescription: svc.longDescription,
      durationMinutes: svc.durationMinutes,
      price: svc.price,
      imageUrl: svc.imageUrl,
      featured: svc.featured,
      employeeIds: svc.employeeIds,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let res: Response;
      if (editingId) {
        res = await fetch(`/api/services/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        res = await fetch("/api/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      if (res.ok) {
        setModalOpen(false);
        fetchData();
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDeleteConfirm(null);
      fetchData();
    }
  };

  const toggleEmployee = (empId: string) => {
    setForm((prev) => ({
      ...prev,
      employeeIds: prev.employeeIds.includes(empId)
        ? prev.employeeIds.filter((id) => id !== empId)
        : [...prev.employeeIds, empId],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-beige-700">Services</h1>
          <p className="mt-1 text-beige-600">Manage your service catalog</p>
        </div>
        <button onClick={openAdd} className="btn-primary text-sm">
          <span className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" /></svg>
            Add Service
          </span>
        </button>
      </div>

      {/* Services grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-beige-300 border-t-beige-600" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.id}
              className="group rounded-card border border-beige-200 bg-white p-5 shadow-card transition-all hover:shadow-card-hover"
            >
              <div className="mb-3 flex items-start justify-between">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryColors[service.category] ?? ""}`}>
                  {service.category}
                </span>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => openEdit(service)}
                    className="rounded-lg p-1.5 text-beige-400 transition-colors hover:bg-beige-50 hover:text-beige-600"
                    aria-label="Edit service"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(service.id)}
                    className="rounded-lg p-1.5 text-beige-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    aria-label="Delete service"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
              <h3 className="font-serif text-lg font-semibold text-beige-700">{service.name}</h3>
              <p className="mt-1 text-sm text-beige-600 line-clamp-2">{service.description}</p>
              <div className="mt-4 flex items-center justify-between border-t border-beige-100 pt-3">
                <div className="flex items-center gap-3 text-sm text-beige-600">
                  <span className="font-semibold">{formatPrice(service.price)}</span>
                  <span className="text-beige-300">&middot;</span>
                  <span>{formatDuration(service.durationMinutes)}</span>
                </div>
                <span className="text-xs text-beige-400">
                  {service.employeeIds.length} specialist{service.employeeIds.length !== 1 ? "s" : ""}
                </span>
              </div>
              {service.featured && (
                <div className="mt-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-beige-100 px-2 py-0.5 text-[10px] font-medium text-beige-600">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                    Featured
                  </span>
                </div>
              )}
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
              <h3 className="font-serif text-lg font-semibold text-beige-700">Delete Service?</h3>
              <p className="mt-2 text-sm text-beige-600">This action cannot be undone. The service will be permanently removed.</p>
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
                    {editingId ? "Edit Service" : "Add New Service"}
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
                    <label className="mb-1 block text-sm font-medium text-beige-700">Name *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Luxury Hair Treatment"
                      className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-beige-700">Category *</label>
                      <select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                      >
                        {categories.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-beige-700">Price (₹) *</label>
                      <input
                        type="number"
                        min={0}
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                        className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-beige-700">Duration (min) *</label>
                      <input
                        type="number"
                        min={15}
                        step={15}
                        value={form.durationMinutes}
                        onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                        className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-3 rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-700">
                        <input
                          type="checkbox"
                          checked={form.featured}
                          onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                          className="h-4 w-4 rounded border-beige-300 text-beige-600 focus:ring-beige-200"
                        />
                        Featured on homepage
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-beige-700">Short Description *</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Brief description for cards"
                      rows={2}
                      className="w-full resize-none rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-beige-700">Full Description</label>
                    <textarea
                      value={form.longDescription}
                      onChange={(e) => setForm({ ...form, longDescription: e.target.value })}
                      placeholder="Detailed description for service page"
                      rows={3}
                      className="w-full resize-none rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-beige-700">Image URL</label>
                    <input
                      type="url"
                      value={form.imageUrl}
                      onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                      placeholder="https://... (optional)"
                      className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                    />
                  </div>

                  {employees.length > 0 && (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-beige-700">Assign Specialists</label>
                      <div className="flex flex-wrap gap-2">
                        {employees.map((emp) => (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => toggleEmployee(emp.id)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                              form.employeeIds.includes(emp.id)
                                ? "border-beige-600 bg-beige-600 text-white"
                                : "border-beige-300 bg-white text-beige-600 hover:border-beige-400"
                            }`}
                          >
                            {emp.name}
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
                  disabled={saving || !form.name || !form.description || form.price <= 0}
                  className="btn-primary text-sm"
                >
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Create Service"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

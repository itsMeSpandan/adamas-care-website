"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useToast } from "@/components/ui/Toast";

interface Holiday {
  id: string;
  name: string;
  date: string;
  type: string;
  isRecurring: boolean;
  createdBy?: string | null;
  createdAt?: string;
}

const typeLabels: Record<string, { label: string; color: string }> = {
  public: { label: "Public", color: "bg-blue-100 text-blue-700 border-blue-200" },
  festive: { label: "Festive", color: "bg-purple-100 text-purple-700 border-purple-200" },
  custom: { label: "Custom", color: "bg-amber-100 text-amber-700 border-amber-200" },
};

export default function AdminHolidaysPage() {
  const { showToast } = useToast();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", date: "", type: "custom" });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  const fetchHolidays = () => {
    fetch("/api/admin/holidays")
      .then((r) => r.json())
      .then((data) => {
        setHolidays(data.holidays || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch(`/api/admin/holidays?action=seed&year=${filterYear}`, { method: "PUT" });
      const data = await res.json();
      showToast(data.message || "Holidays seeded", "success");
      fetchHolidays();
    } catch {
      showToast("Failed to seed holidays", "error");
    } finally {
      setSeeding(false);
    }
  };

  const handleAdd = async () => {
    if (!form.name || !form.date) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || "Failed to add holiday", "error");
        return;
      }
      showToast("Holiday added!", "success");
      setModalOpen(false);
      setForm({ name: "", date: "", type: "custom" });
      fetchHolidays();
    } catch {
      showToast("Failed to add holiday", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/admin/holidays?id=${id}`, { method: "DELETE" });
      showToast("Holiday deleted", "success");
      setDeleteConfirm(null);
      fetchHolidays();
    } catch {
      showToast("Failed to delete holiday", "error");
    }
  };

  const filteredHolidays = holidays.filter((h) => {
    const hYear = new Date(h.date).getFullYear();
    return hYear === filterYear;
  });

  const groupedByMonth = filteredHolidays.reduce<Record<string, Holiday[]>>((acc, h) => {
    const month = format(new Date(h.date), "MMMM yyyy");
    if (!acc[month]) acc[month] = [];
    acc[month].push(h);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-beige-700">Holidays</h1>
          <p className="mt-1 text-beige-600">Manage public, festive, and custom holidays</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
            className="rounded-xl border border-beige-300 bg-white px-3 py-2 text-sm text-beige-700 focus:border-beige-500 focus:outline-none"
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
          </select>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="btn-outline text-sm"
          >
            {seeding ? "Seeding..." : `Seed ${filterYear} Holidays`}
          </button>
          <button onClick={() => setModalOpen(true)} className="btn-primary text-sm">
            <span className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" /></svg>
              Add Holiday
            </span>
          </button>
        </div>
      </div>

      {/* Holiday legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(typeLabels).map(([key, { label, color }]) => (
          <span key={key} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${color}`}>
            {label}
          </span>
        ))}
      </div>

      {/* Holidays list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-beige-300 border-t-beige-600" />
        </div>
      ) : filteredHolidays.length === 0 ? (
        <div className="rounded-card border border-beige-200 bg-white p-12 text-center shadow-card">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-beige-100">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-beige-400">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
            </svg>
          </div>
          <h3 className="font-serif text-lg font-semibold text-beige-700">No holidays for {filterYear}</h3>
          <p className="mt-1 text-sm text-beige-500">Click &quot;Seed {filterYear} Holidays&quot; to add Indian public and festive holidays.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedByMonth).map(([month, monthHolidays]) => (
            <div key={month}>
              <h2 className="mb-3 font-serif text-lg font-semibold text-beige-700">{month}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {monthHolidays.map((h) => {
                  const typeInfo = typeLabels[h.type] || typeLabels.custom;
                  return (
                    <div key={h.id} className="group rounded-card border border-beige-200 bg-white p-4 shadow-card transition-all hover:shadow-card-hover">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-beige-700">{h.name}</p>
                          <p className="mt-0.5 text-sm text-beige-500">{format(new Date(h.date), "EEEE, MMMM d")}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => setDeleteConfirm(h.id)}
                            className="rounded-lg p-1.5 text-beige-400 transition-colors hover:bg-red-50 hover:text-red-500"
                            aria-label="Delete holiday"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                        {h.isRecurring && (
                          <span className="inline-flex rounded-full border border-beige-200 bg-beige-50 px-2 py-0.5 text-xs font-medium text-beige-500">
                            Recurring
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
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
              <h3 className="font-serif text-lg font-semibold text-beige-700">Delete Holiday?</h3>
              <p className="mt-2 text-sm text-beige-600">This holiday will be removed from the calendar.</p>
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

      {/* Add Holiday Modal */}
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
              className="w-full max-w-md overflow-hidden rounded-card border border-beige-200 bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-beige-100 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-xl font-semibold text-beige-700">Add Custom Holiday</h2>
                  <button onClick={() => setModalOpen(false)} className="text-beige-400 hover:text-beige-600">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-beige-700">Holiday Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Studio Anniversary"
                    className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-beige-700">Date *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-beige-700">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                  >
                    <option value="custom">Custom</option>
                    <option value="public">Public</option>
                    <option value="festive">Festive</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-beige-100 px-6 py-4 flex justify-end gap-3">
                <button onClick={() => setModalOpen(false)} className="btn-outline text-sm">Cancel</button>
                <button
                  onClick={handleAdd}
                  disabled={saving || !form.name || !form.date}
                  className="btn-primary text-sm"
                >
                  {saving ? "Adding..." : "Add Holiday"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

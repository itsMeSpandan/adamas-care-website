"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Upload, X } from "lucide-react";
import { formatPrice, formatDuration } from "@/lib/utils";
import { AUDIENCE_LABELS, SERVICE_AUDIENCES } from "@/lib/service-audience";
import { SERVICE_CATEGORIES } from "@/lib/types";
import type { ServiceAudience } from "@/lib/types";
import { checkPickedFile, resizeImageToDataUrl } from "@/lib/image-field";

const DEFAULT_SERVICE_IMAGE = "/images/service-illustration.jpg";

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
  audience: ServiceAudience;
  employeeIds: string[];
  groupKey?: string | null;
  groupName?: string | null;
  variantLabel?: string | null;
  groupType?: string;
  isActive?: boolean;
}

interface Employee {
  id: string;
  name: string;
  role: string;
}

const categories = SERVICE_CATEGORIES;

const categoryColors: Record<string, string> = {
  "Classic Combos": "bg-indigo-100 text-indigo-800",
  "Fab Facials": "bg-rose-100 text-rose-800",
  "Grooming Him": "bg-sky-100 text-sky-800",
  "Styling Her": "bg-fuchsia-100 text-fuchsia-800",
  Bleach: "bg-yellow-100 text-yellow-800",
  Waxing: "bg-violet-100 text-violet-800",
  Threading: "bg-teal-100 text-teal-800",
  "Hands & Feet": "bg-orange-100 text-orange-800",
  "Relaxing Spa": "bg-emerald-100 text-emerald-800",
  "Mini Massage": "bg-amber-100 text-amber-800",
};

const emptyForm = {
  name: "",
  category: "Relaxing Spa" as string,
  description: "",
  longDescription: "",
  durationMinutes: 60,
  price: 0,
  imageUrl: DEFAULT_SERVICE_IMAGE,
  featured: false,
  audience: "unisex" as ServiceAudience,
  employeeIds: [] as string[],
  groupKey: "",
  groupName: "",
  variantLabel: "",
  groupType: "duration",
  isActive: true,
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "hidden">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (photoInputRef.current) photoInputRef.current.value = "";
    if (!file) return;

    const problem = checkPickedFile(file);
    if (problem) {
      setPhotoError(problem);
      return;
    }

    setPhotoError(null);
    setProcessingPhoto(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file, { maxEdge: 800, quality: 0.85 });
      setForm((prev) => ({ ...prev, imageUrl: dataUrl }));
    } catch {
      setPhotoError("That image could not be read. Try a different file.");
    } finally {
      setProcessingPhoto(false);
    }
  };

  const fetchData = () => {
    Promise.all([
      fetch("/api/services?includeInactive=true").then((r) => r.json()),
      fetch("/api/employees").then((r) => r.json()),
    ])
      .then(([s, e]) => {
        setServices(Array.isArray(s) ? s : []);
        setEmployees(Array.isArray(e) ? e : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const existingGroupNames = useMemo(() => {
    const names = new Set<string>();
    for (const s of services) {
      if (s.groupName) names.add(s.groupName);
    }
    return Array.from(names).sort();
  }, [services]);

  const activeCount = useMemo(() => services.filter((s) => s.isActive !== false).length, [services]);
  const hiddenCount = useMemo(() => services.filter((s) => s.isActive === false).length, [services]);

  const displayedServices = useMemo(() => {
    return services.filter((s) => {
      if (statusFilter === "active") return s.isActive !== false;
      if (statusFilter === "hidden") return s.isActive === false;
      return true;
    });
  }, [services, statusFilter]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setPhotoError(null);
    setFormError(null);
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
      imageUrl: svc.imageUrl || DEFAULT_SERVICE_IMAGE,
      featured: svc.featured,
      audience: svc.audience ?? "unisex",
      employeeIds: svc.employeeIds || [],
      groupKey: svc.groupKey || "",
      groupName: svc.groupName || "",
      variantLabel: svc.variantLabel || "",
      groupType: svc.groupType || "duration",
      isActive: svc.isActive !== false,
    });
    setPhotoError(null);
    setFormError(null);
    setModalOpen(true);
  };

  const handleToggleActive = async (svc: Service) => {
    const newActiveState = svc.isActive === false;
    try {
      const res = await fetch(`/api/services/${svc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newActiveState }),
      });
      if (res.ok) {
        setServices((prev) =>
          prev.map((s) => (s.id === svc.id ? { ...s, isActive: newActiveState } : s))
        );
      }
    } catch {
      // ignore
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError(null);

    // Client-side group validation
    const derivedGroupKey = form.groupName.trim() ? slugify(form.groupName) : "";
    if (derivedGroupKey) {
      const sameGroupVariants = services.filter(
        (s) => (s.groupKey === derivedGroupKey || (s.groupName && slugify(s.groupName) === derivedGroupKey)) && s.id !== editingId
      );

      if (sameGroupVariants.length > 0) {
        // 1. Must share category
        if (sameGroupVariants.some((s) => s.category !== form.category)) {
          setFormError(
            `All variants in group "${form.groupName}" must belong to category "${sameGroupVariants[0].category}"`
          );
          setSaving(false);
          return;
        }

        // 2. If duration group, no duplicate durationMinutes
        if (form.groupType === "duration") {
          if (sameGroupVariants.some((s) => s.durationMinutes === form.durationMinutes)) {
            setFormError(
              `A variant with duration ${form.durationMinutes} min already exists in group "${form.groupName}"`
            );
            setSaving(false);
            return;
          }
        }
      }
    }

    const payload = {
      ...form,
      imageUrl: form.imageUrl?.trim() || DEFAULT_SERVICE_IMAGE,
      groupKey: derivedGroupKey || null,
      groupName: form.groupName.trim() || null,
      variantLabel: form.variantLabel.trim() || null,
    };

    try {
      let res: Response;
      if (editingId) {
        res = await fetch(`/api/services/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setModalOpen(false);
        fetchData();
      } else {
        const data = await res.json();
        setFormError(data.error || "Failed to save service");
      }
    } catch {
      setFormError("Network error while saving service");
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
          <p className="mt-1 text-beige-600">Manage your treatment catalog, duration variants & visibility</p>
        </div>
        <button onClick={openAdd} className="btn-primary text-sm">
          <span className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" /></svg>
            Add Service
          </span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-beige-200 pb-3">
        <button
          onClick={() => setStatusFilter("all")}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
            statusFilter === "all"
              ? "bg-beige-600 text-white"
              : "border border-beige-300 bg-white text-beige-700 hover:bg-beige-100"
          }`}
        >
          All ({services.length})
        </button>
        <button
          onClick={() => setStatusFilter("active")}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
            statusFilter === "active"
              ? "bg-beige-600 text-white"
              : "border border-beige-300 bg-white text-beige-700 hover:bg-beige-100"
          }`}
        >
          Active ({activeCount})
        </button>
        <button
          onClick={() => setStatusFilter("hidden")}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
            statusFilter === "hidden"
              ? "bg-beige-600 text-white"
              : "border border-beige-300 bg-white text-beige-700 hover:bg-beige-100"
          }`}
        >
          Hidden ({hiddenCount})
        </button>
      </div>

      {/* Services grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-beige-300 border-t-beige-600" />
        </div>
      ) : displayedServices.length === 0 ? (
        <div className="rounded-card border border-beige-200 bg-white p-8 text-center text-sm text-beige-600">
          No services found in this view.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayedServices.map((service) => {
            const isInactive = service.isActive === false;
            return (
              <div
                key={service.id}
                className={`group rounded-card border p-5 shadow-card transition-all hover:shadow-card-hover ${
                  isInactive ? "border-dashed border-beige-300 bg-beige-50/60 opacity-80" : "border-beige-200 bg-white"
                }`}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryColors[service.category] ?? ""}`}>
                      {service.category}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        service.audience === "unisex"
                          ? "bg-beige-100 text-beige-600"
                          : "bg-sage-50 text-sage-600"
                      }`}
                    >
                      {AUDIENCE_LABELS[service.audience] ?? AUDIENCE_LABELS.unisex}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        isInactive
                          ? "bg-stone-200 text-stone-700"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {isInactive ? "Hidden" : "Active"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => handleToggleActive(service)}
                      className="rounded-lg p-1.5 text-beige-400 transition-colors hover:bg-beige-100 hover:text-beige-700"
                      title={isInactive ? "Activate service" : "Hide service"}
                      aria-label={isInactive ? "Activate service" : "Hide service"}
                    >
                      {isInactive ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" /></svg>
                      )}
                    </button>
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

                {service.groupName && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-beige-500">
                    <span className="rounded bg-beige-100 px-1.5 py-0.5 font-medium text-beige-700">
                      Group: {service.groupName}
                    </span>
                    {service.variantLabel && (
                      <span className="text-beige-400">({service.variantLabel})</span>
                    )}
                  </div>
                )}

                <p className="mt-1.5 text-sm text-beige-600 line-clamp-2">{service.description}</p>
                <div className="mt-4 flex items-center justify-between border-t border-beige-100 pt-3">
                  <div className="flex items-center gap-3 text-sm text-beige-600">
                    <span className="font-semibold">{formatPrice(service.price)}</span>
                    <span className="text-beige-300">&middot;</span>
                    <span>{formatDuration(service.durationMinutes)}</span>
                  </div>
                  {service.featured && (
                    <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                      Featured
                    </span>
                  )}
                </div>
              </div>
            );
          })}
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
                {formError && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">
                    {formError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-beige-700">Name *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Swedish Massage (60 min)"
                      className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                    />
                  </div>

                  {/* Treatment Grouping */}
                  <div className="rounded-xl border border-beige-200 bg-beige-50/50 p-4 space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium text-beige-700">Treatment Group (optional)</label>
                        <span className="text-xs text-beige-500">Unifies cards on booking page</span>
                      </div>
                      <input
                        list="treatment-groups-list"
                        type="text"
                        value={form.groupName}
                        onChange={(e) => setForm({ ...form, groupName: e.target.value })}
                        placeholder="e.g. Swedish Massage"
                        className="w-full rounded-xl border border-beige-300 bg-white px-4 py-2.5 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:outline-none focus:ring-2 focus:ring-beige-200"
                      />
                      <datalist id="treatment-groups-list">
                        {existingGroupNames.map((name) => (
                          <option key={name} value={name} />
                        ))}
                      </datalist>
                    </div>

                    {form.groupName.trim() && (
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-beige-700">Group Type</label>
                          <select
                            value={form.groupType}
                            onChange={(e) => setForm({ ...form, groupType: e.target.value })}
                            className="w-full rounded-lg border border-beige-300 bg-white px-3 py-2 text-xs text-beige-800 focus:border-beige-500 focus:outline-none"
                          >
                            <option value="duration">Duration (mins)</option>
                            <option value="hair_length">Hair Length / Styling</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-beige-700">Variant Label</label>
                          <input
                            type="text"
                            value={form.variantLabel}
                            onChange={(e) => setForm({ ...form, variantLabel: e.target.value })}
                            placeholder={form.groupType === "hair_length" ? "e.g. Short hair" : "e.g. 60 min"}
                            className="w-full rounded-lg border border-beige-300 bg-white px-3 py-2 text-xs text-beige-800 focus:border-beige-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
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
                      <label className="mb-1 block text-sm font-medium text-beige-700">Available to *</label>
                      <select
                        value={form.audience}
                        onChange={(e) => setForm({ ...form, audience: e.target.value as ServiceAudience })}
                        className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                      >
                        {SERVICE_AUDIENCES.map((a) => (
                          <option key={a} value={a}>{AUDIENCE_LABELS[a]}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="flex h-full items-center gap-2.5 rounded-xl border border-beige-300 bg-beige-50 px-3 py-2.5 text-xs sm:text-[13px] text-beige-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.isActive}
                          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                          className="h-4 w-4 rounded border-beige-300 text-beige-600 focus:ring-beige-200"
                        />
                        Active (open for bookings)
                      </label>
                    </div>
                    <div>
                      <div className="flex h-full items-center justify-between gap-1.5 rounded-xl border border-beige-300 bg-beige-50 px-3 py-2 text-xs sm:text-[13px] text-beige-700">
                        <label className="flex items-center gap-2 cursor-pointer select-none min-w-0">
                          <input
                            type="checkbox"
                            checked={form.featured}
                            onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                            className="h-4 w-4 rounded border-beige-300 text-beige-600 focus:ring-beige-200 flex-shrink-0"
                          />
                          <span className="whitespace-nowrap">Featured on homepage</span>
                        </label>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <input
                            type="file"
                            ref={photoInputRef}
                            onChange={handlePhotoPicked}
                            accept="image/*"
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => photoInputRef.current?.click()}
                            disabled={processingPhoto}
                            title={
                              form.imageUrl && form.imageUrl !== DEFAULT_SERVICE_IMAGE
                                ? "Click to change service image"
                                : "Upload service image (default illustration in use)"
                            }
                            className="group/img relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg border border-beige-300 bg-white text-beige-700 shadow-sm transition hover:border-beige-400 hover:bg-beige-100 disabled:opacity-50"
                            aria-label="Upload service image"
                          >
                            {processingPhoto ? (
                              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-beige-400 border-t-beige-700" />
                            ) : form.imageUrl && form.imageUrl !== DEFAULT_SERVICE_IMAGE ? (
                              <>
                                <Image
                                  src={form.imageUrl}
                                  alt="Custom service thumbnail"
                                  fill
                                  className="object-cover transition-opacity group-hover/img:opacity-40"
                                  sizes="28px"
                                />
                                <Upload className="relative z-10 h-3 w-3 text-beige-800 opacity-0 transition-opacity group-hover/img:opacity-100" />
                              </>
                            ) : (
                              <Upload className="h-3.5 w-3.5 text-beige-600" />
                            )}
                          </button>
                          {form.imageUrl && form.imageUrl !== DEFAULT_SERVICE_IMAGE && (
                            <button
                              type="button"
                              onClick={() => {
                                setPhotoError(null);
                                setForm((prev) => ({ ...prev, imageUrl: DEFAULT_SERVICE_IMAGE }));
                              }}
                              title="Reset to default illustration"
                              className="flex h-7 w-5 items-center justify-center rounded text-beige-400 hover:text-red-600 transition"
                              aria-label="Reset to default image"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      {photoError && (
                        <p className="mt-1 text-xs text-red-600">{photoError}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-beige-700">Short Description *</label>
                    <textarea
                      rows={2}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Brief overview shown on treatment cards"
                      className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-beige-700">Detailed Description</label>
                    <textarea
                      rows={3}
                      value={form.longDescription}
                      onChange={(e) => setForm({ ...form, longDescription: e.target.value })}
                      placeholder="Full details shown on the service detail page"
                      className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                    />
                  </div>



                  {/* Employee assignments */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-beige-700">Assigned Specialists</label>
                    <div className="flex flex-wrap gap-2">
                      {employees.map((emp) => {
                        const selected = form.employeeIds.includes(emp.id);
                        return (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => toggleEmployee(emp.id)}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                              selected
                                ? "bg-beige-600 text-white"
                                : "border border-beige-300 bg-white text-beige-600 hover:bg-beige-100"
                            }`}
                          >
                            {emp.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-beige-100 px-6 py-4">
                <button onClick={() => setModalOpen(false)} className="btn-outline text-sm">Cancel</button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name || !form.description}
                  className="btn-primary text-sm disabled:opacity-50"
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

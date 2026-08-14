"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  Gift,
  Users,
  TrendingUp,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

/* ---------- types ---------- */

interface LoyaltyOverview {
  totalPointsOutstanding: number;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  totalUsersWithPoints: number;
  topEarners: {
    id: string;
    name: string;
    email: string;
    loyaltyPoints: number;
  }[];
  redemptionCount: number;
}

interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  discountType: string;
  discountValue: number;
  serviceId: string | null;
  service?: { id: string; name: string } | null;
  isActive: boolean;
  stock: number | null;
  createdAt: string;
}

interface Service {
  id: string;
  name: string;
}

type Tab = "overview" | "rewards" | "users" | "adjust";

/* ---------- animation variants ---------- */

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

/* ---------- empty form ---------- */

const emptyRewardForm = {
  name: "",
  description: "",
  pointsCost: 100,
  discountType: "percent",
  discountValue: 10,
  serviceId: "",
  stock: "",
  isActive: true,
};

/* ================================================================
   Admin Loyalty Dashboard
   ================================================================ */

export default function AdminLoyaltyPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<LoyaltyOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyRewardForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Users tab
  const [loyaltyUsers, setLoyaltyUsers] = useState<Array<{
    id: string; name: string; email: string; loyaltyPoints: number;
    transactionCount: number; redemptionCount: number; bookingCount: number;
    memberSince: string;
  }>>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  // Adjust form
  const [adjustUserId, setAdjustUserId] = useState("");
  const [adjustPoints, setAdjustPoints] = useState(0);
  const [adjustNote, setAdjustNote] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  // Fetch overview
  useEffect(() => {
    fetch("/api/admin/loyalty/overview")
      .then((res) => res.json())
      .then((data) => {
        setOverview(data);
        setOverviewLoading(false);
      })
      .catch(() => setOverviewLoading(false));
  }, []);

  // Fetch rewards
  useEffect(() => {
    if (activeTab !== "rewards" || rewards.length > 0) return;
    setRewardsLoading(true);
    fetch("/api/admin/loyalty/rewards")
      .then((res) => res.json())
      .then((data) => {
        setRewards(data.rewards ?? data ?? []);
        setRewardsLoading(false);
      })
      .catch(() => setRewardsLoading(false));
  }, [activeTab, rewards.length]);

  // Fetch loyalty users
  useEffect(() => {
    if (activeTab !== "users") return;
    setUsersLoading(true);
    fetch("/api/admin/loyalty/users")
      .then((res) => res.json())
      .then((data) => {
        setLoyaltyUsers(data.users ?? []);
        setUsersLoading(false);
      })
      .catch(() => setUsersLoading(false));
  }, [activeTab]);

  // Fetch services for dropdown
  useEffect(() => {
    fetch("/api/services")
      .then((res) => res.json())
      .then((data) => setServices(data.services ?? data ?? []))
      .catch(() => {});
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyRewardForm);
    setModalOpen(true);
  };

  const openEditModal = (reward: LoyaltyReward) => {
    setEditingId(reward.id);
    setForm({
      name: reward.name,
      description: reward.description,
      pointsCost: reward.pointsCost,
      discountType: reward.discountType,
      discountValue: reward.discountValue,
      serviceId: reward.serviceId ?? "",
      stock: reward.stock !== null ? String(reward.stock) : "",
      isActive: reward.isActive,
    });
    setModalOpen(true);
  };

  const handleSaveReward = async () => {
    if (!form.name.trim() || !form.description.trim()) {
      showToast("Name and description are required", "error");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim(),
        pointsCost: form.pointsCost,
        discountType: form.discountType,
        discountValue: form.discountValue,
        serviceId: form.serviceId || null,
        stock: form.stock ? parseInt(form.stock) : null,
        isActive: form.isActive,
      };
      const method = editingId ? "PATCH" : "POST";
      const url = editingId
        ? `/api/admin/loyalty/rewards`
        : `/api/admin/loyalty/rewards`;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: editingId ? JSON.stringify({ id: editingId, ...body }) : JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || "Failed to save reward", "error");
        return;
      }
      showToast(editingId ? "Reward updated" : "Reward created", "success");
      setModalOpen(false);
      // Refresh rewards
      const updated = await fetch("/api/admin/loyalty/rewards").then((r) => r.json());
      setRewards(updated.rewards ?? updated ?? []);
    } catch {
      showToast("Failed to save reward", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReward = async (id: string) => {
    try {
      const res = await fetch("/api/admin/loyalty/rewards", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        showToast("Failed to delete reward", "error");
        return;
      }
      showToast("Reward deactivated", "success");
      setDeleteConfirm(null);
      setRewards((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isActive: false } : r))
      );
    } catch {
      showToast("Failed to delete reward", "error");
    }
  };

  const handleAdjust = async () => {
    if (!adjustUserId.trim() || adjustPoints === 0 || adjustNote.trim().length < 3) {
      showToast("Fill all fields (note must be 3+ chars)", "error");
      return;
    }
    setAdjusting(true);
    try {
      const res = await fetch("/api/admin/loyalty/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: adjustUserId.trim(),
          points: adjustPoints,
          note: adjustNote.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || "Failed to adjust points", "error");
        return;
      }
      showToast("Points adjusted successfully", "success");
      setAdjustUserId("");
      setAdjustPoints(0);
      setAdjustNote("");
    } catch {
      showToast("Failed to adjust points", "error");
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div className="section-padding bg-beige-50">
      <div className="section-container mx-auto max-w-6xl">
        <h1 className="mb-8 font-serif text-3xl font-semibold text-beige-700 md:text-4xl">
          Loyalty Management
        </h1>

        {/* Tabs */}
        <div className="mb-8 flex gap-2 border-b border-beige-200">
          {(
            [
              { key: "overview", label: "Overview", icon: TrendingUp },
              { key: "users", label: "Users", icon: Users },
              { key: "rewards", label: "Rewards", icon: Gift },
              { key: "adjust", label: "Adjust Points", icon: Pencil },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-beige-600 text-beige-700"
                  : "border-transparent text-beige-400 hover:text-beige-600"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ===== OVERVIEW TAB ===== */}
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {overviewLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-beige-300 border-t-beige-600" />
                </div>
              ) : overview ? (
                <>
                  {/* Stats Cards */}
                  <motion.div
                    variants={stagger}
                    initial="hidden"
                    animate="visible"
                    className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                  >
                    {[
                      {
                        label: "Points Outstanding",
                        value: overview.totalPointsOutstanding.toLocaleString(),
                        icon: Star,
                        color: "text-amber-600 bg-amber-50",
                      },
                      {
                        label: "Total Earned",
                        value: overview.totalPointsEarned.toLocaleString(),
                        icon: TrendingUp,
                        color: "text-emerald-600 bg-emerald-50",
                      },
                      {
                        label: "Total Redeemed",
                        value: overview.totalPointsRedeemed.toLocaleString(),
                        icon: Gift,
                        color: "text-purple-600 bg-purple-50",
                      },
                      {
                        label: "Users with Points",
                        value: overview.totalUsersWithPoints.toString(),
                        icon: Users,
                        color: "text-blue-600 bg-blue-50",
                      },
                    ].map((stat) => (
                      <motion.div
                        key={stat.label}
                        variants={fadeUp}
                        className="rounded-card border border-beige-200 bg-white p-5 shadow-card"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}
                          >
                            <stat.icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-beige-500">
                              {stat.label}
                            </p>
                            <p className="font-serif text-2xl font-bold text-beige-700">
                              {stat.value}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* Top Earners */}
                  <div className="rounded-card border border-beige-200 bg-white shadow-card">
                    <div className="border-b border-beige-100 px-6 py-4">
                      <h2 className="font-serif text-lg font-semibold text-beige-700">
                        Top Earners
                      </h2>
                    </div>
                    {overview.topEarners.length === 0 ? (
                      <div className="px-6 py-8 text-center text-sm text-beige-500">
                        No users with loyalty points yet.
                      </div>
                    ) : (
                      <div className="divide-y divide-beige-100">
                        {overview.topEarners.map((user, i) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between px-6 py-4"
                          >
                            <div className="flex items-center gap-4">
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-beige-100 text-xs font-bold text-beige-600">
                                {i + 1}
                              </span>
                              <div>
                                <p className="text-sm font-medium text-beige-700">
                                  {user.name}
                                </p>
                                <p className="text-xs text-beige-500">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                            <span className="font-serif text-lg font-bold text-beige-700">
                              {user.loyaltyPoints.toLocaleString()} pts
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="rounded-card border border-beige-200 bg-white p-12 text-center shadow-card">
                  <p className="text-beige-500">Failed to load overview data.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ===== REWARDS TAB ===== */}
          {activeTab === "rewards" && (
            <motion.div
              key="rewards"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-serif text-xl font-semibold text-beige-700">
                  Rewards
                </h2>
                <button onClick={openCreateModal} className="btn-primary flex items-center gap-2 text-sm">
                  <Plus className="h-4 w-4" />
                  New Reward
                </button>
              </div>

              {rewardsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-beige-300 border-t-beige-600" />
                </div>
              ) : rewards.length === 0 ? (
                <div className="rounded-card border border-beige-200 bg-white p-12 text-center shadow-card">
                  <Gift className="mx-auto h-12 w-12 text-beige-300" />
                  <p className="mt-4 text-beige-500">No rewards created yet.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-card border border-beige-200 bg-white shadow-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-beige-100 bg-beige-50">
                          <th className="px-4 py-3 font-medium text-beige-600">Name</th>
                          <th className="px-4 py-3 font-medium text-beige-600">Cost</th>
                          <th className="px-4 py-3 font-medium text-beige-600">Discount</th>
                          <th className="px-4 py-3 font-medium text-beige-600">Stock</th>
                          <th className="px-4 py-3 font-medium text-beige-600">Status</th>
                          <th className="px-4 py-3 font-medium text-beige-600">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-beige-100">
                        {rewards.map((reward) => (
                          <tr key={reward.id} className="hover:bg-beige-50/50">
                            <td className="px-4 py-3">
                              <p className="font-medium text-beige-700">{reward.name}</p>
                              <p className="text-xs text-beige-400">{reward.description}</p>
                            </td>
                            <td className="px-4 py-3 text-beige-600">
                              {reward.pointsCost} pts
                            </td>
                            <td className="px-4 py-3 text-beige-600">
                              {reward.discountType === "percent"
                                ? `${reward.discountValue}%`
                                : reward.discountType === "fixed"
                                ? `₹${reward.discountValue}`
                                : "Free"}
                            </td>
                            <td className="px-4 py-3 text-beige-600">
                              {reward.stock !== null ? reward.stock : "∞"}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                                  reward.isActive
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {reward.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openEditModal(reward)}
                                  className="rounded-lg p-1.5 text-beige-400 transition-colors hover:bg-beige-100 hover:text-beige-600"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                {reward.isActive && (
                                  <button
                                    onClick={() => setDeleteConfirm(reward.id)}
                                    className="rounded-lg p-1.5 text-beige-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ===== USERS TAB ===== */}
          {activeTab === "users" && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full max-w-md rounded-xl border border-beige-300 bg-white px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:outline-none focus:ring-2 focus:ring-beige-200"
                />
              </div>

              {usersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-beige-300 border-t-beige-600" />
                </div>
              ) : loyaltyUsers.length === 0 ? (
                <div className="rounded-card border border-beige-200 bg-white p-12 text-center shadow-card">
                  <Users className="mx-auto h-12 w-12 text-beige-300" />
                  <p className="mt-4 text-beige-500">No users with loyalty data yet.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-card border border-beige-200 bg-white shadow-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-beige-100 bg-beige-50">
                          <th className="px-4 py-3 font-medium text-beige-600">User</th>
                          <th className="px-4 py-3 text-right font-medium text-beige-600">Points</th>
                          <th className="px-4 py-3 text-right font-medium text-beige-600">Bookings</th>
                          <th className="px-4 py-3 text-right font-medium text-beige-600">Transactions</th>
                          <th className="px-4 py-3 text-right font-medium text-beige-600">Redemptions</th>
                          <th className="px-4 py-3 font-medium text-beige-600">Member Since</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-beige-100">
                        {loyaltyUsers
                          .filter((u) =>
                            !userSearch.trim() ||
                            u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                            u.email.toLowerCase().includes(userSearch.toLowerCase())
                          )
                          .map((u) => (
                            <tr key={u.id} className="hover:bg-beige-50/50">
                              <td className="px-4 py-3">
                                <p className="font-medium text-beige-700">{u.name}</p>
                                <p className="text-xs text-beige-400">{u.email}</p>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                  u.loyaltyPoints > 0
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-beige-100 text-beige-500"
                                }`}>
                                  <Star className="h-3 w-3" />
                                  {u.loyaltyPoints.toLocaleString()} pts
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-beige-600">
                                {u.bookingCount}
                              </td>
                              <td className="px-4 py-3 text-right text-beige-600">
                                {u.transactionCount}
                              </td>
                              <td className="px-4 py-3 text-right text-beige-600">
                                {u.redemptionCount}
                              </td>
                              <td className="px-4 py-3 text-beige-500">
                                {new Date(u.memberSince).toLocaleDateString("en-US", {
                                  month: "short",
                                  year: "numeric",
                                })}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ===== ADJUST TAB ===== */}
          {activeTab === "adjust" && (
            <motion.div
              key="adjust"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mx-auto max-w-lg rounded-card border border-beige-200 bg-white p-6 shadow-card md:p-8">
                <h2 className="mb-6 font-serif text-xl font-semibold text-beige-700">
                  Manual Point Adjustment
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-beige-700">
                      User ID
                    </label>
                    <input
                      type="text"
                      value={adjustUserId}
                      onChange={(e) => setAdjustUserId(e.target.value)}
                      placeholder="Enter user ID"
                      className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-beige-700">
                      Points (+ to add, − to deduct)
                    </label>
                    <input
                      type="number"
                      value={adjustPoints}
                      onChange={(e) => setAdjustPoints(parseInt(e.target.value) || 0)}
                      className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-beige-700">
                      Reason (min 3 characters)
                    </label>
                    <input
                      type="text"
                      value={adjustNote}
                      onChange={(e) => setAdjustNote(e.target.value)}
                      placeholder="e.g. Compensated for service issue"
                      className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                    />
                  </div>
                  <button
                    onClick={handleAdjust}
                    disabled={adjusting || !adjustUserId || adjustPoints === 0}
                    className="btn-primary w-full py-3"
                  >
                    {adjusting ? "Adjusting..." : "Apply Adjustment"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create/Edit Reward Modal */}
        <AnimatePresence>
          {modalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center bg-beige-900/40 p-4 backdrop-blur-sm"
              onClick={() => setModalOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-md overflow-hidden rounded-card border border-beige-200 bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-beige-100 px-6 py-4">
                  <h3 className="font-serif text-lg font-semibold text-beige-700">
                    {editingId ? "Edit Reward" : "Create Reward"}
                  </h3>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="rounded-full p-1 text-beige-400 hover:bg-beige-100 hover:text-beige-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-beige-700">Name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-2.5 text-sm text-beige-800 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-beige-700">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={2}
                      className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-2.5 text-sm text-beige-800 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-beige-700">Points Cost</label>
                      <input
                        type="number"
                        value={form.pointsCost}
                        onChange={(e) => setForm({ ...form, pointsCost: parseInt(e.target.value) || 0 })}
                        className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-2.5 text-sm text-beige-800 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-beige-700">Stock (blank=∞)</label>
                      <input
                        type="number"
                        value={form.stock}
                        onChange={(e) => setForm({ ...form, stock: e.target.value })}
                        placeholder="Unlimited"
                        className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-2.5 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-beige-700">Discount Type</label>
                      <select
                        value={form.discountType}
                        onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                        className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-2.5 text-sm text-beige-800 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                      >
                        <option value="percent">Percent (%)</option>
                        <option value="fixed">Fixed (₹)</option>
                        <option value="free_service">Free Service</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-beige-700">Discount Value</label>
                      <input
                        type="number"
                        value={form.discountValue}
                        onChange={(e) => setForm({ ...form, discountValue: parseFloat(e.target.value) || 0 })}
                        className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-2.5 text-sm text-beige-800 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-beige-700">Tie to Service (optional)</label>
                    <select
                      value={form.serviceId}
                      onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
                      className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-2.5 text-sm text-beige-800 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                    >
                      <option value="">None</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      className="h-4 w-4 rounded border-beige-300 text-beige-600 focus:ring-beige-500"
                    />
                    <label htmlFor="isActive" className="text-sm text-beige-700">
                      Active
                    </label>
                  </div>
                  <button
                    onClick={handleSaveReward}
                    disabled={saving}
                    className="btn-primary w-full py-3"
                  >
                    {saving ? "Saving..." : editingId ? "Update Reward" : "Create Reward"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
                className="w-full max-w-sm rounded-card border border-beige-200 bg-white p-6 shadow-xl text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="mx-auto h-10 w-10 text-red-400" />
                <h3 className="mt-3 font-serif text-lg font-semibold text-beige-700">
                  Deactivate Reward?
                </h3>
                <p className="mt-2 text-sm text-beige-500">
                  This will set the reward to inactive. Existing redemptions will still be honored.
                </p>
                <div className="mt-5 flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="btn-outline flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteReward(deleteConfirm)}
                    className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
                  >
                    Deactivate
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Star,
  Gift,
  ArrowRight,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { formatDiscount } from "@/lib/utils";

/* ---------- types ---------- */

interface LoyaltyTransaction {
  id: string;
  type: string;
  points: number;
  balanceAfter: number;
  note: string | null;
  createdAt: string;
  booking?: { id: string; date: string; timeSlot: string } | null;
  redemption?: {
    id: string;
    code: string;
    reward?: { name: string } | null;
  } | null;
}

interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  discountType: string;
  discountValue: number;
  stock: number | null;
  service?: { id: string; name: string } | null;
}

interface LoyaltyData {
  balance: number;
  transactions: LoyaltyTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

type Tab = "history" | "rewards";

/* ---------- animation variants ---------- */

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

/* ---------- transaction type labels ---------- */

const typeLabels: Record<string, { label: string; color: string; icon: string }> = {
  earn: { label: "Earned", color: "text-emerald-600", icon: "+" },
  redeem: { label: "Redeemed", color: "text-amber-600", icon: "-" },
  adjust: { label: "Adjusted", color: "text-blue-600", icon: "±" },
  refund_reversal: { label: "Clawback", color: "text-red-600", icon: "-" },
};

/* ================================================================
   Loyalty Dashboard Page
   ================================================================ */

function LoyaltyContent() {
  const { user, updateUser, refreshSession } = useAuth();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") === "rewards" ? "rewards" : "history") as Tab;
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [data, setData] = useState<LoyaltyData>({
    balance: 0,
    transactions: [],
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    },
  });
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [redeemed, setRedeemed] = useState<{
    code: string;
    rewardName: string;
    expiresAt: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Refresh auth context on mount to get fresh loyalty points
  useEffect(() => {
    refreshSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch loyalty data
  const fetchLoyaltyData = useCallback(() => {
    if (!user) return;
    setLoading(true);
    setHasError(false);
    fetch(`/api/loyalty?page=${page}&limit=10`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setData({
          balance: data.balance ?? 0,
          transactions: data.transactions ?? [],
          pagination: {
            page: data.pagination?.page ?? page,
            limit: data.pagination?.limit ?? 10,
            total: data.pagination?.total ?? 0,
            totalPages: data.pagination?.totalPages ?? 0,
          },
        });
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch loyalty data:", error);
        setHasError(true);
        setLoading(false);
      });
  }, [user, page]);

  useEffect(() => {
    fetchLoyaltyData();
  }, [fetchLoyaltyData]);

  // Fetch rewards when tab changes
  useEffect(() => {
    if (activeTab !== "rewards" || rewards.length > 0) return;
    setRewardsLoading(true);
    fetch("/api/loyalty/rewards")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setRewards(data.rewards ?? data ?? []);
        setRewardsLoading(false);
      })
      .catch(() => setRewardsLoading(false));
  }, [activeTab, rewards.length]);

  const handleRedeem = async (rewardId: string) => {
    setRedeeming(rewardId);
    try {
      const res = await fetch("/api/loyalty/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardId }),
      });
      const result = await res.json();
      if (!res.ok) {
        showToast(result.error || "Failed to redeem reward", "error");
        return;
      }
      setRedeemed({
        code: result.redemption.code,
        rewardName: result.reward.name,
        expiresAt: result.redemption.expiresAt,
      });
      // Refresh data
      if (data) {
        setData({ ...data, balance: result.newBalance });
      }
      // Update auth context so header/other components reflect new balance
      if (updateUser) {
        updateUser({ loyaltyPoints: result.newBalance });
      }
    } catch {
      showToast("Failed to redeem reward. Please try again.", "error");
    } finally {
      setRedeeming(null);
    }
  };

  const handleCopyCode = () => {
    if (!redeemed) return;
    navigator.clipboard.writeText(redeemed.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) {
    return (
      <div className="section-padding bg-beige-50">
        <div className="section-container mx-auto max-w-3xl text-center">
          <h1 className="mb-4 font-serif text-3xl font-semibold text-beige-700">
            Loyalty Points
          </h1>
          <p className="text-beige-600">Please sign in to view your loyalty points.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="section-padding bg-beige-50">
      <div className="section-container mx-auto max-w-5xl">
        <h1 className="mb-8 font-serif text-3xl font-semibold text-beige-700 md:text-4xl">
          Loyalty Points
        </h1>

        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 overflow-hidden rounded-card border border-beige-200 bg-white shadow-card"
        >
          <div className="relative bg-gradient-to-r from-beige-600 to-beige-700 px-6 py-8 text-white md:px-8">
            <div className="pointer-events-none absolute -right-8 -top-8 opacity-10">
              <Star className="h-32 w-32" />
            </div>
            <div className="relative z-10">
              <p className="text-sm font-medium uppercase tracking-wider text-beige-200">
                Your Balance
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-serif text-5xl font-bold">
                  {loading ? "—" : (user?.loyaltyPoints ?? data?.balance ?? 0)}
                </span>
                <span className="text-lg text-beige-200">points</span>
              </div>
              <p className="mt-3 text-sm text-beige-300">
                Earn 1 point for every ₹10 spent on bookings
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-beige-100">
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 px-6 py-3.5 text-sm font-medium transition-colors ${
                activeTab === "history"
                  ? "border-b-2 border-beige-600 text-beige-700"
                  : "text-beige-400 hover:text-beige-600"
              }`}
            >
              <Clock className="mr-2 inline h-4 w-4" />
              Transaction History
            </button>
            <button
              onClick={() => setActiveTab("rewards")}
              className={`flex-1 px-6 py-3.5 text-sm font-medium transition-colors ${
                activeTab === "rewards"
                  ? "border-b-2 border-beige-600 text-beige-700"
                  : "text-beige-400 hover:text-beige-600"
              }`}
            >
              <Gift className="mr-2 inline h-4 w-4" />
              Rewards Catalog
            </button>
          </div>
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "history" ? (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-beige-300 border-t-beige-600" />
                </div>
              ) : hasError ? (
                <div className="rounded-card border border-red-200 bg-red-50 p-12 text-center shadow-card">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                      <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
                    </svg>
                  </div>
                  <h3 className="mt-4 font-serif text-lg font-semibold text-red-700">
                    Couldn&apos;t load history
                  </h3>
                  <p className="mt-2 text-sm text-red-500">
                    There was a problem loading your transaction history. Please try again.
                  </p>
                  <button
                    onClick={fetchLoyaltyData}
                    className="btn-primary mt-4 inline-flex gap-2 bg-red-600 hover:bg-red-700"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                    Retry
                  </button>
                </div>
              ) : !data || !data.transactions || data.transactions.length === 0 ? (
                <div className="rounded-card border border-beige-200 bg-white p-12 text-center shadow-card">
                  <Star className="mx-auto h-12 w-12 text-beige-300" />
                  <h3 className="mt-4 font-serif text-lg font-semibold text-beige-700">
                    No transactions yet
                  </h3>
                  <p className="mt-2 text-sm text-beige-500">
                    Complete a booking to start earning loyalty points
                  </p>
                  <Link
                    href="/booking"
                    className="btn-primary mt-4 inline-flex gap-2"
                  >
                    Book a Treatment
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {data.transactions.map((tx) => {
                      const typeInfo = typeLabels[tx.type] ?? {
                        label: tx.type,
                        color: "text-beige-600",
                        icon: "?",
                      };
                      const isPositive = tx.points > 0;
                      return (
                        <motion.div
                          key={tx.id}
                          variants={fadeUp}
                          initial="hidden"
                          animate="visible"
                          className="flex items-center justify-between rounded-card border border-beige-200 bg-white p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                                isPositive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                              }`}
                            >
                              <span className="text-lg font-bold">
                                {isPositive ? "+" : "−"}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-beige-700">
                                {typeInfo.label}
                              </p>
                              <p className="text-xs text-beige-500">
                                {tx.note ?? "—"}
                              </p>
                              {tx.redemption?.reward?.name && (
                                <p className="text-xs text-beige-400">
                                  Reward: {tx.redemption.reward.name}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-sm font-semibold ${
                                isPositive ? "text-emerald-600" : "text-red-600"
                              }`}
                            >
                              {isPositive ? "+" : ""}
                              {tx.points} pts
                            </p>
                            <p className="text-xs text-beige-400">
                              {new Date(tx.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {data.pagination.totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-center gap-4">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-beige-200 text-beige-600 transition-colors hover:bg-beige-50 disabled:opacity-40"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-sm text-beige-500">
                        Page {data.pagination.page} of {data.pagination.totalPages}
                      </span>
                      <button
                        onClick={() =>
                          setPage((p) =>
                            Math.min(data.pagination.totalPages, p + 1)
                          )
                        }
                        disabled={page === data.pagination.totalPages}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-beige-200 text-beige-600 transition-colors hover:bg-beige-50 disabled:opacity-40"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="rewards"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {rewardsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-beige-300 border-t-beige-600" />
                </div>
              ) : rewards.length === 0 ? (
                <div className="rounded-card border border-beige-200 bg-white p-12 text-center shadow-card">
                  <Gift className="mx-auto h-12 w-12 text-beige-300" />
                  <h3 className="mt-4 font-serif text-lg font-semibold text-beige-700">
                    No rewards available
                  </h3>
                  <p className="mt-2 text-sm text-beige-500">
                    Check back later for exciting reward options
                  </p>
                </div>
              ) : (
                <motion.div
                  variants={stagger}
                  initial="hidden"
                  animate="visible"
                  className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {rewards.map((reward) => {
                    const canAfford = (user?.loyaltyPoints ?? data?.balance ?? 0) >= reward.pointsCost;
                    const inStock = reward.stock === null || reward.stock > 0;
                    return (
                      <motion.div
                        key={reward.id}
                        variants={fadeUp}
                        className="flex flex-col rounded-card border border-beige-200 bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
                      >
                        <div className="mb-3 flex items-start justify-between">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-beige-100 text-beige-600">
                            <Sparkles className="h-5 w-5" />
                          </div>
                          <span className="rounded-full bg-beige-100 px-2.5 py-0.5 text-xs font-medium text-beige-600">
                            {reward.pointsCost} pts
                          </span>
                        </div>
                        <h3 className="font-serif text-lg font-semibold text-beige-700">
                          {reward.name}
                        </h3>
                        <p className="mt-1 text-sm text-beige-500">
                          {reward.description}
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-sm font-medium text-beige-600">
                            {formatDiscount(reward.discountType, reward.discountValue)}
                          </span>
                          {reward.service && (
                            <span className="text-xs text-beige-400">
                              · {reward.service.name}
                            </span>
                          )}
                        </div>
                        {reward.stock !== null && (
                          <p className="mt-2 text-xs text-beige-400">
                            {reward.stock > 0 ? `${reward.stock} left` : "Out of stock"}
                          </p>
                        )}
                        <div className="mt-auto pt-4">
                          <button
                            onClick={() => handleRedeem(reward.id)}
                            disabled={
                              !canAfford || !inStock || redeeming === reward.id
                            }
                            className="btn-primary w-full py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {redeeming === reward.id ? (
                              <span className="flex items-center justify-center gap-2">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Redeeming...
                              </span>
                            ) : !canAfford ? (
                              "Not enough points"
                            ) : !inStock ? (
                              "Out of stock"
                            ) : (
                              "Redeem"
                            )}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Redemption Success Modal */}
        <AnimatePresence>
          {redeemed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center bg-beige-900/40 p-4 backdrop-blur-sm"
              onClick={() => setRedeemed(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-sm overflow-hidden rounded-card border border-beige-200 bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-8 text-center text-white">
                  <Check className="mx-auto h-12 w-12" />
                  <h3 className="mt-3 font-serif text-xl font-semibold">
                    Reward Redeemed!
                  </h3>
                  <p className="mt-1 text-sm text-emerald-100">
                    {redeemed.rewardName}
                  </p>
                </div>
                <div className="px-6 py-5 text-center">
                  <p className="text-xs font-medium uppercase tracking-wider text-beige-500">
                    Your redemption code
                  </p>
                  <div className="mt-2 flex items-center justify-center gap-3">
                    <span className="font-mono text-2xl font-bold tracking-widest text-beige-700">
                      {redeemed.code}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-beige-200 text-beige-500 transition-colors hover:bg-beige-50"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {redeemed.expiresAt && (
                    <p className="mt-3 text-xs text-beige-400">
                      Valid until{" "}
                      {new Date(redeemed.expiresAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  )}
                  <p className="mt-4 text-xs text-beige-500">
                    Show this code at checkout, or it will auto-apply at your next booking.
                  </p>
                  <button
                    onClick={() => setRedeemed(null)}
                    className="btn-primary mt-4 w-full"
                  >
                    Done
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

export default function LoyaltyPage() {
  return (
    <Suspense
      fallback={
        <div className="section-padding bg-beige-50">
          <div className="section-container mx-auto max-w-5xl">
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-beige-300 border-t-beige-600" />
            </div>
          </div>
        </div>
      }
    >
      <LoyaltyContent />
    </Suspense>
  );
}

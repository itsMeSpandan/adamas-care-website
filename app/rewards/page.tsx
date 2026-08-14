"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Sparkles, Gift, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { formatDiscount } from "@/lib/utils";

/* ---------- types ---------- */

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

/* ---------- animation variants ---------- */

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

/* ================================================================
   Rewards Catalog Page (Public)
   ================================================================ */

export default function RewardsPage() {
  const { user } = useAuth();
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/loyalty/rewards")
      .then((res) => res.json())
      .then((data) => {
        setRewards(data.rewards ?? data ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="section-padding bg-beige-50">
      <div className="section-container mx-auto max-w-6xl">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <div className="mb-4 flex items-center justify-center gap-3">
            <span className="h-0.5 w-10 rounded-full bg-[#C9A86A]" />
            <span className="font-serif text-sm font-semibold uppercase tracking-[0.25em] text-[#C9A86A]">
              Loyalty Rewards
            </span>
            <span className="h-0.5 w-10 rounded-full bg-[#C9A86A]" />
          </div>
          <h1 className="font-serif text-4xl font-semibold text-beige-700 md:text-5xl">
            Redeem Your Points
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-beige-600">
            Earn points with every booking and unlock exclusive rewards. The more you visit, the more you save.
          </p>
          {user && (
            <Link
              href="/account/loyalty"
              className="btn-primary mt-6 inline-flex gap-2"
            >
              <Sparkles className="h-4 w-4" />
              View My Points
            </Link>
          )}
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-12 grid gap-6 md:grid-cols-3"
        >
          {[
            {
              icon: "✨",
              title: "Book a Service",
              desc: "Complete any booking to earn loyalty points automatically.",
            },
            {
              icon: "🎯",
              title: "Collect Points",
              desc: "Earn 1 point for every ₹10 spent. Points accumulate with every visit.",
            },
            {
              icon: "🎁",
              title: "Redeem Rewards",
              desc: "Exchange your points for discounts, free services, and exclusive perks.",
            },
          ].map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
              className="rounded-card border border-beige-200 bg-white p-6 text-center shadow-card"
            >
              <span className="text-3xl">{step.icon}</span>
              <h3 className="mt-3 font-serif text-lg font-semibold text-beige-700">
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-beige-500">{step.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Rewards Grid */}
        <div className="mb-8">
          <h2 className="mb-6 font-serif text-2xl font-semibold text-beige-700 md:text-3xl">
            Available Rewards
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-beige-300 border-t-beige-600" />
            </div>
          ) : rewards.length === 0 ? (
            <div className="rounded-card border border-beige-200 bg-white p-12 text-center shadow-card">
              <Gift className="mx-auto h-12 w-12 text-beige-300" />
              <h3 className="mt-4 font-serif text-lg font-semibold text-beige-700">
                No rewards available yet
              </h3>
              <p className="mt-2 text-sm text-beige-500">
                Keep earning points — rewards are coming soon!
              </p>
            </div>
          ) : (
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {rewards.map((reward) => {
                const inStock = reward.stock === null || reward.stock > 0;
                return (
                  <motion.div
                    key={reward.id}
                    variants={fadeUp}
                    className="group flex flex-col rounded-card border border-beige-200 bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-beige-100 text-beige-600 transition-colors duration-300 group-hover:bg-beige-600 group-hover:text-white">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <span className="rounded-full bg-beige-100 px-3 py-1 text-xs font-semibold text-beige-600">
                        {reward.pointsCost} pts
                      </span>
                    </div>
                    <h3 className="font-serif text-xl font-semibold text-beige-700">
                      {reward.name}
                    </h3>
                    <p className="mt-2 flex-1 text-sm text-beige-500">
                      {reward.description}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
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
                        {inStock ? `${reward.stock} available` : "Out of stock"}
                      </p>
                    )}
                    {user ? (
                      <Link
                        href="/account/loyalty?tab=rewards"
                        className="btn-outline mt-4 w-full justify-center gap-2 text-sm"
                      >
                        Redeem
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <Link
                        href="/account/loyalty?tab=rewards"
                        className="btn-outline mt-4 w-full justify-center gap-2 text-sm"
                      >
                        Sign in to redeem
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

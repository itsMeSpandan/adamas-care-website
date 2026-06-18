"use client";

import { useState, useEffect, Suspense, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useAuth, AuthUser } from "@/lib/auth-context";
import PasswordToggle from "@/components/ui/PasswordToggle";
import StarRating from "@/components/ui/StarRating";
import { formatBookingDate } from "@/lib/utils";

type Tab = "profile" | "security" | "bookings";

interface Booking {
  id: string;
  serviceId: string;
  employeeId: string;
  userId: string | null;
  date: string;
  timeSlot: string;
  name: string;
  email: string;
  phone: string;
  notes: string | null;
  status: string;
  price: number;
  rating?: number | null;
  review?: string | null;
  service: { name: string };
}

const statusColors: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-blue-100 text-blue-700",
};

function ProfileContent() {
  const { user, updateUser } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "profile";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Profile state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Security state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Bookings state
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Mobile tab
  const [mobileTabOpen, setMobileTabOpen] = useState(false);

  // Avatar upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setAvatarUrl(user.avatarUrl);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === "bookings" && user) {
      setLoadingBookings(true);
      fetch(`/api/bookings`)
        .then((res) => res.json())
        .then((data) => {
          // Filter bookings for current user
          const myBookings = (data.bookings || data || []).filter(
            (b: Booking) => b.userId === user.id || b.email === user.email
          );
          setBookings(myBookings);
          setLoadingBookings(false);
        })
        .catch(() => setLoadingBookings(false));
    }
  }, [activeTab, user]);

  const handleProfileSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, name, email, avatarUrl }),
      });
      if (!res.ok) {
        const data = await res.json();
        setMessage(data.error || "Failed to update profile");
        return;
      }
      await res.json();
      // Update auth context directly
      updateUser({ name, email, avatarUrl } as Partial<AuthUser>);
      setMessage("Profile updated successfully!");
    } catch {
      setMessage("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!user) return;
    if (newPassword !== confirmPassword) {
      setMessage("New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setMessage("Password must be at least 6 characters");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          currentPassword,
          newPassword,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setMessage(data.error || "Failed to change password");
        return;
      }
      setMessage("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setMessage("Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  const resizeImage = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_SIZE = 256;
          let { width, height } = img;
          if (width > height) {
            if (width > MAX_SIZE) {
              height = (height * MAX_SIZE) / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = (width * MAX_SIZE) / height;
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Failed to get canvas context"));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }, []);

  const handleAvatarUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setMessage("Please select an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setMessage("Image must be under 5MB");
        return;
      }
      setUploadingAvatar(true);
      try {
        const dataUrl = await resizeImage(file);
        setAvatarUrl(dataUrl);
      } catch {
        setMessage("Failed to process image");
      } finally {
        setUploadingAvatar(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [resizeImage]
  );

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm("Are you sure you want to cancel this booking? This action cannot be undone.")) return;
    setCancellingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (res.ok) {
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: "cancelled" } : b))
        );
      }
    } catch {
      // silently fail
    } finally {
      setCancellingId(null);
    }
  };

  const tabs: { key: Tab; label: string; icon: JSX.Element }[] = [
    {
      key: "profile",
      label: "Profile",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
    {
      key: "security",
      label: "Security",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
    },
    {
      key: "bookings",
      label: "My Bookings",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
        </svg>
      ),
    },
  ];

  if (!user) {
    return (
      <div className="section-padding bg-beige-50">
        <div className="section-container mx-auto max-w-3xl text-center">
          <h1 className="mb-4 font-serif text-3xl font-semibold text-beige-700">Profile</h1>
          <p className="text-beige-600">Please sign in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="section-padding bg-beige-50">
      <div className="section-container mx-auto max-w-5xl">
        <h1 className="mb-8 font-serif text-3xl font-semibold text-beige-700 md:text-4xl">
          My Account
        </h1>

        <div className="flex flex-col gap-8 md:flex-row">
          {/* Sidebar Tabs - Desktop */}
          <div className="hidden w-64 flex-shrink-0 md:block">
            <div className="sticky top-24 space-y-1">
              {/* User card */}
              <div className="mb-4 rounded-card border border-beige-200 bg-white p-4 shadow-card">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 overflow-hidden rounded-full">
                    <Image src={avatarUrl || user.avatarUrl} alt={user.name} fill className="object-cover" sizes="48px" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-beige-700">{user.name}</p>
                    <p className="truncate text-xs text-beige-500">{user.email}</p>
                  </div>
                </div>
                <span className="mt-2 inline-block rounded-full bg-beige-100 px-2 py-0.5 text-[10px] font-medium uppercase text-beige-600">
                  {user.role}
                </span>
              </div>

              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    activeTab === tab.key
                      ? "bg-beige-600 text-white"
                      : "text-beige-600 hover:bg-beige-50 hover:text-beige-700"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Tab Selector */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileTabOpen(!mobileTabOpen)}
              className="flex w-full items-center justify-between rounded-card border border-beige-200 bg-white px-4 py-3 shadow-card"
            >
              <div className="flex items-center gap-3">
                {tabs.find((t) => t.key === activeTab)?.icon}
                <span className="text-sm font-medium text-beige-700">
                  {tabs.find((t) => t.key === activeTab)?.label}
                </span>
              </div>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`text-beige-400 transition-transform ${mobileTabOpen ? "rotate-180" : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <AnimatePresence>
              {mobileTabOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 overflow-hidden rounded-card border border-beige-200 bg-white shadow-card"
                >
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => {
                        setActiveTab(tab.key);
                        setMobileTabOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === tab.key
                          ? "bg-beige-50 text-beige-700"
                          : "text-beige-600 hover:bg-beige-50"
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {activeTab === "profile" && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-card border border-beige-200 bg-white p-6 shadow-card md:p-8"
                >
                  <h2 className="mb-6 font-serif text-xl font-semibold text-beige-700">
                    Profile Information
                  </h2>

                  {message && (
                    <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
                      message.includes("success")
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}>
                      {message}
                    </div>
                  )}

                  <div className="flex flex-col items-start gap-6 sm:flex-row">
                    {/* Avatar */}
                    <div className="flex flex-col items-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="group relative h-24 w-24 overflow-hidden rounded-full border-2 border-beige-200 transition-all hover:border-beige-400 hover:shadow-md"
                        disabled={uploadingAvatar}
                      >
                        <Image src={avatarUrl || user.avatarUrl} alt={user.name} fill className="object-cover" sizes="96px" />
                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-beige-900/0 transition-all group-hover:bg-beige-900/40">
                          {uploadingAvatar ? (
                            <span className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 transition-opacity group-hover:opacity-100">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                          )}
                        </div>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                      <p className="text-xs text-beige-500">Click to upload photo</p>
                    </div>

                    <div className="flex-1 space-y-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-beige-700">Full Name</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-beige-700">Email</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-beige-700">Avatar URL</label>
                        <input
                          type="url"
                          value={avatarUrl}
                          onChange={(e) => setAvatarUrl(e.target.value)}
                          placeholder="https://..."
                          className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                        />
                      </div>
                      <button
                        onClick={handleProfileSave}
                        disabled={saving}
                        className="btn-primary"
                      >
                        {saving ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "security" && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-card border border-beige-200 bg-white p-6 shadow-card md:p-8"
                >
                  <h2 className="mb-6 font-serif text-xl font-semibold text-beige-700">
                    Security Settings
                  </h2>

                  {message && (
                    <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
                      message.includes("success")
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}>
                      {message}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-beige-700">Current Password</label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                          className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 pr-12 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                        />
                        <PasswordToggle show={showCurrentPassword} onToggle={() => setShowCurrentPassword(!showCurrentPassword)} />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-beige-700">New Password</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 pr-12 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                        />
                        <PasswordToggle show={showNewPassword} onToggle={() => setShowNewPassword(!showNewPassword)} />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-beige-700">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 pr-12 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                        />
                        <PasswordToggle show={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} />
                      </div>
                    </div>
                    <button
                      onClick={handlePasswordChange}
                      disabled={saving || !currentPassword || !newPassword || !confirmPassword}
                      className="btn-primary"
                    >
                      {saving ? "Updating..." : "Change Password"}
                    </button>
                  </div>
                </motion.div>
              )}

              {activeTab === "bookings" && (
                <motion.div
                  key="bookings"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-card border border-beige-200 bg-white shadow-card"
                >
                  <div className="border-b border-beige-100 px-6 py-4">
                    <h2 className="font-serif text-xl font-semibold text-beige-700">
                      My Bookings
                    </h2>
                  </div>

                  {loadingBookings ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-beige-300 border-t-beige-600" />
                    </div>
                  ) : bookings.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <p className="text-beige-500">No bookings found.</p>
                      <a href="/booking" className="btn-primary mt-4 inline-flex">
                        Book an Appointment
                      </a>
                    </div>
                  ) : (
                    <div className="divide-y divide-beige-100">
                      {bookings.map((booking) => (
                        <div key={booking.id} className="px-6 py-5">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <h3 className="text-sm font-semibold text-beige-700">{booking.service?.name}</h3>
                                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[booking.status] ?? ""}`}>
                                  {booking.status}
                                </span>
                              </div>
                              <p className="text-sm text-beige-500">
                                {formatBookingDate(booking.date)} &middot; {booking.timeSlot}
                              </p>
                              <p className="text-sm font-medium text-beige-600">₹{booking.price}</p>
                            </div>

                            <div className="space-y-2 sm:w-72">
                              {/* Cancel button for pending/confirmed bookings */}
                              {(booking.status === "pending" || booking.status === "confirmed") && (
                                <button
                                  type="button"
                                  onClick={() => handleCancelBooking(booking.id)}
                                  disabled={cancellingId === booking.id}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {cancellingId === booking.id ? (
                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-red-300 border-t-red-600" />
                                  ) : (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                  )}
                                  {cancellingId === booking.id ? "Cancelling..." : "Cancel Booking"}
                                </button>
                              )}

                              {/* Rating section */}
                              {booking.status === "completed" && !booking.rating && (
                                <div className="rounded-xl border-2 border-beige-400 bg-beige-200 p-4 shadow-md">
                                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-beige-800">Rate this service</p>
                                  <StarRating
                                    bookingId={booking.id}
                                    onRatingSubmitted={(id, rating, review) => {
                                      setBookings((prev) =>
                                        prev.map((b) =>
                                          b.id === id ? { ...b, rating, review } : b
                                        )
                                      );
                                    }}
                                  />
                                </div>
                              )}
                              {booking.status === "completed" && !!booking.rating && (
                                <div className="rounded-xl border-2 border-beige-400 bg-beige-200 p-4 shadow-md">
                                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-beige-800">Your Rating</p>
                                  <StarRating
                                    bookingId={booking.id}
                                    initialRating={booking.rating}
                                    initialReview={booking.review ?? ""}
                                    readonly
                                  />
                                </div>
                              )}
                              {booking.status !== "completed" && (
                                <p className="text-xs text-beige-400 italic">Rating available after completion</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="section-padding bg-beige-50">
          <div className="section-container mx-auto max-w-3xl text-center">
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-beige-300 border-t-beige-600" />
            </div>
          </div>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}

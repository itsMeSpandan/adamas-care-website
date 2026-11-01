"use client";

import { useState, useEffect, Suspense, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth, AuthUser } from "@/lib/auth-context";
import PasswordToggle from "@/components/ui/PasswordToggle";

import {
  displayTime,
  formatBookingDate,
  getBookingServices,
  formatServiceNames,
} from "@/lib/utils";
import { statusColors } from "@/lib/constants";
import CountryCodeSelect from "@/components/ui/CountryCodeSelect";
import {
  absorbPhoneInput,
  composePhoneNumber,
  splitPhoneNumber,
  DEFAULT_COUNTRY,
} from "@/lib/countries";
import { validateWhatsAppNumber } from "@/lib/whatsapp-prompt";
import { parseSectionFromUrl, ProfileSection } from "@/lib/profile-utils";
import { MemberCard, MemberCardSkeleton } from "@/components/profile/MemberCard";
import {
  ProfileSettingsList,
  ProfileSettingsListSkeleton,
} from "@/components/profile/ProfileSettingsList";
import { ProfileSectionHeader } from "@/components/profile/ProfileSectionHeader";

interface WaitlistEntry {
  id: string;
  employee: { name: string; imageUrl: string };
  slotStart: string;
  slotEnd: string;
  /** UTC midnight of the salon's calendar day, as stored. */
  slotDate: string | null;
  status: "waiting" | "notified" | "claimed" | "expired";
  claimExpiresAt: string | null;
}

const waitlistStatusStyles: Record<string, string> = {
  waiting: "bg-amber-50 text-amber-700",
  notified: "bg-emerald-50 text-emerald-700",
  claimed: "bg-blue-50 text-blue-700",
  expired: "bg-[#EEE6DA] text-[#6B5F52]",
};

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
  bookingServices?: { service: { name: string } }[];
}

const SECTION_TITLES: Record<ProfileSection, string> = {
  profile: "Profile Details",
  security: "Security Settings",
  bookings: "My Bookings",
  waitlist: "My Waitlist",
};

function ProfileContent() {
  const { user, updateUser, isLoading } = useAuth();
  const searchParams = useSearchParams();

  // URL-driven navigation: support both ?section= and legacy ?tab=
  const activeSection = parseSectionFromUrl(searchParams);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Profile state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [phoneDial, setPhoneDial] = useState(`+${DEFAULT_COUNTRY.dial}`);

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

  // Waitlist state
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [loadingWaitlist, setLoadingWaitlist] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [waitlistNotice, setWaitlistNotice] = useState("");

  // Avatar upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setAvatarUrl(user.avatarUrl);
      const split = splitPhoneNumber(user.whatsappNumber);
      setPhoneDial(split.dial);
      setWhatsappNumber(split.national);
    }
  }, [user]);

  // Load bookings on demand when the bookings section is active
  useEffect(() => {
    if (activeSection === "bookings" && user) {
      setLoadingBookings(true);
      fetch(`/api/bookings`)
        .then((res) => res.json())
        .then((data) => {
          const myBookings = (data.bookings || data || []).filter(
            (b: Booking) => b.userId === user.id || b.email === user.email
          );
          setBookings(myBookings);
          setLoadingBookings(false);
        })
        .catch(() => setLoadingBookings(false));
    }
  }, [activeSection, user]);

  // Load waitlist entries on demand when the waitlist section is active
  useEffect(() => {
    if (activeSection !== "waitlist" || !user) return;
    setLoadingWaitlist(true);
    fetch("/api/waitlist/me")
      .then((res) => res.json())
      .then((data) => {
        setWaitlistEntries(data.entries || []);
        setLoadingWaitlist(false);
      })
      .catch(() => setLoadingWaitlist(false));
  }, [activeSection, user]);

  const handleClaimWaitlist = async (entryId: string) => {
    setClaimingId(entryId);
    setWaitlistNotice("");
    try {
      const res = await fetch(`/api/waitlist/${entryId}/claim`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setWaitlistNotice("Slot claimed — your appointment is confirmed.");
        setWaitlistEntries((prev) =>
          prev.map((e) => (e.id === entryId ? { ...e, status: "claimed" } : e))
        );
      } else {
        setWaitlistNotice(data.error || "Could not claim that slot.");
      }
    } catch {
      setWaitlistNotice("Could not claim that slot. Please try again.");
    } finally {
      setClaimingId(null);
    }
  };

  const handleProfileSave = async () => {
    if (!user) return;

    const composedPhone = whatsappNumber.trim()
      ? composePhoneNumber(phoneDial, whatsappNumber)
      : "";
    if (composedPhone) {
      const phoneError = validateWhatsAppNumber(composedPhone);
      if (phoneError) {
        setMessage(phoneError);
        return;
      }
    }

    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          name,
          email,
          avatarUrl,
          whatsappNumber: composedPhone,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setMessage(data.error || "Failed to update profile");
        return;
      }
      await res.json();
      updateUser({
        name,
        email,
        avatarUrl,
        whatsappNumber: composedPhone || null,
      } as Partial<AuthUser>);
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
    if (
      !window.confirm(
        "Are you sure you want to cancel this booking? This action cannot be undone."
      )
    )
      return;
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

  // Loading state with skeleton — avoids layout shift
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F1EA] py-8 sm:py-10 md:py-14 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col md:flex-row md:items-start gap-8 lg:gap-12">
            <div className="w-full md:w-[340px] shrink-0">
              <MemberCardSkeleton />
            </div>
            <div className="flex-1 min-w-0">
              <ProfileSettingsListSkeleton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F5F1EA] py-16 px-4">
        <div className="mx-auto max-w-md text-center bg-white rounded-[22px] border border-[#E6DDD0] p-8 shadow-xs">
          <h1 className="font-serif text-3xl font-semibold text-[#2B241D] mb-3">
            My Profile
          </h1>
          <p className="text-sm text-[#6B5F52] mb-6">
            Please sign in to view your profile, bookings, and member points.
          </p>
          <Link
            href="/login"
            className="inline-flex w-full h-12 rounded-[12px] bg-[#A8573A] hover:bg-[#934a30] text-white font-medium text-sm items-center justify-center transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1EA] py-8 sm:py-10 md:py-14 px-4 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col md:flex-row md:items-start gap-8 lg:gap-12">
          {/* Left Column (about 340px on desktop):
              - Always visible on desktop.
              - On mobile: visible when on main settings list, hidden when inside a section */}
          <div
            className={`w-full md:w-[366px] lg:w-[420px] shrink-0 ${
              activeSection !== null ? "hidden md:block" : "block"
            }`}
          >
            <MemberCard
              name={user.name}
              role={user.role}
              loyaltyPoints={user.loyaltyPoints}
              createdAt={user.createdAt}
              userId={user.id}
            />
          </div>

          {/* Right Column:
              - When activeSection is null: shows the grouped settings list.
              - When activeSection is set: shows the section with a Back link */}
          <div className="flex-1 min-w-0">
            {activeSection === null && <ProfileSettingsList />}

            {activeSection !== null && (
              <div>
                <ProfileSectionHeader title={SECTION_TITLES[activeSection]} />

                {/* Profile Details Form */}
                {activeSection === "profile" && (
                  <div className="bg-white rounded-[20px] border border-[#E6DDD0] p-6 sm:p-8 shadow-xs">
                    <h2 className="hidden md:block font-serif text-2xl font-semibold text-[#2B241D] mb-6">
                      Profile Details
                    </h2>

                    {message && (
                      <div
                        className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
                          message.includes("success")
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-red-200 bg-red-50 text-red-700"
                        }`}
                      >
                        {message}
                      </div>
                    )}

                    <div className="flex flex-col items-start gap-6 sm:flex-row">
                      {/* Avatar upload */}
                      <div className="flex flex-col items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="group relative h-24 w-24 overflow-hidden rounded-full border-2 border-[#E6DDD0] transition-all hover:border-[#A8573A] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A8573A]"
                          disabled={uploadingAvatar}
                          aria-label="Upload profile photo"
                        >
                          <Image
                            src={avatarUrl || user.avatarUrl}
                            alt={user.name}
                            fill
                            className="object-cover"
                            sizes="96px"
                          />
                          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-all group-hover:bg-black/40">
                            {uploadingAvatar ? (
                              <span className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                              <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="white"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                                className="opacity-0 transition-opacity group-hover:opacity-100"
                              >
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
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
                        <p className="text-xs text-[#6B5F52]">Click to change photo</p>
                      </div>

                      <div className="flex-1 w-full space-y-4">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-[#2B241D]">
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-xl border border-[#E6DDD0] bg-[#FAF7F2] px-4 py-3 text-sm text-[#2B241D] placeholder:text-[#6B5F52]/60 focus:border-[#A8573A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#A8573A]/20 transition-colors"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-medium text-[#2B241D]">
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-xl border border-[#E6DDD0] bg-[#FAF7F2] px-4 py-3 text-sm text-[#2B241D] placeholder:text-[#6B5F52]/60 focus:border-[#A8573A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#A8573A]/20 transition-colors"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="profile-whatsapp"
                            className="mb-1 block text-sm font-medium text-[#2B241D]"
                          >
                            Phone Number (WhatsApp)
                          </label>
                          <div className="flex gap-2">
                            <CountryCodeSelect
                              value={phoneDial}
                              onChange={setPhoneDial}
                              ariaLabel="Country dial code"
                              className="w-[118px] shrink-0"
                            />
                            <input
                              id="profile-whatsapp"
                              type="tel"
                              inputMode="tel"
                              autoComplete="tel"
                              value={whatsappNumber}
                              onChange={(e) => {
                                const next = absorbPhoneInput(e.target.value, phoneDial);
                                setPhoneDial(next.dial);
                                setWhatsappNumber(next.national);
                              }}
                              placeholder="98765 43210"
                              className="min-w-0 flex-1 rounded-xl border border-[#E6DDD0] bg-[#FAF7F2] px-4 py-3 text-sm text-[#2B241D] placeholder:text-[#6B5F52]/60 focus:border-[#A8573A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#A8573A]/20 transition-colors"
                            />
                          </div>
                          <p className="mt-1.5 text-xs text-[#6B5F52]">
                            Used to pre-fill your contact info when booking treatments.
                          </p>
                        </div>

                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handleProfileSave}
                            disabled={saving}
                            className="h-11 px-6 rounded-xl bg-[#A8573A] hover:bg-[#934a30] active:scale-[0.99] text-white font-medium text-sm transition-all shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A8573A] focus-visible:ring-offset-2 disabled:opacity-50"
                          >
                            {saving ? "Saving..." : "Save Changes"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Security Settings Form */}
                {activeSection === "security" && (
                  <div className="bg-white rounded-[20px] border border-[#E6DDD0] p-6 sm:p-8 shadow-xs">
                    <h2 className="hidden md:block font-serif text-2xl font-semibold text-[#2B241D] mb-6">
                      Security Settings
                    </h2>

                    {message && (
                      <div
                        className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
                          message.includes("success")
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-red-200 bg-red-50 text-red-700"
                        }`}
                      >
                        {message}
                      </div>
                    )}

                    <div className="space-y-4 max-w-lg">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-[#2B241D]">
                          Current Password
                        </label>
                        <div className="relative">
                          <input
                            type={showCurrentPassword ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter current password"
                            className="w-full rounded-xl border border-[#E6DDD0] bg-[#FAF7F2] px-4 py-3 pr-12 text-sm text-[#2B241D] placeholder:text-[#6B5F52]/60 focus:border-[#A8573A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#A8573A]/20 transition-colors"
                          />
                          <PasswordToggle
                            show={showCurrentPassword}
                            onToggle={() => setShowCurrentPassword(!showCurrentPassword)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-[#2B241D]">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            className="w-full rounded-xl border border-[#E6DDD0] bg-[#FAF7F2] px-4 py-3 pr-12 text-sm text-[#2B241D] placeholder:text-[#6B5F52]/60 focus:border-[#A8573A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#A8573A]/20 transition-colors"
                          />
                          <PasswordToggle
                            show={showNewPassword}
                            onToggle={() => setShowNewPassword(!showNewPassword)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-[#2B241D]">
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            className="w-full rounded-xl border border-[#E6DDD0] bg-[#FAF7F2] px-4 py-3 pr-12 text-sm text-[#2B241D] placeholder:text-[#6B5F52]/60 focus:border-[#A8573A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#A8573A]/20 transition-colors"
                          />
                          <PasswordToggle
                            show={showConfirmPassword}
                            onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handlePasswordChange}
                          disabled={
                            saving ||
                            !currentPassword ||
                            !newPassword ||
                            !confirmPassword
                          }
                          className="h-11 px-6 rounded-xl bg-[#A8573A] hover:bg-[#934a30] active:scale-[0.99] text-white font-medium text-sm transition-all shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A8573A] focus-visible:ring-offset-2 disabled:opacity-50"
                        >
                          {saving ? "Updating..." : "Change Password"}
                        </button>
                      </div>

                      {/* Clean placeholder for future Play Store account deletion compliance */}
                      <div className="pt-8 border-t border-[#EEE6DA] mt-8">
                        <h3 className="text-sm font-semibold text-[#2B241D]">
                          Account Deletion
                        </h3>
                        <p className="text-xs text-[#6B5F52] mt-1">
                          Need to permanently delete your account and personal data?
                          Contact support at support@adamascare.com. Self-service account
                          deletion will be available in an upcoming release.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* My Bookings List */}
                {activeSection === "bookings" && (
                  <div className="bg-white rounded-[20px] border border-[#E6DDD0] overflow-hidden shadow-xs">
                    <div className="border-b border-[#EEE6DA] px-6 py-4 flex items-center justify-between">
                      <h2 className="font-serif text-xl font-semibold text-[#2B241D]">
                        My Bookings
                      </h2>
                      <Link
                        href="/booking"
                        className="text-xs font-medium text-[#A8573A] hover:underline"
                      >
                        Book another appointment →
                      </Link>
                    </div>

                    {loadingBookings ? (
                      <div className="flex items-center justify-center py-16">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E6DDD0] border-t-[#A8573A]" />
                      </div>
                    ) : bookings.length === 0 ? (
                      <div className="px-6 py-16 text-center">
                        <p className="text-sm text-[#6B5F52]">No bookings found.</p>
                        <Link
                          href="/booking"
                          className="mt-4 inline-flex h-11 px-6 rounded-xl bg-[#A8573A] hover:bg-[#934a30] text-white font-medium text-sm items-center justify-center transition-colors shadow-xs"
                        >
                          Book an Appointment
                        </Link>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#EEE6DA]">
                        {bookings.map((booking) => (
                          <div key={booking.id} className="px-6 py-5">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-3">
                                  <h3 className="text-sm font-semibold text-[#2B241D]">
                                    {formatServiceNames(booking)}
                                  </h3>
                                  <span
                                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                      statusColors[booking.status] ?? ""
                                    }`}
                                  >
                                    {booking.status}
                                  </span>
                                </div>
                                {getBookingServices(booking).length > 1 && (
                                  <div className="flex flex-wrap gap-1">
                                    {getBookingServices(booking).map((s, idx) => (
                                      <span
                                        key={idx}
                                        className="inline-block rounded-md bg-[#FAF7F2] border border-[#E6DDD0] px-2 py-0.5 text-[11px] font-medium text-[#2B241D]"
                                      >
                                        {s.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <p className="text-sm text-[#6B5F52]">
                                  {formatBookingDate(booking.date)} &middot;{" "}
                                  {booking.timeSlot}
                                </p>
                                <p className="text-sm font-medium text-[#A8573A]">
                                  ₹{booking.price}
                                </p>
                              </div>

                              <div className="space-y-2 sm:w-72">
                                {/* Cancel button for pending/confirmed bookings */}
                                {(booking.status === "pending" ||
                                  booking.status === "confirmed") && (
                                  <button
                                    type="button"
                                    onClick={() => handleCancelBooking(booking.id)}
                                    disabled={cancellingId === booking.id}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {cancellingId === booking.id ? (
                                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-red-300 border-t-red-600" />
                                    ) : (
                                      <svg
                                        width="12"
                                        height="12"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                      >
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                      </svg>
                                    )}
                                    {cancellingId === booking.id
                                      ? "Cancelling..."
                                      : "Cancel Booking"}
                                  </button>
                                )}

                                {/* Feedback / Rating Action */}
                                {booking.status === "completed" && !booking.rating && (
                                  <div className="rounded-xl border border-[#C97B5C]/30 bg-[#FAF7F2] p-4 flex items-center justify-between">
                                    <div>
                                      <p className="text-xs font-bold text-[#2B241D]">
                                        How was your visit?
                                      </p>
                                      <p className="text-[11px] text-[#6B5F52]">
                                        Rate your specialist and experience
                                      </p>
                                    </div>
                                    <Link
                                      href={`/account/feedback/${booking.id}`}
                                      className="rounded-lg bg-[#A8573A] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#934a30] transition-colors"
                                    >
                                      Rate Visit →
                                    </Link>
                                  </div>
                                )}
                                {booking.status === "completed" && !!booking.rating && (
                                  <div className="rounded-xl border border-[#E6DDD0] bg-[#FAF7F2] p-3.5 flex items-center justify-between">
                                    <div>
                                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B5F52]">
                                        Your Rating
                                      </p>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-amber-500 font-bold text-sm">
                                          ★ {booking.rating}/5
                                        </span>
                                        {booking.review && (
                                          <span className="text-xs text-[#6B5F52] italic truncate max-w-[200px]">
                                            &ldquo;{booking.review}&rdquo;
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <span className="text-xs text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                      Reviewed ✓
                                    </span>
                                  </div>
                                )}
                                {booking.status !== "completed" && (
                                  <p className="text-xs text-[#6B5F52] italic">
                                    Rating available after completion
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* My Waitlist List */}
                {activeSection === "waitlist" && (
                  <div className="bg-white rounded-[20px] border border-[#E6DDD0] overflow-hidden shadow-xs">
                    <div className="flex items-center justify-between gap-4 border-b border-[#EEE6DA] px-6 py-4">
                      <h2 className="font-serif text-xl font-semibold text-[#2B241D]">
                        My Waitlist
                      </h2>
                      <Link
                        href="/account/waitlist"
                        className="text-xs font-medium text-[#6B5F52] transition-colors hover:text-[#2B241D]"
                      >
                        Full waitlist page →
                      </Link>
                    </div>

                    {waitlistNotice && (
                      <div className="border-b border-[#EEE6DA] bg-[#FAF7F2] px-6 py-3 text-sm text-[#2B241D]">
                        {waitlistNotice}
                      </div>
                    )}

                    {loadingWaitlist ? (
                      <div className="flex items-center justify-center py-16">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E6DDD0] border-t-[#A8573A]" />
                      </div>
                    ) : waitlistEntries.length === 0 ? (
                      <div className="px-6 py-16 text-center">
                        <p className="text-sm text-[#6B5F52]">
                          You are not on any waitlist. When a slot you want is taken,
                          join the waitlist and we will notify you the moment it opens
                          up.
                        </p>
                        <Link
                          href="/booking"
                          className="mt-4 inline-flex h-11 px-6 rounded-xl bg-[#A8573A] hover:bg-[#934a30] text-white font-medium text-sm items-center justify-center transition-colors shadow-xs"
                        >
                          Find a slot
                        </Link>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#EEE6DA]">
                        {waitlistEntries.map((entry) => {
                          const canClaim =
                            entry.status === "notified" &&
                            !!entry.claimExpiresAt &&
                            new Date(entry.claimExpiresAt) > new Date();
                          return (
                            <div
                              key={entry.id}
                              className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                  <h3 className="text-sm font-semibold text-[#2B241D]">
                                    {entry.employee?.name}
                                  </h3>
                                  <span
                                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                      waitlistStatusStyles[entry.status] ??
                                      "bg-[#FAF7F2] text-[#6B5F52]"
                                    }`}
                                  >
                                    {entry.status === "notified"
                                      ? "slot available"
                                      : entry.status}
                                  </span>
                                </div>
                                <p className="text-sm text-[#6B5F52]">
                                  {entry.slotDate
                                    ? `${formatBookingDate(entry.slotDate)} · `
                                    : ""}
                                  {displayTime(entry.slotStart)} –{" "}
                                  {displayTime(entry.slotEnd)}
                                </p>
                                {canClaim && entry.claimExpiresAt && (
                                  <p className="text-xs font-medium text-emerald-600">
                                    Claim by{" "}
                                    {new Date(entry.claimExpiresAt).toLocaleTimeString(
                                      "en-US",
                                      {
                                        hour: "numeric",
                                        minute: "2-digit",
                                      }
                                    )}
                                  </p>
                                )}
                              </div>

                              {canClaim && (
                                <button
                                  type="button"
                                  onClick={() => handleClaimWaitlist(entry.id)}
                                  disabled={claimingId === entry.id}
                                  className="h-10 px-5 rounded-xl bg-[#A8573A] hover:bg-[#934a30] text-white font-medium text-sm transition-colors shadow-xs disabled:opacity-50"
                                >
                                  {claimingId === entry.id
                                    ? "Claiming..."
                                    : "Claim Slot"}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
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
        <div className="min-h-screen bg-[#F5F1EA] py-8 sm:py-10 md:py-14 px-4 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-col md:flex-row md:items-start gap-8 lg:gap-12">
              <div className="w-full md:w-[340px] shrink-0">
                <MemberCardSkeleton />
              </div>
              <div className="flex-1 min-w-0">
                <ProfileSettingsListSkeleton />
              </div>
            </div>
          </div>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}

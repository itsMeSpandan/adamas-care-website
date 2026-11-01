"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth-context";
import StaggeredMenu, { StaggeredMenuHandle } from "@/components/ui/StaggeredMenu";

const LoginModal = dynamic(() => import("@/components/ui/LoginModal"), {
  ssr: false,
});

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

export default function Navbar() {
  const { user, isAuthenticated, logout, isAdmin, isEmployee } = useAuth();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loginOpen, setLoginOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const staggeredMenuRef = useRef<StaggeredMenuHandle>(null);

  // User display name & initials derived from authenticated session
  const displayName = user?.name
    ? user.name.trim().split(/\s+/)[0]
    : user?.email
    ? user.email.split("@")[0]
    : "Member";

  const userInitials = user?.name
    ? user.name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : "U";

  // Role-based menu items for StaggeredMenu
  const guestItems = [
    { label: "Home", link: "/" },
    { label: "Services", link: "/services" },
    { label: "Book Appointment", link: "/booking" },
    { label: "Our Team", link: "/team" },
    { label: "About", link: "/about" },
    { label: "Contact", link: "/contact" },
    {
      label: "Sign In",
      link: "#signin",
      onClick: () => setLoginOpen(true),
    },
  ];

  const userItems = [
    { label: "Home", link: "/" },
    { label: "Services", link: "/services" },
    { label: "Book Appointment", link: "/booking" },
    { label: "Our Team", link: "/team" },
    { label: "Profile", link: "/profile" },
    { label: "Rewards & Points", link: "/rewards" },
    { label: "Contact", link: "/contact" },
  ];

  const employeeItems = [
    { label: "Home", link: "/" },
    { label: "Dashboard", link: "/employee" },
    { label: "Services", link: "/services" },
    { label: "Bookings", link: "/booking" },
    { label: "Profile", link: "/profile" },
  ];

  const adminItems = [
    { label: "Home", link: "/" },
    { label: "Dashboard", link: "/admin" },
    { label: "Services", link: "/admin/services" },
    { label: "Schedule", link: "/admin/schedule" },
    { label: "Employees", link: "/admin/employees" },
    { label: "Bookings", link: "/admin/bookings" },
  ];

  let menuItems = guestItems;
  if (isAdmin) {
    menuItems = adminItems;
  } else if (isEmployee) {
    menuItems = employeeItems;
  } else if (isAuthenticated) {
    menuItems = userItems;
  }

  // Fetch real notifications if authenticated
  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch("/api/notifications?limit=5");
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data.notifications) ? data.notifications : [];
        setNotifications(items);
        if (typeof data.unreadCount === "number") {
          setHasUnreadNotifications(data.unreadCount > 0);
        }
      }
    } catch {
      // offline / transient
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Handle clicking outside of dropdowns
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle ESC key to close open menus
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setUserMenuOpen(false);
        setNotificationsOpen(false);
        staggeredMenuRef.current?.close();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleNotifications = () => {
    const next = !notificationsOpen;
    setNotificationsOpen(next);
    if (next) {
      setUserMenuOpen(false);
      setHasUnreadNotifications(false);
      if (isAuthenticated) {
        fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ all: true }),
        }).catch(() => {});
      }
    }
  };

  const toggleUserMenu = () => {
    setUserMenuOpen((prev) => !prev);
    setNotificationsOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[#F4EFE8] border-b border-[#DDD3C7] shadow-none font-inter">
        <div className="mx-auto w-full max-w-[1280px] h-[88px] px-5 sm:px-8 md:px-[40px] flex items-center justify-between">
          {/* ── LEFT: LOGO ── */}
          <Link
            href="/"
            className="group flex flex-col items-center select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420] rounded-sm py-1"
            aria-label="Adamas Care Home"
          >
            <span className="font-serif text-[32px] font-medium leading-none tracking-[0.16em] text-[#2B2420] transition-opacity group-hover:opacity-90">
              ADAMAS
            </span>
            <div className="flex items-center justify-center gap-2 mt-1.5 w-full">
              <span className="w-[26px] h-[1px] bg-[#6B5C50] shrink-0" aria-hidden="true" />
              <span className="text-[10px] font-sans font-medium uppercase tracking-[0.5em] text-[#6B5C50] translate-x-[0.25em] leading-none">
                CARE
              </span>
              <span className="w-[26px] h-[1px] bg-[#6B5C50] shrink-0" aria-hidden="true" />
            </div>
          </Link>

          {/* ── RIGHT: ACTIONS (24px gap, vertically centered) ── */}
          <div className="flex items-center gap-3 sm:gap-[24px]">
            {/* Authenticated Member Actions (Notification Bell + Divider + User Menu + Divider) */}
            {isAuthenticated && user && (
              <>
                {/* 1. Notification bell */}
                <div ref={notificationsRef} className="relative">
                  <button
                    type="button"
                    onClick={toggleNotifications}
                    aria-label="Notifications"
                    aria-haspopup="dialog"
                    aria-expanded={notificationsOpen}
                    className="w-11 h-11 flex items-center justify-center bg-transparent border-none p-0 relative rounded-full hover:bg-[#EAE2D7]/70 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420] cursor-pointer"
                  >
                    {/* Thin-stroke (1.6px) outline bell icon */}
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#2B2420"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                    </svg>

                    {/* 8px coral dot (#B5503C) at top-right for unread state */}
                    {hasUnreadNotifications && (
                      <span
                        className="absolute top-[10px] right-[10px] w-2 h-2 rounded-full bg-[#B5503C] ring-2 ring-[#F4EFE8]"
                        aria-hidden="true"
                      />
                    )}
                  </button>

                  {/* Notifications Popover */}
                  {notificationsOpen && (
                    <div
                      role="region"
                      aria-label="Notification list"
                      className="absolute right-[-60px] sm:right-0 top-full mt-3 w-80 max-w-[calc(100vw-32px)] bg-white rounded-[18px] border border-[#DDD3C7] shadow-[0_12px_32px_rgba(43,36,32,0.12)] overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150"
                    >
                      <div className="flex items-center justify-between border-b border-[#EEE6DA] px-5 py-3.5 bg-[#FAF7F2]">
                        <span className="text-[14px] font-semibold text-[#2B2420]">
                          Notifications
                        </span>
                        {notifications.length > 0 && (
                          <span className="text-[11px] font-medium text-[#6B5C50] bg-[#E8DDD0] px-2 py-0.5 rounded-full">
                            {notifications.length}
                          </span>
                        )}
                      </div>

                      <div className="max-h-72 overflow-y-auto divide-y divide-[#EEE6DA]">
                        {notifications.length === 0 ? (
                          <div className="px-5 py-8 text-center text-sm text-[#6B5C50]">
                            <p className="font-medium text-[#2B2420]">All caught up!</p>
                            <p className="text-xs mt-1">
                              You will receive updates on booking confirmations, reminders, and waitlist openings here.
                            </p>
                          </div>
                        ) : (
                          notifications.map((item) => (
                            <div key={item.id} className="p-4 hover:bg-[#FAF7F2] transition-colors">
                              <p className="text-xs font-semibold text-[#2B2420]">{item.title}</p>
                              <p className="text-xs text-[#6B5C50] mt-0.5 leading-relaxed">{item.body}</p>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="border-t border-[#EEE6DA] p-3 bg-[#FAF7F2] text-center">
                        <Link
                          href="/profile?section=bookings"
                          onClick={() => setNotificationsOpen(false)}
                          className="text-xs font-medium text-[#A8573A] hover:underline"
                        >
                          View my appointments →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Vertical divider (1px x 24px, #D8CCBE) */}
                <div className="w-[1px] h-[24px] bg-[#D8CCBE] shrink-0" aria-hidden="true" />

                {/* 3. User menu (no pill or border, 34px avatar, name, chevron) */}
                <div ref={userMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={toggleUserMenu}
                    aria-label="Account menu"
                    aria-haspopup="menu"
                    aria-expanded={userMenuOpen}
                    className="flex items-center gap-[12px] bg-transparent border-none p-0 cursor-pointer min-h-[44px] rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420] group"
                  >
                    {/* 34px circular avatar with #E4D8CA bg, initials in #5B4636 */}
                    <div className="w-[34px] h-[34px] rounded-full bg-[#E4D8CA] flex items-center justify-center shrink-0 text-[12px] font-medium text-[#5B4636] font-sans select-none shadow-xs group-hover:opacity-90 transition-opacity overflow-hidden relative">
                      {user.avatarUrl ? (
                        <Image
                          src={user.avatarUrl}
                          alt={user.name || displayName}
                          fill
                          sizes="34px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : null}
                      <span className={user.avatarUrl ? "sr-only" : ""}>{userInitials}</span>
                    </div>

                    {/* Name (15px, medium) - hidden on mobile */}
                    <span className="hidden sm:inline text-[15px] font-medium text-[#2B2420] font-sans">
                      {displayName}
                    </span>

                    {/* Small chevron-down icon */}
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#2B2420"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className={`transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {/* User Menu Popover */}
                  {userMenuOpen && (
                    <div
                      role="menu"
                      aria-label="Account settings"
                      className="absolute right-0 top-full mt-3 w-60 bg-white rounded-[18px] border border-[#DDD3C7] shadow-[0_12px_32px_rgba(43,36,32,0.12)] py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                    >
                      {/* User identity card */}
                      <div className="px-4 py-3 border-b border-[#EEE6DA]">
                        <p className="text-sm font-semibold text-[#2B2420] truncate">
                          {user.name || displayName}
                        </p>
                        <p className="text-xs text-[#6B5C50] truncate mt-0.5">
                          {user.email}
                        </p>
                        {isAdmin && (
                          <span className="mt-1.5 inline-block rounded-full bg-[#FAF7F2] border border-[#DDD3C7] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#A8573A]">
                            Admin
                          </span>
                        )}
                        {isEmployee && (
                          <span className="mt-1.5 inline-block rounded-full bg-[#FAF7F2] border border-[#DDD3C7] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#6B5C50]">
                            Specialist
                          </span>
                        )}
                      </div>

                      {/* Menu Links */}
                      <div className="py-1">
                        <Link
                          href="/profile?section=profile"
                          role="menuitem"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#2B2420] hover:bg-[#FAF7F2] transition-colors"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-[#6B5C50]">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                          <span>Profile Details</span>
                        </Link>

                        <Link
                          href="/profile?section=bookings"
                          role="menuitem"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#2B2420] hover:bg-[#FAF7F2] transition-colors"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-[#6B5C50]">
                            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" x2="21" y1="10" y2="10" />
                          </svg>
                          <span>My Bookings</span>
                        </Link>

                        <Link
                          href="/profile?section=waitlist"
                          role="menuitem"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#2B2420] hover:bg-[#FAF7F2] transition-colors"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-[#6B5C50]">
                            <circle cx="12" cy="12" r="9" />
                            <polyline points="12 7 12 12 15.5 14" />
                          </svg>
                          <span>My Waitlist</span>
                        </Link>

                        <Link
                          href="/rewards"
                          role="menuitem"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#2B2420] hover:bg-[#FAF7F2] transition-colors"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-[#6B5C50]">
                            <circle cx="12" cy="8" r="6" />
                            <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                          </svg>
                          <span>Rewards & Points</span>
                        </Link>

                        {isAdmin && (
                          <Link
                            href="/admin"
                            role="menuitem"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#A8573A] font-medium hover:bg-[#FAF7F2] transition-colors"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <rect width="18" height="18" x="3" y="3" rx="2" />
                              <path d="M3 9h18" />
                              <path d="M9 21V9" />
                            </svg>
                            <span>Admin Console</span>
                          </Link>
                        )}

                        {isEmployee && (
                          <Link
                            href="/employee"
                            role="menuitem"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#2B2420] font-medium hover:bg-[#FAF7F2] transition-colors"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-[#6B5C50]">
                              <rect width="18" height="18" x="3" y="3" rx="2" />
                              <path d="M9 3v18" />
                            </svg>
                            <span>Specialist View</span>
                          </Link>
                        )}
                      </div>

                      <div className="border-t border-[#EEE6DA] pt-1">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setUserMenuOpen(false);
                            logout();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50/60 transition-colors text-left cursor-pointer"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                          </svg>
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Vertical divider (1px x 24px, #D8CCBE) */}
                <div className="w-[1px] h-[24px] bg-[#D8CCBE] shrink-0" aria-hidden="true" />
              </>
            )}

            {/* 5. HAMBURGER MENU (Triggers previous StaggeredMenu with exact icon) */}
            <button
              type="button"
              onClick={() => staggeredMenuRef.current?.toggle()}
              aria-label="Open menu"
              className="w-11 h-11 flex items-center justify-center bg-transparent border-none p-0 cursor-pointer rounded-lg hover:bg-[#EAE2D7]/70 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420]"
            >
              {/* Exact matching icon:
                  - Top line: x=4.5 to 19.5, y=6
                  - Middle line: x=4.5 to 12.5, y=12 (short, ~55%)
                  - Bottom line: x=4.5 to 19.5, y=18
                  - Stroke 2.4px, round caps, espresso color */}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2B2420"
                strokeWidth="2.4"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <line x1="4.5" y1="6" x2="19.5" y2="6" />
                <line x1="4.5" y1="12" x2="12.5" y2="12" />
                <line x1="4.5" y1="18" x2="19.5" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── Previous Full-Screen StaggeredMenu connected to hamburger button ── */}
      <StaggeredMenu
        ref={staggeredMenuRef}
        position="right"
        renderHeader={false}
        renderToggle={false}
        items={menuItems}
        socialItems={[{ label: "WhatsApp", link: "https://wa.me/919238381831" }]}
        displaySocials={true}
        displayItemNumbering={true}
        menuButtonColor="#2B2420"
        openMenuButtonColor="#2B2420"
        changeMenuColorOnOpen={false}
        colors={["#e8ddd3", "#c9b8a8"]}
        accentColor="#C97B5C"
        isFixed={true}
        logoUrl="/logo.png"
        onMenuOpen={() => {
          setUserMenuOpen(false);
          setNotificationsOpen(false);
        }}
      />

      {/* Login Modal */}
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}

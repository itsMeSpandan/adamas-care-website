"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth-context";
import { StaggeredMenu } from "@/components/ui/StaggeredMenu";
import UserPanel from "@/components/ui/UserPanel";
import "./PillNav.css";

const LoginModal = dynamic(() => import("@/components/ui/LoginModal"), {
  ssr: false,
});

interface PillNavItem {
  label: string;
  href: string;
  ariaLabel?: string;
}

interface PillNavProps {
  logo?: string;
  logoAlt?: string;
  items: PillNavItem[];
  activeHref?: string;
  className?: string;
  ease?: string;
  baseColor?: string;
  pillColor?: string;
  pillHoverBg?: string;
  hoveredPillTextColor?: string;
  pillTextColor?: string;
  initialLoadAnimation?: boolean;
}

const PillNav = ({
  logo = "/logo.svg",
  logoAlt = "Grace Salon",
  items,
}: PillNavProps) => {
  const { isAuthenticated } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* ── Brand bar: logo + name on the left, auth controls on the right ── */}
      <div className={`global-brand-bar${scrolled ? " scrolled" : ""}`}>
        <Link className="global-brand" href="/" aria-label="Home">
          <Image src={logo} alt={logoAlt} className="global-brand-logo" width={110} height={24} />
          <span className="global-brand-name">{logoAlt}</span>
        </Link>
        <div className="global-brand-auth">
          {isAuthenticated ? (
            <UserPanel />
          ) : (
            <button
              onClick={() => setLoginOpen(true)}
              className="global-brand-signin"
              aria-label="Sign in"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* ── StaggeredMenu on all screen sizes ── */}
      <div className="global-staggered-menu">
        <StaggeredMenu
          position="right"
          renderHeader={false}
          items={[
            ...items.map((item) => ({
              label: item.label,
              ariaLabel: item.ariaLabel || item.label,
              link: item.href,
            })),
            { label: "Book Appointment", ariaLabel: "Book Appointment", link: "/booking" },
          ]}
          socialItems={[
            { label: "WhatsApp", link: "https://wa.me/919238381831" },
          ]}
          displaySocials={true}
          displayItemNumbering={true}
          menuButtonColor="#1F1F1F"
          openMenuButtonColor="#1F1F1F"
          changeMenuColorOnOpen={false}
          colors={["#e8ddd3", "#c9b8a8"]}
          accentColor="#C97B5C"
          isFixed={true}
          logoUrl={logo}
        />
      </div>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
};

export default PillNav;

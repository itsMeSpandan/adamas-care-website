"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const LoginModal = dynamic(() => import("@/components/ui/LoginModal"), {
  ssr: false,
});
import { StaggeredMenu } from "@/components/ui/StaggeredMenu";
import "./PillNav.css";

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
  activeHref,
  className = "",
  ease = "power3.easeOut",
  baseColor = "#fff",
  pillColor = "#120F17",
  pillHoverBg = "#C9A86A",
  hoveredPillTextColor = "#120F17",
  pillTextColor,
  initialLoadAnimation = true,
}: PillNavProps) => {
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const resolvedPillTextColor = pillTextColor ?? baseColor;
  const [loginOpen, setLoginOpen] = useState(false);
  const circleRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const tlRefs = useRef<(gsap.core.Timeline | null)[]>([]);
  const activeTweenRefs = useRef<(gsap.core.Tween | null)[]>([]);
  const navItemsRef = useRef<HTMLDivElement | null>(null);
  const logoRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const layout = () => {
      circleRefs.current.forEach((circle) => {
        if (!circle?.parentElement) return;

        const pill = circle.parentElement;
        const rect = pill.getBoundingClientRect();
        const { width: w, height: h } = rect;
        const R = (w * w / 4 + h * h) / (2 * h);
        const D = Math.ceil(2 * R) + 2;
        const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;
        const originY = D - delta;

        circle.style.width = `${D}px`;
        circle.style.height = `${D}px`;
        circle.style.bottom = `-${delta}px`;

        gsap.set(circle, {
          xPercent: -50,
          scale: 0,
          transformOrigin: `50% ${originY}px`,
        });

        const label = pill.querySelector(".pill-label");
        const white = pill.querySelector(".pill-label-hover");

        if (label) gsap.set(label, { y: 0 });
        if (white) gsap.set(white, { y: h + 12, opacity: 0 });

        const index = circleRefs.current.indexOf(circle);
        if (index === -1) return;

        tlRefs.current[index]?.kill();
        const tl = gsap.timeline({ paused: true });

        tl.to(circle, { scale: 1.2, xPercent: -50, duration: 2, ease, overwrite: "auto" }, 0);

        if (label) {
          tl.to(label, { y: -(h + 8), duration: 2, ease, overwrite: "auto" }, 0);
        }

        if (white) {
          gsap.set(white, { y: Math.ceil(h + 100), opacity: 0 });
          tl.to(white, { y: 0, opacity: 1, duration: 2, ease, overwrite: "auto" }, 0);
        }

        tlRefs.current[index] = tl;
      });
    };

    layout();

    const onResize = () => layout();
    window.addEventListener("resize", onResize);

    if (document.fonts?.ready) {
      document.fonts.ready.then(layout).catch(() => {});
    }

    if (initialLoadAnimation) {
      const logo = logoRef.current;
      const navItems = navItemsRef.current;

      if (logo) {
        gsap.set(logo, { scale: 0, transformOrigin: "left center" });
        gsap.to(logo, { scale: 1, duration: 0.6, ease });
      }

      if (navItems) {
        gsap.set(navItems, { opacity: 0, x: 20 });
        gsap.to(navItems, { opacity: 1, x: 0, duration: 0.5, ease, delay: 0.15 });
      }
    }

    return () => window.removeEventListener("resize", onResize);
  }, [items, ease, initialLoadAnimation]);

  const handleEnter = (i: number) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(tl.duration(), {
      duration: 0.3,
      ease,
      overwrite: "auto",
    });
  };

  const handleLeave = (i: number) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(0, {
      duration: 0.2,
      ease,
      overwrite: "auto",
    });
  };

  const cssVars = {
    ["--base" as string]: baseColor,
    ["--pill-bg" as string]: pillColor,
    ["--pill-hover-bg" as string]: pillHoverBg,
    ["--hover-text" as string]: hoveredPillTextColor,
    ["--pill-text" as string]: resolvedPillTextColor,
  };

  return (
    <>
      {/* ── Desktop: Pill navigation (hidden on mobile via CSS) ── */}
      <div className="pill-nav-container desktop-pill-nav">
        <nav className={`pill-nav ${className}`} aria-label="Primary" style={cssVars}>
          {/* Brand: logo + name on the left */}
          <Link
            className="pill-brand"
            href="/"
            aria-label="Home"
            ref={logoRef}
          >
            <img src={logo} alt={logoAlt} className="pill-brand-logo" loading="lazy" decoding="async" />
            <span className="pill-brand-name">{logoAlt}</span>
          </Link>

          <div className="pill-nav-items" ref={navItemsRef}>
            <ul className="pill-list" role="menubar">
              {items.map((item, i) => (
                <li key={item.href || `item-${i}`} role="none">
                  <Link
                    role="menuitem"
                    href={item.href}
                    className={`pill${activeHref === item.href ? " is-active" : ""}`}
                    aria-label={item.ariaLabel || item.label}
                    onMouseEnter={() => handleEnter(i)}
                    onMouseLeave={() => handleLeave(i)}
                  >
                    <span
                      className="hover-circle"
                      aria-hidden="true"
                      ref={(el) => {
                        circleRefs.current[i] = el;
                      }}
                    />
                    <span className="label-stack">
                      <span className="pill-label">{item.label}</span>
                      <span className="pill-label-hover" aria-hidden="true">
                        {item.label}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {isAuthenticated && (
            <button
              type="button"
              onClick={() => {
                logout();
                router.push("/");
              }}
              aria-label="Log out"
              className="pill-logout"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#DC2626"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
            </button>
          )}
        </nav>
      </div>

      {/* ── Mobile: brand + StaggeredMenu (hidden on desktop via CSS) ── */}
      <div className="mobile-staggered-menu">
        <div className="mobile-brand-bar">
          <Link className="mobile-brand" href="/" aria-label="Home">
            <img src={logo} alt={logoAlt} className="mobile-brand-logo" loading="lazy" decoding="async" />
            <span className="mobile-brand-name">{logoAlt}</span>
          </Link>
        </div>
        <StaggeredMenu
          position="right"
          renderHeader={false}
          items={items.map((item) => ({
            label: item.label,
            ariaLabel: item.ariaLabel || item.label,
            link: item.href,
          }))}
          socialItems={[
            { label: "Instagram", link: "https://instagram.com" },
            { label: "Facebook", link: "https://facebook.com" },
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

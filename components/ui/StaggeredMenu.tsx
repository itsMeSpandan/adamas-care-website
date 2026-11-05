"use client";

import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import Image from "next/image";
import "./StaggeredMenu.css";

export interface StaggeredMenuItem {
  label: string;
  ariaLabel?: string;
  link: string;
  onClick?: () => void;
  className?: string;
  danger?: boolean;
}

interface StaggeredMenuSocialItem {
  label: string;
  link: string;
}

export interface StaggeredMenuHandle {
  toggle: () => void;
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
}

interface StaggeredMenuProps {
  position?: "left" | "right";
  colors?: string[];
  items?: StaggeredMenuItem[];
  socialItems?: StaggeredMenuSocialItem[];
  displaySocials?: boolean;
  displayItemNumbering?: boolean;
  className?: string;
  logoUrl?: string;
  menuButtonColor?: string;
  openMenuButtonColor?: string;
  accentColor?: string;
  changeMenuColorOnOpen?: boolean;
  isFixed?: boolean;
  closeOnClickAway?: boolean;
  renderHeader?: boolean;
  renderToggle?: boolean;
  onMenuOpen?: () => void;
  onMenuClose?: () => void;
}

export const StaggeredMenu = React.forwardRef<StaggeredMenuHandle, StaggeredMenuProps>(
  (
    {
      position = "right",
      colors = ["#B497CF", "#5227FF"],
      items = [],
      socialItems = [],
      displaySocials = true,
      displayItemNumbering = true,
      className,
      logoUrl = "/logo.svg",
      menuButtonColor = "#fff",
      openMenuButtonColor = "#fff",
      accentColor = "#5227FF",
      changeMenuColorOnOpen = true,
      isFixed = false,
      closeOnClickAway = true,
      renderHeader = true,
      renderToggle = true,
      onMenuOpen,
      onMenuClose,
    },
    ref
  ) => {
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const panelRef = useRef<HTMLElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const preLayersRef = useRef<HTMLDivElement | null>(null);
  const preLayerElsRef = useRef<HTMLElement[]>([]);
  // The toggle is a hamburger: three bars that morph into a close (×) on open.
  const iconRef = useRef<HTMLSpanElement | null>(null);
  const barTopRef = useRef<HTMLSpanElement | null>(null);
  const barMidRef = useRef<HTMLSpanElement | null>(null);
  const barBotRef = useRef<HTMLSpanElement | null>(null);

  const openTlRef = useRef<gsap.core.Timeline | null>(null);
  const closeTweenRef = useRef<gsap.core.Tween | null>(null);
  const colorTweenRef = useRef<gsap.core.Tween | null>(null);
  const toggleBtnRef = useRef<HTMLButtonElement | null>(null);
  const busyRef = useRef(false);
  const itemEntranceTweenRef = useRef<gsap.core.Tween | null>(null);

  useLayoutEffect(() => {
    // Only run GSAP setup on client side
    if (typeof window === "undefined") return;

    const ctx = gsap.context(() => {
      const panel = panelRef.current;
      const backdrop = backdropRef.current;
      const preContainer = preLayersRef.current;
      const icon = iconRef.current;
      const barTop = barTopRef.current;
      const barMid = barMidRef.current;
      const barBot = barBotRef.current;
      if (!panel) return;

      let preLayers: HTMLElement[] = [];
      if (preContainer) {
        preLayers = Array.from(
          preContainer.querySelectorAll(".sm-prelayer")
        ) as HTMLElement[];
      }
      preLayerElsRef.current = preLayers;

      const offscreen = position === "left" ? -100 : 100;
      // Set initial hidden state via GSAP
      gsap.set(panel, { clearProps: 'transition' });
      gsap.set(panel, { xPercent: offscreen, opacity: 0 });

      if (backdrop) {
        gsap.set(backdrop, { clearProps: 'transition' });
        gsap.set(backdrop, { opacity: 0 });
      }

      gsap.set(preLayers, { clearProps: 'transition' });
      gsap.set(preLayers, { xPercent: offscreen, opacity: 1 });
      if (preContainer) {
        gsap.set(preContainer, { xPercent: 0, opacity: 1 });
      }

      // Closed state: three stacked bars centred on each other.
      if (icon && barTop && barMid && barBot) {
        gsap.set([barTop, barMid, barBot], {
          transformOrigin: "50% 50%",
          rotate: 0,
          x: 0,
          y: 0,
          opacity: 1,
          scaleX: 1,
        });
        gsap.set(icon, { transformOrigin: "50% 50%" });
      }
      if (toggleBtnRef.current)
        gsap.set(toggleBtnRef.current, { color: menuButtonColor });
    });
    return () => ctx.revert();
  }, [menuButtonColor, position]);

  const buildOpenTimeline = useCallback(() => {
    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    const backdrop = backdropRef.current;
    if (!panel) return null;

    openTlRef.current?.kill();
    if (closeTweenRef.current) {
      closeTweenRef.current.kill();
      closeTweenRef.current = null;
    }
    itemEntranceTweenRef.current?.kill();

    const itemEls = Array.from(
      panel.querySelectorAll(".sm-panel-itemLabel")
    );
    const numberEls = Array.from(
      panel.querySelectorAll(".sm-panel-list[data-numbering] .sm-panel-item")
    );
    const socialTitle = panel.querySelector(".sm-socials-title");
    const socialLinks = Array.from(
      panel.querySelectorAll(".sm-socials-link")
    );

    const offscreen = position === "left" ? -100 : 100;
    const layerStates = layers.map((el) => ({ el, start: offscreen }));
    const panelStart = offscreen;

    if (itemEls.length) {
      gsap.set(itemEls, { yPercent: 120, rotate: 6, opacity: 0 });
    }
    if (numberEls.length) {
      gsap.set(numberEls, { "--sm-num-opacity": 0 });
    }
    if (socialTitle) {
      gsap.set(socialTitle, { opacity: 0, y: 15 });
    }
    if (socialLinks.length) {
      gsap.set(socialLinks, { y: 20, opacity: 0 });
    }

    const tl = gsap.timeline({ paused: true });

    // 1. Subtle backdrop fade in
    if (backdrop) {
      tl.fromTo(
        backdrop,
        { opacity: 0 },
        { opacity: 1, duration: 0.38, ease: "power2.out" },
        0
      );
    }

    // 2. Pre-layers slide in gracefully with stagger
    layerStates.forEach((ls, i) => {
      tl.fromTo(
        ls.el,
        { xPercent: ls.start, opacity: 1 },
        { xPercent: 0, opacity: 1, duration: 0.45, ease: "power3.out" },
        i * 0.05
      );
    });

    const lastTime = layerStates.length
      ? (layerStates.length - 1) * 0.05
      : 0;
    const panelInsertTime = lastTime + (layerStates.length ? 0.06 : 0);
    const panelDuration = 0.5;

    // 3. Panel slides in smoothly
    tl.fromTo(
      panel,
      { xPercent: panelStart, opacity: 0.8 },
      { xPercent: 0, opacity: 1, duration: panelDuration, ease: "power3.out" },
      panelInsertTime
    );

    // 4. Staggered menu items appear with subtle, elegant upward lift
    if (itemEls.length) {
      const itemsStartRatio = 0.22;
      const itemsStart = panelInsertTime + panelDuration * itemsStartRatio;
      tl.to(
        itemEls,
        {
          yPercent: 0,
          rotate: 0,
          opacity: 1,
          duration: 0.6,
          ease: "power3.out",
          stagger: { each: 0.06, from: "start" },
        },
        itemsStart
      );
      if (numberEls.length) {
        tl.to(
          numberEls,
          {
            duration: 0.5,
            ease: "power2.out",
            "--sm-num-opacity": 1,
            stagger: { each: 0.06, from: "start" },
          },
          itemsStart + 0.08
        );
      }
    }

    // 5. Social links reveal
    if (socialTitle || socialLinks.length) {
      const socialsStart = panelInsertTime + panelDuration * 0.4;
      if (socialTitle) {
        tl.to(
          socialTitle,
          { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
          socialsStart
        );
      }
      if (socialLinks.length) {
        tl.to(
          socialLinks,
          {
            y: 0,
            opacity: 1,
            duration: 0.45,
            ease: "power3.out",
            stagger: { each: 0.06, from: "start" },
            onComplete: () => {
              gsap.set(socialLinks, { clearProps: "opacity" });
            },
          },
          socialsStart + 0.04
        );
      }
    }

    openTlRef.current = tl;
    return tl;
  }, [position]);

  const playOpen = useCallback(() => {
    busyRef.current = true;
    const tl = buildOpenTimeline();
    if (tl) {
      tl.eventCallback("onComplete", () => {
        busyRef.current = false;
      });
      tl.play(0);
    } else {
      busyRef.current = false;
    }
  }, [buildOpenTimeline]);

  const playClose = useCallback((onFinished?: () => void) => {
    openTlRef.current?.kill();
    openTlRef.current = null;
    itemEntranceTweenRef.current?.kill();

    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    const backdrop = backdropRef.current;
    if (!panel) {
      onFinished?.();
      return;
    }

    const all = [...layers, panel];
    closeTweenRef.current?.kill();
    const offscreen = position === "left" ? -100 : 100;

    // Fade out backdrop smoothly
    if (backdrop) {
      gsap.to(backdrop, {
        opacity: 0,
        duration: 0.32,
        ease: "power2.inOut",
      });
    }

    // Softly fade menu items as drawer exits
    const itemEls = Array.from(
      panel.querySelectorAll(".sm-panel-itemLabel")
    );
    if (itemEls.length) {
      gsap.to(itemEls, {
        opacity: 0.3,
        yPercent: 20,
        duration: 0.2,
        ease: "power2.in",
      });
    }

    // Slide panel and underlayers offscreen with subtle ease
    closeTweenRef.current = gsap.to(all, {
      xPercent: offscreen,
      opacity: 0,
      duration: 0.35,
      ease: "power3.inOut",
      overwrite: "auto",
      onComplete: () => {
        if (itemEls.length) {
          gsap.set(itemEls, { yPercent: 120, rotate: 6, opacity: 0 });
        }
        const numberEls = Array.from(
          panel.querySelectorAll(
            ".sm-panel-list[data-numbering] .sm-panel-item"
          )
        );
        if (numberEls.length) {
          gsap.set(numberEls, { "--sm-num-opacity": 0 });
        }
        const socialTitle = panel.querySelector(".sm-socials-title");
        const socialLinks = Array.from(
          panel.querySelectorAll(".sm-socials-link")
        );
        if (socialTitle) gsap.set(socialTitle, { opacity: 0, y: 15 });
        if (socialLinks.length) gsap.set(socialLinks, { y: 20, opacity: 0 });
        busyRef.current = false;
        onFinished?.();
      },
    });
  }, [position]);

  const animateIcon = useCallback((opening: boolean) => {
    const barTop = barTopRef.current;
    const barMid = barMidRef.current;
    const barBot = barBotRef.current;
    if (!barTop || !barMid || !barBot) return;

    gsap.killTweensOf([barTop, barMid, barBot]);

    if (opening) {
      // Bars converge on the centre and cross into an ×, middle bar vanishing.
      gsap.to(barTop, { y: 6, rotate: 45, duration: 0.4, ease: "power3.out" });
      gsap.to(barBot, { y: -6, rotate: -45, duration: 0.4, ease: "power3.out" });
      gsap.to(barMid, {
        opacity: 0,
        scaleX: 0,
        duration: 0.25,
        ease: "power2.out",
      });
    } else {
      gsap.to(barTop, { y: 0, rotate: 0, duration: 0.35, ease: "power3.inOut" });
      gsap.to(barBot, { y: 0, rotate: 0, duration: 0.35, ease: "power3.inOut" });
      gsap.to(barMid, {
        opacity: 1,
        scaleX: 1,
        duration: 0.3,
        ease: "power2.inOut",
      });
    }
  }, []);

  const animateColor = useCallback(
    (opening: boolean) => {
      const btn = toggleBtnRef.current;
      if (!btn) return;
      colorTweenRef.current?.kill();
      if (changeMenuColorOnOpen) {
        const targetColor = opening
          ? openMenuButtonColor
          : menuButtonColor;
        colorTweenRef.current = gsap.to(btn, {
          color: targetColor,
          delay: 0.18,
          duration: 0.3,
          ease: "power2.out",
        });
      } else {
        gsap.set(btn, { color: menuButtonColor });
      }
    },
    [openMenuButtonColor, menuButtonColor, changeMenuColorOnOpen]
  );

  React.useEffect(() => {
    if (toggleBtnRef.current) {
      if (changeMenuColorOnOpen) {
        const targetColor = openRef.current
          ? openMenuButtonColor
          : menuButtonColor;
        gsap.set(toggleBtnRef.current, { color: targetColor });
      } else {
        gsap.set(toggleBtnRef.current, { color: menuButtonColor });
      }
    }
  }, [changeMenuColorOnOpen, menuButtonColor, openMenuButtonColor]);

  const openMenu = useCallback(() => {
    if (openRef.current) return;
    openRef.current = true;
    setOpen(true);
    onMenuOpen?.();
    playOpen();
    animateIcon(true);
    animateColor(true);
  }, [playOpen, animateIcon, animateColor, onMenuOpen]);

  const closeMenu = useCallback(() => {
    if (!openRef.current) return;
    openRef.current = false;
    animateIcon(false);
    animateColor(false);
    onMenuClose?.();
    playClose(() => {
      setOpen(false);
    });
  }, [playClose, animateIcon, animateColor, onMenuClose]);

  const toggleMenu = useCallback(() => {
    if (openRef.current) {
      closeMenu();
    } else {
      openMenu();
    }
  }, [closeMenu, openMenu]);

  React.useImperativeHandle(ref, () => ({
    toggle: toggleMenu,
    open: openMenu,
    close: closeMenu,
    isOpen: () => openRef.current,
  }), [toggleMenu, openMenu, closeMenu]);

  React.useEffect(() => {
    if (!closeOnClickAway || !open) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      // Inside menu panel? Ignore.
      if (panelRef.current && panelRef.current.contains(target)) {
        return;
      }

      // Internal toggle button? Ignore (it handles its own click).
      if (toggleBtnRef.current && toggleBtnRef.current.contains(target)) {
        return;
      }

      // External toggle button in Navbar? Ignore so its own toggle handler manages it cleanly.
      if (
        target instanceof Element &&
        Boolean(target.closest('[data-menu-toggle="true"], #nav-menu-toggle'))
      ) {
        return;
      }

      // Anywhere else was clicked while open! Close menu.
      closeMenu();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [closeOnClickAway, open, closeMenu]);

  React.useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMenu();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, closeMenu]);

  return (
    <div
      className={
        (className ? className + " " : "") +
        "staggered-menu-wrapper" +
        (isFixed ? " fixed-wrapper" : "")
      }
      style={accentColor ? { ["--sm-accent" as string]: accentColor } : undefined}
      data-position={position}
      data-open={open || undefined}
    >
      <div
        ref={backdropRef}
        className="sm-backdrop"
        onClick={closeMenu}
        aria-hidden="true"
      />
      <div ref={preLayersRef} className="sm-prelayers" aria-hidden="true">
        {(() => {
          const raw =
            colors && colors.length
              ? colors.slice(0, 4)
              : ["#1e1e22", "#35353c"];
          const arr = raw.length >= 3
            ? [...raw.slice(0, Math.floor(raw.length / 2)), ...raw.slice(Math.floor(raw.length / 2) + 1)]
            : [...raw];
          return arr.map((c, i) => (
            <div
              key={i}
              className="sm-prelayer"
              style={{ background: c }}
            />
          ));
        })()}
      </div>
      {renderHeader ? (
        <header
          className="staggered-menu-header"
          aria-label="Main navigation header"
        >
          <div className="sm-logo" aria-label="Logo">
            <Image
              src={logoUrl}
              alt="Adamas Care Logo"
              className="sm-logo-img"
              draggable={false}
              width={110}
              height={24}
            />
          </div>
          <button
            ref={toggleBtnRef}
            className="sm-toggle"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="staggered-menu-panel"
            onClick={toggleMenu}
            type="button"
          >
            <span ref={iconRef} className="sm-icon" aria-hidden="true">
              <span ref={barTopRef} className="sm-icon-line" />
              <span ref={barMidRef} className="sm-icon-line" />
              <span ref={barBotRef} className="sm-icon-line" />
            </span>
          </button>
        </header>
      ) : renderToggle ? (
        <button
          ref={toggleBtnRef}
          className="sm-toggle sm-toggle-float"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="staggered-menu-panel"
          onClick={toggleMenu}
          type="button"
        >
          <span ref={iconRef} className="sm-icon" aria-hidden="true">
            <span ref={barTopRef} className="sm-icon-line" />
            <span ref={barMidRef} className="sm-icon-line" />
            <span ref={barBotRef} className="sm-icon-line" />
          </span>
        </button>
      ) : null}

      <aside
        id="staggered-menu-panel"
        ref={panelRef}
        className="staggered-menu-panel"
        aria-hidden={!open}
        inert={(!open ? "" : undefined) as unknown as boolean}
      >
        <button
          type="button"
          onClick={closeMenu}
          aria-label="Close menu"
          className="absolute top-6 right-6 sm:top-8 sm:right-8 w-11 h-11 flex items-center justify-center rounded-full hover:bg-black/5 text-[#2B2420] transition-colors z-20 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420]"
        >
          <svg
            width="22"
            height="22"
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
        </button>
        <div className="sm-panel-inner">
          <ul
            className="sm-panel-list"
            role="list"
            data-numbering={displayItemNumbering || undefined}
          >
            {items && items.length ? (
              items.map((it, idx) => {
                const isSignOut =
                  it.danger ||
                  it.label.trim().toLowerCase() === "sign out" ||
                  it.label.trim().toLowerCase() === "logout";
                return (
                  <li className="sm-panel-itemWrap" key={it.label + idx}>
                    <a
                      className={`sm-panel-item ${isSignOut ? "sm-panel-item-danger" : ""} ${it.className || ""}`}
                      href={it.link}
                      aria-label={it.ariaLabel}
                      data-index={idx + 1}
                      data-danger={isSignOut ? "true" : undefined}
                      onClick={(e) => {
                        if (it.onClick) {
                          e.preventDefault();
                          it.onClick();
                        }
                        closeMenu();
                      }}
                    >
                      <span className="sm-panel-itemLabel">{it.label}</span>
                    </a>
                  </li>
                );
              })
            ) : (
              <li className="sm-panel-itemWrap" aria-hidden="true">
                <span className="sm-panel-item">
                  <span className="sm-panel-itemLabel">No items</span>
                </span>
              </li>
            )}
          </ul>
          {displaySocials && socialItems && socialItems.length > 0 && (
            <div className="sm-socials" aria-label="Social links">
              <h3 className="sm-socials-title">Socials</h3>
              <ul className="sm-socials-list" role="list">
                {socialItems.map((s, i) => (
                  <li key={s.label + i} className="sm-socials-item">
                    <a
                      href={s.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sm-socials-link"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
});

StaggeredMenu.displayName = "StaggeredMenu";

export default StaggeredMenu;

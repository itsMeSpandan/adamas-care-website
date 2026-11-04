"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  DEFAULT_HERO_IMAGE,
  type PublicHeroImage,
} from "@/lib/hero-images";

interface HeroCarouselProps {
  /** Fallback static image URL when no live images exist or fetch fails */
  fallbackSrc?: string;
  /** Optional class names on the outer container */
  className?: string;
  /** Controlled active index callback (e.g. for external indicators) */
  onSlideChange?: (index: number, total: number) => void;
  /** Whether this carousel is the primary LCP container */
  priority?: boolean;
}

export default function HeroCarousel({
  fallbackSrc = DEFAULT_HERO_IMAGE,
  className = "",
  onSlideChange,
  priority = true,
}: HeroCarouselProps) {
  const [images, setImages] = useState<PublicHeroImage[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch live images from the public endpoint (no-store ensures fresh data after uploads)
  useEffect(() => {
    let cancelled = false;
    fetch("/hero-images", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { images: [] }))
      .then((data) => {
        if (cancelled) return;
        const list: PublicHeroImage[] = Array.isArray(data.images) ? data.images : [];
        console.log(`[HeroCarousel] Loaded ${list.length} live carousel image(s).`);
        setImages(list);
        if (onSlideChange) {
          onSlideChange(0, list.length);
        }
      })
      .catch(() => {
        // Fallback to static hero image
      });

    return () => {
      cancelled = true;
    };
  }, [onSlideChange]);

  // Pause when the tab is hidden (e.g. user switched tabs or app sent to background in TWA)
  useEffect(() => {
    const handleVisibility = () => {
      setIsPaused(document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Autoplay 10 seconds (resets timer whenever activeIndex, hover, or pause state changes)
  useEffect(() => {
    if (images.length <= 1 || isPaused || isHovered) {
      return;
    }

    console.log(
      `[HeroCarousel] Autoplay active: next slide in 10s (currently slide #${activeIndex + 1} of ${images.length})`
    );

    const timer = setTimeout(() => {
      setActiveIndex((current) => {
        const next = (current + 1) % images.length;
        console.log(`[HeroCarousel] Advancing to slide #${next + 1} of ${images.length}`);
        if (onSlideChange) onSlideChange(next, images.length);
        return next;
      });
    }, 10000);

    return () => clearTimeout(timer);
  }, [activeIndex, images.length, isPaused, isHovered, onSlideChange]);

  const goToSlide = useCallback(
    (index: number) => {
      setActiveIndex(index);
      if (onSlideChange) onSlideChange(index, images.length);
    },
    [images.length, onSlideChange]
  );

  // Keyboard navigation (ArrowLeft / ArrowRight)
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (images.length <= 1) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToSlide((activeIndex - 1 + images.length) % images.length);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goToSlide((activeIndex + 1) % images.length);
    }
  };

  const activeImage = images[activeIndex];

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden ${className}`}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setIsHovered(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") setIsHovered(false);
      }}
      onKeyDown={handleKeyDown}
      role="region"
      aria-roledescription="carousel"
      aria-label="Hero Image Showcase"
    >
      {/* Tiny blur placeholder for the current slide to eliminate layout shift */}
      {activeImage?.blurDataUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center filter blur-md transform scale-105 pointer-events-none transition-opacity duration-700"
          style={{ backgroundImage: `url(${activeImage.blurDataUrl})` }}
          aria-hidden="true"
        />
      )}

      {/* Fallback state: if 0 images live or network failure */}
      {images.length === 0 && (
        <div className="absolute inset-0">
          <picture>
            <source
              media="(max-width: 768px)"
              type="image/avif"
              srcSet="/images/hero-beauty-mobile.avif"
            />
            <source
              media="(max-width: 768px)"
              type="image/webp"
              srcSet="/images/hero-beauty-mobile.webp"
            />
            <source
              media="(min-width: 769px)"
              type="image/avif"
              srcSet="/images/hero-beauty.avif"
            />
            <source
              media="(min-width: 769px)"
              type="image/webp"
              srcSet="/images/hero-beauty.webp"
            />
            <img
              src={fallbackSrc || DEFAULT_HERO_IMAGE}
              alt="Adamas Care luxury salon and spa treatment"
              width={1200}
              height={1800}
              loading={priority ? "eager" : "lazy"}
              // @ts-expect-error fetchpriority attribute in modern HTML
              fetchpriority={priority ? "high" : "auto"}
              className="h-full w-full object-cover object-[center_20%]"
            />
          </picture>
        </div>
      )}

      {/* Live Images Slides with smooth CSS crossfade */}
      {images.map((img, index) => {
        const isActive = index === activeIndex;
        const isNext = index === (activeIndex + 1) % images.length;
        const isFirst = index === 0;

        return (
          <div
            key={img.id}
            aria-hidden={!isActive}
            style={{ transition: "opacity 1.5s cubic-bezier(0.4, 0, 0.2, 1)" }}
            className={`absolute inset-0 ${
              isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
          >
            <picture>
              <source media="(max-width: 768px)" srcSet={img.mobileUrl} />
              <source media="(min-width: 769px)" srcSet={img.desktopUrl} />
              <img
                src={img.desktopUrl}
                alt={img.alt}
                width={1200}
                height={1800}
                loading={isFirst || isNext ? "eager" : "lazy"}
                // @ts-expect-error fetchpriority attribute in modern HTML
                fetchpriority={isFirst ? "high" : "auto"}
                className="h-full w-full object-cover"
                style={{
                  objectPosition: `${img.focalX}% ${img.focalY}%`,
                }}
              />
            </picture>
          </div>
        );
      })}

      {/* Dot Indicators: visible only when > 1 live image */}
      {images.length > 1 && (
        <div
          className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[rgba(42,33,28,0.45)] px-3 py-1.5 backdrop-blur-sm"
          role="tablist"
          aria-label="Hero carousel navigation"
        >
          {images.map((img, i) => {
            const isCurrent = i === activeIndex;
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => goToSlide(i)}
                className="h-1.5 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#F4EFE8] focus:ring-offset-1 focus:ring-offset-black/50"
                style={{
                  width: isCurrent ? "1.5rem" : "6px",
                  backgroundColor: isCurrent ? "#F4EFE8" : "rgba(244, 239, 232, 0.6)",
                }}
                role="tab"
                aria-selected={isCurrent}
                aria-label={`Slide ${i + 1} of ${images.length}: ${img.alt}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

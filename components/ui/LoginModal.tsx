"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AuthExperience, { type AuthMode } from "@/components/auth/AuthExperience";

export type { AuthMode };

export interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

export default function LoginModal({
  open,
  onClose,
  initialMode = "signin",
}: LoginModalProps) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open]);

  // Handle ESC key to close
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="fixed inset-0 z-[10000] w-full min-h-[100dvh] h-full bg-[#F4EFE8] overflow-y-auto"
        >
          <AuthExperience
            isModal={true}
            initialMode={initialMode}
            onClose={onClose}
            className="w-full min-h-[100dvh] h-full"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

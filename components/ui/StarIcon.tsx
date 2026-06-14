import { cn } from "@/lib/utils";

interface StarIconProps {
  filled?: boolean;
  size?: number;
  className?: string;
}

export default function StarIcon({ filled = true, size = 14, className }: StarIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      className={cn(filled ? "text-beige-400" : "text-beige-200", className)}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

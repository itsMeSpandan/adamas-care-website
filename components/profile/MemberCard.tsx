"use client";

import {
  MembershipCard,
  MembershipCardSkeleton,
  type MembershipTier,
} from "@/components/cards/MembershipCard";

export interface MemberCardProps {
  name: string;
  role?: string | null;
  loyaltyPoints?: number | null;
  createdAt?: string | null;
  userId?: string | null;
  memberId?: string | null;
  tier?: MembershipTier;
  interactive?: boolean;
  showActions?: boolean;
}

export function MemberCard({
  name,
  role,
  loyaltyPoints,
  createdAt,
  userId,
  memberId,
  tier,
  interactive = true,
  showActions = true,
}: MemberCardProps) {
  return (
    <MembershipCard
      name={name}
      role={role}
      tier={tier}
      loyaltyPoints={loyaltyPoints}
      createdAt={createdAt}
      userId={userId}
      memberId={memberId}
      interactive={interactive}
      showActions={showActions}
    />
  );
}

export function MemberCardSkeleton() {
  return <MembershipCardSkeleton />;
}

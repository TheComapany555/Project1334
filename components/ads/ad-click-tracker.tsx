"use client";

import { trackAdClick } from "@/lib/actions/advertising";

type Props = {
  adId: string;
  href: string;
  children: React.ReactNode;
};

export function AdClickTracker({ adId, href, children }: Props) {
  async function handleClick() {
    await trackAdClick(adId).catch(() => {});
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      onClick={handleClick}
      className="block"
    >
      {children}
    </a>
  );
}

"use client";

import Link from "next/link";

/** Nested inside a parent link (e.g. listing card); stops navigation to the parent. */
export function NestedNavLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {children}
    </Link>
  );
}

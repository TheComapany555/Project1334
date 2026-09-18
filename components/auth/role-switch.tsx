"use client";

import { cn } from "@/lib/utils";

export type AuthRole = "buyer" | "broker";

const ROLES: { value: AuthRole; label: string }[] = [
  { value: "buyer", label: "Buyer" },
  { value: "broker", label: "Broker / Agency" },
];

/**
 * Two-way segmented control for the buyer/broker choice.
 *
 * A single sliding indicator moves between the halves rather than each trigger
 * painting its own background — so the transition reads as one object moving,
 * and the control never changes height between states.
 *
 * Implemented as a real radiogroup: arrow keys move between options, the
 * roving tabindex keeps one stop in the tab order.
 */
export function RoleSwitch({
  value,
  onChange,
  className,
  label = "Account type",
}: {
  value: AuthRole;
  onChange: (value: AuthRole) => void;
  className?: string;
  label?: string;
}) {
  const activeIndex = ROLES.findIndex((r) => r.value === value);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const next = ROLES[(activeIndex + delta + ROLES.length) % ROLES.length];
    onChange(next.value);
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={cn(
        "bg-muted/70 relative grid grid-cols-2 rounded-xl p-1",
        className,
      )}
    >
      {/* Sliding indicator */}
      <span
        aria-hidden
        className="bg-background pointer-events-none absolute inset-y-1 left-1 rounded-lg shadow-sm ring-1 ring-black/[0.04] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] dark:ring-white/10"
        style={{
          width: "calc(50% - 0.25rem)",
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {ROLES.map((role) => {
        const selected = role.value === value;
        return (
          <button
            key={role.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(role.value)}
            className={cn(
              "focus-visible:ring-ring/60 relative z-10 cursor-pointer rounded-lg py-2 text-sm font-medium transition-colors duration-200 outline-none focus-visible:ring-2",
              selected
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {role.label}
          </button>
        );
      })}
    </div>
  );
}

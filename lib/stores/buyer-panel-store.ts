"use client";

import { create } from "zustand";

/**
 * The slide-out buyer profile panel (M1.1).
 *
 * The panel can be opened against either:
 *  - a buyer USER id (full BuyerProfile via `getBuyerProfile`) — the rich case
 *    used from enquiries, NDA list, doc-access, and CRM rows that have a
 *    linked buyer account.
 *  - a CRM CONTACT id (a row in `broker_contacts` with no linked user account
 *    yet — i.e. a manually-added contact). Renders the lighter contact view.
 *
 * Server data (the BuyerProfile itself) is NOT cached here — TanStack Query
 * owns that. This store owns "is the panel open" + "which target".
 */

export type BuyerPanelTarget =
  | { kind: "buyer"; buyerUserId: string; listingId?: string | null }
  | { kind: "contact"; contactId: string };

type State = {
  open: boolean;
  target: BuyerPanelTarget | null;
  /** Ticks each time the panel data should refetch (e.g. after a CRM action). */
  refreshNonce: number;
};

type Actions = {
  openBuyer: (buyerUserId: string, listingId?: string | null) => void;
  openContact: (contactId: string) => void;
  close: () => void;
  refresh: () => void;
};

export const useBuyerPanelStore = create<State & Actions>((set) => ({
  open: false,
  target: null,
  refreshNonce: 0,

  openBuyer: (buyerUserId, listingId = null) =>
    set({
      open: true,
      target: { kind: "buyer", buyerUserId, listingId },
    }),

  openContact: (contactId) =>
    set({
      open: true,
      target: { kind: "contact", contactId },
    }),

  close: () => set({ open: false }),

  refresh: () => set((s) => ({ refreshNonce: s.refreshNonce + 1 })),
}));

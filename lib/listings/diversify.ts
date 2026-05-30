// Anti-clustering reorder for homepage listing feeds. Spreads listings across
// brokers/agencies so a single broker uploading many listings in a row doesn't
// dominate the visible portion of the feed (Feature #3).
//
// Pure function — no I/O. Tested by mental run-through on edge cases:
//   • empty input → []
//   • all items from one owner → returned in original order (clustering is
//     unavoidable; we don't drop items)
//   • items from N owners, none repeating in a window of size W → no reorder
//   • mix → diverse owners pulled forward; same-owner runs broken up

export type DiversifyOptions<T> = {
  /**
   * Returns a stable owner key for an item. Items sharing a key won't appear
   * within `windowSize` positions of each other unless no other items remain.
   * Return null/undefined to opt the item out of clustering (treated as unique).
   */
  ownerKey: (item: T) => string | null | undefined;
  /**
   * Window of consecutive output positions over which a given owner key can
   * appear at most once. Defaults to 4 (matches a 4-column grid).
   */
  windowSize?: number;
};

/**
 * Reorder `items` so that no owner key appears more than once within any
 * sliding window of `windowSize` positions, while preserving the relative
 * order of items as much as possible.
 *
 * The algorithm walks the input greedily: at each output position it picks
 * the earliest remaining item whose owner key is not in the last
 * `windowSize - 1` outputs. If no item satisfies the constraint, it picks
 * the first remaining item (so we never drop anything).
 */
export function diversifyByOwner<T>(items: T[], opts: DiversifyOptions<T>): T[] {
  const windowSize = Math.max(1, opts.windowSize ?? 4);
  if (items.length <= 1 || windowSize === 1) return items.slice();

  const remaining = items.slice();
  const result: T[] = [];
  const recentOwners: (string | null | undefined)[] = [];

  while (remaining.length > 0) {
    let pickedIndex = -1;
    for (let i = 0; i < remaining.length; i += 1) {
      const key = opts.ownerKey(remaining[i]);
      // null/undefined keys are treated as always-unique (never collide).
      if (key == null || !recentOwners.includes(key)) {
        pickedIndex = i;
        break;
      }
    }
    if (pickedIndex === -1) pickedIndex = 0; // fallback: take the next one

    const [picked] = remaining.splice(pickedIndex, 1);
    result.push(picked);
    recentOwners.push(opts.ownerKey(picked));
    if (recentOwners.length > windowSize - 1) recentOwners.shift();
  }

  return result;
}

/**
 * Derive the clustering key for a listing. Uses `agency_id` when available so
 * an entire agency counts as a single "owner," falling back to the broker for
 * solo brokers. `null` opts out of clustering.
 */
export function listingOwnerKey(listing: {
  agency_id?: string | null;
  broker_id?: string | null;
}): string | null {
  return listing.agency_id ?? listing.broker_id ?? null;
}

import type { Listing } from "./listings";

export type ComparisonList = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type ComparisonListItem = {
  id: string;
  comparison_list_id: string;
  listing_id: string;
  added_at: string;
};

export type ComparisonListWithItems = ComparisonList & {
  items: (ComparisonListItem & { listing: Listing })[];
};

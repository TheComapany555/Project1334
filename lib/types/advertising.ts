export type AdPlacement = "homepage" | "search" | "listing";
export type AdStatus = "active" | "inactive";

export type Advertisement = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  html_content: string | null;
  link_url: string | null;
  placement: AdPlacement;
  status: AdStatus;
  start_date: string;
  end_date: string | null;
  sort_order: number;
  click_count: number;
  impression_count: number;
  created_at: string;
  updated_at: string;
};

import { redirect } from "next/navigation";

export default function AdminDiscountCodesPage() {
  redirect("/admin/products?tab=discounts");
}

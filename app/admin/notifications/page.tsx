import { getMyNotifications } from "@/lib/actions/notifications";
import { PageHeader } from "@/components/admin/page-header";
import { NotificationList } from "@/components/dashboard/notification-list";

export default async function AdminNotificationsPage() {
  const notifications = await getMyNotifications(50);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Notifications"
        description="Stay up to date with activity across the platform."
      />
      <NotificationList initialNotifications={notifications} />
    </div>
  );
}

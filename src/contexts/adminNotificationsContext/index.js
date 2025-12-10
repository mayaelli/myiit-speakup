import React, { useContext } from "react";
import useAdminNotifications from "../../hooks/useAdminNotifications";

const AdminNotificationsContext = React.createContext(null);

export const useAdminNotificationsState = () => {
  return (
    useContext(AdminNotificationsContext) || {
      notifications: [],
      loading: false,
      unreadCount: 0,
      seenIds: new Set(),
      markAllSeen: () => {},
      markNotificationSeen: () => {},
    }
  );
};

export function AdminNotificationsProvider({ children }) {
  const notifState = useAdminNotifications();

  return (
    <AdminNotificationsContext.Provider value={notifState}>
      {children}
    </AdminNotificationsContext.Provider>
  );
}

export default AdminNotificationsContext;

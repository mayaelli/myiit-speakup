import React, { useContext } from "react";
import useStaffNotifications from "../../hooks/useStaffNotifications";

const StaffNotificationsContext = React.createContext(null);

export const useStaffNotificationsState = () => {
  return (
    useContext(StaffNotificationsContext) || {
      notifications: [],
      loading: false,
      unreadCount: 0,
      seenIds: new Set(),
      markAllSeen: () => {},
      markNotificationSeen: () => {},
    }
  );
};

export function StaffNotificationsProvider({ children }) {
  const notifState = useStaffNotifications();

  return (
    <StaffNotificationsContext.Provider value={notifState}>
      {children}
    </StaffNotificationsContext.Provider>
  );
}

export default StaffNotificationsContext;

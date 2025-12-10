import React, { useEffect, useMemo, useRef, useState } from "react";
import SideBar from "./components/SideBar";
import MainNavbar from "./components/MainNavbar";
import { useNotifications } from "../../contexts/notificationsContext";
import { useNavigate } from "react-router-dom";

const Notifications = () => {
  const [activeTab, setActiveTab] = useState("all");
  const navigate = useNavigate();
  const { notifications, loading, seenIds, markAllSeen, markNotificationSeen } = useNotifications();

  // --- Logic Section ---
  const DISMISSED_KEY = "student_notifications_dismissed";
  const [dismissed, setDismissed] = useState(() => {
    try {
      const raw = localStorage.getItem(DISMISSED_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed)); } catch {}
  }, [dismissed]);
  const dismissedSet = useMemo(() => new Set(dismissed), [dismissed]);

  const [lastDeleted, setLastDeleted] = useState([]); 
  const undoTimerRef = useRef(null);
  
  const handleUndoDelete = () => {
    if (!lastDeleted.length) return;
    if (undoTimerRef.current) { try { clearTimeout(undoTimerRef.current); } catch {} undoTimerRef.current = null; }
    setDismissed((prev) => prev.filter((id) => !lastDeleted.includes(id)));
    setLastDeleted([]);
  };

  useEffect(() => {
    if (undoTimerRef.current) { try { clearTimeout(undoTimerRef.current); } catch {} undoTimerRef.current = null; }
    if (lastDeleted.length > 0) {
      undoTimerRef.current = setTimeout(() => {
        setLastDeleted([]);
        undoTimerRef.current = null;
      }, 10000);
    }
    return () => {
      if (undoTimerRef.current) { try { clearTimeout(undoTimerRef.current); } catch {} undoTimerRef.current = null; }
    };
  }, [lastDeleted]);

  const getCategoryLabel = (cat) => {
    const labels = {
      academic: "Academic",
      "faculty-conduct": "Faculty Conduct",
      facilities: "Facilities",
      "administrative-student-services": "Administrative/Student Services",
      other: "Other",
    };
    return labels[cat] || (cat || "");
  };

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (dismissedSet.has(n.id)) return false;
      if (activeTab === "unread") {
        return !seenIds.has(n.id);
      }
      return true;
    });
  }, [notifications, activeTab, dismissedSet, seenIds]);

  const handleDeleteOne = (id) => {
    const ok = window.confirm("Delete this notification?");
    if (!ok) return;
    setDismissed((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setLastDeleted([id]);
  };

  const handleDeleteAll = () => {
    const ok = window.confirm("Delete all notifications? This cannot be undone.");
    if (!ok) return;
    const allIds = notifications.map((n) => n.id);
    const toAdd = allIds.filter((id) => !dismissedSet.has(id));
    setDismissed((prev) => Array.from(new Set([...prev, ...allIds])));
    setLastDeleted(toAdd);
  };
  // --- End Logic Section ---

  return (
    <div className="min-h-screen bg-gray-50">
      <SideBar />

      {/* Main content with proper spacing for sidebar and full viewport height */}
      <div className="min-h-screen lg:ml-[260px] flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-8">
            <MainNavbar />

            <div className="max-w-4xl mt-24 mx-auto pb-5">
              {/* Tab Buttons */}
              <div className="flex gap-1 mb-0 bg-gray-200 p-1 rounded-lg w-fit">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`px-5 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === "all"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveTab("unread")}
                  className={`px-5 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === "unread"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Unread
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 justify-between items-start sm:items-center mb-4">
                <div className="text-gray-600 text-xs sm:text-sm min-h-[24px]">
                  {lastDeleted.length > 0 && (
                    <>
                      Deleted {lastDeleted.length} notification{lastDeleted.length > 1 ? 's' : ''}.
                      <button
                        onClick={handleUndoDelete}
                        className="ml-2 text-blue-600 hover:text-blue-700 font-medium underline"
                      >
                        Undo
                      </button>
                    </>
                  )}
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={markAllSeen}
                    disabled={loading}
                    className="flex-1 sm:flex-none px-3 py-1.5 bg-[#8B1538] text-white text-xs sm:text-sm rounded-md hover:bg-[#991b1b] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    Mark all as read
                  </button>
                  <button
                    onClick={handleDeleteAll}
                    disabled={loading || notifications.length === 0}
                    className="flex-1 sm:flex-none px-3 py-1.5 bg-red-600 text-white text-xs sm:text-sm rounded-md hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    Delete all
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="space-y-4">
                {loading && (
                  <div className="p-6 bg-white rounded-lg shadow border border-gray-100">
                    <p className="text-gray-500 text-center">Loading notifications…</p>
                  </div>
                )}

                {!loading && filtered.length === 0 && (
                  <div className="text-center py-16 bg-white rounded-lg shadow border border-gray-100">
                    <i className="fas fa-inbox text-4xl mb-3 text-gray-300 block"></i>
                    <h3 className="text-lg font-semibold text-gray-700 mb-1">No notifications</h3>
                    <p className="text-sm text-gray-500">You're all caught up!</p>
                  </div>
                )}

                {!loading && filtered.map((notif) => {
                  const isUnread = !seenIds.has(notif.id);

                  return (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markNotificationSeen(notif.id);
                        navigate("/history", {
                          state: {
                            complaintId: notif.complaintId,
                            focusTab: notif.type === 'feedback' ? 'feedback' : 'details'
                          }
                        });
                      }}
                      className={`relative p-3 sm:p-4 rounded-lg shadow transition-all cursor-pointer border-l-4 ${
                        isUnread
                          ? "bg-red-50 border-l-[#8B0000] hover:shadow-md"
                          : "bg-white border-l-gray-300 opacity-80 hover:opacity-100"
                      }`}
                    >
                      {/* Delete Button */}
                      <button
                        aria-label="Delete notification"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteOne(notif.id);
                        }}
                        className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <i className="fas fa-trash text-xs"></i>
                      </button>

                      {/* Unread Indicator */}
                      {isUnread && (
                        <div className="absolute top-2 right-9 w-2 h-2 bg-[#DC143C] rounded-full animate-pulse"></div>
                      )}

                      {/* Content */}
                      <div className="pr-7">
                        <p className={`text-xs sm:text-sm mb-1.5 flex flex-wrap items-center gap-2 ${
                          isUnread ? "font-semibold text-gray-900" : "text-gray-700"
                        }`}>
                          <span>
                            {notif.type === 'feedback' && "New feedback on your complaint"}
                            {notif.type === 'status' && notif.message.replace(/\.$/, '')}
                          </span>
                          {notif.category && (
                            <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900 text-xs font-medium">
                              {getCategoryLabel(notif.category)}
                            </span>
                          )}
                        </p>
                        <small className="text-xs text-gray-500 flex items-center gap-1">
                          <i className="far fa-clock"></i>
                          {new Date(notif.date).toLocaleString()}
                        </small>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              {!loading && filtered.length > 0 && (
                <div className="mt-10 pt-4 border-t border-gray-200 text-center">
                  <p className="text-xs text-gray-400">
                    Notifications are displayed in chronological order
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "../contexts/authContext";

const LS_SEEN_PREFIX = "staff_notifications_seen_";

const loadSeenIds = (key) => {
  if (!key) return [];
  try {
    const raw = localStorage.getItem(`${LS_SEEN_PREFIX}${key}`);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const saveSeenIds = (key, ids) => {
  if (!key) return;
  try {
    localStorage.setItem(`${LS_SEEN_PREFIX}${key}`, JSON.stringify(ids || []));
  } catch {}
};

const toMs = (val) => {
  if (!val) return 0;
  try {
    if (typeof val?.toDate === "function") {
      const t = val.toDate()?.getTime?.();
      return Number.isFinite(t) ? t : 0;
    }
  } catch {}
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  const t = Date.parse(val);
  return Number.isFinite(t) ? t : 0;
};

export function useStaffNotifications() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seenIds, setSeenIds] = useState([]);

  const prevRef = useRef(new Map());
  const initialLoadRef = useRef(true);
  const [staffRole, setStaffRole] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const seenIdsSet = useMemo(() => new Set(seenIds), [seenIds]);
  const userKeyRef = useRef("staff::guest");
  const persistSeenIds = useCallback((updater) => {
    setSeenIds((prev) => {
      const next = updater(prev);
      return next === prev ? prev : next;
    });
  }, []);

  // Determine staff role from localStorage ("staff" or "kasama")
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const storedRole = (user?.role || "").toLowerCase();
      if (storedRole === "staff" || storedRole === "kasama") {
        setStaffRole(storedRole);
      } else if (currentUser?.role && ["staff", "kasama"].includes(currentUser.role.toLowerCase())) {
        setStaffRole(currentUser.role.toLowerCase());
      } else {
        setStaffRole("");
      }

      const resolvedEmail =
        (user?.email || currentUser?.email || "").trim().toLowerCase();
      setStaffEmail(resolvedEmail);
    } catch {
      setStaffRole("");
      setStaffEmail("");
    }
  }, [currentUser]);

  useEffect(() => {
    setLoading(true);
    setNotifications([]);
    prevRef.current = new Map();
    initialLoadRef.current = true;
    const normalizedEmail = (staffEmail || "").trim().toLowerCase();
    if (!staffRole || !normalizedEmail) {
      setSeenIds([]);
      setLoading(false);
      return;
    }

    const userKey = `role:${staffRole}::${normalizedEmail}`;
    userKeyRef.current = userKey;
    try {
      const stored = loadSeenIds(userKey);
      setSeenIds(Array.isArray(stored) ? stored : []);
    } catch {
      setSeenIds([]);
    }

    const qRole = query(collection(db, "complaints"), where("assignedRole", "==", staffRole));
    const unsub = onSnapshot(qRole, (snapshot) => {
      const isStatusFromSelf = (data = {}) => {
        const updatedBy = data.statusUpdatedBy;
        const updatedByRole = (data.statusUpdatedByRole || "").toLowerCase();
        const isByUser =
          !!updatedBy &&
          (updatedBy === currentUser?.uid || updatedBy === currentUser?.email);
        const isByRole = staffRole && updatedByRole === staffRole;
        return Boolean(isByUser || isByRole);
      };

      // Initial load: backfill assignment + feedback since last seen
      if (initialLoadRef.current) {
        const initial = [];
        snapshot.docs.forEach((doc) => {
          const d = doc.data() || {};
          if ((d.assignedTo || "").toLowerCase() !== normalizedEmail) {
            prevRef.current.delete(doc.id);
            return;
          }
          const assignmentMs = toMs(d.assignmentUpdatedAt);
          if (assignmentMs > 0) {
            initial.push({
              id: `${doc.id}::assignment::${assignmentMs}`,
              type: "assignment",
              complaintId: doc.id,
              category: d.category || "",
              title: "New assigned complaint",
              date: assignmentMs,
            });
          }

          // Backfill latest status update if available
          const statusMs = toMs(d.statusUpdatedAt);
          if (d.status && statusMs > 0 && !isStatusFromSelf(d)) {
            initial.push({
              id: `${doc.id}::status::${d.status}-${statusMs}`,
              type: "status",
              complaintId: doc.id,
              category: d.category || "",
              title: `Status updated to ${d.status}`,
              date: statusMs,
            });
          }

          const feedbackHistory = Array.isArray(d.feedbackHistory) ? d.feedbackHistory : [];
          let lastFeedbackMs = 0;
          let lastFeedbackItem = null;
          if (feedbackHistory.length) {
            lastFeedbackItem = feedbackHistory[feedbackHistory.length - 1];
            lastFeedbackMs = toMs(lastFeedbackItem?.date);
          }
          const feedbackMs = Math.max(lastFeedbackMs, toMs(d.feedbackUpdatedAt));
          const ownUid = currentUser?.uid;
          const ownEmail = currentUser?.email;
          const authoredBySelf = lastFeedbackItem?.adminId && (lastFeedbackItem.adminId === ownUid || lastFeedbackItem.adminId === ownEmail);
          if ((d.Feedback || feedbackHistory.length > 0) && feedbackMs > 0 && !authoredBySelf) {
            initial.push({
              id: `${doc.id}::feedback::${feedbackMs}`,
              type: "feedback",
              complaintId: doc.id,
              category: d.category || "",
              title: "New feedback from admin",
              date: feedbackMs,
            });
          }

          prevRef.current.set(doc.id, {
            feedbackCount: feedbackHistory.length,
            assignedRole: d.assignedRole,
            feedbackValue: d.Feedback || "",
            status: d.status,
          });
        });

        if (initial.length) {
          initial.sort((a,b)=>b.date-a.date);
          setNotifications(initial.slice(0, 100));
        }
        initialLoadRef.current = false;
        setLoading(false);
        return;
      }

      // Realtime changes
      const newNotifs = [];
      snapshot.docChanges().forEach((change) => {
        const id = change.doc.id;
        const d = change.doc.data() || {};
        if ((d.assignedTo || "").toLowerCase() !== normalizedEmail) {
          prevRef.current.delete(id);
          return;
        }
        const prev = prevRef.current.get(id) || { feedbackCount: 0, assignedRole: undefined, feedbackValue: "", status: undefined };

        const nowMs = Date.now();

        // Treat ADDED as a new assignment into this role
        if (change.type === "added") {
          newNotifs.push({
            id: `${id}::assignment::${nowMs}`,
            type: "assignment",
            complaintId: id,
            category: d.category || "",
            title: "New assigned complaint",
            date: nowMs,
          });
        }

        // Status change
        if (
          change.type === "modified" &&
          d.status &&
          d.status !== prev.status &&
          !isStatusFromSelf(d)
        ) {
          const statusMs = toMs(d.statusUpdatedAt) || nowMs;
          newNotifs.push({
            id: `${id}::status::${d.status}-${statusMs}`,
            type: "status",
            complaintId: id,
            category: d.category || "",
            title: `Status updated to ${d.status}`,
            date: statusMs,
          });
        }

        // Feedback change
        const feedbackHistory = Array.isArray(d.feedbackHistory) ? d.feedbackHistory : [];
        const feedbackCount = feedbackHistory.length;
        const feedbackValue = d.Feedback || "";
        if (
          change.type === "modified" &&
          (feedbackCount > (prev.feedbackCount || 0) || (feedbackValue && feedbackValue !== (prev.feedbackValue || "")))
        ) {
          let dateMs = nowMs;
          const last = feedbackHistory[feedbackHistory.length - 1];
          if (last?.date) {
            const t = Date.parse(last.date);
            if (Number.isFinite(t)) dateMs = t;
          }
          const ownUid = currentUser?.uid;
          const ownEmail = currentUser?.email;
          const authoredBySelf = last?.adminId && (last.adminId === ownUid || last.adminId === ownEmail);
          if (!authoredBySelf) {
            newNotifs.push({
              id: `${id}::feedback::${feedbackCount}-${dateMs}`,
              type: "feedback",
              complaintId: id,
              category: d.category || "",
              title: "New feedback from admin",
              date: dateMs,
            });
          }
        }

        prevRef.current.set(id, { feedbackCount, assignedRole: d.assignedRole, feedbackValue, status: d.status });
      });

      if (newNotifs.length) {
        setNotifications((prev) => {
          const merged = [...newNotifs, ...prev];
          return merged
            .sort((a,b)=> b.date - a.date)
            .slice(0, 100);
        });
      }
    }, () => setLoading(false));

    return () => { try { unsub && unsub(); } catch {} };
  }, [staffRole, staffEmail, currentUser?.uid, currentUser?.email]);

  useEffect(() => {
    saveSeenIds(userKeyRef.current, seenIds);
  }, [seenIds]);

  const unreadCount = useMemo(() => {
    return notifications.reduce((acc, n) => (seenIdsSet.has(n.id) ? acc : acc + 1), 0);
  }, [notifications, seenIdsSet]);

  const markAllSeen = useCallback(() => {
    persistSeenIds((prev) => {
      const set = new Set(prev);
      let changed = false;
      notifications.forEach((n) => {
        if (n?.id && !set.has(n.id)) {
          set.add(n.id);
          changed = true;
        }
      });
      if (!changed) return prev;
      return Array.from(set).slice(-500);
    });
  }, [notifications, persistSeenIds]);

  const markNotificationSeen = useCallback((notifOrId) => {
    const id = typeof notifOrId === "string" ? notifOrId : notifOrId?.id;
    if (!id) return;
    persistSeenIds((prev) => {
      if (prev.includes(id)) return prev;
      return [...prev.slice(-499), id];
    });
  }, [persistSeenIds]);

  return { notifications, loading, unreadCount, seenIds: seenIdsSet, markAllSeen, markNotificationSeen };
}

export default useStaffNotifications;

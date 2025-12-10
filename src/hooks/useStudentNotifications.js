import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "../contexts/authContext";

const LS_NOTIFS_PREFIX = "student_notifications_items_"; // per-user cache
const LS_SEEN_IDS_PREFIX = "student_notifications_seen_";

const loadSeenIds = (key) => {
  if (!key) return [];
  try {
    const raw = localStorage.getItem(`${LS_SEEN_IDS_PREFIX}${key}`);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const saveSeenIds = (key, ids) => {
  if (!key) return;
  try {
    localStorage.setItem(`${LS_SEEN_IDS_PREFIX}${key}`, JSON.stringify(ids || []));
  } catch {}
};

// Create a deterministic ID for a notification event
const makeNotifId = (complaintId, type, token) => `${complaintId}::${type}::${token}`;

// Best-effort date to ms (supports Firestore Timestamp, ISO string, number)
const toMs = (val) => {
  if (!val) return 0;
  try {
    if (typeof val?.toDate === "function") {
      const d = val.toDate();
      const t = d?.getTime?.();
      return Number.isFinite(t) ? t : 0;
    }
  } catch {}
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  const t = Date.parse(val);
  return Number.isFinite(t) ? t : 0;
};

// Persist notifications per user (by uid or email)
const getUserKey = (uid, email) => (uid ? `uid:${uid}` : email ? `email:${email}` : "guest");
const loadNotifs = (key) => {
  if (!key) return [];
  try {
    const raw = localStorage.getItem(`${LS_NOTIFS_PREFIX}${key}`);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};
const saveNotifs = (key, notifs) => {
  if (!key) return;
  try {
    localStorage.setItem(`${LS_NOTIFS_PREFIX}${key}`, JSON.stringify(notifs || []));
  } catch {}
};

/**
 * useStudentNotifications
 * Subscribes to the current user's complaints and emits notifications when
 *  - status changes
 *  - new feedback is added (feedbackHistory grows or Feedback field changes)
 * Skips generating notifications on initial load to avoid backfilling old events.
 */
export function useStudentNotifications() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seenIds, setSeenIds] = useState([]);

  // Track previous snapshot essential fields to detect diffs
  const prevRef = useRef(new Map()); // complaintId -> { status, feedbackCount, feedbackValue }
  const initialLoadRef = useRef(true);
  const userKeyRef = useRef("guest");

  const seenIdsSet = useMemo(() => new Set(seenIds), [seenIds]);
  const persistSeenIds = useCallback((updater) => {
    setSeenIds((prev) => {
      const next = updater(prev);
      if (next === prev) return prev;
      return next;
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    prevRef.current = new Map();
    initialLoadRef.current = true;

    // Resolve identity: prefer uid; fallback to email from localStorage
    let uid = currentUser?.uid || null;
    let email = null;
    try {
      const stored = JSON.parse(localStorage.getItem("user"));
      email = stored?.email || currentUser?.email || null;
    } catch {
      email = currentUser?.email || null;
    }

    const userKey = getUserKey(uid, email);
    userKeyRef.current = userKey;
    // Rehydrate from cache so items don't disappear on remount
    try {
      const cached = loadNotifs(userKey);
      if (cached.length) setNotifications(cached);
    } catch {}
    try {
      const storedSeen = loadSeenIds(userKey);
      setSeenIds(Array.isArray(storedSeen) ? storedSeen : []);
    } catch {
      setSeenIds([]);
    }

    let qUser = null;
    if (uid) {
      qUser = query(collection(db, "complaints"), where("userId", "==", uid));
    } else if (email) {
      qUser = query(collection(db, "complaints"), where("userEmail", "==", email));
    } else {
      setSeenIds([]);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      qUser,
      (snapshot) => {
        // On first load, seed prevRef and backfill notifications for the cache
        if (initialLoadRef.current) {
          const initialNotifs = [];
          snapshot.docs.forEach((doc) => {
            const d = doc.data() || {};
            const feedbackHistory = Array.isArray(d.feedbackHistory) ? d.feedbackHistory : [];
            const feedbackCount = feedbackHistory.length;

            // Backfill latest status using statusUpdatedAt if present (include even if already read)
            const statusTs = toMs(d.statusUpdatedAt);
            if (d.status && statusTs > 0) {
              initialNotifs.push({
                id: makeNotifId(doc.id, "status", `${d.status}-${statusTs}`),
                complaintId: doc.id,
                type: "status",
                category: d.category || "",
                message: `Status updated to ${d.status}`,
                date: statusTs,
              });
            }

            // Backfill feedback using latest history date or feedbackUpdatedAt
            let lastFeedbackMs = 0;
            if (feedbackCount > 0) {
              const last = feedbackHistory[feedbackCount - 1];
              lastFeedbackMs = toMs(last?.date);
            }
            const fallbackFeedbackMs = toMs(d.feedbackUpdatedAt);
            const feedbackMs = Math.max(lastFeedbackMs, fallbackFeedbackMs);
            if ((d.Feedback || feedbackCount > 0) && feedbackMs > 0) {
              initialNotifs.push({
                id: makeNotifId(doc.id, "feedback", `${feedbackCount}-${feedbackMs}`),
                complaintId: doc.id,
                type: "feedback",
                category: d.category || "",
                message: `New feedback received`,
                date: feedbackMs,
              });
            }

            // Seed prev for subsequent real-time diffs
            prevRef.current.set(doc.id, {
              status: d.status,
              feedbackCount,
              feedbackValue: d.Feedback || "",
            });
          });

          // Initialize notifications list with any backfilled items (sorted desc)
        if (initialNotifs.length) {
          initialNotifs.sort((a, b) => b.date - a.date);
          // Merge with any existing (cached) items and de-duplicate by id
          setNotifications((prev) => {
            const map = new Map();
            [...initialNotifs, ...prev].forEach((n) => { if (n && n.id) map.set(n.id, n); });
            const merged = Array.from(map.values()).sort((a, b) => b.date - a.date).slice(0, 200);
            saveNotifs(userKey, merged);
            return merged;
          });
        } else {
          // No initial items; keep cached as-is
          setNotifications((prev) => { saveNotifs(userKey, prev); return prev; });
        }

        initialLoadRef.current = false;
        setLoading(false);
        return;
      }

        // For subsequent updates, detect changes
        const newNotifs = [];
        snapshot.docChanges().forEach((change) => {
          if (change.type !== "modified") return;
          const id = change.doc.id;
          const d = change.doc.data() || {};
          const prev = prevRef.current.get(id) || {
            status: undefined,
            feedbackCount: 0,
            feedbackValue: "",
          };

          const nowMs = Date.now();

          // Status change
          if (d.status !== prev.status && typeof d.status === "string") {
            newNotifs.push({
              id: makeNotifId(id, "status", `${d.status}-${nowMs}`),
              complaintId: id,
              type: "status",
              category: d.category || "",
              message: `Status updated to ${d.status}`,
              date: nowMs,
            });
          }

          // Feedback change: either Feedback text changed or feedbackHistory grew
          const feedbackHistory = Array.isArray(d.feedbackHistory)
            ? d.feedbackHistory
            : [];
          const feedbackCount = feedbackHistory.length;
          const feedbackValue = d.Feedback || "";

          if (
            feedbackCount > (prev.feedbackCount || 0) ||
            (feedbackValue && feedbackValue !== (prev.feedbackValue || ""))
          ) {
            // If we have feedbackHistory with dates, try using the latest date
            let dateMs = nowMs;
            const last = feedbackHistory[feedbackHistory.length - 1];
            if (last && last.date) {
              const t = Date.parse(last.date);
              if (Number.isFinite(t)) dateMs = t;
            }

            newNotifs.push({
              id: makeNotifId(id, "feedback", `${feedbackCount}-${dateMs}`),
              complaintId: id,
              type: "feedback",
              category: d.category || "",
              message: `New feedback received`,
              date: dateMs,
            });
          }

          // Update prev for this doc
          prevRef.current.set(id, {
            status: d.status,
            feedbackCount,
            feedbackValue,
          });
        });

        if (newNotifs.length) {
          setNotifications((prev) => {
            const map = new Map();
            [...newNotifs, ...prev].forEach((n) => { if (n && n.id) map.set(n.id, n); });
            const merged = Array.from(map.values()).sort((a, b) => b.date - a.date).slice(0, 200);
            saveNotifs(userKey, merged);
            return merged;
          });
        }
      },
      () => {
        // On error, stop loading so UI can recover
        setLoading(false);
      }
    );

    return () => {
      try { unsubscribe && unsubscribe(); } catch {}
    };
  }, [currentUser]);

  useEffect(() => {
    saveSeenIds(userKeyRef.current, seenIds);
  }, [seenIds]);

  const unreadCount = useMemo(() => {
    return notifications.reduce((acc, n) => (seenIdsSet.has(n.id) ? acc : acc + 1), 0);
  }, [notifications, seenIdsSet]);

  // Markers that update both localStorage and state
  const markAllSeen = () => {
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
  };

  const markNotificationSeen = useCallback((notifOrId) => {
    const id = typeof notifOrId === "string" ? notifOrId : notifOrId?.id;
    if (!id) return;
    persistSeenIds((prev) => {
      if (prev.includes(id)) return prev;
      return [...prev.slice(-499), id];
    });
  }, [persistSeenIds]);

  return {
    notifications,
    loading,
    unreadCount,
    seenIds: seenIdsSet,
    markAllSeen,
    markNotificationSeen,
  };
}

export default useStudentNotifications;

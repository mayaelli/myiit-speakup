import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "../contexts/authContext";

const LS_SEEN_PREFIX = "admin_notifications_seen_";

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

const resolveAdminKey = (user, fallbackRole) => {
  let uid = user?.uid || null;
  let email = user?.email || null;
  try {
    const stored = JSON.parse(localStorage.getItem("user"));
    uid = uid || stored?.uid || null;
    email = email || stored?.email || null;
  } catch {}
  if (uid) return `uid:${uid}`;
  if (email) return `email:${email}`;
  if (fallbackRole) return `role:${fallbackRole}`;
  return "admin:guest";
};

const toMs = (val) => {
  if (!val) return 0;
  try { if (typeof val?.toDate === "function") return val.toDate()?.getTime?.() || 0; } catch {}
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  const t = Date.parse(val);
  return Number.isFinite(t) ? t : 0;
};

const isStaffRole = (role) => {
  const r = (role || "").toLowerCase();
  return r === "staff" || r === "kasama";
};

export function useAdminNotifications() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seenIds, setSeenIds] = useState([]);

  const prevRef = useRef(new Map());
  const initialLoadRef = useRef(true);
  const seenIdsSet = useMemo(() => new Set(seenIds), [seenIds]);
  const userKeyRef = useRef("admin:guest");
  const persistSeenIds = useCallback((updater) => {
    setSeenIds((prev) => {
      const next = updater(prev);
      return next === prev ? prev : next;
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    setNotifications([]);
    prevRef.current = new Map();
    initialLoadRef.current = true;
    setSeenIds([]);

    let role = "";
    try {
      role = (JSON.parse(localStorage.getItem("user"))?.role || "").toLowerCase();
    } catch {}
    if (role !== "admin") {
      setLoading(false);
      return;
    }

    const userKey = resolveAdminKey(currentUser, role);
    userKeyRef.current = userKey;
    try {
      const stored = loadSeenIds(userKey);
      setSeenIds(Array.isArray(stored) ? stored : []);
    } catch {
      setSeenIds([]);
    }

    const qAll = query(collection(db, "complaints"), orderBy("submissionDate", "desc"));
    const unsub = onSnapshot(qAll, (snapshot) => {
      if (initialLoadRef.current) {
        const initial = [];
        snapshot.docs.forEach((doc) => {
          const d = doc.data() || {};
          const subMs = toMs(d.submissionDate);
          if (subMs > 0) {
            initial.push({
              id: `${doc.id}::new::${subMs}`,
              type: "new",
              title: "New complaint submitted",
              complaintId: doc.id,
              category: d.category || "",
              date: subMs,
            });
          }

          const statusMs = toMs(d.statusUpdatedAt);
          if (statusMs > 0 && isStaffRole(d.assignedRole)) {
            initial.push({
              id: `${doc.id}::status::${statusMs}`,
              type: "status",
              title: `Status updated${d.status ? `: ${d.status}` : ""}`,
              complaintId: doc.id,
              category: d.category || "",
              date: statusMs,
            });
          }

          const history = Array.isArray(d.feedbackHistory) ? d.feedbackHistory : [];
          const last = history[history.length - 1];
          const fbMs = Math.max(toMs(last?.date), toMs(d.feedbackUpdatedAt));
          if (fbMs > 0 && last && isStaffRole(last.adminRole)) {
            initial.push({
              id: `${doc.id}::feedback::${fbMs}`,
              type: "feedback",
              title: "New feedback from staff",
              complaintId: doc.id,
              category: d.category || "",
              date: fbMs,
            });
          }

          prevRef.current.set(doc.id, {
            status: d.status,
            feedbackCount: history.length,
            feedbackValue: d.Feedback || "",
            assignedRole: d.assignedRole,
          });
        });

        if (initial.length) {
          initial.sort((a, b) => b.date - a.date);
          setNotifications(initial.slice(0, 100));
        }
        initialLoadRef.current = false;
        setLoading(false);
        return;
      }

      const newNotifs = [];
      snapshot.docChanges().forEach((change) => {
        const id = change.doc.id;
        const d = change.doc.data() || {};
        const prev = prevRef.current.get(id) || { status: undefined, feedbackCount: 0, feedbackValue: "", assignedRole: undefined };
        const nowMs = Date.now();

        if (change.type === "added") {
          const subMs = toMs(d.submissionDate) || nowMs;
          newNotifs.push({ id: `${id}::new::${subMs}` , type: "new", title: "New complaint submitted", complaintId: id, category: d.category || "", date: subMs });
        }

        if (change.type === "modified" && d.status !== prev.status && isStaffRole(d.assignedRole)) {
          newNotifs.push({ id: `${id}::status::${nowMs}`, type: "status", title: `Status updated${d.status ? `: ${d.status}` : ""}`, complaintId: id, category: d.category || "", date: nowMs });
        }

        const history = Array.isArray(d.feedbackHistory) ? d.feedbackHistory : [];
        const feedbackCount = history.length;
        const feedbackValue = d.Feedback || "";
        if (change.type === "modified" && (feedbackCount > (prev.feedbackCount || 0) || (feedbackValue && feedbackValue !== (prev.feedbackValue || "")))) {
          const last = history[history.length - 1];
          const role = last?.adminRole || "";
          if (isStaffRole(role)) {
            let dateMs = toMs(last?.date) || nowMs;
            newNotifs.push({ id: `${id}::feedback::${feedbackCount}-${dateMs}`, type: "feedback", title: "New feedback from staff", complaintId: id, category: d.category || "", date: dateMs });
          }
        }

        prevRef.current.set(id, { status: d.status, feedbackCount, feedbackValue, assignedRole: d.assignedRole });
      });

      if (newNotifs.length) {
        setNotifications((prev) => {
          const merged = [...newNotifs, ...prev];
          return merged.slice(0, 100);
        });
      }
    }, () => setLoading(false));

    return () => { try { unsub && unsub(); } catch {} };
  }, [currentUser?.uid, currentUser?.email]);

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

export default useAdminNotifications;

const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// fcm_tokens/{userId} = { tokens: [..], userId, updatedAt }
// (older docs may still hold a single `token` field — both are read)
async function tokensFor(userId) {
  const doc = await db.collection("fcm_tokens").doc(userId).get();
  if (!doc.exists) return [];
  const d = doc.data() || {};
  const list = Array.isArray(d.tokens) ? d.tokens.slice() : [];
  if (d.token && !list.includes(d.token)) list.push(d.token);
  return list;
}

const DEAD = ["messaging/registration-token-not-registered", "messaging/invalid-registration-token", "messaging/invalid-argument"];

// ── Send FCM push to one or more userIds (every registered device) ───────────
// The sender's own devices never receive the push, even on a shared phone.
async function sendPush(userIds, title, body, url, urgent = false, senderId = "", kind = "") {
  const results = [];
  const senderTokens = senderId ? new Set(await tokensFor(senderId)) : new Set();
  for (const userId of [...new Set(userIds)]) {
    if (!userId || userId === senderId) continue;
    const tokens = (await tokensFor(userId)).filter(t => !senderTokens.has(t));
    if (!tokens.length) { results.push({ userId, sent: 0, reason: "no_device" }); continue; }
    let sent = 0;
    for (const token of tokens) {
      // Data-only web push: the HosFIX service worker builds the notification itself
      // (unique tag per job, renotify, long vibration, stays on screen for assignments)
      const jobId = (url.split("#job=")[1] || "");
      const message = {
        token,
        data: {
          title, body,
          kind: kind || "info",
          jobId,
          url: "/hosmain-" + userId + ".html#job=" + jobId,
          urgent: urgent ? "true" : "false"
        },
        webpush: {
          headers: { Urgency: "high", TTL: "86400" },
          fcm_options: { link: "/hosmain-" + userId + ".html#job=" + jobId }
        }
      };
      try {
        await admin.messaging().send(message);
        sent++;
      } catch (err) {
        // Remove tokens for uninstalled apps / revoked permission
        if (DEAD.includes(err.code)) {
          await db.collection("fcm_tokens").doc(userId).set({ tokens: FieldValue.arrayRemove(token) }, { merge: true }).catch(() => {});
        }
      }
    }
    results.push({ userId, sent, reason: sent ? "ok" : "send_failed" });
  }
  return results;
}

// ── HTTP endpoint called by the HosFIX app ───────────────────────────────────
// POST /notify  { event, job, assignees, adminIds, senderId }
exports.notify = onRequest({ cors: true, region: "europe-west1" }, async (req, res) => {
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  if (req.method !== "POST")    { res.status(405).send("Method not allowed"); return; }

  const { event, job = {}, assignees = [], adminIds = [], senderId = "" } = req.body || {};
  const jobUrl = `/hosmain.html#job=${job.id || ""}`;
  const where  = job.areaLabel || job.area || "";
  let results = [];

  if (event === "job_new") {
    results = await sendPush(adminIds, "🔧 New job logged",
      `${job.title} — ${where} [${job.priority || "normal"}]`, jobUrl, false, senderId, "new");
  }
  if (event === "job_assigned") {
    results = await sendPush(assignees, job.priority === "urgent" ? "🚨 URGENT job assigned to you" : "📋 Job assigned to you",
      `${job.title} — ${where}`, jobUrl, true, senderId, job.priority === "urgent" ? "urgent" : "assigned");
  }
  if (event === "job_completed") {
    results = await sendPush(adminIds, "✅ Job completed", `${job.title} — ${where}`, jobUrl, false, senderId, "complete");
  }
  if (event === "job_urgent") {
    results = await sendPush([...adminIds, ...assignees], "🚨 URGENT job logged", `${job.title} — ${where}`, jobUrl, true, senderId, "urgent");
  }

  res.json({ ok: true, event, results });
});

// ── Save this device's FCM token for a user ──────────────────────────────────
// POST /register  { userId, token }
// A device belongs to one person at a time: the token is removed from any
// other user it was registered under (e.g. a phone used for testing as
// several people), and added to this user's list of devices.
exports.register = onRequest({ cors: true, region: "europe-west1" }, async (req, res) => {
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  const { userId, token } = req.body || {};
  if (!userId || !token) { res.status(400).json({ error: "userId and token required" }); return; }

  const others = await db.collection("fcm_tokens").where("tokens", "array-contains", token).get();
  const batch = db.batch();
  others.forEach(d => { if (d.id !== userId) batch.set(d.ref, { tokens: FieldValue.arrayRemove(token) }, { merge: true }); });
  const legacy = await db.collection("fcm_tokens").where("token", "==", token).get();
  legacy.forEach(d => { if (d.id !== userId) batch.set(d.ref, { token: FieldValue.delete() }, { merge: true }); });
  batch.set(db.collection("fcm_tokens").doc(userId), {
    userId,
    tokens: FieldValue.arrayUnion(token),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  await batch.commit();

  res.json({ ok: true, userId });
});

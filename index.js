const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();
const db = admin.firestore();

// Mailbox HosPRO sends through (set once via: firebase functions:secrets:set MAIL_USER / MAIL_PASS)
const MAIL_USER = defineSecret("MAIL_USER");
const MAIL_PASS = defineSecret("MAIL_PASS");

// ── Send FCM push to one or more userIds ─────────────────────────────────────
async function sendPush(userIds, title, body, url, urgent = false) {
  const results = [];
  for (const userId of userIds) {
    try {
      const doc = await db.collection("fcm_tokens").doc(userId).get();
      if (!doc.exists) continue;
      const { token } = doc.data();
      if (!token) continue;

      const message = {
        token,
        notification: { title, body },
        data: { title, body, url: url || "/hosmain.html", urgent: urgent ? "true" : "false", tag: "hosfix-" + Date.now() },
        webpush: {
          notification: {
            title, body,
            icon: "/assets/icon-192.png",
            badge: "/assets/icon-192.png",
            vibrate: [200, 100, 200, 100, 200],
            requireInteraction: urgent,
            tag: "hosfix"
          },
          fcm_options: { link: url || "/hosmain.html" }
        },
        android: {
          priority: urgent ? "high" : "normal",
          notification: { sound: "default", channelId: "hosfix" }
        },
        apns: {
          payload: { aps: { sound: "default", badge: 1 } }
        }
      };

      const resp = await admin.messaging().send(message);
      results.push({ userId, success: true, messageId: resp });
    } catch (err) {
      results.push({ userId, success: false, error: err.message });
    }
  }
  return results;
}

// ── HTTP endpoint called by the HosFIX app ───────────────────────────────────
// POST /notify  { event, job, assignees, adminIds }
exports.notify = onRequest({ cors: true, region: "europe-west1" }, async (req, res) => {
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  if (req.method !== "POST")    { res.status(405).send("Method not allowed"); return; }

  const { event, job, assignees = [], adminIds = [] } = req.body;
  const jobUrl = `/hosmain.html#job=${job?.id || ""}`;

  let results = [];

  if (event === "job_new") {
    // Notify all admins — new job logged
    results = await sendPush(
      adminIds,
      "🔧 New job logged",
      `"${job.title}" — ${job.areaLabel || job.area || ""} [${job.priority || "normal"}]`,
      jobUrl, false
    );
  }

  if (event === "job_assigned") {
    // Notify assignees — job assigned to them
    results = await sendPush(
      assignees,
      "📋 Job assigned to you",
      `"${job.title}" — ${job.areaLabel || job.area || ""} [${job.priority || "normal"}]`,
      jobUrl, false
    );
  }

  if (event === "job_completed") {
    // Notify all admins — job completed
    results = await sendPush(
      adminIds,
      "✅ Job completed",
      `"${job.title}" — ${job.areaLabel || job.area || ""}`,
      jobUrl, false
    );
  }

  if (event === "job_urgent") {
    // Urgent — notify everyone
    const everyone = [...new Set([...adminIds, ...assignees])];
    results = await sendPush(
      everyone,
      "🚨 URGENT job logged",
      `"${job.title}" — ${job.areaLabel || job.area || ""}`,
      jobUrl, true
    );
  }

  res.json({ ok: true, event, results });
});

// ── Send an email FROM HosPRO (used by Guest Requests Payable) ───────────────
// POST /sendGuestRequest  { to, subject, text, html, replyTo }
// Sends as "Reception – Guest Request". Needs secrets MAIL_USER / MAIL_PASS.
exports.sendGuestRequest = onRequest(
  { cors: true, region: "europe-west1", secrets: [MAIL_USER, MAIL_PASS] },
  async (req, res) => {
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST")    { res.status(405).send("Method not allowed"); return; }
    try {
      const b = req.body || {};
      const to = b.to || "finance@brandonhallhotelandspa.com";
      const user = MAIL_USER.value();
      const port = Number(process.env.MAIL_PORT || 465);
      const transport = nodemailer.createTransport({
        host: process.env.MAIL_HOST || "smtp.gmail.com",
        port: port,
        secure: port === 465,                       // 465 = SSL, 587 = STARTTLS
        auth: { user: user, pass: MAIL_PASS.value() }
      });
      await transport.sendMail({
        from: `"Reception – Guest Request" <${user}>`,
        to: to,
        replyTo: b.replyTo || "reception@brandonhallhotelandspa.com",
        subject: b.subject || "Guest Request Payable",
        text: b.text || "",
        html: b.html || undefined
      });
      res.json({ ok: true });
    } catch (err) {
      console.error("sendGuestRequest", err);
      res.status(500).json({ ok: false, error: String((err && err.message) || err) });
    }
  }
);

// ── Save/update FCM token for a user ─────────────────────────────────────────
// POST /register  { userId, token }
exports.register = onRequest({ cors: true, region: "europe-west1" }, async (req, res) => {
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  const { userId, token } = req.body;
  if (!userId || !token) { res.status(400).json({ error: "userId and token required" }); return; }
  await db.collection("fcm_tokens").doc(userId).set({
    token,
    userId,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  res.json({ ok: true, userId });
});

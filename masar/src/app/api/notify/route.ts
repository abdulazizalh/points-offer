// Server-side notification fan-out for SMS (Twilio-compatible) and WhatsApp Business Cloud API.
// Secrets are read from server env only. A channel is reported as configured only when
// all of its credentials are present — the client never pretends delivery happened.
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const smsConfigured = () => !!(process.env.SMS_TWILIO_ACCOUNT_SID && process.env.SMS_TWILIO_AUTH_TOKEN && process.env.SMS_TWILIO_FROM);
const waConfigured = () => !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
const supabaseConfigured = () => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const isSupabaseMode = () => process.env.NEXT_PUBLIC_DATA_MODE === "supabase" && supabaseConfigured();

export async function GET() {
  // Server channels need the Supabase backend to resolve the recipient's phone securely.
  return NextResponse.json({
    sms: smsConfigured() && isSupabaseMode(),
    whatsapp: waConfigured() && isSupabaseMode(),
    push: true,
  });
}

type Body = { notificationId?: string; channels?: { sms?: boolean; whatsapp?: boolean }; title?: string; body?: string };

export async function POST(req: Request) {
  const result: { sms?: string; whatsapp?: string } = {};
  let payload: Body;
  try {
    payload = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const wantSms = !!payload.channels?.sms;
  const wantWa = !!payload.channels?.whatsapp;
  if (wantSms && !smsConfigured()) result.sms = "not_configured";
  if (wantWa && !waConfigured()) result.whatsapp = "not_configured";
  if (!isSupabaseMode()) {
    if (wantSms) result.sms = "not_configured";
    if (wantWa) result.whatsapp = "not_configured";
    return NextResponse.json(result);
  }

  // Authenticate the caller and resolve their phone number server-side.
  // The recipient is always the authenticated user — callers can't target other numbers.
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data: auth } = await admin.auth.getUser(token);
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: notif } = await admin.from("notifications").select("id,user_id").eq("id", payload.notificationId ?? "").maybeSingle();
  if (!notif || notif.user_id !== auth.user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const phone = auth.user.phone ? `+${auth.user.phone.replace(/^\+/, "")}` : null;
  const text = `${(payload.title ?? "").slice(0, 80)}\n${(payload.body ?? "").slice(0, 300)}`;

  if (wantSms && smsConfigured() && phone) {
    try {
      const sid = process.env.SMS_TWILIO_ACCOUNT_SID!;
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          authorization: `Basic ${Buffer.from(`${sid}:${process.env.SMS_TWILIO_AUTH_TOKEN}`).toString("base64")}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: phone, From: process.env.SMS_TWILIO_FROM!, Body: text }),
      });
      result.sms = r.ok ? "sent" : "failed";
    } catch {
      result.sms = "failed";
    }
  }
  if (wantWa && waConfigured() && phone) {
    try {
      const r = await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, "content-type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone.replace(/^\+/, ""),
          type: "template",
          template: { name: process.env.WHATSAPP_TEMPLATE_NAME || "masar_queue_update", language: { code: "ar" }, components: [{ type: "body", parameters: [{ type: "text", text: text.slice(0, 900) }] }] },
        }),
      });
      result.whatsapp = r.ok ? "sent" : "failed";
    } catch {
      result.whatsapp = "failed";
    }
  }
  await admin.from("notifications").update({ delivery: result }).eq("id", notif.id);
  return NextResponse.json(result);
}

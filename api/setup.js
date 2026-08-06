// /api/setup.js
// Runs on Vercel's servers, never in the browser. Hashes both PINs before
// they ever touch the database, generates a one-time verification token,
// and emails a magic link via Resend so an adult confirms setup.

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  const resendKey = process.env.RESEND_API_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Server is missing Supabase configuration." });
  }
  if (!resendKey) {
    return res.status(500).json({ error: "Server is missing Resend configuration." });
  }

  const { name, email, waterGoalOz, kidPin, coachPin } = req.body || {};

  if (!name || !email || !kidPin || !coachPin) {
    return res.status(400).json({ error: "Missing required fields." });
  }
  if (!/^\d{4}$/.test(kidPin) || !/^\d{4}$/.test(coachPin)) {
    return res.status(400).json({ error: "PINs must be exactly 4 digits." });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Only ever allow one profile row to be created.
  const { data: existing } = await supabase.from("profile").select("id").limit(1).maybeSingle();
  if (existing) {
    return res.status(400).json({ error: "Setup has already been completed." });
  }

  const kidPinHash = await bcrypt.hash(kidPin, 10);
  const coachPinHash = await bcrypt.hash(coachPin, 10);
  const token = crypto.randomBytes(24).toString("hex");

  const { error: insertError } = await supabase.from("profile").insert({
    name,
    email,
    water_goal_oz: Number(waterGoalOz) || 64,
    kid_pin_hash: kidPinHash,
    coach_pin_hash: coachPinHash,
    setup_token: token,
    setup_verified: false,
  });

  if (insertError) {
    return res.status(500).json({ error: "Could not save profile.", details: insertError.message });
  }

  // Send the magic link via Resend's HTTP API directly (no SDK required).
  const origin = req.headers.origin || `https://${req.headers.host}`;
  const verifyUrl = `${origin}/?verify=${token}`;

  try {
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: email,
        subject: "Confirm your Youth Fitness Tracker setup",
        html: `<p>Click below to finish setting up ${name}'s dashboard:</p>
               <p><a href="${verifyUrl}">${verifyUrl}</a></p>
               <p>If you didn't request this, you can ignore this email.</p>`,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      return res.status(500).json({ error: "Profile saved, but the email failed to send.", details: errText });
    }
  } catch (e) {
    return res.status(500).json({ error: "Profile saved, but the email failed to send.", details: String(e) });
  }

  return res.status(200).json({ success: true });
}

// /api/check-pin.js
// Checks a submitted PIN against the stored hash for "kid" or "coach".
// This check happens here, server-side, so the real PIN values never
// need to be readable from the browser.

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Server is missing Supabase configuration." });
  }

  const { role, pin } = req.body || {};
  if (role !== "kid" && role !== "coach") {
    return res.status(400).json({ error: "Invalid role." });
  }
  if (!/^\d{4}$/.test(pin || "")) {
    return res.status(400).json({ error: "Invalid PIN format." });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const column = role === "kid" ? "kid_pin_hash" : "coach_pin_hash";

  const { data: profile, error } = await supabase
    .from("profile")
    .select(`${column}`)
    .limit(1)
    .maybeSingle();

  if (error || !profile) {
    return res.status(500).json({ error: "Could not load profile." });
  }

  const storedHash = profile[column];
  const match = storedHash ? await bcrypt.compare(pin, storedHash) : false;

  return res.status(200).json({ success: match });
}

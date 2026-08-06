// /api/verify-setup.js
// Confirms the one-time token from the magic-link email and marks the
// profile as verified so the app unlocks past first-time setup.

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Server is missing Supabase configuration." });
  }

  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ error: "Missing token." });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: profile, error } = await supabase
    .from("profile")
    .select("id, setup_token, setup_verified")
    .eq("setup_token", token)
    .maybeSingle();

  if (error || !profile) {
    return res.status(400).json({ error: "Invalid or expired verification link." });
  }
  if (profile.setup_verified) {
    return res.status(200).json({ success: true, alreadyVerified: true });
  }

  const { error: updateError } = await supabase
    .from("profile")
    .update({ setup_verified: true, setup_token: null })
    .eq("id", profile.id);

  if (updateError) {
    return res.status(500).json({ error: "Could not verify.", details: updateError.message });
  }

  return res.status(200).json({ success: true });
}

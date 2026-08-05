import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";

const THEME = {
  bg: "#0F1117",
  panel: "#181C25",
  card: "#1E2330",
  border: "#2A3045",
  blue: "#4A9EFF",
  green: "#2ECC71",
  red: "#E05555",
  text: "#E8EAF0",
  muted: "#8A93B0",
};

// ── Small shared UI pieces ──────────────────────────────────────────
function Screen({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: THEME.bg,
        color: THEME.text,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        fontFamily: "system-ui, sans-serif",
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
}

function Card({ children, width = 360 }) {
  return (
    <div
      style={{
        background: THEME.panel,
        border: `1px solid ${THEME.border}`,
        borderRadius: 16,
        padding: 24,
        width,
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 4, fontWeight: 600 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  background: THEME.card,
  border: `1px solid ${THEME.border}`,
  borderRadius: 8,
  color: THEME.text,
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
};

const buttonStyle = (color = THEME.blue) => ({
  width: "100%",
  background: color,
  color: "#0F1117",
  border: "none",
  borderRadius: 10,
  padding: "12px 14px",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
});

// ── First-time setup form ───────────────────────────────────────────
function SetupForm({ onDone }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [waterGoal, setWaterGoal] = useState("64");
  const [kidPin, setKidPin] = useState("");
  const [kidPinConfirm, setKidPinConfirm] = useState("");
  const [coachPin, setCoachPin] = useState("");
  const [coachPinConfirm, setCoachPinConfirm] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const isFourDigits = (v) => /^\d{4}$/.test(v);

  async function submit() {
    setErr("");
    if (!name.trim()) return setErr("Enter a name.");
    if (!email.trim() || !email.includes("@")) return setErr("Enter a valid email.");
    if (!isFourDigits(kidPin)) return setErr("Kid PIN must be exactly 4 digits.");
    if (kidPin !== kidPinConfirm) return setErr("Kid PINs don't match.");
    if (!isFourDigits(coachPin)) return setErr("Coach PIN must be exactly 4 digits.");
    if (coachPin !== coachPinConfirm) return setErr("Coach PINs don't match.");
    if (kidPin === coachPin) return setErr("Kid and coach PINs must be different.");

    setBusy(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          waterGoalOz: Number(waterGoal) || 64,
          kidPin,
          coachPin,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Setup failed.");
      onDone();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Card>
        <h2 style={{ marginTop: 0 }}>First-Time Setup</h2>
        <p style={{ fontSize: 13, color: THEME.muted, marginTop: -8 }}>
          This only appears once. An adult should complete this.
        </p>
        <Field label="His name">
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Your email (for setup verification)">
          <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Daily water goal (oz)">
          <input style={inputStyle} type="number" value={waterGoal} onChange={(e) => setWaterGoal(e.target.value)} />
        </Field>
        <Field label="His 4-digit PIN">
          <input style={inputStyle} inputMode="numeric" maxLength={4} value={kidPin} onChange={(e) => setKidPin(e.target.value.replace(/\D/g, ""))} />
        </Field>
        <Field label="Confirm his PIN">
          <input style={inputStyle} inputMode="numeric" maxLength={4} value={kidPinConfirm} onChange={(e) => setKidPinConfirm(e.target.value.replace(/\D/g, ""))} />
        </Field>
        <Field label="Coach (your) 4-digit PIN">
          <input style={inputStyle} inputMode="numeric" maxLength={4} value={coachPin} onChange={(e) => setCoachPin(e.target.value.replace(/\D/g, ""))} />
        </Field>
        <Field label="Confirm coach PIN">
          <input style={inputStyle} inputMode="numeric" maxLength={4} value={coachPinConfirm} onChange={(e) => setCoachPinConfirm(e.target.value.replace(/\D/g, ""))} />
        </Field>
        {err && <div style={{ color: THEME.red, fontSize: 13, marginBottom: 10 }}>{err}</div>}
        <button style={buttonStyle()} onClick={submit} disabled={busy}>
          {busy ? "Saving..." : "Save & Send Verification Email"}
        </button>
      </Card>
    </Screen>
  );
}

// ── "Check your email" holding screen ───────────────────────────────
function PendingVerification() {
  return (
    <Screen>
      <Card>
        <h2 style={{ marginTop: 0 }}>Check Your Email</h2>
        <p style={{ color: THEME.muted, fontSize: 14 }}>
          A verification link was sent to the email you entered. Click it to
          activate the app. Once verified, reload this page.
        </p>
      </Card>
    </Screen>
  );
}

// ── Landing screen: choose which view to enter ──────────────────────
function Landing({ name, onChoose }) {
  return (
    <Screen>
      <Card>
        <h2 style={{ marginTop: 0, textAlign: "center" }}>
          {name ? `${name}'s Dashboard` : "Youth Fitness Tracker"}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
          <button style={buttonStyle(THEME.blue)} onClick={() => onChoose("kid")}>
            His View
          </button>
          <button style={buttonStyle(THEME.green)} onClick={() => onChoose("coach")}>
            Coach View
          </button>
        </div>
      </Card>
    </Screen>
  );
}

// ── PIN pad ──────────────────────────────────────────────────────────
function PinPad({ role, onSuccess, onCancel }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = useCallback(
    async (fullPin) => {
      setBusy(true);
      setErr("");
      try {
        const res = await fetch("/api/check-pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role, pin: fullPin }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          onSuccess();
        } else {
          setErr("Incorrect PIN.");
          setPin("");
        }
      } catch (e) {
        setErr("Something went wrong. Try again.");
        setPin("");
      } finally {
        setBusy(false);
      }
    },
    [role, onSuccess]
  );

  function press(d) {
    if (busy) return;
    const next = (pin + d).slice(0, 4);
    setPin(next);
    if (next.length === 4) submit(next);
  }

  return (
    <Screen>
      <Card width={300}>
        <h3 style={{ marginTop: 0, textAlign: "center" }}>
          {role === "kid" ? "Enter His PIN" : "Enter Coach PIN"}
        </h3>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, margin: "16px 0" }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: pin.length > i ? THEME.blue : THEME.card,
                border: `1px solid ${THEME.border}`,
              }}
            />
          ))}
        </div>
        {err && <div style={{ color: THEME.red, fontSize: 13, textAlign: "center", marginBottom: 10 }}>{err}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((d, i) =>
            d === "" ? (
              <div key={i} />
            ) : (
              <button
                key={i}
                onClick={() => (d === "⌫" ? setPin(pin.slice(0, -1)) : press(d))}
                style={{
                  padding: "14px 0",
                  fontSize: 18,
                  borderRadius: 8,
                  border: `1px solid ${THEME.border}`,
                  background: THEME.card,
                  color: THEME.text,
                  cursor: "pointer",
                }}
              >
                {d}
              </button>
            )
          )}
        </div>
        <button
          onClick={onCancel}
          style={{ marginTop: 14, background: "none", border: "none", color: THEME.muted, cursor: "pointer", width: "100%" }}
        >
          ← Back
        </button>
      </Card>
    </Screen>
  );
}

// ── Bare navigation shell (placeholder — real features come later) ──
function Shell({ role, onLogout }) {
  const [tab, setTab] = useState("workouts");
  const tabs = ["workouts", "water", "badges"];
  return (
    <Screen>
      <Card width={420}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>{role === "kid" ? "His View" : "Coach View"}</h3>
          <button onClick={onLogout} style={{ background: "none", border: "none", color: THEME.muted, cursor: "pointer" }}>
            Log out
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 8,
                border: `1px solid ${THEME.border}`,
                background: tab === t ? THEME.blue : THEME.card,
                color: tab === t ? "#0F1117" : THEME.text,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                textTransform: "capitalize",
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <div style={{ color: THEME.muted, fontSize: 14, textAlign: "center", padding: "30px 0" }}>
          {tab.charAt(0).toUpperCase() + tab.slice(1)} — coming soon. This is a
          placeholder screen confirming login and navigation work.
        </div>
      </Card>
    </Screen>
  );
}

// ── Root app: decides which screen to show ──────────────────────────
export default function App() {
  const [status, setStatus] = useState("loading"); // loading | setup | pending | landing | pin | shell
  const [profileName, setProfileName] = useState("");
  const [pinRole, setPinRole] = useState(null);
  const [activeRole, setActiveRole] = useState(null);
  const [verifyMsg, setVerifyMsg] = useState("");

  const loadProfileStatus = useCallback(async () => {
    // Only select non-sensitive columns — PIN hashes and setup tokens are
    // never fetched from the browser, only checked server-side in /api.
    const { data, error } = await supabase
      .from("profile")
      .select("id, name, setup_verified")
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      setStatus("setup");
      return;
    }
    setProfileName(data.name || "");
    setStatus(data.setup_verified ? "landing" : "pending");
  }, []);

  useEffect(() => {
    async function init() {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("verify");
      if (token) {
        try {
          const res = await fetch(`/api/verify-setup?token=${encodeURIComponent(token)}`);
          const data = await res.json();
          if (res.ok && data.success) {
            setVerifyMsg("Verified! You can log in below.");
          } else {
            setVerifyMsg("That verification link is invalid or expired.");
          }
        } catch {
          setVerifyMsg("Something went wrong verifying that link.");
        }
        // Clean the token out of the URL so it can't be reused/shared.
        window.history.replaceState({}, "", window.location.pathname);
      }
      await loadProfileStatus();
    }
    init();
  }, [loadProfileStatus]);

  if (status === "loading") {
    return (
      <Screen>
        <div style={{ color: THEME.muted }}>Loading...</div>
      </Screen>
    );
  }

  if (status === "setup") {
    return <SetupForm onDone={() => setStatus("pending")} />;
  }

  if (status === "pending") {
    return <PendingVerification />;
  }

  if (status === "landing") {
    return (
      <>
        {verifyMsg && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              background: THEME.green,
              color: "#0F1117",
              textAlign: "center",
              padding: 8,
              fontSize: 13,
              fontWeight: 600,
              zIndex: 10,
            }}
          >
            {verifyMsg}
          </div>
        )}
        <Landing
          name={profileName}
          onChoose={(role) => {
            setPinRole(role);
            setStatus("pin");
          }}
        />
      </>
    );
  }

  if (status === "pin") {
    return (
      <PinPad
        role={pinRole}
        onSuccess={() => {
          setActiveRole(pinRole);
          setStatus("shell");
        }}
        onCancel={() => setStatus("landing")}
      />
    );
  }

  if (status === "shell") {
    return (
      <Shell
        role={activeRole}
        onLogout={() => {
          setActiveRole(null);
          setStatus("landing");
        }}
      />
    );
  }

  return null;
}

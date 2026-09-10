"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!token) { setError("Missing or invalid reset link."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setDone(true);
        setTimeout(() => router.push("/login"), 2000);
      } else {
        setError(data.message ?? "Something went wrong. Try again.");
      }
    } catch {
      setError("Connection error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F4F2EE",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui, -apple-system, sans-serif",
      padding: "1rem",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 420,
        background: "#fff",
        borderRadius: 14,
        padding: "2.5rem 2rem",
        border: "1px solid #E5E7EB",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "1.5rem" }}>
          <div style={{ marginBottom: "1rem", display: "inline-block" }}>
            <Image src="/auk-logo.png" alt="AUK Marine" width={140} height={48}
              style={{ objectFit: "contain", display: "block" }} />
          </div>
          <h1 style={{
            color: "#0A1628", fontSize: 17, fontWeight: 700, letterSpacing: "0.18em",
            textTransform: "uppercase", textAlign: "center", marginBottom: 6,
          }}>
            Set New Password
          </h1>
        </div>

        <div style={{ borderTop: "1px solid #E5E7EB", marginBottom: "1.75rem" }} />

        {done ? (
          <p style={{ color: "#111827", fontSize: 15, lineHeight: 1.6, marginBottom: "1.5rem" }}>
            Password updated. Redirecting to sign in…
          </p>
        ) : !token ? (
          <p style={{ color: "#DC2626", fontSize: 15, lineHeight: 1.6, marginBottom: "1.5rem" }}>
            This reset link is missing or invalid. Request a new one from the login page.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{
                display: "block", color: "#6B7280", fontSize: 13, fontWeight: 600,
                letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8,
              }}>
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••••••"
                autoComplete="new-password"
                style={{
                  width: "100%", padding: "11px 14px", background: "#fff",
                  border: "1px solid #D1D5DB", borderRadius: 7, color: "#111827",
                  fontSize: 16, outline: "none",
                }}
              />
            </div>
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{
                display: "block", color: "#6B7280", fontSize: 13, fontWeight: 600,
                letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8,
              }}>
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="••••••••••••••••"
                autoComplete="new-password"
                style={{
                  width: "100%", padding: "11px 14px", background: "#fff",
                  border: "1px solid #D1D5DB", borderRadius: 7, color: "#111827",
                  fontSize: 16, outline: "none",
                }}
              />
              {error && <p style={{ color: "#DC2626", fontSize: 14, marginTop: 6 }}>{error}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "12px",
                background: loading ? "#1a7a8f" : "#1BA5C0",
                color: "#fff", border: "none", borderRadius: 7, fontSize: 16,
                fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
                letterSpacing: "0.04em", marginBottom: "1.25rem",
              }}
            >
              {loading ? "Updating…" : "Update Password →"}
            </button>
          </form>
        )}

        <p style={{ textAlign: "center", fontSize: 13.5, color: "#6B7280" }}>
          <Link href="/login" style={{ color: "#0E7490", fontWeight: 500 }}>
            ← Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

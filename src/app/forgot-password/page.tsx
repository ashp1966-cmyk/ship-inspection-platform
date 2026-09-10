"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("");
  const [message, setMessage] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!email) { setError("Enter your email address."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        setSent(true);
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
            Reset Password
          </h1>
        </div>

        <div style={{ borderTop: "1px solid #E5E7EB", marginBottom: "1.75rem" }} />

        {sent ? (
          <p style={{ color: "#111827", fontSize: 15, lineHeight: 1.6, marginBottom: "1.5rem" }}>
            {message}
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{
                display: "block", color: "#6B7280", fontSize: 13, fontWeight: 600,
                letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8,
              }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="you@aukmarime.com"
                autoComplete="email"
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
              {loading ? "Sending…" : "Send Reset Link →"}
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

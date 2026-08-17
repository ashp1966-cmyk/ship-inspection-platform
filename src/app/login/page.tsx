"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!email || !password) { setError("Enter your email and password."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        const { message } = await res.json();
        setError(message ?? "Invalid credentials.");
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
        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "1.5rem" }}>
          <div style={{ marginBottom: "1rem", display: "inline-block" }}>
            <Image
              src="/auk-logo.png"
              alt="AUK Marine"
              width={140}
              height={48}
              style={{ objectFit: "contain", display: "block" }}
            />
          </div>
          <h1 style={{
            color: "#0A1628",
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            textAlign: "center",
            marginBottom: 6,
          }}>
            AUK Marine and Mining
          </h1>
          <p style={{ color: "#0E7490", fontSize: 15, letterSpacing: "0.03em", fontWeight: 500 }}>
            Ship Inspection Platform
          </p>
        </div>

        {/* Divider */}
        <div style={{ borderTop: "1px solid #E5E7EB", marginBottom: "1.75rem" }} />

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{
              display: "block",
              color: "#6B7280",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 8,
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
                width: "100%",
                padding: "11px 14px",
                background: "#fff",
                border: "1px solid #D1D5DB",
                borderRadius: 7,
                color: "#111827",
                fontSize: 16,
                outline: "none",
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <label style={{
                color: "#6B7280",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}>
                Password
              </label>
              <span style={{ color: "#0E7490", fontSize: 14, cursor: "pointer" }}>
                Forgot password?
              </span>
            </div>
            <div style={{ position: "relative" }}>
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="••••••••••••••••"
                autoComplete="current-password"
                style={{
                  width: "100%",
                  padding: "11px 42px 11px 14px",
                  background: "#fff",
                  border: "1px solid #D1D5DB",
                  borderRadius: 7,
                  color: "#111827",
                  fontSize: 16,
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "#6B7280",
                  cursor: "pointer",
                  fontSize: 18,
                  padding: 0,
                }}
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? "🙈" : "👁"}
              </button>
            </div>
            {error && (
              <p style={{ color: "#DC2626", fontSize: 14, marginTop: 6 }}>{error}</p>
            )}
            {!error && (
              <p style={{ color: "#6B7280", fontSize: 13, marginTop: 6, textAlign: "right" }}>
                Press Enter or click Sign In
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              background: loading ? "#1a7a8f" : "#1BA5C0",
              color: "#fff",
              border: "none",
              borderRadius: 7,
              fontSize: 16,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: "0.04em",
              marginBottom: "1.25rem",
            }}
          >
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </form>

        {/* Footer */}
        <p style={{
          textAlign: "center",
          fontSize: 13.5,
          color: "#6B7280",
        }}>
          🔒 Authorized personnel only — contact{" "}
          <span style={{ color: "#0E7490", fontWeight: 500 }}>AUK Marine</span>{" "}
          for access
        </p>
      </div>
    </div>
  );
}

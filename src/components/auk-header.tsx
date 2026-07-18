"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

export default function AukHeader() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header style={{
      background: "#0A1628",
      borderBottom: "3px solid #1BA5C0",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 1.5rem",
      height: 56,
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          background: "#fff",
          borderRadius: 5,
          padding: "3px 8px",
          display: "flex",
          alignItems: "center",
          height: 36,
        }}>
          <Image
            src="/auk-logo.png"
            alt="AUK Marine"
            width={72}
            height={26}
            style={{ objectFit: "contain", display: "block" }}
          />
        </div>
        <div style={{ borderLeft: "1px solid rgba(255,255,255,0.15)", paddingLeft: 12 }}>
          <div style={{ color: "#fff", fontSize: 12, fontWeight: 600, letterSpacing: "0.04em" }}>
            Ship Inspection Platform
          </div>
          <div style={{ color: "#4ABFDA", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            AUK Marine and Mining
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <nav style={{ display: "flex", gap: 18 }}>
          {["Dashboard", "Vessels", "Reports"].map(item => (
            <span key={item} style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, cursor: "pointer" }}
              onMouseOver={e => (e.currentTarget.style.color = "#fff")}
              onMouseOut={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
            >{item}</span>
          ))}
        </nav>
        <button onClick={handleLogout} style={{
          padding: "5px 14px",
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 5,
          color: "rgba(255,255,255,0.75)",
          fontSize: 12,
          cursor: "pointer",
        }}>Sign out</button>
      </div>
    </header>
  );
}

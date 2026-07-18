import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { headers } from "next/headers";
import AukHeader from "@/components/auk-header";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ship Inspection Platform — AUK Marine",
  description: "Condition and Pre-Purchase inspection system for commercial vessels",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const pathname = headersList.get("x-invoke-path") ?? "";
  const isLogin = pathname === "/login" || pathname.startsWith("/login");

  return (
    <html lang="en">
      <body className={geist.className} style={{ margin: 0, background: "#F4F2EE" }}>
        {!isLogin && <AukHeader />}
        <main>{children}</main>
      </body>
    </html>
  );
}

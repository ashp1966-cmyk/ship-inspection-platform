import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { cookies } from "next/headers";
import AukHeader from "@/components/auk-header";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ship Inspection Platform — AUK Marine",
  description: "Condition and Pre-Purchase inspection system for commercial vessels",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const hasSession = cookieStore.has("ship_session");

  return (
    <html lang="en">
      <body className={geist.className} style={{ margin: 0, background: "#F4F2EE" }}>
        {hasSession && <AukHeader />}
        <main>{children}</main>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "GIS Hub", template: "%s - GIS Hub" },
  description: "GIS Practice Hub: projects, packages, schema tracking, resources, updates, risks, RFIs and QA/QC.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

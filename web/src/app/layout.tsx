import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KaryaFlow — Manajemen Proyek",
  description: "Ruang kerja proyek, biaya lapangan, tagihan, dan dokumen kontraktor.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}

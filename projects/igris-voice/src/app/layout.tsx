import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IGRIS Voice",
  description: "A voice and text workspace for thinking out loud.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

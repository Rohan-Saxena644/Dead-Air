import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "DEAD AIR — The Last Acknowledgement",
  description:
    "One connection is still active. A playable horror investigation inside an abandoned operations console.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

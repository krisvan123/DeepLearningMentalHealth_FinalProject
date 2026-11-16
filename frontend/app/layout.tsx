import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "MINDCARE — Mental Health Support Assistant",
  description:
    "A research-grade Deep Learning mental health text classification assistant.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans min-h-screen bg-white text-mono-900">
        {children}
      </body>
    </html>
  );
}

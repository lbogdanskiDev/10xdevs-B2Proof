import type { Metadata } from "next";
import "@/styles/global.css";

export const metadata: Metadata = {
  title: "10x Next.js Starter",
  description: "Next.js 15 with App Router, React 19, TypeScript, and Tailwind CSS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/favicon.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/global.css";

export const metadata: Metadata = {
  title: "B2Proof",
  description: "Brief management and collaboration platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" href="/favicon.png" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}

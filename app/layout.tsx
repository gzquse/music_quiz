import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Weekly Piano Practice Movement Questionnaire",
  description:
    "A brief weekly survey about body movement during piano practice. Instructor: Lingxi Xu. Research supervisor: Dr. Carla Cash.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Practice Survey",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F2F2F7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jetBrainsMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

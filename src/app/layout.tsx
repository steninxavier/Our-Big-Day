import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Our Big Day",
    template: "%s | Our Big Day",
  },
  description: "Plan, coordinate, celebrate, and preserve your wedding.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${playfairDisplay.variable} ${plusJakartaSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}

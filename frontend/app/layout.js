import { Lato } from "next/font/google";
import "./globals.css";

/**
 * Google Lato font configuration.
 * Weights: 300 (Light), 400 (Regular), 700 (Bold), 900 (Black)
 * Includes italic variants for each weight.
 */
const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  style: ["normal", "italic"],
  variable: "--font-lato",
  display: "swap",
});

export const metadata = {
  title: {
    default: "Ayo Dashboard | Dashboard",
    template: "%s | Ayo Dashboard",
  },
  description:
    "Research management platform for participants and researchers.",
  keywords: ["research", "participants", "researchers", "dashboard"],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${lato.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
import { Raleway } from "next/font/google";
import { KeycloakProvider } from "@/context/KeycloakContext";
import { Toaster } from "react-hot-toast";
import "./globals.css";

/**
 * Google Raleway font configuration.
 * Weights: 300 (Light), 400 (Regular), 700 (Bold), 900 (Black)
 * Includes italic variants for each weight.
 */
const raleway = Raleway({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  style: ["normal", "italic"],
  variable: "--font-raleway",
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
      <body className={`${raleway.variable} font-sans antialiased`}>
        <KeycloakProvider>
          {children}
          <Toaster position="top-right" />
        </KeycloakProvider>
      </body>
    </html>
  );
}
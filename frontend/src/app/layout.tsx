import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Besto Friendo",
  description: "Tutor de conversación en japonés",
  // Nombre bajo el icono al “Añadir a pantalla de inicio” en iOS.
  appleWebApp: {
    capable: true,
    title: "Besto Friendo",
    statusBarStyle: "default",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full overflow-x-hidden antialiased`}
    >
      <body className="flex min-h-full min-w-0 max-w-full flex-col overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}

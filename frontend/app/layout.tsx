import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import AuthGuard from "@/components/AuthGuard";
import { CajaProvider } from "@/contexts/CajaContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", preload: false });

export const metadata: Metadata = {
  title: "Cafetería CAM 15 - POS",
  description: "Sistema Punto de Venta - Cafetería CAM 15",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} ${inter.variable} bg-amber-50`}>
        <AuthGuard>
          <CajaProvider>
            <div className="min-h-screen flex flex-col">
              <Navigation />
              <main className="flex-1 container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
                {children}
              </main>
            </div>
          </CajaProvider>
        </AuthGuard>
      </body>
    </html>
  );
}

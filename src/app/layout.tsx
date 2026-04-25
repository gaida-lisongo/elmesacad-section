import { Montserrat } from "next/font/google";
import "./globals.css";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import { ThemeProvider } from "next-themes";
import ScrollToTop from '@/components/ScrollToTop';
import Aoscompo from "@/utils/aos";
import { DonationProvider } from "./context/donationContext";
import { AuthDialogProvider } from "./context/AuthDialogContext";
import { UserFloatingMenuGate } from "@/components/UserFloatingMenu/UserFloatingMenuGate";
import { AuthHydrate } from "@/components/Auth/AuthHydrate";
const montserrat = Montserrat({ subsets: ["latin"] });
import NextTopLoader from 'nextjs-toploader';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={montserrat.className}>
      <NextTopLoader color="#FF4D7E" />
      <DonationProvider>
        <AuthDialogProvider>
        <ThemeProvider
          attribute="class"
          enableSystem={true}
          defaultTheme="system"
        >
          <AuthHydrate />
          <Aoscompo>
            <Header />
            
            {children}
            
            <Footer />
          </Aoscompo>
          <div className="fixed bottom-8 right-8 z-999 flex items-end gap-3">
            <UserFloatingMenuGate />
            <ScrollToTop />

          </div>
        </ThemeProvider>
        </AuthDialogProvider>
        </DonationProvider>
      </body>
    </html>
  );
}

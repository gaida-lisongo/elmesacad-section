import { Montserrat } from "next/font/google";
import "./globals.css";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import { ThemeProvider } from "next-themes";
import ScrollToTop from '@/components/ScrollToTop';
import Aoscompo from "@/utils/aos";
import { DonationProvider } from "./context/donationContext";
import SessionProviderComp from "@/components/nextauth/SessionProvider";
import { AuthDialogProvider } from "./context/AuthDialogContext";
import UserFloatingMenu, { AdminMenuItem } from "@/components/UserFloatingMenu";
const montserrat = Montserrat({ subsets: ["latin"] });
import NextTopLoader from 'nextjs-toploader';

const adminMenu: AdminMenuItem[] = [
  {
    item: "Dashboard",
    path: "/dashboard",
  },
  {
    item: "Agents",
    path: "/agents",
  },
  {
    item: "Etudiants",
    path: "/etudiants",
  },
  {
    item: "Sections",
    path: "/sections",
  },
  {
    item: "Tickets",
    path: "#",
    subMenu: [
      {
        item: "Etudiants",
        path: "/tickets/etudiants",
      },
      {
        item: "Agents",
        path: "/tickets/agents",
      },
    ]
  },
];

export default function RootLayout({
  children,
  session,
}: Readonly<{
  children: React.ReactNode;
  session:any
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={montserrat.className}>
      <NextTopLoader color="#FF4D7E" />
      <DonationProvider>
        <AuthDialogProvider>
      <SessionProviderComp session={session}>
        <ThemeProvider
          attribute="class"
          enableSystem={true}
          defaultTheme="system"
        >
          <Aoscompo>
            <Header />
            
            {children}
            
            <Footer />
          </Aoscompo>
          <div className="fixed bottom-8 right-8 z-999 flex items-end gap-3">
            <UserFloatingMenu
              matricule="MAT-0000"
              userName="Utilisateur actif"
              userEmail="email@exemple.com"
              adminMenu={adminMenu}
            />
            <ScrollToTop />

          </div>
        </ThemeProvider>
        </SessionProviderComp>
        </AuthDialogProvider>
        </DonationProvider>
      </body>
    </html>
  );
}

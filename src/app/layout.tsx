import type { Metadata } from "next";
import "./globals.css";
import { getT } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Laced Delivery Manager",
  description: "Orders and couriers for Laced",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { lang, dir } = await getT();
  return (
    <html lang={lang} dir={dir} className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

import "./index.css";
import { Noto_Serif, Manrope } from "next/font/google";

const notoSerif = Noto_Serif({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Cejas Medellín Studio",
    template: "%s — Cejas Medellín Studio",
  },
  description:
    "Diseño de cejas y productos para el cuidado profesional en Medellín.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${notoSerif.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}

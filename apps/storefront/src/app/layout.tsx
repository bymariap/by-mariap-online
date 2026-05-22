import './globals.css';

export const metadata = {
  title: { default: 'Cejas Medellín Studio', template: '%s — Cejas Medellín Studio' },
  description: 'Diseño de cejas y productos para el cuidado profesional en Medellín.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

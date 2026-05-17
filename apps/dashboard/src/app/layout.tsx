import './globals.css';

export const metadata = {
  title: 'Agente IA - Dashboard',
  description: 'Plataforma de agentes de IA para WhatsApp',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-50 antialiased">{children}</body>
    </html>
  );
}

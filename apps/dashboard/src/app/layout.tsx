import './globals.css';

export const metadata = {
  title: 'LeadPilot - Inteligência Operacional',
  description: 'Plataforma de agentes de IA para automação de atendimento',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-dark-950 text-dark-100 antialiased">{children}</body>
    </html>
  );
}

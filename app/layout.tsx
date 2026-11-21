import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { TEXTOS, VIDEO } from '@/lib/config';
import { fechaHoraMadrid } from '@/lib/calc/formato';
import { ThemeToggle, SCRIPT_TEMA } from '@/components/ThemeToggle';
import { PieLegal } from '@/components/PieLegal';
import { obtenerSnapshot } from '@/components/cargarSnapshot';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' });

export const metadata: Metadata = {
  title: { default: TEXTOS.titulo, template: `%s · ${TEXTOS.titulo}` },
  description:
    'Sigue en tiempo casi real las seis condiciones con las que Polymarket define el pinchazo de la burbuja de la IA, con el análisis de Juan Ramón Rallo.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0b0f14' },
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
  ],
};

async function sello(): Promise<string> {
  try {
    const s = await obtenerSnapshot();
    return fechaHoraMadrid(s.generadoEn);
  } catch (e) {
    console.error('[ui] No se pudo obtener el snapshot para la cabecera:', e);
    return '—';
  }
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const actualizado = await sello();
  const simulado = process.env.MOCK_DATA === '1';
  return (
    <html lang="es" data-theme="dark" suppressHydrationWarning className={`${inter.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-screen antialiased">
        <a href="#contenido" className="saltar">
          Saltar al contenido
        </a>
        <header className="cabecera sticky top-0 z-40 border-b border-borde bg-fondo/95 backdrop-blur supports-[backdrop-filter]:bg-fondo/80">
          {simulado ? (
            <p className="bg-ambar/15 px-4 py-0.5 text-center text-[11px] font-medium text-ambar-tx">Modo simulado: datos de prueba</p>
          ) : null}
          <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-2 sm:px-6">
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold leading-tight sm:text-lg">
                <Link href="/" className="hover:underline">
                  {TEXTOS.titulo}
                </Link>
              </p>
              <p className="flex flex-wrap gap-x-3 text-[11px] leading-snug text-texto-2 sm:text-xs">
                <a href={VIDEO.url} target="_blank" rel="noopener noreferrer" className="enlace">
                  {TEXTOS.subtitulo}
                </a>
                <span>
                  Actualizado: <span className="cifra">{actualizado}</span> (hora de Madrid)
                </span>
              </p>
            </div>
            <ThemeToggle />
          </div>
        </header>
        <div id="contenido" tabIndex={-1} className="outline-none">
          {children}
        </div>
        <PieLegal />
      </body>
    </html>
  );
}

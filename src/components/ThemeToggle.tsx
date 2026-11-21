'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Tema = 'dark' | 'light';
export const CLAVE_TEMA = 'tema';

/** Script inline para <head>: aplica el tema antes de pintar (sin parpadeo). */
export const SCRIPT_TEMA = `(function(){try{var t=localStorage.getItem('${CLAVE_TEMA}');if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}document.documentElement.setAttribute('data-theme',t)}catch(e){document.documentElement.setAttribute('data-theme','dark')}})();`;

/** Conmutador claro/oscuro; persiste en localStorage. */
export function ThemeToggle() {
  const [tema, setTema] = useState<Tema | null>(null);

  useEffect(() => {
    const t = document.documentElement.getAttribute('data-theme');
    setTema(t === 'light' ? 'light' : 'dark');
  }, []);

  const cambiar = () => {
    const nuevo: Tema = tema === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', nuevo);
    try {
      localStorage.setItem(CLAVE_TEMA, nuevo);
    } catch {
      /* almacenamiento no disponible: el cambio dura solo esta visita */
    }
    setTema(nuevo);
  };

  const etiqueta = tema === null ? 'Cambiar tema' : tema === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro';
  return (
    <button
      type="button"
      onClick={cambiar}
      data-testid="theme-toggle"
      data-tema={tema ?? ''}
      aria-label={etiqueta}
      title={etiqueta}
      className="no-imprimir inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-borde text-texto hover:border-borde-fuerte"
    >
      {tema === 'light' ? <Moon aria-hidden="true" className="h-4 w-4" /> : <Sun aria-hidden="true" className="h-4 w-4" />}
    </button>
  );
}

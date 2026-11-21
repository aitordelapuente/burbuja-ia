'use client';

import { Component, type ReactNode } from 'react';

/** Error boundary por módulo: un módulo roto no rompe la página (sección 13.6). */
export class LimiteError extends Component<{ children: ReactNode; nombre: string }, { error: boolean }> {
  state = { error: false };

  static getDerivedStateFromError() {
    return { error: true };
  }

  componentDidCatch(error: unknown) {
    console.error(`[ui] Error en el módulo ${this.props.nombre}:`, error);
  }

  render() {
    if (this.state.error) {
      return (
        <div role="status" className="rounded-lg border border-ambar bg-superficie p-4 text-sm text-ambar-tx">
          No se ha podido mostrar «{this.props.nombre}». El resto del panel sigue funcionando.
        </div>
      );
    }
    return this.props.children;
  }
}

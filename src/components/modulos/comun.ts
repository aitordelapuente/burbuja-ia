import type { Condicion, Indicador, Snapshot } from '@/lib/types';

export type PropsModulo = { s: Snapshot };

export const cond = (s: Snapshot, id: string): Condicion | undefined => s.condiciones.find((c) => c.id === id);
export const ind = (s: Snapshot, id: string): Indicador | undefined => s.indicadores[id];

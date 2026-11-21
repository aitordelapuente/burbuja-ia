import 'server-only';
import { cache } from 'react';
import { buildSnapshot } from '@/lib/snapshot';

/** Snapshot deduplicado por petición (layout + página comparten la misma llamada). */
export const obtenerSnapshot = cache(buildSnapshot);

// Datos manuales del repositorio (data/manual, data/auto, data/seed). Validados con zod.
import 'server-only';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { z } from 'zod';
import eventos from '../../../data/manual/eventos.json';
import laboratorios from '../../../data/manual/laboratorios.json';
import nvidia from '../../../data/manual/nvidia.json';
import frentes from '../../../data/manual/frentes_nvidia.json';
import financiacion from '../../../data/manual/financiacion_labs.json';
import regulacion from '../../../data/manual/regulacion.json';
import opv from '../../../data/manual/opv.json';
import citas from '../../../data/seed/citas.json';
import puntocom from '../../../data/seed/puntocom.json';
import componentes from '../../../data/seed/soxx_componentes.json';
import {
  EventosSchema, LaboratoriosSchema, NvidiaSchema, FrentesSchema, FinanciacionSchema, RegulacionSchema, OpvSchema,
  CitasSchema, PuntocomSchema, ComponentesSchema,
} from '../schemas';
import { parsearGpuCsv, parsearGpuAbiertoCsv } from './csv';

export { parsearGpuCsv, parsearGpuAbiertoCsv };

function validar<T extends z.ZodTypeAny>(nombre: string, schema: T, datos: unknown): z.infer<T> {
  const r = schema.safeParse(datos);
  if (!r.success) throw new Error(`[manual] ${nombre} no cumple el esquema: ${r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  return r.data;
}

function leerTexto(rel: string): string {
  try {
    return readFileSync(path.join(process.cwd(), rel), 'utf8');
  } catch {
    return '';
  }
}

export function cargarManual() {
  return {
    eventos: validar('eventos.json', EventosSchema, eventos),
    laboratorios: validar('laboratorios.json', LaboratoriosSchema, laboratorios),
    nvidia: validar('nvidia.json', NvidiaSchema, nvidia),
    frentes: validar('frentes_nvidia.json', FrentesSchema, frentes),
    financiacion: validar('financiacion_labs.json', FinanciacionSchema, financiacion),
    regulacion: validar('regulacion.json', RegulacionSchema, regulacion),
    opv: validar('opv.json', OpvSchema, opv),
    citas: validar('citas.json', CitasSchema, citas),
    puntocom: validar('puntocom.json', PuntocomSchema, puntocom),
    componentes: validar('soxx_componentes.json', ComponentesSchema, componentes),
    gpu: parsearGpuCsv(leerTexto('data/manual/gpu_alquiler.csv')),
    gpuAbierto: parsearGpuAbiertoCsv(leerTexto('data/auto/gpu_alquiler_abierto.csv')),
    reglasSha: leerTexto('data/seed/polymarket-reglas.sha256').trim(),
  };
}
export type DatosManuales = ReturnType<typeof cargarManual>;

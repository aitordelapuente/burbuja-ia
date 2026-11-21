import { describe, expect, it } from 'vitest';
import { buildSnapshot } from '@/lib/snapshot';

describe('snapshot con fixtures (MOCK_DATA=1)', () => {
  it('reproduce el ejemplo verificado de la sección 6.3', async () => {
    const s = await buildSnapshot();
    const c = Object.fromEntries(s.condiciones.map((x) => [x.id, x]));
    console.log(JSON.stringify({ irp: s.irp, ventana: { n: s.ventana.n, en: s.ventana.enVentana, suc: s.ventana.sucesos }, esc: s.escenario, frase: s.fraseDelDia, estados: s.condiciones.map((x) => [x.id, x.estado, x.proximidad, x.fechaSuceso, x.heredada]) }, null, 1));
    expect(c.c2.estado).toBe('cumplida');
    expect(c.c1.estado).toBe('muy_cerca');
    expect(c.c1.precioUmbral).toBeCloseTo(119.62, 1);
    expect(s.ventana.n).toBe(1);
    expect(s.ventana.enVentana).toEqual(['c2']);
    expect(Math.abs((s.irp.valor ?? 0) - 41)).toBeLessThanOrEqual(3);
    expect(s.irp.semaforo).toBe('ambar');
    expect(s.escenario.codigo).toBe('E1');
    const smci = c.c3.detalle!.find((d) => d.ticker === 'SMCI')!;
    expect(smci.heredada).toBe(true);
    expect(c.c3.detalle![0].ticker).toBe('AVGO');
    expect(s.polymarket.horizontes[0].probSi).toBeCloseTo(0.693, 3);
    for (const id of ['I01','I02','I03','I04','I05','I06','I13','I14','I15','I16','I17','I18','I19','I20','I21','I22','I23','I24','I24b','I25','I26','I27','I28','I29','I30','I31','I32','I33','I34','I35','I36','I37','I38','I39','I40','I41','I42']) {
      expect(s.indicadores[id], id).toBeDefined();
    }
    const resumen = Object.values(s.indicadores).map((i) => `${i.id} ${i.semaforo} ${i.valorTexto ?? i.valor}`);
    console.log(resumen.join('\n'));
  });
});

import { test, expect, devices } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Portada (MOCK_DATA=1)', () => {
  test('carga en menos de 3 s y muestra IRP, 1/6, Polymarket y Escenario 1', async ({ page }) => {
    const t0 = Date.now();
    await page.goto('/');
    await expect(page.getByTestId('irp')).toBeVisible();
    expect(Date.now() - t0).toBeLessThan(3000);
    await expect(page.getByTestId('irp')).toContainText(/4[0-4]/);
    await expect(page.getByTestId('contador-condiciones')).toContainText('1/6');
    await expect(page.getByTestId('polymarket-prob')).toContainText('69,3');
    await expect(page.getByTestId('diagnostico')).toContainText('Escenario 1');
  });

  test('existen las 6 tarjetas y c2 está CUMPLIDA', async ({ page }) => {
    await page.goto('/');
    for (const id of ['c1', 'c2', 'c3', 'c4', 'c5', 'c6']) await expect(page.getByTestId(`tarjeta-${id}`)).toBeVisible();
    await expect(page.getByTestId('tarjeta-c2')).toContainText('CUMPLIDA');
  });

  test('el conmutador de tema funciona y persiste tras recargar', async ({ page }) => {
    await page.goto('/');
    const html = page.locator('html');
    const antes = await html.getAttribute('data-theme');
    await page.getByTestId('theme-toggle').click();
    const despues = await html.getAttribute('data-theme');
    expect(despues).not.toBe(antes);
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', despues!);
  });

  test('pie legal y enlaces profundos', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Panel informativo. No es una recomendación de inversión.').first()).toBeVisible();
    for (const ancla of ['resumen', 'termometro', 'polymarket', 'condiciones', 'nvidia', 'semis', 'proveedores', 'computo', 'laboratorios', 'financiacion', 'escenarios', 'puntocom', 'metodologia']) {
      await expect(page.locator(`#${ancla}`)).toHaveCount(1);
    }
  });
});

test.describe('Páginas de detalle', () => {
  for (const id of ['c1', 'c2', 'c3', 'c4', 'c5', 'c6']) {
    test(`/condicion/${id} carga`, async ({ page }) => {
      const r = await page.goto(`/condicion/${id}`);
      expect(r?.status()).toBe(200);
      await expect(page.locator('h1')).toBeVisible();
    });
  }
  test('/condicion/c9 da 404', async ({ page }) => {
    const r = await page.goto('/condicion/c9');
    expect(r?.status()).toBe(404);
  });
  test('/indicador/I24 carga', async ({ page }) => {
    const r = await page.goto('/indicador/I24');
    expect(r?.status()).toBe(200);
  });
  test('/trazabilidad lista todas las filas del Apéndice A (≥ 80)', async ({ page }) => {
    await page.goto('/trazabilidad');
    expect(await page.locator('table tbody tr').count()).toBeGreaterThanOrEqual(80);
  });
});

test.describe('API', () => {
  test('/api/cron/refresh sin token → 401', async ({ request }) => {
    expect((await request.get('/api/cron/refresh')).status()).toBe(401);
  });
  test('/api/cron/refresh con token → 200', async ({ request }) => {
    expect((await request.get('/api/cron/refresh', { headers: { Authorization: 'Bearer secreto-de-prueba' } })).status()).toBe(200);
  });
  test('/api/health?detalle=1 sin token → 401; con token → tabla', async ({ request }) => {
    expect((await request.get('/api/health?detalle=1')).status()).toBe(401);
    const r = await request.get('/api/health?detalle=1', { headers: { Authorization: 'Bearer token-de-prueba' } });
    expect(r.status()).toBe(200);
    const j = await r.json();
    expect(Array.isArray(j.datos)).toBe(true);
    expect(j.datos[0]).toHaveProperty('umbralSinDatoH');
  });
  test('/api/snapshot devuelve el snapshot', async ({ request }) => {
    const j = await (await request.get('/api/snapshot')).json();
    expect(j.condiciones).toHaveLength(6);
    expect(j.ventana.n).toBe(1);
  });
});

test.describe('Accesibilidad (axe)', () => {
  for (const ruta of ['/', '/condicion/c4', '/trazabilidad']) {
    test(`0 violaciones serious/critical en ${ruta}`, async ({ page }) => {
      await page.goto(ruta);
      const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      const graves = res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(graves.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
    });
  }
  test('axe en modo claro', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('tema', 'light');
      document.documentElement.setAttribute('data-theme', 'light');
    });
    const res = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze();
    const graves = res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(graves.map((v) => v.id)).toEqual([]);
  });
});

test.describe('Móvil', () => {
  test.use({ ...devices['iPhone 13'], defaultBrowserType: 'chromium' });
  test('sin scroll horizontal en iPhone 13', async ({ page }) => {
    await page.goto('/');
    const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    expect(sw).toBeLessThanOrEqual(cw);
  });
});

test.describe('Caída de Yahoo simulada', () => {
  test('aparece AvisoStale o «Sin dato» y la página no da error', async ({ page }) => {
    const r = await page.goto('http://localhost:3101/');
    expect(r?.status()).toBe(200);
    const avisos = page.locator('[data-testid="aviso-stale"], [data-testid="sin-dato"]');
    expect(await avisos.count()).toBeGreaterThan(0);
    await expect(page.getByTestId('tarjeta-c1')).toBeVisible();
  });
});

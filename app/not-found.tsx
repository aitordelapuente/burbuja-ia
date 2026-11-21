import Link from 'next/link';

export default function NoEncontrado() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Página no encontrada</h1>
      <p className="mt-2 text-texto-2">El indicador o la condición que buscas no existe.</p>
      <p className="mt-4">
        <Link href="/" className="enlace">
          Volver al panel
        </Link>
      </p>
    </main>
  );
}

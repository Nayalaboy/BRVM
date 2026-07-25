"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
      <h1 className="text-xl font-semibold text-amber-950">Données temporairement indisponibles</h1>
      <p className="mt-2 text-sm text-amber-800">
        La dernière mise à jour n’a pas pu être chargée. Aucune donnée obsolète n’est présentée comme actuelle.
      </p>
      <button type="button" onClick={reset} className="mt-5 rounded-full bg-amber-900 px-5 py-2 text-sm font-semibold text-white">
        Réessayer / Try again
      </button>
    </div>
  );
}

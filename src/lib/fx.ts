/**
 * Tasa de cambio USD → COP del día (solo para mostrar el precio aproximado en dólares;
 * el cobro siempre se hace en pesos colombianos). Se actualiza cada 12 horas.
 * Si la consulta falla devuelve null y la página simplemente no muestra los dólares.
 */
export async function getCopPerUsd(): Promise<number | null> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { next: { revalidate: 43200 } });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
    const cop = data?.rates?.COP;
    return data?.result === "success" && typeof cop === "number" && cop > 1000 && cop < 10000 ? cop : null;
  } catch {
    return null;
  }
}

/** «≈ US$12,50» a partir de un valor en COP. */
export function formatUsdApprox(cop: number, copPerUsd: number | null) {
  if (!copPerUsd) return null;
  const usd = cop / copPerUsd;
  return `≈ US$${usd.toLocaleString("es-CO", { minimumFractionDigits: usd < 100 ? 2 : 0, maximumFractionDigits: usd < 100 ? 2 : 0 })}`;
}

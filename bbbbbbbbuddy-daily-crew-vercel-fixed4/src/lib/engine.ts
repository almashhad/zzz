/**
 * Engineering calculations (pure functions).
 */
export function theoreticalSpreadRate(vs: number, dft: number): number {
  if (!isFinite(vs) || !isFinite(dft) || vs <= 0 || dft <= 0) return 0;
  return (vs * 10) / dft;
}
export function practicalSpreadRate(tsr: number, lossFactor: number): number {
  if (!isFinite(tsr) || tsr <= 0) return 0;
  const lf = (isFinite(lossFactor) && lossFactor > 0 && lossFactor <= 1) ? lossFactor : 0.85;
  return tsr * lf;
}
export function litersPerSqmPerCoat(psr: number): number {
  if (!isFinite(psr) || psr <= 0) return 0;
  return 1 / psr;
}
export function wftFromDft(dft: number, vs: number): number {
  if (!isFinite(dft) || !isFinite(vs) || dft <= 0 || vs <= 0) return 0;
  return dft / vs;
}
export function dewPointC(tempC: number, rh: number): number {
  if (!isFinite(tempC) || !isFinite(rh) || rh <= 0 || rh > 100) return NaN;
  const a = 17.62, b = 243.12;
  const gamma = (a * tempC) / (b + tempC) + Math.log(rh/100);
  return (b * gamma) / (a - gamma);
}
export function isWithinDewPointSafety(tempSurfaceC: number, rh: number): {ok:boolean, dp:number, delta:number} {
  const dp = dewPointC(tempSurfaceC, rh);
  if (!isFinite(dp)) return { ok: false, dp: NaN, delta: NaN };
  const delta = tempSurfaceC - dp;
  return { ok: delta >= 3, dp, delta };
}
export function costPerSqmFromGallon(gallonPrice: number, coveragePerGallon: number): number {
  if (!isFinite(gallonPrice) || !isFinite(coveragePerGallon) || coveragePerGallon <= 0) return 0;
  return gallonPrice / coveragePerGallon;
}

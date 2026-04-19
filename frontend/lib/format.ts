/**
 * 금액을 ₩86,360,000 형식으로 표시 (만/억 단위 사용 금지)
 * 음수 지원: ₩-1,200,000
 */
export function fmt(n: number): string {
  return `₩${Math.round(n).toLocaleString()}`;
}

/**
 * 수익률 표시: +7.14% / -3.20%
 */
export function fmtPct(n: number, showSign = true): string {
  const sign = showSign && n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

/**
 * 날짜 표시: YYYY-MM-DD → MM/DD
 */
export function fmtDate(iso: string): string {
  return iso.slice(5, 10).replace('-', '/');
}

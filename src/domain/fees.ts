/**
 * The Roll Call fee on a card payment. Shown on the button, charged on top of the share,
 * and taken as the platform's application fee. The crew's share arrives whole.
 */
export type FeeConfig = { bps: number; fixedPence: number };

export const DEFAULT_FEE: FeeConfig = { bps: 250, fixedPence: 20 };

export function feeFor(sharePence: number, cfg: FeeConfig = DEFAULT_FEE): number {
  if (sharePence <= 0) return 0;
  return Math.round((sharePence * cfg.bps) / 10_000) + cfg.fixedPence;
}

export function cardTotal(sharePence: number, cfg: FeeConfig = DEFAULT_FEE): { share: number; fee: number; total: number } {
  const fee = feeFor(sharePence, cfg);
  return { share: sharePence, fee, total: sharePence + fee };
}

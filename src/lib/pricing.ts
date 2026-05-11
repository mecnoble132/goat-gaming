export type GamePricingConfig = {
  ps5: Record<string, number>;
  snooker: Record<string, number>;
  pool: Record<string, number>;
  vr_cricket: Array<{ label: string; price: number; minutes: number }>;
  vr_adventure: Array<{ label: string; price: number; minutes: number }>;
};

export const DEFAULT_PRICING_CONFIG: GamePricingConfig = {
  ps5: {
    '1-15': 50,
    '1-30': 90,
    '1-60': 160,
    '1-120': 300,
    '1-180': 430,
    '1-240': 560,
    '2-15': 60,
    '2-30': 110,
    '2-60': 200,
    '2-120': 380,
    '2-180': 540,
    '2-240': 700,
    '3-15': 70,
    '3-30': 130,
    '3-60': 230,
    '3-120': 450,
    '3-180': 640,
    '3-240': 830,
    '4-15': 80,
    '4-30': 150,
    '4-60': 260,
    '4-120': 510,
    '4-180': 720,
    '4-240': 940,
  },
  snooker: { '15': 70, '30': 130, '60': 240, '90': 350, '120': 450, '150': 540, '180': 620 },
  pool: { '15': 60, '30': 110, '60': 200, '90': 290, '120': 360, '150': 430, '180': 500 },
  vr_cricket: [
    { label: '2 Overs', price: 60, minutes: 10 },
    { label: '5 Overs', price: 100, minutes: 20 },
    { label: '10 Overs', price: 180, minutes: 30 },
    { label: '15 Overs', price: 250, minutes: 45 },
    { label: '20 Overs', price: 310, minutes: 60 },
  ],
  vr_adventure: [
    { label: 'Roller Coaster', price: 80, minutes: 15 },
    { label: 'Boxing', price: 100, minutes: 15 },
    { label: 'Shooting', price: 130, minutes: 15 },
    { label: 'Table Tennis', price: 100, minutes: 15 },
    { label: 'Golf', price: 100, minutes: 15 },
  ],
};

export function normalizePricingConfig(raw: any): GamePricingConfig {
  const safe = raw ?? {};
  return {
    ps5: { ...DEFAULT_PRICING_CONFIG.ps5, ...(safe.ps5 ?? {}) },
    snooker: { ...DEFAULT_PRICING_CONFIG.snooker, ...(safe.snooker ?? {}) },
    pool: { ...DEFAULT_PRICING_CONFIG.pool, ...(safe.pool ?? {}) },
    vr_cricket: Array.isArray(safe.vr_cricket) ? safe.vr_cricket : DEFAULT_PRICING_CONFIG.vr_cricket,
    vr_adventure: Array.isArray(safe.vr_adventure) ? safe.vr_adventure : DEFAULT_PRICING_CONFIG.vr_adventure,
  };
}

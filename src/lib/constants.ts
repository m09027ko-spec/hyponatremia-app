export const TBW_COEFFICIENT = {
  standard: { male: 0.6, female: 0.5 },
  elderly: { male: 0.5, female: 0.45 },
} as const;

export const INSENSIBLE_LOSS_PER_DAY_PER_KG = 15; // mL/kg/day

export const CORRECTION_LIMIT = {
  standard: 10, // mEq/L/24h
  highRisk: 8,
} as const;

export const CORRECTION_TARGET = {
  standard: { min: 4, max: 8 },
  highRisk: { min: 4, max: 6 },
} as const;

export const EMERGENCY_BOLUS = {
  volumeMlPerKg: 2, // 2-4 mL/kg, 最大150 mL
  maxVolumeMl: 150,
  hypertonicSalineConc: 3, // 3% NaCl (513 mEq/L)
  hypertonicSalineNaMeqPerL: 513,
  targetRiseMeqPer20min: 5,
  bolusMinutes: 20,
} as const;

export const NA_RANGE = { min: 100, max: 160 } as const;
export const WEIGHT_RANGE = { min: 30, max: 200 } as const;

export const AGE_ELDERLY_THRESHOLD = 75;

// 輸液プリセット（mEq/L）
export interface FluidPreset {
  id: string;
  label: string;
  na: number;
  k: number;
  note?: string;
}

export const FLUID_PRESETS: readonly FluidPreset[] = [
  { id: 'saline', label: '生理食塩水（0.9% NaCl）', na: 154, k: 0 },
  { id: 'hypertonic3', label: '3% 高張食塩水', na: 513, k: 0, note: '513 mEq/L' },
  { id: 'half_saline', label: '0.45% NaCl', na: 77, k: 0 },
  { id: 'sol1', label: '1号液（開始液）', na: 90, k: 0, note: '目安値' },
  { id: 'sol3', label: '3号液（維持液）', na: 35, k: 20, note: '代表値（製剤で差あり）' },
  { id: 'd5w', label: '5% ブドウ糖液', na: 0, k: 0 },
  { id: 'lactated_ringer', label: '乳酸リンゲル液', na: 130, k: 4 },
  { id: 'custom', label: 'カスタム（直接入力）', na: 0, k: 0 },
];

export const DEFAULT_PREDICT_HOURS = 24;


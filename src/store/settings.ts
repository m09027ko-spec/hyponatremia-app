import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Strategy } from '../types';

export interface AppSettings {
  // デフォルト臨床モード設定
  defaultStrategy: Strategy;
  defaultMonitoringIntervalH: 2 | 4 | 6;

  // 薬剤処方可否（施設で使えない薬剤は UI から消す）
  drugAvailability: {
    tolvaptan: boolean;
    urea: boolean;
    fludrocortisone: boolean;
    sglt2: boolean;
  };

  // TBW 係数プリセット（デフォルトは固定推奨だが微調整可）
  tbwOverride: {
    useCustom: boolean;
    standardMale: number;
    standardFemale: number;
    elderlyMale: number;
    elderlyFemale: number;
  };

  // ODS リスク閾値の微調整（デフォルトを使うのが安全）
  correctionLimitOverride: {
    useCustom: boolean;
    standard: number;
    highRisk: number;
  };
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultStrategy: 'reactive',
  defaultMonitoringIntervalH: 4,
  drugAvailability: {
    tolvaptan: true,
    urea: false,        // 日本では使用頻度低
    fludrocortisone: true,
    sglt2: false,       // 低Na血症への適応外
  },
  tbwOverride: {
    useCustom: false,
    standardMale: 0.6,
    standardFemale: 0.5,
    elderlyMale: 0.5,
    elderlyFemale: 0.45,
  },
  correctionLimitOverride: {
    useCustom: false,
    standard: 10,
    highRisk: 8,
  },
};

interface SettingsStore {
  settings: AppSettings;
  update: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  updateDrug: (drug: keyof AppSettings['drugAvailability'], enabled: boolean) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      update: (key, value) =>
        set((state) => ({ settings: { ...state.settings, [key]: value } })),
      updateDrug: (drug, enabled) =>
        set((state) => ({
          settings: {
            ...state.settings,
            drugAvailability: { ...state.settings.drugAvailability, [drug]: enabled },
          },
        })),
      reset: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    {
      name: 'hyponatremia-settings',
    },
  ),
);

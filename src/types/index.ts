export type Sex = 'M' | 'F';
export type Strategy = 'reactive' | 'proactive';
export type AgeMode = 'standard' | 'elderly';
export type Acuity = 'acute' | 'chronic' | 'unknown';
export type AppMode = 'clinical' | 'learning' | 'settings';
export type RiskLevel = 'standard' | 'highRisk';

export interface Demographics {
  age: number;
  sex: Sex;
  weight: number; // kg
}

export interface OdsRiskFactors {
  initialNaBelow105: boolean;
  alcoholism: boolean;
  malnutrition: boolean;
  hypokalemia: boolean;
  advancedLiverDisease: boolean;
}

export interface InitialLabs {
  serumNa: number; // mEq/L 実測
  serumK?: number;
  glucose: number; // mg/dL
  bun?: number;
  cr?: number;
  uricAcid?: number;
  albumin?: number;
  totalProtein?: number;
  triglyceride?: number;
}

export interface EmergencySymptoms {
  vomiting: boolean;
  seizure: boolean;
  deepDrowsiness: boolean;
  coma: boolean;
  gcsDrop: boolean;
  other: boolean;
}

export interface Measurement {
  timestamp: string; // ISO
  serumNa: number;
  serumK?: number;
  glucose?: number;
  bun?: number;
  cr?: number;
  uricAcid?: number;
  urineOsm?: number;
  urineNa?: number;
  urineK?: number;
  urineVolume?: number;
  bodyWeight?: number;
}

export interface Intervention {
  timestamp: string;
  type: 'fluid' | 'medication' | 'restriction' | 'ddavp' | 'bolus' | 'other';
  detail: string;
  volume?: number;
  rate?: number;
  naConcentration?: number;
  kConcentration?: number;
}

export interface DifferentialInputSnapshot {
  urineOsm?: number;
  urineNa?: number;
  urineK?: number;
  diuretic: 'none' | 'thiazide' | 'loop';
  volume: {
    turgor: boolean;
    orthostatic: boolean;
    weightLoss: boolean;
    edema: boolean;
    ascites: boolean;
    jvd: boolean;
  };
  bunCrRatio?: number;
  uricAcid?: number;
}

export interface DifferentialResultSnapshot {
  category: string;
  label: string;
  recommendation: string;
  stage2Required: boolean;
}

// SIADH 除外診断ゲート
export interface SiadhExclusion {
  adrenalExcluded: boolean;       // コルチゾール / ACTH
  thyroidExcluded: boolean;       // TSH / FT4
  renalAssessed: boolean;         // eGFR 評価済み
  drugReviewed: boolean;          // 薬剤性スクリーニング済み
}

// MRHE スクリーニング入力
export interface MrheInput {
  age: number;
  weightLoss: boolean;
  orthostatic: boolean;
  turgor: boolean;
  bunCrRatio?: number;     // > 20 で脱水傾向
  uricAcid?: number;       // MRHE では低下していないことがある
  lowRenin?: boolean;      // 血漿レニン活性が低い
  lowAldosterone?: boolean;
}

export interface MrheScore {
  score: number;           // 0〜
  positive: boolean;       // 疑い陽性
  reasons: string[];
}

// CSW スクリーニング
export interface CswInput {
  hasCnsDisease: boolean;  // SAH/頭部外傷/脳腫瘍等
  weightLoss: boolean;
  orthostatic: boolean;
  turgor: boolean;
  bunCrRatio?: number;
  uricAcid?: number;       // 低値 & 排泄亢進
  urineVolumeHigh?: boolean;
}

export interface CswScore {
  score: number;
  positive: boolean;
  reasons: string[];
}

// Furst 比と水制限不応予測
export interface FurstAssessment {
  ratio: number;              // (尿Na + 尿K) / 血清Na
  refractory: boolean;        // 水制限単独で効果不十分と予測
  reasons: string[];
}

// Stage 2 全体スナップショット
export interface Stage2Snapshot {
  siadhExclusion?: SiadhExclusion;
  siadhConfirmed?: boolean;
  mrhe?: { input: MrheInput; score: MrheScore };
  csw?: { input: CswInput; score: CswScore };
  furst?: FurstAssessment;
  finalCategory?: 'SIADH' | 'MRHE_suspected' | 'CSW_suspected' | 'undetermined';
}

// モニタリング測定（Module 7 で追加）
export interface MonitoringEntry {
  id: string;
  timestamp: string;
  serumNa: number;
  urineOsm?: number;
  urineNa?: number;
  urineK?: number;
  urineVolumeMlPerH?: number;
  bodyWeight?: number;
  note?: string;
}

// 水利尿検知結果
export type BrakingTrigger =
  | 'urine_rate_high'      // 尿量 > 2 mL/kg/h or > 250 mL/h
  | 'urine_dilute'         // 尿浸透圧 < 100 or [Na+K] < 50
  | 'na_rise_fast'         // Δ Na / 6h > 閾値
  | 'na_over_limit';       // 24h 上限超過

export interface BrakingAssessment {
  triggered: boolean;
  triggers: BrakingTrigger[];
  reasons: string[];
  deltaNa6h?: number;
  urinePerKgPerH?: number;
}

export interface PredictionRun {
  runAt: string; // ISO
  params: {
    currentNa: number;
    weight: number;
    tbw: number;
    fluidLabel: string;
    fluidNaK: number;
    infTotalMl: number;
    infDurationH: number;
    urineRateMlPerH: number;
    urineNaK: number;
    predictH: number;
  };
  integratedFinal: number;
  adrogueFinal: number;
  exceedsLimit: boolean;
}

export interface PatientSession {
  sessionId: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  mode: AppMode;
  strategy: Strategy;
  ageMode: AgeMode;
  demographics?: Demographics;
  initialLabs?: InitialLabs;
  correctedNa?: number;
  isTrueHypotonic?: boolean;
  pseudoWarning?: string;
  acuity?: Acuity;
  acuityHours?: number;
  emergencySymptoms?: EmergencySymptoms;
  emergencyBolusStartedAt?: string;
  odsRiskFactors?: OdsRiskFactors;
  riskLevel?: RiskLevel;
  correctionLimit?: number;
  correctionTargetMin?: number;
  correctionTargetMax?: number;
  differentialInput?: DifferentialInputSnapshot;
  differentialResult?: DifferentialResultSnapshot;
  stage2?: Stage2Snapshot;
  lastPrediction?: PredictionRun;
  monitoring: MonitoringEntry[];
  lastBraking?: {
    at: string;
    assessment: BrakingAssessment;
    acknowledged: boolean;
  };
  measurements: Measurement[];
  interventions: Intervention[];
  notes: string;
  consented: boolean;
}

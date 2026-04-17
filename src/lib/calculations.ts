import {
  TBW_COEFFICIENT,
  CORRECTION_LIMIT,
  CORRECTION_TARGET,
  EMERGENCY_BOLUS,
  INSENSIBLE_LOSS_PER_DAY_PER_KG,
} from './constants';
import type {
  OdsRiskFactors,
  RiskLevel,
  Sex,
  AgeMode,
  MrheInput,
  MrheScore,
  CswInput,
  CswScore,
  FurstAssessment,
  MonitoringEntry,
  BrakingAssessment,
  BrakingTrigger,
} from '../types';

// Hillier式: 血糖補正Na値
export function correctedSodiumByGlucose(naMeasured: number, glucose: number): number {
  if (glucose <= 100) return naMeasured;
  return naMeasured + (2.4 * (glucose - 100)) / 100;
}

// 偽性低Na血症の警告判定
export function pseudoHyponatremiaWarning(params: {
  triglyceride?: number;
  totalProtein?: number;
}): string | null {
  const reasons: string[] = [];
  if (params.triglyceride !== undefined && params.triglyceride > 1500) {
    reasons.push(`TG ${params.triglyceride} mg/dL`);
  }
  if (params.totalProtein !== undefined && params.totalProtein > 10) {
    reasons.push(`総蛋白 ${params.totalProtein} g/dL`);
  }
  if (reasons.length === 0) return null;
  return `偽性低Na血症の可能性（${reasons.join(' / ')}）。血液ガスの直接法Naで確認してください。`;
}

// TBW 計算
export function totalBodyWater(weight: number, sex: Sex, ageMode: AgeMode): number {
  const coefficients = TBW_COEFFICIENT[ageMode];
  const coeff = sex === 'M' ? coefficients.male : coefficients.female;
  return weight * coeff;
}

// ODSリスク評価
export function assessRiskLevel(f: OdsRiskFactors): RiskLevel {
  const highRisk =
    f.initialNaBelow105 ||
    f.alcoholism ||
    f.malnutrition ||
    f.hypokalemia ||
    f.advancedLiverDisease;
  return highRisk ? 'highRisk' : 'standard';
}

export function correctionParameters(risk: RiskLevel) {
  return {
    limit: CORRECTION_LIMIT[risk],
    target: CORRECTION_TARGET[risk],
  };
}

// 緊急ボーラス量（3% NaCl, 2 mL/kg, 最大150 mL）
export function emergencyBolusVolume(weight: number): number {
  const raw = weight * EMERGENCY_BOLUS.volumeMlPerKg;
  return Math.min(raw, EMERGENCY_BOLUS.maxVolumeMl);
}

// 数値範囲チェック
export function inRange(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

// 不感蒸泄量 (L)
export function insensibleLoss(weight: number, hours: number): number {
  return (INSENSIBLE_LOSS_PER_DAY_PER_KG * weight / 24) * hours / 1000;
}

// 統合予測式: 任意時点 t における血清Na値
export interface PredictionSnapshot {
  currentNa: number;
  tbw: number;    // L
  vInf: number;   // L
  naKInf: number; // mEq/L
  vUrine: number; // L
  naKUrine: number; // mEq/L
  vIwl: number;   // L
}

export function predictSodium(s: PredictionSnapshot): number {
  const deltaNaK = s.vInf * s.naKInf - s.vUrine * s.naKUrine;
  const deltaTbw = s.vInf - s.vUrine - s.vIwl;
  const denom = s.tbw + deltaTbw;
  if (denom <= 0) return NaN;
  return (s.currentNa * s.tbw + deltaNaK) / denom;
}

// Adrogué-Madias: 輸液 V_inf L を追加したあとの予測Na
export function adrogueMadias(
  currentNa: number,
  naKInf: number,
  tbw: number,
  vInf: number,
): number {
  return currentNa + ((naKInf - currentNa) / (tbw + 1)) * vInf;
}

// 時系列シリーズ生成（簡易: 1点/時間）
export interface TrajectoryParams {
  currentNa: number;
  tbw: number;
  weight: number;
  infTotalMl: number;
  infDurationH: number;
  infNaK: number;
  urineRateMlPerH: number;
  urineNaK: number;
  predictH: number;
}

export interface SeriesPoint {
  t: number;
  na: number;
}

export function buildIntegratedSeries(p: TrajectoryParams): SeriesPoint[] {
  const steps = Math.max(24, p.predictH * 2); // 30分刻み程度
  const points: SeriesPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (p.predictH * i) / steps;
    const infFrac = p.infDurationH > 0 ? Math.min(t / p.infDurationH, 1) : 0;
    const vInf = (p.infTotalMl / 1000) * infFrac;
    const vUrine = (p.urineRateMlPerH / 1000) * t;
    const vIwl = insensibleLoss(p.weight, t);
    const na = predictSodium({
      currentNa: p.currentNa,
      tbw: p.tbw,
      vInf,
      naKInf: p.infNaK,
      vUrine,
      naKUrine: p.urineNaK,
      vIwl,
    });
    points.push({ t, na });
  }
  return points;
}

export function buildAdrogueSeries(p: TrajectoryParams): SeriesPoint[] {
  const steps = Math.max(24, p.predictH * 2);
  const points: SeriesPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (p.predictH * i) / steps;
    const infFrac = p.infDurationH > 0 ? Math.min(t / p.infDurationH, 1) : 0;
    const vInf = (p.infTotalMl / 1000) * infFrac;
    points.push({
      t,
      na: adrogueMadias(p.currentNa, p.infNaK, p.tbw, vInf),
    });
  }
  return points;
}

// 鑑別（第一段階）
export type DifferentialCategory =
  | 'primary_polydipsia_or_low_solute'
  | 'hypovolemic'
  | 'hypervolemic'
  | 'drug_induced_thiazide'
  | 'loop_diuretic_use'
  | 'siadh_candidate'
  | 'insufficient_data';

export interface VolumeStatusInput {
  turgor: boolean;      // ツルゴール低下
  orthostatic: boolean; // 起立性低血圧
  weightLoss: boolean;  // 体重減少
  edema: boolean;       // 浮腫
  ascites: boolean;     // 腹水
  jvd: boolean;         // 頸静脈怒張
}

export interface DifferentialInput {
  urineOsm?: number;    // mOsm/kg
  urineNa?: number;     // mEq/L
  urineK?: number;      // mEq/L
  diuretic: 'none' | 'thiazide' | 'loop';
  volume: VolumeStatusInput;
  bunCrRatio?: number;
  uricAcid?: number;
}

export interface DifferentialResult {
  category: DifferentialCategory;
  label: string;
  notes: string[];
  recommendation: string;
  stage2Required: boolean;
  contraindicated?: string[];
}

export function assessDifferential(input: DifferentialInput): DifferentialResult {
  const { urineOsm, urineNa, diuretic, volume } = input;
  const hypervolemic = volume.edema || volume.ascites || volume.jvd;

  if (diuretic === 'thiazide') {
    return {
      category: 'drug_induced_thiazide',
      label: '薬剤性（サイアザイド系利尿薬）',
      notes: [
        'サイアザイド系は尿濃縮機構を保ちつつNa排泄 → 水保持・Na喪失の両方を起こす',
        '高齢女性で特に好発',
      ],
      recommendation:
        'サイアザイド系を中止。低K補正。MRHEの合併がないかレニン・アルドステロンで評価。',
      stage2Required: false,
      contraindicated: ['利尿薬継続'],
    };
  }

  if (urineOsm === undefined || urineNa === undefined) {
    return {
      category: 'insufficient_data',
      label: '入力不足',
      notes: ['尿浸透圧・尿Naが未入力のため鑑別できません'],
      recommendation: '尿検査（尿浸透圧、尿Na、尿K）を実施',
      stage2Required: false,
    };
  }

  if (urineOsm < 100) {
    return {
      category: 'primary_polydipsia_or_low_solute',
      label: '原発性多飲症 / 低溶質摂取',
      notes: [
        '尿浸透圧 < 100 mOsm/kg → ADH抑制・水排泄は正常',
        '水の過剰摂取 or 溶質摂取不足（beer potomania, tea-and-toast）',
      ],
      recommendation: '水制限。溶質不足の場合は食事中のNa・蛋白摂取を促す。',
      stage2Required: false,
    };
  }

  // 尿浸透圧 >= 100
  if (urineNa < 30) {
    if (hypervolemic) {
      return {
        category: 'hypervolemic',
        label: '体液過剰性（心不全・肝硬変 等）',
        notes: [
          '尿Na < 30 + 浮腫/腹水/頸静脈怒張 → 有効循環血漿量低下による希釈性',
        ],
        recommendation:
          '水制限 + ループ利尿薬。基礎疾患（心不全・肝硬変）の治療を優先。',
        stage2Required: false,
        contraindicated: ['大量の生食補充'],
      };
    }
    return {
      category: 'hypovolemic',
      label: '循環血漿量減少性（脱水）',
      notes: [
        '尿Na < 30 + 脱水所見 → 腎外性Na喪失 or 水分摂取低下',
        '嘔吐・下痢・出血・サードスペースへの移動等を検索',
      ],
      recommendation: '生理食塩水で補充。原因の検索と補正。',
      stage2Required: false,
      contraindicated: ['水制限（脱水を増悪）'],
    };
  }

  // 尿浸透圧 >= 100, 尿Na >= 30
  if (diuretic === 'loop') {
    return {
      category: 'loop_diuretic_use',
      label: 'ループ利尿薬使用中',
      notes: [
        'ループ利尿薬は尿濃縮機構を破壊 → 尿Na・尿浸透圧の解釈が困難',
        'SIADHとの鑑別は利尿薬中止後の再評価が必要',
      ],
      recommendation: '可能ならループ利尿薬を中止し、再評価。体液量評価を継続。',
      stage2Required: false,
    };
  }

  return {
    category: 'siadh_candidate',
    label: 'SIADH候補（暫定）',
    notes: [
      '尿浸透圧 ≥ 100 + 尿Na ≥ 30 + 利尿薬なし + 体液量正常 → SIADH疑い',
      'Phase 2 第二段階で副腎不全 / 甲状腺機能低下 / 薬剤性 / 腎不全の除外',
      'MRHE / CSW との三者鑑別も Phase 2 で実装予定',
    ],
    recommendation:
      '水制限（<1000 mL/日）を基本。除外診断完了まで確定診断としない。',
    stage2Required: true,
  };
}

// ---------- Stage 2 ----------

// Furst 比: (尿Na + 尿K) / 血清Na
// >= 1.0 または 尿浸透圧 > 500 で水制限不応を予測
export function furstAssessment(params: {
  urineNa?: number;
  urineK?: number;
  serumNa: number;
  urineOsm?: number;
}): FurstAssessment | null {
  if (
    params.urineNa === undefined ||
    params.urineK === undefined ||
    !Number.isFinite(params.serumNa) ||
    params.serumNa <= 0
  ) {
    return null;
  }
  const ratio = (params.urineNa + params.urineK) / params.serumNa;
  const reasons: string[] = [];
  let refractory = false;
  if (ratio >= 1.0) {
    refractory = true;
    reasons.push(`Furst比 ${ratio.toFixed(2)} ≥ 1.0（自由水クリアランスが陰性傾向）`);
  }
  if (params.urineOsm !== undefined && params.urineOsm > 500) {
    refractory = true;
    reasons.push(`尿浸透圧 ${params.urineOsm} mOsm/kg > 500（高度濃縮）`);
  }
  if (!refractory) {
    reasons.push(`Furst比 ${ratio.toFixed(2)} < 1.0 — 水制限単独で奏功する可能性あり`);
  }
  return { ratio, refractory, reasons };
}

// MRHE スコアリング
// 年齢 ≥ 70 + 脱水所見 + BUN/Cr > 20 + 尿酸低下なし + レニン / アルドステロン低値
export function scoreMrhe(input: MrheInput): MrheScore {
  const reasons: string[] = [];
  let score = 0;
  if (input.age >= 70) {
    score += 1;
    reasons.push(`年齢 ${input.age}歳 ≥ 70`);
  }
  if (input.weightLoss || input.orthostatic || input.turgor) {
    score += 1;
    const list = [
      input.weightLoss && '体重減少',
      input.orthostatic && '起立性低血圧',
      input.turgor && 'ツルゴール低下',
    ].filter(Boolean).join(' / ');
    reasons.push(`脱水所見あり（${list}）`);
  }
  if (input.bunCrRatio !== undefined && input.bunCrRatio > 20) {
    score += 1;
    reasons.push(`BUN/Cr比 ${input.bunCrRatio} > 20`);
  }
  if (input.uricAcid !== undefined && input.uricAcid > 4) {
    score += 1;
    reasons.push(`尿酸 ${input.uricAcid} mg/dL > 4（SIADH・CSWに典型的な低下なし）`);
  }
  if (input.lowRenin) {
    score += 2;
    reasons.push('血漿レニン活性 低値（MRHEに特徴的）');
  }
  if (input.lowAldosterone) {
    score += 2;
    reasons.push('アルドステロン 低値');
  }
  return { score, positive: score >= 3, reasons };
}

// CSW スコアリング
export function scoreCsw(input: CswInput): CswScore {
  const reasons: string[] = [];
  let score = 0;
  if (input.hasCnsDisease) {
    score += 2;
    reasons.push('急性脳神経疾患の既往（SAH・頭部外傷・脳腫瘍 等）');
  }
  if (input.weightLoss || input.orthostatic || input.turgor) {
    score += 1;
    reasons.push('体液量減少所見あり');
  }
  if (input.bunCrRatio !== undefined && input.bunCrRatio > 20) {
    score += 1;
    reasons.push(`BUN/Cr比 ${input.bunCrRatio} > 20`);
  }
  if (input.uricAcid !== undefined && input.uricAcid < 4) {
    score += 1;
    reasons.push(`尿酸 ${input.uricAcid} mg/dL 低値（排泄亢進）`);
  }
  if (input.urineVolumeHigh) {
    score += 1;
    reasons.push('尿量増加（多尿傾向）');
  }
  return { score, positive: score >= 3 && input.hasCnsDisease, reasons };
}

// ---------- Module 7: 水利尿検知 ----------

// 直近2点から Na 上昇速度（6h 換算）を計算
// 測定間隔が短すぎると外挿が暴走するため、最低 1 時間の間隔を要求する
export function deltaNaPer6h(entries: MonitoringEntry[]): number | undefined {
  if (entries.length < 2) return undefined;
  const sorted = [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  const last = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const dt =
    (new Date(last.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 3600000;
  // 間隔が 1 時間未満では外挿しない（非現実的な値になる）
  if (dt < 1) return undefined;
  const deltaPerH = (last.serumNa - prev.serumNa) / dt;
  return deltaPerH * 6;
}

// Braking Protocol 発動判定
export function assessBraking(params: {
  weight: number;
  baselineNa: number;      // セッション開始時点の Na（現在はcorrectedNa）
  correctionLimit: number; // 24h上限
  entries: MonitoringEntry[];
  hoursSinceStart: number;
}): BrakingAssessment {
  const triggers: BrakingTrigger[] = [];
  const reasons: string[] = [];
  const last = params.entries.at(-1);

  const urinePerKgPerH =
    last?.urineVolumeMlPerH !== undefined && params.weight > 0
      ? last.urineVolumeMlPerH / params.weight
      : undefined;

  if (last?.urineVolumeMlPerH !== undefined) {
    if (last.urineVolumeMlPerH > 250 || (urinePerKgPerH ?? 0) > 2) {
      triggers.push('urine_rate_high');
      reasons.push(
        `尿量 ${last.urineVolumeMlPerH} mL/h` +
          (urinePerKgPerH !== undefined ? `（${urinePerKgPerH.toFixed(1)} mL/kg/h）` : '') +
          ' — 水利尿の閾値（2 mL/kg/h または 250 mL/h）に到達',
      );
    }
  }

  if (last?.urineOsm !== undefined && last.urineOsm < 100) {
    triggers.push('urine_dilute');
    reasons.push(`尿浸透圧 ${last.urineOsm} mOsm/kg < 100 — 希釈尿が出現`);
  }
  const urineNaK =
    last?.urineNa !== undefined && last?.urineK !== undefined
      ? last.urineNa + last.urineK
      : undefined;
  if (urineNaK !== undefined && urineNaK < 50) {
    triggers.push('urine_dilute');
    reasons.push(`尿 [Na+K] ${urineNaK.toFixed(0)} mEq/L < 50 — 自由水排泄が亢進`);
  }

  const d6 = deltaNaPer6h(params.entries);
  if (d6 !== undefined && d6 >= 6) {
    triggers.push('na_rise_fast');
    reasons.push(`直近の Na 上昇速度 ${d6.toFixed(1)} mEq/L / 6h ≥ 6`);
  }

  if (last !== undefined) {
    const absLimit = params.baselineNa + params.correctionLimit;
    if (last.serumNa > absLimit) {
      triggers.push('na_over_limit');
      reasons.push(
        `実測Na ${last.serumNa.toFixed(1)} mEq/L が 24h 上限 ${absLimit.toFixed(
          1,
        )} mEq/L を超過`,
      );
    }
  }

  // 重複除去
  const uniqueTriggers = Array.from(new Set(triggers));

  return {
    triggered: uniqueTriggers.length > 0,
    triggers: uniqueTriggers,
    reasons,
    deltaNa6h: d6,
    urinePerKgPerH,
  };
}

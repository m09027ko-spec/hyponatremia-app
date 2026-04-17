import type { PatientSession } from '../types';

function fmt(d: string | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('ja-JP');
}

function numOrDash(n: number | undefined, digits = 1): string {
  return n === undefined || !Number.isFinite(n) ? '—' : n.toFixed(digits);
}

// ----------- Markdown -----------

export function sessionToMarkdown(session: PatientSession): string {
  const lines: string[] = [];
  lines.push('# 低Na血症マネジメント · セッション記録');
  lines.push('');
  lines.push(`- セッション ID: \`${session.sessionId}\``);
  lines.push(`- 開始: ${fmt(session.createdAt)}`);
  lines.push(`- 更新: ${fmt(session.updatedAt)}`);
  lines.push(`- モード: ${session.mode} / ${session.strategy} / ${session.ageMode}`);
  lines.push('');

  if (session.demographics) {
    const d = session.demographics;
    lines.push('## 患者情報（匿名）');
    lines.push(`- 年齢: ${d.age} 歳`);
    lines.push(`- 性別: ${d.sex === 'M' ? '男性' : '女性'}`);
    lines.push(`- 体重: ${d.weight} kg`);
    lines.push('');
  }

  if (session.initialLabs) {
    const l = session.initialLabs;
    lines.push('## 初期検査値');
    lines.push(`- 血清Na（実測）: ${numOrDash(l.serumNa)} mEq/L`);
    if (session.correctedNa !== undefined)
      lines.push(`- 血清Na（Hillier 血糖補正）: ${numOrDash(session.correctedNa)} mEq/L`);
    lines.push(`- 血糖値: ${numOrDash(l.glucose, 0)} mg/dL`);
    if (l.serumK !== undefined) lines.push(`- 血清K: ${numOrDash(l.serumK)} mEq/L`);
    if (l.bun !== undefined) lines.push(`- BUN: ${numOrDash(l.bun)} mg/dL`);
    if (l.cr !== undefined) lines.push(`- Cr: ${numOrDash(l.cr, 2)} mg/dL`);
    if (l.uricAcid !== undefined) lines.push(`- 尿酸: ${numOrDash(l.uricAcid)} mg/dL`);
    if (session.pseudoWarning) lines.push(`- ⚠ 偽性警告: ${session.pseudoWarning}`);
    lines.push('');
  }

  lines.push('## 急性 / 慢性');
  lines.push(
    `- 判定: ${session.acuity === 'acute' ? '急性' : '慢性 / 不明'}` +
      (session.acuityHours !== undefined ? `（発症 ${session.acuityHours} h）` : ''),
  );
  lines.push('');

  if (session.emergencySymptoms) {
    const s = session.emergencySymptoms;
    const hasSevere = Object.values(s).some(Boolean);
    lines.push('## 緊急トリアージ');
    lines.push(`- 重篤神経症状: ${hasSevere ? 'あり' : 'なし'}`);
    if (hasSevere) {
      const labels = [
        s.vomiting && '嘔吐',
        s.seizure && '痙攣',
        s.deepDrowsiness && '深い傾眠',
        s.coma && '昏睡',
        s.gcsDrop && 'GCS低下',
        s.other && 'その他',
      ]
        .filter(Boolean)
        .join(', ');
      lines.push(`- 該当項目: ${labels}`);
    }
    if (session.emergencyBolusStartedAt) {
      lines.push(`- 3% NaCl ボーラス開始時刻: ${fmt(session.emergencyBolusStartedAt)}`);
    }
    lines.push('');
  }

  if (session.correctionLimit !== undefined) {
    lines.push('## 治療目標と安全限界');
    lines.push(
      `- ODS リスク: ${session.riskLevel === 'highRisk' ? '高リスク' : '標準'}`,
    );
    lines.push(`- 24h 補正上限: ${session.correctionLimit} mEq/L`);
    lines.push(
      `- 目標補正幅: ${session.correctionTargetMin}–${session.correctionTargetMax} mEq/L / 24h`,
    );
    if (session.odsRiskFactors) {
      const f = session.odsRiskFactors;
      const positive = [
        f.initialNaBelow105 && 'Na<105',
        f.alcoholism && 'アルコール多飲',
        f.malnutrition && '低栄養',
        f.hypokalemia && '低K血症',
        f.advancedLiverDisease && '進行肝疾患',
      ]
        .filter(Boolean)
        .join(', ');
      if (positive) lines.push(`- リスク因子（陽性）: ${positive}`);
    }
    lines.push('');
  }

  if (session.differentialResult) {
    lines.push('## 鑑別（第一段階）');
    lines.push(`- 判定: ${session.differentialResult.label}`);
    lines.push(`- 推奨: ${session.differentialResult.recommendation}`);
    if (session.differentialInput) {
      const d = session.differentialInput;
      lines.push(
        `- 尿浸透圧 ${numOrDash(d.urineOsm, 0)} / 尿Na ${numOrDash(d.urineNa, 0)} / 尿K ${numOrDash(d.urineK, 0)}`,
      );
      lines.push(`- 利尿薬: ${d.diuretic}`);
    }
    lines.push('');
  }

  if (session.stage2) {
    const s2 = session.stage2;
    lines.push('## 第二段階 最終判定');
    lines.push(`- 最終カテゴリ: ${s2.finalCategory}`);
    if (s2.siadhExclusion) {
      const ex = s2.siadhExclusion;
      const done = [
        ex.adrenalExcluded && '副腎',
        ex.thyroidExcluded && '甲状腺',
        ex.renalAssessed && '腎',
        ex.drugReviewed && '薬剤',
      ]
        .filter(Boolean)
        .join(', ');
      lines.push(`- SIADH 除外診断: ${done || '未完了'}`);
    }
    if (s2.mrhe)
      lines.push(
        `- MRHE スコア: ${s2.mrhe.score.score}${s2.mrhe.score.positive ? '（陽性）' : ''}`,
      );
    if (s2.csw)
      lines.push(
        `- CSW スコア: ${s2.csw.score.score}${s2.csw.score.positive ? '（陽性）' : ''}`,
      );
    if (s2.furst)
      lines.push(
        `- Furst 比: ${s2.furst.ratio.toFixed(2)}${s2.furst.refractory ? '（水制限不応予測）' : ''}`,
      );
    lines.push('');
  }

  if (session.lastPrediction) {
    const p = session.lastPrediction;
    lines.push('## 直近の予測シミュレーション');
    lines.push(`- 実施時刻: ${fmt(p.runAt)}`);
    lines.push(
      `- 輸液: ${p.params.fluidLabel} · ${p.params.infTotalMl} mL / ${p.params.infDurationH} h`,
    );
    lines.push(`- 予測尿量: ${p.params.urineRateMlPerH} mL/h · [Na+K] ${p.params.urineNaK}`);
    lines.push(
      `- ${p.params.predictH}h 後予測: 統合式 ${p.integratedFinal.toFixed(1)} / Adrogué-Madias ${p.adrogueFinal.toFixed(1)} mEq/L`,
    );
    lines.push(`- 安全限界: ${p.exceedsLimit ? '⚠ 超過リスクあり' : 'OK'}`);
    lines.push('');
  }

  if (session.monitoring && session.monitoring.length > 0) {
    lines.push('## モニタリング履歴');
    lines.push('| 時刻 | Na | 尿量 (mL/h) | 尿Osm | 尿Na+K | メモ |');
    lines.push('|---|---:|---:|---:|---:|---|');
    for (const e of session.monitoring) {
      const uNaK =
        e.urineNa !== undefined && e.urineK !== undefined ? e.urineNa + e.urineK : undefined;
      lines.push(
        `| ${fmt(e.timestamp)} | ${numOrDash(e.serumNa)} | ${numOrDash(e.urineVolumeMlPerH, 0)} | ${numOrDash(e.urineOsm, 0)} | ${numOrDash(uNaK, 0)} | ${e.note ?? ''} |`,
      );
    }
    lines.push('');
  }

  if (session.lastBraking) {
    lines.push('## 直近の Braking イベント');
    lines.push(`- 発動時刻: ${fmt(session.lastBraking.at)}`);
    lines.push(`- 確認済み: ${session.lastBraking.acknowledged ? 'はい' : 'いいえ'}`);
    lines.push(
      `- トリガ: ${session.lastBraking.assessment.triggers.join(', ') || '—'}`,
    );
    for (const r of session.lastBraking.assessment.reasons) {
      lines.push(`  - ${r}`);
    }
    lines.push('');
  }

  if (session.notes) {
    lines.push('## メモ');
    lines.push(session.notes);
    lines.push('');
  }

  lines.push('---');
  lines.push(
    `> 本記録は低Na血症マネジメント支援アプリの出力です。計算補助・教育ツールであり、治療方針を決定するものではありません。`,
  );
  return lines.join('\n');
}

// ----------- CSV（モニタリング時系列） -----------

export function monitoringToCsv(session: PatientSession): string {
  const headers = [
    'timestamp',
    'serumNa_mEqL',
    'urineOsm_mOsmkg',
    'urineNa_mEqL',
    'urineK_mEqL',
    'urineVolume_mLh',
    'bodyWeight_kg',
    'note',
  ];
  const rows: string[] = [headers.join(',')];
  const entries = session.monitoring ?? [];
  for (const e of entries) {
    const cells = [
      e.timestamp,
      e.serumNa ?? '',
      e.urineOsm ?? '',
      e.urineNa ?? '',
      e.urineK ?? '',
      e.urineVolumeMlPerH ?? '',
      e.bodyWeight ?? '',
      `"${(e.note ?? '').replace(/"/g, '""')}"`,
    ];
    rows.push(cells.join(','));
  }
  return rows.join('\n');
}

// ----------- Download helper -----------

export function download(filename: string, content: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

// ----------- 患者識別情報の簡易スキャン -----------

// 氏名・カナ・電話番号・MRN 風文字列を検知
const PII_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /[\u4e00-\u9fa5]{2,4}\s*(氏|様|さん)/g, label: '氏名らしき記載' },
  { pattern: /[ァ-ヶー]{3,}/g, label: 'カタカナ氏名の可能性' },
  { pattern: /\b\d{7,}\b/g, label: '長桁の数字（ID 候補）' },
  { pattern: /\b0\d{1,4}-\d{1,4}-\d{3,4}\b/g, label: '電話番号' },
];

export interface PiiWarning {
  label: string;
  samples: string[];
}

export function scanForPii(text: string): PiiWarning[] {
  const warnings: PiiWarning[] = [];
  for (const { pattern, label } of PII_PATTERNS) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      warnings.push({ label, samples: Array.from(new Set(matches)).slice(0, 5) });
    }
  }
  return warnings;
}

// 学習モード用ケースデータ
// 各ステップで選択肢を提示、誤選択時は臨床的帰結を提示

export interface LearningChoice {
  label: string;
  correct?: boolean;        // 単一正解の場合
  acceptable?: boolean;     // 複数正解許容
  consequence: string;      // 選択時の帰結・解説
  scoreDelta: number;       // -2..+2
}

export interface LearningStep {
  prompt: string;
  hint?: string;
  choices: LearningChoice[];
  followUp?: string;        // 選択後に必ず表示される臨床補足
}

export interface LearningCase {
  id: string;
  title: string;
  category: 'SIADH' | 'Thiazide' | 'CSW' | 'MRHE' | 'Polydipsia' | 'Pseudo' | 'Adrenal' | 'HF' | 'ODS';
  summary: string;
  difficulty: 1 | 2 | 3;
  vignette: string;         // 症例の背景
  initialLabs: string;      // 初期検査値
  steps: LearningStep[];
  references: string[];     // 引用文献
  takeaway: string;         // 1行の学習ポイント
}

export const LEARNING_CASES: LearningCase[] = [
  // ---- 1. 術後 SIADH ----
  {
    id: 'postop-siadh',
    title: '術後 SIADH（典型例）',
    category: 'SIADH',
    summary: '婦人科術後 3 日目の Na 122、浮腫・脱水ともなし',
    difficulty: 1,
    vignette:
      '58歳女性。子宮筋腫に対して開腹手術後 3 日目に血清 Na 122 mEq/L の連絡あり。意識清明、軽度倦怠感のみ。浮腫・脱水所見・体重変化なし。内服: アセトアミノフェン、オピオイド少量。',
    initialLabs:
      '血清Na 122、血清K 4.0、血糖 104、尿浸透圧 480、尿Na 75、尿K 35、BUN/Cr 比 12、尿酸 3.2',
    steps: [
      {
        prompt: 'この時点で最初に行う評価は？',
        choices: [
          {
            label: '3% NaCl を 100 mL ボーラス',
            consequence:
              '意識清明で軽症。ボーラスは重症神経症状（痙攣・昏睡等）がある場合のみの適応です。まず病態評価を。',
            scoreDelta: -2,
          },
          {
            label: '尿浸透圧・尿Na を確認し体液量評価',
            correct: true,
            consequence:
              '正解。Na が下がっているだけで治療を始めず、まず「真の低張性か」「尿濃縮されているか」「体液量は」を評価する基本の型。',
            scoreDelta: 2,
          },
          {
            label: '生理食塩水を 100 mL/h で開始',
            consequence:
              'SIADH では生食単独は Na をさらに下げる可能性があります（尿が高濃縮の場合、自由水だけが残る）。病態評価を先に。',
            scoreDelta: -1,
          },
        ],
        followUp:
          '慢性・無症候の低Na血症では「原因の鑑別」が治療選択を決める。治療を先走らない。',
      },
      {
        prompt:
          '尿浸透圧 480 mOsm/kg、尿Na 75、体液量正常、利尿薬なし。第一段階の鑑別は？',
        choices: [
          {
            label: '原発性多飲症',
            consequence:
              '原発性多飲症では尿浸透圧 < 100 mOsm/kg（最大限希釈）が典型。高濃縮尿と矛盾。',
            scoreDelta: -1,
          },
          {
            label: 'SIADH 候補（暫定）',
            correct: true,
            consequence:
              '正解。尿浸透圧 ≥ 100、尿Na ≥ 30、利尿薬なし、体液量正常 → SIADH の第一段階候補。',
            scoreDelta: 2,
          },
          {
            label: 'CSW',
            consequence:
              'CSW は急性脳神経疾患の既往が前提。本例は婦人科術後で該当しない。',
            scoreDelta: -1,
          },
        ],
      },
      {
        prompt: 'SIADH 確定のために必須の除外診断は？（3 つ以上選ぶ想定で 1 つ選択）',
        choices: [
          {
            label: '副腎不全（コルチゾール測定）',
            correct: true,
            consequence:
              '正解の一部。副腎不全・甲状腺機能低下・腎機能低下・薬剤性をすべて除外して初めて SIADH と確定できます。',
            scoreDelta: 2,
          },
          {
            label: '尿管結石',
            consequence:
              '低Na血症の鑑別に必須ではありません。',
            scoreDelta: -1,
          },
          {
            label: '肝硬変',
            consequence:
              '肝硬変では浮腫・腹水を伴う希釈性低Na。本例は体液量正常のため優先度は低い。',
            scoreDelta: 0,
          },
        ],
      },
      {
        prompt:
          '除外診断完了、SIADH 確定。24h 補正目標と上限は（ODS リスク因子なし）？',
        choices: [
          {
            label: '上昇 4〜8、上限 10 mEq/L / 24h',
            correct: true,
            consequence:
              '正解。リスク因子なしの標準。高リスク（Na<105、アルコール、低栄養、低K、進行肝疾患）があれば 4〜6 / 上限 8。',
            scoreDelta: 2,
          },
          {
            label: '上昇 12〜15、上限 20 mEq/L / 24h',
            consequence:
              'ODS 発症リスクが高い速度です。慢性例では絶対に避けるべき範囲。',
            scoreDelta: -2,
          },
          {
            label: '上昇 0〜2、上限 4 mEq/L / 24h',
            consequence: '過度に保守的。目標域に到達せず有症状の場合はリスク。',
            scoreDelta: -1,
          },
        ],
      },
    ],
    references: [
      'Spasovski G, et al. Eur J Endocrinol 2014',
      'Verbalis JG, et al. Am J Med 2013',
    ],
    takeaway:
      '慢性・軽症の術後低Na血症では「まず鑑別、次に治療」。SIADH は除外診断病名。',
  },

  // ---- 2. サイアザイド性 ----
  {
    id: 'thiazide',
    title: 'サイアザイド性低Na血症（高齢女性）',
    category: 'Thiazide',
    summary: '80歳女性、新規降圧開始後 10 日目に Na 118',
    difficulty: 2,
    vignette:
      '80歳女性。高血圧に対してヒドロクロロチアジド 12.5 mg が新規に開始されて 10 日後、ふらつき・倦怠感で来院。るい痩。意識清明。',
    initialLabs:
      '血清Na 118、血清K 2.8、血糖 98、尿浸透圧 520、尿Na 45、BUN/Cr 比 24、尿酸 4.5',
    steps: [
      {
        prompt: 'ODS リスク因子の評価。本症例で該当するのは？',
        choices: [
          {
            label: '低K血症（K 2.8）',
            correct: true,
            consequence:
              '正解。K < 3.0 は ODS リスク因子のひとつ。補正速度は高リスク扱い（上限 8 / 目標 4〜6 mEq/L / 24h）。',
            scoreDelta: 2,
          },
          {
            label: '肝疾患',
            consequence: '本症例で肝疾患の記載なし。',
            scoreDelta: -1,
          },
          {
            label: 'リスク因子なし',
            consequence:
              '低K血症はリスク因子です。見逃すと 10 mEq/L/24h まで上げて ODS を起こすリスクが上がります。',
            scoreDelta: -2,
          },
        ],
        followUp:
          '低K血症補正と Na 補正は密接に関連。K を先に or 並行して補正すると Na が一緒に上がることに注意。',
      },
      {
        prompt: '第一の原因として最も疑うべきは？',
        choices: [
          {
            label: 'SIADH',
            consequence:
              'サイアザイドを使用中の患者では、まず薬剤性を疑うのが原則。SIADH とする前に中止と再評価を。',
            scoreDelta: -1,
          },
          {
            label: '薬剤性（サイアザイド）',
            correct: true,
            consequence:
              '正解。サイアザイドは尿濃縮能を残したまま Na 排泄を促進 → 低Na血症の代表的薬剤性。高齢者で好発。MRHE の合併も評価する。',
            scoreDelta: 2,
          },
          {
            label: '原発性多飲症',
            consequence: '尿浸透圧 520 は高濃縮。原発性多飲症では尿 < 100。',
            scoreDelta: -1,
          },
        ],
      },
      {
        prompt: '最初の治療方針として最適なのは？',
        choices: [
          {
            label: 'サイアザイドを中止、K 補充、軽度の生食補充',
            correct: true,
            consequence:
              '正解。原因薬剤の中止が第一。低K血症は補正。高齢で体液減少所見があれば軽度の生食を慎重に追加。水利尿に注意しながら。',
            scoreDelta: 2,
          },
          {
            label: 'サイアザイド継続し水制限のみ',
            consequence:
              '原因薬剤を継続するのは不適切。さらに脱水傾向があれば水制限は禁忌的。',
            scoreDelta: -2,
          },
          {
            label: '3% NaCl ボーラス 2 mL/kg',
            consequence:
              '意識清明の慢性例に対するボーラスは不適切。重症神経症状のあるときのみ。',
            scoreDelta: -2,
          },
        ],
      },
      {
        prompt:
          '補正中、サイアザイド中止 + 生食少量投与後、8 時間で Na が 118→ 126 mEq/L に上昇（Δ=+8）。次の行動は？',
        choices: [
          {
            label: '目標に到達したので輸液を維持',
            consequence:
              '24h 上限 8 mEq/L（高リスク）に 8h で到達 → このまま進めば確実に超過。Braking 判断の対象です。',
            scoreDelta: -2,
          },
          {
            label: 'HALT → CLAMP (DDAVP) → RE-LOWERING (D5W)',
            correct: true,
            consequence:
              '正解。サイアザイド中止後は水利尿が容易に起こる。予測より早い上昇を認めたら Braking Protocol。意図的に下げ戻す判断ができるかが ODS 予防の鍵。',
            scoreDelta: 2,
          },
          {
            label: 'さらに 3% NaCl を追加する',
            consequence:
              'Na をさらに上げると ODS リスクが増大。禁忌。',
            scoreDelta: -2,
          },
        ],
      },
    ],
    references: [
      'Sterns RH, et al. J Am Soc Nephrol 2023',
      'Spasovski G, et al. Eur J Endocrinol 2014',
    ],
    takeaway:
      'サイアザイド + 高齢 + 低K は ODS 高リスク三点セット。中止後の水利尿に備えて Braking の閾値を意識する。',
  },

  // ---- 3. CSW ----
  {
    id: 'csw-sah',
    title: 'CSW 疑い（SAH 後）',
    category: 'CSW',
    summary: '50歳男性、SAH 発症後 7 日目の Na 125、体重減少あり',
    difficulty: 2,
    vignette:
      '50歳男性。くも膜下出血後 7 日目、ICU 管理中。血清 Na 125 mEq/L、ここ数日で体重が 3 kg 減少。起立性低血圧あり、尿量は 150 mL/h 前後、尿比重は薄め。',
    initialLabs:
      '血清Na 125、血清K 3.9、血糖 110、尿浸透圧 380、尿Na 85、BUN/Cr 比 22、尿酸 2.8',
    steps: [
      {
        prompt: '尿Na 85 + 体液減少所見 + 脳神経疾患。まず疑うべきは？',
        choices: [
          {
            label: 'SIADH',
            consequence:
              'SIADH では体液量正常が原則。体重減少・起立性低血圧・脱水傾向があるなら CSW/MRHE を優先的に疑う。',
            scoreDelta: -1,
          },
          {
            label: 'CSW（Cerebral Salt Wasting）',
            correct: true,
            consequence:
              '正解。急性脳神経疾患 + 体液減少 + 尿Na高 + 尿酸低下（排泄亢進）は CSW の典型パターン。治療は生食補充。',
            scoreDelta: 2,
          },
          {
            label: '原発性多飲症',
            consequence:
              '尿浸透圧 380 はある程度の濃縮。原発性多飲症では尿 < 100。',
            scoreDelta: -1,
          },
        ],
      },
      {
        prompt: 'CSW 疑いに対する治療方針は？',
        choices: [
          {
            label: '水制限（1000 mL/日）のみ',
            consequence:
              'CSW では水制限は禁忌。有効循環血漿量がさらに低下し脳虚血（SAH 後の DCI）のリスクが上がる。',
            scoreDelta: -2,
          },
          {
            label: '生理食塩水による補充 + 塩分摂取',
            correct: true,
            consequence:
              '正解。CSW の基本治療。フルドロコルチゾンの併用も検討される。体液量が戻るまで慎重にモニタリング。',
            scoreDelta: 2,
          },
          {
            label: 'ただちに DDAVP 投与',
            consequence:
              'DDAVP は水を保持させる薬剤。CSW のように塩喪失を伴う病態では増悪する。',
            scoreDelta: -2,
          },
        ],
      },
      {
        prompt: 'SIADH と CSW の最大の鑑別ポイントは？',
        choices: [
          {
            label: '尿浸透圧',
            consequence:
              '両者とも 100 を超えることが多く、尿浸透圧単独では鑑別困難。',
            scoreDelta: 0,
          },
          {
            label: '体液量（循環血漿量）',
            correct: true,
            consequence:
              '正解。SIADH は正常、CSW は低下。体重推移、起立性低血圧、ツルゴール、尿酸排泄率などを総合判断。',
            scoreDelta: 2,
          },
          {
            label: '尿Na',
            consequence:
              '両者とも 30 mEq/L を超えることが多く、単独では鑑別困難。',
            scoreDelta: 0,
          },
        ],
      },
    ],
    references: ['Sterns RH. N Engl J Med 2015'],
    takeaway:
      '急性脳神経疾患 + 体液減少パターンは CSW/MRHE を疑う。SIADH 前提で水制限すると致命的。',
  },

  // ---- 4. MRHE ----
  {
    id: 'mrhe-elderly',
    title: 'MRHE（高齢者、脱水所見あり）',
    category: 'MRHE',
    summary: '85歳女性、食思不振 + 体重減少 + Na 124',
    difficulty: 3,
    vignette:
      '85歳女性。1か月前からの食思不振と体重減少（-4 kg）で入院。意識は清明だが脱力・ふらつき。内服なし。ツルゴール低下、起立性低血圧（臥位 132/80、立位 98/55）。',
    initialLabs:
      '血清Na 124、血清K 4.0、血糖 92、尿浸透圧 420、尿Na 52、尿K 18、BUN/Cr 比 26、尿酸 5.1、血漿レニン活性 低値、アルドステロン 低値',
    steps: [
      {
        prompt: '本症例のパターンで最も特徴的なのは？',
        choices: [
          {
            label: '尿酸低値 + レニン高値',
            consequence:
              '尿酸は「SIADH や CSW で低下」することが多いが、MRHE は「正常〜軽度低値」でレニン・アルドステロンが「低下」するのが特徴。',
            scoreDelta: -1,
          },
          {
            label: 'レニン・アルドステロンともに低値 + 高齢 + 体液減少',
            correct: true,
            consequence:
              '正解。MRHE の古典的パターン。鉱質コルチコイド反応不全による慢性的な塩喪失。Ishikawa らが 1996 年に提唱。',
            scoreDelta: 2,
          },
          {
            label: '尿浸透圧 < 100 mOsm/kg',
            consequence:
              '本症例は 420 と中程度濃縮。MRHE ではある程度の尿濃縮が保たれる。',
            scoreDelta: -1,
          },
        ],
      },
      {
        prompt: 'MRHE に対する治療として最適なのは？',
        choices: [
          {
            label: '水制限（<1000 mL/日）',
            consequence:
              '水制限は MRHE では禁忌。循環血漿量をさらに減らし脱水を悪化させる。',
            scoreDelta: -2,
          },
          {
            label: '食塩摂取量増 + フルドロコルチゾン',
            correct: true,
            consequence:
              '正解。MRHE の標準治療。鉱質コルチコイド補充により塩の再吸収を助け、体液量と Na を同時に補正できる。',
            scoreDelta: 2,
          },
          {
            label: 'トルバプタン 15 mg',
            consequence:
              'トルバプタンは自由水排泄薬で、体液過剰性 SIADH が主な対象。MRHE のような体液減少性には原則不適切。',
            scoreDelta: -2,
          },
        ],
      },
      {
        prompt: '高齢者低Na血症で「水制限」が不適切になる病態を 2 つ選ぶなら？',
        choices: [
          {
            label: 'MRHE と CSW',
            correct: true,
            consequence:
              '正解。ともに有効循環血漿量が低下しているため、水制限で悪化する。典型 SIADH と真逆の治療戦略。',
            scoreDelta: 2,
          },
          {
            label: 'SIADH と心不全',
            consequence:
              'SIADH と心不全（希釈性）は水制限が基本治療。',
            scoreDelta: -2,
          },
          {
            label: 'サイアザイド性と原発性多飲症',
            consequence:
              '原発性多飲症は水制限が基本。サイアザイド性は原因薬中止を優先だが水制限自体は必須ではない。',
            scoreDelta: -1,
          },
        ],
      },
    ],
    references: ['Ishikawa S, et al. Endocr J 1996'],
    takeaway:
      'MRHE は本邦で重要な高齢者特有病態。SIADH と取り違えると水制限で悪化する。',
  },

  // ---- 5. 原発性多飲症 ----
  {
    id: 'primary-polydipsia',
    title: '原発性多飲症（精神疾患の背景）',
    category: 'Polydipsia',
    summary: '35歳男性、統合失調症、水を 6 L/日 飲む、Na 121',
    difficulty: 1,
    vignette:
      '35歳男性。統合失調症で外来通院中。「喉が渇いて水をたくさん飲んでしまう」との家族の訴え。推定水分摂取量 6 L/日以上。意識清明、浮腫なし。',
    initialLabs:
      '血清Na 121、血清K 3.6、血糖 88、尿浸透圧 75、尿Na 15、BUN/Cr 比 10、尿酸 3.0',
    steps: [
      {
        prompt: '尿浸透圧 75 mOsm/kg < 100。この所見が示すのは？',
        choices: [
          {
            label: 'ADH が適切に抑制され、自由水を最大限排泄中',
            correct: true,
            consequence:
              '正解。尿浸透圧 < 100 は生理的な ADH 抑制・水排泄正常を意味する。原発性多飲症や低溶質摂取（tea-and-toast / beer potomania）の病態。',
            scoreDelta: 2,
          },
          {
            label: 'SIADH による尿濃縮亢進',
            consequence:
              'SIADH では尿浸透圧が高濃縮（> 100、多くは >300）になる。矛盾。',
            scoreDelta: -2,
          },
          {
            label: '腎不全',
            consequence:
              '腎機能低下単独で 75 までは通常いかない。背景情報から原発性多飲症が最も疑わしい。',
            scoreDelta: -1,
          },
        ],
      },
      {
        prompt: '治療の第一歩は？',
        choices: [
          {
            label: '水制限（摂取量コントロール）',
            correct: true,
            consequence:
              '正解。原因の水分過剰摂取を減らすのが根本治療。精神科治療の調整と環境調整。',
            scoreDelta: 2,
          },
          {
            label: '3% NaCl 200 mL ボーラス',
            consequence:
              '意識清明の慢性例にボーラスは不要。過補正で ODS リスク。',
            scoreDelta: -2,
          },
          {
            label: 'DDAVP 投与',
            consequence:
              'DDAVP は尿を濃縮させる薬剤。原発性多飲症に投与すると過剰水貯留で悪化する。',
            scoreDelta: -2,
          },
        ],
      },
      {
        prompt:
          '水制限のみで Na が 12h で 121→ 133（Δ=+12）に急上昇した。リスクは？',
        choices: [
          {
            label: 'ODS 発症リスクが高い',
            correct: true,
            consequence:
              '正解。水制限による急速な自由水排泄 → 予想外の速い Na 上昇 → ODS。発症前から Braking を検討（DDAVP + D5W）。',
            scoreDelta: 2,
          },
          {
            label: '問題なし、速いほうが良い',
            consequence:
              'Δ > 10 mEq/L / 24h は ODS リスク帯。「速いほうが良い」は急性期（<48h）以外では誤り。',
            scoreDelta: -2,
          },
          {
            label: '脳浮腫のリスクが高い',
            consequence:
              '低Na から正常への上昇で脳浮腫は出現しにくい。むしろ ODS（脱髄）のリスク。',
            scoreDelta: -1,
          },
        ],
      },
    ],
    references: ['Verbalis JG, et al. Am J Med 2013'],
    takeaway:
      '原発性多飲症は「治療で下手に上がりやすい」代表。水制限だけでも Braking が必要になる。',
  },
];

export function caseById(id: string): LearningCase | undefined {
  return LEARNING_CASES.find((c) => c.id === id);
}

# 低Na血症マネジメント支援アプリ

中核病院の総合診療科における、成人低Na血症診療を支援する臨床支援 Web アプリです。診療補助・教育ツールであり、治療方針を決定するものではありません。

## 位置づけ

- 研修医・若手医師のベッドサイド意思決定補助
- 診断思考プロセスの型づくり・症例学習
- 症例検討会 / M&M での振り返り

**対象は成人のみ**。小児には使用しないでください。

## 主な機能

| モジュール | 内容 |
|---|---|
| 0 | 免責表示 + モード選択(治療戦略 / 年齢モード) |
| 1 | 初期入力 + Hillier 血糖補正 + 偽性低Na警告 |
| 2 | 急性 / 慢性の鑑別(発症<48h or 不明→安全側) |
| 3 | 緊急トリアージ + 3% NaCl ボーラス(2 mL/kg, 最大150 mL)+ 20分タイマー |
| 4 | ODS リスク5因子 → 24h 補正上限(標準10 / 高リスク8) |
| 5 | 鑑別 第一段階(尿浸透圧・尿Na・体液量)+ 第二段階(SIADH除外 / MRHE・CSW三者鑑別 / Furst比) |
| 6 | 統合予測式 + Adrogué-Madias 並列表示 + トラジェクトリグラフ |
| 7 | モニタリング + 水利尿検知 → Braking Protocol(HALT / CLAMP / RE-LOWERING / MONITOR) |
| 8 | エクスポート(Markdown / CSV / 印刷)+ PII スキャン |
| 9 | 学習モード 5症例(術後SIADH / サイアザイド / CSW / MRHE / 原発性多飲症) |
| 10 | 設定(戦略 / モニタ間隔 / 薬剤可否 / TBW / ODS上限)+ 監査証跡ビューア |

## 技術スタック

- Vite 5 + React 18 + TypeScript
- Tailwind CSS 3
- Zustand(状態管理)+ persist ミドルウェア
- Dexie(IndexedDB 永続化)
- Recharts(予測グラフ)
- React Router v6

## 開発

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/ に本番ビルド
npm run typecheck  # 型チェック
```

## データ保存

- セッション・測定値・監査ログ: IndexedDB(端末ローカル)
- 施設設定: localStorage(端末ローカル)
- **外部送信は一切行いません**

## 計算式リファレンス

```ts
// Hillier 式(血糖補正Na)
correctedNa = measuredNa + 2.4 × (glucose − 100) / 100  // glucose > 100

// TBW
TBW = weight × coeff   // M: 0.6, F: 0.5(通常) / M: 0.5, F: 0.45(高齢)

// 不感蒸泄
IWL = 15 mL/kg/日 × weight × h / 24 / 1000  // L

// 統合予測式
predictedNa = (currentNa × TBW + V_inf × [Na+K]_inf − V_urine × [Na+K]_urine)
            / (TBW + V_inf − V_urine − V_IWL)

// Adrogué-Madias(簡易)
ΔNa = (([Na+K]_inf − serumNa) / (TBW + 1)) × V_inf

// Furst 比
furstRatio = (urineNa + urineK) / serumNa   // ≥ 1.0 で水制限不応予測
```

## 安全設計

- 自動処方は行わない(推奨表示のみ)
- DDAVP / 3% NaCl は二段階確認後のみ実行開始
- 入力バリデーション(Na 100–160、体重 30–200)
- 監査証跡を全操作について IndexedDB に記録
- エクスポート前に PII 簡易スキャン

## 参考文献

- Adrogué HJ, Madias NE. *N Engl J Med* 2000;342:1581-89.
- Spasovski G, et al. *Eur J Endocrinol* 2014;170:G1-47.
- Verbalis JG, et al. *Am J Med* 2013;126(10 Suppl 1):S1-42.
- Sterns RH, et al. *J Am Soc Nephrol* 2023.
- Hillier TA, et al. *Am J Med* 1999;106:399-403.
- Ishikawa S, et al. *Endocr J* 1996(MRHE 提唱).

## 免責

本アプリは計算補助・教育ツールです。予測値は実測と必ず乖離します。頻回な実測と臨床判断を優先してください。最終的な治療方針は必ず主治医が決定してください。

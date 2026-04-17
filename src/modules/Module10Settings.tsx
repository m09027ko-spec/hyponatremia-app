import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Alert from '../components/Alert';
import AuditTrailViewer from '../components/AuditTrailViewer';
import { useSettingsStore, DEFAULT_SETTINGS } from '../store/settings';
import type { Strategy } from '../types';

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className={`checkbox-row ${checked ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
      <input
        type="checkbox"
        className="mt-1 w-5 h-5"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div>
        <div className="font-semibold">{label}</div>
        {description && <div className="text-xs text-gray-600 mt-0.5">{description}</div>}
      </div>
    </label>
  );
}

export default function Module10Settings() {
  const navigate = useNavigate();
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const updateDrug = useSettingsStore((s) => s.updateDrug);
  const reset = useSettingsStore((s) => s.reset);

  const setStrategy = (v: Strategy) => update('defaultStrategy', v);
  const setInterval = (v: 2 | 4 | 6) => update('defaultMonitoringIntervalH', v);

  return (
    <Layout title="設定 · 施設ローカルルール">
      <div className="space-y-5">
        <Alert level="info" title="施設カスタマイズ">
          本設定は端末のブラウザに保存されます（外部送信されません）。
          複数端末で統一したい場合は手動で同じ設定にしてください。
        </Alert>

        <section className="card">
          <h2 className="text-lg font-bold mb-3">治療戦略の既定値</h2>
          <div className="grid grid-cols-2 gap-3">
            {(['reactive', 'proactive'] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={settings.defaultStrategy === s ? 'btn-primary' : 'btn-secondary'}
                onClick={() => setStrategy(s)}
              >
                {s === 'reactive' ? 'Reactive' : 'Proactive (DDAVP Clamp)'}
              </button>
            ))}
          </div>
        </section>

        <section className="card">
          <h2 className="text-lg font-bold mb-3">モニタリング間隔の既定値</h2>
          <div className="grid grid-cols-3 gap-3">
            {([2, 4, 6] as const).map((h) => (
              <button
                key={h}
                type="button"
                className={settings.defaultMonitoringIntervalH === h ? 'btn-primary' : 'btn-secondary'}
                onClick={() => setInterval(h)}
              >
                {h} 時間
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Na 再測定の推奨間隔。急性期や Braking 中はより短く推奨されます。
          </p>
        </section>

        <section className="card">
          <h2 className="text-lg font-bold mb-3">薬剤処方可否</h2>
          <p className="text-sm text-gray-600 mb-3">
            チェックされている薬剤のみ、鑑別画面の追加治療候補として表示されます。
          </p>
          <div className="space-y-2">
            <Toggle
              label="トルバプタン"
              description="低用量 7.5 mg/日。日本では SIADH に限定保険適用。"
              checked={settings.drugAvailability.tolvaptan}
              onChange={(v) => updateDrug('tolvaptan', v)}
            />
            <Toggle
              label="尿素"
              description="15〜60 g/日。日本では入手困難。"
              checked={settings.drugAvailability.urea}
              onChange={(v) => updateDrug('urea', v)}
            />
            <Toggle
              label="フルドロコルチゾン"
              description="MRHE に対する鉱質コルチコイド補充。"
              checked={settings.drugAvailability.fludrocortisone}
              onChange={(v) => updateDrug('fludrocortisone', v)}
            />
            <Toggle
              label="SGLT2 阻害薬"
              description="浸透圧利尿による自由水排泄促進（適応外使用）。"
              checked={settings.drugAvailability.sglt2}
              onChange={(v) => updateDrug('sglt2', v)}
            />
          </div>
        </section>

        <section className="card">
          <h2 className="text-lg font-bold mb-3">TBW 係数の微調整</h2>
          <Toggle
            label="カスタム値を使用する"
            description="デフォルト値（通常 男0.6/女0.5、高齢者 男0.5/女0.45）以外を使いたい場合のみ。"
            checked={settings.tbwOverride.useCustom}
            onChange={(v) =>
              update('tbwOverride', { ...settings.tbwOverride, useCustom: v })
            }
          />
          {settings.tbwOverride.useCustom && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              {(
                [
                  { key: 'standardMale', label: '通常 男' },
                  { key: 'standardFemale', label: '通常 女' },
                  { key: 'elderlyMale', label: '高齢 男' },
                  { key: 'elderlyFemale', label: '高齢 女' },
                ] as const
              ).map(({ key, label }) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    min="0.3"
                    max="0.7"
                    value={settings.tbwOverride[key]}
                    onChange={(e) =>
                      update('tbwOverride', {
                        ...settings.tbwOverride,
                        [key]: Number(e.target.value),
                      })
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="text-lg font-bold mb-3">ODS リスク上限の微調整</h2>
          <Alert level="caution">
            デフォルト（標準 10 / 高リスク 8 mEq/L/24h）は各ガイドラインで推奨されている値です。
            変更は慎重に行ってください。
          </Alert>
          <Toggle
            label="カスタム値を使用する"
            checked={settings.correctionLimitOverride.useCustom}
            onChange={(v) =>
              update('correctionLimitOverride', {
                ...settings.correctionLimitOverride,
                useCustom: v,
              })
            }
          />
          {settings.correctionLimitOverride.useCustom && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="label">標準（mEq/L/24h）</label>
                <input
                  className="input"
                  type="number"
                  step="1"
                  min="6"
                  max="12"
                  value={settings.correctionLimitOverride.standard}
                  onChange={(e) =>
                    update('correctionLimitOverride', {
                      ...settings.correctionLimitOverride,
                      standard: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <label className="label">高リスク（mEq/L/24h）</label>
                <input
                  className="input"
                  type="number"
                  step="1"
                  min="4"
                  max="10"
                  value={settings.correctionLimitOverride.highRisk}
                  onChange={(e) =>
                    update('correctionLimitOverride', {
                      ...settings.correctionLimitOverride,
                      highRisk: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          )}
        </section>

        <div className="flex flex-col sm:flex-row gap-3">
          <button className="btn-secondary flex-1" onClick={() => navigate(-1)}>
            戻る
          </button>
          <button
            className="btn-danger sm:w-64"
            onClick={() => {
              if (confirm('すべての設定を初期値に戻しますか？')) reset();
            }}
          >
            既定値にリセット
          </button>
        </div>

        <AuditTrailViewer />

        <details className="card text-xs text-gray-600">
          <summary className="cursor-pointer font-semibold">現在の設定（JSON）</summary>
          <pre className="mt-3 bg-gray-50 p-3 rounded overflow-auto">
            {JSON.stringify(settings, null, 2)}
          </pre>
          <p className="mt-2 text-gray-500">
            既定値:{' '}
            <code className="bg-gray-100 px-1 rounded">
              {JSON.stringify(DEFAULT_SETTINGS.drugAvailability)}
            </code>
          </p>
        </details>
      </div>
    </Layout>
  );
}

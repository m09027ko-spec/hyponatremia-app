import { Navigate, useNavigate } from 'react-router-dom';
import { useSessionStore } from '../store/session';
import Layout from '../components/Layout';
import Alert from '../components/Alert';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-gray-100 py-2 text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}

export default function Summary() {
  const navigate = useNavigate();
  const session = useSessionStore((s) => s.session);
  const reset = useSessionStore((s) => s.reset);

  if (!session || session.correctionLimit === undefined) {
    return <Navigate to="/limits" replace />;
  }

  const d = session.demographics;
  const labs = session.initialLabs;
  const stage2 = session.stage2;
  const braking = session.lastBraking;

  return (
    <Layout title="セッション概要">
      <div className="space-y-5">
        <Alert level="info" title="Phase 3 実装済み">
          モジュール 0〜10 が利用可能です。
          モジュール 8（エクスポート）・モジュール 9（学習モード）・監査証跡も完成しました。
        </Alert>

        <section className="card">
          <h2 className="text-lg font-bold mb-3">基本情報</h2>
          {d && (
            <>
              <Row label="年齢" value={`${d.age} 歳`} />
              <Row label="性別" value={d.sex === 'M' ? '男性' : '女性'} />
              <Row label="体重" value={`${d.weight} kg`} />
            </>
          )}
          <Row label="治療戦略" value={session.strategy === 'reactive' ? 'Reactive' : 'Proactive (DDAVP Clamp)'} />
          <Row label="年齢モード" value={session.ageMode === 'elderly' ? '高齢者モード' : '通常'} />
        </section>

        <section className="card">
          <h2 className="text-lg font-bold mb-3">初期検査値・判定</h2>
          {labs && (
            <>
              <Row label="実測 血清Na" value={`${labs.serumNa} mEq/L`} />
              <Row label="血糖値" value={`${labs.glucose} mg/dL`} />
            </>
          )}
          {session.correctedNa !== undefined && (
            <Row
              label="血糖補正後 Na (Hillier)"
              value={
                <span className="text-yellow-700">
                  {session.correctedNa.toFixed(1)} mEq/L
                </span>
              }
            />
          )}
          {session.pseudoWarning && (
            <Row label="偽性警告" value={<span className="text-red-600">あり</span>} />
          )}
          <Row label="急性 / 慢性" value={session.acuity === 'acute' ? '急性' : '慢性 / 不明'} />
          {session.acuityHours !== undefined && (
            <Row label="発症からの時間" value={`${session.acuityHours} h`} />
          )}
        </section>

        <section className="card">
          <h2 className="text-lg font-bold mb-3">緊急トリアージ</h2>
          {session.emergencySymptoms ? (
            <>
              <Row
                label="重篤神経症状"
                value={
                  Object.values(session.emergencySymptoms).some(Boolean) ? (
                    <span className="text-red-600">あり</span>
                  ) : (
                    'なし'
                  )
                }
              />
              {session.emergencyBolusStartedAt && (
                <Row
                  label="3% NaCl ボーラス開始"
                  value={new Date(session.emergencyBolusStartedAt).toLocaleString('ja-JP')}
                />
              )}
            </>
          ) : (
            <Row label="重篤神経症状" value="未入力" />
          )}
        </section>

        <section className="card">
          <h2 className="text-lg font-bold mb-3">治療目標と安全限界</h2>
          <Row
            label="ODS リスク"
            value={
              session.riskLevel === 'highRisk' ? (
                <span className="text-red-600">高リスク</span>
              ) : (
                <span className="text-green-700">標準</span>
              )
            }
          />
          <Row
            label="24h 補正上限"
            value={<span className="text-red-600">{session.correctionLimit} mEq/L</span>}
          />
          <Row
            label="目標補正幅"
            value={
              <span className="text-green-700">
                {session.correctionTargetMin}–{session.correctionTargetMax} mEq/L
              </span>
            }
          />
        </section>

        {session.differentialResult && (
          <section className="card">
            <h2 className="text-lg font-bold mb-3">鑑別（第一段階）</h2>
            <Row label="判定" value={<span className="text-blue-700">{session.differentialResult.label}</span>} />
            <Row label="推奨" value={<span className="text-sm">{session.differentialResult.recommendation}</span>} />
            <Row
              label="第二段階要否"
              value={session.differentialResult.stage2Required ? '要（下に結果）' : '不要'}
            />
          </section>
        )}

        {stage2 && (
          <section className="card">
            <h2 className="text-lg font-bold mb-3">第二段階 最終判定</h2>
            <Row
              label="最終カテゴリ"
              value={
                <span
                  className={
                    stage2.finalCategory === 'SIADH'
                      ? 'text-blue-700'
                      : stage2.finalCategory?.endsWith('suspected')
                        ? 'text-red-600'
                        : 'text-gray-700'
                  }
                >
                  {stage2.finalCategory === 'SIADH' && 'SIADH（除外診断完了）'}
                  {stage2.finalCategory === 'MRHE_suspected' && 'MRHE 疑い'}
                  {stage2.finalCategory === 'CSW_suspected' && 'CSW 疑い'}
                  {stage2.finalCategory === 'undetermined' && '未確定'}
                </span>
              }
            />
            {stage2.siadhExclusion && (
              <Row
                label="SIADH 除外診断"
                value={
                  Object.values(stage2.siadhExclusion).every(Boolean)
                    ? <span className="text-green-700">完了</span>
                    : <span className="text-yellow-700">未完了</span>
                }
              />
            )}
            {stage2.mrhe && (
              <Row
                label="MRHE スコア"
                value={
                  <span className={stage2.mrhe.score.positive ? 'text-red-600' : ''}>
                    {stage2.mrhe.score.score}{stage2.mrhe.score.positive ? '（陽性）' : ''}
                  </span>
                }
              />
            )}
            {stage2.csw && (
              <Row
                label="CSW スコア"
                value={
                  <span className={stage2.csw.score.positive ? 'text-red-600' : ''}>
                    {stage2.csw.score.score}{stage2.csw.score.positive ? '（陽性）' : ''}
                  </span>
                }
              />
            )}
            {stage2.furst && (
              <Row
                label="Furst 比"
                value={
                  <span className={stage2.furst.refractory ? 'text-red-600' : 'text-green-700'}>
                    {stage2.furst.ratio.toFixed(2)}
                    {stage2.furst.refractory ? '（水制限不応予測）' : ''}
                  </span>
                }
              />
            )}
          </section>
        )}

        {session.monitoring && session.monitoring.length > 0 && (
          <section className="card">
            <h2 className="text-lg font-bold mb-3">モニタリング</h2>
            <Row label="測定数" value={`${session.monitoring.length} 件`} />
            <Row
              label="直近 Na"
              value={
                <span>
                  {session.monitoring.at(-1)!.serumNa.toFixed(1)} mEq/L
                </span>
              }
            />
            <Row
              label="直近測定時刻"
              value={new Date(session.monitoring.at(-1)!.timestamp).toLocaleString('ja-JP')}
            />
          </section>
        )}

        {braking && (
          <section className={`card ${braking.acknowledged ? '' : 'bg-red-50 border-red-400'}`}>
            <h2 className="text-lg font-bold mb-3">
              直近の Braking イベント
              {!braking.acknowledged && <span className="badge-danger ml-2">未確認</span>}
            </h2>
            <Row
              label="発動時刻"
              value={new Date(braking.at).toLocaleString('ja-JP')}
            />
            <Row
              label="トリガ"
              value={braking.assessment.triggers.join(', ') || '—'}
            />
            <div className="mt-2 text-xs text-gray-700">
              <div className="font-semibold mb-1">検知理由</div>
              <ul className="list-disc list-inside space-y-0.5">
                {braking.assessment.reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          </section>
        )}

        {session.lastPrediction && (
          <section className="card">
            <h2 className="text-lg font-bold mb-3">直近の予測シミュレーション</h2>
            <Row label="実施時刻" value={new Date(session.lastPrediction.runAt).toLocaleString('ja-JP')} />
            <Row label="輸液" value={session.lastPrediction.params.fluidLabel} />
            <Row label="投与量 / 時間" value={`${session.lastPrediction.params.infTotalMl} mL / ${session.lastPrediction.params.infDurationH} h`} />
            <Row label="尿量" value={`${session.lastPrediction.params.urineRateMlPerH} mL/h`} />
            <Row label="予測期間" value={`${session.lastPrediction.params.predictH} h`} />
            <Row
              label="統合予測式 最終Na"
              value={
                <span className={session.lastPrediction.exceedsLimit ? 'text-red-600' : 'text-green-700'}>
                  {session.lastPrediction.integratedFinal.toFixed(1)} mEq/L
                </span>
              }
            />
            <Row label="Adrogué-Madias 最終Na" value={`${session.lastPrediction.adrogueFinal.toFixed(1)} mEq/L`} />
            {session.lastPrediction.exceedsLimit && (
              <Row label="安全限界" value={<span className="text-red-600">超過リスクあり</span>} />
            )}
          </section>
        )}

        <section className="card bg-gray-50">
          <h2 className="text-sm font-bold text-gray-600 mb-2">セッション情報</h2>
          <p className="text-xs text-gray-500 break-all">
            Session ID: {session.sessionId}
          </p>
          <p className="text-xs text-gray-500">
            開始: {new Date(session.createdAt).toLocaleString('ja-JP')}
          </p>
          <p className="text-xs text-gray-500">
            更新: {new Date(session.updatedAt).toLocaleString('ja-JP')}
          </p>
        </section>

        <div className="flex flex-col sm:flex-row gap-3">
          <button className="btn-primary flex-1 text-lg" onClick={() => navigate('/monitor')}>
            モニタリング / Braking へ
          </button>
          <button className="btn-secondary sm:w-48" onClick={() => navigate('/prediction')}>
            予測を再計算
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button className="btn-secondary flex-1" onClick={() => navigate('/export')}>
            📄 エクスポート（カルテ貼付・カンファ用）
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button className="btn-secondary flex-1" onClick={() => navigate('/differential')}>
            鑑別（Stage 2）に戻る
          </button>
          <button
            className="btn-danger sm:w-56"
            onClick={() => {
              if (confirm('現在のセッションを終了しますか？（DBには保存済み）')) {
                reset();
                navigate('/mode');
              }
            }}
          >
            セッション終了
          </button>
        </div>
      </div>
    </Layout>
  );
}

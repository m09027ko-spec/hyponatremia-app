import { useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Alert from '../components/Alert';
import { LEARNING_CASES, caseById, type LearningChoice, type LearningCase } from '../data/learningCases';
import { audit } from '../db/dexie';

function CaseIndex() {
  const navigate = useNavigate();
  return (
    <Layout title="学習モード · 症例一覧">
      <div className="space-y-5">
        <Alert level="info" title="学習モードについて">
          仮想症例で診断思考プロセスを練習します。各ステップで選択し、誤選択時は臨床的帰結と解説が表示されます。
          実患者情報は含まれません。
        </Alert>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {LEARNING_CASES.map((c) => (
            <button
              key={c.id}
              className="card text-left hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => navigate(`/learning/${c.id}`)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="badge-safe">{c.category}</span>
                <span className="text-xs text-gray-500">
                  難易度 {'★'.repeat(c.difficulty)}
                </span>
              </div>
              <h3 className="font-bold text-lg mb-1">{c.title}</h3>
              <p className="text-sm text-gray-700">{c.summary}</p>
              <p className="text-xs text-gray-500 mt-2">{c.steps.length} ステップ</p>
            </button>
          ))}
        </div>

        <div className="flex">
          <button className="btn-secondary" onClick={() => navigate('/mode')}>
            モード選択に戻る
          </button>
        </div>
      </div>
    </Layout>
  );
}

function CaseRunner({ kase }: { kase: LearningCase }) {
  const navigate = useNavigate();
  const [stepIdx, setStepIdx] = useState(0);
  const [chosen, setChosen] = useState<LearningChoice | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [done, setDone] = useState(false);
  const [answeredSteps, setAnsweredSteps] = useState<number>(0);

  const step = kase.steps[stepIdx];
  const isLast = stepIdx === kase.steps.length - 1;
  const maxScore = kase.steps.length * 2;

  const choose = (c: LearningChoice) => {
    if (chosen) return;
    setChosen(c);
    setTotalScore((s) => s + c.scoreDelta);
    setAnsweredSteps((n) => n + 1);
    void audit(
      'module9.choice',
      undefined,
      `case=${kase.id} step=${stepIdx} label="${c.label}" Δ=${c.scoreDelta}`,
    );
  };

  const next = () => {
    if (isLast) {
      setDone(true);
      void audit(
        'module9.completed',
        undefined,
        `case=${kase.id} score=${totalScore}/${maxScore}`,
      );
      return;
    }
    setStepIdx((i) => i + 1);
    setChosen(null);
  };

  const percent = Math.round(((stepIdx + (chosen ? 1 : 0)) / kase.steps.length) * 100);

  if (done) {
    const ratio = totalScore / maxScore;
    const grade =
      ratio >= 0.8
        ? { text: '秀', color: 'text-green-700' }
        : ratio >= 0.5
          ? { text: '可', color: 'text-blue-700' }
          : ratio >= 0.2
            ? { text: '要復習', color: 'text-yellow-700' }
            : { text: '再挑戦推奨', color: 'text-red-700' };

    return (
      <Layout title={`学習 · ${kase.title} · 完了`}>
        <div className="space-y-5">
          <section className="card bg-slate-900 text-white">
            <h2 className="text-xs text-slate-300 mb-1">結果</h2>
            <div className="flex items-baseline gap-4">
              <span className={`text-5xl font-bold ${grade.color}`}>{grade.text}</span>
              <span className="text-3xl tabular-nums">
                {totalScore} <span className="text-lg">/ {maxScore}</span>
              </span>
            </div>
            <p className="text-sm text-slate-300 mt-2">
              {answeredSteps} / {kase.steps.length} ステップ回答
            </p>
          </section>

          <Alert level="info" title="学習のポイント">
            {kase.takeaway}
          </Alert>

          <section className="card">
            <h2 className="text-lg font-bold mb-2">参考文献</h2>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              {kase.references.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </section>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              className="btn-primary flex-1"
              onClick={() => {
                setStepIdx(0);
                setChosen(null);
                setTotalScore(0);
                setDone(false);
                setAnsweredSteps(0);
              }}
            >
              もう一度
            </button>
            <button className="btn-secondary flex-1" onClick={() => navigate('/learning')}>
              他の症例を見る
            </button>
            <button className="btn-secondary sm:w-40" onClick={() => navigate('/mode')}>
              モード選択
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title={`学習 · ${kase.title}`}
      step={{ current: stepIdx + 1, total: kase.steps.length }}
    >
      <div className="space-y-5">
        <section className="card bg-slate-50">
          <div className="flex items-center justify-between mb-2">
            <span className="badge-safe">{kase.category}</span>
            <span className="text-xs text-gray-500">
              進捗 {percent}% · スコア {totalScore}/{maxScore}
            </span>
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold">症例概要（タップで展開）</summary>
            <div className="mt-2 space-y-2">
              <p>{kase.vignette}</p>
              <p className="font-mono text-xs bg-white border rounded px-2 py-1">
                {kase.initialLabs}
              </p>
            </div>
          </details>
        </section>

        <section className="card">
          <h2 className="text-lg font-bold mb-2">ステップ {stepIdx + 1}</h2>
          <p className="text-base mb-4">{step.prompt}</p>
          {step.hint && (
            <p className="text-xs text-gray-500 italic mb-3">ヒント: {step.hint}</p>
          )}

          <div className="space-y-3">
            {step.choices.map((c, i) => {
              const isChosen = chosen === c;
              const isGood = c.correct || c.acceptable;
              const base = 'w-full text-left px-4 py-3 rounded-lg border min-h-tap transition-colors';
              let cls = `${base} bg-white border-gray-300 hover:bg-blue-50`;
              if (chosen) {
                if (isChosen && isGood) cls = `${base} bg-green-100 border-green-500`;
                else if (isChosen && !isGood) cls = `${base} bg-red-100 border-red-500`;
                else if (isGood) cls = `${base} bg-green-50 border-green-300`;
                else cls = `${base} bg-gray-50 border-gray-300 opacity-70`;
              }
              return (
                <button
                  key={i}
                  className={cls}
                  disabled={!!chosen}
                  onClick={() => choose(c)}
                >
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-gray-500">{String.fromCharCode(65 + i)}.</span>
                    <span className="flex-1">{c.label}</span>
                    {chosen && isGood && <span className="text-green-700 font-bold">✓</span>}
                    {chosen && isChosen && !isGood && <span className="text-red-700 font-bold">✗</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {chosen && (
            <div
              className={`mt-4 rounded-lg p-4 text-sm ${
                chosen.correct || chosen.acceptable
                  ? 'bg-green-50 border border-green-300'
                  : 'bg-red-50 border border-red-300'
              }`}
            >
              <div className="font-semibold mb-1">
                {chosen.correct || chosen.acceptable
                  ? `正解（+${chosen.scoreDelta}）`
                  : `不正解（${chosen.scoreDelta >= 0 ? '+' : ''}${chosen.scoreDelta}）`}
              </div>
              <div>{chosen.consequence}</div>
              {step.followUp && (
                <div className="mt-3 pt-3 border-t border-gray-300 text-gray-700">
                  <strong>補足: </strong>{step.followUp}
                </div>
              )}
            </div>
          )}
        </section>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            className="btn-primary flex-1 text-lg"
            disabled={!chosen}
            onClick={next}
          >
            {isLast ? '結果を見る' : '次のステップ'}
          </button>
          <button
            className="btn-secondary sm:w-40"
            onClick={() => navigate('/learning')}
          >
            症例一覧
          </button>
        </div>
      </div>
    </Layout>
  );
}

export default function Module9Learning() {
  const { caseId } = useParams<{ caseId?: string }>();
  if (!caseId) return <CaseIndex />;
  const kase = caseById(caseId);
  if (!kase) return <Navigate to="/learning" replace />;
  return <CaseRunner kase={kase} />;
}

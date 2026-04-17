import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../store/session';
import { recordConsent } from '../db/dexie';

export default function Module0Disclaimer() {
  const navigate = useNavigate();
  const setConsented = useSessionStore((s) => s.setConsented);

  const onConsent = async () => {
    await recordConsent();
    setConsented();
    navigate('/mode');
  };

  return (
    <div className="min-h-full flex flex-col bg-slate-900 text-white">
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="max-w-2xl w-full bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-700">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-yellow-300">
            免責事項
          </h1>
          <p className="text-sm text-slate-300 mb-6">
            低Na血症マネジメント支援アプリ
          </p>

          <div className="space-y-4 text-base leading-relaxed">
            <p>
              本アプリは<strong className="text-yellow-200">計算補助およびエビデンスベースの教育ツール</strong>
              であり、個別の患者の最終的な治療方針を決定するものではありません。
            </p>
            <p>
              予測値は実際の血清Naの推移と<strong className="text-yellow-200">必ず乖離</strong>
              するため、頻回な実測と臨床判断を優先してください。
            </p>
            <p className="bg-red-900/40 border border-red-400 rounded-lg px-4 py-3">
              本アプリは<strong>成人患者のみ</strong>を対象としています。
              小児には使用しないでください。
            </p>
            <p className="text-sm text-slate-300">
              「同意する」を押すと、本内容を理解したものとして記録されます。
              同意日時はローカルに保存されます（外部送信されません）。
            </p>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              className="btn-primary flex-1 text-lg"
              onClick={onConsent}
            >
              同意する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

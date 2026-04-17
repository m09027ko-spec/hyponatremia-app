type Col = 'SIADH' | 'CSW' | 'MRHE';

interface ThreeWayTableProps {
  highlight?: Col;
}

const ROWS: { label: string; siadh: string; csw: string; mrhe: string }[] = [
  {
    label: '背景',
    siadh: '悪性腫瘍 / 肺疾患 / 薬剤',
    csw: '急性脳神経疾患（SAH 等）',
    mrhe: '高齢者 / 低栄養',
  },
  {
    label: '循環血漿量',
    siadh: '正常',
    csw: '低下',
    mrhe: '低下',
  },
  {
    label: 'BUN/Cr 比',
    siadh: '低〜正常',
    csw: '上昇',
    mrhe: '上昇',
  },
  {
    label: '尿酸',
    siadh: '低値',
    csw: '低値（排泄↑）',
    mrhe: '正常〜軽度低値',
  },
  {
    label: 'レニン / アルドステロン',
    siadh: '低〜正常',
    csw: '上昇',
    mrhe: '低下（特徴的）',
  },
  {
    label: '治療',
    siadh: '水制限',
    csw: '生理食塩水補充',
    mrhe: '食塩 + フルドロコルチゾン',
  },
  {
    label: '水制限の可否',
    siadh: '適応',
    csw: '禁忌',
    mrhe: '禁忌',
  },
];

export default function ThreeWayTable({ highlight }: ThreeWayTableProps) {
  const headerClass = (col: Col) =>
    highlight === col
      ? 'bg-yellow-200 text-gray-900'
      : 'bg-slate-800 text-white';
  const cellClass = (col: Col) =>
    highlight === col ? 'bg-yellow-50 font-semibold' : '';

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="bg-slate-100 text-left p-2 border border-slate-300 min-w-28">項目</th>
            <th className={`p-2 border border-slate-300 ${headerClass('SIADH')}`}>SIADH</th>
            <th className={`p-2 border border-slate-300 ${headerClass('CSW')}`}>CSW</th>
            <th className={`p-2 border border-slate-300 ${headerClass('MRHE')}`}>MRHE</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.label}>
              <td className="bg-slate-50 font-semibold p-2 border border-slate-300">
                {r.label}
              </td>
              <td className={`p-2 border border-slate-300 ${cellClass('SIADH')}`}>
                {r.siadh}
              </td>
              <td className={`p-2 border border-slate-300 ${cellClass('CSW')}`}>{r.csw}</td>
              <td className={`p-2 border border-slate-300 ${cellClass('MRHE')}`}>
                {r.mrhe}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

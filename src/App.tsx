import { Routes, Route, Navigate } from 'react-router-dom';
import Module0Disclaimer from './modules/Module0Disclaimer';
import ModeSelect from './modules/ModeSelect';
import Module1InitialInput from './modules/Module1InitialInput';
import Module2Acuity from './modules/Module2Acuity';
import Module3Emergency from './modules/Module3Emergency';
import Module4Limits from './modules/Module4Limits';
import Module5Differential from './modules/Module5Differential';
import Module6Prediction from './modules/Module6Prediction';
import Module7Monitor from './modules/Module7Monitor';
import Module8Export from './modules/Module8Export';
import Module9Learning from './modules/Module9Learning';
import Module10Settings from './modules/Module10Settings';
import Summary from './modules/Summary';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Module0Disclaimer />} />
      <Route path="/mode" element={<ModeSelect />} />
      <Route path="/input" element={<Module1InitialInput />} />
      <Route path="/acuity" element={<Module2Acuity />} />
      <Route path="/emergency" element={<Module3Emergency />} />
      <Route path="/limits" element={<Module4Limits />} />
      <Route path="/differential" element={<Module5Differential />} />
      <Route path="/prediction" element={<Module6Prediction />} />
      <Route path="/monitor" element={<Module7Monitor />} />
      <Route path="/export" element={<Module8Export />} />
      <Route path="/learning" element={<Module9Learning />} />
      <Route path="/learning/:caseId" element={<Module9Learning />} />
      <Route path="/settings" element={<Module10Settings />} />
      <Route path="/summary" element={<Summary />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

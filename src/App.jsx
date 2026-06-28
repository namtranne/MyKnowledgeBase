import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProgressProvider } from './components/progress/ProgressContext.jsx';
import { DocLayout, PlainLayout } from './components/layout/Layout.jsx';
import Home from './pages/Home.jsx';
import DSARoadmap from './pages/dsa-roadmap/index.jsx';
import InterviewChecklist from './pages/interview-checklist/index.jsx';
import DocPage from './pages/DocPage.jsx';

const basename = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

export default function App() {
  return (
    <BrowserRouter basename={basename}>
      <ProgressProvider>
        <Routes>
          <Route path="/" element={<PlainLayout><Home /></PlainLayout>} />
          <Route path="/dsa-roadmap" element={<PlainLayout><DSARoadmap /></PlainLayout>} />
          <Route path="/interview-checklist" element={<PlainLayout><InterviewChecklist /></PlainLayout>} />
          <Route path="/docs" element={<Navigate to="/docs/intro" replace />} />
          <Route path="/docs/*" element={<DocLayout><DocPage /></DocLayout>} />
          <Route path="*" element={<DocLayout><DocPage /></DocLayout>} />
        </Routes>
      </ProgressProvider>
    </BrowserRouter>
  );
}

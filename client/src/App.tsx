import { Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import AuthGate from './components/AuthGate';
import MaterialLibrary from './pages/MaterialLibrary';
import AddMaterial from './pages/AddMaterial';
import MaterialDetail from './pages/MaterialDetail';
import ExtractionBook from './pages/ExtractionBook';
import ReviewMode from './pages/ReviewMode';
import Settings from './pages/Settings';

function App() {
  return (
    <AuthGate>
      <div className="min-h-svh bg-page text-text-primary font-sans">
        <NavBar />
        <main className="px-6 md:px-8 py-8 pb-24 md:pb-8 max-w-6xl mx-auto">
          <Routes>
            <Route path="/" element={<MaterialLibrary />} />
            <Route path="/materials/new" element={<AddMaterial />} />
            <Route path="/materials/:id" element={<MaterialDetail />} />
            <Route path="/extractions" element={<ExtractionBook />} />
            <Route path="/review" element={<ReviewMode />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </AuthGate>
  );
}

export default App;

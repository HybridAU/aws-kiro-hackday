import { useState } from 'react';
import { SplitScreenLayout } from './components/SplitScreenLayout';
import { AICompanion } from './components/AICompanion';
import { ApplicationForm } from './components/ApplicationForm';
import { AdminDashboard } from './components/AdminDashboard';
import { MyApplications } from './components/MyApplications';
import { DevBanner } from './components/DevBanner';
import { TetrisGame } from './components/TetrisGame';

type UserRole = 'applicant' | 'admin' | 'my-applications';

interface FormData {
  applicantName: string;
  applicantEmail: string;
  projectTitle: string;
  projectDescription: string;
  requestedAmount: number | '';
}

function App() {
  const [role, setRole] = useState<UserRole>('applicant');
  const [mode, setMode] = useState<'voice' | 'text'>('text');
  const [highlightedField, setHighlightedField] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    applicantName: '',
    applicantEmail: '',
    projectTitle: '',
    projectDescription: '',
    requestedAmount: '',
  });
  const [showTetris, setShowTetris] = useState(false);

  const handleFieldUpdate = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: field === 'requestedAmount' ? (value ? parseFloat(value) : '') : value,
    }));

    // Highlight the updated field
    setHighlightedField(field);
    setTimeout(() => setHighlightedField(null), 2000);
  };

  const handleFormSubmit = () => {
    // Reset form after successful submission
    setFormData({
      applicantName: '',
      applicantEmail: '',
      projectTitle: '',
      projectDescription: '',
      requestedAmount: '',
    });
  };

  const isAdmin = role === 'admin';

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Dev Mode Banner */}
      <DevBanner />

      {/* Header - different color for admin vs applicant */}
      <header className={`${isAdmin ? 'bg-indigo-800' : 'bg-sky-600'} text-white p-4 transition-colors duration-300`}>
        <div className="flex items-center w-full px-4">
          {/* Logo - left aligned */}
          <h1 className="text-2xl font-bold shrink-0">🕊️ Dove Grants</h1>
          
          {/* Nav - spread across with justify-between */}
          <nav className="flex-1 flex items-center justify-between mx-8">
            {/* Applicant tabs - left side */}
            <div className={`flex items-center space-x-1 ${isAdmin ? 'bg-indigo-700/50' : 'bg-sky-500/50'} rounded-lg p-1`}>
              <button
                onClick={() => setRole('applicant')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  role === 'applicant' 
                    ? 'bg-sky-400 text-white' 
                    : isAdmin 
                      ? 'text-indigo-200 hover:bg-indigo-700' 
                      : 'text-sky-100 hover:bg-sky-500'
                }`}
              >
                Apply for Grant
              </button>
              <button
                onClick={() => setRole('my-applications')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  role === 'my-applications' 
                    ? 'bg-sky-400 text-white' 
                    : isAdmin 
                      ? 'text-indigo-200 hover:bg-indigo-700' 
                      : 'text-sky-100 hover:bg-sky-500'
                }`}
              >
                My Applications
              </button>
            </div>

            {/* Admin tab - right side */}
            <div className={`flex items-center space-x-1 ${isAdmin ? 'bg-indigo-700/50' : 'bg-sky-500/50'} rounded-lg p-1`}>
              <button
                onClick={() => setRole('admin')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  role === 'admin' 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-sky-100 hover:bg-sky-500'
                }`}
              >
                Admin
              </button>
            </div>
          </nav>

          {/* Avatar - right aligned (click for easter egg!) */}
          <div 
            className="flex items-center gap-2 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setShowTetris(true)}
            title="🎮"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
              isAdmin 
                ? 'bg-indigo-600 ring-2 ring-indigo-400' 
                : 'bg-sky-400 ring-2 ring-sky-300'
            }`}>
              {isAdmin ? '👩‍💼' : '👨‍💻'}
            </div>
            <div className="text-sm">
              <div className="font-medium">{isAdmin ? 'Sarah Admin' : 'John Applicant'}</div>
              <div className={`text-xs ${isAdmin ? 'text-indigo-300' : 'text-sky-200'}`}>
                {isAdmin ? 'Grant Manager' : 'Applicant'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {role === 'my-applications' ? (
        <div className="flex-1 overflow-auto bg-dove-100">
          <MyApplications />
        </div>
      ) : (
        <SplitScreenLayout
          userRole={role === 'applicant' ? 'applicant' : 'admin'}
          leftPanel={
            <AICompanion
              mode={mode}
              onFieldUpdate={handleFieldUpdate}
              onModeChange={setMode}
              context={role === 'applicant' ? 'application' : 'admin'}
            />
          }
          rightPanel={
            role === 'applicant' ? (
              <ApplicationForm
                formData={formData}
                highlightedField={highlightedField}
                onManualEdit={handleFieldUpdate}
                onSubmit={handleFormSubmit}
              />
            ) : (
              <AdminDashboard />
            )
          }
        />
      )}

      {/* Easter Egg: Tetris Game */}
      {showTetris && <TetrisGame onClose={() => setShowTetris(false)} />}
    </div>
  );
}

export default App;

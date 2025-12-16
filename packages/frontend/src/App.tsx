import { useState } from 'react';
import { SplitScreenLayout } from './components/SplitScreenLayout';
import { AICompanion } from './components/AICompanion';
import { ApplicationForm } from './components/ApplicationForm';
import { AdminDashboard } from './components/AdminDashboard';
import { DevBanner } from './components/DevBanner';

type UserRole = 'applicant' | 'admin';

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

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Dev Mode Banner */}
      <DevBanner />

      {/* Header */}
      <header className="bg-dove-800 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">🕊️ Dove Grants</h1>
          <nav className="space-x-4">
            <button
              onClick={() => setRole('applicant')}
              className={`px-4 py-2 rounded transition-colors ${
                role === 'applicant' ? 'bg-dove-600' : 'hover:bg-dove-700'
              }`}
            >
              Apply for Grant
            </button>
            <button
              onClick={() => setRole('admin')}
              className={`px-4 py-2 rounded transition-colors ${
                role === 'admin' ? 'bg-dove-600' : 'hover:bg-dove-700'
              }`}
            >
              Admin Dashboard
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <SplitScreenLayout
        userRole={role}
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
    </div>
  );
}

export default App;

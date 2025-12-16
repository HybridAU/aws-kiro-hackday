import { useState, useEffect } from 'react';

interface KnowledgeBase {
  organization: {
    name: string;
    description: string;
    contact: string;
    website: string;
  };
  forApplicants: {
    eligibility: string;
    howToApply: string;
    fundingCategories: string;
    tips: string;
  };
  forReviewers: {
    scoringCriteria: string;
    reviewProcess: string;
    redFlags: string;
    approvalGuidelines: string;
  };
  faqs: { question: string; answer: string }[];
}

interface KnowledgeBaseEditorProps {
  onClose: () => void;
}

export function KnowledgeBaseEditor({ onClose }: KnowledgeBaseEditorProps) {
  const [data, setData] = useState<KnowledgeBase | null>(null);
  const [activeTab, setActiveTab] = useState<'organization' | 'applicants' | 'reviewers'>('organization');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetch('/api/knowledge-base')
      .then(res => res.json())
      .then(result => {
        if (result.success) setData(result.data);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    if (!data) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/knowledge-base', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setHasChanges(false);
        alert('Knowledge base saved!');
      }
    } finally {
      setIsSaving(false);
    }
  };


  const updateField = (section: string, field: string, value: string) => {
    if (!data) return;
    setData({
      ...data,
      [section]: { ...(data as Record<string, Record<string, string>>)[section], [field]: value }
    });
    setHasChanges(true);
  };

  const handleClose = () => {
    if (hasChanges && !confirm('You have unsaved changes. Close anyway?')) return;
    onClose();
  };

  if (isLoading) {
    return <div className="p-6 text-dove-500">Loading knowledge base...</div>;
  }

  if (!data) {
    return <div className="p-6 text-red-500">Failed to load knowledge base</div>;
  }

  const tabs = [
    { id: 'organization', label: '🏢 Organization', icon: '🏢' },
    { id: 'applicants', label: '📝 For Applicants', icon: '📝' },
    { id: 'reviewers', label: '👀 For Reviewers', icon: '👀' },
  ] as const;

  return (
    <div className="space-y-4">
      <button onClick={handleClose} className="text-dove-500 hover:text-dove-700 text-sm flex items-center gap-1">
        ← Back
      </button>

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">📚 Knowledge Base</h2>
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <p className="text-sm text-dove-500">
        This information is used by the AI assistant to help applicants and reviewers.
      </p>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dove-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-dove-500 hover:text-dove-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>


      {/* Organization Tab */}
      {activeTab === 'organization' && (
        <div className="space-y-4 bg-white rounded-lg p-4 shadow">
          <div>
            <label className="block text-sm font-medium text-dove-700 mb-1">Organization Name</label>
            <input
              type="text"
              value={data.organization.name}
              onChange={e => updateField('organization', 'name', e.target.value)}
              className="w-full border border-dove-300 rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dove-700 mb-1">Description</label>
            <textarea
              value={data.organization.description}
              onChange={e => updateField('organization', 'description', e.target.value)}
              className="w-full border border-dove-300 rounded px-3 py-2 h-20"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dove-700 mb-1">Contact Email</label>
              <input
                type="email"
                value={data.organization.contact}
                onChange={e => updateField('organization', 'contact', e.target.value)}
                className="w-full border border-dove-300 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dove-700 mb-1">Website</label>
              <input
                type="url"
                value={data.organization.website}
                onChange={e => updateField('organization', 'website', e.target.value)}
                className="w-full border border-dove-300 rounded px-3 py-2"
              />
            </div>
          </div>
        </div>
      )}

      {/* Applicants Tab */}
      {activeTab === 'applicants' && (
        <div className="space-y-4 bg-white rounded-lg p-4 shadow">
          <div>
            <label className="block text-sm font-medium text-dove-700 mb-1">Eligibility Requirements</label>
            <textarea
              value={data.forApplicants.eligibility}
              onChange={e => updateField('forApplicants', 'eligibility', e.target.value)}
              className="w-full border border-dove-300 rounded px-3 py-2 h-32 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dove-700 mb-1">How to Apply</label>
            <textarea
              value={data.forApplicants.howToApply}
              onChange={e => updateField('forApplicants', 'howToApply', e.target.value)}
              className="w-full border border-dove-300 rounded px-3 py-2 h-32 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dove-700 mb-1">Funding Categories</label>
            <textarea
              value={data.forApplicants.fundingCategories}
              onChange={e => updateField('forApplicants', 'fundingCategories', e.target.value)}
              className="w-full border border-dove-300 rounded px-3 py-2 h-32 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dove-700 mb-1">Tips for Strong Applications</label>
            <textarea
              value={data.forApplicants.tips}
              onChange={e => updateField('forApplicants', 'tips', e.target.value)}
              className="w-full border border-dove-300 rounded px-3 py-2 h-32 font-mono text-sm"
            />
          </div>
        </div>
      )}


      {/* Reviewers Tab */}
      {activeTab === 'reviewers' && (
        <div className="space-y-4 bg-white rounded-lg p-4 shadow">
          <div>
            <label className="block text-sm font-medium text-dove-700 mb-1">Scoring Criteria</label>
            <textarea
              value={data.forReviewers.scoringCriteria}
              onChange={e => updateField('forReviewers', 'scoringCriteria', e.target.value)}
              className="w-full border border-dove-300 rounded px-3 py-2 h-32 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dove-700 mb-1">Review Process</label>
            <textarea
              value={data.forReviewers.reviewProcess}
              onChange={e => updateField('forReviewers', 'reviewProcess', e.target.value)}
              className="w-full border border-dove-300 rounded px-3 py-2 h-32 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dove-700 mb-1">Red Flags to Watch For</label>
            <textarea
              value={data.forReviewers.redFlags}
              onChange={e => updateField('forReviewers', 'redFlags', e.target.value)}
              className="w-full border border-dove-300 rounded px-3 py-2 h-32 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dove-700 mb-1">Approval Guidelines</label>
            <textarea
              value={data.forReviewers.approvalGuidelines}
              onChange={e => updateField('forReviewers', 'approvalGuidelines', e.target.value)}
              className="w-full border border-dove-300 rounded px-3 py-2 h-32 font-mono text-sm"
            />
          </div>
        </div>
      )}

      {hasChanges && (
        <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
          ⚠️ You have unsaved changes
        </div>
      )}
    </div>
  );
}

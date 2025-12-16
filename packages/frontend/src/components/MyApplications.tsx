import { useState, useEffect } from 'react';

interface Application {
  id: string;
  referenceNumber: string;
  applicantName: string;
  applicantEmail: string;
  projectTitle: string;
  projectDescription: string;
  requestedAmount: number;
  status: string;
  submittedAt: string;
  feedbackComments?: string | null;
  feedbackRequestedAt?: string | null;
}

export function MyApplications() {
  const [emailFilter, setEmailFilter] = useState('');
  const [allApplications, setAllApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [editForm, setEditForm] = useState({ projectDescription: '' });

  // Load all applications on mount
  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/applications');
      const data = await response.json();
      if (data.success) {
        setAllApplications(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter applications by email (case-insensitive partial match)
  const filteredApplications = emailFilter.trim()
    ? allApplications.filter((app) =>
        app.applicantEmail.toLowerCase().includes(emailFilter.toLowerCase())
      )
    : allApplications;

  const handleRespond = (app: Application) => {
    setEditingApp(app);
    setEditForm({ projectDescription: app.projectDescription });
  };

  const handleSubmitResponse = async () => {
    if (!editingApp) return;

    try {
      const response = await fetch(`/api/applications/${editingApp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectDescription: editForm.projectDescription,
          status: 'submitted', // Reset to submitted after responding
        }),
      });

      if (response.ok) {
        // Refresh the list
        fetchApplications();
        setEditingApp(null);
      }
    } catch (error) {
      console.error('Failed to update application:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      feedback_requested: 'bg-yellow-100 text-yellow-700',
      submitted: 'bg-blue-100 text-blue-700',
      categorized: 'bg-purple-100 text-purple-700',
      under_review: 'bg-orange-100 text-orange-700',
    };
    return styles[status] || 'bg-dove-100 text-dove-700';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      feedback_requested: 'Feedback Requested',
      under_review: 'Under Review',
    };
    return labels[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-semibold mb-6">📋 My Applications</h2>

      {/* Email Filter */}
      <div className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            placeholder="Filter by email address..."
            className="flex-1 border border-dove-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-dove-500"
          />
          {emailFilter && (
            <button
              onClick={() => setEmailFilter('')}
              className="px-4 py-2 text-dove-500 hover:text-dove-700"
            >
              Clear
            </button>
          )}
        </div>
        <p className="text-sm text-dove-500 mt-1">
          {filteredApplications.length} of {allApplications.length} applications
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12 text-dove-500">
          <p>Loading applications...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredApplications.length === 0 && (
        <div className="text-center py-12 text-dove-500">
          {emailFilter ? (
            <>
              <p>No applications found matching "{emailFilter}"</p>
              <p className="text-sm mt-2">Try a different email or clear the filter.</p>
            </>
          ) : (
            <>
              <p>No applications yet.</p>
              <p className="text-sm mt-2">Submit a grant application to see it here.</p>
            </>
          )}
        </div>
      )}

      {!loading && filteredApplications.length > 0 && (
        <div className="space-y-4">
          {filteredApplications.map((app) => (
            <div key={app.id} className="bg-white rounded-lg shadow p-4 border border-dove-200">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{app.projectTitle}</h3>
                  <p className="text-sm text-dove-500 font-mono">{app.referenceNumber}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm ${getStatusBadge(app.status)}`}>
                  {getStatusLabel(app.status)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                <div>
                  <span className="text-dove-500">Requested Amount:</span>
                  <span className="ml-2 font-medium">${app.requestedAmount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-dove-500">Submitted:</span>
                  <span className="ml-2">{new Date(app.submittedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <p className="text-sm text-dove-600 mb-3 line-clamp-2">{app.projectDescription}</p>

              {/* Feedback Section */}
              {app.status === 'feedback_requested' && app.feedbackComments && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-3">
                  <h4 className="font-medium text-yellow-800 mb-2">📝 Feedback from Reviewer</h4>
                  <p className="text-sm text-yellow-700">{app.feedbackComments}</p>
                  {app.feedbackRequestedAt && (
                    <p className="text-xs text-yellow-600 mt-2">
                      Requested on {new Date(app.feedbackRequestedAt).toLocaleDateString()}
                    </p>
                  )}
                  <button
                    onClick={() => handleRespond(app)}
                    className="mt-3 bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 text-sm"
                  >
                    Respond to Feedback
                  </button>
                </div>
              )}

              {app.status === 'approved' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-green-700 text-sm">
                    🎉 Congratulations! Your application has been approved.
                  </p>
                </div>
              )}

              {app.status === 'rejected' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm">
                    Unfortunately, your application was not approved at this time.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Response Modal */}
      {editingApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold mb-2">Respond to Feedback</h3>
            <p className="text-sm text-dove-500 mb-4">
              Update your application based on the reviewer's feedback.
            </p>

            {editingApp.feedbackComments && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                <p className="text-sm text-yellow-700">{editingApp.feedbackComments}</p>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-dove-700 mb-1">
                Updated Project Description
              </label>
              <textarea
                value={editForm.projectDescription}
                onChange={(e) => setEditForm({ projectDescription: e.target.value })}
                className="w-full border border-dove-300 rounded-lg px-3 py-2 h-40 resize-none focus:outline-none focus:ring-2 focus:ring-dove-500"
                placeholder="Update your project description with the requested information..."
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSubmitResponse}
                className="flex-1 bg-dove-600 text-white py-2 rounded-lg hover:bg-dove-700"
              >
                Submit Response
              </button>
              <button
                onClick={() => setEditingApp(null)}
                className="flex-1 border border-dove-300 py-2 rounded-lg hover:bg-dove-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

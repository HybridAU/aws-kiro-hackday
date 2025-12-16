import { useState, useEffect, useRef } from 'react';

// Format large numbers compactly (e.g., $1.2M, $850K)
function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

interface Category {
  id: string;
  name: string;
  allocatedBudget: number;
  spentBudget: number;
}

interface CategoryStatus {
  category: Category;
  remaining: number;
  percentSpent: number;
  thresholdReached: boolean;
  pendingApplications: number;
}

interface BudgetStatus {
  totalBudget: number;
  totalAllocated: number;
  totalSpent: number;
  unallocated: number;
  categories: CategoryStatus[];
}

interface FileAttachment {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
}

interface Application {
  id: string;
  referenceNumber: string;
  applicantName: string;
  applicantEmail: string;
  projectTitle: string;
  projectDescription: string;
  requestedAmount: number;
  status: string;
  categoryId: string | null;
  categorizationConfidence: number | null;
  rankingScore: number | null;
  attachments?: FileAttachment[];
  feedbackComments?: string | null;
  feedbackRequestedAt?: string | null;
}

interface EditForm {
  applicantName: string;
  applicantEmail: string;
  projectTitle: string;
  projectDescription: string;
  requestedAmount: number;
}

export function AdminDashboard() {
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [filter, setFilter] = useState({ category: '', status: '' });
  const [loading, setLoading] = useState(true);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [viewingFiles, setViewingFiles] = useState<Application | null>(null);
  const [viewingApp, setViewingApp] = useState<Application | null>(null);
  const [previewFile, setPreviewFile] = useState<{ appId: string; file: FileAttachment } | null>(null);
  const [feedbackApp, setFeedbackApp] = useState<Application | null>(null);
  const [feedbackComments, setFeedbackComments] = useState('');
  const menuButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const fetchData = async () => {
    try {
      const [budgetRes, appsRes] = await Promise.all([
        fetch('/api/budget/status'),
        fetch('/api/applications'),
      ]);

      const budgetData = await budgetRes.json();
      const appsData = await appsRes.json();

      if (budgetData.success) setBudgetStatus(budgetData.data);
      if (appsData.success) setApplications(appsData.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (appId: string, action: 'approve' | 'reject' | 'request_feedback', reason?: string, comments?: string) => {
    try {
      const response = await fetch(`/api/applications/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason, comments, confirmOverBudget: true }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Action failed:', error);
    }
  };

  const handleRequestFeedback = async () => {
    if (!feedbackApp || !feedbackComments.trim()) return;
    await handleAction(feedbackApp.id, 'request_feedback', undefined, feedbackComments);
    setFeedbackApp(null);
    setFeedbackComments('');
  };

  const handleDelete = async (appId: string) => {
    if (!confirm('Are you sure you want to delete this application?')) return;
    try {
      const response = await fetch(`/api/applications/${appId}`, { method: 'DELETE' });
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
    setMenuOpen(null);
  };

  const handleEdit = (app: Application) => {
    setEditingApp(app);
    setEditForm({
      applicantName: app.applicantName,
      applicantEmail: app.applicantEmail || '',
      projectTitle: app.projectTitle,
      projectDescription: app.projectDescription || '',
      requestedAmount: app.requestedAmount,
    });
    setMenuOpen(null);
  };

  const handleSaveEdit = async () => {
    if (!editingApp || !editForm) return;
    try {
      const response = await fetch(`/api/applications/${editingApp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (response.ok) {
        fetchData();
        setEditingApp(null);
        setEditForm(null);
      }
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  const handleRankCategory = async (categoryId: string) => {
    try {
      await fetch(`/api/applications/rank/${categoryId}`, { method: 'POST' });
      fetchData();
    } catch (error) {
      console.error('Ranking failed:', error);
    }
  };

  const filteredApps = applications.filter((app) => {
    if (filter.category && app.categoryId !== filter.category) return false;
    if (filter.status && app.status !== filter.status) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-dove-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold">📊 Admin Dashboard</h2>

      {/* Budget Overview */}
      {budgetStatus && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm text-dove-500">Total Budget</h3>
            <p className="text-2xl font-bold">{formatCurrency(budgetStatus.totalBudget)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm text-dove-500">Allocated</h3>
            <p className="text-2xl font-bold">{formatCurrency(budgetStatus.totalAllocated)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm text-dove-500">Disbursed</h3>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(budgetStatus.totalSpent)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm text-dove-500">Applications</h3>
            <p className="text-2xl font-bold">{applications.length}</p>
          </div>
        </div>
      )}

      {/* Category Cards */}
      {budgetStatus && (
        <div className="grid grid-cols-3 gap-4">
          {budgetStatus.categories.map((cat) => (
            <div
              key={cat.category.id}
              onClick={() => setFilter({ 
                ...filter, 
                category: filter.category === cat.category.id ? '' : cat.category.id 
              })}
              className={`bg-white p-4 rounded-lg shadow cursor-pointer transition-all ${
                filter.category === cat.category.id 
                  ? 'ring-2 ring-dove-500 bg-dove-50' 
                  : 'hover:shadow-md'
              } ${cat.thresholdReached ? 'border-2 border-yellow-400' : ''}`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">{cat.category.name}</h3>
                <div className="flex items-center gap-1">
                  {filter.category === cat.category.id && (
                    <span className="text-dove-500 text-xs">✓ filtered</span>
                  )}
                  {cat.thresholdReached && <span className="text-yellow-500">⚠️</span>}
                </div>
              </div>
              <div className="text-sm text-dove-500 mb-2">
                {formatCurrency(cat.category.spentBudget)} / {formatCurrency(cat.category.allocatedBudget)}
              </div>
              <div className="w-full bg-dove-200 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full ${
                    cat.thresholdReached ? 'bg-yellow-500' : 'bg-dove-600'
                  }`}
                  style={{ width: `${Math.min(100, cat.percentSpent)}%` }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span>{cat.pendingApplications} pending</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleRankCategory(cat.category.id); }}
                  className="text-dove-600 hover:underline"
                >
                  Rank
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={filter.category}
          onChange={(e) => setFilter({ ...filter, category: e.target.value })}
          className="border border-dove-300 rounded px-3 py-2"
        >
          <option value="">All Categories</option>
          {budgetStatus?.categories.map((cat) => (
            <option key={cat.category.id} value={cat.category.id}>
              {cat.category.name}
            </option>
          ))}
        </select>
        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          className="border border-dove-300 rounded px-3 py-2"
        >
          <option value="">All Statuses</option>
          <option value="submitted">Submitted</option>
          <option value="categorized">Categorized</option>
          <option value="under_review">Under Review</option>
          <option value="feedback_requested">Feedback Requested</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-lg shadow overflow-visible">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-dove-100">
            <tr>
              <th className="px-3 py-2 text-left text-sm">Reference</th>
              <th className="px-3 py-2 text-left text-sm">Applicant</th>
              <th className="px-3 py-2 text-left text-sm">Project</th>
              <th className="px-3 py-2 text-right text-sm">Amount</th>
              <th className="px-3 py-2 text-center text-sm">Status</th>
              <th className="px-3 py-2 text-center text-sm">Score</th>
              <th className="px-3 py-2 text-center text-sm min-w-[120px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredApps.map((app) => (
              <tr 
                key={app.id} 
                className="border-t border-dove-100 hover:bg-dove-50 cursor-pointer"
                onClick={() => setViewingApp(app)}
              >
                <td className="px-3 py-2 font-mono text-xs">{app.referenceNumber}</td>
                <td className="px-3 py-2 text-sm truncate max-w-[120px]">{app.applicantName}</td>
                <td className="px-3 py-2 text-sm truncate max-w-[150px]">{app.projectTitle}</td>
                <td className="px-3 py-2 text-right text-sm">{formatCurrency(app.requestedAmount)}</td>
                <td className="px-3 py-2 text-center">
                  <span
                    className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
                      app.status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : app.status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : app.status === 'feedback_requested'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-dove-100 text-dove-700'
                    }`}
                  >
                    {app.status === 'feedback_requested' ? 'feedback' : app.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-center text-sm">
                  {app.rankingScore !== null ? app.rankingScore.toFixed(1) : '-'}
                </td>
                <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1 justify-center items-center">
                    {app.status !== 'approved' && app.status !== 'rejected' && (
                      <>
                        <button
                          onClick={() => handleAction(app.id, 'approve')}
                          className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                          title="Approve"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => handleAction(app.id, 'reject')}
                          className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                          title="Reject"
                        >
                          ✗
                        </button>
                        <button
                          onClick={() => { setFeedbackApp(app); setFeedbackComments(''); }}
                          className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600"
                          title="Request Feedback"
                        >
                          💬
                        </button>
                      </>
                    )}
                    {/* Menu button */}
                    <button
                      ref={(el) => { if (el) menuButtonRefs.current.set(app.id, el); }}
                      onClick={(e) => {
                        if (menuOpen === app.id) {
                          setMenuOpen(null);
                        } else {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMenuPos({ top: rect.bottom + 4, left: rect.right - 120 });
                          setMenuOpen(app.id);
                        }
                      }}
                      className="text-dove-500 hover:text-dove-700 px-2 py-1 border border-dove-200 rounded"
                    >
                      ⋮
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredApps.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-dove-500">
                  No applications found
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Dropdown Menu Overlay */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
          <div 
            className="fixed z-50 bg-white border border-dove-200 rounded shadow-lg min-w-[120px]"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            {(() => {
              const app = applications.find(a => a.id === menuOpen);
              if (!app) return null;
              return (
                <>
                  <button
                    onClick={() => handleEdit(app)}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-dove-50"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => { setViewingFiles(app); setMenuOpen(null); }}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-dove-50"
                  >
                    📎 Files {app.attachments?.length ? `(${app.attachments.length})` : ''}
                  </button>
                  <button
                    onClick={() => handleDelete(app.id)}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    🗑️ Delete
                  </button>
                </>
              );
            })()}
          </div>
        </>
      )}

      {/* Edit Modal */}
      {editingApp && editForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Application</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-dove-600 mb-1">Applicant Name</label>
                <input
                  type="text"
                  value={editForm.applicantName}
                  onChange={(e) => setEditForm({ ...editForm, applicantName: e.target.value })}
                  className="w-full border border-dove-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-dove-600 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.applicantEmail}
                  onChange={(e) => setEditForm({ ...editForm, applicantEmail: e.target.value })}
                  className="w-full border border-dove-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-dove-600 mb-1">Project Title</label>
                <input
                  type="text"
                  value={editForm.projectTitle}
                  onChange={(e) => setEditForm({ ...editForm, projectTitle: e.target.value })}
                  className="w-full border border-dove-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-dove-600 mb-1">Description</label>
                <textarea
                  value={editForm.projectDescription}
                  onChange={(e) => setEditForm({ ...editForm, projectDescription: e.target.value })}
                  className="w-full border border-dove-300 rounded px-3 py-2"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm text-dove-600 mb-1">Requested Amount ($)</label>
                <input
                  type="number"
                  value={editForm.requestedAmount}
                  onChange={(e) => setEditForm({ ...editForm, requestedAmount: Number(e.target.value) })}
                  className="w-full border border-dove-300 rounded px-3 py-2"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSaveEdit}
                className="flex-1 bg-dove-600 text-white py-2 rounded hover:bg-dove-700"
              >
                Save
              </button>
              <button
                onClick={() => { setEditingApp(null); setEditForm(null); }}
                className="flex-1 border border-dove-300 py-2 rounded hover:bg-dove-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Files Modal */}
      {viewingFiles && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              📎 Files - {viewingFiles.projectTitle}
            </h3>
            {viewingFiles.attachments && viewingFiles.attachments.length > 0 ? (
              <div className="space-y-2">
                {viewingFiles.attachments.map((file) => (
                  <div key={file.id} className="flex items-center justify-between bg-dove-50 rounded px-3 py-2">
                    <div className="truncate flex-1">
                      <span className="text-sm">{file.originalName}</span>
                      <span className="text-xs text-dove-500 ml-2">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {(file.mimeType.startsWith('image/') || file.mimeType === 'application/pdf') && (
                        <button
                          onClick={() => setPreviewFile({ appId: viewingFiles.id, file })}
                          className="text-dove-600 hover:text-dove-800 text-sm"
                        >
                          👁️
                        </button>
                      )}
                      <a
                        href={`/api/applications/${viewingFiles.id}/files/${file.id}`}
                        download={file.originalName}
                        className="text-dove-600 hover:text-dove-800 text-sm"
                      >
                        ⬇️
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-dove-500 text-center py-4">No files attached</p>
            )}
            <button
              onClick={() => setViewingFiles(null)}
              className="w-full mt-4 border border-dove-300 py-2 rounded hover:bg-dove-50"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Application Detail Modal */}
      {viewingApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{viewingApp.projectTitle}</h3>
                <p className="text-sm text-dove-500 font-mono">{viewingApp.referenceNumber}</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${
                viewingApp.status === 'approved' ? 'bg-green-100 text-green-700' :
                viewingApp.status === 'rejected' ? 'bg-red-100 text-red-700' :
                'bg-dove-100 text-dove-700'
              }`}>
                {viewingApp.status}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-dove-500">Applicant</label>
                <p className="font-medium">{viewingApp.applicantName}</p>
              </div>
              <div>
                <label className="text-xs text-dove-500">Email</label>
                <p className="font-medium">{viewingApp.applicantEmail}</p>
              </div>
              <div>
                <label className="text-xs text-dove-500">Requested Amount</label>
                <p className="font-medium text-lg">{formatCurrency(viewingApp.requestedAmount)}</p>
              </div>
              <div>
                <label className="text-xs text-dove-500">Score</label>
                <p className="font-medium">{viewingApp.rankingScore?.toFixed(1) ?? '-'}</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs text-dove-500">Description</label>
              <p className="text-sm bg-dove-50 rounded p-3 mt-1">{viewingApp.projectDescription}</p>
            </div>

            {/* Feedback Comments */}
            {viewingApp.feedbackComments && (
              <div className="mb-4">
                <label className="text-xs text-dove-500">Feedback Requested</label>
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-1">
                  <p className="text-sm text-yellow-800">{viewingApp.feedbackComments}</p>
                  {viewingApp.feedbackRequestedAt && (
                    <p className="text-xs text-yellow-600 mt-2">
                      Requested on {new Date(viewingApp.feedbackRequestedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Attachments */}
            {viewingApp.attachments && viewingApp.attachments.length > 0 && (
              <div className="mb-4">
                <label className="text-xs text-dove-500">Attachments ({viewingApp.attachments.length})</label>
                <div className="mt-1 space-y-1">
                  {viewingApp.attachments.map((file) => (
                    <div key={file.id} className="flex items-center justify-between bg-dove-50 rounded px-3 py-2">
                      <span className="text-sm truncate">{file.originalName}</span>
                      <div className="flex gap-2">
                        {(file.mimeType.startsWith('image/') || file.mimeType === 'application/pdf') && (
                          <button
                            onClick={() => setPreviewFile({ appId: viewingApp.id, file })}
                            className="text-dove-600 hover:text-dove-800 text-sm"
                          >
                            👁️ Preview
                          </button>
                        )}
                        <a
                          href={`/api/applications/${viewingApp.id}/files/${file.id}`}
                          download={file.originalName}
                          className="text-dove-600 hover:text-dove-800 text-sm"
                        >
                          ⬇️ Download
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {viewingApp.status !== 'approved' && viewingApp.status !== 'rejected' && (
                <>
                  <button
                    onClick={() => { handleAction(viewingApp.id, 'approve'); setViewingApp(null); }}
                    className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => { handleAction(viewingApp.id, 'reject'); setViewingApp(null); }}
                    className="flex-1 bg-red-500 text-white py-2 rounded hover:bg-red-600"
                  >
                    ✗ Reject
                  </button>
                  <button
                    onClick={() => { setFeedbackApp(viewingApp); setFeedbackComments(''); setViewingApp(null); }}
                    className="flex-1 bg-yellow-500 text-white py-2 rounded hover:bg-yellow-600"
                  >
                    💬 Feedback
                  </button>
                </>
              )}
              <button
                onClick={() => setViewingApp(null)}
                className="flex-1 border border-dove-300 py-2 rounded hover:bg-dove-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl p-4 w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">{previewFile.file.originalName}</h3>
              <button
                onClick={() => setPreviewFile(null)}
                className="text-dove-500 hover:text-dove-700 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-dove-100 rounded flex items-center justify-center min-h-[400px]">
              {previewFile.file.mimeType.startsWith('image/') ? (
                <img
                  src={`/api/applications/${previewFile.appId}/files/${previewFile.file.id}`}
                  alt={previewFile.file.originalName}
                  className="max-w-full max-h-full object-contain"
                />
              ) : previewFile.file.mimeType === 'application/pdf' ? (
                <iframe
                  src={`/api/applications/${previewFile.appId}/files/${previewFile.file.id}`}
                  className="w-full h-full min-h-[500px]"
                  title={previewFile.file.originalName}
                />
              ) : (
                <p className="text-dove-500">Preview not available</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Request Feedback Modal */}
      {feedbackApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">💬 Request Feedback</h3>
            <p className="text-sm text-dove-500 mb-4">
              Send comments to <span className="font-medium">{feedbackApp.applicantName}</span> for "{feedbackApp.projectTitle}"
            </p>
            <div className="mb-4">
              <label className="block text-sm text-dove-600 mb-1">Comments for Applicant</label>
              <textarea
                value={feedbackComments}
                onChange={(e) => setFeedbackComments(e.target.value)}
                placeholder="Please provide more details about your budget breakdown..."
                className="w-full border border-dove-300 rounded px-3 py-2 h-32 resize-none"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRequestFeedback}
                disabled={!feedbackComments.trim()}
                className="flex-1 bg-yellow-500 text-white py-2 rounded hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send Feedback Request
              </button>
              <button
                onClick={() => { setFeedbackApp(null); setFeedbackComments(''); }}
                className="flex-1 border border-dove-300 py-2 rounded hover:bg-dove-50"
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

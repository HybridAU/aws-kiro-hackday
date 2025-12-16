import { useState, useEffect } from 'react';

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

interface Application {
  id: string;
  referenceNumber: string;
  applicantName: string;
  projectTitle: string;
  requestedAmount: number;
  status: string;
  categoryId: string | null;
  categorizationConfidence: number | null;
  rankingScore: number | null;
}

export function AdminDashboard() {
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [_selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [filter, setFilter] = useState({ category: '', status: '' });
  const [loading, setLoading] = useState(true);

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

  const handleAction = async (appId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      const response = await fetch(`/api/applications/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason, confirmOverBudget: true }),
      });

      if (response.ok) {
        fetchData();
        setSelectedApp(null);
      }
    } catch (error) {
      console.error('Action failed:', error);
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
            <p className="text-2xl font-bold">${budgetStatus.totalBudget.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm text-dove-500">Allocated</h3>
            <p className="text-2xl font-bold">${budgetStatus.totalAllocated.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm text-dove-500">Spent</h3>
            <p className="text-2xl font-bold text-green-600">
              ${budgetStatus.totalSpent.toLocaleString()}
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
              className={`bg-white p-4 rounded-lg shadow ${
                cat.thresholdReached ? 'border-2 border-yellow-400' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">{cat.category.name}</h3>
                {cat.thresholdReached && <span className="text-yellow-500">⚠️</span>}
              </div>
              <div className="text-sm text-dove-500 mb-2">
                ${cat.category.spentBudget.toLocaleString()} / $
                {cat.category.allocatedBudget.toLocaleString()}
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
                  onClick={() => handleRankCategory(cat.category.id)}
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
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
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
              <tr key={app.id} className="border-t border-dove-100 hover:bg-dove-50">
                <td className="px-3 py-2 font-mono text-xs">{app.referenceNumber}</td>
                <td className="px-3 py-2 text-sm truncate max-w-[120px]">{app.applicantName}</td>
                <td className="px-3 py-2 text-sm truncate max-w-[150px]">{app.projectTitle}</td>
                <td className="px-3 py-2 text-right text-sm">${app.requestedAmount.toLocaleString()}</td>
                <td className="px-3 py-2 text-center">
                  <span
                    className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
                      app.status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : app.status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-dove-100 text-dove-700'
                    }`}
                  >
                    {app.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-center text-sm">
                  {app.rankingScore !== null ? app.rankingScore.toFixed(1) : '-'}
                </td>
                <td className="px-3 py-2 text-center">
                  {app.status !== 'approved' && app.status !== 'rejected' ? (
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={() => handleAction(app.id, 'approve')}
                        className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => handleAction(app.id, 'reject')}
                        className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                      >
                        ✗
                      </button>
                    </div>
                  ) : (
                    <span className="text-dove-400 text-xs">Done</span>
                  )}
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
  );
}

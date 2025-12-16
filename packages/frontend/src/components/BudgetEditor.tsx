import { useState, useEffect } from 'react';

interface Category {
  id: string;
  name: string;
  allocatedBudget: number;
  spentBudget: number;
}

interface BudgetConfig {
  fiscalYear: number;
  totalBudget: number;
  categories: Category[];
  createdAt: Date;
  updatedAt: Date;
}

interface BudgetEditorProps {
  onClose: () => void;
}

export function BudgetEditor({ onClose }: BudgetEditorProps) {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [budgetData, setBudgetData] = useState<BudgetConfig | null>(null);
  const [originalData, setOriginalData] = useState<BudgetConfig | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load budget data for selected year
  useEffect(() => {
    const loadBudgetData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/budget/config/${selectedYear}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setBudgetData(data.data);
            setOriginalData(JSON.parse(JSON.stringify(data.data)));
          }
        } else if (response.status === 404) {
          // No budget data for this year, initialize with current categories
          try {
            const categoriesResponse = await fetch('/api/budget/categories');
            let categories: Category[] = [];
            
            if (categoriesResponse.ok) {
              const categoriesData = await categoriesResponse.json();
              if (categoriesData.success) {
                // Reset allocated and spent budgets for new year
                categories = categoriesData.data.map((cat: Category) => ({
                  ...cat,
                  allocatedBudget: 0,
                  spentBudget: 0
                }));
              }
            }

            const defaultBudget: BudgetConfig = {
              fiscalYear: selectedYear,
              totalBudget: 0,
              categories,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            setBudgetData(defaultBudget);
            setOriginalData(JSON.parse(JSON.stringify(defaultBudget)));
          } catch (categoryError) {
            console.error('Failed to load categories for new year:', categoryError);
            // Fallback to empty budget
            const defaultBudget: BudgetConfig = {
              fiscalYear: selectedYear,
              totalBudget: 0,
              categories: [],
              createdAt: new Date(),
              updatedAt: new Date()
            };
            setBudgetData(defaultBudget);
            setOriginalData(JSON.parse(JSON.stringify(defaultBudget)));
          }
        }
      } catch (error) {
        console.error('Failed to load budget data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBudgetData();
  }, [selectedYear]);

  // Add browser navigation warning for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle unsaved changes confirmation
  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to close without saving?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Handle year change with unsaved changes confirmation
  const handleYearChange = (newYear: number) => {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to switch years without saving?')) {
        setSelectedYear(newYear);
        setHasUnsavedChanges(false);
      }
    } else {
      setSelectedYear(newYear);
    }
  };

  // Handle save operation
  const handleSave = async () => {
    if (!budgetData) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/budget/config/${selectedYear}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(budgetData),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setOriginalData(JSON.parse(JSON.stringify(budgetData)));
          setHasUnsavedChanges(false);
          // Show success feedback
          alert('Budget saved successfully!');
        }
      } else {
        throw new Error('Failed to save budget');
      }
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save budget. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel operation
  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
        setBudgetData(originalData ? JSON.parse(JSON.stringify(originalData)) : null);
        setHasUnsavedChanges(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-dove-500">Loading budget data...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with navigation */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={handleClose}
            className="text-dove-600 hover:text-dove-800 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
          <h2 className="text-lg font-semibold">💰 Budget Editor</h2>
        </div>
        
        {/* Year Selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-dove-600">Fiscal Year:</label>
          <select
            value={selectedYear}
            onChange={(e) => handleYearChange(Number(e.target.value))}
            className="border border-dove-300 rounded px-3 py-1"
          >
            {/* Generate year options */}
            {Array.from({ length: 10 }, (_, i) => {
              const year = new Date().getFullYear() - 2 + i;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Budget Form */}
      {budgetData && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-md font-semibold mb-4">Budget Configuration for {selectedYear}</h3>
          
          {/* Total Budget */}
          <div className="mb-6">
            <label className="block text-sm text-dove-600 mb-2">Total Budget</label>
            <div className="flex items-center gap-2">
              <span className="text-lg">$</span>
              <input
                type="number"
                value={budgetData.totalBudget}
                onChange={(e) => {
                  const newValue = Number(e.target.value);
                  setBudgetData({ ...budgetData, totalBudget: newValue });
                  setHasUnsavedChanges(true);
                }}
                className="border border-dove-300 rounded px-3 py-2 text-lg font-semibold w-48"
                min="0"
                step="1000"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-dove-600 mb-3">Category Allocations</h4>
            {budgetData.categories.length > 0 ? (
              <div className="space-y-3">
                {budgetData.categories.map((category, index) => (
                  <div key={category.id} className="flex items-center gap-4 p-3 bg-dove-50 rounded">
                    <div className="flex-1">
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>$</span>
                      <input
                        type="number"
                        value={category.allocatedBudget}
                        onChange={(e) => {
                          const newValue = Number(e.target.value);
                          const updatedCategories = [...budgetData.categories];
                          updatedCategories[index] = { ...category, allocatedBudget: newValue };
                          setBudgetData({ ...budgetData, categories: updatedCategories });
                          setHasUnsavedChanges(true);
                        }}
                        className="border border-dove-300 rounded px-3 py-1 w-32"
                        min="0"
                      />
                    </div>
                    <div className="text-sm text-dove-500">
                      Spent: ${category.spentBudget.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-dove-500 text-center py-4">
                No categories configured. Categories will be loaded from the current budget configuration.
              </div>
            )}
          </div>

          {/* Budget Summary */}
          {budgetData.categories.length > 0 && (
            <div className="bg-dove-100 rounded p-4 mb-6">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-dove-600">Total Allocated:</span>
                  <div className="font-semibold">
                    ${budgetData.categories.reduce((sum, cat) => sum + cat.allocatedBudget, 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-dove-600">Total Spent:</span>
                  <div className="font-semibold">
                    ${budgetData.categories.reduce((sum, cat) => sum + cat.spentBudget, 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-dove-600">Unallocated:</span>
                  <div className="font-semibold">
                    ${(budgetData.totalBudget - budgetData.categories.reduce((sum, cat) => sum + cat.allocatedBudget, 0)).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isSaving}
              className="bg-dove-600 text-white px-6 py-2 rounded hover:bg-dove-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={handleCancel}
              disabled={!hasUnsavedChanges}
              className="border border-dove-300 px-6 py-2 rounded hover:bg-dove-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>

          {/* Unsaved changes indicator */}
          {hasUnsavedChanges && (
            <div className="mt-4 text-sm text-yellow-600 bg-yellow-50 border border-yellow-200 rounded p-2">
              ⚠️ You have unsaved changes
            </div>
          )}
        </div>
      )}
    </div>
  );
}
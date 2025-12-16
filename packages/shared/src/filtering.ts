import type { Application, ApplicationFilters, ApplicationStatus } from './types';

export function filterApplications(
  applications: Application[],
  filters: ApplicationFilters
): Application[] {
  return applications.filter((app) => {
    // Filter by category
    if (filters.categoryId && app.categoryId !== filters.categoryId) {
      return false;
    }

    // Filter by status
    if (filters.status && app.status !== filters.status) {
      return false;
    }

    // Filter by date range
    if (filters.startDate && app.submittedAt < filters.startDate) {
      return false;
    }
    if (filters.endDate && app.submittedAt > filters.endDate) {
      return false;
    }

    // Filter by search term (searches title and description)
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      const matchesTitle = app.projectTitle.toLowerCase().includes(term);
      const matchesDescription = app.projectDescription.toLowerCase().includes(term);
      const matchesName = app.applicantName.toLowerCase().includes(term);
      if (!matchesTitle && !matchesDescription && !matchesName) {
        return false;
      }
    }

    return true;
  });
}

export function matchesFilter(app: Application, filters: ApplicationFilters): boolean {
  return filterApplications([app], filters).length === 1;
}

export function getApplicationsByStatus(
  applications: Application[],
  status: ApplicationStatus
): Application[] {
  return filterApplications(applications, { status });
}

export function getApplicationsByCategory(
  applications: Application[],
  categoryId: string
): Application[] {
  return filterApplications(applications, { categoryId });
}

export function getPendingApplications(applications: Application[]): Application[] {
  return applications.filter(
    (app) => app.status === 'submitted' || app.status === 'categorized' || app.status === 'under_review'
  );
}

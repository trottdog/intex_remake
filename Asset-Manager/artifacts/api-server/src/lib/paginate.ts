export function paginate(total: number, page: number, limit: number) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export function pageResponse<T>(data: T[], total: number, page: number, limit: number) {
  return {
    data,
    total,
    pagination: paginate(total, page, limit),
  };
}

export function resolveLimit(limit?: string, pageSize?: string, defaultLimit = 20): number {
  const ps = pageSize ? parseInt(pageSize) : NaN;
  const l = limit ? parseInt(limit) : NaN;
  const resolved = !isNaN(ps) ? ps : !isNaN(l) ? l : defaultLimit;
  return Math.min(Math.max(resolved, 1), 100);
}

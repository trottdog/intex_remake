import { useSearch, useLocation } from "wouter";

export function useQueryPagination(options?: { pageParam?: string; pageSizeParam?: string; defaultPageSize?: number }) {
  const { pageParam = "page", pageSizeParam = "pageSize", defaultPageSize = 20 } = options ?? {};
  const search = useSearch();
  const [, navigate] = useLocation();

  const params = new URLSearchParams(search);
  const page = Math.max(1, parseInt(params.get(pageParam) ?? "1", 10) || 1);
  const pageSize = Math.max(1, parseInt(params.get(pageSizeParam) ?? String(defaultPageSize), 10) || defaultPageSize);

  function setPage(newPage: number) {
    const next = new URLSearchParams(params);
    next.set(pageParam, String(newPage));
    navigate(`?${next.toString()}`, { replace: true });
  }

  function setPageSize(newSize: number) {
    const next = new URLSearchParams(params);
    next.set(pageSizeParam, String(newSize));
    next.set(pageParam, "1");
    navigate(`?${next.toString()}`, { replace: true });
  }

  return { page, pageSize, setPage, setPageSize };
}

export type WebPaginationRequest = {
  page?: number;
  size?: number;
};

export type WebPagination = {
  page: number;
  size: number;
};

export type WebPage<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

export function normalizeWebPagination(
  pagination?: WebPaginationRequest,
  options: {
    defaultSize?: number;
    maxSize?: number;
  } = {},
): WebPagination {
  const defaultSize = options.defaultSize ?? 20;
  const maxSize = options.maxSize ?? 100;
  const requestedPage = pagination?.page ?? 0;
  const requestedSize = pagination?.size ?? defaultSize;
  return {
    page: Number.isFinite(requestedPage) && requestedPage >= 0 ? Math.trunc(requestedPage) : 0,
    size: Number.isFinite(requestedSize) && requestedSize > 0 ? Math.min(Math.trunc(requestedSize), maxSize) : defaultSize,
  };
}

export function paginateWebItems<T>(
  items: readonly T[],
  pagination?: WebPaginationRequest,
  options?: {
    defaultSize?: number;
    maxSize?: number;
  },
): WebPage<T> {
  const { page, size } = normalizeWebPagination(pagination, options);
  const totalElements = items.length;
  const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / size);
  const resolvedPage = totalPages === 0 ? 0 : Math.min(page, totalPages - 1);
  const startIndex = resolvedPage * size;
  const content = items.slice(startIndex, startIndex + size);
  return {
    content: [...content],
    page: resolvedPage,
    size,
    totalElements,
    totalPages,
    hasNext: totalPages > 0 && resolvedPage + 1 < totalPages,
    hasPrevious: resolvedPage > 0,
  };
}

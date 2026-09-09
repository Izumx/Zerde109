import {
  keepPreviousData,
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import type {
  Appeal,
  AppealListItem,
  AppealStatus,
  ClassifyResult,
  Language,
  ModelEval,
  Paginated,
  Priority,
  RangeFilter,
} from "@zerde/types";
import { apiGet, apiPost, type ApiError } from "@/lib/api";

export type QueueParams = RangeFilter & {
  status?: AppealStatus;
  priority?: Priority;
  search?: string;
  sort: "created_desc" | "created_asc";
  page: number;
  pageSize: number;
};

export function useAppeals(p: QueueParams): UseQueryResult<Paginated<AppealListItem>> {
  return useQuery({
    queryKey: ["intake", "appeals", p],
    queryFn: () =>
      apiGet<Paginated<AppealListItem>>("/appeals", {
        region: p.region,
        theme: p.theme,
        from: p.from,
        to: p.to,
        status: p.status,
        priority: p.priority,
        search: p.search,
        sort: p.sort,
        page: p.page,
        pageSize: p.pageSize,
      }),
    placeholderData: keepPreviousData,
  });
}

export function useAppeal(id: string | undefined): UseQueryResult<Appeal> {
  return useQuery({
    queryKey: ["intake", "appeal", id],
    queryFn: () => apiGet<Appeal>(`/appeals/${encodeURIComponent(id!)}`),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useClassify(): UseMutationResult<
  ClassifyResult,
  ApiError,
  { text: string; language?: Language }
> {
  return useMutation({
    mutationFn: (vars) => apiPost<ClassifyResult>("/classify", vars),
  });
}

export function useModelEval(): UseQueryResult<ModelEval> {
  return useQuery({
    queryKey: ["intake", "model-eval"],
    queryFn: () => apiGet<ModelEval>("/model-eval"),
    retry: false,
  });
}

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import type {
  AppealListItem,
  DuplicateInfo,
  Paginated,
  SimilarAppeal,
  Template,
  ThemeCode,
} from "@zerde/types";
import { apiGet, apiPost, type ApiError } from "@/lib/api";
import { useFilters } from "@/lib/useFilters";
import { useAppeals } from "@/features/intake/api";

/** Открытые обращения по выбранному региону (реального «назначения» нет). */
export function useAssigned(): UseQueryResult<Paginated<AppealListItem>> {
  const { filters } = useFilters();
  return useAppeals({
    ...filters,
    status: undefined,
    sort: "created_desc",
    page: 1,
    pageSize: 25,
  });
}

export function useSimilar(id: string | undefined): UseQueryResult<SimilarAppeal[]> {
  return useQuery({
    queryKey: ["operator", "similar", id],
    queryFn: () => apiGet<SimilarAppeal[]>(`/appeals/${encodeURIComponent(id!)}/similar`),
    enabled: Boolean(id),
  });
}

export function useDuplicates(id: string | undefined): UseQueryResult<DuplicateInfo> {
  return useQuery({
    queryKey: ["operator", "duplicates", id],
    queryFn: () => apiGet<DuplicateInfo>(`/appeals/${encodeURIComponent(id!)}/duplicates`),
    enabled: Boolean(id),
  });
}

export function useTemplates(
  theme: ThemeCode | undefined,
  service?: string,
): UseQueryResult<Template[]> {
  return useQuery({
    queryKey: ["operator", "templates", theme, service],
    queryFn: () => apiGet<Template[]>("/templates", { theme, service }),
    enabled: Boolean(theme),
  });
}

export type RouteVars = {
  kind: "route" | "draft" | "mark_duplicate";
  payload: Record<string, unknown>;
};

export function useRoute(id: string): UseMutationResult<{ id: number }, ApiError, RouteVars> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: RouteVars) =>
      apiPost<{ id: number }>(`/appeals/${encodeURIComponent(id)}/route`, vars),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["intake", "appeal", id] }),
  });
}

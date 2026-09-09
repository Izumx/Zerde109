import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { Meta } from "@zerde/types";
import { apiGet } from "./api";

export function useMeta(): UseQueryResult<Meta> {
  return useQuery({ queryKey: ["meta"], queryFn: () => apiGet<Meta>("/meta") });
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/** Опции регионов для Select: активные первыми, неактивные — disabled. */
export function useRegionOptions(): SelectOption[] {
  const { data } = useMeta();
  if (!data) return [];
  return data.regions.map((r) => ({
    value: r.code,
    label: r.nameRu,
    disabled: !r.isActive,
  }));
}

/** Опции тем для Select (отсортированы по meta.sort). */
export function useThemeOptions(): SelectOption[] {
  const { data } = useMeta();
  if (!data) return [];
  return data.themes.map((t) => ({ value: t.code, label: t.nameRu }));
}

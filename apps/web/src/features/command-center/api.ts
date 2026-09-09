import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import type {
  BreakdownDim,
  BreakdownRow,
  ForecastResponse,
  Granularity,
  Kpi,
  NlQueryResult,
  RangeFilter,
  SpikeRow,
  ThemeCode,
  TimeseriesResponse,
} from "@zerde/types";
import { apiGet, apiPost, apiPostBlob, ApiError } from "@/lib/api";
import { useFilters } from "@/lib/useFilters";

export function rangeParams(f: RangeFilter): Record<string, string | undefined> {
  return { region: f.region, theme: f.theme, from: f.from, to: f.to };
}

export function useKpi(): UseQueryResult<Kpi> {
  const { filters } = useFilters();
  return useQuery({
    queryKey: ["cc", "kpi", filters],
    queryFn: () => apiGet<Kpi>("/kpi", rangeParams(filters)),
  });
}

export function useTimeseries(granularity: Granularity): UseQueryResult<TimeseriesResponse> {
  const { filters } = useFilters();
  return useQuery({
    queryKey: ["cc", "timeseries", filters, granularity],
    queryFn: () =>
      apiGet<TimeseriesResponse>("/timeseries", { ...rangeParams(filters), granularity }),
  });
}

export function useBreakdown(dim: BreakdownDim): UseQueryResult<BreakdownRow[]> {
  const { filters } = useFilters();
  return useQuery({
    queryKey: ["cc", "breakdown", filters, dim],
    queryFn: () => apiGet<BreakdownRow[]>("/breakdown", { ...rangeParams(filters), dim }),
  });
}

export function useSpikes(): UseQueryResult<SpikeRow[]> {
  const { filters } = useFilters();
  return useQuery({
    queryKey: ["cc", "spikes", filters],
    queryFn: () => apiGet<SpikeRow[]>("/spikes", rangeParams(filters)),
  });
}

export function useForecast(
  region: string | undefined,
  theme: ThemeCode | undefined,
): UseQueryResult<ForecastResponse> {
  return useQuery({
    queryKey: ["cc", "forecast", region, theme],
    queryFn: () => apiGet<ForecastResponse>("/forecast", { region, theme }),
    enabled: Boolean(region && theme),
  });
}

export function useNlQuery(): UseMutationResult<NlQueryResult, ApiError, string> {
  return useMutation({
    mutationFn: (q: string) => apiPost<NlQueryResult>("/nl-query", { q }),
  });
}

export async function downloadReport(
  view: "overview" | "regions" | "themes",
  format: "xlsx" | "pdf",
  filters: RangeFilter,
): Promise<void> {
  const blob = await apiPostBlob("/report", { view, format, filters });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `zerde-${view}-${new Date().toISOString().slice(0, 10)}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

import type { Options } from "csv-parse";
import type { RegionMapper } from "./types";
import { akmolaMapper } from "./akmola";
import { almatyMapper } from "./almaty";
import { eastKazakhstanMapper } from "./eastKazakhstan";
import { karagandaMapper } from "./karaganda";
import { kostanayMapper } from "./kostanay";
import { turkestanMapper } from "./turkestan";
import { pavlodarMapper } from "./pavlodar";

export interface RegionConfig {
  mapper: RegionMapper;
  /** Точные ASCII-имена файлов внутри `DATA_DIR` (см. scripts/prepare-data.ts). */
  files: string[];
  csv: Options;
}

const BASE_CSV: Options = { columns: true, skip_empty_lines: true, bom: true, trim: false };
const LENIENT_CSV: Options = { ...BASE_CSV, relax_column_count: true, relax_quotes: true };

export const REGION_MAPPERS: Record<string, RegionConfig> = {
  akmola: { mapper: akmolaMapper, files: ["akmola.csv"], csv: LENIENT_CSV },
  almaty: { mapper: almatyMapper, files: ["almaty.csv"], csv: LENIENT_CSV },
  "east-kazakhstan": {
    mapper: eastKazakhstanMapper,
    files: ["east-kazakhstan.csv"],
    csv: LENIENT_CSV,
  },
  karaganda: { mapper: karagandaMapper, files: ["karaganda.csv"], csv: LENIENT_CSV },
  kostanay: { mapper: kostanayMapper, files: ["kostanay.csv"], csv: BASE_CSV },
  turkestan: { mapper: turkestanMapper, files: ["turkestan.csv"], csv: BASE_CSV },
  pavlodar: {
    mapper: pavlodarMapper,
    files: ["pavlodar-1.csv", "pavlodar-2.csv"],
    csv: BASE_CSV,
  },
};

export const REGION_CODES: string[] = Object.keys(REGION_MAPPERS);

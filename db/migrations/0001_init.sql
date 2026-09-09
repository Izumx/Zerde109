CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS regions (
  code       text PRIMARY KEY,
  name_ru    text NOT NULL,
  name_kk    text NOT NULL,
  is_active  boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS themes (
  code     text PRIMARY KEY,
  name_ru  text NOT NULL,
  name_kk  text NOT NULL,
  color    text NOT NULL,
  sort     int  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS services (
  code     text PRIMARY KEY,
  name_ru  text NOT NULL,
  name_kk  text NOT NULL
);

CREATE TABLE IF NOT EXISTS theme_map (
  id          serial PRIMARY KEY,
  pattern     text NOT NULL,
  match_type  text NOT NULL DEFAULT 'ilike',
  theme_code  text NOT NULL REFERENCES themes(code),
  priority    int  NOT NULL DEFAULT 100
);

CREATE TABLE IF NOT EXISTS templates (
  id            serial PRIMARY KEY,
  theme_code    text REFERENCES themes(code),
  service_code  text REFERENCES services(code),
  lang          text NOT NULL,
  title         text NOT NULL,
  body          text NOT NULL
);

CREATE TABLE IF NOT EXISTS appeals (
  id            text PRIMARY KEY,
  source_id     text NOT NULL,
  region        text NOT NULL REFERENCES regions(code),
  district      text,
  locality      text,
  address       text,
  lat           double precision,
  lon           double precision,
  created_at    timestamptz NOT NULL,
  closed_at     timestamptz,
  deadline_at   timestamptz,
  theme         text NOT NULL REFERENCES themes(code),
  raw_category  text,
  subcategory   text,
  service_org   text,
  status        text NOT NULL,
  raw_status    text,
  appeal_type   text,
  channel       text,
  language      text NOT NULL,
  priority      text NOT NULL,
  is_overdue    boolean NOT NULL DEFAULT false,
  sla_days      int,
  grade         smallint,
  operator      text,
  resolution    text,
  search_text   text NOT NULL,
  ingested_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS appeals_region_created_idx ON appeals (region, created_at DESC);
CREATE INDEX IF NOT EXISTS appeals_theme_created_idx  ON appeals (theme, created_at DESC);
CREATE INDEX IF NOT EXISTS appeals_status_idx         ON appeals (status);
CREATE INDEX IF NOT EXISTS appeals_created_idx        ON appeals (created_at);
CREATE INDEX IF NOT EXISTS appeals_search_trgm_idx    ON appeals USING gin (search_text gin_trgm_ops);

CREATE TABLE IF NOT EXISTS mutations (
  id          serial PRIMARY KEY,
  appeal_id   text NOT NULL REFERENCES appeals(id),
  kind        text NOT NULL,
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

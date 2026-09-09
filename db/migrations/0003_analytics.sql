CREATE TABLE IF NOT EXISTS spikes (
  id          serial PRIMARY KEY,
  computed_at timestamptz NOT NULL DEFAULT now(),
  region      text NOT NULL,
  theme       text NOT NULL,
  day         date NOT NULL,
  window_days int NOT NULL,
  baseline    double precision NOT NULL,
  current     double precision NOT NULL,
  ratio       double precision NOT NULL,
  zscore      double precision NOT NULL,
  severity    text NOT NULL,
  UNIQUE (region, theme, day)
);

CREATE TABLE IF NOT EXISTS forecasts (
  id          serial PRIMARY KEY,
  computed_at timestamptz NOT NULL DEFAULT now(),
  region      text NOT NULL,
  theme       text NOT NULL,
  month       date NOT NULL,
  yhat        double precision NOT NULL,
  yhat_lower  double precision NOT NULL,
  yhat_upper  double precision NOT NULL,
  method      text NOT NULL,
  UNIQUE (region, theme, month)
);

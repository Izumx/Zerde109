CREATE TABLE IF NOT EXISTS model_eval_overview (
  id bool PRIMARY KEY DEFAULT true CHECK (id),
  method text NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  n_holdout int NOT NULL,
  accuracy double precision NOT NULL,
  macro_f1 double precision NOT NULL
);

CREATE TABLE IF NOT EXISTS model_eval_themes (
  theme text PRIMARY KEY,
  precision double precision NOT NULL,
  recall double precision NOT NULL,
  f1 double precision NOT NULL,
  support int NOT NULL
);

CREATE TABLE IF NOT EXISTS model_eval_confusion (
  actual text NOT NULL,
  predicted text NOT NULL,
  n int NOT NULL,
  PRIMARY KEY (actual, predicted)
);

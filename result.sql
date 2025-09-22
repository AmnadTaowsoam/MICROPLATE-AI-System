-- สร้าง SCHEMA
CREATE SCHEMA IF NOT EXISTS microplates;

-- 1. Main table to record each prediction run, with additional metadata
CREATE TABLE microplates.prediction_run (
    id                    SERIAL        PRIMARY KEY,
    sample_no             TEXT          NOT NULL,
    description           TEXT          NULL,
    predict_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    annotated_image_path  TEXT          NOT NULL,
    model_version         TEXT          NULL,
    status                TEXT          NOT NULL DEFAULT 'pending',
    error_msg             TEXT          NULL
);

-- 2. Final row counts (as JSONB)
CREATE TABLE microplates.row_counts (
    id         SERIAL        PRIMARY KEY,
    run_id     INTEGER       NOT NULL REFERENCES microplates.prediction_run(id) ON DELETE CASCADE,
    counts     JSONB         NOT NULL,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 3. Interface results JSON
CREATE TABLE microplates.interface_results (
    id         SERIAL        PRIMARY KEY,
    run_id     INTEGER       NOT NULL REFERENCES microplates.prediction_run(id) ON DELETE CASCADE,
    results    JSONB         NOT NULL,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 4. Detailed well predictions (normalized)
CREATE TABLE microplates.well_prediction (
    id         SERIAL        PRIMARY KEY,
    run_id     INTEGER       NOT NULL REFERENCES microplates.prediction_run(id) ON DELETE CASCADE,
    label      TEXT          NOT NULL,
    class      TEXT          NOT NULL,
    confidence REAL          NOT NULL,
    bbox       JSONB         NOT NULL,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 5. Image file metadata (raw vs annotated)
CREATE TABLE microplates.image_file (
    id         SERIAL        PRIMARY KEY,
    run_id     INTEGER       NOT NULL REFERENCES microplates.prediction_run(id) ON DELETE CASCADE,
    sample_no  TEXT          NOT NULL,
    file_type  TEXT          NOT NULL,
    path       TEXT          NOT NULL,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 6. ตารางเก็บผลสรุปตาม sample_no
CREATE TABLE IF NOT EXISTS microplates.sample_summary (
  sample_no TEXT PRIMARY KEY,
  summary    JSONB NOT NULL  -- จะเก็บ {"distribution": {...}}
);

-- 7. Function PL/pgSQL สำหรับ upsert สรุป
CREATE OR REPLACE FUNCTION microplates.fn_upsert_sample_summary()
RETURNS TRIGGER AS $$
DECLARE
  s_no TEXT;
  dist JSONB;
BEGIN
  -- 7.1 หา sample_no จาก run_id
  SELECT pr.sample_no
    INTO s_no
  FROM microplates.prediction_run pr
  WHERE pr.id = NEW.run_id
  LIMIT 1;

  -- 7.2 สร้าง subquery รวบรวมยอดแต่ละ key ของ distribution
  SELECT jsonb_object_agg(key, total)
    INTO dist
  FROM (
    SELECT
      t.key,
      SUM((t.value::text)::int) AS total
    FROM microplates.interface_results ir
    JOIN microplates.prediction_run pr2
      ON pr2.id = ir.run_id
    CROSS JOIN LATERAL
      jsonb_each(ir.results->'distribution') AS t(key, value)
    WHERE pr2.sample_no = s_no
    GROUP BY t.key
  ) sub;

  -- 7.3 Upsert หรือ insert ลง sample_summary
  INSERT INTO microplates.sample_summary(sample_no, summary)
  VALUES (
    s_no,
    jsonb_build_object('distribution', dist)
  )
  ON CONFLICT (sample_no) DO UPDATE
    SET summary = EXCLUDED.summary;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger ให้รัน function หลัง INSERT หรือ UPDATE ใน interface_results
CREATE TRIGGER trg_upsert_sample_summary
AFTER INSERT OR UPDATE
  ON microplates.interface_results
FOR EACH ROW
EXECUTE FUNCTION microplates.fn_upsert_sample_summary();

-- Indexes for performance
CREATE INDEX ON microplates.prediction_run(sample_no);
CREATE INDEX ON microplates.prediction_run(predict_at);

-- GIN indexes for JSONB columns
CREATE INDEX ON microplates.row_counts         USING GIN (counts    jsonb_path_ops);
CREATE INDEX ON microplates.interface_results  USING GIN (results   jsonb_path_ops);
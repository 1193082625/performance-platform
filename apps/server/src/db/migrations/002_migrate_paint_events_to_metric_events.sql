ALTER TABLE paint_events
    RENAME TO metric_events;

ALTER INDEX paint_events_query_idx
    RENAME TO metric_events_query_idx;

ALTER TABLE metric_events
    RENAME COLUMN value_ms TO metric_value;


ALTER TABLE metric_events
    ADD COLUMN metric_unit TEXT,
    ADD COLUMN sample_rate DOUBLE PRECISION,
    ADD COLUMN metric_version TEXT;

UPDATE metric_events
SET
    metric_unit = 'ms',
    sample_rate = 1,
    metric_version = 'paint-v1';


ALTER TABLE metric_events
    ALTER COLUMN metric_unit SET NOT NULL,
    ALTER COLUMN sample_rate SET NOT NULL,
    ALTER COLUMN metric_version SET NOT NULL;


ALTER TABLE metric_events
    DROP CONSTRAINT paint_events_event_type_check,
    DROP CONSTRAINT paint_events_value_ms_check;

ALTER TABLE metric_events
    ADD CONSTRAINT metric_events_sample_rate_check
    CHECK (
        sample_rate > 0
        AND sample_rate <= 1
    );

ALTER TABLE metric_events
    ADD CONSTRAINT metric_events_metric_definition_check
    CHECK (
        (
            event_type IN (
                'web.paint.fp',
                'web.paint.fcp'
            )
            AND metric_unit = 'ms'
            AND metric_version = 'paint-v1'
        )
        OR (
            event_type = 'web.vital.lcp'
            AND metric_unit = 'ms'
            AND metric_version = 'lcp-v1'
        )
        OR (
            event_type = 'web.vital.cls'
            AND metric_unit = 'score'
            AND metric_version = 'cls-v1'
        )
        OR (
            event_type = 'web.vital.inp'
            AND metric_unit = 'ms'
            AND metric_version = 'inp-v1'
        )
        OR (
            event_type IN (
                'web.memory.used_heap',
                'web.memory.total_heap',
                'web.memory.heap_limit'
            )
            AND metric_unit = 'byte'
            AND metric_version = 'memory-v1'
        )
    );


ALTER TABLE metric_events
    ADD CONSTRAINT metric_events_metric_value_check
    CHECK (
        metric_value >= 0
        AND metric_value < 'Infinity'::DOUBLE PRECISION
        AND (
            (
                metric_unit = 'ms'
                AND metric_value < 86400000
            )
            OR metric_unit = 'score'
            OR (
                metric_unit = 'byte'
                AND metric_value <= 9007199254740991
                AND metric_value = FLOOR(metric_value)
            )
        )
    );
ALTER TABLE metric_events
    ADD COLUMN metric_attribution JSONB;

ALTER TABLE metric_events
    ADD CONSTRAINT metric_events_attribution_object_check
    CHECK (
        metric_attribution IS NULL
        OR jsonb_typeof(metric_attribution) = 'object'
    )
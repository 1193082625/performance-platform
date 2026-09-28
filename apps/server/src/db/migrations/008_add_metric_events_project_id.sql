ALTER TABLE metric_events
    ADD COLUMN project_id BIGINT
        REFERENCES projects(id) ON DELETE RESTRICT;

CREATE INDEX metric_events_project_id_event_type_event_time_idx
    ON metric_events (
        project_id,
        event_type,
        event_time
    );
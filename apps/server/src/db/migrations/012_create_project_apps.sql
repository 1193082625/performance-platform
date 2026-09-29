CREATE TABLE project_apps (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL
        REFERENCES projects(id)
        ON DELETE RESTRICT,
    app_id TEXT NOT NULL,
    name TEXT NOT NULL,
    platform TEXT NOT NULL
        CHECK (
            platform IN (
                'web',
                'ios',
                'android',
                'mini_program_zfb',
                'mini_program_wx'
            )
        ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT project_apps_app_id_length_check
        CHECK (
            char_length(app_id) BETWEEN 1 AND 64
        ),
    
    CONSTRAINT project_apps_name_length_check
        CHECK (
            char_length(name) BETWEEN 1 AND 100
        ),
    
    CONSTRAINT project_apps_project_id_app_id_uidx
        UNIQUE (project_id, app_id)
);

CREATE INDEX project_apps_project_id_app_id_idx
    ON project_apps (project_id, app_id);

INSERT INTO project_apps (
    project_id,
    app_id,
    name,
    platform
)
SELECT DISTINCT project_id, app_id, app_id, platform FROM metric_events ON CONFLICT (project_id, app_id) DO NOTHING;

ALTER TABLE metric_events
    ADD CONSTRAINT metric_events_project_id_app_id_fkey
    FOREIGN KEY (project_id, app_id)
    REFERENCES project_apps (project_id, app_id)
    ON DELETE RESTRICT;
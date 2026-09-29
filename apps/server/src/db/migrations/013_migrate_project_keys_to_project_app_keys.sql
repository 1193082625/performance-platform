CREATE TABLE project_app_keys (
    id BIGSERIAL PRIMARY KEY,
    project_app_id BIGINT NOT NULL
        REFERENCES project_apps(id) ON DELETE RESTRICT,
    key_hash TEXT NOT NULL UNIQUE,
    key_prefix TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX project_app_keys_project_app_id_idx
    ON project_app_keys(project_app_id);

INSERT INTO project_apps (project_id, app_id, name, platform)
SELECT
    projects.id,
    'web-' || projects.id,
    'web 应用',
    'web'
FROM projects
WHERE EXISTS (
    SELECT 1
    FROM project_keys
    WHERE project_keys.project_id = projects.id
)
AND NOT EXISTS (
    SELECT 1
    FROM project_apps
    WHERE project_apps.project_id = projects.id
        AND project_apps.platform = 'web'
);

INSERT INTO project_app_keys (
    project_app_id,
    key_hash,
    key_prefix,
    created_at,
    revoked_at
)
SELECT
    project_apps.id,
    project_keys.key_hash,
    project_keys.key_prefix,
    project_keys.created_at,
    project_keys.revoked_at
FROM project_keys
JOIN LATERAL (
    SELECT id
    FROM project_apps
    WHERE project_apps.project_id = project_keys.project_id
        AND project_apps.platform = 'web'
    ORDER BY project_apps.created_at ASC, project_apps.id ASC
    LIMIT 1
) AS project_apps ON true;
DO $$
DECLARE
    default_project_id BIGINT;
    legacy_event_count BIGINT;
BEGIN
    SELECT COUNT(*)
    INTO legacy_event_count
    FROM metric_events
    WHERE project_id IS NULL;

    IF legacy_event_count = 0 THEN
        RETURN;
    END IF;

    SELECT projects.id
    INTO default_project_id
    FROM projects
    INNER JOIN users
        ON users.id = projects.owner_id
    WHERE users.name = 'test'
        AND projects.name = 'demo-web'
    ORDER BY projects.id ASC
    LIMIT 1;

    IF default_project_id IS NULL THEN
        RAISE EXCEPTION
            '无法迁移历史事件：未找到 test 用户 的 demo-web 项目';
    END IF;

    UPDATE metric_events
    SET project_id = default_project_id
    WHERE project_id IS NULL;
END $$;
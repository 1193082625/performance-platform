

-- BIGSERIAL：PostgreSQL 自动生成递增的大整数
CREATE TABLE paint_events (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID NOT NULL UNIQUE,

    schema_version TEXT NOT NULL,

    app_id TEXT NOT NULL,
    app_version TEXT NOT NULL,
    environment TEXT NOT NULL
        CHECK(
            environment IN (
                'development',
                'test',
                'staging',
                'production'
            )
        ),
        
    platform TEXT NOT NULL
        CHECK (platform = 'web'),

    event_type TEXT NOT NULL
        CHECK (
            event_type IN (
                'web.paint.fp',
                'web.paint.fcp'
            )
        ),

    event_time TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    session_id TEXT NOT NULL,
    view_id TEXT NOT NULL,

    sdk_name TEXT NOT NULL,
    sdk_version TEXT NOT NULL,

    -- 范围 0<=value_ms<24小时
    value_ms DOUBLE PRECISION NOT NULL
        CHECK (
            value_ms >= 0
            AND value_ms < 86400000
        )
);

-- 添加联合索引
CREATE INDEX paint_events_query_idx
    ON paint_events (
        app_id,
        event_type,
        event_time
    );

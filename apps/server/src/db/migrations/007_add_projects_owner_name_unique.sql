CREATE UNIQUE INDEX projects_owner_id_name_uidx
    ON projects (owner_id, name);

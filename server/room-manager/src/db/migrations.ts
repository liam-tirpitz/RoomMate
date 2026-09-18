import Database from "better-sqlite3";

// Applied in order; PRAGMA user_version holds the number of migrations already applied.
// Never edit a migration that has shipped, append a new one instead.
export const migrations: string[] = [
    `
    CREATE TABLE organization (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        name TEXT NOT NULL DEFAULT '',
        external_identifier TEXT NOT NULL DEFAULT '',
        soon_threshold_in_min INTEGER NOT NULL,
        night_start_hour INTEGER NOT NULL,
        night_end_hour INTEGER NOT NULL,
        timezone TEXT NOT NULL,
        low_battery_voltage_cutoff_in_mv INTEGER NOT NULL,
        default_logo TEXT NOT NULL,
        device_offline_after_min INTEGER NOT NULL DEFAULT 120
    );

    CREATE TABLE tenants (
        id INTEGER PRIMARY KEY,
        identifier TEXT NOT NULL UNIQUE,
        endpoint TEXT NOT NULL,
        user TEXT NOT NULL,
        secret_env TEXT NOT NULL
    );

    CREATE TABLE rooms (
        id INTEGER PRIMARY KEY,
        room_number INTEGER,
        id_string TEXT NOT NULL,
        name TEXT NOT NULL,
        logo TEXT NOT NULL,
        ews_email TEXT,
        ews_tenant_id INTEGER REFERENCES tenants(id) ON DELETE RESTRICT,
        ical_endpoint TEXT,
        persons_json TEXT
    );

    CREATE TABLE devices (
        id INTEGER PRIMARY KEY,
        device_id TEXT NOT NULL UNIQUE,
        location TEXT NOT NULL DEFAULT '',
        room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
        last_contact TEXT,
        battery_mv INTEGER,
        next_expected_contact TEXT,
        redraw_requested INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE battery_samples (
        device_id TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
        ts TEXT NOT NULL,
        voltage_mv INTEGER NOT NULL
    );
    CREATE INDEX battery_samples_device_ts ON battery_samples (device_id, ts);

    CREATE TABLE screens (
        device_id TEXT PRIMARY KEY REFERENCES devices(device_id) ON DELETE CASCADE,
        png BLOB NOT NULL,
        rendered_at TEXT NOT NULL,
        hash TEXT
    );
    `,
]

export function migrate(db: Database.Database): number {
    const current = db.pragma("user_version", {simple: true}) as number
    for (let version = current; version < migrations.length; version++) {
        db.transaction(() => {
            db.exec(migrations[version])
            db.pragma(`user_version = ${version + 1}`)
        })()
    }
    return migrations.length - current
}

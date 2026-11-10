import SQLite, {SQLiteDatabase} from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

let opening: Promise<SQLiteDatabase> | undefined;

export function openLocalDatabase(): Promise<SQLiteDatabase> {
  if (!opening) {
    opening = SQLite.openDatabase({name: 'pocket-black-box.db', location: 'default'})
      .then(async database => {
        await database.executeSql('PRAGMA foreign_keys = ON');
        await database.executeSql(`CREATE TABLE IF NOT EXISTS reports (
          id TEXT PRIMARY KEY, text TEXT NOT NULL, location TEXT, needs TEXT NOT NULL,
          urgency TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL, revision INTEGER NOT NULL, sync_state TEXT NOT NULL
        )`);
        await database.executeSql(`CREATE INDEX IF NOT EXISTS idx_local_reports_updated
          ON reports(updated_at DESC)`);
        await database.executeSql(`CREATE TABLE IF NOT EXISTS report_events (
          id TEXT PRIMARY KEY, report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
          kind TEXT NOT NULL, occurred_at TEXT NOT NULL, revision INTEGER NOT NULL, payload TEXT NOT NULL
        )`);
        await database.executeSql("UPDATE reports SET sync_state = 'local' WHERE sync_state != 'local'");
        return database;
      })
      .catch((error: unknown) => {
        opening = undefined;
        throw error;
      });
  }
  return opening!;
}

import type {SQLiteDatabase, SQLiteTransaction} from 'react-native-sqlite-storage';
import type {Location, Report, ReportStatus, Urgency} from '../domain/report';
import {createDemoReports} from '../domain/demoScenario';
import {openLocalDatabase} from './localDatabase';

type Row = {
  id: string; text: string; location: string | null; needs: string; urgency: Urgency;
  status: ReportStatus; created_at: string; updated_at: string; revision: number;
  sync_state: Report['sync_state'];
};

function asReport(row: Row): Report {
  return {...row, location: row.location ? JSON.parse(row.location) as Location : null, needs: JSON.parse(row.needs) as string[]};
}

function execute(tx: SQLiteTransaction, query: string, values: unknown[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.executeSql(query, values as never[], () => resolve(), (_transaction, error) => {
      reject(error);
      return false;
    });
  });
}

function exists(tx: SQLiteTransaction, query: string, values: unknown[] = []): Promise<boolean> {
  return new Promise((resolve, reject) => {
    tx.executeSql(query, values, (_transaction, result) => resolve(result.rows.length > 0), (_transaction, error) => {
      reject(error);
      return false;
    });
  });
}

async function transaction<T>(db: SQLiteDatabase, action: (tx: SQLiteTransaction) => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    db.transaction(
      tx => {
        action(tx).then(resolve, reject);
      },
      reject,
    );
  });
}

export async function listLocalReports(): Promise<Report[]> {
  const db = await openLocalDatabase();
  const [result] = await db.executeSql(`SELECT * FROM reports
    ORDER BY CASE urgency WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
    updated_at DESC, id ASC`);
  const rows: Report[] = [];
  for (let index = 0; index < result.rows.length; index += 1) {
    rows.push(asReport(result.rows.item(index) as Row));
  }
  return rows;
}

export async function upsertLocalReport(report: Report, tx?: SQLiteTransaction): Promise<void> {
  const db = tx ? undefined : await openLocalDatabase();
  const query = `INSERT INTO reports(id,text,location,needs,urgency,status,created_at,updated_at,revision,sync_state)
     VALUES(?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET text=excluded.text, location=excluded.location,
       needs=excluded.needs, urgency=excluded.urgency, status=excluded.status,
       updated_at=excluded.updated_at, revision=excluded.revision, sync_state=excluded.sync_state`;
  const values = [report.id, report.text, JSON.stringify(report.location), JSON.stringify(report.needs),
    report.urgency, report.status, report.created_at, report.updated_at, report.revision, report.sync_state];
  if (tx) {
    await execute(tx, query, values);
  } else {
    await db!.executeSql(query, values);
  }
}

export async function saveLocalReport(report: Report): Promise<void> {
  const db = await openLocalDatabase();
  await transaction(db, async tx => {
    await upsertLocalReport(report, tx);
    await execute(tx,
      'INSERT INTO report_events(id,report_id,kind,occurred_at,revision,payload) VALUES(?,?,?,?,?,?)',
      [createId(), report.id, 'report.created', report.created_at, report.revision, JSON.stringify({text: report.text})],
    );
  });
}

export async function seedDemoReports(): Promise<number> {
  const db = await openLocalDatabase();
  const reports = createDemoReports();
  let inserted = 0;
  await transaction(db, async tx => {
    for (const report of reports) {
      if (await exists(tx, 'SELECT 1 FROM reports WHERE id = ?', [report.id])) { continue; }
      await upsertLocalReport(report, tx);
      await execute(tx,
        'INSERT INTO report_events(id,report_id,kind,occurred_at,revision,payload) VALUES(?,?,?,?,?,?)',
        [createId(), report.id, 'demo.report_created', report.created_at, report.revision, JSON.stringify({fictional: true})],
      );
      inserted += 1;
    }
  });
  return inserted;
}

export async function updateLocalReport(id: string, changes: Partial<Pick<Report, 'urgency' | 'needs' | 'status' | 'location' | 'text'>>): Promise<Report | null> {
  const reports = await listLocalReports();
  const found = reports.find(report => report.id === id);
  if (!found) { return null; }
  const updated: Report = {...found, ...changes, updated_at: new Date().toISOString(), revision: found.revision + 1, sync_state: 'local'};
  const db = await openLocalDatabase();
  await transaction(db, async tx => {
    await upsertLocalReport(updated, tx);
    await execute(tx,
      'INSERT INTO report_events(id,report_id,kind,occurred_at,revision,payload) VALUES(?,?,?,?,?,?)',
      [createId(), updated.id, 'report.updated', updated.updated_at, updated.revision, JSON.stringify(changes)]);
  });
  return updated;
}

function createId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

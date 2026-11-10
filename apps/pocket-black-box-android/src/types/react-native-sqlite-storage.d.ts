declare module 'react-native-sqlite-storage' {
  export interface SQLiteRows {
    length: number;
    item(index: number): Record<string, unknown>;
  }

  export interface SQLiteResult {
    rows: SQLiteRows;
    rowsAffected: number;
    insertId?: number;
  }

  export interface SQLiteTransaction {
    executeSql(
      statement: string,
      params?: unknown[],
      success?: (transaction: SQLiteTransaction, result: SQLiteResult) => void,
      error?: (transaction: SQLiteTransaction, error: Error) => boolean | void,
    ): void;
  }

  export interface SQLiteDatabase {
    executeSql(statement: string, params?: unknown[]): Promise<[SQLiteResult]>;
    transaction(
      callback: (transaction: SQLiteTransaction) => void,
      error?: (error: Error) => void,
      success?: () => void,
    ): void;
  }

  const SQLite: {
    enablePromise(enabled: boolean): void;
    openDatabase(options: {name: string; location?: string}): Promise<SQLiteDatabase>;
  };

  export default SQLite;
}

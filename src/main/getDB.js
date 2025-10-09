import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

let dbInstance = null;

export function getDatabase() {
  if (dbInstance) return dbInstance;

  if (!app.isReady()) {
    throw new Error('Cannot open database: app is not ready');
  }

  const userDataPath = app.getPath('userData');
  const dbDir = path.join(userDataPath, 'Database');

  // Ensure folder exists
  fs.mkdirSync(dbDir, { recursive: true });

  const dbPath = path.join(dbDir, 'schedule.db');
  console.log('Using DB at:', dbPath);

  dbInstance = new Database(dbPath);
  return dbInstance;
}
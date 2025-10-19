import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

let dbInstance = null;

function ensureDbDir() {
  const userDataPath = app.getPath('userData');
  const dbDir = path.join(userDataPath, 'Database');
  fs.mkdirSync(dbDir, { recursive: true });
  return dbDir;
}


export function getDatabase() {
  if (dbInstance) return dbInstance;

  if (!app.isReady()) {
    throw new Error('Cannot open database: app is not ready');
  }

  const dbDir = ensureDbDir();
  const dbPath = path.join(dbDir, 'schedule.db');

  dbInstance = new Database(dbPath);
  
  console.log('Using DB at:', dbPath);
  return dbInstance;
}
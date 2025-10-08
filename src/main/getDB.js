import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

export function getDatabase() {
  const userDataPath = app.getPath('userData');
  const dbDir = path.join(userDataPath, 'Database');
  fs.mkdirSync(dbDir, { recursive: true });
  const dbPath = path.join(dbDir, 'schedule.db');
  console.log('Using DB at:', dbPath);
  return new Database(dbPath);
}
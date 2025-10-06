import { app, ipcMain } from 'electron'
import path from 'path'
import Database from 'better-sqlite3'

// Path to a writable location
const userDataPath = app.getPath('userData');

const dbDir = path.join(userDataPath, 'Database');
const dbPath = path.join(dbDir, 'schedule.db');
console.log('Using DB at:', dbPath);

// Initialize SQLite
const db = new Database(dbPath);

export const db_api = {

  getFullSchedule: (schedule_set_id) => {
    return db.prepare(`
      SELECT 
        r.res_id,
        r.first_name || ' ' || r.last_name AS resident_name,
        w.week_start,
        w.week_end,
        COALESCE(s.name, 'VAC') AS service,
        a.is_overnight,
        a.is_vacation,
        a.vacation_priority
      FROM assignments a
      JOIN residents r ON a.res_id = r.res_id
      JOIN weeks w ON a.week_id = w.week_id
      LEFT JOIN services s ON a.service_id = s.service_id
      WHERE w.schedule_set_id = ?
      ORDER BY r.last_name, w.week_start
    `).all(schedule_set_id);
  },

  getResidentAssignments: (res_id) => {
    return db.prepare(`
      SELECT 
          w.week_start,
          w.week_end,
          COALESCE(s.name, 'VAC) AS service,
          a.is_overnight,
          a.is_vacation,
          a.vacation_priority
      FROM assignments a
      JOIN weeks w ON a.week_id = w.week_id
      LEFT JOIN services s ON a.service_id = s.service_id
      WHERE a.res_id = ?
      ORDER BY w.week_start;
    `).all(res_id);
  },

  updateResidentService: (res_id, week_start, newServiceName, isOvernight = false) => {
    const week = db.prepare(`SELECT week_id FROM weeks WHERE week_start = ?`).get(week_start);
    if (!week) throw new Error(`Week starting ${week_start} not found`);

    const service = db.prepare(`SELECT service_id FROM services WHERE name = ?`).get(newServiceName);
    if (!service) throw new Error(`Service "${newServiceName}" not found`);

    const result = db.prepare(`
      UPDATE assignments
      SET service_id = ?, is_overnight = ?, is_vacation = 0, vacation_priority = NULL
      WHERE res_id = ? AND week_id = ?
    `).run(service.service_id, isOvernight ? 1 : 0, res_id, week.week_id);

    return result.changes;
  },

  setResidentVacation: (res_id, week_start, priority) => {
    const week = db.prepare(`SELECT week_id FROM weeks WHERE week_start = ?`).get(week_start);
    if (!week) throw new Error(`Week starting ${week_start} not found`);

    const result = db.prepare(`
      UPDATE assignments
      SET service_id = NULL, is_overnight = 0, is_vacation = 1, vacation_priority = ?
      WHERE res_id = ? AND week_id = ?
    `).run(priority, res_id, week.week_id);

    return result.changes;
  },

  getResidentVacations: (res_id) => {
    return db.prepare(`
      SELECT 
          w.week_start,
          w.week_end,
          a.vacation_priority
      FROM assignments a
      JOIN weeks w ON a.week_id = w.week_id
      WHERE a.res_id = ? AND a.is_vacation = 1
      ORDER BY w.week_start;
    `).all(res_id);
  }
};

export function registerIpcHandlers() {
  ipcMain.handle('get-resident-assignments', (event, res_id) =>
    db_api.getResidentAssignments(res_id)
  );

  ipcMain.handle(
    'update-resident-service',
    (event, res_id, week_start, newServiceName, isOvernight = false) =>
      db_api.updateResidentService(res_id, week_start, newServiceName, isOvernight)
  );

  ipcMain.handle(
    'set-resident-vacation',
    (event, res_id, week_start, priority) =>
      db_api.setResidentVacation(res_id, week_start, priority)
  );

  ipcMain.handle('get-resident-vacations', (event, res_id) =>
    db_api.getResidentVacations(res_id)
  );

  ipcMain.handle('get-full-schedule', (event, schedule_set_id) =>
    db_api.getFullSchedule(schedule_set_id)
  );
}

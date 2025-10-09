import { app, ipcMain } from 'electron';
import { getDatabase } from './getDB';

// Use getDatabase() inside IPC handlers
export const db_api = {
  getFullSchedule: (schedule_set_id) => {
    const db = getDatabase();
    return db.prepare(`
      SELECT r.res_id, r.first_name || ' ' || r.last_name AS resident_name,
             w.week_start, w.week_end,
             COALESCE(s.name, 'VAC') AS service,
             a.is_overnight, a.is_vacation, a.vacation_priority
      FROM assignments a
      JOIN residents r ON a.res_id = r.res_id
      JOIN weeks w ON a.week_id = w.week_id
      LEFT JOIN services s ON a.service_id = s.service_id
      WHERE w.schedule_set_id = ?
      ORDER BY r.last_name, w.week_start
    `).all(schedule_set_id);
  },

  // Repeat: call getDatabase() inside every method
  getResidentAssignments: (res_id) => {
    const db = getDatabase();
    return db.prepare(`
      SELECT w.week_start, w.week_end,
             COALESCE(s.name, 'VAC') AS service,
             a.is_overnight, a.is_vacation, a.vacation_priority
      FROM assignments a
      JOIN weeks w ON a.week_id = w.week_id
      LEFT JOIN services s ON a.service_id = s.service_id
      WHERE a.res_id = ?
      ORDER BY w.week_start;
    `).all(res_id);
  },

  // And so on for updateResidentService, setResidentVacation, getResidentVacations
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

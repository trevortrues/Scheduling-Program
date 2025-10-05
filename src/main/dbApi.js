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

    getResidentServices: (res_id) => {
        return db.prepare(`
            SELECT service, week_start, week_end, is_overnight
            FROM schedule
            where res_id=?
            `).all(res_id);
    },

    updateResidentService: (res_id, week_start, newService) => {
        const stmt = db.prepare(`
            UPDATE schedule
            SET service = ?
            WHERE res_id = ? AND week_start = ?
            `);
        const result = stmt.run(newService, res_id, week_start);
        return result.changes;
    },

    getResidentVacations: (res_id) => {
        return db.prepare(`
            SELECT r.res_id,
                   r.first_name,
                   r.last_name,
                   v.priority,
                   start_date,
                   end_date
            FROM 
                residents r
            JOIN
                vacations v ON r.res_id = v.res_id
            WHERE r.res_id = ?;
            `).all(res_id);
    }
};

export function registerIpcHandlers() {
    ipcMain.handle('get-resident-services', (event, res_id) => db_api.getResidentServices(res_id));
    ipcMain.handle('update-resident-service', (event, res_id, week_start, new_service) =>
        db_api.updateResidentService(res_id, week_start, new_service)
    );
    ipcMain.handle('get-resident-vacations', (event, res_id) => db_api.getResidentVacations(res_id));
}

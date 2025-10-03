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
            SELECT schedule_id, service, week_start, week_end, is_overnight
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
    }
};

export function registerIpcHandlers() {
    ipcMain.handle('get-resident-services', (event, res_id) => db_api.getResidentServices(res_id));
    ipcMain.handle('update-resident-service', (event, res_id, week_start, new_service) =>
        db_api.updateResidentService(res_id, week_start, new_service)
    );
}

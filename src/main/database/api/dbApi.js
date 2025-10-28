import { ipcMain } from 'electron';
import { getDatabase } from '../connection/index.js';
import { withMiddleware } from '../../middleware.js';

export const db_api = {

  /**
   * Get the full schedule for a specific schedule set.
   *
   * Returns all assignments for all active residents in a schedule set, including:
   *   - resident ID and full name
   *   - week start and end dates
   *   - assigned service (or 'VAC' for vacation)
   *   - overnight flag
   *   - vacation flag
   *   - vacation priority (1-3) if applicable
   *
   * @param {number} schedule_set_id - The ID of the schedule set to query
   * @returns {Array<Object>} Array of assignment objects with keys:
   *   - res_id {number} - Resident ID
   *   - resident_name {string} - Full name (first + last)
   *   - week_start {string} - Week start date (YYYY-MM-DD)
   *   - week_end {string} - Week end date (YYYY-MM-DD)
   *   - service {string} - Assigned service name or 'VAC'
   *   - is_overnight {number} - 0 or 1
   *   - is_vacation {number} - 0 or 1
   *   - vacation_priority {number|null} - 1-3 if vacation, else null
   */
  getFullSchedule: (schedule_set_id) => {
    const db = getDatabase();
    return db.prepare(`
      SELECT r.res_id, r.first_name || ' ' || r.last_name AS resident_name,
             w.week_start, w.week_end,
             s.name AS service,
             a.is_overnight, a.is_vacation, a.vacation_priority
      FROM assignments a
      JOIN residents r ON a.res_id = r.res_id
      JOIN weeks w ON a.week_id = w.week_id
      LEFT JOIN services s ON a.service_id = s.service_id
      WHERE w.schedule_set_id = ?
        AND r.is_active = 1
        AND (s.is_active = 1 OR s.service_id IS NULL)
      ORDER BY w.week_start
    `).all(schedule_set_id);
  },
  /**
   * Get all residents.
   * 
   * @param {boolean} [onlyActive=true] - If true, only return active residents
   * @returns {Array<Object>} List of residents with:
   *   - res_id
   *   - first_name
   *   - last_name
   *   - pgy_level
   *   - is_active
   */
  getResidents: (onlyActive = true) => {
    const db = getDatabase();

    let query = `SELECT res_id, first_name, last_name, pgy_level, is_active FROM residents`;
    if (onlyActive) {
      query += ` WHERE is_active = 1`;
    }
    query += ` ORDER BY last_name, first_name`;

    return db.prepare(query).all();
  },
  /**
   * Get all assignments for a single resident.
   *
   * Returns assignments for the specified resident, including:
   *   - week start and end dates
   *   - assigned service (or 'VAC' for vacation)
   *   - overnight flag
   *   - vacation flag
   *   - vacation priority (1-3) if applicable
   *
   * @param {number} res_id - The resident's ID
   * @returns {Array<Object>} Array of assignment objects with keys:
   *   - week_start {string} - Week start date (YYYY-MM-DD)
   *   - week_end {string} - Week end date (YYYY-MM-DD)
   *   - service {string} - Assigned service name or 'VAC'
   *   - is_overnight {number} - 0 or 1
   *   - is_vacation {number} - 0 or 1
   *   - vacation_priority {number|null} - 1-3 if vacation, else null
   */
  getResidentServices: (res_id) => {
    const db = getDatabase();
    return db.prepare(`
      SELECT w.week_start, w.week_end,
             s.name AS service,
             a.is_overnight, a.is_vacation, a.vacation_priority
      FROM assignments a
      JOIN weeks w ON a.week_id = w.week_id
      LEFT JOIN services s ON a.service_id = s.service_id
      WHERE a.res_id = ?
      ORDER BY w.week_start;
    `).all(res_id);
  },
  /**
   * Update the service assignment for a resident for a specific week.
   * Also clears vacation flag if present.
   * 
   * @param {number} res_id - Resident ID
   * @param {string} week_start - Week start date (YYYY-MM-DD)
   * @param {string} newServiceName - Name of the service
   * @param {boolean} [isOvernight=false] - Whether this assignment is overnight
   * @returns {number} Number of rows updated (should be 1)
   */
  setResidentService: (res_id, week_start, newServiceName, isOvernight = false) => {
    const db = getDatabase();

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

  /**
   * Mark a resident's week as a vacation with priority.
   * Uses the 'VAC' service instead of NULL.
   * 
   * @param {number} res_id - Resident ID
   * @param {string} week_start - Week start date (YYYY-MM-DD)
   * @param {number} priority - Vacation priority (1-3)
   * @returns {number} Number of rows updated (should be 1)
   */
  setResidentVacation: (res_id, week_start, priority) => {
    const db = getDatabase();

    const week = db.prepare(`SELECT week_id FROM weeks WHERE week_start = ?`).get(week_start);
    if (!week) throw new Error(`Week starting ${week_start} not found`);

    const vacService = db.prepare(`SELECT service_id FROM services WHERE name = 'VAC'`).get();
    if (!vacService) throw new Error(`Service "VAC" not found`);

    const result = db.prepare(`
      UPDATE assignments
      SET service_id = ?, is_overnight = 0, is_vacation = 1, vacation_priority = ?
      WHERE res_id = ? AND week_id = ?
    `).run(vacService.service_id, priority, res_id, week.week_id);

    return result.changes;
  },

  /**
   * Get all vacation weeks for a resident.
   * 
   * @param {number} res_id - Resident ID
   * @returns {Array<Object>} List of vacation assignments with:
   *   - week_start
   *   - week_end
   *   - vacation_priority: 1-3
   */
  getResidentVacations: (res_id) => {
    const db = getDatabase();
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
  },

  /**
   * Add a new resident to the database.
   *
   * @param {string} first_name - Resident's first name
   * @param {string} last_name - Resident's last name
   * @param {number} pgy_level - Resident's PGY level
   * @returns {number} The newly inserted resident ID
   */
  addResident: (first_name, last_name, pgy_level) => {
    const db = getDatabase();

    const result = db.prepare(`
      INSERT INTO residents (first_name, last_name, pgy_level)
      VALUES (?, ?, ?)
    `).run(first_name, last_name, pgy_level);

    return result.lastInsertRowid;
  },

  /**
   * Get all services
   * @param {boolean} [onlyActive = true] - If true, only return active services
   * @returns {Array<Object>} List of services with:
   *  -service_id
   *  -name
   *  -is_active
   */
  getServices: (onlyActive = true) => {
    const db = getDatabase();

    let query = `
    SELECT service_id, name, is_active
    FROM services`;
    
    if(onlyActive) query += ` WHERE is_active = 1`;
    query += ` ORDER BY name`;

    return db.prepare(query).all();
  },

  /**
   * Archive (soft delete) a service.
   * Marks the service as inactive without removing assignments.
   *
   * @param {number} service_id - The service ID to archive
   * @returns {number} Number of rows updated (should be 1 if successful)
   */
  archiveService: (service_id) => {
    const db = getDatabase();
    const result = db.prepare(`
      UPDATE services
      SET is_active = 0
      WHERE service_id = ?
    `).run(service_id);

    return result.changes;
  },

  /**
   * Unarchive a service.
   * Marks the service as active.
   *
   * @param {number} service_id - The service ID to unarchive
   * @returns {number} Number of rows updated (should be 1 if successful)
   */
  unarchiveService: (service_id) => {
    const db = getDatabase();
    const result = db.prepare(`
      UPDATE services
      SET is_active = 1
      WHERE service_id = ?
    `).run(service_id);

    return result.changes;
  },
  /**
   * Update resident information.
   *
   * Allows updating one or more fields for a resident in the `residents` table.
   *
   * @param {number} res_id - The resident's unique ID
   * @param {Object} updates - Object with fields to update:
   *   - first_name {string} [optional]
   *   - last_name {string} [optional]
   *   - pgy_level {number} [optional]
   *   - is_active {number} [optional] - 1 for active, 0 for inactive
   * @returns {Object|null} The updated resident record, or null if resident not found
   */
  updateResident: (res_id, updates) => {
    const db = getDatabase();

    const allowedFields = ['first_name', 'last_name', 'pgy_level', 'is_active'];
    const setClauses = [];
    const values = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        values.push(updates[field]);
      }
    }

    if (setClauses.length === 0) {
      throw new Error('No valid fields provided for update.');
    }

    values.push(res_id);

    const sql = `
      UPDATE residents
      SET ${setClauses.join(', ')}
      WHERE res_id = ?
    `;

    const stmt = db.prepare(sql);
    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null; 
    }

    return db
      .prepare(`SELECT res_id, first_name, last_name, pgy_level, is_active FROM residents WHERE res_id = ?`)
      .get(res_id);
  }
};

export function registerIpcHandlers() {
  ipcMain.handle('get-resident-services', (event, res_id) =>
    db_api.getResidentServices(res_id)
  );

  ipcMain.handle(
    'set-resident-service',
    (event, res_id, week_start, newServiceName, isOvernight = false) =>
      db_api.setResidentService(res_id, week_start, newServiceName, isOvernight)
  );

  ipcMain.handle(
    'set-resident-vacation',
    (event, res_id, week_start, priority) =>
      db_api.setResidentVacation(res_id, week_start, priority)
  );

  ipcMain.handle('get-resident-vacations', (event, res_id) =>
    db_api.getResidentVacations(res_id)
  );

  ipcMain.handle(
  'get-full-schedule',
  withMiddleware(
    (event, schedule_set_id) => db_api.getFullSchedule(schedule_set_id),
    {
      label: 'Get Full Schedule',
      //format function moved here from react component
      format: (rows) => {
        
        if (!rows || rows.length === 0) {
          return { grouped: {}, weeks: [], weeklyCounts: [] };
        }

        // collect unique week starts
        const weekStarts = [...new Set(rows.map(r => r.week_start))].sort();
        console.log("📅 Unique week starts:", weekStarts);

        const weeks = weekStarts.map(ws => {
          const weekData = rows.find(r => r.week_start === ws);
          return {
            start: ws.slice(5).replaceAll("-", "/"),
            end: weekData.week_end.slice(5).replaceAll("-", "/")
          };
        });

        console.log("📋 Formatted weeks:", weeks.length);

        // mapping raw week_start to index
        const weekIndexMap = weekStarts.reduce((acc, ws, idx) => {
          acc[ws] = idx;
          return acc;
        }, {});

        const grouped = {};
        rows.forEach(row => {
          const name = row.resident_name;
          if (!grouped[name]) {
            grouped[name] = Array(weekStarts.length).fill("");
          }

          const weekIndex = weekIndexMap[row.week_start];
          if (weekIndex !== undefined) {
            grouped[name][weekIndex] = row.is_vacation ? "VAC" : row.service || "";
          }
        });

        console.log("👥 Grouped residents:", Object.keys(grouped).length);

        const weeklyCounts = weeks.map((_, i) => {
          return Object.values(grouped).filter(arr => {
            const val = arr[i];
            return val && val !== "" && val !== "VAC";
          }).length;
        });

        console.log("🔢 Weekly counts:", weeklyCounts);

        return { grouped, weeks, weeklyCounts };
      }
    }
  )
);

  ipcMain.handle('add-resident', (event, first_name, last_name, pgy_level) =>
    db_api.addResident(first_name, last_name, pgy_level)
  );

  ipcMain.handle('archive-resident', (event, res_id) =>
    db_api.archiveResident(res_id)
  );
  ipcMain.handle('unarchive-resident', (event, res_id) =>
    db_api.unarchiveResident(res_id)
  );
  ipcMain.handle('get-residents', (event, is_active) =>
    db_api.getResidents(is_active)
  );
  ipcMain.handle('get-services', (event, is_active = true)=>
    db_api.getServices(is_active)
  );
  ipcMain.handle('archive-service', (event, service_id) =>
    db_api.archiveService(service_id)
  );
  ipcMain.handle('unarchive-service', (event, service_id)=>
    db_api.unarchiveService(service_id)
  );
  ipcMain.handle('update-resident', (event, res_id, updates) =>
    db_api.updateResident(res_id, updates)
  );
}


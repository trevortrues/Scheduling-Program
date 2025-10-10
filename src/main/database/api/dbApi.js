import { ipcMain } from 'electron';
import { getDatabase } from '../connection/index.js';

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
             COALESCE(s.name, 'None') AS service,
             a.is_overnight, a.is_vacation, a.vacation_priority
      FROM assignments a
      JOIN residents r ON a.res_id = r.res_id
      JOIN weeks w ON a.week_id = w.week_id
      LEFT JOIN services s ON a.service_id = s.service_id
      WHERE w.schedule_set_id = ?
        AND r.is_active = 1
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
   * Archive (soft delete) a resident.
   * Marks the resident as inactive without removing assignments.
   *
   * @param {number} res_id - The resident ID to archive
   * @returns {number} Number of rows updated (should be 1 if successful)
   */
  archiveResident: (res_id) => {
    const db = getDatabase();
    const result = db.prepare(`
      UPDATE residents
      SET is_active = 0
      WHERE res_id = ?
    `).run(res_id);

    return result.changes;
  },
  /**
   * Unarchive a resident.
   * Marks the resident as active.
   *
   * @param {number} res_id - The resident ID to unarchive
   * @returns {number} Number of rows updated (should be 1 if successful)
   */
  unarchiveResident: (res_id) => {
    const db = getDatabase();
    const result = db.prepare(`
      UPDATE residents
      SET is_active = 1
      WHERE res_id = ?
    `).run(res_id);

    return result.changes;
  }
};

export function registerIpcHandlers() {
  ipcMain.handle('get-resident-assignments', (event, res_id) =>
    db_api.getResidentAssignments(res_id)
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

  ipcMain.handle('get-full-schedule', (event, schedule_set_id) =>
    db_api.getFullSchedule(schedule_set_id)
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
}

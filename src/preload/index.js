import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getResidentServices: (res_id) =>
    ipcRenderer.invoke('get-resident-services', res_id),

  setResidentService: (res_id, week_start, newService, isOvernight = false) =>
    ipcRenderer.invoke('set-resident-service', res_id, week_start, newService, isOvernight),

  setResidentVacation: (res_id, week_start, priority) =>
    ipcRenderer.invoke('set-resident-vacation', res_id, week_start, priority),

  getResidentVacations: (res_id) =>
    ipcRenderer.invoke('get-resident-vacations', res_id),

  getFullSchedule: (schedule_set_id) => 
    ipcRenderer.invoke('get-full-schedule', schedule_set_id),

  addResident: (first_name, last_name, pgy_level) => 
    ipcRenderer.invoke('add-resident', first_name, last_name, pgy_level),

  archiveResident: (res_id) => 
    ipcRenderer.invoke('archive-resident', res_id),

  unarchiveResident: (res_id) => 
    ipcRenderer.invoke('unarchive-resident', res_id),

  getResidents: (is_active) => 
    ipcRenderer.invoke('get-residents', is_active),

  getServices: (is_active) =>
    ipcRenderer.invoke('get-services', is_active),

  archiveService: (service_id) =>
    ipcRenderer.invoke('archive-service', service_id),

  unarchiveService: (service_id)=>
    ipcRenderer.invoke('unarchive-service', service_id),

  updateResident: (res_id, updates)=>
    ipcRenderer.invoke('update-resident', res_id, updates)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}

import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getResidentServices: (res_id) =>
    ipcRenderer.invoke('get-resident-services', res_id),

  updateResidentService: (res_id, week_start, newService) =>
    ipcRenderer.invoke('update-resident-service', res_id, week_start, newService),

  getResidentVacations: (res_id) => 
    ipcRenderer.invoke('get-resident-vacations', res_id)
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

import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './database/api/dbApi.js';
import icon from '../../resources/icon.png?asset'
import { seedDatabase } from './database/setup/initializeDb.js';
import path from 'path';
import fs from 'fs';
import { getDatabase } from './database/connection/index.js'; //new

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')
  const userDataPath = app.getPath('userData');
  const dbDir = path.join(userDataPath, 'Database');
  const dbPath = path.join(dbDir, 'schedule.db');

  //ensure directory exists
  if(!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, {recursive: true});
  }

   //check if database file exists AND has tables
  if(!fs.existsSync(dbPath)){
    console.log('Database file not found, creating and seeding...');
    seedDatabase();
  } else {
    console.log("Database file exists, checking tables...");
    
    //check if residents table exists
    try {
      //db connection
      const db = getDatabase();
      //check if residents exist
      const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='residents'").get();
      
      //if no residents reseed database, this is where code was stuck before this line added
      if (!tableCheck) {
        console.log('Residents table missing, reseeding database...');
        seedDatabase();
      } else {
        console.log('Database tables are intact');
      }
    } catch (error) {
      //if check fails then reseed
      console.log('Error checking tables, reseeding database:', error);
      seedDatabase();
    }
  }

  registerIpcHandlers();
  createWindow();

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))
 

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
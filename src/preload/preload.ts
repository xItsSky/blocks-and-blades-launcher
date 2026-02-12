import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  getServerStatus: () => ipcRenderer.invoke('get-server-status'),
  getRefreshInterval: () => ipcRenderer.invoke('get-refresh-interval'),
  onSetupProgress: (callback: (progress: number, message: string) => void) => 
    ipcRenderer.on('setup-progress', (_event, progress, message) => callback(progress, message)),
  onSetupFinished: (callback: () => void) => 
    ipcRenderer.on('setup-finished', () => callback()),
  onAuthSuccess: (callback: (name: string, uuid: string) => void) =>
    ipcRenderer.on('auth-success', (_event, name, uuid) => callback(name, uuid)),
  onAuthFailed: (callback: () => void) =>
    ipcRenderer.on('auth-failed', () => callback()),
  logout: () => ipcRenderer.invoke('logout'),
  launchGame: (rememberMe: boolean) => ipcRenderer.invoke('launch-game', rememberMe),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
});

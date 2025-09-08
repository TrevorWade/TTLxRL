const { contextBridge, ipcRenderer } = require('electron');

// Securely expose limited APIs to the renderer for photo mapping operations.
contextBridge.exposeInMainWorld('photoMap', {
  createGameFolder: (gameName) => ipcRenderer.invoke('photoMap:createGameFolder', gameName),
  openFolder: (folderPath) => ipcRenderer.invoke('photoMap:openFolder', folderPath),
  getBaseDir: () => ipcRenderer.invoke('photoMap:getBaseDir'),
  listProfiles: () => ipcRenderer.invoke('photoMap:listProfiles'),
  getActiveProfile: () => ipcRenderer.invoke('photoMap:getActiveProfile'),
  setActiveProfile: (gameName) => ipcRenderer.invoke('photoMap:setActiveProfile', gameName),
  selectImage: () => ipcRenderer.invoke('photoMap:selectImage'),
  saveMapping: (gameName, map) => ipcRenderer.invoke('photoMap:saveMapping', { gameName, map }),
  loadMapping: (gameName) => ipcRenderer.invoke('photoMap:loadMapping', gameName),
  // Read a local image file as a data URL for safe rendering when dev server origin blocks file://
  readFileAsDataUrl: (absPath) => ipcRenderer.invoke('photoMap:readFileDataUrl', absPath),
  // Open the overlay in a separate window
  openOverlayWindow: () => ipcRenderer.invoke('overlay:open'),
});



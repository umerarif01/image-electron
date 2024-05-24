import { contextBridge, ipcRenderer, nativeImage, clipboard } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  downloadImage: (imageUrl, prompt) => ipcRenderer.invoke('download-image', { imageUrl, prompt }),
  onDownloadComplete: (callback) =>
    ipcRenderer.on('download-complete', (event, downloadPath) => callback(event, downloadPath)),
  onDownloadError: (callback) =>
    ipcRenderer.on('download-error', (event, errorMessage) => callback(event, errorMessage)),
  showContextMenu: (imageUrl) => ipcRenderer.send('show-context-menu', imageUrl),
  copyImage: (imageUrl) => ipcRenderer.invoke('copy-image', imageUrl),
  onCopyComplete: (callback) =>
    ipcRenderer.on('copy-complete', (event, success) => callback(event, success)),
  onCopyError: (callback) =>
    ipcRenderer.on('copy-error', (event, errorMessage) => callback(event, errorMessage)),
  onImageCopying: (callback) => {
    ipcRenderer.on('image-copying', callback)
  },
  onImageCopied: (callback) => {
    ipcRenderer.on('image-copied', callback)
  }
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
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

ipcRenderer.on('context-menu-clicked', (event, imageUrl) => {
  console.log(event)
  const image = nativeImage.createFromDataURL(imageUrl)
  clipboard.writeImage(image)
})

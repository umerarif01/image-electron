import { ElectronAPI } from '@electron-toolkit/preload'

interface CustomAPI {
  downloadImage: (imageUrl: string, prompt: string) => Promise<void>
  onDownloadComplete: (callback: (event: any, downloadPath: string) => void) => void
  onDownloadError: (callback: (event: any, errorMessage: string) => void) => void
  showContextMenu: (imageUrl: string) => void // New method to show context menu
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomAPI
  }
}

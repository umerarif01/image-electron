import { app, shell, BrowserWindow, ipcMain, Menu, clipboard, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import fs from 'fs'
import https from 'https'
import path from 'path'
import sharp from 'sharp' // Import sharp for image processing

function createWindow(): void {
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

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.handle('download-image', async (event, { imageUrl, prompt }) => {
    const downloadPath = path.join(app.getPath('downloads'), `${prompt}.png`) // You can customize the filename and extension

    const file = fs.createWriteStream(downloadPath)

    https
      .get(imageUrl, (response) => {
        response.pipe(file)

        file.on('finish', () => {
          file.close()
          event.sender.send('download-complete', downloadPath) // Send back the download path
        })
      })
      .on('error', (err) => {
        fs.unlink(downloadPath, () => {}) // Delete the file if error occurs
        console.error('Error downloading image:', err)
        event.sender.send('download-error', err.message)
      })
  })

  ipcMain.handle('copy-image', async (event, imageUrl) => {
    try {
      // Load the image data directly
      const imageBuffer = await fetchImage(imageUrl)

      // Convert ArrayBuffer to Buffer
      const buffer = Buffer.from(imageBuffer)

      // Create a nativeImage object from the buffer
      const image = nativeImage.createFromBuffer(buffer)

      // Write the image to the clipboard
      clipboard.writeImage(image)

      // Send a success message
      event.sender.send('copy-complete', true)
    } catch (error) {
      console.error('Error copying image:', error)
      event.sender.send('copy-error', error)
    }
  })

  // Function to fetch image data
  const fetchImage = async (imageUrl) => {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`)
    }
    return response.arrayBuffer()
  }

  ipcMain.on('show-context-menu', async (event, imageUrl) => {
    const template = [
      {
        label: 'Copy Image',
        click: async () => {
          try {
            // Emit a custom event to indicate that the image is being copied
            event.sender.send('image-copying')

            // Load the image data directly
            const imageBuffer = await fetchImage(imageUrl)

            // Resize and reduce quality of the image using sharp
            const resizedImageBuffer = await sharp(imageBuffer)
              .jpeg({ quality: 60 }) // Adjust the quality as needed
              .toBuffer()

            // Convert ArrayBuffer to Buffer
            const buffer = Buffer.from(resizedImageBuffer)

            // Create a nativeImage object from the buffer
            const image = nativeImage.createFromBuffer(buffer)

            // Write the image to the clipboard
            clipboard.writeImage(image)

            // Emit a custom event to indicate that the image is copied
            event.sender.send('image-copied')
          } catch (error) {
            console.error('Error copying image:', error)
          }
        }
      }
    ]
    const menu = Menu.buildFromTemplate(template)
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      menu.popup({ window: win })
    }
  })
  createWindow()

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

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.

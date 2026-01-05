const { app, BrowserWindow, session } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: '🎄 Merry Christmas',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: false
    },
    backgroundColor: '#000000',
    icon: path.join(__dirname, 'build/icon.png')
  })

  // 自动允许摄像头和麦克风权限
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'mediaKeySystem', 'geolocation', 'notifications', 'midiSysex', 'pointerLock', 'fullscreen']
    if (allowedPermissions.includes(permission)) {
      callback(true) // 自动授权
    } else {
      callback(false)
    }
  })

  // 处理权限检查
  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    if (permission === 'media') {
      return true
    }
    return false
  })

  // 加载打包后的 index.html
  win.loadFile(path.join(__dirname, 'dist/index.html'))

  // 打开开发者工具以便调试
  // win.webContents.openDevTools()

  // 隐藏菜单栏
  win.setMenuBarVisibility(false)

  // 页面加载完成后，立即测试摄像头权限
  win.webContents.on('did-finish-load', async () => {
    console.log('Page loaded, testing camera access...')
    
    // 尝试在主进程中获取摄像头列表，触发权限请求
    const { systemPreferences } = require('electron')
    
    if (process.platform === 'darwin') {
      const cameraStatus = systemPreferences.getMediaAccessStatus('camera')
      console.log('Camera access status:', cameraStatus)
      
      if (cameraStatus !== 'granted') {
        console.log('Requesting camera access...')
        try {
          const granted = await systemPreferences.askForMediaAccess('camera')
          console.log('Camera access granted:', granted)
        } catch (err) {
          console.error('Failed to request camera access:', err)
        }
      }
    }
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  app.quit() // 关闭窗口就完全退出
})

# Electron Setup for TikTok Gift Key Mapper

This folder contains the Electron configuration for running your TikTok Gift Key Mapper as a desktop application.

## 📁 File Structure

```
electron/
├── main.js          # Main Electron process file
├── assets/
│   └── icon.ico    # Application icon (replace with your own)
└── README.md        # This file
```

## 🚀 Quick Start

### Development Mode
```bash
npm run electron-dev
```
This will:
1. Start the Vite dev server
2. Wait for it to be ready
3. Launch the Electron app

### Production Build
```bash
npm run build        # Build the React app
npm run electron-pack # Package as desktop app
```

## 🎨 Custom Icon

**Replace the placeholder icon:**
1. Convert your icon to `.ico` format
2. Include multiple resolutions: 16x16, 32x32, 48x48, 256x256
3. Place it in `electron/assets/icon.ico`

**Online icon converters:**
- [Convertio](https://convertio.co/png-ico/)
- [ICOConvert](https://icoconvert.com/)

## 🔧 Configuration

The main configuration is in `package.json`:
- **appId**: Unique identifier for your app
- **productName**: Display name in installer
- **target**: Windows installer type (nsis)
- **icon**: Path to your icon file

## 📦 Distribution

After building, you'll find the installer in:
```
frontend/dist-electron/
```

## 🛠️ Troubleshooting

### Common Issues:

1. **Icon not showing**: Make sure icon.ico has multiple resolutions
2. **Build fails**: Run `npm run build` first, then `npm run electron-pack`
3. **Dev mode issues**: Check that Vite dev server is running on port 5173

### Development Tips:

- Use `npm run electron-dev` for development
- DevTools open automatically in development mode
- Check console for any errors

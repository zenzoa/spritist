const fs = require('fs')
const menu = require('./menu')

exports.api = {
	'doesFileExist': filepath => {
		try {
			fs.accessSync(filepath, fs.constants.R_OK)
			return true
		} catch (error) {
			return false
		}
	},

	'readFile': (filepath, encoding) => {
		return fs.promises.readFile(filepath, { encoding })
	},

	'writeFile': (filepath, data, encoding) => {
		return fs.promises.writeFile(filepath, data, { encoding })
	},

	'dataToString': data => {
		let buffer = new Buffer(data, 'binary')
		return buffer.toString('base64')
	},

	'showOpenDialog': (defaultPath, filters) => {
		return new Promise((resolve, reject) => {
			let fileInput = nw.Window.get().window.document.getElementById('fileOpen')
			fileInput.accept = filters[0].extensions.map(e => '.' + e).join(',')
			fileInput.onchange = event => {
				const file = event.target.files[0]
				if (file) {
					let filePaths = [ file.path ]
					fileInput.value = null
					resolve({ filePaths })
				} else {
					reject()
				}
			}
			fileInput.click()
		})
	},

	'showSaveDialog': (defaultPath, defaultName, filters) => {
		return new Promise((resolve, reject) => {
			let fileInput = nw.Window.get().window.document.getElementById('fileSave')
			fileInput.nwsaveas = defaultName
			fileInput.nwworkingdir = defaultPath
			fileInput.onchange = event => {
				const file = event.target.files[0]
				if (file) {
					fileInput.value = null
					resolve(file.path)
				} else {
					reject()
				}
			}
			fileInput.click()
		})
	},

	'showConfirmDialog': message => {
		return new Promise(resolve => {
			let result = confirm(message)
			if (result) {
				resolve(0)
			} else {
				resolve(1)
			}
		})
	},

	'showErrorDialog': message => {
		alert(message)
	},

	'spriteIsOpen': (value, isSPR) => {
		menu.saveSprite.enabled = value
		menu.saveAsSprite.enabled = value
		menu.exportSPR.enabled = value
		menu.exportS16.enabled = value
		menu.exportC16.enabled = value
		menu.exportBLK.enabled = value
		menu.exportGIF.enabled = value
		menu.pasteFrame.enabled = value
		menu.selectAllFrames.enabled = value
		menu.insertImage.enabled = value
		menu.resetZoom.enabled = value
		menu.zoomIn.enabled = value
		menu.zoomOut.enabled = value
		menu.viewAsSprite.enabled = value
		menu.viewAsBackground.enabled = value
		menu.loadPalette.enabled = (value && isSPR)
		menu.convertPalette.enabled = (value && isSPR)
		menu.resetPalette.enabled = (value && isSPR)
	},

	'hasSelection': (value, frameCount, selectionCount, isBackground) => {
		menu.exportPNG.enabled = value && (frameCount === 1 || selectionCount === 1 || isBackground)
		menu.cutFrame.enabled = value && !isBackground
		menu.copyFrame.enabled = value && !isBackground
		menu.deleteFrame.enabled = value && !isBackground
		menu.deselectAllFrames.enabled = value && !isBackground
	},

	'setViewAsSprite': value => {
		menu.viewAsSprite.checked = value
		menu.viewAsBackground.checked = !value
	},

	'canUndo': value => {
		menu.undo.enabled = value
	},

	'canRedo': value => {
		menu.redo.enabled = value
	},

	'setTransparentColor': color => {
		if (color === 'black') {
			menu.setTransparentBlack.checked = true
			menu.setTransparentWhite.checked = false
			menu.setTransparentNone.checked = false
			nw.Window.get().window.sketch.setTransparentColor({ r: 0, g: 0, b: 0, a: 255 })
		} else if (color === 'white') {
			menu.setTransparentBlack.checked = false
			menu.setTransparentWhite.checked = true
			menu.setTransparentNone.checked = false
			nw.Window.get().window.sketch.setTransparentColor({ r: 255, g: 255, b: 255, a: 255 })
		} else if (color === 'none') {
			menu.setTransparentBlack.checked = false
			menu.setTransparentWhite.checked = false
			menu.setTransparentNone.checked = true
			nw.Window.get().window.sketch.setTransparentColor({ r: 0, g: 0, b: 0, a: 0 })
		}
	},

	'updateRecentFiles': (recentFiles, onOpen) => {
		menu.recentFiles = new nw.Menu()
		recentFiles.forEach(filePath => {
			menu.recentFiles.append(new nw.MenuItem({
				label: filePath,
				click: () => onOpen(filePath)
			}))
		})
		menu.openRecent.enabled = true
		menu.openRecent.submenu = menu.recentFiles
	}
}

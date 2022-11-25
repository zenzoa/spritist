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
		menu.openRecent.enabled = true
		menu.openRecent.submenu.items.forEach((item, i) => {
			menu.openRecent.submenu.removeAt(i)
		})
		recentFiles.forEach(filePath => {
			menu.openRecent.submenu.append(new nw.MenuItem({
				label: filePath,
				click: () => onOpen(filePath)
			}))
		})
	},

	'showSpritesheetImportModal': (image, path, filename, extension, callback) => {
		let document = nw.Window.get().window.document
		let spritesheetImportModal = document.getElementById('spritesheetImport')
		let filenameEl = document.getElementById('spritesheetFilename')
		let columnsEl = document.getElementById('spritesheetColumns')
		let rowsEl = document.getElementById('spritesheetRows')
		let tileWidthEl = document.getElementById('spritesheetTileWidth')
		let tileHeightEl = document.getElementById('spritesheetTileHeight')
		let openButton = document.getElementById('spritesheetOpenButton')
		let exportSPRButton = document.getElementById('spritesheetExportSPRButton')
		let exportS16Button = document.getElementById('spritesheetExportS16Button')
		let exportC16Button = document.getElementById('spritesheetExportC16Button')
		let errorEl = document.getElementById('spritesheetImportError')
		let actionsEl = document.getElementById('spritesheetImportActions')

		let checkForErrors = () => {
			if (
				parseFloat(columnsEl.value) !== parseInt(columnsEl.value) ||
				parseFloat(rowsEl.value) !== parseInt(rowsEl.value) ||
				parseFloat(tileWidthEl.value) !== parseInt(tileWidthEl.value) ||
				parseFloat(tileHeightEl.value) !== parseInt(tileHeightEl.value)
			) {
				errorEl.className = 'modal-error'
				actionsEl.className = 'modal-actions invisible'
			} else {
				errorEl.className = 'modal-error invisible'
				actionsEl.className = 'modal-actions'
			}
		}

		columnsEl.onchange = () => {
			tileWidthEl.value = image.width / parseInt(columnsEl.value)
			checkForErrors()
		}

		rowsEl.onchange = () => {
			tileHeightEl.value = image.height / parseInt(rowsEl.value)
			checkForErrors()
		}

		tileWidthEl.onchange = () => {
			columnsEl.value = image.width / parseInt(tileWidthEl.value)
			checkForErrors()
		}

		tileHeightEl.onchange = () => {
			rowsEl.value = image.height / parseInt(tileHeightEl.value)
			checkForErrors()
		}

		openButton.onclick = () => {
			callback('open', image, path, filename, parseInt(columnsEl.value), parseInt(rowsEl.value))
		}

		exportSPRButton.onclick = () => {
			callback('export-spr', image, path, filename, parseInt(columnsEl.value), parseInt(rowsEl.value))
		}

		exportS16Button.onclick = () => {
			callback('export-s16', image, path, filename, parseInt(columnsEl.value), parseInt(rowsEl.value))
		}

		exportC16Button.onclick = () => {
			callback('export-c16', image, path, filename, parseInt(columnsEl.value), parseInt(rowsEl.value))
		}

		spritesheetImportModal.className = 'modal'
		filenameEl.textContent = filename + '.' + extension

		let cols = parseInt(columnsEl.value)
		let rows = parseInt(rowsEl.value)
		tileWidthEl.value = image.width / cols
		tileHeightEl.value = image.height / rows

		checkForErrors()
	},

	'hideSpritesheetImportModal': () => {
		let spritesheetImportModal = nw.Window.get().window.document.getElementById('spritesheetImport')
		spritesheetImportModal.className = 'invisible modal'
	},

	'showSpritesheetExportModal': () => {
		let spritesheetExportModal = nw.Window.get().window.document.getElementById('spritesheetExport')
		spritesheetExportModal.className = 'modal'
	},

	'hideSpritesheetExportModal': () => {
		let spritesheetExportModal = nw.Window.get().window.document.getElementById('spritesheetExport')
		spritesheetExportModal.className = 'invisible modal'
	}
}

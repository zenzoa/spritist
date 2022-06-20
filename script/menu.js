const isMac = process.platform === 'darwin'

let buildFileMenu = () => {
	let fileMenu = new nw.Menu()

	exports.newSprite = new nw.MenuItem({
		label: 'New',
		modifiers: isMac ? 'cmd' : 'ctrl',
		key: 'n',
		click: () => nw.Window.get().window.sketch.newSprite()
	})
	fileMenu.append(exports.newSprite)

	exports.openSprite = new nw.MenuItem({
		label: 'Open...',
		modifiers: isMac ? 'cmd' : 'ctrl',
		key: 'o',
		click: () => nw.Window.get().window.sketch.openSprite()
	})
	fileMenu.append(exports.openSprite)

	fileMenu.append(new nw.MenuItem({ type: 'separator' }))

	exports.saveSprite = new nw.MenuItem({
		label: 'Save',
		modifiers: isMac ? 'cmd' : 'ctrl',
		key: 's',
		enabled: false,
		click: () => nw.Window.get().window.sketch.saveSprite()
	})
	fileMenu.append(exports.saveSprite)

	exports.saveAsSprite = new nw.MenuItem({
		label: 'Save As...',
		modifiers: isMac ? 'shift+cmd' : 'ctrl+shift',
		key: 's',
		enabled: false,
		click: () => nw.Window.get().window.sketch.saveAsSprite()
	})
	fileMenu.append(exports.saveAsSprite)

	fileMenu.append(new nw.MenuItem({ type: 'separator' }))

	exports.exportSPR = new nw.MenuItem({
		label: 'Export As SPR...',
		enabled: false,
		click: () => nw.Window.get().window.sketch.exportSPR()
	})
	fileMenu.append(exports.exportSPR)

	exports.exportS16 = new nw.MenuItem({
		label: 'Export As S16...',
		enabled: false,
		click: () => nw.Window.get().window.sketch.exportS16()
	})
	fileMenu.append(exports.exportS16)

	exports.exportC16 = new nw.MenuItem({
		label: 'Export As C16...',
		enabled: false,
		click: () => nw.Window.get().window.sketch.exportC16()
	})
	fileMenu.append(exports.exportC16)

	exports.exportBLK = new nw.MenuItem({
		label: 'Export As BLK...',
		enabled: false,
		click: () => nw.Window.get().window.sketch.exportBLK()
	})
	fileMenu.append(exports.exportBLK)

	fileMenu.append(new nw.MenuItem({ type: 'separator' }))

	exports.exportPNG = new nw.MenuItem({
		label: 'Export As PNG...',
		modifiers: isMac ? 'cmd' : 'ctrl',
		key: 'e',
		enabled: false,
		click: () => nw.Window.get().window.sketch.exportPNG()
	})
	fileMenu.append(exports.exportPNG)

	exports.exportGIF = new nw.MenuItem({
		label: 'Export As GIF...',
		modifiers: isMac ? 'shift+cmd' : 'ctrl+shift',
		key: 'e',
		enabled: false,
		click: () => nw.Window.get().window.sketch.exportGIF()
	})
	fileMenu.append(exports.exportGIF)

	return fileMenu
}

let buildEditMenu = () => {
	let editMenu = new nw.Menu()

	exports.undo = new nw.MenuItem({
		label: 'Undo',
		modifiers: isMac ? 'cmd' : 'ctrl',
		key: 'z',
		enabled: false,
		click: () => nw.Window.get().window.sketch.undo()
	})
	editMenu.append(exports.undo)

	exports.redo = new nw.MenuItem({
		label: 'Redo',
		modifiers: isMac ? 'shift+cmd' : 'ctrl+shift',
		key: 'z',
		enabled: false,
		click: () => nw.Window.get().window.sketch.redo()
	})
	editMenu.append(exports.redo)

	editMenu.append(new nw.MenuItem({ type: 'separator' }))

	exports.cutFrame = new nw.MenuItem({
		label: 'Cut',
		modifiers: isMac ? 'cmd' : 'ctrl',
		key: 'x',
		enabled: false,
		click: () => nw.Window.get().window.sketch.cutFrame()
	})
	editMenu.append(exports.cutFrame)

	exports.copyFrame = new nw.MenuItem({
		label: 'Copy',
		modifiers: isMac ? 'cmd' : 'ctrl',
		key: 'c',
		enabled: false,
		click: () => nw.Window.get().window.sketch.copyFrame()
	})
	editMenu.append(exports.copyFrame)

	exports.pasteFrame = new nw.MenuItem({
		label: 'Paste',
		modifiers: isMac ? 'cmd' : 'ctrl',
		key: 'v',
		enabled: false,
		click: () => nw.Window.get().window.sketch.pasteFrame()
	})
	editMenu.append(exports.pasteFrame)

	exports.deleteFrame = new nw.MenuItem({
		label: 'Delete',
		key: 'Delete',
		enabled: false,
		click: () => nw.Window.get().window.sketch.deleteFrame()
	})
	editMenu.append(exports.deleteFrame)

	editMenu.append(new nw.MenuItem({ type: 'separator' }))

	exports.selectAllFrames = new nw.MenuItem({
		label: 'Select All',
		modifiers: isMac ? 'cmd' : 'ctrl',
		key: 'a',
		enabled: false,
		click: () => nw.Window.get().window.sketch.selectAllFrames()
	})
	editMenu.append(exports.selectAllFrames)

	exports.deselectAllFrames = new nw.MenuItem({
		label: 'Deselect',
		modifiers: isMac ? 'shift+cmd' : 'ctrl+shift',
		key: 'a',
		enabled: false,
		click: () => nw.Window.get().window.sketch.deselectAllFrames()
	})
	editMenu.append(exports.deselectAllFrames)

	editMenu.append(new nw.MenuItem({ type: 'separator' }))

	exports.insertImage = new nw.MenuItem({
		label: 'Insert Image...',
		modifiers: isMac ? 'cmd' : 'ctrl',
		key: 'i',
		enabled: false,
		click: () => nw.Window.get().window.sketch.insertImage()
	})
	editMenu.append(exports.insertImage)

	return editMenu
}

let buildViewMenu = () => {
	let viewMenu = new nw.Menu()

	exports.resetZoom = new nw.MenuItem({
		label: '100%',
		modifiers: isMac ? 'cmd' : 'ctrl',
		key: '0',
		enabled: false,
		click: () => nw.Window.get().window.sketch.resetZoom()
	})
	viewMenu.append(exports.resetZoom)

	exports.zoomIn = new nw.MenuItem({
		label: 'Zoom In',
		modifiers: isMac ? 'cmd' : 'ctrl',
		key: '=',
		enabled: false,
		click: () => nw.Window.get().window.sketch.zoomIn()
	})
	viewMenu.append(exports.zoomIn)

	exports.zoomOut = new nw.MenuItem({
		label: 'Zoom Out',
		modifiers: isMac ? 'cmd' : 'ctrl',
		key: '-',
		enabled: false,
		click: () => nw.Window.get().window.sketch.zoomOut()
	})
	viewMenu.append(exports.zoomOut)

	viewMenu.append(new nw.MenuItem({ type: 'separator' }))

	exports.loadPalette = new nw.MenuItem({
		label: 'Load Palette...',
		enabled: false,
		click: () => nw.Window.get().window.sketch.loadPalette()
	})
	viewMenu.append(exports.loadPalette)

	exports.convertPalette = new nw.MenuItem({
		label: 'Convert to Palette...',
		enabled: false,
		click: () => nw.Window.get().window.sketch.convertPalette()
	})
	viewMenu.append(exports.convertPalette)

	exports.resetPalette = new nw.MenuItem({
		label: 'Reset Palette',
		enabled: false,
		click: () => nw.Window.get().window.sketch.resetPalette()
	})
	viewMenu.append(exports.resetPalette)

	viewMenu.append(new nw.MenuItem({ type: 'separator' }))

	exports.viewAsSprite = new nw.MenuItem({
		label: 'View As Sprite',
		type: 'checkbox',
		checked: true,
		enabled: false,
		click: () => nw.Window.get().window.sketch.viewAsSprite()
	})
	viewMenu.append(exports.viewAsSprite)

	exports.viewAsBackground = new nw.MenuItem({
		label: 'View As Background',
		type: 'checkbox',
		enabled: false,
		click: () => nw.Window.get().window.sketch.viewAsBackground()
	})
	viewMenu.append(exports.viewAsBackground)

	viewMenu.append(new nw.MenuItem({ type: 'separator' }))

	let transparentMenu = new nw.Menu()
	exports.setTransparentBlack = new nw.MenuItem({
		label: 'Black',
		type: 'checkbox',
		checked: true,
		click: () => nw.Window.get().window.api.setTransparentColor('black')
	})
	transparentMenu.append(exports.setTransparentBlack)
	exports.setTransparentWhite = new nw.MenuItem({
		label: 'White',
		type: 'checkbox',
		click: () => nw.Window.get().window.api.setTransparentColor('white')
	})
	transparentMenu.append(exports.setTransparentWhite)
	exports.setTransparentNone = new nw.MenuItem({
		label: 'Transparent',
		type: 'checkbox',
		click: () => nw.Window.get().window.api.setTransparentColor('none')
	})
	transparentMenu.append(exports.setTransparentNone)
	exports.setTransparentColor = new nw.MenuItem({
		label: 'Transparent Color',
		submenu: transparentMenu
	})
	viewMenu.append(exports.setTransparentColor)

	return viewMenu
}

exports.buildMenu = () => {
	let menu = new nw.Menu({ type: 'menubar' })

	let fileMenu = new nw.MenuItem({
		label: 'File',
		submenu: buildFileMenu()
	})

	let editMenu = new nw.MenuItem({
		label: 'Edit',
		submenu: buildEditMenu()
	})

	let viewMenu = new nw.MenuItem({
		label: 'View',
		submenu: buildViewMenu()
	})

	if (isMac) {
		menu.createMacBuiltin('Spritist', { hideEdit: true, hideWindow: false })
		menu.insert(fileMenu, 1)
		menu.insert(editMenu, 2)
		menu.insert(viewMenu, 3)
	} else {
		menu.append(fileMenu)
		menu.append(editMenu)
		menu.append(viewMenu)
	}

	return menu
}

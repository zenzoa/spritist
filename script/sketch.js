class Sketch {
	constructor() {
		this.currentSprite = null

		this.isDragging = false
		this.xStart = 0
		this.yStart = 0
		this.xLast = 0
		this.yLast = 0

		this.spriteView = true

		this.scale = 1
		this.xOffset = 0
		this.yOffset = 0

		this.statusPanelHeight = 50

		this.isScrolling = false
		this.isScrollingHorizontal = false
		this.showScrollbar = false
		this.showScrollbarHorizontal = false
		this.scrollbarWidth = 10
		this.scrollThumbTop = 0
		this.scrollThumbHeight = 0
		this.scrollThumbLeft = 0
		this.scrollThumbWidth = 0

		this.recentFiles = []
	}

	setup(p) {
		window.p = p
		p.createCanvas(p.windowWidth, p.windowHeight - this.statusPanelHeight)

		p.noSmooth()
		p.textSize(12)
		p.textLeading(14)
		p.textStyle(p.BOLD)
		p.textAlign(p.CENTER)

		document.body.addEventListener('contextmenu', event => {
			event.preventDefault()
			return false
		}, false)

		let mainWindow = nw.Window.get()
		mainWindow.on('close', () => {
			let reallyClose = true
			if (this.currentSprite && this.currentSprite.isModified) {
				let response = confirm('Are you sure you want to quit without saving?')
				if (!response) {
					reallyClose = false
				}
			}
			if (reallyClose) {
				mainWindow.close(true)
				nw.App.quit()
			}
		})
	}

	draw(p) {
		p.clear()
		if (this.currentSprite) {
			p.push()
			if (this.scale !== 1) p.scale(this.scale)
			if (this.xOffset !== 0 || this.yOffset !== 0) p.translate(this.xOffset, this.yOffset)
			if (this.currentSprite.isBackground) {
				this.currentSprite.drawAsBackground(p, this.scale, this.xOffset, this.yOffset)
			} else {
				this.currentSprite.draw(p, this.scale, this.xOffset, this.yOffset)
			}
			p.pop()

			if (this.showScrollbar) {
				p.fill(100)
				p.noStroke()
				p.rect(p.windowWidth - this.scrollbarWidth, 0, this.scrollbarWidth, p.windowHeight - this.statusPanelHeight)
				p.fill(68)
				p.rect(p.windowWidth - this.scrollbarWidth, this.scrollThumbTop, this.scrollbarWidth, this.scrollThumbHeight)
			}

			if (this.showScrollbarHorizontal) {
				p.fill(100)
				p.noStroke()
				p.rect(0, p.windowHeight - this.statusPanelHeight - this.scrollbarWidth, p.windowWidth, this.scrollbarWidth)
				p.fill(68)
				p.rect(this.scrollThumbLeft, p.windowHeight - this.statusPanelHeight - this.scrollbarWidth, this.scrollThumbWidth, this.scrollbarWidth)
			}
		}
	}

	windowResized(p) {
		let w = p.windowWidth
		let h = p.windowHeight - this.statusPanelHeight
		p.resizeCanvas(w, h)
		if (this.currentSprite) {
			this.currentSprite.setMaxFrameSize()
			this.updateScrollbar()
		}
	}

	mousePressed(p) {
		let x = p.mouseX / this.scale - this.xOffset
		let y = p.mouseY / this.scale - this.yOffset

		this.xStart = x
		this.yStart = y
		this.xLast = x
		this.yLast = y

		if (this.showScrollbar && p.mouseX >= p.windowWidth - this.scrollbarWidth) {
			this.isScrolling = true
			this.yOffsetStart = this.yOffset
			this.yMouseStart = p.mouseY
		}

		if (this.showScrollbarHorizontal && p.mouseY >= p.windowHeight - this.statusPanelHeight - this.scrollbarWidth) {
			this.isScrollingHorizontal = true
			this.xOffsetStart = this.xOffset
			this.xMouseStart = p.mouseX
		}
	}

	mouseDragged(p) {
		let x = p.mouseX / this.scale - this.xOffset
		let y = p.mouseY / this.scale - this.yOffset

		let dx = x - this.xStart
		let dy = y - this.yStart

		let sprite = this.currentSprite

		if (this.isScrolling && sprite) {
			let scrollbarHeight = p.windowHeight - this.statusPanelHeight
			if (this.showScrollbarHorizontal) scrollbarHeight -= this.scrollbarWidth
			let scrollbarChange = (p.mouseY - this.yMouseStart) / scrollbarHeight
			let bgHeight = sprite.bgHeight * sprite.maxFrameHeight + sprite.vGap * 2
			let spriteHeight = this.currentSprite.isBackground ? bgHeight : sprite.totalFramesHeight
			let offsetChange = scrollbarChange * spriteHeight
			this.scrollTo(null, this.yOffsetStart - offsetChange)

		} else if (this.isScrollingHorizontal && sprite) {
			let scrollbarWidth = p.windowWidth - (this.showScrollbar ? this.scrollbarWidth : 0)
			let scrollbarChange = (p.mouseX - this.xMouseStart) / scrollbarWidth
			let bgWidth = sprite.bgWidth * sprite.maxFrameWidth + sprite.hGap * 2
			let offsetChange = scrollbarChange * bgWidth
			this.scrollTo(this.xOffsetStart - offsetChange, null)

		} else if (sprite && sprite.isBackground) {
			this.scrollTo(this.xOffset + dx / this.scale, this.yOffset + dy / this.scale)

		} else if (dx**2 + dy**2 > 10**2 && sprite && !sprite.isDragging) {
			if (!sprite.isFrameSelected(x, y) && sprite.selectedFrames.length < 2) {
				sprite.deselectAllFrames()
				sprite.selectFrame(x, y)
			}
			if (sprite.isFrameSelected(x, y)) {
				sprite.startDrag(x, y)
			}
		}

		this.xLast = x
		this.yLast = y
	}

	mouseReleased(p) {
		let x = p.mouseX / this.scale - this.xOffset
		let y = p.mouseY / this.scale - this.yOffset

		this.isScrolling = false
		this.isScrollingHorizontal = false

		if (this.currentSprite && !this.currentSprite.isBackground) {
			if (this.currentSprite.isDragging) {
				this.currentSprite.endDrag(x, y)
			} else {
				if (!p.keyIsDown(p.CONTROL)) {
					this.currentSprite.deselectAllFrames()
				}
				let selectRange = p.keyIsDown(p.SHIFT)
				let allowToggleOff = p.keyIsDown(p.CONTROL)
				this.currentSprite.selectFrame(x, y, selectRange, allowToggleOff)
			}
		}
	}

	mouseWheel(p, event) {
		if (this.currentSprite) {
			if (event.delta > 0) {
				this.scrollTo(null, this.yOffset - 5)
			} else if (event.delta < 0) {
				this.scrollTo(null, this.yOffset + 5)
			}
		}
	}

	keyPressed(p) {
		if (this.currentSprite && this.currentSprite.frames.length > 0 && !this.currentSprite.isBackground) {
			let sprite = this.currentSprite
			let firstSelection = sprite.selectedFrames.length > 0 ? sprite.selectedFrames[0] : 0
			let lastSelection = sprite.selectedFrames.length > 0 ? sprite.selectedFrames[sprite.selectedFrames.length - 1] : -1
			let framesPerRow = Math.floor((p.windowWidth / this.scale - sprite.hGap) / (sprite.maxFrameWidth + sprite.hGap))

			if (p.keyCode === p.UP_ARROW) {
				let prevSelection = Math.max(firstSelection - framesPerRow, 0)
				sprite.selectedFrames = [prevSelection]
				let frameTop = Math.floor(prevSelection / framesPerRow) * (sprite.maxFrameHeight + sprite.vGap)
				if (frameTop + this.yOffset < 0) {
					this.scrollTo(null, -frameTop)
				}

			} else if (p.keyCode === p.DOWN_ARROW) {
				let nextSelection = Math.min(lastSelection + framesPerRow, sprite.frames.length - 1)
				sprite.selectedFrames = [nextSelection]
				let frameBottom = (Math.floor(nextSelection / framesPerRow) + 1) * (sprite.maxFrameHeight + sprite.vGap) + 8
				if ((frameBottom + this.yOffset) * this.scale > p.windowHeight - this.statusPanelHeight) {
					this.scrollTo(null, -frameBottom + (p.windowHeight - this.statusPanelHeight) / this.scale)
				}

			} else if (p.keyCode === p.LEFT_ARROW) {
				let prevSelection = Math.max(firstSelection - 1, 0)
				sprite.selectedFrames = [prevSelection]

			} else if (p.keyCode === p.RIGHT_ARROW) {
				let nextSelection = Math.min(lastSelection + 1, sprite.frames.length - 1)
				sprite.selectedFrames = [nextSelection]

			} else if (p.keyCode === 33) { // page up
				let prevSelection = Math.max(firstSelection - framesPerRow * 5, 0)
				sprite.selectedFrames = [prevSelection]

			} else if (p.keyCode === 34) { // page down
				let nextSelection = Math.min(lastSelection + framesPerRow * 5, sprite.frames.length - 1)
				sprite.selectedFrames = [nextSelection]

			} else if (p.keyCode === 36) { // home
				sprite.selectedFrames = [0]
				this.scrollTo(0, 0)

			} else if (p.keyCode === 35) { // end
				sprite.selectedFrames = [sprite.frames.length - 1]
				this.scrollTo(null, -sprite.totalFramesHeight + (p.windowHeight - this.statusPanelHeight) / this.scale)
			}

		} else if (this.currentSprite && this.currentSprite.isBackground) {
			if (p.keyCode === p.UP_ARROW) {
				this.scrollTo(null, this.yOffset + 100)
			} else if (p.keyCode === p.DOWN_ARROW) {
				this.scrollTo(null, this.yOffset - 100)
			} else if (p.keyCode === p.LEFT_ARROW) {
				this.scrollTo(this.xOffset + 100, null)
			} else if (p.keyCode === p.RIGHT_ARROW) {
				this.scrollTo(this.xOffset - 100, null)
			}
		}
	}

	updateScrollbar() {
		if (this.currentSprite) {
			let sprite = this.currentSprite
			if (sprite.isBackground) {
				let bgWidth = sprite.bgWidth * sprite.maxFrameWidth + sprite.hGap * 2
				let bgHeight = sprite.bgHeight * sprite.maxFrameHeight + sprite.vGap * 2

				this.showScrollbarHorizontal = bgWidth * this.scale > p.windowWidth
				this.showScrollbar = bgHeight * this.scale > p.windowHeight - this.statusPanelHeight

				let displayWidth = p.windowWidth - (this.showScrollbar ? this.scrollbarWidth : 0)
				let displayHeight = p.windowHeight - this.statusPanelHeight - (this.showScrollbarHorizontal ? this.scrollbarWidth : 0)

				let thumbHeightPercent = displayHeight / (bgHeight * this.scale)
				this.scrollThumbHeight = Math.floor(thumbHeightPercent * displayHeight)
				this.scrollThumbTop = Math.floor((-this.yOffset / bgHeight) * displayHeight)

				let thumbWidthPercent = displayWidth / (bgWidth * this.scale)
				this.scrollThumbWidth = Math.floor(thumbWidthPercent * displayWidth)
				this.scrollThumbLeft = Math.floor((-this.xOffset / bgWidth) * displayWidth)

			} else {
				this.showScrollbarHorizontal = false
				this.showScrollbar = sprite.totalFramesHeight * this.scale > p.windowHeight - this.statusPanelHeight

				let displayHeight = p.windowHeight - this.statusPanelHeight

				let thumbHeightPercent = displayHeight / (sprite.totalFramesHeight * this.scale)
				this.scrollThumbHeight = Math.floor(thumbHeightPercent * displayHeight)
				this.scrollThumbTop = Math.floor((-this.yOffset / sprite.totalFramesHeight) * displayHeight)
			}
		}
	}

	scrollTo(x, y) {
		if (this.currentSprite) {
			let sprite = this.currentSprite

			if (x != null) {
				this.xOffset = Math.floor(x)
			}
			if (y != null) {
				this.yOffset = Math.floor(y)
			}

			if (this.xOffset > 0) {
				this.xOffset = 0
			}
			if (this.yOffset > 0) {
				this.yOffset = 0
			}

			if (sprite.isBackground) {
				let bgWidth = sprite.bgWidth * sprite.maxFrameWidth + sprite.hGap * 2
				let bgHeight = sprite.bgHeight * sprite.maxFrameHeight + sprite.vGap * 2
				let displayWidth = p.windowWidth - (this.showScrollbar ? this.scrollbarWidth : 0)
				let displayHeight = p.windowHeight - this.statusPanelHeight - (this.showScrollbarHorizontal ? this.scrollbarWidth : 0)
				let xMin = -bgWidth + displayWidth / this.scale
				let yMin = -bgHeight + displayHeight / this.scale
				if (this.xOffset < xMin) this.xOffset = Math.floor(xMin)
				if (this.yOffset < yMin) this.yOffset = Math.floor(yMin)

			} else {
				let yMin = -sprite.totalFramesHeight + (p.windowHeight - this.statusPanelHeight) / this.scale
				if (this.yOffset < yMin && this.yOffset < 0) {
					this.yOffset = Math.floor(yMin)
				}
			}

			this.updateScrollbar()
		}
	}

	updateTitle() {
		let title = 'Spritist'
		if (this.currentSprite) {
			title += ' - ' + this.currentSprite.filename + '.' + this.currentSprite.extension
			if (this.currentSprite.isModified) {
				title += '*'
			}
		}
		document.title = title
	}

	newSprite() {

		let createIt = () => {
			this.currentSprite = new Sprite()
			this.updateTitle()
			this.viewAsSprite()
			this.windowResized(window.p)
			window.api.spriteIsOpen(true)
			this.currentSprite.updateSelection()
			this.resetZoom()
		}

		if (this.currentSprite && this.currentSprite.isModified) {
			window.api.showConfirmDialog('Are you sure you want to create a new sprite?\nUnsaved changes will be lost.').then(response => {
				if (response === 0) {
					createIt()
				}
			})
		} else {
			createIt()
		}
	}

	loadSprite(filePath, onSuccess) {
		let path = filePath.match(/^.*[\\\/]/)[0]
		let filename = filePath.match(/([^\\//]+)\./)[1]
		let extension = (filePath.match(/\.([\w\s]+)$/)[1]).toLowerCase()
		let loader = null
		if (extension === 'c16') {
			loader = c16.load
		} else if (extension === 's16' || extension === 'n16' || extension === 'm16') {
			loader = s16.load
		} else if (extension === 'spr') {
			loader = spr.load
		} else if (extension === 'blk') {
			loader = blk.load
		} else if (extension === 'png') {
			loader = png.load
		} else if (extension === 'gif') {
			loader = gif.load
		} else if (extension === 'dta') {
			loader = charset.load
		} else if (extension === 'photo album') {
			loader = photoalbum.load
		}
		if (loader) {
			try {
				loader(filePath, sprite => onSuccess(sprite, path, filename, extension))
				this.addRecentFile(filePath)
			} catch (error) {
				window.api.showErrorDialog('Unable to open sprite. Invalid data.')
				console.log(error)
			}
		}
	}

	askForSprite(onSuccess) {
		window.api.showOpenDialog('', [
			{ name: 'Images', extensions: ['spr', 's16', 'c16', 'n16', 'm16', 'blk', 'png', 'gif', 'dta', 'Photo Album'] },
			{ name: 'All Files', extensions: ['*'] }
		]).then(result => {
			if (result.filePaths.length > 0) {
				let filePath = result.filePaths[0]
				onSuccess(filePath)
			}
		})
	}

	openSprite(givenFilePath) {
		let loadFromFile = filePath => {
			this.loadSprite(filePath, (sprite, path, filename, extension) => {
				this.currentSprite = sprite
				this.currentSprite.path = path
				this.currentSprite.filename = filename
				this.currentSprite.extension = extension
				filename = filename.toLowerCase()

				if (extension === 'blk' || filename === 'back') {
					if (filename + '.' + extension === 'back.spr') {
						// C1 background
						this.currentSprite.bgWidth = 58
						this.currentSprite.bgHeight = 8
					} else if (filename + '.' + extension === 'back.s16') {
						// C2 background
						this.currentSprite.bgWidth = 58
						this.currentSprite.bgHeight = 16
					}
					document.getElementById('bgWidth').value = this.currentSprite.bgWidth
					document.getElementById('bgHeight').value = this.currentSprite.bgHeight
					this.viewAsBackground()

				} else {
					this.viewAsSprite()
				}

				this.currentSprite.updateSelection()
				this.updateTitle()
				window.api.spriteIsOpen(true, extension === 'spr')
			})
		}

		if (this.currentSprite && this.currentSprite.isModified) {
			window.api.showConfirmDialog('Are you sure you want to open a new sprite?\nUnsaved changes will be lost.').then(response => {
				if (response === 0) {
					if (givenFilePath) {
						loadFromFile(givenFilePath)
					} else {
						this.askForSprite(f => loadFromFile(f))
					}
				}
			})
		} else if (givenFilePath) {
			loadFromFile(givenFilePath)
		} else {
			this.askForSprite(f => loadFromFile(f))
		}
	}

	insertImage() {
		if (this.currentSprite) {
			this.askForSprite(filePath => {
				this.loadSprite(filePath, sprite => {
					if (this.currentSprite.extension === 'spr') {
						sprite.frames.forEach(frame => {
							palette.swapPalette(frame, palette.table, palette.table)
						})
					}
					let index = this.currentSprite.frames.length
					if (this.currentSprite.selectedFrames.length > 0) {
						this.currentSprite.selectedFrames.sort()
						index = this.currentSprite.selectedFrames[this.currentSprite.selectedFrames.length - 1] + 1
					}
					this.currentSprite.insertFrame(sprite.frames, index)
					this.currentSprite.deselectAllFrames()
				})
			})
		}
	}

	saveSprite(filePath, extension, isExporting, isSavingAs) {
		if (this.currentSprite) {
			filePath = filePath || this.currentSprite.path + this.currentSprite.filename + '.' + this.currentSprite.extension
			extension = extension || this.currentSprite.extension
			let fileExists = window.api.doesFileExist(filePath)
			if (!isSavingAs && !fileExists) {
				this.saveAsSprite(extension, isExporting)
				return
			}
			try {
				if (extension === 'c16') {
					c16.save(filePath, this.currentSprite)
				} else if (extension === 's16') {
					s16.save(filePath, this.currentSprite)
				} else if (extension === 'spr') {
					spr.save(filePath, this.currentSprite)
				} else if (extension === 'blk') {
					blk.save(filePath, this.currentSprite)
				} else {
					window.api.showErrorDialog(extension.toUpperCase() + ' is not supported for saving.')
					return
				}
				if (!isExporting) {
					this.currentSprite.path = filePath.match(/^.*[\\\/]/)[0]
					this.currentSprite.filename = filePath.match(/([^\\//]+)\./)[1]
					this.currentSprite.extension = extension.toLowerCase()
					this.currentSprite.setModified(false)
				}
			} catch (error) {
				window.api.showErrorDialog('Unable to save ' + extension.toUpperCase() + ' file.')
				console.log(error)
			}
		}
	}

	saveAsSprite(extension, isExporting) {
		if (this.currentSprite) {
			extension = extension || this.currentSprite.extension
			let defaultPath = this.currentSprite.path || ''
			let defaultName = (this.currentSprite.filename || 'untitled') + '.' + extension
			window.api.showSaveDialog(defaultPath, defaultName, [
				{ name: 'Sprites', extensions: [extension] },
				{ name: 'All Files', extensions: ['*'] }
			]).then(filePath => {
				if (filePath) {
					this.saveSprite(filePath, extension, isExporting, true)
					this.addRecentFile(filePath)
				}
			})
		}
	}

	exportSPR() {
		this.saveAsSprite('spr', true)
	}

	exportS16() {
		this.saveAsSprite('s16', true)
	}

	exportC16() {
		this.saveAsSprite('c16', true)
	}

	exportBLK() {
		this.saveAsSprite('blk', true)
	}

	exportPNG() {
		if (this.currentSprite) {
			png.save(this.currentSprite)
		}
	}

	exportGIF() {
		if (this.currentSprite) {
			gif.save(this.currentSprite)
		}
	}

	importSpritesheet() {
		let exportAsSprite = (sprite, path, filename, extension) => {
			let filePath = path + filename + '.' + extension

			let saveSpritesheetAsSprite = () => {
				try {
					if (extension === 'spr') {
						spr.save(filePath, sprite)
					} else if (extension === 's16') {
						s16.save(filePath, sprite)
					} else if (extension === 'c16') {
						c16.save(filePath, sprite)
					}
					window.api.showErrorDialog(extension.toUpperCase() + ' file saved successfully!')
				} catch (error) {
					window.api.showErrorDialog('Unable to save ' + extension.toUpperCase() + ' file.')
					console.log(error)
				}
			}

			let fileExists = window.api.doesFileExist(filePath)
			if (fileExists) {
				window.api.showConfirmDialog(filename + '.' + extension + ' already exists. Do you want to overwrite it?').then(response => {
					if (response === 0) {
						saveSpritesheetAsSprite()
					} else {
						window.api.showErrorDialog(extension.toUpperCase() + ' file not saved.')
					}
				})
			} else {
				saveSpritesheetAsSprite()
			}

		}

		let openSpritesheet = (action, image, path, filename, cols, rows) => {
			let sprite = spritesheet.toSprite(image, cols, rows)

			if (action === 'open') {
				let finishOpeningSpreadsheet = () => {
					window.api.hideSpritesheetImportModal()
					this.currentSprite = sprite
					this.currentSprite.path = path
					this.currentSprite.filename = filename
					this.currentSprite.isModified = true
					this.viewAsSprite()
					this.currentSprite.updateSelection()
					this.updateTitle()
					window.api.spriteIsOpen(true)
				}
				if (this.currentSprite && this.currentSprite.isModified) {
					window.api.showConfirmDialog('Are you sure you want to open a new sprite?\nUnsaved changes will be lost.').then(response => {
						if (response === 0) {
							finishOpeningSpreadsheet()
						}
					})
				} else {
					finishOpeningSpreadsheet()
				}
			} else if (action === 'export-spr') {
				exportAsSprite(sprite, path, filename, 'spr')
			} else if (action === 'export-s16') {
				exportAsSprite(sprite, path, filename, 's16')
			} else if (action === 'export-c16') {
				exportAsSprite(sprite, path, filename, 'c16')
			}
		}

		let loadFromFile = filePath => {
			this.loadSprite(filePath, (sprite, path, filename, extension) => {
				window.api.showSpritesheetImportModal(sprite.frames[0], path, filename, extension, openSpritesheet)
			})
		}

		this.askForSprite(f => loadFromFile(f))
	}

	exportSpritesheet() {
		console.log('export spritesheet')
	}

	loadPalette() {
		window.api.showOpenDialog('', [
			{ name: 'Palettes', extensions: ['dta', 'pal'] },
			{ name: 'All Files', extensions: ['*'] }
		]).then(result => {
			if (result.filePaths.length > 0) {
				let filePath = result.filePaths[0]
				window.api.readFile(filePath).then(data => {
					try {
						let oldPalette = palette.table.slice()
						palette.load(data)
						if (this.currentSprite) {
							this.currentSprite.swapPalette(oldPalette, palette.table)
						}
					} catch (error) {
						window.api.showErrorDialog('Unable to load palette. Invalid data.')
						console.log(error)
					}
				}).catch(error => {
					window.api.showErrorDialog('Unable to open palette file.')
					console.log(error)
				})
			}
		})
	}

	convertPalette() {
		window.api.showOpenDialog('', [
			{ name: 'Palettes', extensions: ['dta', 'pal'] },
			{ name: 'All Files', extensions: ['*'] }
		]).then(result => {
			if (result.filePaths.length > 0) {
				let filePath = result.filePaths[0]
				window.api.readFile(filePath).then(data => {
					try {
						palette.load(data)
						if (this.currentSprite) {
							this.currentSprite.convertToPalette()
						}
					} catch (error) {
						window.api.showErrorDialog('Unable to load palette. Invalid data.')
						console.log(error)
					}
				}).catch(error => {
					window.api.showErrorDialog('Unable to open palette file.')
					console.log(error)
				})
			}
		})
	}

	undo() {
		if (this.currentSprite) {
			this.currentSprite.restoreFromUndoStack()
		}
	}

	redo() {
		if (this.currentSprite) {
			this.currentSprite.restoreFromRedoStack()
		}
	}

	cutFrame() {
		if (this.currentSprite) {
			this.currentSprite.cutSelection()
		}
	}

	copyFrame() {
		if (this.currentSprite) {
			this.currentSprite.copySelection()
		}
	}

	pasteFrame() {
		if (this.currentSprite) {
			this.currentSprite.pasteSelection()
		}
	}

	deleteFrame() {
		if (this.currentSprite) {
			this.currentSprite.removeFrame(this.currentSprite.selectedFrames)
		}
	}

	selectAllFrames() {
		if (this.currentSprite) {
			this.currentSprite.selectAllFrames()
		}
	}

	deselectAllFrames() {
		if (this.currentSprite) {
			this.currentSprite.deselectAllFrames()
		}
	}

	resetZoom() {
		this.scale = 1
		this.scrollTo(0, 0)
		this.windowResized(window.p)
	}

	zoomIn() {
		let oldScale = this.scale
		this.scale += 0.2
		if (this.scale > 10) {
			this.scale = 10
		}
		this.xOffset *= oldScale / this.scale
		this.yOffset *= oldScale / this.scale
		this.windowResized(window.p)
	}

	zoomOut() {
		let oldScale = this.scale
		this.scale -= 0.2
		if (this.scale < 0.2) {
			this.scale = 0.2
		}
		this.xOffset *= oldScale / this.scale
		this.yOffset *= oldScale / this.scale
		this.windowResized(window.p)
	}

	viewAsSprite() {
		if (this.currentSprite) {
			this.currentSprite.isBackground = false
			this.resetZoom()
			window.api.setViewAsSprite(true)
			document.getElementById('imgDimensions').className = ''
			document.getElementById('bgDimensions').className = 'invisible'
		}
	}

	viewAsBackground() {
		if (this.currentSprite && this.currentSprite.canBeBackground()) {
			this.currentSprite.isBackground = true
			if (this.currentSprite.bgWidth === 1 && this.currentSprite.bgHeight === 1) {
				let factors = getFactors(this.currentSprite.frames.length)[0]
				this.currentSprite.bgWidth = factors[0]
				this.currentSprite.bgHeight = factors[1]
			}
			this.resetZoom()
			window.api.setViewAsSprite(false)
			let hasSizeError = (this.currentSprite.bgWidth * this.currentSprite.bgHeight !== this.currentSprite.frames.length)
			document.getElementById('bgDimensions').className = hasSizeError ? 'error' : ''
			document.getElementById('imgDimensions').className = 'invisible'
			this.currentSprite.deselectAllFrames()
		}
	}

	setBgWidth(value) {
		if (this.currentSprite) {
			this.currentSprite.setBgWidth(parseInt(value))
		}
	}

	setBgHeight(value) {
		if (this.currentSprite) {
			this.currentSprite.setBgHeight(parseInt(value))
		}
	}

	showImageInfo(value) {
		if (this.currentSprite) {
			this.currentSprite.showImageInfo = value
			this.currentSprite.setMaxFrameSize()
			this.windowResized(window.p)
		}
	}

	setTransparentColor(value) {
		if (this.currentSprite) {
			this.currentSprite.transparentColor = value
		}
	}

	addRecentFile(filePath) {
		this.recentFiles = this.recentFiles.filter(f => f !== filePath)
		this.recentFiles.unshift(filePath)
		if (this.recentFiles.length > 10) {
			this.recentFiles = this.recentFiles.slice(0, 10)
		}
		window.api.updateRecentFiles(this.recentFiles, f => this.openSprite(f))
	}
}

let s = p => {
	let sketch = new Sketch()

	p.setup = () => sketch.setup(p)
	p.draw = () => sketch.draw(p)
	p.windowResized = () => sketch.windowResized(p)
	p.mousePressed = () => sketch.mousePressed(p)
	p.mouseDragged = () => sketch.mouseDragged(p)
	p.mouseReleased = () => sketch.mouseReleased(p)
	p.mouseWheel = (event) => sketch.mouseWheel(p, event)
	p.keyPressed = () => sketch.keyPressed(p)

	window.sketch = sketch
}
new p5(s, 'sketch')

let getFactors = (n) => {
	let factors = []
	for (let i = 1; i <= n; i++) {
		if (n % i == 0 && i > n / i) {
			factors.push([i, n / i])
		}
	}
	return factors
}

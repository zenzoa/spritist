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
	}

	setup(p) {
		window.p = p
		p.createCanvas(p.windowWidth, p.windowHeight - 50)

		p.noSmooth()

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
			p.scale(this.scale)
			p.translate(this.xOffset, this.yOffset)
			this.currentSprite.draw(p)
			p.pop()
		}
	}

	windowResized(p) {
		let w = p.windowWidth
		let h = p.windowHeight - 50
		
		if (this.currentSprite) {
			let displayWidth = this.currentSprite.getDisplayWidth()
			let displayHeight = this.currentSprite.getDisplayHeight()
			w = Math.max(w, displayWidth)
			h = Math.max(h, displayHeight)
		}
		p.resizeCanvas(w, h)
	}

	mousePressed(p) {
		let x = p.mouseX / this.scale
		let y = p.mouseY / this.scale
		this.xStart = x
		this.yStart = y
		this.xLast = x
		this.yLast = y
	}

	mouseDragged(p) {
		let x = p.mouseX / this.scale
		let y = p.mouseY / this.scale

		let dx = x - this.xStart
		let dy = y - this.yStart
		
		if (dx**2 + dy**2 > 10**2 && this.currentSprite && !this.currentSprite.isDragging && !this.currentSprite.isBackground) {
				if (!this.currentSprite.isFrameSelected(x, y) && this.currentSprite.selectedFrames.length < 2) {
					this.currentSprite.deselectAllFrames()
					this.currentSprite.selectFrame(x, y)
				}
				if (this.currentSprite.isFrameSelected(x, y)) {
					this.currentSprite.startDrag(x, y)
				}
		}

		this.xLast = x
		this.yLast = y
	}

	mouseReleased(p) {
		let x = p.mouseX / this.scale
		let y = p.mouseY / this.scale

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

	keyPressed(p) {
		if (this.currentSprite && this.currentSprite.frames.length > 0 && !this.currentSprite.isBackground) {
			let sprite = this.currentSprite
			let firstSelection = sprite.selectedFrames.length > 0 ? sprite.selectedFrames[0] : 0
			let lastSelection = sprite.selectedFrames.length > 0 ? sprite.selectedFrames[sprite.selectedFrames.length - 1] : -1
			let framesPerRow = Math.floor((p.windowWidth - sprite.hGap) / (sprite.maxFrameWidth + sprite.hGap))
			let windowTop = document.getElementById('sketch').scrollTop
			let windowBottom = document.getElementById('sketch').scrollTop + p.windowHeight - 50
			
			if (p.keyCode === p.UP_ARROW) {
				let prevSelection = Math.max(firstSelection - framesPerRow, 0)
				sprite.selectedFrames = [prevSelection]
				let frameTop = Math.floor(prevSelection / framesPerRow) * (sprite.maxFrameHeight + sprite.vGap) + sprite.vGap
				if (frameTop < windowTop) {
					document.getElementById('sketch').scrollBy(0, -sprite.maxFrameHeight)
				}

			} else if (p.keyCode === p.DOWN_ARROW) {
				let nextSelection = Math.min(lastSelection + framesPerRow, sprite.frames.length - 1)
				sprite.selectedFrames = [nextSelection]
				let frameBottom = Math.ceil(nextSelection / framesPerRow) * (sprite.maxFrameHeight + sprite.vGap) + sprite.vGap
				if (frameBottom > windowBottom) {
					document.getElementById('sketch').scrollBy(0, sprite.maxFrameHeight)
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

			} else if (p.keyCode === 35) { // end
				sprite.selectedFrames = [sprite.frames.length - 1]
			}
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
			this.scale = 1
			this.xOffset = 0
			this.yOffset = 0
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

	askForSprite(onSuccess) {
		window.api.showOpenDialog('', [
			{ name: 'Images', extensions: ['spr', 's16', 'c16', 'n16', 'm16', 'blk', 'png', 'gif', 'dta'] },
			{ name: 'All Files', extensions: ['*'] }
		]).then(result => {
			if (result.filePaths.length > 0) {
				let filePath = result.filePaths[0]
				let path = filePath.match(/^.*[\\\/]/)[0]
				let filename = filePath.match(/([^\\//]+)\./)[1]
				let extension = (filePath.match(/\.(\w+)$/)[1]).toLowerCase()
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
				}
				if (loader) {
					try {
						loader(filePath, sprite => onSuccess(sprite, path, filename, extension))
					} catch (error) {
						window.api.showErrorDialog('Unable to open sprite. Invalid data.')
						console.log(error)
					}
				}
			}
		})
	}

	openSprite() {
		let openIt = () => {
			this.askForSprite((sprite, path, filename, extension) => {
				this.currentSprite = sprite
				this.currentSprite.path = path
				this.currentSprite.filename = filename
				this.currentSprite.extension = extension
				this.currentSprite.updateSelection()
				if (extension === 'blk') {
					this.viewAsBackground()
					document.getElementById('bgWidth').value = this.currentSprite.bgWidth
					document.getElementById('bgHeight').value = this.currentSprite.bgHeight
				} else {
					this.viewAsSprite()
				}
				this.updateTitle()
				this.windowResized(window.p)
				window.api.spriteIsOpen(true, extension === 'spr')
			})
		}

		if (this.currentSprite && this.currentSprite.isModified) {
			window.api.showConfirmDialog('Are you sure you want to open a new sprite?\nUnsaved changes will be lost.').then(response => {
				if (response === 0) {
					openIt()
				}
			})
		} else {
			openIt()
		}
	}

	insertImage() {
		if (this.currentSprite) {
			this.askForSprite(sprite => {
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
		}
	}

	saveSprite(filePath, extension, isExporting) {
		if (this.currentSprite) {
			filePath = filePath || this.currentSprite.path + this.currentSprite.filename + '.' + this.currentSprite.extension
			extension = extension || this.currentSprite.extension
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
					this.saveSprite(filePath, extension, isExporting)
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
		this.xOffset = 0
		this.yOffset = 0
	}

	zoomIn() {
		this.scale += 0.2
		if (this.scale > 10) {
			this.scale = 10
		}
	}

	zoomOut() {
		this.scale -= 0.2
		if (this.scale < 0.2) {
			this.scale = 0.2
		}
	}

	viewAsSprite() {
		if (this.currentSprite) {
			this.currentSprite.isBackground = false
			this.windowResized(window.p)
			window.api.setViewAsSprite(true)
			document.getElementById('imgDimensions').className = ''
			document.getElementById('bgDimensions').className = 'invisible'
			this.xOffset = 0
			this.yOffset = 0
		}
	}

	viewAsBackground() {
		if (this.currentSprite && this.currentSprite.canBeBackground()) {
			this.currentSprite.isBackground = true
			this.windowResized(window.p)
			window.api.setViewAsSprite(false)
			let hasSizeError = (this.currentSprite.bgWidth * this.currentSprite.bgHeight !== this.currentSprite.frames.length)
			document.getElementById('bgDimensions').className = hasSizeError ? 'error' : ''
			document.getElementById('imgDimensions').className = 'invisible'
			this.currentSprite.deselectAllFrames()
			this.xOffset = 0
			this.yOffset = 0
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

	setTransparentColor(value) {
		if (this.currentSprite) {
			this.currentSprite.transparentColor = value
		}
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
	p.keyPressed = () => sketch.keyPressed(p)

	window.sketch = sketch
}
new p5(s, 'sketch')

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

		this.showScrollbarV = false
		this.scrollbarWidth = 10
		this.scrollThumbTop = 0
		this.scrollThumbHeight = 0
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
			
			if (this.showScrollbarV) {
				p.fill(100)
				p.noStroke()
				p.rect(p.windowWidth - this.scrollbarWidth, 0, this.scrollbarWidth, p.windowHeight - this.statusPanelHeight)
				p.fill(68)
				p.rect(p.windowWidth - this.scrollbarWidth, this.scrollThumbTop, this.scrollbarWidth, this.scrollThumbHeight)
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
		if (this.showScrollbarV && p.mouseX >= p.windowWidth - 10) {
			this.isScrollingV = true
			this.yOffsetStart = this.yOffset
			this.yMouseStart = p.mouseY
		}
	}

	mouseDragged(p) {
		let x = p.mouseX / this.scale - this.xOffset
		let y = p.mouseY / this.scale - this.yOffset

		let dx = x - this.xStart
		let dy = y - this.yStart

		if (this.isScrollingV && this.currentSprite) {
			let scrollbarChange = (p.mouseY - this.yMouseStart) / (p.windowHeight - this.statusPanelHeight)
			let offsetChange = scrollbarChange * this.currentSprite.totalFramesHeight
			this.scrollTo(null, this.yOffsetStart - offsetChange)
		} else if (dx**2 + dy**2 > 10**2 && this.currentSprite && !this.currentSprite.isDragging && !this.currentSprite.isBackground) {
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
		let x = p.mouseX / this.scale - this.xOffset
		let y = p.mouseY / this.scale - this.yOffset

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
		}
	}

	updateScrollbar() {
		if (this.currentSprite) {
			this.showScrollbarV = this.currentSprite.totalFramesHeight * this.scale > p.windowHeight - this.statusPanelHeight
			let thumbHeightPercent = (p.windowHeight - this.statusPanelHeight) / (this.currentSprite.totalFramesHeight * this.scale)
			this.scrollThumbHeight = Math.floor(thumbHeightPercent * (p.windowHeight - this.statusPanelHeight))
			let thumbTopPercent = -this.yOffset / this.currentSprite.totalFramesHeight
			this.scrollThumbTop = Math.floor(thumbTopPercent * (p.windowHeight - this.statusPanelHeight))
		}
	}

	scrollTo(x, y) {
		if (this.currentSprite) {
			if (!isNaN(x)) {
				this.xOffset = Math.floor(x)
			}
			if (!isNaN(y)) {
				this.yOffset = Math.floor(y)
			}

			if (this.xOffset > 0) {
				this.xOffset = 0
			}
			if (this.yOffset > 0) {
				this.yOffset = 0
			}

			let yMin = -this.currentSprite.totalFramesHeight + (p.windowHeight - this.statusPanelHeight) / this.scale
			if (this.yOffset < yMin) {
				this.yOffset = Math.floor(yMin)
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
				if (extension === 'blk' || filename === 'back') {
					if (filename + '.' + extension === 'back.spr') {
						// C1 background
						this.currentSprite.bgWidth = 58
						this.currentSprite.bgHeight = 8
					} else {
						let factors = getFactors(this.currentSprite.frames.length)[0]
						this.currentSprite.bgWidth = factors[0]
						this.currentSprite.bgHeight = factors[1]
					}
					document.getElementById('bgWidth').value = this.currentSprite.bgWidth
					document.getElementById('bgHeight').value = this.currentSprite.bgHeight
					this.viewAsBackground()
				} else {
					this.viewAsSprite()
				}
				this.updateTitle()
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
		this.scrollTo(0, 0)
		this.windowResized(window.p)
	}

	zoomIn() {
		this.scale += 0.2
		if (this.scale > 10) {
			this.scale = 10
		}
		this.windowResized(window.p)
	}

	zoomOut() {
		this.scale -= 0.2
		if (this.scale < 0.2) {
			this.scale = 0.2
		}
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

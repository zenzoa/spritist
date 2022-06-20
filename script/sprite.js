class Sprite {
	constructor() {
		this.path = ''
		this.filename = 'untitled'
		this.extension = 'c16'

		this.frames = []
		this.selectedFrames = []
		this.lastSelectedFrame = -1

		this.hGap = 10
		this.vGap = 10
		this.maxFrameWidth = 0
		this.maxFrameHeight = 0
		this.totalFramesHeight = 0

		this.isModified = false

		this.isDragging = false
		this.xDrag = 0
		this.yDrag = 0

		this.undoStack = []
		this.redoStack = []

		this.copiedFrames = []

		this.isBackground = false
		this.bgWidth = 1
		this.bgHeight = 1

		this.transparentColor = { r: 0, g: 0, b: 0, a: 255 }
	}

	setModified(value) {
		this.isModified = value
		window.sketch.updateTitle()
		window.sketch.windowResized(window.p)
		if (this.isBackground && !this.canBeBackground()) {
			window.sketch.viewAsSprite()
		}
	}

	setBgWidth(value) {
		if (value === this.bgWidth) { return }
		this.bgWidth = value
		if (this.bgWidth < 1) this.bgWidth = 1
		if (this.bgWidth > this.frames.length) this.bgWidth = this.frames.length
		document.getElementById('bgWidth').value = this.bgWidth
		if (this.bgWidth * this.bgHeight !== this.frames.length) {
			document.getElementById('bgDimensions').className = 'error'
		} else {
			document.getElementById('bgDimensions').className = ''
		}
		this.setModified(true)
	}

	setBgHeight(value) {
		if (value === this.bgHeight) { return }
		this.bgHeight = value
		if (this.bgHeight < 1) this.bgHeight = 1
		if (this.bgHeight > this.frames.length) this.bgHeight = this.frames.length
		document.getElementById('bgHeight').value = this.bgHeight
		if (this.bgWidth * this.bgHeight !== this.frames.length) {
			document.getElementById('bgDimensions').className = 'error'
		} else {
			document.getElementById('bgDimensions').className = ''
		}
		this.setModified(true)
	}

	getDisplayWidth() {
		if (this.isBackground) {
			return this.bgWidth * this.frames[0].width + this.hGap * 2
		} else if (this.frames.length > 0 && this.frames[0].width > window.p.windowWidth) {
			return this.frames[0].width + this.hGap * 2
		} else {
			return window.p.windowWidth
		}
	}

	getDisplayHeight() {
		if (this.isBackground) {
			return this.bgHeight * this.frames[0].height + this.vGap * 2
		} else {
			return Math.max(this.totalFramesHeight, this.maxFrameHeight + this.vGap * 2)
		}
	}

	addToUndoStack() {
		this.undoStack.push(this.frames.slice())
		if (this.undoStack.length > 100) {
			this.undoStack.shift()
		}
		window.api.canUndo(true)
	}

	restoreFromUndoStack() {
		if (this.undoStack.length > 0) {
			this.redoStack.push(this.frames.slice())
			window.api.canRedo(true)
			this.frames = this.undoStack.pop()
			this.deselectAllFrames()
			this.setModified(true)
		}
		if (this.undoStack.length === 0) {
			window.api.canUndo(false)
		}
	}

	restoreFromRedoStack() {
		if (this.redoStack.length > 0) {
			this.undoStack.push(this.frames.slice())
			window.api.canUndo(true)
			this.frames = this.redoStack.pop()
			this.deselectAllFrames()
			this.setModified(true)
		}
		if (this.redoStack.length === 0) {
			window.api.canRedo(false)
		}
	}

	cutSelection() {
		this.copySelection()
		this.removeFrame(this.selectedFrames)
		window.api.canPaste(true)
	}

	copySelection() {
		this.copiedFrames = this.frames.filter((frame, i) => this.selectedFrames.includes(i))
		window.api.canPaste(true)
	}

	pasteSelection() {
		let insertIndex = this.frames.length
		if (this.lastSelectedFrame !== -1) {
			insertIndex = this.lastSelectedFrame + 1
		}
		let newFrames = []
		this.copiedFrames.forEach((frame, i) => {
			let frameCopy = window.p.createImage(frame.width, frame.height)
			frameCopy.copy(frame, 0, 0, frame.width, frame.height, 0, 0, frame.width, frame.height)
			newFrames.push(frameCopy)
		})
		this.insertFrame(newFrames, insertIndex)
	}

	startDrag(px, py) {
		this.isDragging = true
		this.xDrag = px
		this.yDrag = py
	}

	endDrag(px, py) {
		this.isDragging = false
		this.frames.forEach((frame, i) => {
			frame.index = i
		})
		
		let { frameIndex, frameX }= this.getFrameAt(px, py)
		if (frameIndex !== -1) {
			let frameImage = this.frames[frameIndex]
			if (px >= frameX + (frameImage.width / 2)) {
				frameIndex += 1
			}
	
			this.addToUndoStack()
			let framesToInsert = this.selectedFrames.map(i => this.frames[i])
			let framesBefore = this.frames.slice(0, frameIndex).filter(frame => !this.selectedFrames.includes(frame.index))
			let framesAfter = this.frames.slice(frameIndex).filter(frame => !this.selectedFrames.includes(frame.index))
			this.frames = framesBefore.concat(framesToInsert.concat(framesAfter))
			
			let newSelectedFrames = []
			this.frames.forEach((frame, i) => {
				if (this.selectedFrames.includes(frame.index)) {
					newSelectedFrames.push(i)
				}
			})
			this.selectedFrames = newSelectedFrames

			this.setModified(true)
			this.updateSelection()
		}
	}

	frameCount() {
		this.frames.length
	}

	addFrame(image) {
		this.frames.push(image)
		this.setMaxFrameSize()
	}

	insertFrame(imageList, index) {
		this.addToUndoStack()
		if (!imageList.length) {
			imageList = [ imageList ]
		}
		let before = this.frames.slice(0, index)
		let after = this.frames.slice(index)
		this.frames = before.concat(imageList).concat(after)
		this.setMaxFrameSize()
		this.setModified(true)
	}

	removeFrame(indexList) {
		this.addToUndoStack()
		if (!indexList.length) {
			indexList = [ indexList ]
		}
		let newFrames = []
		this.frames.forEach((frame, i) => {
			if (!indexList.includes(i)) {
				newFrames.push(frame)
			}
		})
		if (indexList.includes(this.lastSelectedFrame)) {
			this.lastSelectedFrame = -1
		}
		this.frames = newFrames
		this.setMaxFrameSize()
		this.setModified(true)
		this.updateSelection()
	}

	setMaxFrameSize() {
		this.frames.forEach(frame => {
			if (frame.width > this.maxFrameWidth) {
				this.maxFrameWidth = frame.width
			}
			if (frame.height > this.maxFrameHeight) {
				this.maxFrameHeight = frame.height
			}
		})
	}

	forEachFrame(callback) {
		let x = this.hGap
		let y = this.vGap
		this.totalFramesHeight = this.maxFrameHeight + this.vGap * 2
		this.frames.forEach((frame, i) => {
			if (i > 0 && x + this.maxFrameWidth > (p.windowWidth / window.sketch.scale) - (this.hGap * 2)) {
				x = this.hGap
				y += this.maxFrameHeight + this.vGap
				this.totalFramesHeight += this.maxFrameHeight + this.vGap
			}
			callback(frame, i, x, y)
			x += this.maxFrameWidth + this.hGap
		})
	}

	getFrameAt(px, py) {
		let returnFrame = {
			frameIndex: -1,
			frameX: -1,
			frameY: -1
		}
		this.forEachFrame((frame, i, x, y) => {
			if (px >= x - (this.hGap / 2) && px < x + this.maxFrameWidth + (this.hGap / 2) &&
				py >= y - (this.vGap / 2) && py < y + this.maxFrameHeight + (this.vGap / 2)) {
					returnFrame.frameIndex = i
					returnFrame.frameX = x
					returnFrame.frameY = y
			}
		})
		return returnFrame
	}

	isFrameSelected(px, py) {
		let { frameIndex } = this.getFrameAt(px, py)
		return this.selectedFrames.includes(frameIndex)
	}

	selectFrame(px, py, selectRange, allowToggleOff) {
		let { frameIndex } = this.getFrameAt(px, py)
		if (frameIndex !== -1) {
			if (selectRange && this.lastSelectedFrame !== -1) {
				let start = (frameIndex > this.lastSelectedFrame) ? this.lastSelectedFrame : frameIndex
				let end = (frameIndex > this.lastSelectedFrame) ? frameIndex : this.lastSelectedFrame
				for (let i = start; i <= end; i++) {
					if (!this.selectedFrames.includes(i)) {
						this.selectedFrames.push(i)
					}
				}
			} else if (!this.selectedFrames.includes(frameIndex)) {
				this.selectedFrames.push(frameIndex)
				this.lastSelectedFrame = frameIndex
			} else if (!selectRange && allowToggleOff) {
				this.selectedFrames = this.selectedFrames.filter(s => s !== frameIndex)
				if (i === this.lastSelectedFrame) {
					this.lastSelectedFrame = -1
				}
			}
		}
		if (this.selectedFrames.length === 0) {
			this.lastSelectedFrame = -1
		}
		this.updateSelection()
	}

	selectAllFrames() {
		this.selectedFrames = []
		this.frames.forEach((frame, i) => {
			this.selectedFrames.push(i)
		})
		this.updateSelection()
	}

	deselectAllFrames() {
		this.selectedFrames = []
		this.updateSelection()
	}

	updateSelection() {
		if (this.selectedFrames.length === 0) {
			window.api.hasSelection(false)
			document.getElementById('imgDimensions').innerText = `${this.frames.length} images`
		} else {
			window.api.hasSelection(true, this.frames.length, this.selectedFrames.length, this.isBackground)
			if (this.selectedFrames.length === 1) {
				window.api.hasSelection(true, this.frames.length, this.selectedFrames.length, this.isBackground)
				let frame = this.frames[this.selectedFrames[0]]
				document.getElementById('imgDimensions').innerText = `Image ${this.selectedFrames[0]} ( ${frame.width} × ${frame.height} )`
			} else {
				document.getElementById('imgDimensions').innerText = `${this.selectedFrames.length} images selected`
			}
		}
	}

	swapPalette(oldPalette, newPalette) {
		this.frames.forEach(frame => {
			frame = palette.swapPalette(frame, oldPalette, newPalette)
		})
	}

	convertToPalette() {
		this.frames.forEach(frame => {
			frame = palette.swapPalette(frame, palette.table, palette.table)
		})
	}

	canBeBackground() {
		if (this.frames.length > 0) {
			let allFramesSameSize = true
			let frameWidth = this.frames[0].width
			let frameHeight = this.frames[0].height
			this.frames.forEach(frame => {
				if (frame.width !== frameWidth || frame.height !== frameHeight) {
					allFramesSameSize = false
				}
			})
			return allFramesSameSize
		} else {
			return false
		}
	}

	draw(p) {
		if (this.isBackground) {
			this.drawAsBackground(p)
			return
		}

		let container = document.getElementById('sketch')
		let yMin = container.scrollTop
		let yMax = yMin + container.clientHeight

		let px = p.mouseX / window.sketch.scale
		let py = p.mouseY / window.sketch.scale

		this.drawFrame = (frame, x, y, isSelected) => {
			if (y + frame.Height < yMin || y > yMax) return

			let xOffset = 0
			let yOffset = 0
			if (this.isDragging && isSelected) {
				xOffset = px - this.xDrag
				yOffset = py - this.yDrag
			}
			if (frame.width < this.maxFrameWidth) {
				xOffset += Math.floor((this.maxFrameWidth - frame.width) / 2)
			}
			if (frame.height < this.maxFrameHeight) {
				yOffset += Math.floor((this.maxFrameHeight - frame.height) / 2)
			}

			if (this.transparentColor.a > 0) {
				p.fill(this.transparentColor.r, this.transparentColor.g, this.transparentColor.b)
				p.noStroke()
				p.rect(x + xOffset, y + yOffset, frame.width, frame.height)
			}

			p.image(frame, x + xOffset, y + yOffset)

			if (this.isDragging && !isSelected &&
				px >= x - (this.hGap / 2) && px < x + this.maxFrameWidth + (this.hGap / 2) &&
				py >= y - (this.vGap / 2) && py < y + this.maxFrameHeight + (this.vGap / 2)) {
					p.stroke(255)
					p.strokeWeight(3)
					if (px >= x + (this.maxFrameWidth / 2)) {
						p.line(Math.floor(x + this.maxFrameWidth + (this.hGap / 2)), Math.floor(y), Math.floor(x + this.maxFrameWidth + (this.hGap / 2)), Math.floor(y + this.maxFrameHeight))
					} else {
						p.line(Math.floor(x - (this.hGap / 2)), Math.floor(y), Math.floor(x - (this.hGap / 2)), Math.floor(y + this.maxFrameHeight))
					}
			}

			if (isSelected) {
				p.noFill()
				p.stroke(0, 255, 255)
				p.strokeWeight(2)
				p.rect(x + xOffset - 1, y + yOffset - 1, frame.width + 2, frame.height + 2)
			}
		}

		this.forEachFrame((frame, i, x, y) => {
			if (!this.selectedFrames.includes(i)) {
				this.drawFrame(frame, x, y, false)
			}
		})

		this.forEachFrame((frame, i, x, y) => {
			if (this.selectedFrames.includes(i)) {
				this.drawFrame(frame, x, y, true)
			}
		})
	}

	drawAsBackground(p) {
		let container = document.getElementById('sketch')
		let yMin = container.scrollTop
		let yMax = yMin + container.clientHeight

		p.fill(0)
		p.noStroke()
		p.rect(this.hGap, this.vGap, this.frames[0].width * this.bgWidth, this.frames[0].height * this.bgHeight)

		this.forEachFrame((frame, i) => {
			let x = Math.floor(i / this.bgHeight)
			let y = Math.floor(i % this.bgHeight)
			let bx = x * frame.width + this.hGap
			let by = y * frame.height + this.vGap
			if (by + frame.height >= yMin && by <= yMax) {
				p.image(frame, bx, by)
			}
		})

		p.noFill()
		if (this.bgWidth * this.bgHeight === this.frames.length) {
			p.stroke(0, 255, 255)
		} else {
			p.stroke(255, 0, 0)
		}
		p.strokeWeight(2)
		p.rect(this.hGap - 1, this.vGap - 1, this.frames[0].width * this.bgWidth + 2, this.frames[0].height * this.bgHeight + 2)
	}
}

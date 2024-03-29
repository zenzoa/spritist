class Sprite {
	static frameCount = 0
	static cols = 0
	static rows = 0
	static frameElements = []
	static maxItemWidth = 0
	static timestamp = 0
	static imagesLoaded = 0
	static scale = 1

	static createFrameElement(index) {
		const frameElement = document.createElement('div')
		frameElement.id = `frame-${index}`
		frameElement.className = 'frame unloaded'

		frameElement.addEventListener('click', (event) => {
			Sprite.selectFrame(index, event)
		}, { capture: false, passive: true })

		frameElement.addEventListener('mousedown', (event) => {
			Drag.isMouseDown = true
			Drag.mouseDownIndex = index
		}, { capture: false, passive: true })

		frameElement.addEventListener('mouseleave', (event) => {
			if (Drag.isMouseDown && Drag.mouseDownIndex === index) {
				Drag.start(index, event)
			}
		}, { capture: false, passive: true })

		frameElement.addEventListener('mouseover', (event) => {
			Drag.overFrame(index, event)
		}, { capture: false, passive: true })

		const frameImage = document.createElement('div')
		frameImage.className = 'frame-image'
		frameElement.append(frameImage)

		const img = document.createElement('img')
		img.id = `frame-img-${index}`
		img.src = convertFileSrc(`${Sprite.timestamp}-${index}`, 'getframe')
		img.addEventListener('load', () => Sprite.onImageLoad(img, index))
		frameImage.append(img)

		const frameInfo = document.createElement('div')
		frameInfo.className = 'frame-info'
		frameElement.append(frameInfo)

		const frameIndex = document.createElement('span')
		frameIndex.id = `frame-index-${index}`
		frameIndex.className = 'frame-index'
		frameInfo.append(frameIndex)

		const frameSize = document.createElement('span')
		frameSize.id = `frame-size-${index}`
		frameSize.className = 'frame-size'
		frameInfo.append(frameSize)

		return frameElement
	}

	static updateFrame(index, frameList) {
		let frameElement = document.getElementById(`frame-${index}`)
		if (frameElement != null) {
			const frameImage = document.getElementById(`frame-img-${index}`)
			frameImage.src = convertFileSrc(`${Sprite.timestamp}-${index}`, 'getframe')
			frameImage.addEventListener('load', () => Sprite.onImageLoad(frameImage, index))
		} else {
			frameElement = Sprite.createFrameElement(index)
			frameList.append(frameElement)
		}
		return frameElement
	}

	static drawFrames() {
		const frameList = document.getElementById('frame-list')
		const originalHeight = frameList.getBoundingClientRect().height
		frameList.style.minHeight = originalHeight + 'px'

		Sprite.maxItemWidth = 0
		Sprite.timestamp = Date.now()

		document.documentElement.style.setProperty('--img-scale', `${Sprite.scale}00%`)

		Sprite.frameElements.slice(Sprite.frameCount).forEach(frameElement => frameElement.remove())
		Sprite.frameElements = []
		for (let i = 0; i < Sprite.frameCount; i++) {
			Sprite.frameElements.push(
				Sprite.updateFrame(i, frameList)
			)
		}

		Sprite.updateSelectedFrames()
	}

	static reloadSelectedFrames() {
		Sprite.timestamp = Date.now()
		Selection.frameIndexes.forEach(index => {
			const frameImage = document.getElementById(`frame-img-${index}`)
			frameImage.src = convertFileSrc(`${Sprite.timestamp}-${index}`, 'getframe')
		})
	}

	static onImageLoad(img, index) {
		let scaledWidth = img.naturalWidth * Sprite.scale
		let scaledHeight = img.naturalHeight * Sprite.scale

		const frameImage = document.getElementById(`frame-img-${index}`)
		if (frameImage) {
			frameImage.style.width = `${scaledWidth}px`
			frameImage.style.height = `${scaledHeight}px`
		}

		const frameElement = document.getElementById(`frame-${index}`)
		if (frameElement) frameElement.classList.remove('unloaded')

		const frameIndex = document.getElementById(`frame-index-${index}`)
		if (frameIndex) frameIndex.innerText = index

		const frameSize = document.getElementById(`frame-size-${index}`)
		if (frameSize) frameSize.innerText = ` (${img.naturalWidth} × ${img.naturalHeight})`

		if (Sprite.maxItemWidth < scaledWidth) {
			Sprite.maxItemWidth = scaledWidth
		}

		Sprite.imagesLoaded++
		if (Sprite.imagesLoaded >= Sprite.frameCount) {
			Sprite.onImagesDoneLoading()
		}
	}

	static onImagesDoneLoading() {
		const frameList = document.getElementById('frame-list')
		frameList.style.minHeight = 'unset'
		Sprite.imagesLoaded = 0
		document.documentElement.style.setProperty('--max-item-width', `${Sprite.maxItemWidth}px`)
	}

	static updateSelectedFrames() {
		Sprite.frameElements.forEach((frameElement, i) => {
			if (Selection.frameIndexes.includes(i)) {
				frameElement.classList.add('selected')
			} else {
				frameElement.classList.remove('selected')
			}
		})
	}

	static selectFrame(index, event) {
		if (event.ctrlKey) {
			if (Selection.frameIndexes.includes(index)) {
				Selection.frameIndexes = Selection.frameIndexes.filter(s => s !== index)
			} else {
				Selection.frameIndexes.push(index)
			}
		} else if (event.shiftKey) {
			Selection.frameIndexes.push(index)
			const firstIndex = Math.min(...Selection.frameIndexes)
			const lastIndex = Math.max(...Selection.frameIndexes)
			Selection.frameIndexes = []
			for (let i = firstIndex; i <= lastIndex; i++) {
				Selection.frameIndexes.push(i)
			}
		} else if (Selection.frameIndexes.includes(index) && Selection.frameIndexes.length === 1) {
			Selection.frameIndexes = []
		} else {
			Selection.frameIndexes = [index]
		}

		tauri_invoke('update_selection', { newSelectedFrames: Selection.frameIndexes })
		Sprite.updateSelectedFrames()
	}

	static setBackgroundSize(cols, rows) {
		if (cols != null) Sprite.cols = cols
		if (rows != null) Sprite.rows = rows
		document.getElementById('bg-cols').value = Sprite.cols
		document.getElementById('bg-rows').value = Sprite.rows
		if (Sprite.frameCount === Sprite.cols * Sprite.rows) {
			document.getElementById('bg-bar').classList.remove('bg-invalid-dims')
		} else {
			document.getElementById('bg-bar').classList.add('bg-invalid-dims')
		}
		const root = document.querySelector(':root')
		root.style.setProperty('--bg-mode-cols', `${Sprite.cols}`)
		root.style.setProperty('--bg-mode-rows', `${Sprite.rows}`)
		tauri_invoke('set_bg_size', { cols: Sprite.cols, rows: Sprite.rows })
	}
}

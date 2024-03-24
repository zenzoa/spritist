class Drag {
	static isMouseDown = false
	static mouseDownIndex = 0

	static start(index, event) {
		if (!Selection.frameIndexes.includes(index)) {
			Sprite.selectFrame(index, event)
		}

		Sprite.frameElements.forEach((frameElement, i) => {
			if (Selection.frameIndexes.includes(i)) {
				frameElement.classList.add('dragging')
			}
		})

		document.body.style.cursor = 'grabbing'
	}

	static overFrame(index, event) {
		if (!Drag.isMouseDown) return

		const oldInsertPoint = Selection.insertPoint
		if (event.offsetX < event.target.offsetWidth / 2) {
			Selection.insertPoint = index
		} else {
			Selection.insertPoint = index + 1
		}

		if (Selection.insertPoint !== oldInsertPoint) {
			Sprite.frameElements.forEach((frameElement, i) => {
				if (i === Selection.insertPoint) {
					frameElement.classList.add('insert-before')
				} else {
					frameElement.classList.remove('insert-before')
				}

				if (i + 1 === Selection.insertPoint) {
					frameElement.classList.add('insert-after')
				} else {
					frameElement.classList.remove('insert-after')
				}
			})
		}
	}

	static end() {
		if (!Drag.isMouseDown) return

		if (Selection.insertPoint >= 0) {
			tauri_invoke("move_frames", { insertPoint: Selection.insertPoint })
		}

		Drag.cancel()
	}

	static cancel() {
		if (!Drag.isMouseDown) return

		Drag.isMouseDown = false

		Sprite.frameElements.forEach((frameElement, i) => {
			frameElement.classList.remove('dragging')
			frameElement.classList.remove('insert-before')
			frameElement.classList.remove('insert-after')
		})

		document.body.style.cursor = 'default'

		Selection.insertPoint = -1
	}
}

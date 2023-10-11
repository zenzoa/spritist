class Drag {
	static dragStartedHere = false

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
		event.dataTransfer.setData('text/plain', 'dummy')
		event.dataTransfer.dropEffect = 'move'

		Drag.dragStartedHere = true
	}

	static overFrame(index, event) {
		if (!Drag.dragStartedHere) return

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
		if (!Drag.dragStartedHere) return

		if (Selection.insertPoint >= 0) {
			Tauri.invoke("move_frames", { insertPoint: Selection.insertPoint })
		}

		Sprite.frameElements.forEach((frameElement, i) => {
			frameElement.classList.remove('dragging')
			frameElement.classList.remove('insert-before')
			frameElement.classList.remove('insert-after')
		})
		document.body.style.cursor = 'default'

		Selection.insertPoint = -1

		Drag.dragStartedHere = false

	}
}

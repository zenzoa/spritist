class Selection {
	static frameIndexes = []
	static insertPoint = -1

	static selectLeft() {
		if (Selection.frameIndexes.length > 0) {
			const firstIndex = Math.min(...Selection.frameIndexes)
			if (firstIndex - 1 >= 0) {
				Selection.frameIndexes = [firstIndex - 1]
			}
		} else {
			Selection.frameIndexes = [0]
		}
		Tauri.invoke('update_selection', { newSelectedFrames: Selection.frameIndexes })
		Sprite.updateSelectedFrames()
	}

	static selectRight() {
		if (Selection.frameIndexes.length > 0) {
			const lastIndex = Math.max(...Selection.frameIndexes)
			if (lastIndex + 1 < Sprite.frameCount) {
				Selection.frameIndexes = [lastIndex + 1]
			}
		} else {
			Selection.frameIndexes = [Sprite.frameCount - 1]
		}
		Tauri.invoke('update_selection', { newSelectedFrames: Selection.frameIndexes })
		Sprite.updateSelectedFrames()
	}
}

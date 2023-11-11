class ExportSpritesheet {
	static isOpen() {
		return document.getElementById('export-spritesheet-dialog').classList.contains('open')
	}

	static open() {
		document.getElementById('export-spritesheet-dialog').classList.add('open')
	}

	static close() {
		document.getElementById('export-spritesheet-dialog').classList.remove('open')
	}

	static focusConfirmButton() {
		document.getElementById('export-spritesheet-confirm-button').focus()
	}

	static setup() {
		const confirmButton = document.getElementById('export-spritesheet-confirm-button')

		const pathInput = document.getElementById('export-spritesheet-path')
		const fileButton = document.getElementById('export-spritesheet-select-file-button')

		const colsInput = document.getElementById('export-spritesheet-cols')
		const rowsInput = document.getElementById('export-spritesheet-rows')

		document.getElementById('export-spritesheet-close-button').addEventListener('click', () => {
			ExportSpritesheet.close()
		})

		document.getElementById('export-spritesheet-cancel-button').addEventListener('click', () => {
			ExportSpritesheet.close()
		})

		fileButton.addEventListener('click', () => {
			const filePath = pathInput.value
			Tauri.invoke('select_png_path', { filePath }).then((filePath) => {
				if (filePath) pathInput.value = filePath
			})
		})

		confirmButton.addEventListener('click', () => {
			const filePath = pathInput.value
			const cols = parseInt(colsInput.value)
			const rows = parseInt(rowsInput.value)
			Tauri.invoke('export_spritesheet', { filePath, cols, rows })
			ExportSpritesheet.close()
		})

		let onKeydown = (event) => {
			if (event.key === 'Enter') {
				event.preventDefault()
				ExportSpritesheet.focusConfirmButton()
			}
		}
		pathInput.addEventListener('keydown', onKeydown)
		colsInput.addEventListener('keydown', onKeydown)
		rowsInput.addEventListener('keydown', onKeydown)

		let onUpdateColsInput = () => {
			const cols = parseInt(colsInput.value)
			const rows = Math.ceil(Sprite.frameCount / cols)
			rowsInput.value = rows
			update(cols, rows)
		}
		colsInput.addEventListener('input', onUpdateColsInput)
		colsInput.addEventListener('click', onUpdateColsInput)

		let onUpdateRowsInput = () => {
			const rows = parseInt(rowsInput.value)
			const cols = Math.ceil(Sprite.frameCount / rows)
			colsInput.value = cols
			update(cols, rows)
		}
		rowsInput.addEventListener('input', onUpdateRowsInput)
		rowsInput.addEventListener('click', onUpdateRowsInput)

		Tauri.event.listen('export_spritesheet', () => {
			Tauri.invoke('get_file_path', { extension: 'png' }).then((filePath) => {
				pathInput.value = filePath.replace('.png', '_spritesheet.png')
			})
			const frameCount = Sprite.frameCount
			let squarestFactor = 1
			let squarestRowColDiff = frameCount - 1
			for (let i = 0; i <= Sprite.frameCount / 2; i++) {
				const rowColDiff = (frameCount / i) - i
				if (frameCount % i === 0 && rowColDiff < squarestRowColDiff) {
					squarestFactor = i
					squarestRowColDiff = rowColDiff
				}
			}
			colsInput.value = squarestFactor
			rowsInput.value = Math.ceil(frameCount / squarestFactor)
			update(frameCount, 1)

			ExportSpritesheet.open()
			ExportSpritesheet.focusConfirmButton()
		})

		Tauri.event.listen('update_export_spritesheet_path', (event) => {
			pathInput.value = event.payload
		})

		Tauri.event.listen('successful_spritesheet_export', () => {
			ExportSpritesheet.close()
		})

		const update = (cols, rows) => {
			if (cols * rows >= Sprite.frameCount) {
				confirmButton.innerText = 'Export'
				confirmButton.removeAttribute('disabled')
			} else {
				confirmButton.innerText = '[ Invalid Dimensions ]'
				confirmButton.setAttribute('disabled', '')
			}
		}
	}
}

class ExportSpritesheet {
	static setup() {
		const dialogEl = document.getElementById('export-spritesheet-dialog')

		const closeButton = document.getElementById('export-spritesheet-close-button')
		const cancelButton = document.getElementById('export-spritesheet-cancel-button')
		const confirmButton = document.getElementById('export-spritesheet-confirm-button')

		const pathInput = document.getElementById('export-spritesheet-path')
		const fileButton = document.getElementById('export-spritesheet-select-file-button')

		const colsInput = document.getElementById('export-spritesheet-cols')
		const rowsInput = document.getElementById('export-spritesheet-rows')

		closeButton.addEventListener('click', () => {
			dialogEl.classList.remove('open')
		})

		cancelButton.addEventListener('click', () => {
			dialogEl.classList.remove('open')
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
			dialogEl.classList.remove('open')
		})

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
			dialogEl.classList.add('open')
			confirmButton.focus()
		})

		Tauri.event.listen('update_export_spritesheet_path', (event) => {
			pathInput.value = event.payload
		})

		Tauri.event.listen('successful_spritesheet_export', () => {
			dialogEl.classList.remove('open')
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

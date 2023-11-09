class ImportSpritesheet {
	static cols = 1
	static rows = 1

	static setup() {
		const dialogEl = document.getElementById('import-spritesheet-dialog')

		const pathInput = document.getElementById('import-spritesheet-path')

		const widthInput = document.getElementById('import-spritesheet-width')
		const heightInput = document.getElementById('import-spritesheet-height')

		const tileWidthInput = document.getElementById('import-spritesheet-tile-width')
		const tileHeightInput = document.getElementById('import-spritesheet-tile-height')

		const colsInput = document.getElementById('import-spritesheet-cols')
		const rowsInput = document.getElementById('import-spritesheet-rows')

		const confirmButton = document.getElementById('import-spritesheet-confirm-button')

		document.getElementById('import-spritesheet-close-button').addEventListener('click', () => {
			dialogEl.classList.remove('open')
		})
		document.getElementById('import-spritesheet-cancel-button').addEventListener('click', () => {
			dialogEl.classList.remove('open')
		})

		tileWidthInput.addEventListener('input', () => update(true))
		tileHeightInput.addEventListener('input', () => update(true))

		colsInput.addEventListener('input', () => update(false))
		rowsInput.addEventListener('input', () => update(false))

		confirmButton.addEventListener('click', () => {
			const filePath = pathInput.value
			const cols = parseInt(colsInput.value)
			const rows = parseInt(rowsInput.value)
			Tauri.invoke('import_spritesheet', { filePath, cols, rows })
			dialogEl.classList.remove('open')
		})

		Tauri.event.listen('import_spritesheet', (event) => {
			pathInput.value = event.payload.file_path
			widthInput.value = event.payload.width
			heightInput.value = event.payload.height
			tileWidthInput.value = event.payload.width
			tileHeightInput.value = event.payload.height
			colsInput.value = ImportSpritesheet.cols
			rowsInput.value = ImportSpritesheet.rows
			update(false)
			dialogEl.classList.add('open')
			confirmButton.focus()
		})

		const update = (changedTileSize) => {
			let width = parseInt(widthInput.value)
			let height = parseInt(heightInput.value)
			let tileWidth = parseInt(tileWidthInput.value)
			let tileHeight = parseInt(tileHeightInput.value)
			let cols = parseInt(colsInput.value)
			let rows = parseInt(rowsInput.value)

			if (!isNaN(cols) && !isNaN(rows)) {
				ImportSpritesheet.cols = cols
				ImportSpritesheet.rows = rows
			}

			if (changedTileSize && !isNaN(tileWidth) && !isNaN(tileHeight)) {
				cols = Math.floor(width / tileWidth)
				rows = Math.floor(height / tileHeight)
				colsInput.value = cols
				rowsInput.value = rows
			} else if (!changedTileSize && !isNaN(cols) && !isNaN(rows)) {
				tileWidth = Math.floor(width / cols)
				tileHeight = Math.floor(height / rows)
				tileWidthInput.value = tileWidth
				tileHeightInput.value = tileHeight
			}

			if (width === tileWidth * cols && height === tileHeight * rows) {
				confirmButton.innerText = 'Import'
				confirmButton.removeAttribute('disabled')
			} else {
				confirmButton.innerText = '[ Invalid Values ]'
				confirmButton.setAttribute('disabled', '')
			}
		}
	}
}

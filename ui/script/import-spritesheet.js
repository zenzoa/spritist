class ImportSpritesheet {
	static cols = 10
	static rows = 10

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
		tileWidthInput.addEventListener('click', () => update(true))
		tileHeightInput.addEventListener('input', () => update(true))
		tileHeightInput.addEventListener('click', () => update(true))

		colsInput.addEventListener('input', () => update(false))
		colsInput.addEventListener('click', () => update(false))
		rowsInput.addEventListener('input', () => update(false))
		rowsInput.addEventListener('click', () => update(false))

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

			if (changedTileSize && !isNaN(tileWidth) && !isNaN(tileHeight)) {
				cols = width / tileWidth
				rows = height / tileHeight
				colsInput.value = Number.isInteger(cols) ? cols : Number(cols).toFixed(2)
				rowsInput.value = Number.isInteger(rows) ? rows : Number(rows).toFixed(2)
			} else if (!changedTileSize && !isNaN(cols) && !isNaN(rows)) {
				tileWidth = width / cols
				tileHeight = height / rows
				tileWidthInput.value = Number.isInteger(tileWidth) ? tileWidth : Number(tileWidth).toFixed(2)
				tileHeightInput.value = Number.isInteger(tileHeight) ? tileHeight : Number(tileHeight).toFixed(2)
			}

			let isError = false

			if (Number.isInteger(tileWidth)) {
				tileWidthInput.classList.remove('error')
			} else {
				tileWidthInput.classList.add('error')
				isError = true
			}

			if (Number.isInteger(tileHeight)) {
				tileHeightInput.classList.remove('error')
			} else {
				tileHeightInput.classList.add('error')
				isError = true
			}

			if (Number.isInteger(cols)) {
				ImportSpritesheet.cols = cols
				colsInput.classList.remove('error')
			} else {
				colsInput.classList.add('error')
				isError = true
			}

			if (Number.isInteger(rows)) {
				ImportSpritesheet.rows = rows
				rowsInput.classList.remove('error')
			} else {
				rowsInput.classList.add('error')
				isError = true
			}

			if (!isError && width === tileWidth * cols && height === tileHeight * rows) {
				confirmButton.innerText = 'Import'
				confirmButton.removeAttribute('disabled')
			} else {
				confirmButton.innerText = '[ Invalid Dimensions ]'
				confirmButton.setAttribute('disabled', '')
			}

		}
	}
}

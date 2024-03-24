class ImportSpritesheet {
	static cols = 10
	static rows = 10
	static lastButtonId = 'import-spritesheet-confirm-button'

	static isOpen() {
		return document.getElementById('import-spritesheet-dialog').classList.contains('open')
	}

	static open() {
		document.getElementById('import-spritesheet-dialog').classList.add('open')
	}

	static close() {
		document.getElementById('import-spritesheet-dialog').classList.remove('open')
	}

	static focusConfirmButton() {
		document.getElementById(ImportSpritesheet.lastButtonId).focus()
	}

	static setup() {
		const pathInput = document.getElementById('import-spritesheet-path')

		const widthInput = document.getElementById('import-spritesheet-width')
		const heightInput = document.getElementById('import-spritesheet-height')

		const tileWidthInput = document.getElementById('import-spritesheet-tile-width')
		const tileHeightInput = document.getElementById('import-spritesheet-tile-height')

		const colsInput = document.getElementById('import-spritesheet-cols')
		const rowsInput = document.getElementById('import-spritesheet-rows')

		const exportSprButton = document.getElementById('import-spritesheet-export-spr-button')
		const exportS16Button = document.getElementById('import-spritesheet-export-s16-button')
		const exportC16Button = document.getElementById('import-spritesheet-export-c16-button')

		const confirmButton = document.getElementById('import-spritesheet-confirm-button')

		document.getElementById('import-spritesheet-close-button').addEventListener('click', () => {
			ImportSpritesheet.close()
		})
		document.getElementById('import-spritesheet-cancel-button').addEventListener('click', () => {
			ImportSpritesheet.close()
		})

		tileWidthInput.addEventListener('input', () => update(true))
		tileWidthInput.addEventListener('click', () => update(true))
		tileHeightInput.addEventListener('input', () => update(true))
		tileHeightInput.addEventListener('click', () => update(true))

		colsInput.addEventListener('input', () => update(false))
		colsInput.addEventListener('click', () => update(false))
		rowsInput.addEventListener('input', () => update(false))
		rowsInput.addEventListener('click', () => update(false))

		const onConfirm = (lastButtonId, tauriAction) => {
			const filePath = pathInput.value
			const cols = parseInt(colsInput.value)
			const rows = parseInt(rowsInput.value)
			tauri_invoke('import_spritesheet' + tauriAction, { filePath, cols, rows })
			ImportSpritesheet.lastButtonId = 'import-spritesheet-' + lastButtonId + '-button'
			ImportSpritesheet.close()
		}

		confirmButton.addEventListener('click', () => onConfirm('confirm', ''))
		exportSprButton.addEventListener('click', () => onConfirm('export-spr', '_export_spr'))
		exportS16Button.addEventListener('click', () => onConfirm('export-s16', '_export_s16'))
		exportC16Button.addEventListener('click', () => onConfirm('export-c16', '_export_c16'))

		let onKeydown = (event) => {
			if (event.key === 'Enter') {
				event.preventDefault()
				ImportSpritesheet.focusConfirmButton()
			}
		}
		tileWidthInput.addEventListener('keydown', onKeydown)
		tileHeightInput.addEventListener('keydown', onKeydown)
		colsInput.addEventListener('keydown', onKeydown)
		rowsInput.addEventListener('keydown', onKeydown)

		tauri_listen('import_spritesheet', (event) => {
			pathInput.value = event.payload.file_path
			widthInput.value = event.payload.width
			heightInput.value = event.payload.height
			tileWidthInput.value = event.payload.width
			tileHeightInput.value = event.payload.height
			colsInput.value = ImportSpritesheet.cols
			rowsInput.value = ImportSpritesheet.rows
			update(false)
			ImportSpritesheet.open()
			ImportSpritesheet.focusConfirmButton()
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
				exportSprButton.removeAttribute('disabled')
				exportS16Button.removeAttribute('disabled')
				exportC16Button.removeAttribute('disabled')
			} else {
				confirmButton.innerText = '[ Invalid Dimensions ]'
				confirmButton.setAttribute('disabled', '')
				exportSprButton.setAttribute('disabled', '')
				exportS16Button.setAttribute('disabled', '')
				exportC16Button.setAttribute('disabled', '')
			}

		}
	}
}

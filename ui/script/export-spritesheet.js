class ExportSpritesheet {
	static lastCombineStyle = 'combine-grid'

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

		const combineStyleSB = document.getElementById('export-spritesheet-combine-sb')
		const combineSBInfo = document.getElementById('export-spritesheet-combine-sb-info')
		const maxWidthInput = document.getElementById('export-spritesheet-max-width')
		const gapColorInput = document.getElementById('export-spritesheet-gap-color')

		const combineStyleGrid = document.getElementById('export-spritesheet-combine-grid')
		const combineGridInfo = document.getElementById('export-spritesheet-combine-grid-info')
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
			tauri_invoke('select_png_path', { filePath }).then((filePath) => {
				if (filePath) pathInput.value = filePath
			})
		})

		combineStyleSB.addEventListener('click', () => update(false))
		combineStyleGrid.addEventListener('click', () => update(false))

		gapColorInput.addEventListener('change', () => validateGapColor())

		confirmButton.addEventListener('click', () => {
			const filePath = pathInput.value
			if (combineStyleSB.checked) {
				console.log('export_spritebuilder_spritesheet')
				const maxWidth = parseInt(maxWidthInput.value)
				const dividerColor = gapColorInput.value
				tauri_invoke('export_spritebuilder_spritesheet', { filePath, maxWidth, dividerColor })
			} else {
				const cols = parseInt(colsInput.value)
				const rows = parseInt(rowsInput.value)
				tauri_invoke('export_spritesheet', { filePath, cols, rows })
			}
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
			update(true, cols, rows)
		}
		colsInput.addEventListener('input', onUpdateColsInput)
		colsInput.addEventListener('click', onUpdateColsInput)

		let onUpdateRowsInput = () => {
			const rows = parseInt(rowsInput.value)
			const cols = Math.ceil(Sprite.frameCount / rows)
			colsInput.value = cols
			update(true, cols, rows)
		}
		rowsInput.addEventListener('input', onUpdateRowsInput)
		rowsInput.addEventListener('click', onUpdateRowsInput)

		tauri_listen('export_spritesheet', () => {
			tauri_invoke('get_file_path', { extension: 'png' }).then((filePath) => {
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

			if (ExportSpritesheet.lastCombineStyle === 'combine-sb') {
				combineStyleSB.checked = true
				update(false)
			} else {
				combineStyleGrid.checked = true
				update(true, frameCount, 1)
			}

			ExportSpritesheet.open()
			ExportSpritesheet.focusConfirmButton()
		})

		tauri_listen('update_export_spritesheet_path', (event) => {
			pathInput.value = event.payload
		})

		tauri_listen('successful_spritesheet_export', () => {
			ExportSpritesheet.close()
		})

		const re = /#?[0-9a-fA-F]{6}/
		const validateGapColor = () => {
			if (re.test(gapColorInput.value)) {
				confirmButton.innerText = 'Export'
				confirmButton.removeAttribute('disabled')
			} else {
				confirmButton.innerText = '[ Invalid Gap Color ]'
				confirmButton.setAttribute('disabled', '')
			}
		}

		const update = (updateGridInfo, cols, rows) => {
			if (combineStyleSB.checked) {
				ExportSpritesheet.lastCombineStyle = 'combine-sb'
				combineSBInfo.classList.remove('hidden')
				combineGridInfo.classList.add('hidden')

			} else {
				if (updateGridInfo) {
					if (cols * rows >= Sprite.frameCount) {
						confirmButton.innerText = 'Export'
						confirmButton.removeAttribute('disabled')
					} else {
						confirmButton.innerText = '[ Invalid Dimensions ]'
						confirmButton.setAttribute('disabled', '')
					}
				}
				ExportSpritesheet.lastCombineStyle = 'combine-grid'
				combineSBInfo.classList.add('hidden')
				combineGridInfo.classList.remove('hidden')
			}
		}
	}
}

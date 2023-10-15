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

		colsInput.addEventListener('input', () => {
			const cols = parseInt(colsInput.value)
			const rows = Math.ceil(Sprite.frameCount / cols)
			rowsInput.value = rows
			update(cols, rows)
		})

		rowsInput.addEventListener('input', () => {
			const rows = parseInt(rowsInput.value)
			const cols = Math.ceil(Sprite.frameCount / rows)
			colsInput.value = cols
			update(cols, rows)
		})

		Tauri.event.listen('export_spritesheet', () => {
			Tauri.invoke('get_file_path', { extension: 'png' }).then((filePath) => {
				pathInput.value = filePath.replace('.png', '_spritesheet.png')
			})
			colsInput.value = Sprite.frameCount
			rowsInput.value = 1
			update(Sprite.frameCount, 1)
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
				confirmButton.innerText = '[ Invalid Values ]'
				confirmButton.setAttribute('disabled', '')
			}
		}
	}
}

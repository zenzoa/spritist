class ExportPng {
	static isOpen() {
		return document.getElementById('export-png-dialog').classList.contains('open')
	}

	static open() {
		document.getElementById('export-png-dialog').classList.add('open')
	}

	static close() {
		document.getElementById('export-png-dialog').classList.remove('open')
	}

	static focusConfirmButton() {
		document.getElementById('export-png-confirm-button').focus()
	}

	static setup() {
		document.getElementById('export-png-close-button').addEventListener('click', () => {
			ExportPng.close()
		})

		document.getElementById('export-png-cancel-button').addEventListener('click', () => {
			ExportPng.close()
		})

		document.getElementById('export-png-select-file-button').addEventListener('click', () => {
			const filePath = document.getElementById('export-png-path').value
			tauri_invoke('select_png_path', { filePath }).then((filePath) => {
				if (filePath) {
					document.getElementById('export-png-path').value = filePath
				}
			})
		})

		document.getElementById('export-png-path').addEventListener('keydown', (event) => {
			if (event.key === 'Enter') {
				event.preventDefault()
				ExportPng.focusConfirmButton()
			}
		})

		document.getElementById('export-png-confirm-button').addEventListener('click', () => {
			const filePath = document.getElementById('export-png-path').value
			const framesToExport = document.getElementById('export-png-frames').value
			tauri_invoke('export_png', { filePath, framesToExport })
		})

		tauri_listen('export_png', () => {
			let dropdown = document.getElementById('export-png-frames')
			let bgOption = document.getElementById('export-png-bg-option')
			tauri_invoke('get_file_path', { extension: 'png' }).then((filePath) => {
				document.getElementById('export-png-path').value = filePath
			})
			if (Selection.frameIndexes.length > 0) {
				dropdown.value = 'selected'
			} else {
				dropdown.value = 'all'
			}
			if (Sprite.cols && Sprite.rows && Sprite.frameCount === Sprite.cols * Sprite.rows) {
				if (!bgOption) {
					bgOption = document.createElement('option')
					bgOption.id = 'export-png-bg-option'
					bgOption.value = 'combined'
					bgOption.innerText = 'Combined As One Image'
					dropdown.append(bgOption)
					dropdown.value = "combined"
				}
			} else if (bgOption) {
				bgOption.remove()
			}

			ExportPng.open()
			ExportPng.focusConfirmButton()
		})

		tauri_listen('update_export_png_path', (event) => {
			document.getElementById('export-png-path').value = event.payload
			document.getElementById('export-spritesheet-path').value = event.payload
		})

		tauri_listen('successful_png_export', () => {
			ExportPng.close()
		})
	}
}

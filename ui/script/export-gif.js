class ExportGif {
	static isOpen() {
		return document.getElementById('export-gif-dialog').classList.contains('open')
	}

	static open() {
		document.getElementById('export-gif-dialog').classList.add('open')
	}

	static close() {
		document.getElementById('export-gif-dialog').classList.remove('open')
	}

	static focusConfirmButton() {
		document.getElementById('export-gif-confirm-button').focus()
	}

	static setup() {
		document.getElementById('export-gif-close-button').addEventListener('click', () => {
			ExportGif.close()
		})

		document.getElementById('export-gif-cancel-button').addEventListener('click', () => {
			ExportGif.close()
		})

		document.getElementById('export-gif-select-file-button').addEventListener('click', () => {
			const filePath = document.getElementById('export-gif-path').value
			tauri_invoke('select_gif_path', { filePath }).then((filePath) => {
				if (filePath) {
					document.getElementById('export-gif-path').value = filePath
				}
			})
		})

		let onKeydown = (event) => {
			if (event.key === 'Enter') {
				event.preventDefault()
				ExportGif.focusConfirmButton()
			}
		}
		document.getElementById('export-gif-path').addEventListener('keydown', onKeydown)
		document.getElementById('export-gif-speed').addEventListener('keydown', onKeydown)

		document.getElementById('export-gif-confirm-button').addEventListener('click', () => {
			const filePath = document.getElementById('export-gif-path').value
			const framesToExport = document.getElementById('export-gif-frames').value
			const frameDelay = parseInt(document.getElementById('export-gif-speed').value)
			if (isNaN(frameDelay) || frameDelay <= 0) {
				tauri_invoke('error_dialog', { why: "Invalid animation speed. Must be an integer greater than 0." })
			} else {
				tauri_invoke('export_gif', { filePath, framesToExport, frameDelay })
			}
		})

		tauri_listen('export_gif', () => {
			tauri_invoke('get_file_path', { extension: 'gif' }).then((filePath) => {
				document.getElementById('export-gif-path').value = filePath
			})
			if (Selection.frameIndexes.length > 0) {
				document.getElementById('export-gif-frames').value = "selected"
			} else {
				document.getElementById('export-gif-frames').value = "all"
			}

			ExportGif.open()
			ExportGif.focusConfirmButton()
		})

		tauri_listen('update_export_gif_path', (event) => {
			document.getElementById('export-gif-path').value = event.payload
		})

		tauri_listen('successful_gif_export', (event) => {
			ExportGif.close()
		})
	}
}

class ExportPng {
	static setup() {
		document.getElementById('export-png-close-button').addEventListener('click', () => {
			document.getElementById('export-png-dialog').classList.remove('open')
		})

		document.getElementById('export-png-cancel-button').addEventListener('click', () => {
			document.getElementById('export-png-dialog').classList.remove('open')
		})

		document.getElementById('export-png-select-file-button').addEventListener('click', () => {
			const filePath = document.getElementById('export-png-path').value
			Tauri.invoke('select_png_path', { filePath }).then((filePath) => {
				if (filePath) {
					document.getElementById('export-png-path').value = filePath
				}
			})
		})

		document.getElementById('export-png-confirm-button').addEventListener('click', () => {
			const filePath = document.getElementById('export-png-path').value
			const framesToExport = document.getElementById('export-png-frames').value
			Tauri.invoke('export_png', { filePath, framesToExport })
		})

		Tauri.event.listen('export_png', () => {
			let dropdown = document.getElementById('export-png-frames')
			let bgOption = document.getElementById('export-png-bg-option')
			Tauri.invoke('get_file_path', { extension: 'png' }).then((filePath) => {
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
			document.getElementById('export-png-dialog').classList.add('open')
			document.getElementById('export-png-confirm-button').focus()
		})

		Tauri.event.listen('update_export_png_path', (event) => {
			document.getElementById('export-png-path').value = event.payload
		})

		Tauri.event.listen('successful_png_export', () => {
			document.getElementById('export-png-dialog').classList.remove('open')
		})
	}
}

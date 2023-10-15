class ExportSpritesheet {
	static setup() {
		document.getElementById('export-spritesheet-close-button').addEventListener('click', () => {
			document.getElementById('export-spritesheet-dialog').classList.remove('open')
		})

		Tauri.event.listen('export_spritesheet', () => {
			Tauri.invoke('get_file_path', { extension: 'png' }).then((filePath) => {
				document.getElementById('export-spritesheet-path').value = filePath
			})
			document.getElementById('export-spritesheet-dialog').classList.add('open')
		})

		Tauri.event.listen('update_export_spritesheet_path', (event) => {
			document.getElementById('export-spritesheet-path').value = event.payload
		})
	}
}

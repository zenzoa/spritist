const Tauri = window.__TAURI__

window.addEventListener('load', () => {

	// disable context menu
	document.body.addEventListener('contextmenu', event => {
		event.preventDefault()
		return false
	}, false)

	Sprite.drawFrames()

	Tauri.event.listen('redraw', (event) => {
		Sprite.frame_count = event.payload.frame_count
		Selection.frameIndexes = event.payload.selected_frames
		Sprite.setBackgroundSize(event.payload.cols, event.payload.rows)
		Sprite.drawFrames()
	})

	Tauri.event.listen('update_selection', (event) => {
		Selection.frameIndexes = event.payload
		Sprite.updateSelectedFrames()
	})

	Tauri.event.listen('update_save_button', (event) => {
		if (event.payload) {
			document.getElementById('save-file-button').removeAttribute('disabled')
		} else {
			document.getElementById('save-file-button').setAttribute('disabled', '')
		}
	})
	Tauri.event.listen('update_save_as_button', (event) => {
		if (event.payload) {
			document.getElementById('save-as-file-button').removeAttribute('disabled')
		} else {
			document.getElementById('save-as-file-button').setAttribute('disabled', '')
		}
	})
	Tauri.event.listen('update_insert_button', (event) => {
		if (event.payload) {
			document.getElementById('insert-button').removeAttribute('disabled')
		} else {
			document.getElementById('insert-button').setAttribute('disabled', '')
		}
	})
	Tauri.event.listen('update_undo_button', (event) => {
		if (event.payload) {
			document.getElementById('undo-button').removeAttribute('disabled')
		} else {
			document.getElementById('undo-button').setAttribute('disabled', '')
		}
	})
	Tauri.event.listen('update_redo_button', (event) => {
		if (event.payload) {
			document.getElementById('redo-button').removeAttribute('disabled')
		} else {
			document.getElementById('redo-button').setAttribute('disabled', '')
		}
	})
	Tauri.event.listen('update_copy_button', (event) => {
		if (event.payload) {
			document.getElementById('copy-button').removeAttribute('disabled')
		} else {
			document.getElementById('copy-button').setAttribute('disabled', '')
		}
	})
	Tauri.event.listen('update_paste_button', (event) => {
		if (event.payload) {
			document.getElementById('paste-button').removeAttribute('disabled')
		} else {
			document.getElementById('paste-button').setAttribute('disabled', '')
		}
	})
	Tauri.event.listen('update_delete_button', (event) => {
		if (event.payload) {
			document.getElementById('delete-button').removeAttribute('disabled')
		} else {
			document.getElementById('delete-button').setAttribute('disabled', '')
		}
	})

	Tauri.event.listen('view_as_sprite', viewAsSprite)
	Tauri.event.listen('view_as_bg', viewAsBg)

	Tauri.event.listen('set_show_image_info', setShowImageInfo)
	Tauri.event.listen('set_transparent_color', setTransparentColor)
	Tauri.event.listen('set_theme', setTheme)

	Tauri.event.listen('error', (event) => {
		Tauri.invoke('show_error_message', { why: event.payload })
	})

	document.getElementById('new-file-button').addEventListener('click', () => {
		Tauri.invoke('activate_new_file')
	})
	document.getElementById('open-file-button').addEventListener('click', () => {
		Tauri.invoke('activate_open_file')
	})
	document.getElementById('save-file-button').addEventListener('click', () => {
		Tauri.invoke('activate_save_file')
	})
	document.getElementById('save-as-file-button').addEventListener('click', () => {
		Tauri.invoke('activate_save_as')
	})
	document.getElementById('insert-button').addEventListener('click', () => {
		Tauri.invoke('activate_insert_image')
	})
	document.getElementById('undo-button').addEventListener('click', () => {
		Tauri.invoke('undo')
	})
	document.getElementById('redo-button').addEventListener('click', () => {
		Tauri.invoke('redo')
	})
	document.getElementById('copy-button').addEventListener('click', () => {
		Tauri.invoke('copy')
	})
	document.getElementById('paste-button').addEventListener('click', () => {
		Tauri.invoke('paste')
	})
	document.getElementById('delete-button').addEventListener('click', () => {
		Tauri.invoke('delete')
	})
	document.getElementById('bg-cols').addEventListener('change', (event) => {
		Sprite.setBackgroundSize(parseInt(event.target.value), null)
	})
	document.getElementById('bg-rows').addEventListener('change', (event) => {
		Sprite.setBackgroundSize(null, parseInt(event.target.value))
	})
	document.getElementById('exit-bg-mode').addEventListener('click', () => {
		Tauri.invoke('view_as_sprite')
	})

	document.body.addEventListener('keydown', (event) => {
		if (event.key === 'ArrowLeft') {
			Selection.selectLeft(event.shiftKey, event.ctrlKey)
		} else if (event.key === 'ArrowRight') {
			Selection.selectRight(event.shiftKey, event.ctrlKey)
		} else if (event.key === 'Escape') {
			console.log('close dialog or clear selection')
			document.getElementById('export-png-dialog').classList.remove('open')
			document.getElementById('export-gif-dialog').classList.remove('open')
			document.getElementById('export-spritesheet-dialog').classList.remove('open')
			document.getElementById('import-spritesheet-dialog').classList.remove('open')
		}
	})

	Tauri.invoke('get_config').then((config) => {
		setShowImageInfo({ payload: config.show_image_info })
		setTransparentColor({ payload: config.transparent_color })
		setTheme({ payload: config.theme })
	})

	ExportPng.setup()
	ExportGif.setup()
	ExportSpritesheet.setup()
	ImportSpritesheet.setup()
})

const viewAsSprite = () => {
	document.body.className = ''
}

const viewAsBg = () => {
	document.body.className = 'bg-mode'
	Sprite.setBackgroundSize()
}

const setShowImageInfo = (event) => {
	const style = document.documentElement.style
	if (event.payload) {
		style.setProperty('--info-display', 'block')
	} else {
		style.setProperty('--info-display', 'none')
	}
}

const setTransparentColor = (event) => {
	const style = document.documentElement.style
	style.setProperty('--frame-bg-color', event.payload)
}

const setTheme = (event) => {
	Theme.set(event.payload)
}

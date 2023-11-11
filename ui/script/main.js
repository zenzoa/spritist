const Tauri = window.__TAURI__

window.addEventListener('load', () => {

	// disable context menu
	document.body.addEventListener('contextmenu', event => {
		event.preventDefault()
		return false
	}, false)

	Sprite.drawFrames()

	Tauri.event.listen('redraw', (event) => {
		Sprite.frameCount = event.payload.frame_count
		Selection.frameIndexes = event.payload.selected_frames
		Sprite.setBackgroundSize(event.payload.cols, event.payload.rows)
		Sprite.drawFrames()
	})

	Tauri.event.listen('reload_selection', () => {
		Sprite.reloadSelectedFrames()
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

	Tauri.event.listen('set_scale', (event) => {
		Sprite.scale = event.payload
		Sprite.drawFrames()
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

	document.body.addEventListener('mouseup', Drag.end)
	document.body.addEventListener('mouseenter', (event) => {
		if (!event.buttons) {
			Drag.cancel()
		}
	})

	document.body.addEventListener('keydown', (event) => {
		const key = event.key.toLowerCase();

		if (key === 'q' && event.ctrlKey) {
			event.preventDefault()
			Tauri.invoke('try_quit')
			return
		}

		const dialogIsOpen =
		document.getElementById('export-png-dialog').classList.contains('open') ||
		document.getElementById('export-gif-dialog').classList.contains('open') ||
		document.getElementById('export-spritesheet-dialog').classList.contains('open') ||
		document.getElementById('import-spritesheet-dialog').classList.contains('open')

		if (dialogIsOpen) {
			if (event.key === 'Escape') {
				document.getElementById('export-png-dialog').classList.remove('open')
				document.getElementById('export-gif-dialog').classList.remove('open')
				document.getElementById('export-spritesheet-dialog').classList.remove('open')
				document.getElementById('import-spritesheet-dialog').classList.remove('open')
			}
			return

		} else if (key === 'n' && event.ctrlKey) {
			event.preventDefault()
			Tauri.invoke('activate_new_file')
		} else if (key === 'o' && event.ctrlKey) {
			event.preventDefault()
			Tauri.invoke('activate_open_file')
		} else if (key === 's' && event.shiftKey && event.ctrlKey) {
			event.preventDefault()
			Tauri.invoke('activate_save_as')
		} else if (key === 's' && event.ctrlKey) {
			event.preventDefault()
			Tauri.invoke('activate_save_file')
		} else if (key === 'b' && event.shiftKey && event.ctrlKey) {
			event.preventDefault()
			Tauri.invoke('activate_import_png_as_blk')
		} else if (key === 't' && event.shiftKey && event.ctrlKey) {
			event.preventDefault()
			Tauri.invoke('export_spritesheet')
		} else if (key === 't' && event.ctrlKey) {
			event.preventDefault()
			Tauri.invoke('activate_import_spritesheet')
		} else if (key === 'e' && event.ctrlKey) {
			event.preventDefault()
			Tauri.invoke('export_png')
		} else if (key === 'g' && event.ctrlKey) {
			event.preventDefault()
			Tauri.invoke('export_gif')

		} else if (key === 'z' && event.ctrlKey) {
			event.preventDefault()
			Tauri.invoke('undo')
		} else if (key === 'y' && event.ctrlKey) {
			event.preventDefault()
			Tauri.invoke('redo')
		} else if (key === 'x' && event.ctrlKey) {
			event.preventDefault()
			Tauri.invoke('cut')
		} else if (key === 'c' && event.ctrlKey) {
			event.preventDefault()
			Tauri.invoke('copy')
		} else if (key === 'v' && event.ctrlKey) {
			event.preventDefault()
			Tauri.invoke('paste')
		} else if (key === 'Delete') {
			event.preventDefault()
			Tauri.invoke('delete_frames')
		} else if (key === 'a' && event.ctrlKey) {
			event.preventDefault()
			Tauri.invoke('select_all')
		} else if (key === 'd' && event.ctrlKey) {
			event.preventDefault()
			Tauri.invoke('deselect_all')
		} else if (key === 'i' && event.shiftKey && event.ctrlKey) {
			event.preventDefault()
			Tauri.invoke('activate_replace_frame')
		} else if (key === 'i' && event.ctrlKey) {
			event.preventDefault()
			Tauri.invoke('activate_insert_image')

		} else if (event.key === '0' && event.ctrlKey) {
			event.preventDefault()
			if (Sprite.scale > 1) Tauri.invoke('reset_zoom')
		} else if (event.key === '=' && event.ctrlKey) {
			event.preventDefault()
			if (Sprite.scale < 4) Tauri.invoke('zoom_in')
		} else if (event.key === '-' && event.ctrlKey) {
			event.preventDefault()
			if (Sprite.scale > 1) Tauri.invoke('zoom_out')

		} else if (event.key === 'ArrowLeft' && event.shiftKey && event.ctrlKey) {
			event.preventDefault()
			Tauri.invoke('shift_selection', { xShift: -1, yShift: 0 })
		} else if (event.key === 'ArrowRight' && event.shiftKey && event.ctrlKey) {
			event.preventDefault()
			Tauri.invoke('shift_selection', { xShift: 1, yShift: 0 })
		} else if (event.key === 'ArrowUp' && event.shiftKey && event.ctrlKey) {
			event.preventDefault()
			Tauri.invoke('shift_selection', { xShift: 0, yShift: -1 })
		} else if (event.key === 'ArrowDown' && event.shiftKey && event.ctrlKey) {
			event.preventDefault()
			Tauri.invoke('shift_selection', { xShift: 0, yShift: 1 })

		} else if (event.key === 'ArrowLeft') {
			event.preventDefault()
			Selection.selectLeft()
		} else if (event.key === 'ArrowRight') {
			event.preventDefault()
			Selection.selectRight()
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

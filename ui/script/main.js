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
		const KEY = event.key.toUpperCase()
		const ONLY = !event.ctrlKey && !event.shiftKey && !event.altKey
		const CTRL = event.ctrlKey && !event.shiftKey && !event.altKey
		const CTRL_SHIFT = event.ctrlKey && event.shiftKey && !event.altKey

		if (CTRL && KEY === 'Q') {
			event.preventDefault()
			Tauri.invoke('try_quit')

		} else if (ExportPng.isOpen() || ExportGif.isOpen() || ExportSpritesheet.isOpen() || ImportSpritesheet.isOpen()) {
			if (ONLY && KEY === 'ESCAPE') {
				event.preventDefault()
				ExportPng.close()
				ExportGif.close()
				ExportSpritesheet.close()
				ImportSpritesheet.close()
			}

		} else if (CTRL && KEY === 'N') {
			event.preventDefault()
			Tauri.invoke('activate_new_file')
		} else if (CTRL && KEY === 'O') {
			event.preventDefault()
			Tauri.invoke('activate_open_file')
		} else if (CTRL && KEY === 'S') {
			event.preventDefault()
			Tauri.invoke('activate_save_file')
		} else if (CTRL_SHIFT && KEY === 'S') {
			event.preventDefault()
			Tauri.invoke('activate_save_as')
		} else if (CTRL && KEY === 'B') {
			event.preventDefault()
			Tauri.invoke('activate_import_png_as_blk')
		} else if (CTRL_SHIFT && KEY === 'T') {
			event.preventDefault()
			Tauri.invoke('export_spritesheet')
		} else if (CTRL && KEY === 'T') {
			event.preventDefault()
			Tauri.invoke('activate_import_spritesheet')
		} else if (CTRL && KEY === 'E') {
			event.preventDefault()
			Tauri.invoke('export_png')
		} else if (CTRL && KEY === 'G') {
			event.preventDefault()
			Tauri.invoke('export_gif')

		} else if (CTRL && KEY === 'Z') {
			event.preventDefault()
			Tauri.invoke('undo')
		} else if (CTRL && KEY === 'Y') {
			event.preventDefault()
			Tauri.invoke('redo')
		} else if (CTRL && KEY === 'X') {
			event.preventDefault()
			Tauri.invoke('cut')
		} else if (CTRL && KEY === 'C') {
			event.preventDefault()
			Tauri.invoke('copy')
		} else if (CTRL && KEY === 'V') {
			event.preventDefault()
			Tauri.invoke('paste')
		} else if (ONLY && KEY === 'DELETE') {
			event.preventDefault()
			Tauri.invoke('delete_frames')
		} else if (CTRL && KEY === 'A') {
			event.preventDefault()
			Tauri.invoke('select_all')
		} else if (CTRL && KEY === 'D') {
			event.preventDefault()
			Tauri.invoke('deselect_all')
		} else if (CTRL && KEY === 'R') {
			event.preventDefault()
			Tauri.invoke('activate_replace_frame')
		} else if (CTRL && KEY === 'I') {
			event.preventDefault()
			Tauri.invoke('activate_insert_image')

		} else if (CTRL && KEY === '0') {
			event.preventDefault()
			if (Sprite.scale > 1) Tauri.invoke('reset_zoom')
		} else if ((CTRL || CTRL_SHIFT) && (KEY === '=' || KEY === '+')) {
			event.preventDefault()
			if (Sprite.scale < 4) Tauri.invoke('zoom_in')
		} else if ((CTRL || CTRL_SHIFT) && (KEY === '-' || KEY === '_')) {
			event.preventDefault()
			if (Sprite.scale > 1) Tauri.invoke('zoom_out')

		} else if (CTRL_SHIFT && KEY === 'ARROWLEFT') {
			event.preventDefault()
			Tauri.invoke('shift_selection', { xShift: -1, yShift: 0 })
		} else if (CTRL_SHIFT && KEY === 'ARROWRIGHT') {
			event.preventDefault()
			Tauri.invoke('shift_selection', { xShift: 1, yShift: 0 })
		} else if (CTRL_SHIFT && KEY === 'ARROWUP') {
			event.preventDefault()
			Tauri.invoke('shift_selection', { xShift: 0, yShift: -1 })
		} else if (CTRL_SHIFT && KEY === 'ARROWDOWN') {
			event.preventDefault()
			Tauri.invoke('shift_selection', { xShift: 0, yShift: 1 })

		} else if (ONLY && KEY === 'ARROWLEFT') {
			event.preventDefault()
			Selection.selectLeft()
		} else if (ONLY && KEY === 'ARROWRIGHT') {
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

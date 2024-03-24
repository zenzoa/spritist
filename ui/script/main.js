const Tauri = window.__TAURI__
const tauri_listen = Tauri.event.listen
const tauri_invoke = Tauri.core.invoke
const convertFileSrc = Tauri.core.convertFileSrc

window.addEventListener('load', () => {

	// disable context menu
	document.body.addEventListener('contextmenu', event => {
		event.preventDefault()
		return false
	}, false)

	tauri_listen('redraw', (event) => {
		Sprite.frameCount = event.payload.frame_count
		Selection.frameIndexes = event.payload.selected_frames
		Sprite.setBackgroundSize(event.payload.cols, event.payload.rows)
		Sprite.drawFrames()
	})

	tauri_listen('reload_selection', () => {
		Sprite.reloadSelectedFrames()
	})

	tauri_listen('update_selection', (event) => {
		Selection.frameIndexes = event.payload
		Sprite.updateSelectedFrames()
	})

	tauri_listen('set_scale', (event) => {
		Sprite.scale = event.payload
		Sprite.drawFrames()
	})

	tauri_listen('view_as_sprite', viewAsSprite)
	tauri_listen('view_as_bg', viewAsBg)

	tauri_listen('set_show_image_info', setShowImageInfo)
	tauri_listen('set_transparent_color', setTransparentColor)
	tauri_listen('set_theme', setTheme)

	tauri_listen('set_toolbar_visibility', setToolbarVisibility)

	tauri_listen('error', (event) => {
		tauri_invoke('error_dialog', { why: event.payload })
	})

	tauri_listen('notify', (event) => {
		const notificationElement = document.getElementById('notification')
		notificationElement.innerText = event.payload
		notificationElement.classList.add('on')
		setTimeout(() => notificationElement.classList.remove('on'), 2000)
	})

	tauri_listen('show_spinner', showSpinner)
	tauri_listen('hide_spinner', hideSpinner)

	document.getElementById('new-file-button').addEventListener('click', () => {
		tauri_invoke('activate_new_file')
	})
	document.getElementById('open-file-button').addEventListener('click', () => {
		tauri_invoke('activate_open_file')
	})
	document.getElementById('save-file-button').addEventListener('click', () => {
		tauri_invoke('activate_save_file')
	})
	document.getElementById('save-as-file-button').addEventListener('click', () => {
		tauri_invoke('activate_save_as')
	})
	document.getElementById('insert-button').addEventListener('click', () => {
		tauri_invoke('activate_insert_image')
	})
	document.getElementById('undo-button').addEventListener('click', () => {
		tauri_invoke('undo')
	})
	document.getElementById('redo-button').addEventListener('click', () => {
		tauri_invoke('redo')
	})
	document.getElementById('copy-button').addEventListener('click', () => {
		tauri_invoke('copy')
	})
	document.getElementById('paste-button').addEventListener('click', () => {
		tauri_invoke('paste')
	})
	document.getElementById('delete-button').addEventListener('click', () => {
		tauri_invoke('delete_frames')
	})
	document.getElementById('bg-cols').addEventListener('change', (event) => {
		Sprite.setBackgroundSize(parseInt(event.target.value), null)
	})
	document.getElementById('bg-rows').addEventListener('change', (event) => {
		Sprite.setBackgroundSize(null, parseInt(event.target.value))
	})
	document.getElementById('exit-bg-mode').addEventListener('click', () => {
		tauri_invoke('view_as_sprite')
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
			tauri_invoke('try_quit')

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
			tauri_invoke('activate_new_file')
		} else if (CTRL && KEY === 'O') {
			event.preventDefault()
			tauri_invoke('activate_open_file')
		} else if (CTRL && KEY === 'S') {
			event.preventDefault()
			tauri_invoke('activate_save_file')
		} else if (CTRL_SHIFT && KEY === 'S') {
			event.preventDefault()
			tauri_invoke('activate_save_as')
		} else if (CTRL && KEY === 'B') {
			event.preventDefault()
			tauri_invoke('activate_import_png_as_blk')
		} else if (CTRL && KEY === 'T') {
			event.preventDefault()
			tauri_invoke('activate_import_spritesheet')
		} else if (CTRL && KEY === 'E') {
			event.preventDefault()
			Tauri.event.emit('export_png')
		} else if (CTRL && KEY === 'G') {
			event.preventDefault()
			Tauri.event.emit('export_gif')
		} else if (CTRL_SHIFT && KEY === 'T') {
			event.preventDefault()
			Tauri.event.emit('export_spritesheet')

		} else if (CTRL && KEY === 'Z') {
			event.preventDefault()
			tauri_invoke('undo')
		} else if (CTRL && KEY === 'Y') {
			event.preventDefault()
			tauri_invoke('redo')
		} else if (CTRL && KEY === 'X') {
			event.preventDefault()
			tauri_invoke('cut')
		} else if (CTRL && KEY === 'C') {
			event.preventDefault()
			tauri_invoke('copy')
		} else if (CTRL && KEY === 'V') {
			event.preventDefault()
			tauri_invoke('paste')
		} else if (ONLY && KEY === 'DELETE') {
			event.preventDefault()
			tauri_invoke('delete_frames')
		} else if (CTRL && KEY === 'A') {
			event.preventDefault()
			tauri_invoke('select_all')
		} else if (CTRL && KEY === 'D') {
			event.preventDefault()
			tauri_invoke('deselect_all')
		} else if (CTRL && KEY === 'R') {
			event.preventDefault()
			tauri_invoke('activate_replace_frame')
		} else if (CTRL && KEY === 'I') {
			event.preventDefault()
			tauri_invoke('activate_insert_image')

		} else if (CTRL && KEY === '0') {
			event.preventDefault()
			if (Sprite.scale > 1) tauri_invoke('reset_zoom')
		} else if ((CTRL || CTRL_SHIFT) && (KEY === '=' || KEY === '+')) {
			event.preventDefault()
			if (Sprite.scale < 4) tauri_invoke('zoom_in')
		} else if ((CTRL || CTRL_SHIFT) && (KEY === '-' || KEY === '_')) {
			event.preventDefault()
			if (Sprite.scale > 1) tauri_invoke('zoom_out')

		} else if (CTRL_SHIFT && KEY === 'ARROWLEFT') {
			event.preventDefault()
			tauri_invoke('shift_selection', { xShift: -1, yShift: 0 })
		} else if (CTRL_SHIFT && KEY === 'ARROWRIGHT') {
			event.preventDefault()
			tauri_invoke('shift_selection', { xShift: 1, yShift: 0 })
		} else if (CTRL_SHIFT && KEY === 'ARROWUP') {
			event.preventDefault()
			tauri_invoke('shift_selection', { xShift: 0, yShift: -1 })
		} else if (CTRL_SHIFT && KEY === 'ARROWDOWN') {
			event.preventDefault()
			tauri_invoke('shift_selection', { xShift: 0, yShift: 1 })

		} else if (ONLY && KEY === 'ARROWLEFT') {
			event.preventDefault()
			Selection.selectLeft()
		} else if (ONLY && KEY === 'ARROWRIGHT') {
			event.preventDefault()
			Selection.selectRight()
		}
	})

	tauri_invoke('get_config').then((config) => {
		setShowImageInfo({ payload: config.show_image_info })
		setTransparentColor({ payload: config.transparent_color })
		setTheme({ payload: config.theme })
		setToolbarVisibility({ payload: config.show_toolbar })
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

const setToolbarVisibility = (event) => {
	if (event.payload) {
		document.documentElement.style.setProperty(`--toolbar-height`, '48px')
		document.getElementById('toolbar').classList.remove('hidden')
	} else {
		document.documentElement.style.setProperty(`--toolbar-height`, '0')
		document.getElementById('toolbar').classList.add('hidden')
	}
}

const showSpinner = (event) => {
	const spinnerEl = document.getElementById('spinner')
	spinnerEl.classList.add('on')
}

const hideSpinner = (event) => {
	const spinnerEl = document.getElementById('spinner')
	spinnerEl.classList.remove('on')
}

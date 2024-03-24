use tauri::{ AppHandle, Manager, State };

use crate::{
	palette,
	file::FileState,
	view::ViewState,
	selection::SelectionState,
	history::HistoryState
};

#[derive(Clone, serde::Serialize)]
pub struct RedrawPayload {
	pub frame_count: usize,
	pub selected_frames: Vec<usize>,
	pub cols: usize,
	pub rows: usize,
}

pub fn reset_state(app_handle: &AppHandle) {
	let file_state: State<FileState> = app_handle.state();
	*file_state.file_title.lock().unwrap() = "".to_string();
	*file_state.file_path.lock().unwrap() = None;
	*file_state.file_is_open.lock().unwrap() = false;
	*file_state.file_is_modified.lock().unwrap() = false;
	*file_state.frames.lock().unwrap() = Vec::new();
	*file_state.palette.lock().unwrap() = palette::original_palette();
	*file_state.cols.lock().unwrap() = 0;
	*file_state.rows.lock().unwrap() = 0;
	*file_state.read_only.lock().unwrap() = false;

	let selection_state: State<SelectionState> = app_handle.state();
	*selection_state.selected_frames.lock().unwrap() = Vec::new();

	let history_state: State<HistoryState> = app_handle.state();
	*history_state.undo_stack.lock().unwrap() = Vec::new();
	*history_state.redo_stack.lock().unwrap() = Vec::new();

	let view_state: State<ViewState> = app_handle.state();
	*view_state.zoom_scale.lock().unwrap() = 1;
}

pub fn redraw(app_handle: &AppHandle) {
	let file_state: State<FileState> = app_handle.state();
	let selection_state: State<SelectionState> = app_handle.state();
	app_handle.emit("redraw", RedrawPayload{
		frame_count: file_state.frames.lock().unwrap().len(),
		selected_frames: selection_state.selected_frames.lock().unwrap().clone(),
		cols: *file_state.cols.lock().unwrap(),
		rows: *file_state.rows.lock().unwrap(),
	}).unwrap();
}

pub fn update_window_title(app_handle: &AppHandle) {
	let window = app_handle.get_webview_window("main").unwrap();
	let file_state: State<FileState> = app_handle.state();
	if *file_state.file_is_open.lock().unwrap() {
		let file_title = file_state.file_title.lock().unwrap();
		let file_modified = if *file_state.file_is_modified.lock().unwrap() { "*" } else { "" };
		let read_only = if *file_state.read_only.lock().unwrap() { " (read-only)" } else { "" };
		let palette_name = if let Some(palette_name) = &file_state.palette.lock().unwrap().file_name {
			format!(" - using {}", palette_name)
		} else {
			"".to_string()
		};
		if file_title.len() > 0 {
			window.set_title(&format!("{}{}{}{} - Spritist", &file_modified, &file_title, &read_only, &palette_name)).unwrap();
		} else {
			window.set_title(&format!("{}Untitled{}{} - Spritist", &file_modified, &read_only, &palette_name)).unwrap();
		}
	} else {
		window.set_title("Spritist").unwrap();
	}
}

use std::sync::Mutex;
use tauri::{
	AppHandle,
	Manager,
	State,
};

use crate::{
	file::{ FileState, Frame },
	selection::{ SelectionState, delete_frames },
	history::add_state_to_history,
	state::RedrawPayload
};

pub struct ClipboardState {
	pub copied_frames: Mutex<Vec<Frame>>
}

#[tauri::command]
pub fn cut(app_handle: AppHandle, file_state: State<FileState>, selection_state: State<SelectionState>, clipboard_state: State<ClipboardState>) {
	copy(app_handle.clone(), file_state.clone(), selection_state.clone(), clipboard_state);
	delete_frames(app_handle, file_state, selection_state);
}

#[tauri::command]
pub fn copy(app_handle: AppHandle, file_state: State<FileState>, selection_state: State<SelectionState>, clipboard_state: State<ClipboardState>) {
	let frames = file_state.frames.lock().unwrap();
	let selected_frames = selection_state.selected_frames.lock().unwrap();
	let mut copied_frames: Vec<Frame> = Vec::new();
	for (i, frame) in frames.iter().enumerate() {
		if selected_frames.contains(&i) {
			copied_frames.push(frame.clone());
		}
	}
	let copied_frame_count = copied_frames.len();
	*clipboard_state.copied_frames.lock().unwrap() = copied_frames;
	update_clipboard_items(&app_handle, copied_frame_count);
}

#[tauri::command]
pub fn paste(app_handle: AppHandle, file_state: State<FileState>, selection_state: State<SelectionState>, clipboard_state: State<ClipboardState>) {
	add_state_to_history(&app_handle);

	let mut frames = file_state.frames.lock().unwrap();
	let mut selected_frames = selection_state.selected_frames.lock().unwrap();
	let copied_frames = clipboard_state.copied_frames.lock().unwrap();

	let insert_point = match selected_frames.iter().max() {
		Some(index) => *index + 1,
		None => frames.len()
	};

	if insert_point <= frames.len() {
		frames.splice(insert_point..insert_point, copied_frames.iter().cloned());
		*selected_frames = (insert_point..(insert_point + copied_frames.len())).map(usize::from).collect();
		app_handle.emit_all("redraw", RedrawPayload{
			frame_count: frames.len(),
			selected_frames: selected_frames.clone(),
			cols: *file_state.cols.lock().unwrap(),
			rows: *file_state.rows.lock().unwrap(),
		}).unwrap();
	}
}

pub fn update_clipboard_items(app_handle: &AppHandle, copied_frame_count: usize) {
	let window = app_handle.get_window("main").unwrap();
	let menu_handle = window.menu_handle();
	let has_copied_frames = copied_frame_count > 0;
	menu_handle.get_item("paste").set_enabled(has_copied_frames).unwrap();
	app_handle.emit_all("update_paste_button", has_copied_frames).unwrap();
}

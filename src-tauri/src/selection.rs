use std::sync::Mutex;
use tauri::{
	AppHandle,
	Manager,
	State,
};

use crate::{
	state::RedrawPayload,
	file::{ FileState, Frame },
	history::add_state_to_history
};

pub struct SelectionState {
	pub selected_frames: Mutex<Vec<usize>>
}

#[tauri::command]
pub fn update_selection(app_handle: AppHandle, selection_state: State<SelectionState>, new_selected_frames: Vec<usize>) {
	let mut selected_frames = selection_state.selected_frames.lock().unwrap();
	*selected_frames = new_selected_frames;
	update_selection_items(&app_handle, selected_frames.len());
}

pub fn select_all(app_handle: AppHandle) {
	let file_state: State<FileState> = app_handle.state();
	let selection_state: State<SelectionState> = app_handle.state();
	let mut selected_frames = selection_state.selected_frames.lock().unwrap();
	let frame_count = file_state.frames.lock().unwrap().len();
	*selected_frames = (0..frame_count).map(usize::from).collect();
	app_handle.emit_all("update_selection", selected_frames.clone()).unwrap();
	update_selection_items(&app_handle, selected_frames.len());
}

pub fn deselect_all(app_handle: AppHandle) {
	let selection_state: State<SelectionState> = app_handle.state();
	let mut selected_frames = selection_state.selected_frames.lock().unwrap();
	*selected_frames = Vec::new();
	app_handle.emit_all("update_selection", selected_frames.clone()).unwrap();
	update_selection_items(&app_handle, selected_frames.len());
}

#[tauri::command]
pub fn move_frames(app_handle: AppHandle, file_state: State<FileState>, selection_state: State<SelectionState>, mut insert_point: usize) {
	add_state_to_history(&app_handle);

	let mut moved_frames: Vec<Frame> = Vec::new();
	let mut remaining_frames: Vec<Frame> = Vec::new();

	let mut frames = file_state.frames.lock().unwrap();
	let mut selected_frames = selection_state.selected_frames.lock().unwrap();

	for (i, frame) in frames.iter().enumerate() {
		if selected_frames.contains(&i) {
			moved_frames.push(frame.clone());
		} else {
			remaining_frames.push(frame.clone());
		}
	}

	for index in selected_frames.iter() {
		if *index < insert_point {
			insert_point -= 1;
		}
	}

	if insert_point <= remaining_frames.len() {
		remaining_frames.splice(insert_point..insert_point, moved_frames.iter().cloned());
		*frames = remaining_frames.clone();
		*selected_frames = (insert_point..(insert_point + moved_frames.len())).map(usize::from).collect();
		app_handle.emit_all("redraw", RedrawPayload{
			frame_count: frames.len(),
			selected_frames: selected_frames.clone(),
			cols: *file_state.cols.lock().unwrap(),
			rows: *file_state.rows.lock().unwrap(),
		}).unwrap();
	}

}

#[tauri::command]
pub fn delete_frames(app_handle: AppHandle, file_state: State<FileState>, selection_state: State<SelectionState>) {
	add_state_to_history(&app_handle);
	let mut selected_frames = selection_state.selected_frames.lock().unwrap();
	let mut new_frames: Vec<Frame> = Vec::new();
	let old_frames = file_state.frames.lock().unwrap().clone();
	for (i, frame) in old_frames.iter().enumerate() {
		if !selected_frames.contains(&i) {
			new_frames.push(frame.clone());
		}
	}
	let new_frame_count = new_frames.len();
	*selected_frames = Vec::new();
	*file_state.frames.lock().unwrap() = new_frames;
	app_handle.emit_all("redraw", RedrawPayload{
		frame_count: new_frame_count,
		selected_frames: Vec::new(),
		cols: *file_state.cols.lock().unwrap(),
		rows: *file_state.rows.lock().unwrap(),
	}).unwrap();
	update_selection_items(&app_handle, selected_frames.len());
}

pub fn update_selection_items(app_handle: &AppHandle, selection_len: usize) {
	let window = app_handle.get_window("main").unwrap();
	let menu_handle = window.menu_handle();
	let has_selection = selection_len > 0;
	menu_handle.get_item("cut").set_enabled(has_selection).unwrap();
	menu_handle.get_item("copy").set_enabled(has_selection).unwrap();
	menu_handle.get_item("delete").set_enabled(has_selection).unwrap();
	menu_handle.get_item("deselect_all").set_enabled(has_selection).unwrap();
	app_handle.emit_all("update_copy_button", has_selection).unwrap();
	app_handle.emit_all("update_delete_button", has_selection).unwrap();
}

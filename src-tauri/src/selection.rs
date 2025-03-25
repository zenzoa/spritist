use std::sync::Mutex;

use tauri::{ AppHandle, Manager, State, Emitter };

use crate::{
	state::RedrawPayload,
	file::{ FileState, Frame },
	history::add_state_to_history
};

pub struct SelectionState {
	pub selected_frames: Mutex<Vec<usize>>
}

#[tauri::command]
pub fn update_selection(selection_state: State<SelectionState>, new_selected_frames: Vec<usize>) {
	let mut selected_frames = selection_state.selected_frames.lock().unwrap();
	*selected_frames = new_selected_frames;
}

#[tauri::command]
pub fn select_all(handle: AppHandle) {
	let file_state: State<FileState> = handle.state();
	let selection_state: State<SelectionState> = handle.state();
	let mut selected_frames = selection_state.selected_frames.lock().unwrap();
	let frame_count = file_state.frames.lock().unwrap().len();
	*selected_frames = (0..frame_count).collect();
	handle.emit("update_selection", selected_frames.clone()).unwrap();
}

#[tauri::command]
pub fn deselect_all(handle: AppHandle) {
	let selection_state: State<SelectionState> = handle.state();
	let mut selected_frames = selection_state.selected_frames.lock().unwrap();
	*selected_frames = Vec::new();
	handle.emit("update_selection", selected_frames.clone()).unwrap();
}

#[tauri::command]
pub fn move_frames(handle: AppHandle, file_state: State<FileState>, selection_state: State<SelectionState>, insert_point: usize) {
	add_state_to_history(&handle);

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

	let mut final_insert_point = insert_point;
	for index in selected_frames.iter() {
		if *index < insert_point {
			final_insert_point -= 1;
		}
	}

	if final_insert_point <= remaining_frames.len() {
		remaining_frames.splice(final_insert_point..final_insert_point, moved_frames.iter().cloned());
		*frames = remaining_frames.clone();
		*selected_frames = (final_insert_point..(final_insert_point + moved_frames.len())).collect();
		handle.emit("redraw", RedrawPayload{
			frame_count: frames.len(),
			selected_frames: selected_frames.clone(),
			cols: *file_state.cols.lock().unwrap(),
			rows: *file_state.rows.lock().unwrap(),
		}).unwrap();
	}
}

#[tauri::command]
pub fn delete_frames(handle: AppHandle, file_state: State<FileState>, selection_state: State<SelectionState>) {
	add_state_to_history(&handle);
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
	handle.emit("redraw", RedrawPayload{
		frame_count: new_frame_count,
		selected_frames: Vec::new(),
		cols: *file_state.cols.lock().unwrap(),
		rows: *file_state.rows.lock().unwrap(),
	}).unwrap();
}

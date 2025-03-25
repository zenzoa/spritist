use std::sync::Mutex;

use tauri::{ AppHandle, Manager, State };

use crate::{
	palette::Palette,
	file::{ FileState, Frame },
	selection::SelectionState,
	state::{ redraw, update_window_title },
};

pub struct HistoryState {
	pub undo_stack: Mutex<Vec<HistoryItem>>,
	pub redo_stack: Mutex<Vec<HistoryItem>>
}

pub struct HistoryItem {
	pub frames: Mutex<Vec<Frame>>,
	pub palette: Mutex<Palette>,
	pub selected_frames: Mutex<Vec<usize>>
}

pub fn add_state_to_history(handle: &AppHandle) {
	let file_state: State<FileState> = handle.state();
	let selection_state: State<SelectionState> = handle.state();
	let history_state: State<HistoryState> = handle.state();

	history_state.undo_stack.lock().unwrap().push(get_current_state(&file_state, &selection_state));
	history_state.redo_stack.lock().unwrap().clear();

	*file_state.file_is_modified.lock().unwrap() = true;

	update_window_title(handle);
}

#[tauri::command]
pub fn undo(handle: AppHandle, file_state: State<FileState>, selection_state: State<SelectionState>, history_state: State<HistoryState>) {
	let new_history_item_result = history_state.undo_stack.lock().unwrap().pop();
	if let Some(new_history_item) = new_history_item_result {
		history_state.redo_stack.lock().unwrap().push(get_current_state(&file_state, &selection_state));
		set_current_state(&file_state, &selection_state, new_history_item);
	}

	update_window_title(&handle);

	redraw(&handle);
}

#[tauri::command]
pub fn redo(handle: AppHandle, file_state: State<FileState>, selection_state: State<SelectionState>, history_state: State<HistoryState>) {
	let new_history_item_result = history_state.redo_stack.lock().unwrap().pop();
	if let Some(new_history_item) = new_history_item_result {
		history_state.undo_stack.lock().unwrap().push(get_current_state(&file_state, &selection_state));
		set_current_state(&file_state, &selection_state, new_history_item);
	}

	update_window_title(&handle);

	redraw(&handle);
}

fn get_current_state(file_state: &State<FileState>, selection_state: &State<SelectionState>) -> HistoryItem {
	HistoryItem{
		frames: Mutex::new(file_state.frames.lock().unwrap().clone()),
		palette: Mutex::new(file_state.palette.lock().unwrap().clone()),
		selected_frames: Mutex::new(selection_state.selected_frames.lock().unwrap().clone())
	}
}

fn set_current_state(file_state: &State<FileState>, selection_state: &State<SelectionState>, new_history_item: HistoryItem) {
	*file_state.frames.lock().unwrap() = new_history_item.frames.lock().unwrap().clone();
	*selection_state.selected_frames.lock().unwrap() = new_history_item.selected_frames.lock().unwrap().clone();
	*file_state.palette.lock().unwrap() = new_history_item.palette.lock().unwrap().clone();
}

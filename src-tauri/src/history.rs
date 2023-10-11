use std::sync::Mutex;
use tauri::{
	AppHandle,
	Manager,
	State
};

use crate::{
	palette::Palette,
	file::{ FileState, Frame },
	selection::{ SelectionState, update_selection_items },
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

pub fn add_state_to_history(app_handle: &AppHandle) {
	let file_state: State<FileState> = app_handle.state();
	let selection_state: State<SelectionState> = app_handle.state();
	let history_state: State<HistoryState> = app_handle.state();

	history_state.undo_stack.lock().unwrap().push(get_current_state(&file_state, &selection_state));
	history_state.redo_stack.lock().unwrap().clear();

	update_undo_redo_items(app_handle, &history_state);

	*file_state.file_is_modified.lock().unwrap() = true;

	update_window_title(app_handle);
}

#[tauri::command]
pub fn undo(app_handle: AppHandle, file_state: State<FileState>, selection_state: State<SelectionState>, history_state: State<HistoryState>) {
	let new_history_item_result = history_state.undo_stack.lock().unwrap().pop();
	if let Some(new_history_item) = new_history_item_result {
		history_state.redo_stack.lock().unwrap().push(get_current_state(&file_state, &selection_state));
		set_current_state(&file_state, &selection_state, new_history_item);
	}

	update_undo_redo_items(&app_handle, &history_state);
	update_selection_items(&app_handle, selection_state.selected_frames.lock().unwrap().len());
	update_window_title(&app_handle);

	redraw(&app_handle);
}

#[tauri::command]
pub fn redo(app_handle: AppHandle, file_state: State<FileState>, selection_state: State<SelectionState>, history_state: State<HistoryState>) {
	let new_history_item_result = history_state.redo_stack.lock().unwrap().pop();
	if let Some(new_history_item) = new_history_item_result {
		history_state.undo_stack.lock().unwrap().push(get_current_state(&file_state, &selection_state));
		set_current_state(&file_state, &selection_state, new_history_item);
	}

	update_undo_redo_items(&app_handle, &history_state);
	update_selection_items(&app_handle, selection_state.selected_frames.lock().unwrap().len());
	update_window_title(&app_handle);

	redraw(&app_handle);
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

pub fn update_undo_redo_items(app_handle: &AppHandle, history_state: &State<HistoryState>) {
	let has_undo_stack = history_state.undo_stack.lock().unwrap().len() > 0;
	let has_redo_stack = history_state.redo_stack.lock().unwrap().len() > 0;

	let window = app_handle.get_window("main").unwrap();
	let menu_handle = window.menu_handle();

	menu_handle.get_item("undo").set_enabled(has_undo_stack).unwrap();
	menu_handle.get_item("redo").set_enabled(has_redo_stack).unwrap();

	app_handle.emit_all("update_undo_button", has_undo_stack).unwrap();
	app_handle.emit_all("update_redo_button", has_redo_stack).unwrap();
}

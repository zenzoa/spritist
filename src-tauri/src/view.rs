use std::sync::Mutex;
use tauri::{
	AppHandle,
	Manager,
	State
};

pub struct ViewState {
	pub zoom_scale: Mutex<u32>
}

#[tauri::command]
pub fn reset_zoom(app_handle: AppHandle, view_state: State<ViewState>) {
	set_zoom_scale(&app_handle, &view_state, 1);
}

#[tauri::command]
pub fn zoom_in(app_handle: AppHandle, view_state: State<ViewState>) {
	let zoom_scale = *view_state.zoom_scale.lock().unwrap();
	set_zoom_scale(&app_handle, &view_state, zoom_scale + 1);
}

#[tauri::command]
pub fn zoom_out(app_handle: AppHandle, view_state: State<ViewState>) {
	let zoom_scale = *view_state.zoom_scale.lock().unwrap();
	set_zoom_scale(&app_handle, &view_state, zoom_scale - 1);
}

fn set_zoom_scale(app_handle: &AppHandle, view_state: &State<ViewState>, new_zoom_scale: u32) {
	let mut zoom_scale = new_zoom_scale;
	if zoom_scale < 1 { zoom_scale = 1; }
	if zoom_scale > 4 { zoom_scale = 4; }

	update_zoom_menu(app_handle, zoom_scale);

	*view_state.zoom_scale.lock().unwrap() = zoom_scale;

	app_handle.emit_all("set_scale", zoom_scale).unwrap();
}

fn update_zoom_menu(app_handle: &AppHandle, zoom_scale: u32) {
	let menu_handle = app_handle.get_window("main").unwrap().menu_handle();
	menu_handle.get_item("reset_zoom").set_enabled(zoom_scale != 1).unwrap();
	menu_handle.get_item("zoom_in").set_enabled(zoom_scale < 4).unwrap();
	menu_handle.get_item("zoom_out").set_enabled(zoom_scale > 1).unwrap();
}

#[tauri::command]
pub fn view_as_sprite(app_handle: AppHandle) {
	let menu_handle = app_handle.get_window("main").unwrap().menu_handle();
	menu_handle.get_item("view_as_sprite").set_title("✔ View As Sprite").unwrap();
	menu_handle.get_item("view_as_bg").set_title("- View As Background").unwrap();
	app_handle.emit_all("view_as_sprite", "").unwrap();
}

pub fn view_as_bg(app_handle: AppHandle) {
	let menu_handle = app_handle.get_window("main").unwrap().menu_handle();
	menu_handle.get_item("view_as_sprite").set_title("- View As Sprite").unwrap();
	menu_handle.get_item("view_as_bg").set_title("✔ View As Background").unwrap();
	app_handle.emit_all("view_as_bg", "").unwrap();
}

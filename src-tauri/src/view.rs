use std::sync::Mutex;

use tauri::{ AppHandle, State, Emitter };
use tauri::menu::MenuItemKind;

pub struct ViewState {
	pub zoom_scale: Mutex<u32>
}

#[tauri::command]
pub fn reset_zoom(handle: AppHandle, view_state: State<ViewState>) {
	set_zoom_scale(&handle, &view_state, 1);
}

#[tauri::command]
pub fn zoom_in(handle: AppHandle, view_state: State<ViewState>) {
	let zoom_scale = *view_state.zoom_scale.lock().unwrap();
	set_zoom_scale(&handle, &view_state, zoom_scale + 1);
}

#[tauri::command]
pub fn zoom_out(handle: AppHandle, view_state: State<ViewState>) {
	let zoom_scale = *view_state.zoom_scale.lock().unwrap();
	set_zoom_scale(&handle, &view_state, zoom_scale - 1);
}

fn set_zoom_scale(handle: &AppHandle, view_state: &State<ViewState>, new_zoom_scale: u32) {
	let mut zoom_scale = new_zoom_scale;
	zoom_scale = zoom_scale.clamp(1, 4);

	*view_state.zoom_scale.lock().unwrap() = zoom_scale;

	handle.emit("set_scale", zoom_scale).unwrap();
}

#[tauri::command]
pub fn view_as_sprite(handle: AppHandle) {
	if let Some(menu) = handle.menu() {
		if let Some(MenuItemKind::Submenu(view_menu)) = menu.get("view") {
			if let Some(MenuItemKind::Check(menu_item)) = view_menu.get("view_as_sprite") {
				menu_item.set_checked(true).unwrap();
			};
			if let Some(MenuItemKind::Check(menu_item)) = view_menu.get("view_as_bg") {
				menu_item.set_checked(false).unwrap();
			};
		}
	}
	handle.emit("view_as_sprite", "").unwrap();
}

pub fn view_as_bg(handle: AppHandle) {
	if let Some(menu) = handle.menu() {
		if let Some(MenuItemKind::Submenu(view_menu)) = menu.get("view") {
			if let Some(MenuItemKind::Check(menu_item)) = view_menu.get("view_as_sprite") {
				menu_item.set_checked(false).unwrap();
			};
			if let Some(MenuItemKind::Check(menu_item)) = view_menu.get("view_as_bg") {
				menu_item.set_checked(true).unwrap();
			};
		}
	}
	handle.emit("view_as_bg", "").unwrap();
}

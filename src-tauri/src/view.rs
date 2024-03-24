use std::sync::Mutex;

use tauri::{ AppHandle, Manager, State };
use tauri::menu::MenuItemKind;

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

	*view_state.zoom_scale.lock().unwrap() = zoom_scale;

	app_handle.emit("set_scale", zoom_scale).unwrap();
}

#[tauri::command]
pub fn view_as_sprite(app_handle: AppHandle) {
	if let Some(menu) = app_handle.menu() {
		if let Some(MenuItemKind::Submenu(view_menu)) = menu.get("view") {
			if let Some(MenuItemKind::Check(menu_item)) = view_menu.get("view_as_sprite") {
				menu_item.set_checked(true).unwrap();
			};
			if let Some(MenuItemKind::Check(menu_item)) = view_menu.get("view_as_bg") {
				menu_item.set_checked(false).unwrap();
			};
		}
	}
	app_handle.emit("view_as_sprite", "").unwrap();
}

pub fn view_as_bg(app_handle: AppHandle) {
	if let Some(menu) = app_handle.menu() {
		if let Some(MenuItemKind::Submenu(view_menu)) = menu.get("view") {
			if let Some(MenuItemKind::Check(menu_item)) = view_menu.get("view_as_sprite") {
				menu_item.set_checked(false).unwrap();
			};
			if let Some(MenuItemKind::Check(menu_item)) = view_menu.get("view_as_bg") {
				menu_item.set_checked(true).unwrap();
			};
		}
	}
	app_handle.emit("view_as_bg", "").unwrap();
}

use std::{
	fs,
	fmt,
	sync::Mutex
};

use tauri::{ AppHandle, Manager, State };
use tauri::menu::MenuItemKind;

pub struct ConfigState {
	pub show_image_info: Mutex<bool>,
	pub transparent_color: Mutex<TransparentColor>,
	pub theme: Mutex<Theme>,
	pub show_toolbar: Mutex<bool>
}

#[derive(Clone, serde::Serialize)]
pub struct ConfigInfo {
	pub show_image_info: bool,
	pub transparent_color: String,
	pub theme: String,
	pub show_toolbar: bool
}

#[derive(Clone, Debug, PartialEq)]
pub enum TransparentColor {
	Black,
	White,
	None
}

impl fmt::Display for TransparentColor {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
		match *self {
			TransparentColor::Black => { write!(f, "black") }
			TransparentColor::White => { write!(f, "white") }
			TransparentColor::None => { write!(f, "none") }
		}
    }
}

#[derive(Clone, Debug, PartialEq)]
pub enum Theme {
	Dark,
	Light,
	Purple
}

impl fmt::Display for Theme {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
		match *self {
			Theme::Dark => { write!(f, "dark") }
			Theme::Light => { write!(f, "light") }
			Theme::Purple => { write!(f, "purple") }
		}
    }
}

#[tauri::command]
pub fn get_config(state: State<ConfigState>) -> ConfigInfo {
	let show_image_info = state.show_image_info.lock().unwrap().to_owned();
	let transparent_color = state.transparent_color.lock().unwrap().to_string();
	let theme = state.theme.lock().unwrap().to_string();
	let show_toolbar = state.show_toolbar.lock().unwrap().to_owned();
	ConfigInfo {
		show_image_info,
		transparent_color,
		theme,
		show_toolbar
	}
}

pub fn load_config_file(app_handle: AppHandle) {
	if let Ok(config_dir) = app_handle.path().config_dir() {
		let config_file_path = config_dir.join("spritist.conf");
		if let Ok(config_contents) = fs::read_to_string(config_file_path) {
			let lines: Vec<&str> = config_contents.split('\n').collect();
			for line in lines.iter() {
				let parts: Vec<&str> = line.split(':').collect();
				if let Some(key) = parts.first() {
					if let Some(value) = parts.get(1) {
						match key.trim() {
							"show_image_info" => {
								match value.trim() {
									"false" => set_show_image_info(&app_handle, false, true),
									_ => set_show_image_info(&app_handle, true, true)
								};
							}
							"transparent_color" => {
								let new_color = match value.trim() {
									"white" => TransparentColor::White,
									"none" => TransparentColor::None,
									_ => TransparentColor::Black
								};
								set_transparent_color(&app_handle, new_color, true);
							}
							"theme" => {
								let new_theme = match value.trim() {
									"light" => Theme::Light,
									"purple" => Theme::Purple,
									_ => Theme::Dark
								};
								set_theme(&app_handle, new_theme, true);
							}
							"show_toolbar" => {
								match value.trim() {
									"false" => set_toolbar_visibility(&app_handle, false, true),
									_ => set_toolbar_visibility(&app_handle, true, true)
								};
							}
							_ => {}
						}
					}
				}
			}
		}
	}
}

pub fn save_config_file(app_handle: &AppHandle) {
	let config_state: State<ConfigState> = app_handle.state();
	if let Ok(config_dir) = app_handle.path().config_dir() {
		let config_file_path = config_dir.join("spritist.conf");
		if let Ok(()) = fs::create_dir_all(config_dir) {
			fs::write(config_file_path, format!(
				"show_image_info: {}\ntransparent_color: {}\ntheme: {}\nshow_toolbar: {}",
				config_state.show_image_info.lock().unwrap(),
				config_state.transparent_color.lock().unwrap(),
				config_state.theme.lock().unwrap(),
				config_state.show_toolbar.lock().unwrap()
			)).unwrap();
		}
	}
}

pub fn set_show_image_info(app_handle: &AppHandle, new_value: bool, init: bool) {
	if let Some(menu) = app_handle.menu() {
		if let Some(MenuItemKind::Submenu(view_menu)) = menu.get("view") {
			if let Some(MenuItemKind::Check(menu_item)) = view_menu.get("show_image_info") {
				menu_item.set_checked(new_value).unwrap();
			};
		}
	}

	let config_state: State<ConfigState> = app_handle.state();
	*config_state.show_image_info.lock().unwrap() = new_value;
	if !init {
		save_config_file(app_handle);
		app_handle.emit("set_show_image_info", new_value).unwrap();
	}
}

pub fn set_transparent_color(app_handle: &AppHandle, new_color: TransparentColor, init: bool) {
	if let Some(menu) = app_handle.menu() {
		if let Some(MenuItemKind::Submenu(view_menu)) = menu.get("view") {
			if let Some(MenuItemKind::Submenu(transparent_color_menu)) = view_menu.get("transparent_color") {
				if let Some(MenuItemKind::Check(menu_item)) = transparent_color_menu.get("transparent_black") {
					menu_item.set_checked(new_color == TransparentColor::Black).unwrap();
				};
				if let Some(MenuItemKind::Check(menu_item)) = transparent_color_menu.get("transparent_white") {
					menu_item.set_checked(new_color == TransparentColor::White).unwrap();
				};
				if let Some(MenuItemKind::Check(menu_item)) = transparent_color_menu.get("transparent_none") {
					menu_item.set_checked(new_color == TransparentColor::None).unwrap();
				};
			}
		}
	}

	let config_state: State<ConfigState> = app_handle.state();
	*config_state.transparent_color.lock().unwrap() = new_color.clone();
	if !init {
		app_handle.emit("set_transparent_color", match new_color {
			TransparentColor::Black => "black",
			TransparentColor::White => "white",
			TransparentColor::None => "none"
		}).unwrap();
		save_config_file(app_handle);
	}
}

pub fn set_theme(app_handle: &AppHandle, new_theme: Theme, init: bool) {
	if let Some(menu) = app_handle.menu() {
		if let Some(MenuItemKind::Submenu(view_menu)) = menu.get("view") {
			if let Some(MenuItemKind::Submenu(theme_menu)) = view_menu.get("theme") {
				if let Some(MenuItemKind::Check(menu_item)) = theme_menu.get("theme_dark") {
					menu_item.set_checked(new_theme == Theme::Dark).unwrap();
				};
				if let Some(MenuItemKind::Check(menu_item)) = theme_menu.get("theme_light") {
					menu_item.set_checked(new_theme == Theme::Light).unwrap();
				};
				if let Some(MenuItemKind::Check(menu_item)) = theme_menu.get("theme_purple") {
					menu_item.set_checked(new_theme == Theme::Purple).unwrap();
				};
			}
		}
	}

	let config_state: State<ConfigState> = app_handle.state();
	*config_state.theme.lock().unwrap() = new_theme.clone();
	if !init {
		app_handle.emit("set_theme", match new_theme {
			Theme::Dark => "dark",
			Theme::Light => "light",
			Theme::Purple => "purple"
		}).unwrap();
		save_config_file(app_handle);
	}
}

pub fn set_toolbar_visibility(app_handle: &AppHandle, show_toolbar: bool, init: bool) {
	if let Some(menu) = app_handle.menu() {
		if let Some(MenuItemKind::Submenu(view_menu)) = menu.get("view") {
			if let Some(MenuItemKind::Check(menu_item)) = view_menu.get("show_toolbar") {
				menu_item.set_checked(show_toolbar).unwrap();
				app_handle.emit("set_toolbar_visibility", show_toolbar).unwrap();
			};
		}
	}

	let config_state: State<ConfigState> = app_handle.state();
	*config_state.show_toolbar.lock().unwrap() = show_toolbar;
	if !init { save_config_file(app_handle); }
}

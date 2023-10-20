use std::{
	fs,
	fmt,
	sync::Mutex
};
use tauri::{
	AppHandle,
	Manager,
	State
};

pub struct ConfigState {
	pub show_image_info: Mutex<bool>,
	pub transparent_color: Mutex<TransparentColor>,
	pub theme: Mutex<Theme>
}

#[derive(Clone, serde::Serialize)]
pub struct ConfigInfo {
	pub show_image_info: bool,
	pub transparent_color: String,
	pub theme: String
}

#[derive(Clone, Debug)]
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

#[derive(Clone, Debug)]
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
	ConfigInfo {
		show_image_info,
		transparent_color,
		theme
	}
}

pub fn load_config_file(app_handle: AppHandle) {
	if let Some(config_dir) = app_handle.path_resolver().app_config_dir() {
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
	if let Some(config_dir) = app_handle.path_resolver().app_config_dir() {
		let config_file_path = config_dir.join("spritist.conf");
		if let Ok(()) = fs::create_dir_all(config_dir) {
			fs::write(config_file_path, format!(
				"show_image_info: {}\ntransparent_color: {}\ntheme: {}",
				config_state.show_image_info.lock().unwrap(),
				config_state.transparent_color.lock().unwrap(),
				config_state.theme.lock().unwrap()
			)).unwrap();
		}
	}
}

pub fn set_show_image_info(app_handle: &AppHandle, new_value: bool, init: bool) {
	let menu_handle = app_handle.get_window("main").unwrap().menu_handle();
	if new_value {
		menu_handle.get_item("show_image_info").set_title("✔ Show Image Info").unwrap();
		if !init { app_handle.emit_all("set_show_image_info", "black").unwrap(); }
	} else {
		menu_handle.get_item("show_image_info").set_title("- Show Image Info").unwrap();
	}
	let config_state: State<ConfigState> = app_handle.state();
	*config_state.show_image_info.lock().unwrap() = new_value;
	if !init {
		save_config_file(app_handle);
		app_handle.emit_all("set_show_image_info", new_value).unwrap();
	}
}

pub fn set_transparent_color(app_handle: &AppHandle, new_color: TransparentColor, init: bool) {
	let menu_handle = app_handle.get_window("main").unwrap().menu_handle();
	match new_color {
		TransparentColor::Black => {
			menu_handle.get_item("transparent_black").set_title("✔ Black").unwrap();
			menu_handle.get_item("transparent_white").set_title("- White").unwrap();
			menu_handle.get_item("transparent_none").set_title("- Transparent").unwrap();
			if !init { app_handle.emit_all("set_transparent_color", "black").unwrap(); }
		}
		TransparentColor::White => {
			menu_handle.get_item("transparent_black").set_title("- Black").unwrap();
			menu_handle.get_item("transparent_white").set_title("✔ White").unwrap();
			menu_handle.get_item("transparent_none").set_title("- Transparent").unwrap();
			if !init { app_handle.emit_all("set_transparent_color", "white").unwrap() };
		}
		TransparentColor::None => {
			menu_handle.get_item("transparent_black").set_title("- Black").unwrap();
			menu_handle.get_item("transparent_white").set_title("- White").unwrap();
			menu_handle.get_item("transparent_none").set_title("✔ Transparent").unwrap();
			if !init { app_handle.emit_all("set_transparent_color", "none").unwrap() };
		}
	}

	let config_state: State<ConfigState> = app_handle.state();
	*config_state.transparent_color.lock().unwrap() = new_color.clone();
	if !init { save_config_file(app_handle); }
}

pub fn set_theme(app_handle: &AppHandle, new_theme: Theme, init: bool) {
	let menu_handle = app_handle.get_window("main").unwrap().menu_handle();
	match new_theme {
		Theme::Dark => {
			menu_handle.get_item("theme_dark").set_title("✔ Dark").unwrap();
			menu_handle.get_item("theme_light").set_title("- Light").unwrap();
			menu_handle.get_item("theme_purple").set_title("- Purple").unwrap();
			if !init { app_handle.emit_all("set_theme", "dark").unwrap() };
		}
		Theme::Light => {
			menu_handle.get_item("theme_dark").set_title("- Dark").unwrap();
			menu_handle.get_item("theme_light").set_title("✔ Light").unwrap();
			menu_handle.get_item("theme_purple").set_title("- Purple").unwrap();
			if !init { app_handle.emit_all("set_theme", "light").unwrap() };
		}
		Theme::Purple => {
			menu_handle.get_item("theme_dark").set_title("- Dark").unwrap();
			menu_handle.get_item("theme_light").set_title("- Light").unwrap();
			menu_handle.get_item("theme_purple").set_title("✔ Purple").unwrap();
			if !init { app_handle.emit_all("set_theme", "purple").unwrap() };
		}
	}

	let config_state: State<ConfigState> = app_handle.state();
	*config_state.theme.lock().unwrap() = new_theme.clone();
	if !init { save_config_file(app_handle); }
}

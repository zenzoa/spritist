// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
	io::Cursor,
	sync::Mutex
};
use tauri::{
	AppHandle,
	Manager,
	State,
	WindowEvent,
	FileDropEvent,
	api::dialog::{ ask, message },
	http::ResponseBuilder
};
use image::ImageOutputFormat;

mod menu;
mod file;
mod state;
mod history;
mod selection;
mod clipboard;
mod config;
mod format;
mod palette;
mod export;

fn main() {
	tauri::Builder::default()
		.enable_macos_default_menu(false)
		.on_window_event(|event| {
			match event.event() {
				WindowEvent::FileDrop(FileDropEvent::Dropped(file_paths)) => {
					let app_handle = event.window().app_handle();
					if let Err(why) = file::drop_files(&app_handle, file_paths) {
						app_handle.emit_all("error", why.to_string()).unwrap();
					}
				},
				WindowEvent::CloseRequested { api, .. } => {
					let app_handle = event.window().app_handle();
					let file_state: State<file::FileState> = app_handle.state();
					let file_is_modified = *file_state.file_is_modified.lock().unwrap();
					if file_is_modified {
						api.prevent_close();
						let file_state: State<file::FileState> = app_handle.state();
						if *file_state.file_is_modified.lock().unwrap() {
							let window = event.window().clone();
							ask(Some(event.window()),
								"File modified",
								"Do you want to continue anyway and lose any unsaved work?",
								move |answer| { if answer { window.close().unwrap(); } });
						}
					}
				}
				_ => {}
			}
		})
		.menu(menu::build_menu())
		.on_menu_event(|event| {
			let app_handle = event.window().app_handle();
			let config_state: State<config::ConfigState> = app_handle.state();
			let file_state: State<file::FileState> = app_handle.state();
			let selection_state: State<selection::SelectionState> = app_handle.state();
			let history_state: State<history::HistoryState> = app_handle.state();
			let clipboard_state: State<clipboard::ClipboardState> = app_handle.state();
			match event.menu_item_id() {
				// FILE MENU
				"new_file" => {
					file::activate_new_file(app_handle);
				}
				"open_file" => {
					file::activate_open_file(app_handle);
				}
				"save_file" => {
					file::activate_save_file(app_handle.clone(), file_state);
				}
				"save_as" => {
					file::activate_save_as(app_handle.clone(), file_state);
				}
				"export_png" => {
					app_handle.emit_all("export_png", "").unwrap();
				}
				"export_gif" => {
					app_handle.emit_all("export_gif", "").unwrap();
				}
				"export_spritesheet" => {
					app_handle.emit_all("export_spritesheet", "").unwrap();
				}
				"import_spritesheet" => {
					app_handle.emit_all("import_spritesheet", "").unwrap();
				}

				// EDIT MENU
				"undo" => {
					history::undo(app_handle.clone(), file_state, selection_state, history_state);
				}
				"redo" => {
					history::redo(app_handle.clone(), file_state, selection_state, history_state);
				}
				"cut" => {
					clipboard::cut(app_handle.clone(), file_state, selection_state, clipboard_state);
				}
				"copy" => {
					clipboard::copy(app_handle.clone(), file_state, selection_state, clipboard_state);
				}
				"paste" => {
					clipboard::paste(app_handle.clone(), file_state, selection_state, clipboard_state);
				}
				"delete" => {
					selection::delete_frames(app_handle.clone(), file_state, selection_state);
				}
				"select_all" => {
					selection::select_all(app_handle);
				}
				"deselect_all" => {
					selection::deselect_all(app_handle);
				}
				"insert_image" => {
					file::activate_insert_image(app_handle);
				}

				// VIEW MENU
				"load_palette" => {
					palette::activate_load_palette(app_handle);
				}
				"load_original" => {
					palette::load_original(app_handle);
				}
				"load_reversed" => {
					palette::load_reversed(app_handle);
				}
				"convert_to_palette" => {
					palette::activate_convert_to_palette(app_handle);
				}
				"convert_to_original" => {
					palette::convert_to_original(app_handle);
				}
				"convert_to_reversed" => {
					palette::convert_to_reversed(app_handle);
				}
				"view_as_sprite" => {
					config::view_as_sprite(app_handle);
				}
				"view_as_bg" => {
					config::view_as_bg(app_handle);
				}
				"show_image_info" => {
					let current_value = config_state.show_image_info.lock().unwrap().to_owned();
					config::set_show_image_info(&app_handle, !current_value, false);
				}
				"transparent_black" => {
					config::set_transparent_color(&app_handle, config::TransparentColor::Black, false);
				}
				"transparent_white" => {
					config::set_transparent_color(&app_handle, config::TransparentColor::White, false);
				}
				"transparent_none" => {
					config::set_transparent_color(&app_handle, config::TransparentColor::None, false);
				}
				"theme_dark" => {
					config::set_theme(&app_handle, config::Theme::Dark, false);
				}
				"theme_light" => {
					config::set_theme(&app_handle, config::Theme::Light, false);
				}
				"theme_purple" => {
					config::set_theme(&app_handle, config::Theme::Purple, false);
				}
				_ => {}
			}
		})
		.invoke_handler(tauri::generate_handler![
			config::get_config,
			config::view_as_sprite,
			file::activate_new_file,
			file::activate_open_file,
			file::activate_save_file,
			file::activate_save_as,
			file::activate_insert_image,
			file::set_bg_size,
			selection::update_selection,
			selection::move_frames,
			selection::delete_frames,
			history::undo,
			history::redo,
			clipboard::copy,
			clipboard::paste,
			export::get_file_path,
			export::select_png_path,
			export::select_gif_path,
			export::export_png,
			export::export_gif,
			show_error_message,
		])
		.on_page_load(|window, _| {
			config::load_config_file(window.app_handle());
			state::update_window_title(&window.app_handle());
		})
		.manage(file::FileState::new())
		.manage(config::ConfigState {
			show_image_info: Mutex::new(true),
			transparent_color: Mutex::new(config::TransparentColor::Black),
			theme: Mutex::new(config::Theme::Dark)
		})
		.manage(selection::SelectionState {
			selected_frames: Mutex::new(Vec::new())
		})
		.manage(history::HistoryState {
			undo_stack: Mutex::new(Vec::new()),
			redo_stack: Mutex::new(Vec::new())
		})
		.manage(clipboard::ClipboardState {
			copied_frames: Mutex::new(Vec::new())
		})
		.register_uri_scheme_protocol("getframe", |app, request| {
			let not_found = ResponseBuilder::new().body(Vec::new());

			let uri = request.uri();
			let start_pos = match uri.find("?i=") {
				Some(pos) => pos + 3,
				None => return not_found
			};
			let end_pos = match uri.find('&') {
				Some(pos) => pos,
				None => return not_found
			};
			let frame_index: usize = match uri[start_pos..end_pos].parse() {
				Ok(i) => i,
				Err(_) => return not_found
			};

			let file_state: State<file::FileState> = app.state();
			let frames = file_state.frames.lock().unwrap();
			match frames.get(frame_index) {
				Some(frame) => {
					let mut frame_data = Cursor::new(Vec::new());
					frame.image.write_to(&mut frame_data, ImageOutputFormat::Png)?;
					ResponseBuilder::new()
						.mimetype("image/png")
						.body(frame_data.into_inner())
				}
				None => not_found
			}
		})
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}

#[tauri::command]
fn show_error_message(app_handle: AppHandle, why: String) {
	message(Some(&app_handle.get_window("main").unwrap()), "Error", why);
}
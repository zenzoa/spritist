// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::Cursor;
use std::sync::Mutex;
use std::path::PathBuf;

use tauri::{
	Builder,
	AppHandle,
	WindowEvent,
	FileDropEvent,
	Manager,
	State
};
use tauri::menu::{
	Menu,
	Submenu,
	MenuItem,
	CheckMenuItem,
	PredefinedMenuItem,
	MenuId
};
use tauri::async_runtime::spawn;

use rfd::{ AsyncMessageDialog, MessageButtons };

use image::ImageOutputFormat;

mod file;
mod state;
mod history;
mod selection;
mod clipboard;
mod view;
mod edit;
mod config;
mod format;
mod palette;
mod export;
mod import;

fn main() {

	Builder::default()

		.on_window_event(|window, event| {
			match event {
				WindowEvent::FileDrop(FileDropEvent::Dropped{ paths, position: _ }) => {
					if !paths.is_empty() {
						window.app_handle().emit("show_spinner", ()).unwrap();
						if let Err(why) = file::drop_files(window.app_handle(), paths) {
							error_dialog(why.to_string());
						}
						window.app_handle().emit("hide_spinner", ()).unwrap();
					}
				},
				WindowEvent::CloseRequested { api, .. } => {
					api.prevent_close();
					try_quit(window.app_handle().clone());
				},
				_ => {}
			}
		})

		.menu(|handle| {
			Menu::with_id_and_items(handle, "main", &[

				&Submenu::with_id_and_items(handle, "file", "File", true, &[
					&MenuItem::with_id(handle, "new", "New", true, Some("CmdOrCtrl+N"))?,
					&MenuItem::with_id(handle, "open", "Open", true, Some("CmdOrCtrl+O"))?,
					&PredefinedMenuItem::separator(handle)?,
					&MenuItem::with_id(handle, "save", "Save", true, Some("CmdOrCtrl+S"))?,
					&MenuItem::with_id(handle, "save_as", "Save As", true, Some("CmdOrCtrl+Shift+S"))?,
					&PredefinedMenuItem::separator(handle)?,
					&Submenu::with_id_and_items(handle, "import", "Import", true, &[
						&MenuItem::with_id(handle, "import_png_as_blk", "Import PNG as BLK", true, Some("CmdOrCtrl+B"))?,
						&MenuItem::with_id(handle, "import_spritesheet", "Import Spritesheet", true, Some("CmdOrCtrl+T"))?,
					])?,
					&Submenu::with_id_and_items(handle, "export", "Export", true, &[
						&MenuItem::with_id(handle, "export_png", "Export PNG", true, Some("CmdOrCtrl+E"))?,
						&MenuItem::with_id(handle, "export_gif", "Export GIF", true, Some("CmdOrCtrl+G"))?,
						&MenuItem::with_id(handle, "export_spritesheet", "Export Spritesheet", true, Some("CmdOrCtrl+Shift+T"))?,
					])?,
					&PredefinedMenuItem::separator(handle)?,
					&MenuItem::with_id(handle, "quit", "Quit", true, Some("CmdOrCtrl+Q"))?,
				])?,

				&Submenu::with_id_and_items(handle, "edit", "Edit", true, &[
					&MenuItem::with_id(handle, "undo", "Undo", true, Some("CmdOrCtrl+Z"))?,
					&MenuItem::with_id(handle, "redo", "Redo", true, Some("CmdOrCtrl+Shift+Z"))?,
					&PredefinedMenuItem::separator(handle)?,
					&MenuItem::with_id(handle, "cut", "Cut", true, Some("CmdOrCtrl+X"))?,
					&MenuItem::with_id(handle, "copy", "Copy", true, Some("CmdOrCtrl+C"))?,
					&MenuItem::with_id(handle, "paste", "Paste", true, Some("CmdOrCtrl+V"))?,
					&MenuItem::with_id(handle, "delete", "Delete", true, Some("Delete"))?,
					&PredefinedMenuItem::separator(handle)?,
					&MenuItem::with_id(handle, "select_all", "Select All", true, Some("CmdOrCtrl+A"))?,
					&MenuItem::with_id(handle, "deselect_all", "Deselect All", true, Some("CmdOrCtrl+D"))?,
					&PredefinedMenuItem::separator(handle)?,
					&Submenu::with_id_and_items(handle, "shift_pixels", "Shift Pixels", true, &[
						&MenuItem::with_id(handle, "shift_left", "Shift Left", true, Some("CmdOrCtrl+Shift+Left"))?,
						&MenuItem::with_id(handle, "shift_right", "Shift Right", true, Some("CmdOrCtrl+Shift+Right"))?,
						&MenuItem::with_id(handle, "shift_up", "Shift Up", true, Some("CmdOrCtrl+Shift+Up"))?,
						&MenuItem::with_id(handle, "shift_down", "Shift Down", true, Some("CmdOrCtrl+Shift+Down"))?,
					])?,
					&PredefinedMenuItem::separator(handle)?,
					&MenuItem::with_id(handle, "insert_image", "Insert Image...", true, Some("CmdOrCtrl+I"))?,
					&MenuItem::with_id(handle, "replace_frame", "Replace Frame...", true, Some("CmdOrCtrl+R"))?,
				])?,

				&Submenu::with_id_and_items(handle, "view", "View", true, &[
					&MenuItem::with_id(handle, "reset_zoom", "100%", true, Some("CmdOrCtrl+0"))?,
					&MenuItem::with_id(handle, "zoom_in", "Zoom In", true, Some("CmdOrCtrl+="))?,
					&MenuItem::with_id(handle, "zoom_out", "Zoom Out", true, Some("CmdOrCtrl+-"))?,
					&PredefinedMenuItem::separator(handle)?,
					&Submenu::with_id_and_items(handle, "spr_palette", "SPR Palette", true, &[
						&CheckMenuItem::with_id(handle, "load_original", "Original Palette", true, true, None::<&str>)?,
						&CheckMenuItem::with_id(handle, "load_reversed", "Reversed Palette", true, false, None::<&str>)?,
						&CheckMenuItem::with_id(handle, "load_palette", "Custom Palette...", true, false, None::<&str>)?,
						&PredefinedMenuItem::separator(handle)?,
						&MenuItem::with_id(handle, "convert_to_original", "Convert to Original Palette", true, None::<&str>)?,
						&MenuItem::with_id(handle, "convert_to_reversed", "Convert to Reversed Palette", true, None::<&str>)?,
						&MenuItem::with_id(handle, "convert_to_palette", "Convert to Palette...", true, None::<&str>)?,
					])?,
					&PredefinedMenuItem::separator(handle)?,
					&CheckMenuItem::with_id(handle, "view_as_sprite", "View As Sprite", true, true, None::<&str>)?,
					&CheckMenuItem::with_id(handle, "view_as_bg", "View As Background", true, false, None::<&str>)?,
					&PredefinedMenuItem::separator(handle)?,
					&CheckMenuItem::with_id(handle, "show_image_info", "Show Image Info", true, true, None::<&str>)?,
					&Submenu::with_id_and_items(handle, "transparent_color", "Transparent Color", true, &[
						&CheckMenuItem::with_id(handle, "transparent_black", "Black", true, true, None::<&str>)?,
						&CheckMenuItem::with_id(handle, "transparent_white", "White", true, false, None::<&str>)?,
						&CheckMenuItem::with_id(handle, "transparent_none", "Transparent", true, false, None::<&str>)?,
					])?,
					&Submenu::with_id_and_items(handle, "theme", "Theme", true, &[
						&CheckMenuItem::with_id(handle, "theme_dark", "Dark", true, true, None::<&str>)?,
						&CheckMenuItem::with_id(handle, "theme_light", "Light", true, false, None::<&str>)?,
						&CheckMenuItem::with_id(handle, "theme_purple", "Purple", true, false, None::<&str>)?,
					])?,
					&PredefinedMenuItem::separator(handle)?,
					&CheckMenuItem::with_id(handle, "show_toolbar", "Show Toolbar", true, true, None::<&str>)?,
				])?,

			])
		})

		.setup(|app| {
			app.on_menu_event(|handle, event| {
				let file_state: State<file::FileState> = handle.state();
				let selection_state: State<selection::SelectionState> = handle.state();
				let history_state: State<history::HistoryState> = handle.state();
				let clipboard_state: State<clipboard::ClipboardState> = handle.state();
				let view_state: State<view::ViewState> = handle.state();
				let config_state: State<config::ConfigState> = handle.state();

				let MenuId(id) = event.id();
				let handle = handle.clone();

				match id.as_str() {
					// FILE MENU
					"new" => file::activate_new_file(handle),
					"open" => file::activate_open_file(handle),
					"save" => file::activate_save_file(handle.clone(), file_state),
					"save_as" => file::activate_save_as(handle.clone()),
					"export_png" => handle.emit("export_png", "").unwrap(),
					"export_gif" => handle.emit("export_gif", "").unwrap(),
					"export_spritesheet" => handle.emit("export_spritesheet", "").unwrap(),
					"import_png_as_blk" => import::activate_import_png_as_blk(handle),
					"import_spritesheet" => import::activate_import_spritesheet(handle),
					"quit" => try_quit(handle),

					// EDIT MENU
					"undo" => history::undo(handle.clone(), file_state, selection_state, history_state),
					"redo" => history::redo(handle.clone(), file_state, selection_state, history_state),
					"cut" => clipboard::cut(handle.clone(), file_state, selection_state, clipboard_state),
					"copy" => clipboard::copy(file_state, selection_state, clipboard_state),
					"paste" => clipboard::paste(handle.clone(), file_state, selection_state, clipboard_state),
					"delete" => selection::delete_frames(handle.clone(), file_state, selection_state),
					"select_all" => selection::select_all(handle),
					"deselect_all" => selection::deselect_all(handle),
					"shift_left" => edit::shift_selection(handle.clone(), file_state, selection_state, -1, 0),
					"shift_right" => edit::shift_selection(handle.clone(), file_state, selection_state, 1, 0),
					"shift_up" => edit::shift_selection(handle.clone(), file_state, selection_state, 0, -1),
					"shift_down" => edit::shift_selection(handle.clone(), file_state, selection_state, 0, 1),
					"insert_image" => file::activate_insert_image(handle),
					"replace_frame" => file::activate_replace_frame(handle.clone(), selection_state),

					// VIEW MENU
					"reset_zoom" => view::reset_zoom(handle.clone(), view_state),
					"zoom_in" => view::zoom_in(handle.clone(), view_state),
					"zoom_out" => view::zoom_out(handle.clone(), view_state),
					"load_palette" => palette::activate_load_palette(handle),
					"load_original" => palette::load_original(handle),
					"load_reversed" => palette::load_reversed(handle),
					"convert_to_palette" => palette::activate_convert_to_palette(handle),
					"convert_to_original" => palette::convert_to_original(handle),
					"convert_to_reversed" => palette::convert_to_reversed(handle),
					"view_as_sprite" => view::view_as_sprite(handle),
					"view_as_bg" => view::view_as_bg(handle),
					"show_image_info" => {
						let current_value = config_state.show_image_info.lock().unwrap().to_owned();
						config::set_show_image_info(&handle, !current_value, false);
					},
					"transparent_black" => {
						config::set_transparent_color(&handle, config::TransparentColor::Black, false);
					},
					"transparent_white" => {
						config::set_transparent_color(&handle, config::TransparentColor::White, false);
					},
					"transparent_none" => {
						config::set_transparent_color(&handle, config::TransparentColor::None, false);
					},
					"theme_dark" => {
						config::set_theme(&handle, config::Theme::Dark, false);
					},
					"theme_light" => {
						config::set_theme(&handle, config::Theme::Light, false);
					},
					"theme_purple" => {
						config::set_theme(&handle, config::Theme::Purple, false);
					},
					"show_toolbar" => {
						let current_value = config_state.show_toolbar.lock().unwrap().to_owned();
						config::set_toolbar_visibility(&handle, !current_value, false);
					},
					_ => {}
				}
			});
			Ok(())
		})

		.manage(file::FileState::new())
		.manage(config::ConfigState {
			show_image_info: Mutex::new(true),
			transparent_color: Mutex::new(config::TransparentColor::Black),
			theme: Mutex::new(config::Theme::Dark),
			show_toolbar: Mutex::new(true)
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
		.manage(view::ViewState {
			zoom_scale: Mutex::new(1)
		})

		.invoke_handler(tauri::generate_handler![
			config::get_config,
			file::activate_new_file,
			file::activate_open_file,
			file::activate_save_file,
			file::activate_save_as,
			file::activate_insert_image,
			file::activate_replace_frame,
			file::set_bg_size,
			selection::update_selection,
			selection::move_frames,
			selection::select_all,
			selection::deselect_all,
			selection::delete_frames,
			history::undo,
			history::redo,
			clipboard::cut,
			clipboard::copy,
			clipboard::paste,
			view::reset_zoom,
			view::zoom_in,
			view::zoom_out,
			view::view_as_sprite,
			edit::shift_selection,
			export::get_file_path,
			export::select_png_path,
			export::select_gif_path,
			import::activate_import_png_as_blk,
			import::activate_import_spritesheet,
			import::import_spritesheet,
			import::import_spritesheet_export_spr,
			import::import_spritesheet_export_s16,
			import::import_spritesheet_export_c16,
			export::export_png,
			export::export_gif,
			export::export_spritesheet,
			error_dialog,
			try_quit
		])

		.on_page_load(|window, _| {
			config::load_config_file(window.app_handle().clone());
			state::update_window_title(window.app_handle());
		})

		.register_uri_scheme_protocol("getframe", |app, request| {
			let not_found = http::Response::builder().body(Vec::new()).unwrap();

			let uri = request.uri().path();
			let start_pos = match uri.find('-') {
				Some(pos) => pos + 1,
				None => return not_found
			};
			let frame_index: usize = match uri[start_pos..].parse() {
				Ok(i) => i,
				Err(_) => return not_found
			};

			let file_state: State<file::FileState> = app.state();
			let frames = file_state.frames.lock().unwrap();
			match frames.get(frame_index) {
				Some(frame) => {
					let mut frame_data = Cursor::new(Vec::new());
					if let Ok(()) = frame.image.write_to(&mut frame_data, ImageOutputFormat::Png) {
						http::Response::builder()
							.header("Content-Type", "image/png")
							.body(frame_data.into_inner())
							.unwrap()
					} else {
						not_found
					}
				}
				None => not_found
			}
		})

		.run(tauri::generate_context!())

		.expect("error while running tauri application");
}

#[tauri::command]
fn try_quit(app_handle: AppHandle) {
	file::check_file_modified(app_handle, PathBuf::new(), file::FileModifiedCallback { func: |handle, _| {
		if let Some(window) = handle.get_webview_window("main") {
			window.destroy().unwrap();
		};
	}});
}

#[tauri::command]
fn error_dialog(error_message: String) {
	spawn(async move {
		AsyncMessageDialog::new()
			.set_title("Error")
			.set_description(error_message)
			.set_buttons(MessageButtons::Ok)
			.show()
			.await;
	});
}

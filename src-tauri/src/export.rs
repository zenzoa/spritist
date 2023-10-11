use std::{
	fs::File,
	path::PathBuf
};
use tauri::{
	AppHandle,
	Manager,
	State,
	api::dialog::{ FileDialogBuilder, message },
};
use image::{
	Frame as GifFrame,
	Delay,
	codecs::gif::{ GifEncoder, Repeat }
};

use crate::{
	file::FileState,
	selection::SelectionState
};

#[tauri::command]
pub fn get_file_path(file_state: State<FileState>, extension: String) -> String {
	let file_path = file_state.file_path.lock().unwrap().clone();
	match file_path {
		Some(mut file_path) => {
			file_path.set_extension(&extension);
			file_path.to_string_lossy().to_string()
		}
		None => "".to_string()
	}
}

#[tauri::command]
pub fn select_png_path(app_handle: AppHandle, base_file_path: String) {
	let mut file_dialog = FileDialogBuilder::new();
	if !base_file_path.is_empty() {
		file_dialog = file_dialog.set_file_name(&base_file_path);
	}
	file_dialog
		.add_filter("PNG Images", &["png", "PNG"])
		.save_file(move |file_path| {
			if let Some(file_path_str) = file_path {
				app_handle.emit_all("update_export_png_path", file_path_str.to_string_lossy()).unwrap();
			}
		});
}

#[tauri::command]
pub fn select_gif_path(app_handle: AppHandle, file_path: String) {
	let mut file_dialog = FileDialogBuilder::new();
	if !file_path.is_empty() {
		file_dialog = file_dialog.set_file_name(&file_path);
	}
	file_dialog
		.add_filter("GIF Images", &["gif", "GIF"])
		.save_file(move |file_path| {
			if let Some(file_path_str) = file_path {
				app_handle.emit_all("update_export_gif_path", file_path_str.to_string_lossy()).unwrap();
			}
		});
}

#[tauri::command]
pub fn export_png(app_handle: AppHandle, file_state: State<FileState>, selection_state: State<SelectionState>, base_file_path: String, frames_to_export: String) {
	match PathBuf::from(&base_file_path).parent() {
		Some(base_dir) => {
			match PathBuf::from(&base_file_path).file_stem() {
				Some(file_stem) => {
					let frames = file_state.frames.lock().unwrap();
					let selected_frames = selection_state.selected_frames.lock().unwrap();
					for (i, frame) in frames.iter().enumerate() {
						if frames_to_export != "selected" || selected_frames.contains(&i) {
							let file_path = base_dir.join(format!("{}-{}.png", file_stem.to_string_lossy(), i));
							match frame.image.save(file_path) {
								Ok(()) => {
									message(Some(&app_handle.get_window("main").unwrap()), "Success", "Exported PNG file(s) succesfully");
									app_handle.emit_all("successful_gif_export", "".to_string()).unwrap();
								}
								Err(why) => app_handle.emit_all("error", why.to_string()).unwrap()
							}
						}
					}
				}
				None => app_handle.emit_all("error", "Invalid file name".to_string()).unwrap()
			}
		}
		None => app_handle.emit_all("error", "Invalid file path".to_string()).unwrap()
	}
}

#[tauri::command]
pub fn export_gif(app_handle: AppHandle, file_state: State<FileState>, selection_state: State<SelectionState>, file_path: String, frames_to_export: String, frame_delay: u32) {
	let delay = Delay::from_numer_denom_ms(frame_delay, 1);
	let mut gif_frames: Vec<GifFrame> = Vec::new();
	let frames = file_state.frames.lock().unwrap();
	let selected_frames = selection_state.selected_frames.lock().unwrap();
	for (i, frame) in frames.iter().enumerate() {
		if frames_to_export != "selected" || selected_frames.contains(&i) {
			let gif_frame = GifFrame::from_parts(frame.image.clone(), 0, 0, delay);
			gif_frames.push(gif_frame);
		}
	}

	let file_path = PathBuf::from(&file_path);
	match File::create(file_path) {
		Ok(file) => {
			let mut gif_encoder = GifEncoder::new(file);
			gif_encoder.set_repeat(Repeat::Infinite).unwrap();
			match gif_encoder.encode_frames(gif_frames) {
				Ok(()) => {
					message(Some(&app_handle.get_window("main").unwrap()), "Success", "Exported GIF file succesfully");
					app_handle.emit_all("successful_gif_export", "".to_string()).unwrap();
				}
				Err(why) => app_handle.emit_all("error", why.to_string()).unwrap()
			}
		}
		Err(why) => app_handle.emit_all("error", why.to_string()).unwrap()
	}
}

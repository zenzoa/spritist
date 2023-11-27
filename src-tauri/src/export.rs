use std::{
	fs::File,
	error::Error,
	path::PathBuf
};
use tauri::{
	AppHandle,
	Manager,
	State
};
use image::{
	Delay,
	RgbaImage,
	Frame as GifFrame,
	codecs::gif::{ GifEncoder, Repeat }
};

use crate::{
	file::{ FileState, Frame, create_save_dialog },
	selection::SelectionState,
	format::png::encode as encode_png
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
pub fn select_png_path(app_handle: AppHandle, file_path: String) {
	create_save_dialog(&app_handle, Some("png"), Some(&file_path))
		.set_title("Export PNG")
		.add_filter("PNG Images", &["png", "PNG"])
		.save_file(move |new_file_path| {
			if let Some(file_path_str) = new_file_path {
				app_handle.emit_all("update_export_png_path", file_path_str.to_string_lossy()).unwrap();
			}
		});
}

#[tauri::command]
pub fn select_gif_path(app_handle: AppHandle, file_path: String) {
	create_save_dialog(&app_handle, Some("gif"), Some(&file_path))
		.set_title("Export GIF")
		.add_filter("GIF Images", &["gif", "GIF"])
		.save_file(move |file_path| {
			if let Some(file_path_str) = file_path {
				app_handle.emit_all("update_export_gif_path", file_path_str.to_string_lossy()).unwrap();
			}
		});
}

#[tauri::command]
pub fn export_png(app_handle: AppHandle, file_state: State<FileState>, selection_state: State<SelectionState>, file_path: String, frames_to_export: String) {
	let file_path = PathBuf::from(&file_path);
	let frames = file_state.frames.lock().unwrap();
	let selected_frames = selection_state.selected_frames.lock().unwrap();
	match frames_to_export.as_str() {
		"combined" => {
			let cols = *file_state.cols.lock().unwrap();
			let rows = *file_state.rows.lock().unwrap();
			match combine_frames(&frames, cols, rows, false) {
				Ok(image) => {
					if let Err(why) = encode_png(&image, file_path) {
						app_handle.emit_all("error", why.to_string()).unwrap();
						return
					}
				},
				Err(why) => {
					app_handle.emit_all("error", why.to_string()).unwrap();
					return
				}
			}
		}
		_ => {
			match &file_path.parent() {
				Some(base_dir) => {
					match &file_path.file_stem() {
						Some(file_stem) => {
							for (i, frame) in frames.iter().enumerate() {
								if frames_to_export != "selected" || selected_frames.contains(&i) {
									let file_path = base_dir.join(format!("{}-{}.png", file_stem.to_string_lossy(), i));
									if let Err(why) = encode_png(&frame.image, file_path) {
										app_handle.emit_all("error", why.to_string()).unwrap();
										return
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
	}
	app_handle.emit_all("notify", "Exported PNG file(s) succesfully".to_string()).unwrap();
	app_handle.emit_all("successful_png_export", "".to_string()).unwrap();
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
					app_handle.emit_all("notify", "Exported GIF file succesfully".to_string()).unwrap();
					app_handle.emit_all("successful_gif_export", "".to_string()).unwrap();
				}
				Err(why) => app_handle.emit_all("error", why.to_string()).unwrap()
			}
		}
		Err(why) => app_handle.emit_all("error", why.to_string()).unwrap()
	}
}

#[tauri::command]
pub fn export_spritesheet(app_handle: AppHandle, file_state: State<FileState>, file_path: String, cols: u32, rows: u32) {
	let frames = file_state.frames.lock().unwrap();
	match combine_frames(&frames, cols as usize, rows as usize, true) {
		Ok(image) => {
			if let Err(why) = encode_png(&image, PathBuf::from(file_path)) {
				app_handle.emit_all("error", why.to_string()).unwrap();
			}
		},
		Err(why) => {
			app_handle.emit_all("error", why.to_string()).unwrap();
		}
	}
}

fn combine_frames(frames: &Vec<Frame>, cols: usize, rows: usize, by_rows: bool) -> Result<RgbaImage, Box<dyn Error>> {
	let mut tile_width = 0;
	let mut tile_height = 0;
	for frame in frames {
		if frame.image.width() > tile_width { tile_width = frame.image.width(); }
		if frame.image.height() > tile_height { tile_height = frame.image.height(); }
	}

	let image_width = tile_width * cols as u32;
	let image_height = tile_height * rows as u32;
	let mut output_image = RgbaImage::new(image_width, image_height);

	for (i, frame) in frames.iter().enumerate() {
		let tile_x = if by_rows { i % cols } else { i / rows };
		let tile_y = if by_rows { i / cols } else { i % rows };

		for y in 0..frame.image.height() {
			for x in 0..frame.image.width() {
				let pixel = *frame.image.get_pixel(x, y);
				let image_x = (tile_x as u32 * tile_width) + x;
				let image_y = (tile_y as u32 * tile_height) + y;
				if image_x < output_image.width() && image_y < output_image.height() {
					output_image.put_pixel(image_x, image_y, pixel);
				}
			}
		}
	}

	Ok(output_image)
}

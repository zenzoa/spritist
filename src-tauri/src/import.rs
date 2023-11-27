use std::{
	fs,
	error::Error,
	path::PathBuf
};
use tauri::{
	AppHandle,
	Manager,
	State,
	api::dialog::ask
};
use image::{ Rgba, RgbaImage };
use image::io::Reader as ImageReader;

use crate::{
	format::{ spr, s16, c16 },
	view::{ view_as_bg, view_as_sprite },
	state::{ RedrawPayload, reset_state, update_window_title },
	file::{ FileState, Frame, SpriteInfo, create_open_dialog, open_file_from_path, enable_file_only_items }
};

struct Callback {
	func: fn(&AppHandle, &PathBuf) -> Result<(), Box<dyn Error>>
}

struct SpritesheetCallback {
	func: fn(&AppHandle, &PathBuf, Vec<Frame>, u16, u16) -> Result<(), Box<dyn Error>>
}

#[tauri::command]
pub fn activate_import_png_as_blk(app_handle: AppHandle) {
	activate_import(app_handle, "Import PNG as BLK".to_string(), Callback{ func: import_png_as_blk_from_path });
}

#[tauri::command]
pub fn activate_import_spritesheet(app_handle: AppHandle) {
	activate_import(app_handle, "Import Spritesheet".to_string(), Callback{ func: open_import_spritesheet_dialog });
}

fn activate_import(app_handle: AppHandle, title: String, callback: Callback) {
	let file_state: State<FileState> = app_handle.state();
	if *file_state.file_is_modified.lock().unwrap() {
		ask(Some(&app_handle.get_window("main").unwrap()),
			"File modified",
			"Do you want to continue anyway and lose any unsaved work?",
			|answer| { if answer { open_png_dialog(app_handle, title, callback); } });
	} else {
		open_png_dialog(app_handle, title, callback);
	}
}

fn open_png_dialog(app_handle: AppHandle, title: String, callback: Callback) {
	create_open_dialog(&app_handle, false)
		.set_title(&title)
		.add_filter("PNG Images", &["png", "PNG"])
		.pick_file(move |file_path| {
			if let Some(file_path_str) = file_path {
				if let Err(why) = (callback.func)(&app_handle, &file_path_str) {
					app_handle.emit_all("error", why.to_string()).unwrap();
				}
			}
		});
}

fn import_png_as_blk_from_path(app_handle: &AppHandle, file_path: &PathBuf) -> Result<(), Box<dyn Error>> {
	let png_image = get_image(file_path)?;

	let cols = (png_image.width() as f32 / 128.0).ceil() as u32;
	let rows = (png_image.height() as f32 / 128.0).ceil() as u32;

	let mut frames: Vec<Frame> = Vec::new();
	for col in 0..cols {
		for row in 0..rows {
			let tile_x = col * 128_u32;
			let tile_y = row * 128_u32;
			let mut tile_image = RgbaImage::new(128, 128);
			for y in 0..128 {
				for x in 0..128 {
					let image_x = tile_x + x;
					let image_y = tile_y + y;
					let pixel = if image_x < png_image.width() && image_y < png_image.height() {
						*png_image.get_pixel(image_x, image_y)
					} else {
						Rgba([0, 0, 0, 255])
					};
					tile_image.put_pixel(x, y, pixel);
				}
			}
			frames.push(Frame{
				image: tile_image,
				color_indexes: Vec::new()
			});
		}
	}

	reset_state(app_handle);

	let blk_file_path = file_path.with_extension("blk");
	let blk_file_title = match blk_file_path.file_name() {
		Some(file_name) => file_name.to_string_lossy().into_owned(),
		None => "".to_string()
	};

	let file_state: State<FileState> = app_handle.state();
	*file_state.file_title.lock().unwrap() = blk_file_title;
	*file_state.file_path.lock().unwrap() = Some(blk_file_path);
	*file_state.file_is_modified.lock().unwrap() = true;
	*file_state.file_is_open.lock().unwrap() = true;
	*file_state.frames.lock().unwrap() = frames;
	*file_state.cols.lock().unwrap() = cols as usize;
	*file_state.rows.lock().unwrap() = rows as usize;

	view_as_bg(app_handle.clone());

	enable_file_only_items(app_handle, false);

	update_window_title(app_handle);

	app_handle.emit_all("redraw", RedrawPayload{
		frame_count: file_state.frames.lock().unwrap().len(),
		selected_frames: Vec::new(),
		cols: *file_state.cols.lock().unwrap(),
		rows: *file_state.rows.lock().unwrap(),
	}).unwrap();

	Ok(())
}

#[derive(Clone, serde::Serialize)]
struct SpritesheetPayload {
	file_path: String,
	width: u32,
	height: u32
}

fn open_import_spritesheet_dialog(app_handle: &AppHandle, file_path: &PathBuf) -> Result<(), Box<dyn Error>> {
	let png_image = get_image(file_path)?;
	app_handle.emit_all("import_spritesheet", SpritesheetPayload{
		file_path: file_path.to_str().ok_or("Invalid file path. Contains non-unicode characters.")?.to_string(),
		width: png_image.width(),
		height: png_image.height()
	}).unwrap();
	Ok(())
}

fn import_spritesheet_as_frames(file_path: &PathBuf, cols: u32, rows: u32) -> Result<Vec<Frame>, Box<dyn Error>> {
	let png_image = get_image(file_path)?;
	let tile_width = png_image.width() / cols;
	let tile_height = png_image.height() / rows;

	let mut frames: Vec<Frame> = Vec::new();

	for tile_y in 0..rows {
		for tile_x in 0..cols {
			let image_x = tile_x * tile_width;
			let image_y = tile_y * tile_height;
			let mut image = RgbaImage::new(tile_width, tile_height);
			for y in 0..tile_height {
				for x in 0..tile_width {
					if image_x + x < png_image.width() && image_y + y < png_image.height() {
						let pixel = *png_image.get_pixel(image_x + x, image_y + y);
						image.put_pixel(x, y, pixel);
					} else {
						return Err("Invalid spritesheet dimensions".into());
					}
				}
			}
			frames.push(Frame{ image, color_indexes: Vec::new() })
		}
	}

	Ok(frames)
}

#[tauri::command]
pub fn import_spritesheet(app_handle: AppHandle, file_path: String, cols: u32, rows: u32) {
	let file_path = PathBuf::from(file_path);
	match import_spritesheet_as_frames(&file_path, cols, rows) {
		Ok(frames) => {
			reset_state(&app_handle);

			let c16_file_path = file_path.with_extension("c16");
			let c16_file_title = match c16_file_path.file_name() {
				Some(file_name) => file_name.to_string_lossy().into_owned(),
				None => "".to_string()
			};

			let file_state: State<FileState> = app_handle.state();
			*file_state.file_title.lock().unwrap() = c16_file_title;
			*file_state.file_path.lock().unwrap() = Some(c16_file_path);
			*file_state.file_is_modified.lock().unwrap() = true;
			*file_state.file_is_open.lock().unwrap() = true;
			*file_state.frames.lock().unwrap() = frames;

			view_as_sprite(app_handle.clone());

			enable_file_only_items(&app_handle, false);

			update_window_title(&app_handle);

			app_handle.emit_all("redraw", RedrawPayload{
				frame_count: file_state.frames.lock().unwrap().len(),
				selected_frames: Vec::new(),
				cols: *file_state.cols.lock().unwrap(),
				rows: *file_state.rows.lock().unwrap(),
			}).unwrap();
		}

		Err(why) => app_handle.emit_all("error", why.to_string()).unwrap()
	}
}

fn encode_spritesheet_as_spr(app_handle: &AppHandle, file_path: &PathBuf, frames: Vec<Frame>, cols: u16, rows: u16) -> Result<(), Box<dyn Error>>{
	let file_state: State<FileState> = app_handle.state();
	let palette = file_state.palette.lock().unwrap().clone();
	let sprite_info = SpriteInfo{ frames, cols, rows, read_only: false };
	let data = spr::encode(sprite_info, &palette)?;
	fs::write(file_path, &data)?;
	app_handle.emit_all("notify", "Exported SPR file succesfully".to_string()).unwrap();
	open_file_from_path(app_handle, file_path).unwrap();
	Ok(())
}

fn encode_spritesheet_as_s16(app_handle: &AppHandle, file_path: &PathBuf, frames: Vec<Frame>, cols: u16, rows: u16) -> Result<(), Box<dyn Error>>{
	let sprite_info = SpriteInfo{ frames, cols, rows, read_only: false };
	let data = s16::encode(sprite_info)?;
	fs::write(file_path, &data)?;
	app_handle.emit_all("notify", "Exported S16 file succesfully".to_string()).unwrap();
	open_file_from_path(app_handle, file_path).unwrap();
	Ok(())
}

fn encode_spritesheet_as_c16(app_handle: &AppHandle, file_path: &PathBuf, frames: Vec<Frame>, cols: u16, rows: u16) -> Result<(), Box<dyn Error>>{
	let sprite_info = SpriteInfo{ frames, cols, rows, read_only: false };
	let data = c16::encode(sprite_info)?;
	fs::write(file_path, &data)?;
	app_handle.emit_all("notify", "Exported C16 file succesfully".to_string()).unwrap();
	open_file_from_path(app_handle, file_path).unwrap();
	Ok(())
}

fn import_spritesheet_for_export(app_handle: AppHandle, file_path: String, cols: u32, rows: u32, extension: &str, callback: SpritesheetCallback) {
	let file_path = PathBuf::from(file_path);
	match import_spritesheet_as_frames(&file_path, cols, rows) {
		Ok(frames) => {
			let new_path = file_path.with_extension(extension);
			if new_path.is_file() {
				ask(Some(&app_handle.get_window("main").unwrap()),
					"File exists",
					&format!("Do you want to overwrite {}?", new_path.to_string_lossy()),
					move |answer| { if answer {
						if let Err(why) = (callback.func)(&app_handle, &new_path, frames, cols as u16, rows as u16) {
							app_handle.emit_all("error", why.to_string()).unwrap();
						}
					}});
			} else {
				if let Err(why) = (callback.func)(&app_handle, &new_path, frames, cols as u16, rows as u16) {
					app_handle.emit_all("error", why.to_string()).unwrap();
				}
			}
		}
		Err(why) => app_handle.emit_all("error", why.to_string()).unwrap()
	}
}

#[tauri::command]
pub fn import_spritesheet_export_spr(app_handle: AppHandle, file_path: String, cols: u32, rows: u32) {
	import_spritesheet_for_export(app_handle, file_path, cols, rows, "spr", SpritesheetCallback{ func: encode_spritesheet_as_spr });
}

#[tauri::command]
pub fn import_spritesheet_export_s16(app_handle: AppHandle, file_path: String, cols: u32, rows: u32) {
	import_spritesheet_for_export(app_handle, file_path, cols, rows, "s16", SpritesheetCallback{ func: encode_spritesheet_as_s16 });
}

#[tauri::command]
pub fn import_spritesheet_export_c16(app_handle: AppHandle, file_path: String, cols: u32, rows: u32) {
	import_spritesheet_for_export(app_handle, file_path, cols, rows, "c16", SpritesheetCallback{ func: encode_spritesheet_as_c16 });
}

fn get_image(file_path: &PathBuf) -> Result<RgbaImage, Box<dyn Error>> {
	Ok(ImageReader::open(file_path)?.decode()?.to_rgba8())
}

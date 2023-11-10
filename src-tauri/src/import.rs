use std::{
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
	view::{ view_as_bg, view_as_sprite },
	state::{ RedrawPayload, reset_state, update_window_title },
	file::{ FileState, Frame, create_open_dialog, enable_file_only_items }
};

struct Callback {
	func: fn(&AppHandle, &PathBuf) -> Result<(), Box<dyn Error>>
}

#[tauri::command]
pub fn activate_import_png_as_blk(app_handle: AppHandle) {
	activate_import(app_handle, Callback{ func: import_png_as_blk_from_path });
}

#[tauri::command]
pub fn activate_import_spritesheet(app_handle: AppHandle) {
	activate_import(app_handle, Callback{ func: open_import_spritesheet_dialog });
}

fn activate_import(app_handle: AppHandle, callback: Callback) {
	let file_state: State<FileState> = app_handle.state();
	if *file_state.file_is_modified.lock().unwrap() {
		ask(Some(&app_handle.get_window("main").unwrap()),
			"File modified",
			"Do you want to continue anyway and lose any unsaved work?",
			|answer| { if answer { open_png_dialog(app_handle, callback); } });
	} else {
		open_png_dialog(app_handle, callback);
	}
}

fn open_png_dialog(app_handle: AppHandle, callback: Callback) {
	create_open_dialog(&app_handle, false)
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

#[tauri::command]
pub fn import_spritesheet(app_handle: AppHandle, file_path: String, cols: u32, rows: u32) {
	let file_path = PathBuf::from(file_path);
	match get_image(&file_path) {
		Ok(png_image) => {
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
								app_handle.emit_all("error", "Invalid spritesheet dimensions".to_string()).unwrap();
								return
							}
						}
					}
					frames.push(Frame{ image, color_indexes: Vec::new() })
				}
			}

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

		},
		Err(why) => app_handle.emit_all("error", why.to_string()).unwrap()
	}
}

fn get_image(file_path: &PathBuf) -> Result<RgbaImage, Box<dyn Error>> {
	Ok(ImageReader::open(file_path)?.decode()?.to_rgba8())
}

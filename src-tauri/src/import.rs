use std::{
	error::Error,
	path::PathBuf
};
use tauri::{
	AppHandle,
	Manager,
	State,
	api::dialog::{ FileDialogBuilder, ask }
};
use image::{ Rgba, RgbaImage };
use image::io::Reader as ImageReader;

use crate::{
	config::view_as_bg,
	state::{ RedrawPayload, reset_state, update_window_title },
	file::{ FileState, Frame, enable_file_only_items }
};

pub fn activate_import_png_as_blk(app_handle: AppHandle) {
	let file_state: State<FileState> = app_handle.state();
	if *file_state.file_is_modified.lock().unwrap() {
		ask(Some(&app_handle.get_window("main").unwrap()),
			"File modified",
			"Do you want to continue anyway and lose any unsaved work?",
			|answer| { if answer { open_png_dialog(app_handle); } });
	} else {
		open_png_dialog(app_handle);
	}

}

fn open_png_dialog(app_handle: AppHandle) {
	FileDialogBuilder::new()
	.add_filter("PNG Images", &["png", "PNG"])
	.pick_file(move |file_path| {
		if let Some(file_path_str) = file_path {
			if let Err(why) = import_png_as_blk_from_path(&app_handle, &file_path_str) {
				app_handle.emit_all("error", why.to_string()).unwrap();
			}
		}
	});
}

fn import_png_as_blk_from_path(app_handle: &AppHandle, file_path: &PathBuf) -> Result<(), Box<dyn Error>> {
	let png_image = ImageReader::open(file_path)?.decode()?.to_rgba8();

	let cols = (png_image.width() as f32 / 128.0).ceil() as u32;
	let rows = (png_image.height() as f32 / 128.0).ceil() as u32;

	let mut frames: Vec<Frame> = Vec::new();
	for col in 0..cols {
		for row in 0..rows {
			let tile_x = col * 128 as u32;
			let tile_y = row * 128 as u32;
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
	*file_state.read_only.lock().unwrap() = false;
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

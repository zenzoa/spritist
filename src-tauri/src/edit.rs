use image::RgbaImage;

use tauri::{ AppHandle, State, Emitter };

use crate::{
	file::{ FileState, Frame },
	selection::SelectionState,
	history::add_state_to_history
};

#[tauri::command]
pub fn shift_selection(handle: AppHandle, file_state: State<FileState>, selection_state: State<SelectionState>, x_shift:i32, y_shift:i32) {
	add_state_to_history(&handle);
	let mut frames = file_state.frames.lock().unwrap();
	let selected_frames = selection_state.selected_frames.lock().unwrap();
	for (i, frame) in frames.iter_mut().enumerate() {
		if selected_frames.contains(&i) {
			*frame = shift_pixels(frame, x_shift, y_shift);
		}
	}
	handle.emit("reload_selection", ()).unwrap();
}

fn shift_pixels(frame: &Frame, x_shift:i32, y_shift:i32) -> Frame {
	let img = &frame.image;
	let color_indexes = &frame.color_indexes;
	let width = img.width();
	let height = img.height();
	let mut new_img = RgbaImage::new(width, height);
	let mut new_indexes = Vec::new();

	let left = i32::max(0, x_shift);
	let right = i32::min(0, x_shift) + width as i32;
	let top = i32::max(0, y_shift);
	let bottom = i32::min(0, y_shift) + height as i32;

	for y in top..bottom {
		for x in left..right {
			let source_x = x - x_shift;
			let source_y = y - y_shift;
			if x >= 0 && x < width as i32 && y >= 0 && y < height as i32 &&
				source_x >= 0 && source_x < width as i32 && source_y >= 0 && source_y < height as i32 {
					let pixel = img.get_pixel(source_x as u32, source_y as u32);
					new_img.put_pixel(x as u32, y as u32, *pixel);

					let pixel_index = source_x as usize + (source_y as usize * width as usize);
					if pixel_index < color_indexes.len() {
						new_indexes.push(color_indexes[pixel_index]);
					}

			} else {
				new_indexes.push(0);
			}
		}
	}

	Frame {
		image: new_img,
		color_indexes: new_indexes
	}
}

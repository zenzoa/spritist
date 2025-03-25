use std::{
	borrow::Cow,
	sync::Mutex
};

use tauri::{ AppHandle, State, Emitter };

use image::{ ImageBuffer, DynamicImage, RgbaImage };

use arboard::{ Clipboard, ImageData };

use crate::{
	file::{ FileState, Frame },
	selection::{ SelectionState, delete_frames },
	history::add_state_to_history,
	state::RedrawPayload
};

pub struct ClipboardState {
	pub copied_frames: Mutex<Vec<Frame>>
}

#[tauri::command]
pub fn cut(handle: AppHandle, file_state: State<FileState>, selection_state: State<SelectionState>, clipboard_state: State<ClipboardState>) {
	copy(file_state.clone(), selection_state.clone(), clipboard_state);
	delete_frames(handle, file_state, selection_state);
}

fn copy_to_real_clipboard(img: &RgbaImage) {
	if let Ok(mut clipboard) = Clipboard::new() {
		let image_data = ImageData {
			width: img.width() as usize,
			height: img.height() as usize,
			bytes: Cow::from(img.as_raw())
		};
		clipboard.set_image(image_data).unwrap();
	}
}

#[tauri::command]
pub fn copy(file_state: State<FileState>, selection_state: State<SelectionState>, clipboard_state: State<ClipboardState>) {
	if let Ok(mut clipboard) = Clipboard::new() {
		clipboard.clear().unwrap();
	}

	let frames = file_state.frames.lock().unwrap();
	let selected_frames = selection_state.selected_frames.lock().unwrap();
	let mut copied_frames: Vec<Frame> = Vec::new();
	for (i, frame) in frames.iter().enumerate() {
		if selected_frames.contains(&i) {
			copied_frames.push(frame.clone());
		}
	}

	if !copied_frames.is_empty() {
		copy_to_real_clipboard(&copied_frames[0].image);
	}

	*clipboard_state.copied_frames.lock().unwrap() = copied_frames;
}

fn paste_from_real_clipboard(file_state: &State<FileState>, selection_state: &State<SelectionState>, image_data: ImageData) {
	if let Some(image_buffer) = ImageBuffer::from_raw(image_data.width as u32, image_data.height as u32, image_data.bytes.into_owned()) {
		let new_frame = Frame {
			image: DynamicImage::ImageRgba8(image_buffer).into_rgba8(),
			color_indexes: Vec::new()
		};

		let mut frames = file_state.frames.lock().unwrap();
		let mut selected_frames = selection_state.selected_frames.lock().unwrap();

		let insert_point = match selected_frames.iter().max() {
			Some(index) => *index + 1,
			None => frames.len()
		};

		if insert_point <= frames.len() {
			frames.insert(insert_point, new_frame);
			*selected_frames = vec![insert_point];
		}
	}

}

fn paste_from_local_clipboard(file_state: &State<FileState>, selection_state: &State<SelectionState>, copied_frames: &[Frame]) {
	let mut frames = file_state.frames.lock().unwrap();
	let mut selected_frames = selection_state.selected_frames.lock().unwrap();

	let insert_point = match selected_frames.iter().max() {
		Some(index) => *index + 1,
		None => frames.len()
	};

	if insert_point <= frames.len() {
		frames.splice(insert_point..insert_point, copied_frames.iter().cloned());
		*selected_frames = (insert_point..(insert_point + copied_frames.len())).collect();
	}
}

#[tauri::command]
pub fn paste(handle: AppHandle, file_state: State<FileState>, selection_state: State<SelectionState>, clipboard_state: State<ClipboardState>) {
	add_state_to_history(&handle);

	let copied_frames = clipboard_state.copied_frames.lock().unwrap();
	if copied_frames.is_empty() {
		match Clipboard::new() {
			Ok(mut clipboard) => {
				match clipboard.get_image() {
					Ok(image_data) => paste_from_real_clipboard(&file_state, &selection_state, image_data),
					Err(_) => paste_from_local_clipboard(&file_state, &selection_state, &copied_frames)
				}
			}
			Err(_) => paste_from_local_clipboard(&file_state, &selection_state, &copied_frames)
		}
	} else {
		paste_from_local_clipboard(&file_state, &selection_state, &copied_frames);
	}

	let frames = file_state.frames.lock().unwrap();
	let selected_frames = selection_state.selected_frames.lock().unwrap();
	handle.emit("redraw", RedrawPayload{
		frame_count: frames.len(),
		selected_frames: selected_frames.clone(),
		cols: *file_state.cols.lock().unwrap(),
		rows: *file_state.rows.lock().unwrap(),
	}).unwrap();
}

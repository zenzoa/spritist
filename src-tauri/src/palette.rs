use std::{
	fs,
	error::Error,
	path::PathBuf
};
use tauri::{
	AppHandle,
	Manager,
	State
};
use bytes::{ Bytes, Buf };
use image::{ Rgba, RgbaImage };

use crate::{
	file::{ FileState, Frame, create_open_dialog },
	state::{ redraw, update_window_title },
	history::add_state_to_history
};

#[derive(Clone)]
pub struct Palette {
	pub file_name: Option<String>,
	pub colors: [(u8, u8, u8); 256]
}

impl Palette {
	pub fn get_color(&self, color_index: u8) -> Rgba<u8> {
		if color_index == 0 {
			Rgba([0, 0, 0, 0])
		} else {
			match self.colors.get(color_index as usize) {
				Some(color) => Rgba([color.0, color.1, color.2, 255]),
				None => Rgba([0, 0, 0, 255])
			}
		}
	}

	pub fn find_color_index(&self, color: Rgba<u8>) -> Option<u8> {
		if color[3] == 0 { return Some(0); }
		for (i, palette_color) in self.colors.iter().enumerate() {
			if palette_color.0 == color[0] && palette_color.1 == color[1] && palette_color.2 == color[2] {
				return Some(i as u8);
			}
		}
		None
	}

	pub fn get_closest_color_indexes(&self, image: &RgbaImage) -> Vec<u8> {
		let mut color_indexes: Vec<u8> = Vec::new();
		for y in 0..image.height() {
			for x in 0..image.width() {
				let color = image.get_pixel(x, y);
				let color_index = self.find_closest_color_index(color);
				color_indexes.push(color_index);
			}
		}
		color_indexes
	}

	pub fn find_closest_color_index(&self, color: &Rgba<u8>) -> u8 {
		if color[3] == 0 { return 0; }
		let mut best_fit_index: u8 = 0;
		let mut best_fit_dist = 255*255*3;
		for (i, palette_color) in self.colors.iter().enumerate() {
			if palette_color.0 == color[0] && palette_color.1 == color[1] && palette_color.2 == color[2] {
				return i as u8
			} else {
				let dist_to_color =
					i32::pow(color[0] as i32 - palette_color.0 as i32, 2) +
					i32::pow(color[1] as i32 - palette_color.1 as i32, 2) +
					i32::pow(color[2] as i32 - palette_color.2 as i32, 2);
				if dist_to_color < best_fit_dist {
					best_fit_index = i as u8;
					best_fit_dist = dist_to_color;
				}
			}
		}
		best_fit_index
	}
}

pub fn activate_load_palette(app_handle: AppHandle) {
	create_open_dialog(&app_handle, false)
		.add_filter("SPR Palettes", &["dta", "DTA", "pal", "PAL"])
		.pick_file(move |file_path| {
			if let Some(file_path) = file_path {
				if let Err(why) = load_palette_from_path(&app_handle, &file_path) {
					app_handle.emit_all("error", why.to_string()).unwrap();
				}
			}
		});
}

fn load_palette_from_path(app_handle: &AppHandle, file_path: &PathBuf) -> Result<(), Box<dyn Error>> {
	let bytes = fs::read(file_path)?;
	let colors = read_color_data(&bytes)?;
	let file_name = file_path.file_name().map(|file_name| file_name.to_string_lossy().into());
	let file_state: State<FileState> = app_handle.state();
	let new_palette = Palette{ file_name, colors };
	load_palette(app_handle, file_state, new_palette)?;
	let menu_handle = app_handle.get_window("main").unwrap().menu_handle();
	menu_handle.get_item("load_original").set_title("- Original Palette").unwrap();
	menu_handle.get_item("load_reversed").set_title("- Reversed Palette").unwrap();
	menu_handle.get_item("load_palette").set_title("✔ Custom Palette...").unwrap();
	Ok(())
}

pub fn load_original(app_handle: AppHandle) {
	let file_state: State<FileState> = app_handle.state();
	load_palette(&app_handle, file_state, original_palette()).unwrap();
	let menu_handle = app_handle.get_window("main").unwrap().menu_handle();
	menu_handle.get_item("load_original").set_title("✔ Original Palette").unwrap();
	menu_handle.get_item("load_reversed").set_title("- Reversed Palette").unwrap();
	menu_handle.get_item("load_palette").set_title("- Custom Palette...").unwrap();
}

pub fn load_reversed(app_handle: AppHandle) {
	let file_state: State<FileState> = app_handle.state();
	load_palette(&app_handle, file_state, reversed_palette()).unwrap();
	let menu_handle = app_handle.get_window("main").unwrap().menu_handle();
	menu_handle.get_item("load_original").set_title("- Original Palette").unwrap();
	menu_handle.get_item("load_reversed").set_title("✔ Reversed Palette").unwrap();
	menu_handle.get_item("load_palette").set_title("- Custom Palette...").unwrap();
}

fn load_palette(app_handle: &AppHandle, file_state: State<FileState>, palette: Palette) -> Result<(), Box<dyn Error>> {
	match swap_palette(app_handle, &palette) {
		Ok(frames) => {
			add_state_to_history(app_handle);
			*file_state.frames.lock().unwrap() = frames;
			*file_state.palette.lock().unwrap() = palette;
			update_window_title(app_handle);
			redraw(app_handle);
			Ok(())
		}
		Err(why) => Err(why)
	}
}

pub fn activate_convert_to_palette(app_handle: AppHandle) {
	create_open_dialog(&app_handle, false)
		.add_filter("SPR Palettes", &["dta", "DTA", "pal", "PAL"])
		.pick_file(move |file_path| {
			if let Some(file_path) = file_path {
				if let Err(why) = convert_to_palette_from_path(&app_handle, &file_path) {
					app_handle.emit_all("error", why.to_string()).unwrap();
				}
			}
		});
}

fn convert_to_palette_from_path(app_handle: &AppHandle, file_path: &PathBuf) -> Result<(), Box<dyn Error>> {
	let bytes = fs::read(file_path)?;
	let colors = read_color_data(&bytes)?;
	let file_name = file_path.file_name().map(|file_name| file_name.to_string_lossy().into());
	let file_state: State<FileState> = app_handle.state();
	let new_palette = Palette{ file_name, colors };
	convert_to_palette(app_handle, file_state, new_palette)?;
	let menu_handle = app_handle.get_window("main").unwrap().menu_handle();
	menu_handle.get_item("load_original").set_title("- Original Palette").unwrap();
	menu_handle.get_item("load_reversed").set_title("- Reversed Palette").unwrap();
	menu_handle.get_item("load_palette").set_title("✔ Custom Palette...").unwrap();
	Ok(())
}

pub fn convert_to_original(app_handle: AppHandle) {
	let file_state: State<FileState> = app_handle.state();
	convert_to_palette(&app_handle, file_state, original_palette()).unwrap();
	let menu_handle = app_handle.get_window("main").unwrap().menu_handle();
	menu_handle.get_item("load_original").set_title("✔ Original Palette").unwrap();
	menu_handle.get_item("load_reversed").set_title("- Reversed Palette").unwrap();
	menu_handle.get_item("load_palette").set_title("- Custom Palette...").unwrap();
}

pub fn convert_to_reversed(app_handle: AppHandle) {
	let file_state: State<FileState> = app_handle.state();
	convert_to_palette(&app_handle, file_state, reversed_palette()).unwrap();
	let menu_handle = app_handle.get_window("main").unwrap().menu_handle();
	menu_handle.get_item("load_original").set_title("- Original Palette").unwrap();
	menu_handle.get_item("load_reversed").set_title("✔ Reversed Palette").unwrap();
	menu_handle.get_item("load_palette").set_title("- Custom Palette...").unwrap();
}

fn convert_to_palette(app_handle: &AppHandle, file_state: State<FileState>, palette: Palette) -> Result<(), Box<dyn Error>> {
	match translate_colors(app_handle, &palette) {
		Ok(frames) => {
			add_state_to_history(app_handle);
			*file_state.frames.lock().unwrap() = frames;
			*file_state.palette.lock().unwrap() = palette;
			update_window_title(app_handle);
			redraw(app_handle);
			Ok(())
		}
		Err(why) => Err(why)
	}
}

fn read_color_data(contents: &[u8]) -> Result<[(u8, u8, u8); 256], Box<dyn Error>> {
	let mut buffer = Bytes::copy_from_slice(contents);
	let mut colors: [(u8, u8, u8); 256] = [(0, 0, 0); 256];

	for color in &mut colors {
		if buffer.remaining() < 3 {
			return Err("Invalid palette data. File is too short.".into());
		}
		let r = buffer.get_u8() * 4;
		let g = buffer.get_u8() * 4;
		let b = buffer.get_u8() * 4;
		*color = (r, g, b);
	}

	format_colors(colors);

	Ok(colors)
}

fn format_colors(mut colors: [(u8, u8, u8); 256]) {
	// replace last 10 colors, because that's what C1 does for some reason
	colors[246] = (255, 255, 255);
	colors[247] = (192, 192, 192);
	colors[248] = (128, 128, 128);
	colors[249] = (255, 0, 0);
	colors[250] = (0, 255, 0);
	colors[251] = (255, 255, 0);
	colors[252] = (0, 0, 255);
	colors[253] = (255, 0, 255);
	colors[254] = (0, 255, 255);
	colors[255] = (255, 255, 255);
}

fn swap_palette(app_handle: &AppHandle, new_palette: &Palette) -> Result<Vec<Frame>, Box<dyn Error>> {
	let file_state: State<FileState> = app_handle.state();
	let mut new_frames: Vec<Frame> = Vec::new();
	for frame in file_state.frames.lock().unwrap().iter() {
		let new_frame = swap_palette_for_frame(frame, new_palette)?;
		new_frames.push(new_frame);
	}
	Ok(new_frames)
}

fn swap_palette_for_frame(frame: &Frame, palette: &Palette) -> Result<Frame, Box<dyn Error>> {
	let width = frame.image.width();
	let height = frame.image.height();

	let mut new_image = RgbaImage::new(width, height);

	// find color with - same index in new palette
	for y in 0..height {
		for x in 0..width {
			let pixel_index = x + (y * width);
			match frame.color_indexes.get(pixel_index as usize) {
				Some(color_index) => {
					let pixel = palette.get_color(*color_index);
					new_image.put_pixel(x, y, pixel);
				}
				None => {
					return Err("Unable to swap palettes because not all the frames have indexed color (SPR format). Try converting to palette instead.".into());
				}
			}
		}
	}

	Ok(Frame{
		image: new_image,
		color_indexes: frame.color_indexes.clone()
	})
}

fn translate_colors(app_handle: &AppHandle, new_palette: &Palette) -> Result<Vec<Frame>, Box<dyn Error>> {
	let file_state: State<FileState> = app_handle.state();
	let mut new_frames: Vec<Frame> = Vec::new();
	for frame in file_state.frames.lock().unwrap().iter() {
		let new_frame = translate_colors_for_frame(frame, new_palette)?;
		new_frames.push(new_frame);
	}
	Ok(new_frames)
}

fn translate_colors_for_frame(frame: &Frame, palette: &Palette) -> Result<Frame, Box<dyn Error>> {
	let width = frame.image.width();
	let height = frame.image.height();

	let color_indexes: Vec<u8> = palette.get_closest_color_indexes(&frame.image);
	let mut new_image = RgbaImage::new(width, height);

	for y in 0..height {
		for x in 0..width {
			let pixel_index = x + (y * width);
			match color_indexes.get(pixel_index as usize) {
				Some(color_index) => {
					let pixel = palette.get_color(*color_index);
					new_image.put_pixel(x, y, pixel);
				}
				None => {
					return Err("Unable to swap palettes because not all the frames have indexed color (SPR format). Try converting to palette instead.".into());
				}
			}
		}
	}

	Ok(Frame{ image: new_image, color_indexes })
}

pub fn original_palette() -> Palette {
	let colors = [ (0, 0, 0), (252, 252, 252), (252, 252, 252), (252, 252, 252), (252, 252, 252), (252, 252, 252), (252, 252, 252), (252, 252, 252), (252, 252, 252), (252, 252, 252), (252, 252, 252), (16, 8, 8), (20, 24, 40), (24, 40, 16), (24, 36, 48), (44, 16, 8), (40, 24, 36), (52, 40, 16), (48, 44, 48), (24, 28, 68), (20, 52, 84), (24, 60, 96), (36, 28, 68), (44, 52, 72), (44, 56, 104), (28, 64, 28), (28, 64, 40), (52, 72, 24), (52, 72, 44), (60, 96, 24), (60, 96, 40), (24, 64, 92), (28, 64, 100), (52, 68, 80), (44, 76, 104), (56, 96, 76), (60, 96, 112), (72, 24, 8), (72, 28, 36), (80, 44, 16), (72, 52, 44), (104, 24, 12), (108, 28, 36), (108, 48, 16), (104, 52, 36), (72, 56, 72), (72, 56, 104), (104, 52, 72), (116, 52, 104), (80, 72, 20), (80, 72, 48), (80, 100, 24), (76, 104, 44), (112, 72, 20), (108, 76, 44), (112, 100, 20), (116, 100, 48), (76, 76, 76), (76, 84, 108), (84, 100, 80), (84, 100, 112), (104, 84, 76), (104, 88, 104), (112, 104, 80), (108, 108, 108), (48, 60, 132), (56, 92, 144), (64, 60, 132), (76, 88, 140), (72, 88, 176), (80, 104, 140), (72, 108, 172), (100, 88, 136), (100, 92, 172), (108, 112, 140), (108, 116, 168), (76, 92, 196), (80, 116, 200), (92, 112, 236), (104, 120, 204), (100, 120, 244), (104, 140, 52), (92, 132, 76), (92, 128, 104), (108, 140, 76), (116, 136, 112), (120, 164, 76), (120, 164, 104), (88, 128, 140), (92, 128, 184), (112, 132, 148), (116, 136, 172), (124, 164, 140), (120, 164, 176), (88, 132, 204), (88, 144, 228), (88, 164, 240), (112, 136, 204), (116, 136, 252), (120, 160, 216), (112, 164, 236), (140, 24, 16), (144, 28, 36), (136, 52, 16), (140, 52, 40), (172, 24, 16), (172, 28, 32), (168, 48, 16), (172, 48, 40), (152, 52, 72), (140, 76, 20), (140, 80, 40), (144, 104, 20), (144, 104, 48), (172, 80, 20), (168, 84, 40), (176, 104, 20), (172, 108, 44), (136, 84, 72), (136, 88, 108), (140, 108, 76), (136, 116, 108), (172, 80, 72), (176, 84, 100), (168, 116, 72), (172, 116, 104), (208, 44, 28), (212, 52, 72), (200, 84, 20), (200, 84, 40), (204, 104, 20), (204, 112, 44), (232, 80, 20), (232, 80, 44), (232, 116, 20), (232, 116, 40), (204, 80, 72), (204, 84, 100), (204, 116, 72), (200, 116, 104), (232, 80, 80), (236, 88, 96), (240, 112, 72), (236, 112, 112), (144, 60, 132), (140, 80, 132), (132, 120, 144), (132, 120, 168), (168, 120, 136), (164, 124, 164), (128, 124, 196), (208, 48, 128), (216, 112, 136), (236, 116, 204), (164, 136, 44), (148, 132, 80), (144, 136, 112), (136, 172, 80), (140, 172, 108), (176, 136, 80), (172, 140, 108), (180, 164, 80), (180, 168, 112), (156, 196, 60), (164, 208, 92), (208, 136, 24), (208, 136, 48), (212, 168, 20), (208, 168, 44), (240, 140, 20), (236, 140, 44), (244, 172, 20), (244, 172, 48), (204, 140, 76), (200, 148, 104), (208, 168, 80), (208, 168, 112), (236, 144, 72), (236, 144, 100), (240, 172, 76), (236, 176, 108), (208, 196, 56), (244, 204, 12), (248, 204, 48), (252, 240, 12), (252, 236, 44), (212, 196, 80), (212, 196, 112), (200, 244, 80), (204, 244, 108), (248, 200, 76), (244, 204, 108), (248, 236, 76), (252, 232, 112), (140, 136, 144), (140, 144, 172), (144, 168, 144), (148, 168, 180), (168, 144, 140), (164, 152, 176), (176, 168, 144), (172, 168, 180), (136, 148, 204), (132, 152, 248), (148, 164, 208), (144, 168, 252), (160, 156, 196), (172, 172, 204), (164, 184, 244), (168, 200, 168), (152, 196, 196), (176, 192, 208), (168, 196, 252), (176, 232, 196), (184, 228, 232), (204, 144, 144), (200, 152, 164), (204, 176, 140), (200, 176, 176), (236, 144, 140), (236, 144, 164), (232, 180, 136), (232, 180, 168), (196, 184, 200), (196, 188, 224), (244, 172, 204), (212, 200, 144), (208, 200, 176), (204, 240, 136), (204, 228, 176), (240, 204, 144), (236, 208, 172), (248, 232, 144), (248, 236, 176), (212, 200, 204), (200, 200, 232), (212, 228, 204), (216, 232, 228), (228, 212, 208), (224, 208, 224), (240, 232, 208), (244, 244, 236), (252, 252, 252), (0, 0, 0), (0, 0, 0), (0, 0, 0), (255, 255, 255), (192, 192, 192), (128, 128, 128), (255, 0, 0), (0, 255, 0), (255, 255, 0), (0, 0, 255), (255, 0, 255), (0, 255, 255), (255, 255, 255) ];
	Palette { file_name: None, colors }
}

pub fn reversed_palette() -> Palette {
	let file_name = Some("reversed palette".to_string());
	let mut colors = original_palette().colors;
	colors.reverse();
	format_colors(colors);
	Palette{ file_name, colors }
}

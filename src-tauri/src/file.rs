use std::{
	fs,
	error::Error,
	path::PathBuf,
	sync::Mutex,
	io::Cursor
};
use tauri::{
	AppHandle,
	Manager,
	State,
	api::dialog::{ FileDialogBuilder, ask }
};
use image::{
	RgbaImage,
	AnimationDecoder,
	io::Reader as ImageReader,
	codecs::gif::GifDecoder
};

use crate::{
	state::{
		RedrawPayload,
		reset_state,
		redraw,
		update_window_title
	},
	selection::SelectionState,
	history::add_state_to_history,
	format::{
		spr,
		s16,
		m16,
		c16,
		blk,
		dta,
		photo_album
	},
	view::{
		view_as_sprite,
		view_as_bg
	},
	palette
};

pub struct FileState {
	pub file_title: Mutex<String>,
	pub file_path: Mutex<Option<PathBuf>>,
	pub file_is_open: Mutex<bool>,
	pub file_is_modified: Mutex<bool>,
	pub frames: Mutex<Vec<Frame>>,
	pub palette: Mutex<palette::Palette>,
	pub cols: Mutex<usize>,
	pub rows: Mutex<usize>,
	pub read_only: Mutex<bool>
}

impl FileState {
	pub fn new() -> FileState {
		FileState{
			file_title: Mutex::new("".to_string()),
			file_path: Mutex::new(None),
			file_is_open: Mutex::new(false),
			file_is_modified: Mutex::new(false),
			frames: Mutex::new(Vec::new()),
			palette: Mutex::new(palette::original_palette()),
			cols: Mutex::new(0),
			rows: Mutex::new(0),
			read_only: Mutex::new(false)
		}
	}
}

pub struct SpriteInfo {
	pub frames: Vec<Frame>,
	pub cols: u16,
	pub rows: u16,
	pub read_only: bool
}

#[derive(Clone)]
pub struct Frame {
	pub image: RgbaImage,
	pub color_indexes: Vec<u8>
}

pub fn create_open_dialog(app_handle: &AppHandle, use_default_filter: bool) -> FileDialogBuilder {
	let mut file_dialog = FileDialogBuilder::new();

	if use_default_filter {
		file_dialog = file_dialog.add_filter("Sprites", &["spr", "SPR", "s16", "S16", "c16", "C16", "m16", "M16", "n16", "N16", "blk", "BLK", "dta", "DTA", "photo album", "Photo Album", "png", "PNG", "gif", "GIF"]);
	}

	let file_state: State<FileState> = app_handle.state();
	if let Some(file_path) = file_state.file_path.lock().unwrap().clone() {
		if let Some(parent_dir) = file_path.parent() {
			file_dialog = file_dialog.set_directory(parent_dir);
		}
	}

	file_dialog
}

pub fn create_save_dialog(app_handle: &AppHandle, new_extension: Option<&str>, new_file_path: Option<&str>) -> FileDialogBuilder {
	let file_state: State<FileState> = app_handle.state();

	let mut file_name = file_state.file_title.lock().unwrap().clone();
	if let Some(file_path) = new_file_path {
		if let Some(new_file_name) = PathBuf::from(file_path).file_name() {
			if let Some(new_file_name) = new_file_name.to_str() {
				file_name = new_file_name.to_string();
			}
		}
	}

 	if file_name.is_empty() {
		let ext = match new_extension {
			Some(ext) => ext,
			None => "c16"
		};
		file_name = format!("untitled.{}", ext).to_string();
	} else {
		if let Some(ext) = new_extension {
			if let Some(new_file_name) = PathBuf::from(&file_name).with_extension(ext).to_str() {
				file_name = new_file_name.to_string();
			}
		}
	}

	let mut file_dialog = FileDialogBuilder::new()
		.set_file_name(&file_name);

	if let Some(file_path) = new_file_path {
		if let Some(parent_dir) = PathBuf::from(file_path).parent() {
			file_dialog = file_dialog.set_directory(parent_dir);
		}
	} else if let Some(file_path) = file_state.file_path.lock().unwrap().clone() {
		if let Some(parent_dir) = file_path.parent() {
			file_dialog = file_dialog.set_directory(parent_dir);
		}
	}

	file_dialog
}

#[tauri::command]
pub fn activate_new_file(app_handle: AppHandle) {
	let file_state: State<FileState> = app_handle.state();
	if *file_state.file_is_modified.lock().unwrap() {
		ask(Some(&app_handle.get_window("main").unwrap()),
			"File modified",
			"Do you want to continue anyway and lose any unsaved work?",
			|answer| { if answer { complete_new_file(app_handle); } });
	} else {
		complete_new_file(app_handle);
	}
}

pub fn complete_new_file(app_handle: AppHandle) {
	reset_state(&app_handle);
	let file_state: State<FileState> = app_handle.state();
	*file_state.file_is_open.lock().unwrap() = true;

	enable_file_only_items(&app_handle, false);
	update_window_title(&app_handle);
	redraw(&app_handle);
}

#[tauri::command]
pub fn activate_open_file(app_handle: AppHandle) {
	let file_state: State<FileState> = app_handle.state();
	if *file_state.file_is_modified.lock().unwrap() {
		ask(Some(&app_handle.get_window("main").unwrap()),
			"File modified",
			"Do you want to continue anyway and lose any unsaved work?",
			|answer| { if answer { open_file_dialog(app_handle); } });
	} else {
		open_file_dialog(app_handle);
	}
}

pub fn open_file_dialog(app_handle: AppHandle) {
	create_open_dialog(&app_handle, true)
		.set_title("Open Sprite")
		.pick_file(move |file_path| {
			if let Some(file_path_str) = file_path {
				if let Err(why) = open_file_from_path(&app_handle, &file_path_str) {
					app_handle.emit_all("error", why.to_string()).unwrap();
				}
			}
		});
}

pub fn open_file_from_path(app_handle: &AppHandle, file_path: &PathBuf) -> Result<(), Box<dyn Error>> {
	let sprite_info = get_sprite_info(app_handle, file_path)?;

	reset_state(app_handle);
	let file_state: State<FileState> = app_handle.state();
	if let Some(file_title) = file_path.file_name() {
		if let Some(file_title_str) = file_title.to_str() {
			*file_state.file_title.lock().unwrap() = file_title_str.to_string();
		}
	}
	*file_state.file_path.lock().unwrap() = Some(file_path.to_owned());
	*file_state.file_is_open.lock().unwrap() = true;
	*file_state.read_only.lock().unwrap() = sprite_info.read_only;
	*file_state.frames.lock().unwrap() = sprite_info.frames;
	*file_state.cols.lock().unwrap() = sprite_info.cols.into();
	*file_state.rows.lock().unwrap() = sprite_info.rows.into();

	let mut is_background = false;
	if let Some(extension) = file_path.extension() {
		if extension.to_string_lossy().to_lowercase() == "blk" {
			is_background = true;
		}
	}
	if let Some(file_name) = file_path.file_name() {
		match file_name.to_string_lossy().to_lowercase().as_str() {
			"back.spr" => { // C1 background
				is_background = true;
				*file_state.cols.lock().unwrap() = 58;
				*file_state.rows.lock().unwrap() = 8;
			},
			"back.s16" => { // C2 background
				is_background = true;
				*file_state.cols.lock().unwrap() = 58;
				*file_state.rows.lock().unwrap() = 16;
			},
			_ => {}
		}
	}
	if is_background {
		view_as_bg(app_handle.clone());
	} else {
		view_as_sprite(app_handle.clone());
	}

	enable_file_only_items(app_handle, sprite_info.read_only);

	update_window_title(app_handle);

	app_handle.emit_all("redraw", RedrawPayload{
		frame_count: file_state.frames.lock().unwrap().len(),
		selected_frames: Vec::new(),
		cols: *file_state.cols.lock().unwrap(),
		rows: *file_state.rows.lock().unwrap(),
	}).unwrap();

	Ok(())
}

pub fn drop_files(app_handle: &AppHandle, file_paths: &Vec<PathBuf>) -> Result<(), Box<dyn Error>> {
	let file_state: State<FileState> = app_handle.state();
	let file_is_open = *file_state.file_is_open.lock().unwrap();
	let frames = file_state.frames.lock().unwrap().clone();
	if (file_is_open && !frames.is_empty()) || file_paths.len() > 1 {
		for file_path in file_paths.iter() {
			insert_image_from_path(app_handle, file_path)?;
		}
	} else if file_paths.len() == 1 {
		open_file_from_path(app_handle, &file_paths[0])?;
	}
	Ok(())
}

#[tauri::command]
pub fn activate_insert_image(app_handle: AppHandle) {
	create_open_dialog(&app_handle, true)
		.set_title("Insert Image")
		.pick_file(move |file_path| {
			if let Some(file_path_str) = file_path {
				if let Err(why) = insert_image_from_path(&app_handle, &file_path_str) {
					app_handle.emit_all("error", why.to_string()).unwrap();
				}
			}
		});
}

pub fn insert_image_from_path(app_handle: &AppHandle, file_path: &PathBuf) -> Result<(), Box<dyn Error>> {
	let sprite_info = get_sprite_info(app_handle, file_path)?;
	add_state_to_history(app_handle);

	let new_frames = sprite_info.frames;

	let file_state: State<FileState> = app_handle.state();
	let selection_state: State<SelectionState> = app_handle.state();

	let mut frames = file_state.frames.lock().unwrap();
	let mut selected_frames = selection_state.selected_frames.lock().unwrap();

	let insert_point = match selected_frames.iter().max() {
		Some(index) => *index + 1,
		None => frames.len()
	};

	if insert_point <= frames.len() {
		frames.splice(insert_point..insert_point, new_frames.iter().cloned());
		*selected_frames = (insert_point..(insert_point + new_frames.len())).map(usize::from).collect();
		app_handle.emit_all("redraw", RedrawPayload{
			frame_count: frames.len(),
			selected_frames: selected_frames.clone(),
			cols: *file_state.cols.lock().unwrap(),
			rows: *file_state.rows.lock().unwrap(),
		}).unwrap();
	}

	Ok(())
}

#[tauri::command]
pub fn activate_replace_frame(app_handle: AppHandle, selection_state: State<SelectionState>) {
	let selected_frames = selection_state.selected_frames.lock().unwrap();
	if !selected_frames.is_empty() {
		create_open_dialog(&app_handle, true)
			.set_title("Replace Frame")
			.pick_file(move |file_path| {
				if let Some(file_path_str) = file_path {
					if let Err(why) = replace_frame_from_path(&app_handle, &file_path_str) {
						app_handle.emit_all("error", why.to_string()).unwrap();
					}
				}
			});
	}
}

pub fn replace_frame_from_path(app_handle: &AppHandle, file_path: &PathBuf) -> Result<(), Box<dyn Error>> {
	let sprite_info = get_sprite_info(app_handle, file_path)?;
	add_state_to_history(app_handle);

	let new_frames = sprite_info.frames;

	let file_state: State<FileState> = app_handle.state();
	let selection_state: State<SelectionState> = app_handle.state();

	let mut frames = file_state.frames.lock().unwrap();
	let mut selected_frames = selection_state.selected_frames.lock().unwrap();

	let insert_point = match selected_frames.iter().min() {
		Some(index) => *index,
		None => frames.len()
	};

	for selected_frame_index in selected_frames.iter().rev() {
		frames.remove(*selected_frame_index);
	}

	frames.splice(insert_point..insert_point, new_frames.iter().cloned());

	*selected_frames = (insert_point..(insert_point + new_frames.len())).map(usize::from).collect();

	app_handle.emit_all("redraw", RedrawPayload{
		frame_count: frames.len(),
		selected_frames: selected_frames.clone(),
		cols: *file_state.cols.lock().unwrap(),
		rows: *file_state.rows.lock().unwrap(),
	}).unwrap();

	Ok(())
}

pub fn get_sprite_info(app_handle: &AppHandle, file_path: &PathBuf) -> Result<SpriteInfo, Box<dyn Error>> {
	let bytes = fs::read(file_path)?;

	let file_state: State<FileState> = app_handle.state();
	let palette = file_state.palette.lock().unwrap();

	let extension_err = "File does not have a valid file extension (\".spr\", \".s16\", \".c16\", \".blk\", etc.)";
	let extension = file_path.extension().ok_or(extension_err)?;
	let extension_str = extension.to_str().ok_or(extension_err)?;
	match extension_str.to_lowercase().as_str() {
		"spr" => {
			// try regular SPR
			match spr::decode(&bytes, &palette) {
				Ok(result) => Ok(result),
				Err(_) => {
					// try single-width SPR
					match spr::decode_single_width(&bytes, &palette) {
						Ok(result) => Ok(result),
						Err(_) => {
							// try double-width SPR
							match spr::decode_double_width(&bytes, &palette) {
								Ok(result) => Ok(result),
								Err(_) => {
									// try multi-sprite SPR
									match spr::decode_multi_sprite(&bytes, &palette) {
										Ok(result) => Ok(result),
										Err(_) => {
											// try prototype SPR
											spr::decode_prototype(&bytes, &palette)
										}
									}
								}
							}
						}
					}
				}
			}
		},
		"s16" => s16::decode(&bytes),
		"c16" => c16::decode(&bytes),
		"m16" => m16::decode(&bytes),
		"n16" => m16::decode(&bytes),
		"blk" => blk::decode(&bytes),
		"dta" => dta::decode(&bytes),
		"photo album" => {
			photo_album::decode(&bytes, &palette)
		},
		"png" => {
			let image = ImageReader::new(Cursor::new(bytes)).with_guessed_format()?.decode()?.to_rgba8();
			let frame = Frame{ image, color_indexes: Vec::new() };
			Ok(SpriteInfo{
				frames: vec![frame],
				cols: 0,
				rows: 0,
				read_only: true
			})
		},
		"gif" => {
			let gif_frames = GifDecoder::new(Cursor::new(bytes))?.into_frames();
			let mut frames: Vec<Frame> = Vec::new();
			for gif_frame in gif_frames {
				let image = gif_frame?.into_buffer();
				frames.push(Frame{ image, color_indexes: Vec::new() });
			}
			Ok(SpriteInfo{
				frames,
				cols: 0,
				rows: 0,
				read_only: true
			})
		}
		_ => Err(extension_err.into())
	}
}

#[tauri::command]
pub fn activate_save_file(app_handle: AppHandle, file_state: State<FileState>) {
	let file_path_opt = file_state.file_path.lock().unwrap().clone();
	match file_path_opt {
		Some(file_path) => {
			if !*file_state.read_only.lock().unwrap() {
				if let Err(why) = save_file_to_path(&app_handle, &file_path) {
					app_handle.emit_all("error", why.to_string()).unwrap();
				}
			} else if file_path.ends_with(".png") || file_path.ends_with(".PNG") {
				app_handle.emit_all("error", "Use Export PNG or Export Spritesheet instead.".to_string()).unwrap();
			} else if file_path.ends_with(".gif") || file_path.ends_with(".GIF") {
				app_handle.emit_all("error", "Use Export GIF instead.".to_string()).unwrap();
			} else if file_path.ends_with(".spr") || file_path.ends_with(".SPR") {
				app_handle.emit_all("error", "File is in a SPR format Spritist can read but not write. Use Save As to save a copy in the standard SPR format.".to_string()).unwrap();
			} else {
				app_handle.emit_all("error", "File is read-only. Use Save As or Export instead.".to_string()).unwrap();
			}
		}
		_ => {
			activate_save_as(app_handle);
		}
	}
}

#[tauri::command]
pub fn activate_save_as(app_handle: AppHandle) {
	create_save_dialog(&app_handle, None, None)
		.set_title("Save As")
		.add_filter("Sprites", &["spr", "SPR", "s16", "S16", "c16", "C16", "m16", "M16", "n16", "N16", "blk", "BLK", "dta", "DTA", "photo album", "Photo Album", "PHOTO ALBUM"])
		.save_file(move |file_path| {
			if let Some(file_path_str) = file_path {
				if let Err(why) = save_file_to_path(&app_handle, &file_path_str) {
					app_handle.emit_all("error", why.to_string()).unwrap();
				}
			}
		});
}

pub fn save_file_to_path(app_handle: &AppHandle, file_path: &PathBuf) -> Result<(), Box<dyn Error>> {
	let extension_err = "File does not have a valid file extension (\".spr\", \".s16\", \".c16\", \".blk\")";
	let extension = file_path.extension().ok_or(extension_err)?;
	let extension_str = extension.to_str().ok_or(extension_err)?;

	let file_state: State<FileState> = app_handle.state();
	let palette = file_state.palette.lock().unwrap().clone();
	let sprite_info = SpriteInfo{
		frames: file_state.frames.lock().unwrap().clone(),
		cols: *file_state.cols.lock().unwrap() as u16,
		rows: *file_state.rows.lock().unwrap() as u16,
		read_only: false
	};

	let data = match extension_str {
		"spr" => Some(spr::encode(sprite_info, &palette)?),
		"s16" => Some(s16::encode(sprite_info)?),
		"c16" => Some(c16::encode(sprite_info)?),
		"m16" => Some(m16::encode(sprite_info)?),
		"n16" => Some(m16::encode(sprite_info)?),
		"blk" => Some(blk::encode(sprite_info)?),
		_ => None
	}.ok_or(extension_err)?;

	fs::write(file_path, &data)?;

	if let Some(file_title) = file_path.file_name() {
		if let Some(file_title_str) = file_title.to_str() {
			*file_state.file_title.lock().unwrap() = file_title_str.to_string();
		}
	}
	*file_state.file_path.lock().unwrap() = Some(file_path.to_owned());
	*file_state.file_is_modified.lock().unwrap() = false;
	*file_state.read_only.lock().unwrap() = false;

	update_window_title(app_handle);

	Ok(())
}

#[tauri::command]
pub fn set_bg_size(file_state: State<FileState>, cols: usize, rows: usize) {
	*file_state.cols.lock().unwrap() = cols;
	*file_state.rows.lock().unwrap() = rows;
}

pub fn enable_file_only_items(app_handle: &AppHandle, read_only: bool) {
	let menu_handle = app_handle.get_window("main").unwrap().menu_handle();
	menu_handle.get_item("save_file").set_enabled(!read_only).unwrap();
	menu_handle.get_item("save_as").set_enabled(true).unwrap();
	menu_handle.get_item("export_png").set_enabled(true).unwrap();
	menu_handle.get_item("export_gif").set_enabled(true).unwrap();
	menu_handle.get_item("export_spritesheet").set_enabled(true).unwrap();
	menu_handle.get_item("insert_image").set_enabled(true).unwrap();
	menu_handle.get_item("convert_to_palette").set_enabled(true).unwrap();
	menu_handle.get_item("convert_to_original").set_enabled(true).unwrap();
	menu_handle.get_item("convert_to_reversed").set_enabled(true).unwrap();
	menu_handle.get_item("view_as_sprite").set_enabled(true).unwrap();
	menu_handle.get_item("view_as_bg").set_enabled(true).unwrap();

	app_handle.emit_all("update_save_button", !read_only).unwrap();
	app_handle.emit_all("update_save_as_button", true).unwrap();
	app_handle.emit_all("update_insert_button", true).unwrap();
}

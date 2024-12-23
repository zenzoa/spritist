// https://sheeslostknowledge.blogspot.com/2014/12/extracting-information-from-creatures-1.html
// https://github.com/LoneShee/SLKExamples/blob/master/C1_Photoalbum2HTML.py

use std::error::Error;
use bytes::{ Bytes, Buf };
use image::RgbaImage;

use super::{ PixelFormat, file_header_error, image_header_error, image_error };
use crate::{
	file::{ Frame, SpriteInfo },
	palette::Palette
};

fn read_c_string(buffer: &mut Bytes, last_byte: Option<u8>) -> Result<String, Box<dyn Error>> {
	let mut string_len;
	match last_byte {
		Some(byte) => string_len = byte as u32,
		None => {
			if buffer.remaining() < 1 { return Err(image_error()); }
			string_len = buffer.get_u8() as u32;
		}
	}

	if string_len == 255 {
		if buffer.remaining() < 2 { return Err(image_error()); }
		string_len = buffer.get_u16_le() as u32;
	}

	let mut string = "".to_string();
	for _ in 0..string_len {
		if buffer.remaining() < 1 { return Err(image_error()); }
		let next_char = buffer.get_u8() as char;
		string.push(next_char);
	}

	Ok(string)
}

pub fn decode(contents: &[u8], palette: &Palette) -> Result<SpriteInfo, Box<dyn Error>> {
	let mut frames: Vec<Frame> = Vec::new();
	let mut buffer = Bytes::copy_from_slice(contents);

	// file header
	if buffer.remaining() < 2 { return Err(file_header_error()); }
	let image_count = buffer.get_u16_le();

	// image headers
	for _ in 0..image_count {
		let _ = read_c_string(&mut buffer, None)?; // timestamp

		if buffer.remaining() < 12 { return Err(image_header_error()); }
		let width = buffer.get_u32_le();
		let height = buffer.get_u32_le();
		let _ = buffer.get_u32_le(); // unused

		let mut image = RgbaImage::new(width, height);
		let mut color_indexes: Vec<u8> = Vec::new();
		let mut last_byte = 0_u8;

		for i in 0..(width * height) {
			if buffer.remaining() < 1 { return Err(image_error()); }
			let color_index = buffer.get_u8();
			if i == (width * height) - 1 { last_byte = color_index; }
			color_indexes.push(color_index);
			let pixel = palette.get_color(color_index);
			let x = i % width;
			let y = (height - 1) - (i / width);
			image.put_pixel(x, y, pixel);
		}

		frames.push(Frame{ image, color_indexes });

		let _ = read_c_string(&mut buffer, Some(last_byte))?; // comment
	}

	Ok(SpriteInfo{
		frames,
		pixel_format: PixelFormat::Format565,
		cols: 0,
		rows: 0,
		read_only: true
	})
}

// https://github.com/openc2e/openc2e/blob/main/src/fileformats/charsetdta.cpp

use std::error::Error;
use bytes::{ Bytes, Buf };
use image::{ Rgba, RgbaImage };

use super::{ PixelFormat, image_error };
use crate::file::{ Frame, SpriteInfo };

pub fn decode(contents: &[u8]) -> Result<SpriteInfo, Box<dyn Error>> {
	let size = contents.len();
	if size != 4096 && size != 9472 && size != 17152 && size != 18944 {
		return Err("Unable to open charset file. Invalid file size.".into());
	}

	let char_width = match size {
		4096 => 4,
		17152 => 11,
		_ => 6
	};

	let char_height = match size {
		4096 => 8,
		_ => 12
	};

	let char_length = char_width * char_height;

	let char_count = match size {
		4096 => size / char_length,
		_ => size / (char_length + 2)
	};

	let mut frames: Vec<Frame> = Vec::new();
	let mut buffer = Bytes::copy_from_slice(contents);

	let mut char_data_list = Vec::new();
	for _ in 0..char_count {
		let mut char_data = Vec::new();
		for _ in 0..char_length {
			if buffer.remaining() < 1 { return Err(image_error()); }
			char_data.push(buffer.get_u8());
		}
		char_data_list.push(char_data);
	}

	for char_data in char_data_list {
		let frame_width = match size {
			4096 => char_width,
			_ => {
				if buffer.remaining() < 2 { return Err(image_error()); }
				buffer.get_u16_le() as usize
			}
		};

		let mut image = RgbaImage::new(frame_width as u32, char_height as u32);

		for y in 0..char_height {
			for x in 0..frame_width {
				let color_index = char_data[x + (y * char_width)];
				let color = match color_index {
					0 => Rgba([0, 0, 0, 0]),
					1 => Rgba([255, 255, 255, 255]),
					2 => Rgba([128, 128, 128, 255]),
					_ => Rgba([0, 0, 128, 255])
				};
				image.put_pixel(x as u32, y as u32, color);
			}
		}

		frames.push(Frame{ image, color_indexes: Vec::new() });
	}

	Ok(SpriteInfo{
		frames,
		pixel_format: PixelFormat::Format565,
		cols: 0,
		rows: 0,
		read_only: false
	})
}

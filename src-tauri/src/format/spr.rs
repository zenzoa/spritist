use std::error::Error;
use bytes::{ Bytes, BytesMut, Buf, BufMut };
use image::RgbaImage;

use super::{ file_header_error, image_header_error, image_error };
use crate::{
	file::{ Frame, SpriteInfo },
	palette::Palette
};

struct ImageHeader {
	width: u16,
	height: u16
}
struct ImageHeaderPrototype {
	width: u8,
	height: u8
}

pub fn decode(contents: &[u8], palette: &Palette) -> Result<SpriteInfo, Box<dyn Error>> {
	let mut frames: Vec<Frame> = Vec::new();
	let mut buffer = Bytes::copy_from_slice(contents);

	// file header
	if buffer.remaining() < 2 { return Err(file_header_error()); }
	let image_count = buffer.get_u16_le();

	// image headers
	let mut image_headers: Vec<ImageHeader> = Vec::new();
	for _ in 0..image_count {
		if buffer.remaining() < 8 { return Err(image_header_error()); }
		let _offset = buffer.get_u32_le();
		image_headers.push(ImageHeader {
			width: buffer.get_u16_le(),
			height: buffer.get_u16_le()
		})
	}

	// image data
	for image_header in image_headers {
		let mut image = RgbaImage::new(image_header.width.into(), image_header.height.into());
		let mut color_indexes: Vec<u8> = Vec::new();
		for y in 0..image_header.height {
			for x in 0..image_header.width {
				if buffer.remaining() < 1 { return Err(image_error()); }
				let color_index = buffer.get_u8();
				color_indexes.push(color_index);
				let pixel = palette.get_color(color_index);
				image.put_pixel(x.into(), y.into(), pixel);
			}
		}
		frames.push(Frame{ image, color_indexes });
	}

	Ok(SpriteInfo{
		frames,
		cols: 0,
		rows: 0,
		read_only: false
	})
}

pub fn decode_single_width(contents: &[u8], palette: &Palette) -> Result<SpriteInfo, Box<dyn Error>> {
	let mut frames: Vec<Frame> = Vec::new();
	let mut buffer = Bytes::copy_from_slice(contents);

	// file header
	if buffer.remaining() < 6 { return Err(file_header_error()); }
	let image_count = buffer.get_u16_le();
	let _ = buffer.get_u32_le();

	// image data
	for _ in 0..image_count {
		if buffer.remaining() < 4 { return Err(image_header_error()); }
		let width = buffer.get_u16_le();
		let height = buffer.get_u16_le();

		let mut image = RgbaImage::new(width.into(), height.into());
		let mut color_indexes: Vec<u8> = Vec::new();
		for y in (0..height).rev() {
			for x in 0..width {
				if buffer.remaining() < 1 { return Err(image_error()); }
				let color_index = buffer.get_u8();
				color_indexes.push(color_index);
				let pixel = palette.get_color(color_index);
				image.put_pixel(x.into(), y.into(), pixel);
			}
		}
		frames.push(Frame{ image, color_indexes });
	}

	Ok(SpriteInfo{
		frames,
		cols: 0,
		rows: 0,
		read_only: true
	})
}

pub fn decode_double_width(contents: &[u8], palette: &Palette) -> Result<SpriteInfo, Box<dyn Error>> {
	let mut frames: Vec<Frame> = Vec::new();
	let mut buffer = Bytes::copy_from_slice(contents);

	// file header
	if buffer.remaining() < 6 { return Err(file_header_error()); }
	let image_count = buffer.get_u16_le();
	let _ = buffer.get_u32_le();

	// image data
	for _ in 0..image_count {
		if buffer.remaining() < 10 { return Err(image_header_error()); }
		let padded_width = buffer.get_u32_le();
		let height = buffer.get_u32_le();
		let width = buffer.get_u16_le();

		if height > 65535 {
			return Err("Invalid height".into());
		}

		let mut image = RgbaImage::new(width.into(), height);
		let mut color_indexes: Vec<u8> = Vec::new();
		for y in (0..height).rev() {
			for x in 0..padded_width {
				if buffer.remaining() < 1 { return Err(image_error()); }
				let color_index = buffer.get_u8();
				if x < (width as u32) {
					color_indexes.push(color_index);
					let pixel = palette.get_color(color_index);
					image.put_pixel(x, y, pixel);
				}
			}
		}
		frames.push(Frame{ image, color_indexes });
	}

	Ok(SpriteInfo{
		frames,
		cols: 0,
		rows: 0,
		read_only: true
	})
}

pub fn decode_multi_sprite(contents: &[u8], palette: &Palette) -> Result<SpriteInfo, Box<dyn Error>> {
	let mut frames: Vec<Frame> = Vec::new();
	let mut buffer = Bytes::copy_from_slice(contents);

	// file header
	if buffer.remaining() < 6 { return Err(file_header_error()); }
	let image_count = buffer.get_u16_le();
	let _ = buffer.get_u32_le();

	// image data
	for _ in 0..image_count {
		let sub_sprite = decode_double_width(&buffer, palette)?;
		for frame in sub_sprite.frames {
			frames.push(frame);
		}
	}

	Ok(SpriteInfo{
		frames,
		cols: 0,
		rows: 0,
		read_only: true
	})
}

pub fn decode_prototype(contents: &[u8], palette: &Palette) -> Result<SpriteInfo, Box<dyn Error>> {
	let mut frames: Vec<Frame> = Vec::new();
	let mut buffer = Bytes::copy_from_slice(contents);

	// file header
	if buffer.remaining() < 2 { return Err(file_header_error()); }
	let image_count = buffer.get_u16_le();

	// image headers
	let mut image_headers: Vec<ImageHeaderPrototype> = Vec::new();
	for _ in 0..image_count {
		if buffer.remaining() < 8 { return Err(image_header_error()); }
		let _offset = buffer.get_u16_le();
		image_headers.push(ImageHeaderPrototype {
			width: buffer.get_u8(),
			height: buffer.get_u8()
		})
	}

	// image data
	for image_header in image_headers {
		let mut image = RgbaImage::new(image_header.width.into(), image_header.height.into());
		let mut color_indexes: Vec<u8> = Vec::new();
		for y in 0..image_header.height {
			for x in 0..image_header.width {
				if buffer.remaining() < 1 { return Err(image_error()); }
				let color_index = buffer.get_u8();
				color_indexes.push(color_index);
				let pixel = palette.get_color(color_index);
				image.put_pixel(x.into(), y.into(), pixel);
			}
		}
		frames.push(Frame{ image, color_indexes });
	}

	Ok(SpriteInfo{
		frames,
		cols: 0,
		rows: 0,
		read_only: true
	})
}

pub fn encode(sprite_info: SpriteInfo, palette: &Palette) -> Result<Bytes, Box<dyn Error>> {
	let frame_count = sprite_info.frames.len();

	let mut images_buffer = BytesMut::new();
	let mut headers_buffer = BytesMut::new();
	for frame in &sprite_info.frames {
		let offset = 2 + (frame_count * 8) + images_buffer.len();
		let width = frame.image.width();
		let height = frame.image.height();

		headers_buffer.put_u32_le(offset as u32);
		headers_buffer.put_u16_le(width as u16);
		headers_buffer.put_u16_le(height as u16);

		let mut color_indexes = frame.color_indexes.clone();
		if color_indexes.is_empty() {
			color_indexes = palette.get_closest_color_indexes(&frame.image);
		}

		for y in 0..height {
			for x in 0..width {
				let pixel_index = x + (y * width);
				match color_indexes.get(pixel_index as usize) {
					Some(color_index) => {
						images_buffer.put_u8(*color_index);
					}
					None => {
						let color = frame.image.get_pixel(x, y);
						match palette.find_color_index(*color) {
							Some(color_index) => images_buffer.put_u8(color_index),
							None => images_buffer.put_u8(0)
						}

					}
				}
			}
		}
	}

	let mut buffer = BytesMut::new();
	buffer.put_u16_le(frame_count as u16);
	buffer.extend_from_slice(&headers_buffer);
	buffer.extend_from_slice(&images_buffer);

	Ok(buffer.freeze())
}

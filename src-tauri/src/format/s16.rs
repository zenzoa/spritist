use std::error::Error;
use bytes::{ Bytes, BytesMut, Buf, BufMut };
use image::RgbaImage;

use super::{
	PixelFormat,
	file_header_error,
	image_header_error,
	image_error,
	parse_pixel,
	encode_pixel
};
use crate::file::{ Frame, SpriteInfo };

struct FileHeader {
	pixel_format: u32, // 0 = 555, 1 = 565
	image_count: u16
}

struct ImageHeader {
	offset: u32,
	width: u16,
	height: u16
}

fn read_file_header(buffer: &mut Bytes) -> Result<FileHeader, Box<dyn Error>> {
	if buffer.remaining() < 6 { return Err(file_header_error()); }
	Ok(FileHeader {
		pixel_format: buffer.get_u32_le(),
		image_count: buffer.get_u16_le()
	})
}

fn read_image_header(buffer: &mut Bytes) -> Result<ImageHeader, Box<dyn Error>> {
	if buffer.remaining() < 8 { return Err(image_header_error()); }
	let offset = buffer.get_u32_le();
	let width = buffer.get_u16_le();
	let height = buffer.get_u16_le();
	Ok(ImageHeader {
		offset,
		width,
		height
	})
}

fn read_image_data(contents: &[u8], header: &ImageHeader, pixel_format: PixelFormat) -> Result<RgbaImage, Box<dyn Error>> {
	let mut image = RgbaImage::new(header.width.into(), header.height.into());
	let mut buffer = Bytes::copy_from_slice(contents);
	buffer.advance(header.offset as usize);
	for y in 0..header.height {
		for x in 0..header.width {
			if buffer.remaining() < 2 { return Err(image_error()); }
			let pixel_data = buffer.get_u16_le();
			let mut color = parse_pixel(pixel_data, pixel_format);
			if color[0] == 0 && color[1] == 0 && color[2] == 0 {
				color[3] = 0;
			}
			image.put_pixel(x.into(), y.into(), color);
		}
	}
	Ok(image)
}

pub fn decode(contents: &[u8]) -> Result<SpriteInfo, Box<dyn Error>> {
	let mut frames: Vec<Frame> = Vec::new();
	let mut buffer = Bytes::copy_from_slice(contents);
	let file_header = read_file_header(&mut buffer)?;
	let pixel_format = match file_header.pixel_format {
		0 => PixelFormat::Format555,
		_ => PixelFormat::Format565
	};
	let mut image_headers: Vec<ImageHeader> = Vec::new();
	for _ in 0..file_header.image_count {
		if let Ok(image_header) = read_image_header(&mut buffer) {
			image_headers.push(image_header);
		}
	}
	for image_header in image_headers {
		let image = read_image_data(contents, &image_header, pixel_format)?;
		frames.push(Frame{ image, color_indexes: Vec::new() });
	}
	Ok(SpriteInfo{
		frames,
		pixel_format,
		cols: 0,
		rows: 0,
		read_only: false
	})
}

fn write_file_header(pixel_format: PixelFormat, image_count: u16) -> Bytes {
	let mut buffer = BytesMut::new();
	buffer.put_u32_le(match pixel_format {
		PixelFormat::Format555 => 0,
		PixelFormat::Format565 => 1
	});
	buffer.put_u16_le(image_count);
	buffer.freeze()
}

fn write_image_header(offset: u32, width: u16, height: u16) -> Bytes {
	let mut buffer = BytesMut::new();
	buffer.put_u32_le(offset);
	buffer.put_u16_le(width);
	buffer.put_u16_le(height);
	buffer.freeze()
}

fn write_image_data(image: &RgbaImage, pixel_format: PixelFormat) -> Bytes {
	let mut buffer = BytesMut::new();
	for y in 0..image.height() {
		for x in 0..image.width() {
			let pixel = image.get_pixel(x, y);
			if pixel[3] == 0 {
				buffer.put_u16_le(0);
			} else {
				buffer.put_u16_le(encode_pixel(pixel, pixel_format));
			}
		}
	}
	buffer.freeze()
}

pub fn encode(sprite_info: SpriteInfo) -> Result<Bytes, Box<dyn Error>> {
	let frame_count = sprite_info.frames.len();

	let mut images_buffer = BytesMut::new();
	let mut headers_buffer = BytesMut::new();
	for frame in &sprite_info.frames {
		let offset = 6 + (frame_count * 8) + images_buffer.len();
		headers_buffer.extend_from_slice(&write_image_header(offset as u32, frame.image.width() as u16, frame.image.height() as u16));
		images_buffer.extend_from_slice(&write_image_data(&frame.image, sprite_info.pixel_format));
	}

	let mut buffer = BytesMut::new();
	buffer.extend_from_slice(&write_file_header(sprite_info.pixel_format, frame_count as u16));
	buffer.extend_from_slice(&headers_buffer);
	buffer.extend_from_slice(&images_buffer);

	Ok(buffer.freeze())
}

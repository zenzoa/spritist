use std::error::Error;
use bytes::{ Bytes, BytesMut, Buf, BufMut };
use image::RgbaImage;

use super::{ PixelFormat, file_header_error, image_header_error, image_error, parse_pixel_565_be };
use crate::file::{ Frame, SpriteInfo };

struct FileHeader {
	image_count: u16
}

struct ImageHeader {
	offset: u32,
	width: u16,
	height: u16
}

fn read_file_header(buffer: &mut Bytes) -> Result<FileHeader, Box<dyn Error>> {
	if buffer.remaining() < 6 { return Err(file_header_error()); }
	let _pixel_format = buffer.get_u32(); // not used because it should always be 1
	Ok(FileHeader {
		image_count: buffer.get_u16()
	})
}

fn read_image_header(buffer: &mut Bytes) -> Result<ImageHeader, Box<dyn Error>> {
	if buffer.remaining() < 8 { return Err(image_header_error()); }
	let offset = buffer.get_u32();
	let width = buffer.get_u16();
	let height = buffer.get_u16();
	Ok(ImageHeader {
		offset,
		width,
		height
	})
}

fn read_image_data(contents: &[u8], header: &ImageHeader) -> Result<RgbaImage, Box<dyn Error>> {
	let mut image = RgbaImage::new(header.width.into(), header.height.into());
	let mut buffer = Bytes::copy_from_slice(contents);
	buffer.advance(header.offset as usize);
	for y in 0..header.height {
		for x in 0..header.width {
			if buffer.remaining() < 2 { return Err(image_error()); }
			let mut color = parse_pixel_565_be(buffer.get_u16());
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
	let mut image_headers: Vec<ImageHeader> = Vec::new();
	for _ in 0..file_header.image_count {
		if let Ok(image_header) = read_image_header(&mut buffer) {
			image_headers.push(image_header);
		}
	}
	for image_header in image_headers {
		let image = read_image_data(contents, &image_header)?;
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

fn write_file_header(image_count: u16) -> Bytes {
	let mut buffer = BytesMut::new();
	buffer.put_u32(1); // 565 format
	buffer.put_u16(image_count);
	buffer.freeze()
}

fn write_image_header(offset: u32, width: u16, height: u16) -> Bytes {
	let mut buffer = BytesMut::new();
	buffer.put_u32(offset);
	buffer.put_u16(width);
	buffer.put_u16(height);
	buffer.freeze()
}

fn write_image_data(image: &RgbaImage) -> Bytes {
	let mut buffer = BytesMut::new();
	for y in 0..image.height() {
		for x in 0..image.width() {
			let pixel = image.get_pixel(x, y);
			buffer.extend_from_slice(&write_pixel_data(pixel[0].into(), pixel[1].into(), pixel[2].into()));
		}
	}
	buffer.freeze()
}

fn write_pixel_data(r: u16, g: u16, b: u16) -> Bytes {
	let mut buffer = BytesMut::new();
	let pixel_data: u16 = ((r << 8) & 0xf800) | ((g << 3) & 0x07c0) | ((b >> 2) & 0x003e);
	buffer.put_u16(pixel_data);
	buffer.freeze()
}

pub fn encode(sprite_info: SpriteInfo) -> Result<Bytes, Box<dyn Error>> {
	let frame_count = sprite_info.frames.len();

	let mut images_buffer = BytesMut::new();
	let mut headers_buffer = BytesMut::new();
	for frame in &sprite_info.frames {
		let offset = 6 + (frame_count * 8) + images_buffer.len();
		headers_buffer.extend_from_slice(&write_image_header(offset as u32, frame.image.width() as u16, frame.image.height() as u16));
		images_buffer.extend_from_slice(&write_image_data(&frame.image));
	}

	let mut buffer = BytesMut::new();
	buffer.extend_from_slice(&write_file_header(frame_count as u16));
	buffer.extend_from_slice(&headers_buffer);
	buffer.extend_from_slice(&images_buffer);

	Ok(buffer.freeze())
}

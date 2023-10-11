use std::error::Error;
use bytes::{ Bytes, BytesMut, Buf, BufMut };
use image::RgbaImage;

use super::{ file_header_error, image_header_error, image_error, parse_pixel_555, parse_pixel_565 };
use crate::file::{ Frame, SpriteInfo };

struct FileHeader {
	pixel_format: u32, // 2 = 555, 3 = 565
	cols: u16,
	rows: u16,
	image_count: u16
}

struct ImageHeader {
	first_line_offset: u32,
	width: u16,
	height: u16
}

fn read_file_header(buffer: &mut Bytes) -> Result<FileHeader, Box<dyn Error>> {
	if buffer.remaining() < 6 { return Err(file_header_error()); }
	Ok(FileHeader {
		pixel_format: buffer.get_u32_le(),
		cols: buffer.get_u16_le(),
		rows: buffer.get_u16_le(),
		image_count: buffer.get_u16_le() // this should equal cols * rows
	})
}

fn read_image_header(buffer: &mut Bytes) -> Result<ImageHeader, Box<dyn Error>> {
	if buffer.remaining() < 8 { return Err(image_header_error()); }
	let first_line_offset = buffer.get_u32_le() + 4;
	let width = buffer.get_u16_le();
	let height = buffer.get_u16_le();
	if width != 128 || height != 128 {
		return Err("Invalid data. All frames in a BLK file must be 128 x 128 px.".into());
	}
	Ok(ImageHeader {
		width,
		height,
		first_line_offset
	})
}

fn read_image_data(contents: &[u8], header: &ImageHeader, pixel_format: u32) -> Result<RgbaImage, Box<dyn Error>> {
	let mut image = RgbaImage::new(header.width as u32, header.height as u32);
	let mut buffer = Bytes::copy_from_slice(contents);
	buffer.advance(header.first_line_offset as usize);
	for y in 0..image.height() {
		for x in 0..image.width() {
			if buffer.remaining() < 2 { return Err(image_error()); }
			let pixel_data = buffer.get_u16_le();
			let color = match pixel_format {
				2 => parse_pixel_555(pixel_data),
				_ => parse_pixel_565(pixel_data)
			};
			image.put_pixel(x, y, color);
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
		let image = read_image_data(contents, &image_header, file_header.pixel_format)?;
		frames.push(Frame{ image, color_indexes: Vec::new() });
	}
	Ok(SpriteInfo{
		frames,
		cols: file_header.cols,
		rows: file_header.rows,
		read_only: false
	})
}

// pub fn combine_tiles(images: Vec<RgbaImage>, cols: u32, rows: u32) -> RgbaImage {
// 	let mut output_image = RgbaImage::new(cols * 128, rows * 128);
// 	for (i, image) in images.iter().enumerate() {
// 		let image_x = (i as u32) / rows;
// 		let image_y = (i as u32) % rows;
// 		for x in 0..image.width() {
// 			for y in 0..image.height() {
// 				let pixel_x = (image_x * 128) + x;
// 				let pixel_y = (image_y * 128) + y;
// 				let color = image.get_pixel(x, y);
// 				output_image.put_pixel(pixel_x, pixel_y, *color);
// 			}
// 		}
// 	}
// 	output_image
// }

fn write_file_header(buffer: &mut BytesMut, cols: u16, rows: u16) {
	buffer.put_u32_le(3); // 565 format
	buffer.put_u16_le(cols);
	buffer.put_u16_le(rows);
	buffer.put_u16_le(cols * rows);
}

fn write_image_header(buffer: &mut BytesMut, first_line_offset: u32) {
	buffer.put_u32_le(first_line_offset - 4);
	buffer.put_u16_le(128);
	buffer.put_u16_le(128);
}

fn write_image_data(image: &RgbaImage) -> BytesMut {
	let mut buffer = BytesMut::new();
	for y in 0..128 {
		for x in 0..128 {
			let pixel = image.get_pixel(x, y);
			write_pixel_data(&mut buffer, pixel[0].into(), pixel[1].into(), pixel[2].into());
		}
	}
	buffer
}

fn write_pixel_data(buffer: &mut BytesMut, r: u16, g: u16, b: u16) {
	let pixel_data: u16 = ((r << 8) & 0xf800) | ((g << 3) & 0x07e0) | ((b >> 3) & 0x001f);
	buffer.put_u16_le(pixel_data);
}

pub fn encode(sprite_info: SpriteInfo) -> Result<Bytes, Box<dyn Error>> {
	if sprite_info.frames.len() != (sprite_info.cols * sprite_info.rows) as usize {
		return Err("Incorrect number of frames for a BLK file. Must equal COLUMNS x ROWS (see View > View As Background).".into());
	}

	// write file header to buffer
	let mut buffer = BytesMut::new();
	write_file_header(&mut buffer, sprite_info.cols, sprite_info.rows);

	// calculate initial offset of image data (= file header + image headers)
	let size_of_headers = 10 + (8 * sprite_info.frames.len());
	let size_of_image = 128 * 128 * 2;

	// get image data
	let mut images_buffer = BytesMut::new();
	for (i, frame) in sprite_info.frames.iter().enumerate() {
		if frame.image.width() != 128 || frame.image.height() != 128 {
			return Err("All frames in a BLK file must be 128 x 128 px.".into());
		}
		let first_line_offset = size_of_headers + (size_of_image * i);
		write_image_header(&mut buffer, first_line_offset as u32);
		let image_buffer = write_image_data(&frame.image);
		images_buffer.unsplit(image_buffer);
	}

	// write image data to buffer
	buffer.unsplit(images_buffer);

	Ok(buffer.freeze())
}

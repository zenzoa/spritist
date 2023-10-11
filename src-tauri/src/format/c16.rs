use std::error::Error;
use bytes::{ Bytes, BytesMut, Buf, BufMut };
use image::{ RgbaImage, Rgba };

use super::{ file_header_error, image_header_error, image_error, parse_pixel_555, parse_pixel_565 };
use crate::file::{ Frame, SpriteInfo };

struct FileHeader {
	pixel_format: u32, // 2 = 555, 3 = 565
	image_count: u16
}

struct ImageHeader {
	width: u16,
	height: u16,
	line_offsets: Vec<u32>
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
	let mut line_offsets = vec![ buffer.get_u32_le() ];
	let width = buffer.get_u16_le();
	let height = buffer.get_u16_le();
	for _ in 0..(height - 1) {
		if buffer.remaining() < 2 { return Err(image_header_error()); }
		line_offsets.push(buffer.get_u32_le());
	}
	Ok(ImageHeader {
		width,
		height,
		line_offsets
	})
}

fn read_image_data(contents: &[u8], header: &ImageHeader, pixel_format: u32) -> Result<RgbaImage, Box<dyn Error>> {
	let mut image = RgbaImage::new(header.width as u32, header.height as u32);
	for (y, line_offset) in header.line_offsets.iter().enumerate() {
		let mut buffer = Bytes::copy_from_slice(contents);
		buffer.advance(*line_offset as usize);
		let mut x: u16 = 0;
		while x < header.width {
			if buffer.remaining() < 2 { return Err(image_error()); }
			let run_header = buffer.get_u16_le();
			let run_type = run_header & 0x1; // 0 = transparent, 1 = color
			let run_length = (run_header & 0xfffe) >> 1;
			if run_type == 1 && buffer.remaining() >= (run_length * 2).into() {
				for i in 0..run_length {
					if buffer.remaining() < 2 { return Err(image_error()); }
					let pixel_data = buffer.get_u16_le();
					let color = match pixel_format {
						2 => parse_pixel_555(pixel_data),
						_ => parse_pixel_565(pixel_data)
					};
					image.put_pixel((x + i) as u32, y as u32, color);
				}
			} else if run_type == 0 {
				for i in 0..run_length {
					image.put_pixel((x + i) as u32, y as u32, Rgba([0, 0, 0, 0]));
				}
			}
			x += run_length;
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
		cols: 0,
		rows: 0,
		read_only: false
	})
}

fn write_file_header(buffer: &mut BytesMut, image_count: u16) {
	buffer.put_u32_le(3); // 565 format
	buffer.put_u16_le(image_count);
}

fn write_image_header(buffer: &mut BytesMut, width: u16, height: u16, line_offsets: Vec<u32>) {
	if line_offsets.len() > 1 {
		buffer.put_u32_le(line_offsets[0]);
		buffer.put_u16_le(width);
		buffer.put_u16_le(height);
		if line_offsets.len() > 2 {
			for line_offset in line_offsets[1..].iter() {
				buffer.put_u32_le(*line_offset);
			}
		}
	}
}

fn write_image_data(image: &RgbaImage, image_offset: u32) -> (BytesMut, Vec<u32>) {
	let mut buffer = BytesMut::new();
	let mut line_offsets: Vec<u32> = Vec::new();
	let mut last_line_offset = image_offset;
	let mut last_buffer_size: u32 = 0;

	for y in 0..image.height() {
		line_offsets.push(last_line_offset);
		let mut transparent_run = 0;
		let mut color_run: Vec<Rgba<u8>> = Vec::new();
		for x in 0..image.width() {
			let pixel = image.get_pixel(x, y);
			if pixel[3] == 0 {
				// transparent pixel
				if !color_run.is_empty() {
					// end active color run
					write_color_run(&mut buffer, &color_run);
					color_run.clear();
				}
				transparent_run += 1;
			} else {
				// color pixel
				if transparent_run > 0 {
					// end active transparent run
					write_transparent_run(&mut buffer, transparent_run);
					transparent_run = 0;
				}
				color_run.push(*pixel);
			}
		}
		// wrap up active run
		if !color_run.is_empty() {
			write_color_run(&mut buffer, &color_run);
		} else if transparent_run > 0 {
			write_transparent_run(&mut buffer, transparent_run);
		}
		// end of line
		buffer.put_u16_le(0);
		last_line_offset += (buffer.len() as u32) - last_buffer_size;
		last_buffer_size = buffer.len() as u32;
	}
	// end of image
	buffer.put_u16_le(0);

	(buffer, line_offsets)
}

fn write_color_run(buffer: &mut BytesMut, color_run: &Vec<Rgba<u8>>) {
	let run_header = 1 | ((color_run.len() << 1) & 0xfffe);
	buffer.put_u16_le(run_header as u16);
	for pixel in color_run {
		write_pixel_data(buffer, pixel[0].into(), pixel[1].into(), pixel[2].into());
	}
}

fn write_transparent_run(buffer: &mut BytesMut, transparent_run: u16) {
	let run_header: u16 = (transparent_run << 1) & 0xfffe;
	buffer.put_u16_le(run_header);
}

fn write_pixel_data(buffer: &mut BytesMut, r: u16, g: u16, b: u16) {
	let pixel_data: u16 = ((r << 8) & 0xf800) | ((g << 3) & 0x07e0) | ((b >> 3) & 0x001f);
	buffer.put_u16_le(pixel_data);
}

pub fn encode(sprite_info: SpriteInfo) -> Result<Bytes, Box<dyn Error>> {
	// write file header to buffer
	let mut buffer = BytesMut::new();
	write_file_header(&mut buffer, sprite_info.frames.len() as u16);

	// calculate initial offset of image data (= file header + image headers)
	let mut image_offset = buffer.len() as u32;
	for frame in &sprite_info.frames {
		let image_header_size = (frame.image.height() * 4) + 4;
		image_offset += image_header_size;
	}

	// get image data
	let mut image_headers_buffer = BytesMut::new();
	let mut images_buffer = BytesMut::new();
	for frame in sprite_info.frames {
		let (image_buffer, line_offsets) = write_image_data(&frame.image, image_offset);
		write_image_header(&mut image_headers_buffer, frame.image.width() as u16, frame.image.height() as u16, line_offsets);
		image_offset += image_buffer.len() as u32;
		images_buffer.unsplit(image_buffer);
	}

	// write image data to buffer
	buffer.unsplit(image_headers_buffer);
	buffer.unsplit(images_buffer);

	Ok(buffer.freeze())
}

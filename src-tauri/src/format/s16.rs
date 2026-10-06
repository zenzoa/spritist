use std::error::Error;
use bytes::{ Bytes, BytesMut, Buf, BufMut };
use image::{ Rgba, RgbaImage };

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
	flags: u32,
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
		flags: buffer.get_u32_le(),
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

fn read_image_data(contents: &[u8], header: &ImageHeader, pixel_format: PixelFormat, zero_is_transparent: bool) -> Result<RgbaImage, Box<dyn Error>> {
	let mut image = RgbaImage::new(header.width.into(), header.height.into());
	let pixel_count = usize::from(header.width)
		.checked_mul(usize::from(header.height))
		.ok_or_else(image_error)?;
	let data_len = pixel_count.checked_mul(2).ok_or_else(image_error)?;
	let start = usize::try_from(header.offset).map_err(|_| image_error())?;
	let end = start.checked_add(data_len).ok_or_else(image_error)?;
	let data = contents.get(start..end).ok_or_else(image_error)?;
	for y in 0..header.height {
		for x in 0..header.width {
			let pixel_index = (usize::from(y) * usize::from(header.width) + usize::from(x)) * 2;
			let pixel_data = u16::from_le_bytes([data[pixel_index], data[pixel_index + 1]]);
			let color = if !zero_is_transparent && pixel_data == 0 {
				Rgba([0, 0, 0, 255])
			} else {
				parse_pixel(pixel_data, pixel_format)
			};
			image.put_pixel(x.into(), y.into(), color);
		}
	}
	Ok(image)
}

fn decode_with_transparency(contents: &[u8], zero_is_transparent: bool) -> Result<SpriteInfo, Box<dyn Error>> {
	let mut frames: Vec<Frame> = Vec::new();
	let mut buffer = Bytes::copy_from_slice(contents);
	let file_header = read_file_header(&mut buffer)?;
	let pixel_format = if file_header.flags & 0x00000001 == 1 {
		PixelFormat::Format565
	} else {
		PixelFormat::Format555
	};
	let mut image_headers: Vec<ImageHeader> = Vec::new();
	for _ in 0..file_header.image_count {
		if let Ok(image_header) = read_image_header(&mut buffer) {
			image_headers.push(image_header);
		}
	}
	for image_header in image_headers {
		let image = read_image_data(contents, &image_header, pixel_format, zero_is_transparent)?;
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

pub fn decode(contents: &[u8]) -> Result<SpriteInfo, Box<dyn Error>> {
	decode_with_transparency(contents, true)
}

pub fn decode_background(contents: &[u8]) -> Result<SpriteInfo, Box<dyn Error>> {
	decode_with_transparency(contents, false)
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
				let encoded_pixel = encode_pixel(pixel, pixel_format);
				if encoded_pixel == 0 {
					// if solid black, save as dark grey
					buffer.put_u16_le(match pixel_format {
						PixelFormat::Format555 => 0x0421,
						PixelFormat::Format565 => 0x0821
					});
				} else {
					buffer.put_u16_le(encoded_pixel);
				}
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

#[cfg(test)]
mod tests {
	use super::{ decode, decode_background };

	#[test]
	fn rejects_truncated_image_data() {
		let contents = [
			1, 0, 0, 0, // 565 pixel format
			1, 0, // one image
			14, 0, 0, 0, // image data offset
			1, 0, // width
			1, 0, // height
		];
		assert!(decode(&contents).is_err());
	}

	#[test]
	fn background_keeps_zero_pixels_opaque_black() {
		let contents = [
			1, 0, 0, 0, // 565 pixel format
			1, 0, // one image
			14, 0, 0, 0, // image data offset
			1, 0, // width
			1, 0, // height
			0, 0, // black pixel
		];
		assert_eq!(decode(&contents).unwrap().frames[0].image.get_pixel(0, 0)[3], 0);
		assert_eq!(decode_background(&contents).unwrap().frames[0].image.get_pixel(0, 0), &[0, 0, 0, 255].into());
	}
}

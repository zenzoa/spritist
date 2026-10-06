use std::io::Cursor;

use bytes::Bytes;
use image::{ImageFormat, ImageReader};

use crate::file::{Frame, SpriteInfo};

use super::{file_header_error, image_error, image_header_error, PixelFormat};

const S32_FLAG: u32 = 0x04;
const MAX_DIMENSION: u32 = 16_384;
const PNG_SIGNATURE: &[u8; 8] = b"\x89PNG\r\n\x1a\n";

pub fn encode(sprite_info: SpriteInfo) -> Result<Bytes, Box<dyn std::error::Error>> {
	if sprite_info.frames.is_empty() {
		return Err("S32 file contains no images".into());
	}
	if sprite_info.frames.len() > u16::MAX.into() {
		return Err("S32 file contains too many images".into());
	}

	let mut pngs = Vec::with_capacity(sprite_info.frames.len());
	for frame in sprite_info.frames {
		let (width, height) = frame.image.dimensions();
		if width == 0 || height == 0 || width > MAX_DIMENSION || height > MAX_DIMENSION {
			return Err("Invalid S32 image dimensions".into());
		}

		let mut output = Cursor::new(Vec::new());
		image::DynamicImage::ImageRgba8(frame.image).write_to(&mut output, ImageFormat::Png)?;
		pngs.push((width, height, output.into_inner()));
	}

	let header_size = 6usize + pngs.len() * 8;
	let mut contents = Vec::new();
	contents.extend_from_slice(&S32_FLAG.to_le_bytes());
	contents.extend_from_slice(&(pngs.len() as u16).to_le_bytes());

	let mut offset = header_size;
	for (width, height, png) in &pngs {
		let offset_u32 = u32::try_from(offset).map_err(|_| "S32 file is too large")?;
		contents.extend_from_slice(&offset_u32.to_le_bytes());
		contents.extend_from_slice(&(*width as u16).to_le_bytes());
		contents.extend_from_slice(&(*height as u16).to_le_bytes());
		offset = offset.checked_add(png.len()).ok_or("S32 file is too large")?;
	}

	for (_, _, png) in pngs {
		contents.extend_from_slice(&png);
	}

	Ok(Bytes::from(contents))
}

pub fn decode(contents: &[u8]) -> Result<SpriteInfo, Box<dyn std::error::Error>> {
	if contents.len() < 6 {
		return Err(file_header_error().into());
	}

	let flags = u32::from_le_bytes(contents[0..4].try_into().unwrap());
	if flags & S32_FLAG == 0 {
		return Err("Invalid S32 flags: the PNG flag is not set".into());
	}

	let image_count = u16::from_le_bytes(contents[4..6].try_into().unwrap()) as usize;
	if image_count == 0 {
		return Err("S32 file contains no images".into());
	}

	let headers_size = 6usize
		.checked_add(image_count.checked_mul(8).ok_or_else(image_header_error)?)
		.ok_or_else(image_header_error)?;
	if headers_size > contents.len() {
		return Err(image_header_error().into());
	}

	let mut offsets = Vec::with_capacity(image_count);
	for index in 0..image_count {
		let start = 6 + index * 8;
		let offset = u32::from_le_bytes(contents[start..start + 4].try_into().unwrap()) as usize;
		offsets.push(offset);
	}

	let mut frames = Vec::with_capacity(image_count);
	for (index, &offset) in offsets.iter().enumerate() {
		let end = offsets.get(index + 1).copied().unwrap_or(contents.len());
		if offset < headers_size || offset >= end || end > contents.len() {
			return Err(image_header_error().into());
		}

		let png = &contents[offset..end];
		if !png.starts_with(PNG_SIGNATURE) {
			return Err(image_error().into());
		}

		let image = ImageReader::with_format(Cursor::new(png), ImageFormat::Png)
			.decode()?
			.to_rgba8();
		let (width, height) = image.dimensions();
		if width == 0 || height == 0 || width > MAX_DIMENSION || height > MAX_DIMENSION {
			return Err("Invalid S32 image dimensions".into());
		}

		frames.push(Frame {
			image,
			color_indexes: Vec::new(),
		});
	}

	Ok(SpriteInfo {
		frames,
		pixel_format: PixelFormat::Format565,
		cols: 0,
		rows: 0,
		read_only: false,
	})
}

#[cfg(test)]
mod tests {
	use super::*;

	fn png(width: u32, height: u32, pixels: &[u8]) -> Vec<u8> {
		let mut bytes = Vec::new();
		{
			let mut encoder = png::Encoder::new(&mut bytes, width, height);
			encoder.set_color(png::ColorType::Rgba);
			encoder.set_depth(png::BitDepth::Eight);
			let mut writer = encoder.write_header().unwrap();
			writer.write_image_data(pixels).unwrap();
		}
		bytes
	}

	#[test]
	fn decodes_s32_png_frames() {
		let first = png(1, 1, &[255, 0, 0, 255]);
		let second = png(2, 1, &[0, 255, 0, 255, 0, 0, 255, 255]);
		let first_offset = 6 + 16;
		let second_offset = first_offset + first.len();
		let mut contents = Vec::new();
		contents.extend_from_slice(&S32_FLAG.to_le_bytes());
		contents.extend_from_slice(&2u16.to_le_bytes());
		contents.extend_from_slice(&(first_offset as u32).to_le_bytes());
		contents.extend_from_slice(&1u16.to_le_bytes());
		contents.extend_from_slice(&1u16.to_le_bytes());
		contents.extend_from_slice(&(second_offset as u32).to_le_bytes());
		contents.extend_from_slice(&2u16.to_le_bytes());
		contents.extend_from_slice(&1u16.to_le_bytes());
		contents.extend_from_slice(&first);
		contents.extend_from_slice(&second);

		let decoded = decode(&contents).unwrap();
		assert_eq!(decoded.frames.len(), 2);
		assert_eq!(decoded.frames[0].image.dimensions(), (1, 1));
		assert_eq!(decoded.frames[1].image.dimensions(), (2, 1));
		assert!(!decoded.read_only);

		let encoded = encode(decoded).unwrap();
		let round_trip = decode(&encoded).unwrap();
		assert_eq!(round_trip.frames.len(), 2);
		assert_eq!(round_trip.frames[0].image.dimensions(), (1, 1));
		assert_eq!(round_trip.frames[1].image.dimensions(), (2, 1));
	}
}

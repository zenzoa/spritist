use std::io::Cursor;

use bytes::Bytes;
use image::{ImageFormat, ImageReader};

use crate::file::{Frame, SpriteInfo};

use super::{file_header_error, image_error, image_header_error, PixelFormat};

const BLK32_FLAG: u32 = 0x04;
const BLOCK_SIZE: u16 = 128;
const PNG_SIGNATURE: &[u8; 8] = b"\x89PNG\r\n\x1a\n";

pub fn decode(contents: &[u8]) -> Result<SpriteInfo, Box<dyn std::error::Error>> {
	if contents.len() < 10 {
		return Err(file_header_error().into());
	}

	let flags = u32::from_le_bytes(contents[0..4].try_into().unwrap());
	if flags & BLK32_FLAG == 0 {
		return Err("Invalid BLK32 flags: the 32-bit PNG flag is not set".into());
	}

	let cols = u16::from_le_bytes(contents[4..6].try_into().unwrap());
	let rows = u16::from_le_bytes(contents[6..8].try_into().unwrap());
	let image_count = u16::from_le_bytes(contents[8..10].try_into().unwrap()) as usize;
	let expected_count = usize::from(cols)
		.checked_mul(usize::from(rows))
		.ok_or_else(file_header_error)?;
	if image_count == 0 || image_count != expected_count {
		return Err("Invalid BLK32 block count".into());
	}

	let headers_size = 10usize
		.checked_add(image_count.checked_mul(8).ok_or_else(image_header_error)?)
		.ok_or_else(image_header_error)?;
	if headers_size > contents.len() {
		return Err(image_header_error().into());
	}

	let mut offsets = Vec::with_capacity(image_count);
	let mut dimensions = Vec::with_capacity(image_count);
	for index in 0..image_count {
		let start = 10 + index * 8;
		let offset = u32::from_le_bytes(contents[start..start + 4].try_into().unwrap()) as usize;
		let width = u16::from_le_bytes(contents[start + 4..start + 6].try_into().unwrap());
		let height = u16::from_le_bytes(contents[start + 6..start + 8].try_into().unwrap());
		if width != BLOCK_SIZE || height != BLOCK_SIZE {
			return Err("Invalid data. All frames in a BLK32 file must be 128 x 128 px.".into());
		}
		offsets.push(offset);
		dimensions.push((width, height));
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
		if image.dimensions() != (u32::from(dimensions[index].0), u32::from(dimensions[index].1)) {
			return Err("BLK32 PNG dimensions do not match the image header".into());
		}
		frames.push(Frame { image, color_indexes: Vec::new() });
	}

	Ok(SpriteInfo {
		frames,
		pixel_format: PixelFormat::Format565,
		cols,
		rows,
		read_only: false,
	})
}

pub fn encode(sprite_info: SpriteInfo) -> Result<Bytes, Box<dyn std::error::Error>> {
	let expected_count = usize::from(sprite_info.cols)
		.checked_mul(usize::from(sprite_info.rows))
		.ok_or("BLK32 background dimensions are too large")?;
	if expected_count == 0 || sprite_info.frames.len() != expected_count {
		return Err("Incorrect number of frames for a BLK32 file. Must equal COLUMNS x ROWS.".into());
	}

	let mut pngs = Vec::with_capacity(sprite_info.frames.len());
	for frame in sprite_info.frames {
		if frame.image.dimensions() != (u32::from(BLOCK_SIZE), u32::from(BLOCK_SIZE)) {
			return Err("All frames in a BLK32 file must be 128 x 128 px.".into());
		}
		let mut output = Cursor::new(Vec::new());
		image::DynamicImage::ImageRgba8(frame.image).write_to(&mut output, ImageFormat::Png)?;
		pngs.push(output.into_inner());
	}

	let headers_size = 10usize + pngs.len() * 8;
	let mut contents = Vec::with_capacity(headers_size + pngs.iter().map(Vec::len).sum::<usize>());
	contents.extend_from_slice(&BLK32_FLAG.to_le_bytes());
	contents.extend_from_slice(&sprite_info.cols.to_le_bytes());
	contents.extend_from_slice(&sprite_info.rows.to_le_bytes());
	contents.extend_from_slice(&(pngs.len() as u16).to_le_bytes());

	let mut offset = headers_size;
	for png in &pngs {
		contents.extend_from_slice(&(u32::try_from(offset).map_err(|_| "BLK32 file is too large")?).to_le_bytes());
		contents.extend_from_slice(&BLOCK_SIZE.to_le_bytes());
		contents.extend_from_slice(&BLOCK_SIZE.to_le_bytes());
		offset = offset.checked_add(png.len()).ok_or("BLK32 file is too large")?;
	}
	for png in pngs {
		contents.extend_from_slice(&png);
	}

	Ok(Bytes::from(contents))
}

#[cfg(test)]
mod tests {
	use super::*;

	fn block(color: [u8; 4]) -> Frame {
		Frame {
			image: image::RgbaImage::from_pixel(128, 128, image::Rgba(color)),
			color_indexes: Vec::new(),
		}
	}

	#[test]
	fn round_trips_background_blocks() {
		let decoded = decode(&encode(SpriteInfo {
			frames: vec![block([255, 0, 0, 255]), block([0, 255, 0, 255])],
			pixel_format: PixelFormat::Format565,
			cols: 2,
			rows: 1,
			read_only: false,
		}).unwrap()).unwrap();
		assert_eq!(decoded.frames.len(), 2);
		assert_eq!((decoded.cols, decoded.rows), (2, 1));
		assert_eq!(decoded.frames[0].image.get_pixel(0, 0).0, [255, 0, 0, 255]);
		assert_eq!(decoded.frames[1].image.get_pixel(0, 0).0, [0, 255, 0, 255]);
	}
}

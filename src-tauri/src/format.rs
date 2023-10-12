use std::error::Error;
use image::Rgba;

pub mod spr;
pub mod s16;
pub mod m16;
pub mod c16;
pub mod blk;
pub mod dta;
pub mod photo_album;

pub fn file_header_error() -> Box<dyn Error> {
	"Invalid data. File ends in the middle of file header.".into()
}

pub fn image_header_error() -> Box<dyn Error> {
	"Invalid data. File ends in the middle of an image header".into()
}

pub fn image_error() -> Box<dyn Error> {
	"Invalid data. File ends in the middle of an image".into()
}

pub fn parse_pixel_555(pixel: u16) -> Rgba<u8> {
	let r = ((pixel & 0x7c00) >> 7) as u8;
	let g = ((pixel & 0x03e0) >> 2) as u8;
	let b = ((pixel & 0x001f) << 3) as u8;
	Rgba([r, g, b, 255])
}

pub fn parse_pixel_565(pixel: u16) -> Rgba<u8> {
	let r = ((pixel & 0xf800) >> 8) as u8;
	let g = ((pixel & 0x07e0) >> 3) as u8;
	let b = ((pixel & 0x001f) << 3) as u8;
	Rgba([r, g, b, 255])
}

pub fn parse_pixel_565_be(pixel: u16) -> Rgba<u8> {
	let r = ((pixel & 0xf800) >> 8) as u8;
	let g = ((pixel & 0x07c0) >> 3) as u8;
	let b = ((pixel & 0x003e) << 2) as u8;
	Rgba([r, g, b, 255])
}

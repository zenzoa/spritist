use std::error::Error;
use image::{ GenericImage, Rgba, RgbaImage };

pub mod png;
pub mod bmp;
pub mod spr;
pub mod s16;
pub mod m16;
pub mod c16;
pub mod blk;
pub mod dta;
pub mod photo_album;

#[derive(Debug, Copy, Clone, PartialEq)]
pub enum PixelFormat {
	Format555,
	Format565
}

pub fn file_header_error() -> Box<dyn Error> {
	"Invalid data. File ends in the middle of file header.".into()
}

pub fn image_header_error() -> Box<dyn Error> {
	"Invalid data. File ends in the middle of an image header".into()
}

pub fn image_error() -> Box<dyn Error> {
	"Invalid data. File ends in the middle of an image".into()
}

pub fn parse_pixel(pixel: u16, pixel_format: PixelFormat) -> Rgba<u8> {
	match pixel_format {
		PixelFormat::Format555 => parse_pixel_555(pixel),
		PixelFormat::Format565 => parse_pixel_565(pixel)
	}
}

fn parse_pixel_555(pixel: u16) -> Rgba<u8> {
	let r = (pixel >> 7) as u8;
	let g = (pixel >> 2) as u8;
	let b = (pixel << 3) as u8;
	let a = if r == 0 && g == 0 && b == 0 { 0 } else { 255 };
	Rgba([r, g, b, a])
}

fn parse_pixel_565(pixel: u16) -> Rgba<u8> {
	let r = (pixel >> 8) as u8;
	let g = (pixel >> 3) as u8;
	let b = (pixel << 3) as u8;
	let a = if r == 0 && g == 0 && b == 0 { 0 } else { 255 };
	Rgba([r, g, b, a])
}

pub fn parse_pixel_565_be(pixel: u16) -> Rgba<u8> {
	let r = (pixel >> 8) as u8;
	let g = (pixel >> 3) as u8;
	let b = (pixel << 2) as u8;
	let a = if r == 0 && g == 0 && b == 0 { 0 } else { 255 };
	Rgba([r, g, b, a])
}

pub fn encode_pixel(pixel: &Rgba<u8>, pixel_format: PixelFormat) -> u16 {
	match pixel_format {
		PixelFormat::Format555 => encode_pixel_555(pixel),
		PixelFormat::Format565 => encode_pixel_565(pixel)
	}
}

fn encode_pixel_555(pixel: &Rgba<u8>) -> u16 {
	let r = ((pixel[0] as u16) & 0xf8) << 7;
	let g = ((pixel[1] as u16) & 0xf8) << 2;
	let b = ((pixel[2] as u16) & 0xf8) >> 3;
	r | g | b
}

fn encode_pixel_565(pixel: &Rgba<u8>) -> u16 {
	let r = ((pixel[0] as u16) & 0xf8) << 8;
	let g = ((pixel[1] as u16) & 0xfc) << 3;
	let b = ((pixel[2] as u16) & 0xf8) >> 3;
	r | g | b
}

pub fn black_to_transparent(img: RgbaImage) -> RgbaImage {
	let mut img2 = RgbaImage::new(img.width(), img.height());
	let _ = img2.copy_from(&img, 0, 0);
	for pixel in img2.pixels_mut() {
		if pixel[0] == 0 && pixel[1] == 0 && pixel[2] == 0 {
			pixel[3] = 0;
		}
	}
	img2
}

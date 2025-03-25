use std::error::Error;
use std::path::PathBuf;

use image::RgbaImage;
use bmp::Image as BmpImage;
use bmp::Pixel as BmpPixel;

pub fn encode(img: &RgbaImage, file_path: PathBuf) -> Result<(), Box<dyn Error>> {
	let mut bmp_image = BmpImage::new(img.width(), img.height());
	for (x, y) in bmp_image.coordinates() {
		let rgba_pixel = img.get_pixel(x, y);
		let bmp_pixel = BmpPixel { r: rgba_pixel[0], g: rgba_pixel[1], b: rgba_pixel[2] };
		bmp_image.set_pixel(x, y, bmp_pixel);
	}
	bmp_image.save(&file_path)?;
	Ok(())
}

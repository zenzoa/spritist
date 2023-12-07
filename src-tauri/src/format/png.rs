use std::{
	fs::File,
	io::BufWriter,
	error::Error,
	path::PathBuf
};
use image::RgbaImage;
use png::{ Encoder, ColorType, BitDepth, Compression };

pub fn encode(img: &RgbaImage, file_path: PathBuf) -> Result<(), Box<dyn Error>> {
	let file = File::create(file_path)?;
	let file_buffer = &mut BufWriter::new(file);
	let mut encoder = Encoder::new(file_buffer, img.width(), img.height());
	encoder.set_color(ColorType::Rgba);
	encoder.set_depth(BitDepth::Eight);
	encoder.set_compression(Compression::Best);
	let mut writer = encoder.write_header()?;
	writer.write_image_data(img.as_raw())?;
	Ok(())
}

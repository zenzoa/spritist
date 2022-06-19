class DataHelper {
	constructor(buffer) {
		this.dataView = new DataView(buffer)
		this.offset = 0
		this.littleEndian = true
	}

	readUint8() {
		let result = this.dataView.getUint8(this.offset, this.littleEndian)
		this.offset += 1
		return result
	}

	readUint16() {
		let result = this.dataView.getUint16(this.offset, this.littleEndian)
		this.offset += 2
		return result
	}

	readUint32() {
		let result = this.dataView.getUint32(this.offset, this.littleEndian)
		this.offset += 4
		return result
	}

	writeUint8(n) {
		this.dataView.setUint8(this.offset, n, this.littleEndian)
		this.offset += 1
	}

	writeUint16(n) {
		this.dataView.setUint16(this.offset, n, this.littleEndian)
		this.offset += 2
	}

	writeUint32(n) {
		this.dataView.setUint32(this.offset, n, this.littleEndian)
		this.offset += 4
	}

	static parsePixel(pixel, pixelFormatIs555, bigEndian) {
		let r, g, b
		if (bigEndian) {
			// n16 + m16 format
			r = (pixel & 0xf800) >> 8
			g = (pixel & 0x07c0) >> 3
			b = (pixel & 0x003e) << 2
		} else if (pixelFormatIs555) {
			// 555 format
			r = (pixel & 0x7c00) >> 7
			g = (pixel & 0x03e0) >> 2
			b = (pixel & 0x001f) << 3
		} else {
			// 565 format
			r = (pixel & 0xf800) >> 8
			g = (pixel & 0x07e0) >> 3
			b = (pixel & 0x001f) << 3
		}
		return { r, g, b, a: 255 }
	}
	
	static encodePixel(pixel, pixelFormatIs555) {
		let { r, g, b } = pixel
		if (pixelFormatIs555) {
			return ((r << 7) & 0x7c00) | ((g << 2) & 0x03e0) | ((b >> 3) & 0x001f)
		} else {
			return ((r << 8) & 0xf800) | ((g << 3) & 0x07e0) | ((b >> 3) & 0x001f)
		}
	}
	
	static setPixel(image, x, y, pixel) {
		let i = (y * image.width + x) * 4
		image.pixels[i] = pixel.r
		image.pixels[i + 1] = pixel.g
		image.pixels[i + 2] = pixel.b
		image.pixels[i + 3] = pixel.a
	}
}

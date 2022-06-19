// https://creatures.wiki/S16_files

let s16 = {}

s16.load = (filePath, onSuccess) => {
	window.api.readFile(filePath).then(data => {
		onSuccess(s16.parse(data))
	}).catch(error => {
		window.api.showErrorDialog('Unable to open S16 file.')
		console.log(error)
	})
}

s16.save = (filePath, sprite) => {
	let data = s16.encode(sprite)
	window.api.writeFile(filePath, data).catch(error => {
		window.api.showErrorDialog('Unable to save S16 file. File not accessible.')
		console.log(error)
	})
}

s16.parse = data => {
	let sprite = new Sprite()
	let dataHelper = new DataHelper(data.buffer)

	// file header
	let pixelFormat = dataHelper.readUint32() // 0 = 555, 1 = 565, 0x1000000 = big-endian 555
	if (pixelFormat > 1) {
		pixelFormat = 0
		dataHelper.littleEndian = false
	}
	let imageCount = dataHelper.readUint16()

	// image headers
	let imageHeaders = []
	for (let i = 0; i < imageCount; i++) {
		let offset = dataHelper.readUint32()
		let width = dataHelper.readUint16()
		let height = dataHelper.readUint16()
		imageHeaders.push({ offset, width, height })
	}

	// image data
	imageHeaders.forEach(imageHeader => {
		let image = window.p.createImage(imageHeader.width, imageHeader.height)
		image.loadPixels()

		offset = imageHeader.offset
		for (let y = 0; y < imageHeader.height; y++) {
			for (let x = 0; x < imageHeader.width; x++) {
				let pixelData = dataHelper.readUint16()
				pixel = DataHelper.parsePixel(pixelData, pixelFormat === 0, !dataHelper.littleEndian)
				if (pixel.r === 0 && pixel.g === 0 && pixel.b === 0) {
					pixel.a = 0 // black pixels become transparent
				}
				DataHelper.setPixel(image, x, y, pixel)
			}
		}

		image.updatePixels()
		sprite.addFrame(image)
	})

	return sprite
}

s16.encode = (sprite) => {
	// get image data
	let images = []
	let totalImageSize = 6 + sprite.frames.length * 8

	sprite.frames.forEach(frame => {
		frame.loadPixels()
		let imageData = []
		let offset = totalImageSize

		for (let y = 0; y < frame.height; y++) {
			for (let x = 0; x < frame.width; x++) {
				let i = (y * frame.width + x) * 4
				let pixel = {
					r: frame.pixels[i],
					g: frame.pixels[i + 1],
					b: frame.pixels[i + 2],
					a: frame.pixels[i + 3]
				}
				let pixelData = DataHelper.encodePixel(pixel)
				imageData.push(pixelData)
			}
		}

		images.push({ imageData, offset, width: frame.width, height: frame.height })
		totalImageSize += (imageData.length * 2)
	})

	let buffer = new ArrayBuffer(totalImageSize)
	let dataHelper = new DataHelper(buffer)

	// write file header
	dataHelper.writeUint32(1)
	dataHelper.writeUint16(images.length)

	// write image headers
	images.forEach(image => {
		dataHelper.writeUint32(image.offset)
		dataHelper.writeUint16(image.width)
		dataHelper.writeUint16(image.height)
	})

	// write image data
	images.forEach(image => {
		image.imageData.forEach(b => {
			dataHelper.writeUint16(b)
		})
	})

	return dataHelper.dataView
}

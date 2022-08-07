// https://creatures.wiki/SPR_files

let spr = {}

spr.load = (filePath, onSuccess) => {
	window.api.readFile(filePath).then(data => {

		let sprite =
			spr.tryParse(data, spr.parse) ||
			spr.tryParse(data, spr.parsePrototype) ||
			spr.tryParse(data, spr.parseSingleWidth) ||
			spr.tryParse(data, spr.parseDoubleWidth) ||
			spr.tryParse(data, spr.parseMultiSprite)

		onSuccess(sprite)

	}).catch(error => {
		window.api.showErrorDialog('Unable to open SPR file.')
		console.log(error)
	})
}

spr.save = (filePath, sprite) => {
	let data = spr.encode(sprite)
	window.api.writeFile(filePath, data).catch(error => {
		window.api.showErrorDialog('Unable to save SPR file. File not accessible.')
		console.log(error)
	})
}

spr.tryParse = (data, callback) => {
	let sprite = new Sprite()
	let dataHelper = new DataHelper(data.buffer)
	try {
		callback(sprite, dataHelper)
		return sprite
	} catch(e) {
		console.log(e)
		return null
	}
}

spr.parse = (sprite, dataHelper, isPrototype) => {
	// file header
	let imageCount = dataHelper.readUint16()

	// image headers
	let imageHeaders = []
	for (let i = 0; i < imageCount; i++) {
		let offset = isPrototype ? dataHelper.readUint16() : dataHelper.readUint32()
		let width = isPrototype ? dataHelper.readUint8() : dataHelper.readUint16()
		let height = isPrototype ? dataHelper.readUint8() : dataHelper.readUint16()
		imageHeaders.push({ offset, width, height })
	}

	// image data
	imageHeaders.forEach(imageHeader => {
		let image = window.p.createImage(imageHeader.width, imageHeader.height)
		image.loadPixels()

		dataHelper.offset = imageHeader.offset
		for (let y = 0; y < imageHeader.height; y++) {
			for (let x = 0; x < imageHeader.width; x++) {
				let colorIndex = dataHelper.readUint8()
				let pixel = palette.lookup(colorIndex)
				DataHelper.setPixel(image, x, y, pixel)
			}
		}

		image.updatePixels()
		sprite.addFrame(image)
	})

	return sprite
}

spr.parsePrototype = (sprite, dataHelper) => {
	return spr.parse(sprite, dataHelper, true)
}

spr.parseSingleWidth = (sprite, dataHelper) => {
	// file header
	let imageCount = dataHelper.readUint16()
	dataHelper.readUint32() // skip

	// image data
	for (let i = 0; i < imageCount; i++) {
		let width = dataHelper.readUint16()
		let height = dataHelper.readUint16()
		
		let image = window.p.createImage(width, height)
		image.loadPixels()

		for (let y = height - 1; y >= 0; y--) {
			for (let x = 0; x < width; x++) {
				let colorIndex = dataHelper.readUint8()
				let pixel = palette.lookup(colorIndex)
				DataHelper.setPixel(image, x, y, pixel)
			}
		}

		image.updatePixels()
		sprite.addFrame(image)
	}

	return sprite
}

spr.parseDoubleWidth = (sprite, dataHelper) => {
	if (dataHelper.offset >= dataHelper.dataView.buffer.byteLength) {
		return sprite
	}

	// file header
	let imageCount = dataHelper.readUint16()
	dataHelper.readUint32() // skip

	// image data
	for (let i = 0; i < imageCount; i++) {
		let paddedWidth = dataHelper.readUint32()
		let height = dataHelper.readUint32()
		let width = dataHelper.readUint16()
		
		let image = window.p.createImage(width, height)
		image.loadPixels()

		for (let y = height - 1; y >= 0; y--) {
			for (let x = 0; x < paddedWidth; x++) {
				let colorIndex = dataHelper.readUint8()
				if (x < width) {
					let pixel = palette.lookup(colorIndex)
					DataHelper.setPixel(image, x, y, pixel)
				}
			}
		}

		image.updatePixels()
		sprite.addFrame(image)
	}

	return sprite
}

spr.parseMultiSprite = (sprite, dataHelper) => {
	// file header
	let spriteCount = dataHelper.readUint16()
	dataHelper.readUint32() // skip

	// sprite data
	for (let i = 0; i < spriteCount; i++) {
		let subSprite = spr.parseDoubleWidth(new Sprite(), dataHelper)
		sprite.frames = sprite.frames.concat(subSprite.frames)
	}

	sprite.setMaxFrameSize()
	return sprite
}

spr.encode = (sprite) => {
	// get image data
	let images = []
	let totalImageSize = 2 + sprite.frames.length * 8

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
				if (pixel.a === 0) {
					imageData.push(0)
				} else {
					let colorIndex = palette.findColor(pixel)
					if (colorIndex > 0) {
						imageData.push(colorIndex)
					} else {
						imageData.push(0)
					}
				}
			}
		}

		images.push({ imageData, offset, width: frame.width, height: frame.height })
		totalImageSize += imageData.length
	})

	let buffer = new ArrayBuffer(totalImageSize)
	let dataHelper = new DataHelper(buffer)

	// write file header
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
			dataHelper.writeUint8(b)
		})
	})

	return dataHelper.dataView
}

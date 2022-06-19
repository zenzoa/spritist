// https://creatures.wiki/SPR_files

let spr = {}

spr.load = (filePath, onSuccess) => {
	window.api.readFile(filePath).then(data => {
		try {
			onSuccess(spr.parse(data))
		} catch (e) {
			onSuccess(spr.parse(data, true))
		}
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

spr.parse = (data, isLegacy) => {
	let sprite = new Sprite()
	let dataHelper = new DataHelper(data.buffer)

	// file header
	let imageCount = dataHelper.readUint16()

	// image headers
	let imageHeaders = []
	for (let i = 0; i < imageCount; i++) {
		let offset = isLegacy ? dataHelper.readUint16() : dataHelper.readUint32()
		let width = isLegacy ? dataHelper.readUint8() : dataHelper.readUint16()
		let height = isLegacy ? dataHelper.readUint8() : dataHelper.readUint16()
		imageHeaders.push({ offset, width, height })
	}

	// image data
	imageHeaders.forEach(imageHeader => {
		let image = window.p.createImage(imageHeader.width, imageHeader.height)
		image.loadPixels()

		offset = imageHeader.offset
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

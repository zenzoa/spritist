// https://creatures.wiki/C16_files
// https://creatures.wiki/555/565

let c16 = {}

c16.load = (filePath, onSuccess) => {
	window.api.readFile(filePath).then(data => {
		onSuccess(c16.parse(data))
	}).catch(error => {
		window.api.showErrorDialog('Unable to open C16 file.')
		console.log(error)
	})
}

c16.save = (filePath, sprite) => {
	let data = c16.encode(sprite)
	window.api.writeFile(filePath, data).catch(error => {
		window.api.showErrorDialog('Unable to save C16 file. File not accessible.')
		console.log(error)
	})
}

c16.parse = data => {
	let sprite = new Sprite()
	let dataHelper = new DataHelper(data.buffer)

	// file header
	let pixelFormat = dataHelper.readUint32() // 2 = 555, 3 = 565, 0x3000000 = big-endian 555
	if (pixelFormat > 3) {
		pixelFormat = 2
		dataHelper.littleEndian = false
	}
	let imageCount = dataHelper.readUint16()

	// image headers
	let imageHeaders = []
	for (let i = 0; i < imageCount; i++) {
		let lineOffsets = [ dataHelper.readUint32() ]
		let width = dataHelper.readUint16()
		let height = dataHelper.readUint16()
		for (let j = 0; j < height - 1; j++) {
			lineOffsets.push( dataHelper.readUint32() )
		}
		imageHeaders.push({ width, height, lineOffsets })
	}

	// image data
	imageHeaders.forEach(imageHeader => {
		let image = window.p.createImage(imageHeader.width, imageHeader.height)
		image.loadPixels()

		imageHeader.lineOffsets.forEach((lineOffset, y) => {
			offset = lineOffset
			let x = 0
			while (x < imageHeader.width) {
				let runHeader = dataHelper.readUint16()
				let runType = runHeader & 0x1 // 0 = Transparent, 1 = Color
				let runLength = (runHeader & 0xfffe) >> 1
				for (let k = 0; k < runLength; k++) {
					let pixel = { r:0, g:0, b:0, a:0 }
					if (runType !== 0) {
						let pixelData = dataHelper.readUint16()
						pixel = DataHelper.parsePixel(pixelData, pixelFormat === 2)
					}
					DataHelper.setPixel(image, x, y, pixel)
					x++
				}
			}
		})

		image.updatePixels()
		sprite.addFrame(image)
	})

	return sprite
}

c16.encode = (sprite) => {
	// get image data
	let images = []
	let totalImageSize = 6

	sprite.frames.forEach(frame => {
		totalImageSize += (frame.height * 4) + 4
	})

	sprite.frames.forEach(frame => {
		frame.loadPixels()
		let imageData = []
		let lineOffsets = []

		for (let y = 0; y < frame.height; y++) {
			lineOffsets.push(totalImageSize + (imageData.length * 2))

			let transparentPixels = 0
			let colorPixels = []

			let addTransparentRun = () => {
				let runHeader = (0 & 0x1) | ((transparentPixels << 1) & 0xfffe)
				imageData.push(runHeader)
				transparentPixels = 0
			}

			let addColorRun = () => {
				let runHeader = (1 & 0x1) | ((colorPixels.length << 1) & 0xfffe)
				imageData.push(runHeader)
				imageData = imageData.concat(colorPixels)
				colorPixels = []
			}

			for (let x = 0; x < frame.width; x++) {
				let i = (y * frame.width + x) * 4
				let pixel = {
					r: frame.pixels[i],
					g: frame.pixels[i + 1],
					b: frame.pixels[i + 2],
					a: frame.pixels[i + 3]
				}
				if (pixel.a === 0) {
					if (colorPixels.length > 0) {
						addColorRun()
					}
					transparentPixels += 1
				} else {
					if (transparentPixels > 0) {
						addTransparentRun()
					}
					let pixelData = DataHelper.encodePixel(pixel)
					colorPixels.push(pixelData)
				}
			}

			// end line
			if (colorPixels.length > 0) {
				addColorRun()
			} else if (transparentPixels > 0) {
				addTransparentRun()
			}
			imageData.push(0)
		}

		// end image
		imageData.push(0)

		images.push({ imageData, lineOffsets, width: frame.width, height: frame.height })
		totalImageSize += (imageData.length * 2)
	})

	let buffer = new ArrayBuffer(totalImageSize)
	let dataHelper = new DataHelper(buffer)

	// write file header
	dataHelper.writeUint32(3)
	dataHelper.writeUint16(images.length)

	// write image headers
	images.forEach(image => {
		dataHelper.writeUint32(image.lineOffsets[0])
		dataHelper.writeUint16(image.width)
		dataHelper.writeUint16(image.height)
		image.lineOffsets.forEach((lineOffset, i) => {
			if (i > 0) {
				dataHelper.writeUint32(lineOffset)
			}
		})
	})

	// write image data
	images.forEach(image => {
		image.imageData.forEach(b => {
			dataHelper.writeUint16(b)
		})
	})

	return dataHelper.dataView
}

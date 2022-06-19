// https://creatures.wiki/BLK_files

let blk = {}

blk.load = (filePath, onSuccess) => {
	window.api.readFile(filePath).then(data => {
		onSuccess(blk.parse(data))
	}).catch(error => {
		window.api.showErrorDialog('Unable to open BLK file.')
		console.log(error)
	})
}

blk.save = (filePath, sprite) => {
	let data = blk.encode(sprite)
	if (data) {
		window.api.writeFile(filePath, data).catch(error => {
			window.api.showErrorDialog('Unable to save BLK file. File not accessible.')
			console.log(error)
		})
	}
}

blk.parse = data => {
	let sprite = new Sprite()
	let dataHelper = new DataHelper(data.buffer)

	// file header
	let pixelFormat = dataHelper.readUint32() // 0 = 555, 1 = 565, 0x1000000 = big-endian 555
	if (pixelFormat > 1) {
		pixelFormat = 0
		littleEndian = false
	}
	sprite.bgWidth = dataHelper.readUint16()
	sprite.bgHeight = dataHelper.readUint16()
	let imageCount = dataHelper.readUint16()

	// image headers
	let imageHeaders = []
	for (let i = 0; i < imageCount; i++) {
		let offset = dataHelper.readUint32() + 4
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
				pixel = DataHelper.parsePixel(pixelData, pixelFormat === 0)
				DataHelper.setPixel(image, x, y, pixel)
			}
		}

		image.updatePixels()
		sprite.addFrame(image)
	})

	return sprite
}

blk.encode = (sprite) => {
	let frames = sprite.frames.slice()
	let bgWidth = sprite.bgWidth
	let bgHeight = sprite.bgHeight

	// break larger image into blocks
	if (frames.length === 1 && frames[0].width > 128 && frames[0].height > 128) {
		let image = frames[0]
		image.loadPixels()
		bgWidth = Math.ceil(image.width / 128)
		bgHeight = Math.ceil(image.height / 128)
		frames = Array(bgWidth * bgHeight).fill(0).map(() => {
			let frame = window.p.createImage(128, 128)
			frame.loadPixels()
			return frame
		})

		for (let y = 0; y < image.height; y++) {
			for (let x = 0; x < image.width; x++) {
				let bx = Math.floor(x / 128)
				let by = Math.floor(y / 128)
				let sx = x - bx * 128
				let sy = y - by * 128
				let i = (y * image.width + x) * 4
				let j = (sy * 128 + sx) * 4
				frames[bx * bgHeight + by].pixels[j] = image.pixels[i]
				frames[bx * bgHeight + by].pixels[j + 1] = image.pixels[i + 1]
				frames[bx * bgHeight + by].pixels[j + 2] = image.pixels[i + 2]
				frames[bx * bgHeight + by].pixels[j + 3] = image.pixels[i + 3]
			}
		}

		frames.forEach(frame => frame.updatePixels())
	}

	if (frames.length !== bgWidth * bgHeight) {
		window.api.showErrorDialog('Unable to save BLK file. Number of frames does not match background dimensions.')
		return
	}

	// get image data
	let images = []
	let totalImageSize = 10 + frames.length * 8
	let invalidFrameSize = false

	frames.forEach(frame => {
		frame.loadPixels()
		let imageData = []
		let offset = totalImageSize - 4

		if (frame.width !== 128 || frame.height !== 128) {
			invalidFrameSize = true
		}

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

	if (invalidFrameSize) {
		window.api.showErrorDialog('Unable to save BLK file. All frames must be 128×128.')
		return
	}

	let buffer = new ArrayBuffer(totalImageSize)
	let dataHelper = new DataHelper(buffer)

	// write file header
	dataHelper.writeUint32(1)
	dataHelper.writeUint16(bgWidth)
	dataHelper.writeUint16(bgHeight)
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

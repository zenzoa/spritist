 // https://github.com/openc2e/openc2e/blob/main/src/fileformats/charsetdta.cpp

let charset = {}

charset.load = (filePath, onSuccess) => {
	window.api.readFile(filePath).then(data => {
		onSuccess(charset.parse(data))
	}).catch(error => {
		window.api.showErrorDialog('Unable to open charset file.')
		console.log(error)
	})
}

charset.parse = data => {
	let sprite = new Sprite()
	let dataHelper = new DataHelper(data.buffer)

	let size = data.buffer.byteLength
	if (size !== 4096 && size !== 9472 && size !== 17152 && size !== 18944) {
		window.api.showErrorDialog('Unable to open charset file. Invalid file size.')
		return
	}

	let charWidth = size === 17152 ? 11 : (size === 4096 ? 4 : 6)
	let charHeight = size === 4096 ? 8 : 12
	let charLength = charWidth * charHeight
	let charCount = size === 4096 ? (size / charLength) : (size / (charLength + 2))

	let frameDataList = []
	for (let i = 0; i < charCount; i++) {
		let frameData = []
		for (let j = 0; j < charLength; j++) {
			frameData.push(dataHelper.readUint8())
		}
		frameDataList.push(frameData)
	}

	for (let k = 0; k < charCount; k++) {
		let frameWidth = size === 4096 ? charWidth : dataHelper.readUint16()
		let frameData = frameDataList[k]

		let image = window.p.createImage(frameWidth, charHeight)
		image.loadPixels()
		
		for (let y = 0; y < charHeight; y++) {
			for (let x = 0; x < frameWidth; x++) {
				let colorIndex = frameData[y * charWidth + x]
				let pixel = charset.palette[colorIndex]
				if (colorIndex === 0) {
					pixel = { r: 0, g: 0, b: 0, a: 0 }
				} else {
					pixel.a = 255
				}
				DataHelper.setPixel(image, x, y, pixel)
			}
		}

		image.updatePixels()
		sprite.addFrame(image)
	}

	return sprite
}

charset.palette = [
	{ r: 0, g: 0, b: 0 },
	{ r: 255, g: 255, b: 255 },
	{ r: 128, g: 128, b: 128 }
]
for (let i = 3; i < 256; i++) {
	charset.palette.push({ r: 0, g: 0, b: 128 })
}

// https://sheeslostknowledge.blogspot.com/2014/12/extracting-information-from-creatures-1.html
// https://github.com/LoneShee/SLKExamples/blob/master/C1_Photoalbum2HTML.py

let photoalbum = {}

photoalbum.load = (filePath, onSuccess) => {
	window.api.readFile(filePath).then(data => {
		onSuccess(photoalbum.parse(data))
	}).catch(error => {
		window.api.showErrorDialog('Unable to open Photo Album file.')
		console.log(error)
	})
}

photoalbum.parse = data => {
	let sprite = new Sprite()
	let dataHelper = new DataHelper(data.buffer)

	let photoCount = dataHelper.readUint16()

	for (let i = 0; i < photoCount; i++) {
		dataHelper.readCString() // timestamp
		let width = dataHelper.readUint32()
		let height = dataHelper.readUint32()
		dataHelper.readUint32() // unused

		let image = window.p.createImage(width, height)
		image.loadPixels()

		for (let y = height - 1; y >= 0; y--) {
			for (let x = 0; x < width; x++) {
				let colorIndex = dataHelper.readUint8()
				let pixel = palette.lookup(colorIndex)
				DataHelper.setPixel(image, x, y, pixel)
			}
		}
		
		dataHelper.offset -= 2
		dataHelper.readCString() // comment

		image.updatePixels()
		sprite.addFrame(image)
	}

	return sprite
}

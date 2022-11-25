let spritesheet = {}

spritesheet.toSprite = (image, cols, rows) => {
	image.loadPixels()

	let tileWidth = Math.floor(image.width / cols)
	let tileHeight = Math.floor(image.height / rows)

	frames = Array(cols * rows).fill(0).map(() => {
		let frame = window.p.createImage(tileWidth, tileHeight)
		frame.loadPixels()
		return frame
	})

	for (let y = 0; y < image.height; y++) {
		for (let x = 0; x < image.width; x++) {
			let tileX = Math.floor(x / tileWidth)
			let tileY = Math.floor(y / tileHeight)
			let relX = x - (tileX * tileWidth)
			let relY = y - (tileY * tileHeight)
			let i = (y * image.width + x) * 4
			let j = (relY * tileWidth + relX) * 4
			let frame = frames[tileX * rows + tileY]
			frame.pixels[j] = image.pixels[i]
			frame.pixels[j + 1] = image.pixels[i + 1]
			frame.pixels[j + 2] = image.pixels[i + 2]
			frame.pixels[j + 3] = image.pixels[i + 3]
		}
	}

	frames.forEach(frame => frame.updatePixels())

	let sprite = new Sprite()
	sprite.frames = frames
	sprite.setMaxFrameSize()

	return sprite
}
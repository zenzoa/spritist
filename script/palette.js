let palette = {}

palette.load = (data) => {
	let dataHelper = new DataHelper(data.buffer)
	let colors = []
	for (let i = 0; i < 256; i++) {
		let r = dataHelper.readUint8() * 4
		let g = dataHelper.readUint8() * 4
		let b = dataHelper.readUint8() * 4
		colors.push({ r, g, b })
	}
	// replace last ten colors
	colors[246] = { r: 255, g: 255, b: 255 }
	colors[247] = { r: 192, g: 192, b: 192 }
	colors[248] = { r: 128, g: 128, b: 128 }
	colors[249] = { r: 255, g: 0, b: 0 }
	colors[250] = { r: 0, g: 255, b: 0 }
	colors[251] = { r: 255, g: 255, b: 0 }
	colors[252] = { r: 0, g: 0, b: 255 }
	colors[253] = { r: 255, g: 0, b: 255 }
	colors[254] = { r: 0, g: 255, b: 255 }
	colors[255] = { r: 255, g: 255, b: 255 }
	palette.table = colors
}

palette.reset = () => {
	palette.table = palette.original
}

palette.lookup = (colorIndex, paletteTable) => {
	if (!paletteTable) paletteTable = palette.table
	let pixel = paletteTable[colorIndex]
	pixel.a = colorIndex === 0 ? 0 : 255
	return pixel
}

palette.findColor = ({ r, g, b }, paletteTable) => {
	if (!paletteTable) paletteTable = palette.table
	let bestFitColorIndex = 0
	let bestFitDistance = Math.sqrt(255**2 + 255**2 + 255**2)
	paletteTable.forEach((color, i) => {
		if (bestFitDistance === 0) {
			return
		} else if (color.r === r && color.g === g && color.b === b) {
			bestFitColorIndex = i
			bestFitDistance = 0
		} else {
			let distance = Math.sqrt((r - color.r)**2 + (g - color.g)**2 + (b - color.b)**2)
			if (distance < bestFitDistance) {
				bestFitColorIndex = i
				bestFitDistance = distance
			}
		}
	})
	return bestFitColorIndex
}

palette.swapPalette = (image, oldPalette, newPalette) => {
	image.loadPixels()
	let colorIndexes = []

	for (let i = 0; i < image.pixels.length; i += 4) {
		let pixel = {
			r: image.pixels[i],
			g: image.pixels[i + 1],
			b: image.pixels[i + 2],
			a: image.pixels[i + 3]
		}
		if (pixel.a === 0) {
			colorIndexes.push(0)
		} else {
			let colorIndex = palette.findColor(pixel, oldPalette)
			if (colorIndex > 0) {
				colorIndexes.push(colorIndex)
			} else {
				colorIndexes.push(0)
			}
		}
	}

	colorIndexes.forEach((colorIndex, i) => {
		let pixel = palette.lookup(colorIndex, newPalette)
		image.pixels[i * 4] = pixel.r
		image.pixels[i * 4 + 1] = pixel.g
		image.pixels[i * 4 + 2] = pixel.b
		image.pixels[i * 4 + 3] = pixel.a
	})

	image.updatePixels()
	return image
}

palette.original = [
	{ r: 0, g: 0, b: 0 }, { r: 252, g: 252, b: 252 }, { r: 252, g: 252, b: 252 }, { r: 252, g: 252, b: 252 }, { r: 252, g: 252, b: 252 }, { r: 252, g: 252, b: 252 }, { r: 252, g: 252, b: 252 }, { r: 252, g: 252, b: 252 }, { r: 252, g: 252, b: 252 }, { r: 252, g: 252, b: 252 }, { r: 252, g: 252, b: 252 }, { r: 16, g: 8, b: 8 }, { r: 20, g: 24, b: 40 }, { r: 24, g: 40, b: 16 }, { r: 24, g: 36, b: 48 }, { r: 44, g: 16, b: 8 }, { r: 40, g: 24, b: 36 }, { r: 52, g: 40, b: 16 }, { r: 48, g: 44, b: 48 }, { r: 24, g: 28, b: 68 }, { r: 20, g: 52, b: 84 }, { r: 24, g: 60, b: 96 }, { r: 36, g: 28, b: 68 }, { r: 44, g: 52, b: 72 }, { r: 44, g: 56, b: 104 }, { r: 28, g: 64, b: 28 }, { r: 28, g: 64, b: 40 }, { r: 52, g: 72, b: 24 }, { r: 52, g: 72, b: 44 }, { r: 60, g: 96, b: 24 }, { r: 60, g: 96, b: 40 }, { r: 24, g: 64, b: 92 }, { r: 28, g: 64, b: 100 }, { r: 52, g: 68, b: 80 }, { r: 44, g: 76, b: 104 }, { r: 56, g: 96, b: 76 }, { r: 60, g: 96, b: 112 }, { r: 72, g: 24, b: 8 }, { r: 72, g: 28, b: 36 }, { r: 80, g: 44, b: 16 }, { r: 72, g: 52, b: 44 }, { r: 104, g: 24, b: 12 }, { r: 108, g: 28, b: 36 }, { r: 108, g: 48, b: 16 }, { r: 104, g: 52, b: 36 }, { r: 72, g: 56, b: 72 }, { r: 72, g: 56, b: 104 }, { r: 104, g: 52, b: 72 }, { r: 116, g: 52, b: 104 }, { r: 80, g: 72, b: 20 }, { r: 80, g: 72, b: 48 }, { r: 80, g: 100, b: 24 }, { r: 76, g: 104, b: 44 }, { r: 112, g: 72, b: 20 }, { r: 108, g: 76, b: 44 }, { r: 112, g: 100, b: 20 }, { r: 116, g: 100, b: 48 }, { r: 76, g: 76, b: 76 }, { r: 76, g: 84, b: 108 }, { r: 84, g: 100, b: 80 }, { r: 84, g: 100, b: 112 }, { r: 104, g: 84, b: 76 }, { r: 104, g: 88, b: 104 }, { r: 112, g: 104, b: 80 }, { r: 108, g: 108, b: 108 }, { r: 48, g: 60, b: 132 }, { r: 56, g: 92, b: 144 }, { r: 64, g: 60, b: 132 }, { r: 76, g: 88, b: 140 }, { r: 72, g: 88, b: 176 }, { r: 80, g: 104, b: 140 }, { r: 72, g: 108, b: 172 }, { r: 100, g: 88, b: 136 }, { r: 100, g: 92, b: 172 }, { r: 108, g: 112, b: 140 }, { r: 108, g: 116, b: 168 }, { r: 76, g: 92, b: 196 }, { r: 80, g: 116, b: 200 }, { r: 92, g: 112, b: 236 }, { r: 104, g: 120, b: 204 }, { r: 100, g: 120, b: 244 }, { r: 104, g: 140, b: 52 }, { r: 92, g: 132, b: 76 }, { r: 92, g: 128, b: 104 }, { r: 108, g: 140, b: 76 }, { r: 116, g: 136, b: 112 }, { r: 120, g: 164, b: 76 }, { r: 120, g: 164, b: 104 }, { r: 88, g: 128, b: 140 }, { r: 92, g: 128, b: 184 }, { r: 112, g: 132, b: 148 }, { r: 116, g: 136, b: 172 }, { r: 124, g: 164, b: 140 }, { r: 120, g: 164, b: 176 }, { r: 88, g: 132, b: 204 }, { r: 88, g: 144, b: 228 }, { r: 88, g: 164, b: 240 }, { r: 112, g: 136, b: 204 }, { r: 116, g: 136, b: 252 }, { r: 120, g: 160, b: 216 }, { r: 112, g: 164, b: 236 }, { r: 140, g: 24, b: 16 }, { r: 144, g: 28, b: 36 }, { r: 136, g: 52, b: 16 }, { r: 140, g: 52, b: 40 }, { r: 172, g: 24, b: 16 }, { r: 172, g: 28, b: 32 }, { r: 168, g: 48, b: 16 }, { r: 172, g: 48, b: 40 }, { r: 152, g: 52, b: 72 }, { r: 140, g: 76, b: 20 }, { r: 140, g: 80, b: 40 }, { r: 144, g: 104, b: 20 }, { r: 144, g: 104, b: 48 }, { r: 172, g: 80, b: 20 }, { r: 168, g: 84, b: 40 }, { r: 176, g: 104, b: 20 }, { r: 172, g: 108, b: 44 }, { r: 136, g: 84, b: 72 }, { r: 136, g: 88, b: 108 }, { r: 140, g: 108, b: 76 }, { r: 136, g: 116, b: 108 }, { r: 172, g: 80, b: 72 }, { r: 176, g: 84, b: 100 }, { r: 168, g: 116, b: 72 }, { r: 172, g: 116, b: 104 }, { r: 208, g: 44, b: 28 }, { r: 212, g: 52, b: 72 }, { r: 200, g: 84, b: 20 }, { r: 200, g: 84, b: 40 }, { r: 204, g: 104, b: 20 }, { r: 204, g: 112, b: 44 }, { r: 232, g: 80, b: 20 }, { r: 232, g: 80, b: 44 }, { r: 232, g: 116, b: 20 }, { r: 232, g: 116, b: 40 }, { r: 204, g: 80, b: 72 }, { r: 204, g: 84, b: 100 }, { r: 204, g: 116, b: 72 }, { r: 200, g: 116, b: 104 }, { r: 232, g: 80, b: 80 }, { r: 236, g: 88, b: 96 }, { r: 240, g: 112, b: 72 }, { r: 236, g: 112, b: 112 }, { r: 144, g: 60, b: 132 }, { r: 140, g: 80, b: 132 }, { r: 132, g: 120, b: 144 }, { r: 132, g: 120, b: 168 }, { r: 168, g: 120, b: 136 }, { r: 164, g: 124, b: 164 }, { r: 128, g: 124, b: 196 }, { r: 208, g: 48, b: 128 }, { r: 216, g: 112, b: 136 }, { r: 236, g: 116, b: 204 }, { r: 164, g: 136, b: 44 }, { r: 148, g: 132, b: 80 }, { r: 144, g: 136, b: 112 }, { r: 136, g: 172, b: 80 }, { r: 140, g: 172, b: 108 }, { r: 176, g: 136, b: 80 }, { r: 172, g: 140, b: 108 }, { r: 180, g: 164, b: 80 }, { r: 180, g: 168, b: 112 }, { r: 156, g: 196, b: 60 }, { r: 164, g: 208, b: 92 }, { r: 208, g: 136, b: 24 }, { r: 208, g: 136, b: 48 }, { r: 212, g: 168, b: 20 }, { r: 208, g: 168, b: 44 }, { r: 240, g: 140, b: 20 }, { r: 236, g: 140, b: 44 }, { r: 244, g: 172, b: 20 }, { r: 244, g: 172, b: 48 }, { r: 204, g: 140, b: 76 }, { r: 200, g: 148, b: 104 }, { r: 208, g: 168, b: 80 }, { r: 208, g: 168, b: 112 }, { r: 236, g: 144, b: 72 }, { r: 236, g: 144, b: 100 }, { r: 240, g: 172, b: 76 }, { r: 236, g: 176, b: 108 }, { r: 208, g: 196, b: 56 }, { r: 244, g: 204, b: 12 }, { r: 248, g: 204, b: 48 }, { r: 252, g: 240, b: 12 }, { r: 252, g: 236, b: 44 }, { r: 212, g: 196, b: 80 }, { r: 212, g: 196, b: 112 }, { r: 200, g: 244, b: 80 }, { r: 204, g: 244, b: 108 }, { r: 248, g: 200, b: 76 }, { r: 244, g: 204, b: 108 }, { r: 248, g: 236, b: 76 }, { r: 252, g: 232, b: 112 }, { r: 140, g: 136, b: 144 }, { r: 140, g: 144, b: 172 }, { r: 144, g: 168, b: 144 }, { r: 148, g: 168, b: 180 }, { r: 168, g: 144, b: 140 }, { r: 164, g: 152, b: 176 }, { r: 176, g: 168, b: 144 }, { r: 172, g: 168, b: 180 }, { r: 136, g: 148, b: 204 }, { r: 132, g: 152, b: 248 }, { r: 148, g: 164, b: 208 }, { r: 144, g: 168, b: 252 }, { r: 160, g: 156, b: 196 }, { r: 172, g: 172, b: 204 }, { r: 164, g: 184, b: 244 }, { r: 168, g: 200, b: 168 }, { r: 152, g: 196, b: 196 }, { r: 176, g: 192, b: 208 }, { r: 168, g: 196, b: 252 }, { r: 176, g: 232, b: 196 }, { r: 184, g: 228, b: 232 }, { r: 204, g: 144, b: 144 }, { r: 200, g: 152, b: 164 }, { r: 204, g: 176, b: 140 }, { r: 200, g: 176, b: 176 }, { r: 236, g: 144, b: 140 }, { r: 236, g: 144, b: 164 }, { r: 232, g: 180, b: 136 }, { r: 232, g: 180, b: 168 }, { r: 196, g: 184, b: 200 }, { r: 196, g: 188, b: 224 }, { r: 244, g: 172, b: 204 }, { r: 212, g: 200, b: 144 }, { r: 208, g: 200, b: 176 }, { r: 204, g: 240, b: 136 }, { r: 204, g: 228, b: 176 }, { r: 240, g: 204, b: 144 }, { r: 236, g: 208, b: 172 }, { r: 248, g: 232, b: 144 }, { r: 248, g: 236, b: 176 }, { r: 212, g: 200, b: 204 }, { r: 200, g: 200, b: 232 }, { r: 212, g: 228, b: 204 }, { r: 216, g: 232, b: 228 }, { r: 228, g: 212, b: 208 }, { r: 224, g: 208, b: 224 }, { r: 240, g: 232, b: 208 }, { r: 244, g: 244, b: 236 }, { r: 252, g: 252, b: 252 }, { r: 0, g: 0, b: 0 }, { r: 0, g: 0, b: 0 }, { r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }, { r: 192, g: 192, b: 192 }, { r: 128, g: 128, b: 128 }, { r: 255, g: 0, b: 0 }, { r: 0, g: 255, b: 0 }, { r: 255, g: 255, b: 0 }, { r: 0, g: 0, b: 255 }, { r: 255, g: 0, b: 255 }, { r: 0, g: 255, b: 255 }, { r: 255, g: 255, b: 255 }
]

palette.table = palette.original

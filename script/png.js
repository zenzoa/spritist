let png = {}

png.load = (filePath, onSuccess) => {
	window.api.readFile(filePath, 'binary').then(data => {
		let str = 'data:image/png;base64,' + window.api.dataToString(data)
		window.p.loadImage(str, image => {
			let sprite = new Sprite()
			sprite.addFrame(image)
			onSuccess(sprite)
		}, () => {
			window.api.showErrorDialog('Unable to load PNG file.')
		})
	}).catch(error => {
		window.api.showErrorDialog('Unable to load PNG file.')
		console.log(error)
	})
}

png.save = (sprite) => {
	let img

	if (sprite.isBackground) {
		let width = sprite.frames[0].width * sprite.bgWidth
		let height = sprite.frames[0].height * sprite.bgHeight
		img = p.createImage(width, height)
		sprite.forEachFrame((frame, i) => {
			let x = Math.floor(i / sprite.bgHeight)
			let y = Math.floor(i % sprite.bgHeight)
			let bx = x * frame.width + sprite.hGap
			let by = y * frame.height + sprite.vGap
			img.copy(frame, 0, 0, frame.width, frame.height, bx, by, frame.width, frame.height)
		})
	} else if (sprite.selectedFrames.length > 0) {
		img = sprite.frames[sprite.selectedFrames[0]]
	} else {
		img = sprite.frames[0]
	}

	if (img) {
		img.save(sprite.filename, 'png')
	}
}

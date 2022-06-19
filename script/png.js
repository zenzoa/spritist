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
	let frame = sprite.frames[0]
	if (sprite.selectedFrames.length > 0) {
		frame = sprite.frames[sprite.selectedFrames[0]]
	}
	frame.save(sprite.filename, 'png')
}

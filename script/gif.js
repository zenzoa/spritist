let gif = {}

gif.load = (filePath, onSuccess) => {
	window.api.readFile(filePath, 'binary').then(data => {
		let str = 'data:image/gif;base64,' + window.api.dataToString(data)
		window.p.loadImage(str, image => {
			console.log('LOAD GIF', image)
			let sprite = new Sprite()
			for (let i = 0; i < image.numFrames(); i++) {
				image.setFrame(i)
				let frame = window.p.createImage(image.width, image.height)
				frame.copy(image, 0, 0, image.width, image.height, 0, 0, image.width, image.height)
				sprite.addFrame(frame)
			}
			onSuccess(sprite)
		}, () => {
			window.api.showErrorDialog('Unable to load GIF file.')
		})
	}).catch(error => {
		window.api.showErrorDialog('Unable to open GIF file.')
		console.log(error)
	})
}

gif.save = (sprite) => {
	let frames = []
	if (sprite.selectedFrames.length > 0) {
		frames = sprite.frames.filter((f, i) => sprite.selectedFrames.includes(i))
	} else {
		frames = sprite.frames
	}

	let width = frames[0].width
	let height = frames[0].height
	let inconsistentSizing = false
	frames.forEach(frame => {
		if (frame.width !== width || frame.height !== height) {
			inconsistentSizing = true
		}
	})
	if (inconsistentSizing) {
		window.api.showErrorDialog('Unable to save GIF file. All frames must be the same size.')
		return
	}

	let gifImage = window.p.createImage(width, height)
	let gifFrames = frames.map(frame => {
		frame.loadPixels()
		return {
			image: new ImageData(frame.pixels, width, height),
			delay: 200
		}
	})
	gifImage.gifProperties = {
		frames: gifFrames,
		numFrames: frames.length,
		loopCount: 0,
		loopLimit: null,
		playing: true,
		displayIndex: 0,
		timeDisplayed: 0,
		lastChangeTime: 0
	}

	gifImage.save(sprite.filename, 'gif')
}

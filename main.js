const { api } = require('./script/api')
const { buildMenu } = require('./script/menu')

nw.Window.open('index.html', {}, mainWindow => {
	if (process.versions['nw-flavor'] === 'sdk') {
		mainWindow.showDevTools()
	}
	mainWindow.menu = buildMenu()
	mainWindow.window.api = api
})

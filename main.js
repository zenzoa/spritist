const { api } = require('./script/api')
const { buildMenu } = require('./script/menu')

nw.Window.open('index.html', {}, mainWindow => {
	if (process.versions['nw-flavor'] === 'sdk') {
		// chrome.developerPrivate.openDevTools({
		// 	renderViewId: -1,
		// 	renderProcessId: -1,
		// 	extensionId: chrome.runtime.id
		// })
		mainWindow.showDevTools()
	}
	mainWindow.menu = buildMenu()
	mainWindow.window.api = api
})

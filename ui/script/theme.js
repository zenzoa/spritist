class Theme {
	static dark = {
		"main-bg": "#444444",
		"toolbar-bg": "#292929",
		"bg-bar-bg": "#363636",

		"divider-color": "#444444",

		"button-bg": "#393939",
		"button-hover-bg": "#595959",
		"button-hover-bg2": "#636363",
		"button-shadow": "#222222",
		"button-active-shadow": "#444444",

		"input-bg": "#595959",
		"input-disabled-bg": "#434343",
		"input-shadow": "#494949",

		"focus-outline": "#939393",

		"selected-frame-outline": "#ffffff",

		"invalid-dims-bg": "rgb(162, 78, 22)",

		"text-color": "#ffffff",
		"icon-filter": "invert(1)"
	}

	static light = {
		"main-bg": "#dddddd",
		"toolbar-bg": "#b0b0b0",
		"bg-bar-bg": "#c9c9c9",

		"divider-color": "#9d9d9d",

		"button-bg": "#c3c3c3",
		"button-hover-bg": "#a0a0a0",
		"button-hover-bg2": "#9d9d9d",
		"button-shadow": "#8b8b8b",
		"button-active-shadow": "#797979",

		"input-bg": "#f3f3f3",
		"input-disabled-bg": "#e0e0e0",
		"input-shadow": "#e0e0e0",

		"focus-outline": "#9d9d9d",

		// "selected-frame-outline": "rgb(153, 80, 240)",
		"selected-frame-outline": "rgb(255, 80, 168)",

		"invalid-dims-bg": "rgb(237, 145, 55)",

		"text-color": "#222222",
		"icon-filter": "invert(0.2)"
	}

	static purple = {
		"main-bg": "#3F3A63",
		"toolbar-bg": "#201E35",
		"bg-bar-bg": "#2f2b50",

		"divider-color": "#3F3A63",

		"button-bg": "#34305b",
		"button-hover-bg": "#504c72",
		"button-hover-bg2": "#615e81",
		"button-shadow": "#201E35",
		"button-active-shadow": "#353155",

		"input-bg": "#4B4572",
		"input-disabled-bg": "#3F3A63",
		"input-shadow": "#3F3A63",

		"focus-outline": "#737190",

		"selected-frame-outline": "#ffffff",

		"invalid-dims-bg": "rgb(162, 78, 22)",

		"text-color": "#eaeaef",
		"icon-filter": "invert(1)"
	}

	static set(themeName) {
		const theme = Theme[themeName]
		if (theme) {
			const style = document.documentElement.style
			for (const key in theme) {
				if (theme[key]) {
					style.setProperty(`--${key}`, theme[key])
				}
			}
		}
	}
}

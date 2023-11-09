use tauri::{
	CustomMenuItem,
	Menu,
	MenuItem,
	Submenu
};

pub fn build_menu() -> Menu {
	let new_file = CustomMenuItem::new("new_file".to_string(), "New").accelerator("CmdOrCtrl+N");
	let open_file = CustomMenuItem::new("open_file".to_string(), "Open...").accelerator("CmdOrCtrl+O");
	// let open_recent = Submenu::new("Open Recent", Menu::new());
	let save_file = CustomMenuItem::new("save_file".to_string(), "Save").accelerator("CmdOrCtrl+S").disabled();
	let save_as = CustomMenuItem::new("save_as".to_string(), "Save As...").accelerator("CmdOrCtrl+Shift+S").disabled();
	let import_menu = Submenu::new("Import", Menu::new()
		.add_item(CustomMenuItem::new("import_png_as_blk".to_string(), "Import PNG as BLK").accelerator("CmdOrCtrl+Shift+B"))
		.add_item(CustomMenuItem::new("import_spritesheet".to_string(), "Import Spritesheet").accelerator("CmdOrCtrl+Shift+T"))
	);
	let export_menu = Submenu::new("Export", Menu::new()
		.add_item(CustomMenuItem::new("export_png".to_string(), "Export PNG").accelerator("CmdOrCtrl+E").disabled())
		.add_item(CustomMenuItem::new("export_gif".to_string(), "Export GIF").accelerator("CmdOrCtrl+G").disabled())
		.add_item(CustomMenuItem::new("export_spritesheet".to_string(), "Export Spritesheet").accelerator("CmdOrCtrl+T").disabled())
	);
	let file_menu = Submenu::new("File", Menu::new()
		.add_item(new_file)
		.add_item(open_file)
		// .add_submenu(open_recent)
		.add_native_item(MenuItem::Separator)
		.add_item(save_file)
		.add_item(save_as)
		.add_native_item(MenuItem::Separator)
		.add_submenu(import_menu)
		.add_submenu(export_menu)
		.add_native_item(MenuItem::Separator)
		.add_native_item(MenuItem::Quit)
	);

	let undo = CustomMenuItem::new("undo".to_string(), "Undo").accelerator("CmdOrCtrl+Z").disabled();
	let redo = CustomMenuItem::new("redo".to_string(), "Redo").accelerator("CmdOrCtrl+Y").disabled();
	let cut = CustomMenuItem::new("cut".to_string(), "Cut").accelerator("CmdOrCtrl+X").disabled();
	let copy = CustomMenuItem::new("copy".to_string(), "Copy").accelerator("CmdOrCtrl+C").disabled();
	let paste = CustomMenuItem::new("paste".to_string(), "Paste").accelerator("CmdOrCtrl+V").disabled();
	let delete = CustomMenuItem::new("delete".to_string(), "Delete").accelerator("Delete").disabled();
	let select_all = CustomMenuItem::new("select_all".to_string(), "Select All").accelerator("CmdOrCtrl+A");
	let deselect_all = CustomMenuItem::new("deselect_all".to_string(), "Deselect All").accelerator("CmdOrCtrl+D").disabled();
	let insert_image = CustomMenuItem::new("insert_image".to_string(), "Insert Image...").accelerator("CmdOrCtrl+I").disabled();
	let replace_frame = CustomMenuItem::new("replace_frame".to_string(), "Replace Frame...").accelerator("CmdOrCtrl+Shift+I").disabled();
	let edit_menu = Submenu::new("Edit", Menu::new()
		.add_item(undo)
		.add_item(redo)
		.add_native_item(MenuItem::Separator)
		.add_item(cut)
		.add_item(copy)
		.add_item(paste)
		.add_item(delete)
		.add_native_item(MenuItem::Separator)
		.add_item(select_all)
		.add_item(deselect_all)
		.add_native_item(MenuItem::Separator)
		.add_item(insert_image)
		.add_item(replace_frame)
	);

	let reset_zoom = CustomMenuItem::new("reset_zoom".to_string(), "100%").accelerator("CmdOrCtrl+0").disabled();
	let zoom_in = CustomMenuItem::new("zoom_in".to_string(), "Zoom In").accelerator("CmdOrCtrl+=");
	let zoom_out = CustomMenuItem::new("zoom_out".to_string(), "Zoom Out").accelerator("CmdOrCtrl+-").disabled();
	let palette_menu = Submenu::new("SPR Palette", Menu::new()
		.add_item(CustomMenuItem::new("load_original".to_string(), "✔ Original Palette"))
		.add_item(CustomMenuItem::new("load_reversed".to_string(), "- Reversed Palette"))
		.add_item(CustomMenuItem::new("load_palette".to_string(), "- Custom Palette..."))
		.add_native_item(MenuItem::Separator)
		.add_item(CustomMenuItem::new("convert_to_original".to_string(), "Convert to Original Palette").disabled())
		.add_item(CustomMenuItem::new("convert_to_reversed".to_string(), "Convert to Reversed Palette").disabled())
		.add_item(CustomMenuItem::new("convert_to_palette".to_string(), "Convert to Palette...").disabled())
	);
	let view_as_sprite = CustomMenuItem::new("view_as_sprite".to_string(), "✔ View As Sprite").disabled();
	let view_as_bg = CustomMenuItem::new("view_as_bg".to_string(), "- View As Background").disabled();
	let show_image_info = CustomMenuItem::new("show_image_info".to_string(), "✔ Show Image Info");
	let transparent_menu = Submenu::new("Transparent Color", Menu::new()
		.add_item(CustomMenuItem::new("transparent_black".to_string(), "✔ Black"))
		.add_item(CustomMenuItem::new("transparent_white".to_string(), "- White"))
		.add_item(CustomMenuItem::new("transparent_none".to_string(), "- Transparent"))
	);
	let theme_menu = Submenu::new("Theme", Menu::new()
		.add_item(CustomMenuItem::new("theme_dark".to_string(), "✔ Dark"))
		.add_item(CustomMenuItem::new("theme_light".to_string(), "- Light"))
		.add_item(CustomMenuItem::new("theme_purple".to_string(), "- Purple"))
	);
	let view_menu = Submenu::new("View", Menu::new()
		.add_item(reset_zoom)
		.add_item(zoom_in)
		.add_item(zoom_out)
		.add_native_item(MenuItem::Separator)
		.add_submenu(palette_menu)
		.add_native_item(MenuItem::Separator)
		.add_item(view_as_sprite)
		.add_item(view_as_bg)
		.add_native_item(MenuItem::Separator)
		.add_item(show_image_info)
		.add_submenu(transparent_menu)
		.add_submenu(theme_menu)
	);

	Menu::new()
		.add_submenu(file_menu)
		.add_submenu(edit_menu)
		.add_submenu(view_menu)
}

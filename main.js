const { app, ipcMain, BrowserWindow, session } = require("electron");
const path = require("path");
const url = require("url");

let win;
let allCookies;

function createWindow() {
	// session.defaultSession.cookies.get({}).then(cookies => {
	// 	allCookies = cookies;
	// 	console.log("cookies", cookies);
	// });

	win = new BrowserWindow({ width: 1200, height: 800, webPreferences: {nodeIntegration: true} });

	win.setMenuBarVisibility(false);

	// load the dist folder from Angular
	win.loadURL(
		url.format({
			pathname: path.join(__dirname, `/index.html`),
			protocol: "file:",
			slashes: true
		})
	);

	// The following is optional and will open the DevTools:
	// win.webContents.openDevTools()

	win.on("closed", () => {
		win = null;
	});
}

app.on("ready", createWindow);

// on macOS, closing the window doesn't quit the app
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

// initialize the app's main window
app.on("activate", () => {
	if (win === null) {
		createWindow();
	}
});

// let allCookies = null;

// ipcMain.on('loadCookies', (event, arg) => {
// 	// console.log('loading cookies') // prints "ping"
// 	session.defaultSession.cookies.get({}).then(cookies => {
// 		allCookies = cookies;
// 		console.log("cookies", cookies);
// 	});
// 	// event.returnValue = 'pong'
// })

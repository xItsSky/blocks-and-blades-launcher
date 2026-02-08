const information = document.getElementById('info');
if (information) {
  information.innerText = `Cette application utilise Chrome (v${(window as any).electronAPI.chrome()}), Node.js (v${(window as any).electronAPI.node()}), et Electron (v${(window as any).electronAPI.electron()})`;
}

const nodeVersion = document.getElementById('node-version');
if (nodeVersion) nodeVersion.innerText = (window as any).electronAPI.node();

const chromeVersion = document.getElementById('chrome-version');
if (chromeVersion) chromeVersion.innerText = (window as any).electronAPI.chrome();

const electronVersion = document.getElementById('electron-version');
if (electronVersion) electronVersion.innerText = (window as any).electronAPI.electron();

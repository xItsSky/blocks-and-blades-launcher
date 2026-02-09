import * as path from 'path';
import * as os from 'os';
import config from './config';

export function getGameRoot(): string {
  const home = os.homedir();
  const folderName = config.gameFolderName;

  if (process.platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', folderName);
  } else if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), folderName);
  } else {
    // Fallback pour Linux ou autres
    return path.join(home, folderName);
  }
}

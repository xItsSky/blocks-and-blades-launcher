import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import fetch from 'node-fetch';
import config from './config';
import { getGameRoot } from './game-path';
import { getTranslation } from './i18n';
import { loadSettings } from './settings';

interface Manifest {
  version: string;
  resources: Record<string, string>;
}

export async function setupBasePackage(onProgress: (percent: number, message: string) => void): Promise<void> {
  const settings = loadSettings();
  const lang = settings.launcher.language;
  const rootDir = getGameRoot();
  const baseUrl = config.setup.baseUrl;
  const manifestUrl = `${baseUrl}/manifest.json`;

  if (!fs.existsSync(rootDir)) {
    fs.mkdirSync(rootDir, { recursive: true });
  }

  onProgress(0, getTranslation(lang, 'setupCheckingIntegrity'));

  try {
    // 1. Download remote manifest
    const response = await fetch(manifestUrl);
    if (!response.ok) throw new Error(`Failed to download manifest: ${response.statusText}`);
    const remoteManifest = await response.json() as Manifest;

    // Save manifest locally (optional but requested/accepted by user)
    fs.writeFileSync(path.join(rootDir, 'manifest.json'), JSON.stringify(remoteManifest, null, 2));

    // 2. Check and download individual resources
    const resources = Object.entries(remoteManifest.resources);
    const totalResources = resources.length;
    let completedResources = 0;

    for (const [relativePath, expectedHash] of resources) {
      const targetPath = path.join(rootDir, relativePath);
      const targetDir = path.dirname(targetPath);
      
      onProgress(
        10 + (completedResources / totalResources) * 90, 
        `${getTranslation(lang, 'setupAnalyzingFiles')} (${completedResources}/${totalResources})`
      );

      let needsDownload = false;
      if (!fs.existsSync(targetPath)) {
        needsDownload = true;
      } else {
        const actualHash = await calculateHash(targetPath);
        if (actualHash !== expectedHash) {
          console.log(`Hash mismatch for ${relativePath}. Expected ${expectedHash}, got ${actualHash}`);
          needsDownload = true;
        }
      }

      if (needsDownload) {
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        const downloadUrl = `${baseUrl}/${relativePath.split(path.sep).join('/')}`;
        console.log(`Downloading ${downloadUrl} to ${targetPath}`);
        await downloadFile(downloadUrl, targetPath, () => {});
      }
      
      completedResources++;
    }

    onProgress(100, getTranslation(lang, 'setupGameUpToDate'));
  } catch (error) {
    console.error('Setup failed:', error);
    throw error;
  }
}

async function downloadFile(url: string, dest: string, onProgress: (percent: number) => void): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download file: ${response.statusText}`);
  
  const totalSize = parseInt(response.headers.get('content-length') || '0', 10);
  let downloadedSize = 0;
  
  const fileStream = fs.createWriteStream(dest);
  
  return new Promise((resolve, reject) => {
    if (!response.body) {
      reject(new Error('Response body is null'));
      return;
    }
    
    response.body.on('data', (chunk: Buffer) => {
      downloadedSize += chunk.length;
      if (totalSize > 0) {
        onProgress((downloadedSize / totalSize) * 100);
      }
    });
    
    response.body.pipe(fileStream);
    
    fileStream.on('finish', () => {
      fileStream.close();
      resolve();
    });
    
    fileStream.on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
    
    response.body.on('error', (err: Error) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

function calculateHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(`sha256:${hash.digest('hex')}`));
    stream.on('error', (err) => reject(err));
  });
}

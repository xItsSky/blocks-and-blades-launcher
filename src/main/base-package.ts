import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import fetch from 'node-fetch';
import AdmZip = require('adm-zip');
import config from './config';
import { getGameRoot } from './game-path';
import { app } from 'electron';
import { getTranslation } from './i18n';
import { loadSettings } from './settings';

interface Manifest {
  version: string;
  required: string[];
  criticalGlobs: string[];
  minCounts: Record<string, number>;
  hashes: Record<string, string>;
}

export async function setupBasePackage(onProgress: (percent: number, message: string) => void): Promise<void> {
  const settings = loadSettings();
  const lang = settings.launcher.language;
  const rootDir = getGameRoot();
  const manifestUrl = config.setup.manifestUrl;
  const basePackageUrl = config.setup.basePackageUrl;

  if (!fs.existsSync(rootDir)) {
    fs.mkdirSync(rootDir, { recursive: true });
  }

  onProgress(0, getTranslation(lang, 'setupCheckingIntegrity'));

  try {
    // 1. Download remote manifest
    const response = await fetch(manifestUrl);
    if (!response.ok) throw new Error(`Failed to download manifest: ${response.statusText}`);
    const remoteManifest = await response.json() as Manifest;

    // 2. Check if root directory matches manifest
    onProgress(10, getTranslation(lang, 'setupAnalyzingFiles'));
    const isCorrupted = await checkIntegrity(rootDir, remoteManifest);
    
    // 3. Download and extract basePackage if needed
    if (isCorrupted) {
      console.log(`Starting download for ${basePackageUrl}`);
      onProgress(20, getTranslation(lang, 'setupDownloadingBase'));
      
      // Utiliser un chemin temporaire hors du dossier du jeu pour le téléchargement
      const tempDir = path.join(app.getPath('temp'), 'blocks-and-blades-setup');
      if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
      }
      fs.mkdirSync(tempDir, { recursive: true });
      
      const zipPath = path.join(tempDir, 'base-package.zip');
      
      await downloadFile(basePackageUrl, zipPath, (percent) => {
        onProgress(20 + (percent * 0.6), `${getTranslation(lang, 'setupDownloadingBase')} ${Math.round(percent)}%`);
      });

      console.log(`Extracting ${zipPath} to ${rootDir}`);
      onProgress(85, getTranslation(lang, 'setupExtractingBase'));
      
      try {
        const zip = new AdmZip(zipPath);
        const zipEntries = zip.getEntries();
        console.log(`Zip contains ${zipEntries.length} entries`);
        
        // S'assurer que le dossier root existe bien avant l'extraction
        if (!fs.existsSync(rootDir)) {
          fs.mkdirSync(rootDir, { recursive: true });
        }
        
        // Extraction manuelle entrée par entrée pour plus de contrôle et de logs
        for (const entry of zipEntries) {
            let relativePath = entry.entryName;
            
            // Si l'archive contient un dossier racine .blocks-and-blades, on le retire du chemin
            if (relativePath.startsWith('.blocks-and-blades/')) {
                relativePath = relativePath.substring('.blocks-and-blades/'.length);
            } else if (relativePath === '.blocks-and-blades' || relativePath === '.blocks-and-blades/') {
                continue; // On ignore le dossier racine lui-même
            }

            if (!relativePath) continue;

            if (entry.isDirectory) {
                const dirPath = path.join(rootDir, relativePath);
                if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
            } else {
                const targetPath = path.join(rootDir, relativePath);
                const targetDir = path.dirname(targetPath);
                if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
                
                fs.writeFileSync(targetPath, entry.getData());
            }
        }

        console.log('Extraction complete');

        // Check if files are actually there
        const finalFiles = fs.readdirSync(rootDir);
        console.log(`Files in rootDir after extraction: ${finalFiles.join(', ')}`);
      } catch (extractError) {
        console.error('Extraction error:', extractError);
        throw extractError;
      } finally {
        // Cleanup
        if (fs.existsSync(tempDir)) {
          try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
        }
      }
      
      console.log('Base package extracted and cleaned up');
    }

    onProgress(100, getTranslation(lang, 'setupGameUpToDate'));
  } catch (error) {
    console.error('Setup failed:', error);
    throw error;
  }
}

async function checkIntegrity(rootDir: string, manifest: Manifest): Promise<boolean> {
  // Simple check: for each file in manifest, check if it exists and if hash matches
  for (const [filePath, expectedHash] of Object.entries(manifest.hashes)) {
    const fullPath = path.join(rootDir, filePath);
    if (!fs.existsSync(fullPath)) {
      console.log(`Missing file: ${filePath}`);
      return true; // Missing file means corrupted or incomplete
    }

    const actualHash = await calculateHash(fullPath);
    if (actualHash !== expectedHash) {
      console.log(`Hash mismatch for ${filePath}. Expected ${expectedHash}, got ${actualHash}`);
      return true;
    }
  }

  // Check minCounts for specific directories
  if (manifest.minCounts) {
    for (const [dir, minCount] of Object.entries(manifest.minCounts)) {
      const dirPath = path.join(rootDir, dir);
      if (!fs.existsSync(dirPath)) return true;
      const files = fs.readdirSync(dirPath);
      if (files.length < minCount) {
        console.log(`Directory ${dir} has only ${files.length} files, expected at least ${minCount}`);
        return true;
      }
    }
  }

  return false;
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

async function downloadFile(url: string, dest: string, onProgress: (percent: number) => void): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download file: ${response.statusText}`);
  
  const totalSize = parseInt(response.headers.get('content-length') || '0', 10);
  let downloadedSize = 0;
  
  const fileStream = fs.createWriteStream(dest);
  
  return new Promise((resolve, reject) => {
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

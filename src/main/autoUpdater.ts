import { app, net } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

export interface UpdateInfo {
  hasUpdate: boolean;
  latestVersion: string;
  currentVersion: string;
  releaseNotes: string;
  downloadUrl?: string;
  assetName?: string;
}

const GITHUB_REPO = 'j-torres-o/floating_personal_gantt';

function compareVersions(v1: string, v2: string): number {
  const cleanV1 = v1.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  const cleanV2 = v2.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  
  for (let i = 0; i < Math.max(cleanV1.length, cleanV2.length); i++) {
    const num1 = cleanV1[i] || 0;
    const num2 = cleanV2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

export async function checkForAppUpdates(): Promise<UpdateInfo> {
  const currentVersion = app.getVersion() || '0.5.1';
  
  return new Promise((resolve) => {
    const request = net.request({
      method: 'GET',
      protocol: 'https:',
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_REPO}/releases/latest`,
      headers: {
        'User-Agent': 'FloatingPersonalGantt-Updater'
      }
    });

    let data = '';

    request.on('response', (response) => {
      if (response.statusCode !== 200) {
        resolve({
          hasUpdate: false,
          latestVersion: currentVersion,
          currentVersion,
          releaseNotes: ''
        });
        return;
      }

      response.on('data', (chunk) => {
        data += chunk.toString();
      });

      response.on('end', () => {
        try {
          const release = JSON.parse(data);
          const latestTag = (release.tag_name || '').replace(/^v/, '');
          const hasUpdate = compareVersions(latestTag, currentVersion) > 0;
          
          let downloadUrl: string | undefined;
          let assetName: string | undefined;

          if (Array.isArray(release.assets)) {
            // Buscar instalador o portable .exe
            const exeAsset = release.assets.find((a: { name: string; browser_download_url: string }) => 
              a.name.endsWith('.exe')
            );
            if (exeAsset) {
              downloadUrl = exeAsset.browser_download_url;
              assetName = exeAsset.name;
            }
          }

          resolve({
            hasUpdate,
            latestVersion: release.tag_name || latestTag,
            currentVersion,
            releaseNotes: release.body || 'Nuevas mejoras y correcciones de errores.',
            downloadUrl,
            assetName
          });
        } catch {
          resolve({
            hasUpdate: false,
            latestVersion: currentVersion,
            currentVersion,
            releaseNotes: ''
          });
        }
      });
    });

    request.on('error', () => {
      resolve({
        hasUpdate: false,
        latestVersion: currentVersion,
        currentVersion,
        releaseNotes: ''
      });
    });

    request.end();
  });
}

export async function downloadAndInstallUpdate(
  downloadUrl: string,
  assetName: string,
  onProgress?: (percent: number) => void
): Promise<boolean> {
  const tempDir = app.getPath('temp');
  const targetPath = path.join(tempDir, assetName || 'FloatingPersonalGantt-Update.exe');

  return new Promise((resolve, reject) => {
    const request = net.request({
      url: downloadUrl,
      headers: {
        'User-Agent': 'FloatingPersonalGantt-Updater'
      }
    });

    request.on('response', (response) => {
      // Manejo de redirecciones
      if (response.statusCode === 302 || response.statusCode === 301) {
        const redirectUrl = response.headers.location as string;
        if (redirectUrl) {
          downloadAndInstallUpdate(redirectUrl, assetName, onProgress)
            .then(resolve)
            .catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Error de descarga HTTP ${response.statusCode}`));
        return;
      }

      const totalBytes = parseInt(response.headers['content-length'] as string, 10) || 0;
      let receivedBytes = 0;
      const fileStream = fs.createWriteStream(targetPath);

      response.on('data', (chunk) => {
        receivedBytes += chunk.length;
        fileStream.write(chunk);
        if (totalBytes > 0 && onProgress) {
          const percent = Math.round((receivedBytes / totalBytes) * 100);
          onProgress(percent);
        }
      });

      response.on('end', () => {
        fileStream.end(() => {
          try {
            // Ejecutar el instalador descargado en proceso independiente y cerrar app actual
            spawn(targetPath, [], {
              detached: true,
              stdio: 'ignore'
            }).unref();

            setTimeout(() => {
              app.quit();
            }, 500);

            resolve(true);
          } catch (err) {
            reject(err);
          }
        });
      });
    });

    request.on('error', (err) => {
      reject(err);
    });

    request.end();
  });
}

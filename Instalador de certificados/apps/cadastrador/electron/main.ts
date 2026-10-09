import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import {
  initDatabase,
  closeDatabase,
  CertificateRepository,
  NetworkPathRepository,
  parsePfxFile,
  classifyCertificate,
  installCertificate,
  importarIndiceJson,
  importarVarreduraPasta,
} from '@cert-ecosystem/shared-core';
import fs from 'fs';
import { DatabaseMode } from '@cert-ecosystem/shared-types';

let mainWindow: BrowserWindow | null = null;

// Instâncias singleton dos repositórios
const certRepo = new CertificateRepository();
const networkRepo = new NetworkPathRepository();

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(async () => {
  // Inicializa o banco com modo ADMIN (leitura + escrita + migrations)
  // initDatabase é ASYNC pois sql.js carrega o WASM
  const dbPath = path.join(app.getPath('userData'), 'certificates.db');
  await initDatabase({ dbPath, mode: DatabaseMode.ADMIN });

  // ─── Handlers de Certificados ─────────────────────────────────────────
  ipcMain.handle('certificates:getAll', (_event, filter) =>
    certRepo.findAll(filter)
  );

  ipcMain.handle('certificates:getById', (_event, id: number) =>
    certRepo.findById(id)
  );

  ipcMain.handle('certificates:create', (_event, data) =>
    certRepo.create(data)
  );

  ipcMain.handle('certificates:update', (_event, id: number, data) =>
    certRepo.update(id, data)
  );

  ipcMain.handle('certificates:delete', (_event, id: number) =>
    certRepo.delete(id)
  );

  ipcMain.handle('certificates:getStats', () =>
    certRepo.getStats()
  );

  /**
   * Importa arquivo PFX:
   * 1. parsePfxFile → extrai { name, document, serialNumber, issuer, validFrom, validTo, thumbprint }
   * 2. classifyCertificate(document) → CertificateType (PF | PJ)
   * 3. Persiste no banco via CertificateRepository.create()
   */
  ipcMain.handle('certificates:import', async (_event, filePath: string, password: string, customName?: string) => {
    const parsed = parsePfxFile(filePath, password);
    const certType = classifyCertificate(parsed.document);

    const finalName = customName && customName.trim() ? customName.trim() : parsed.name;

    return certRepo.create({
      name: finalName,
      document: parsed.document,
      type: certType,
      serialNumber: parsed.serialNumber,
      issuer: parsed.issuer,
      validFrom: parsed.validFrom,
      validTo: parsed.validTo,
      thumbprint: parsed.thumbprint,
      pfxPath: filePath,
      pfxPassword: password,
      status: 'VALID' as any,
    });
  });

  /**
   * Importa lote via arquivo de índice JSON OU varredura de pasta
   */
  ipcMain.handle('certificates:importBatch', async (_event, targetPath: string) => {
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      return importarVarreduraPasta(targetPath, certRepo);
    } else {
      return importarIndiceJson(targetPath, certRepo);
    }
  });

  /**
   * Instala certificado no Windows:
   * - Repositório: CurrentUser\My (Pessoal)
   * - Flags: UserKeySet | UserProtected | PersistKeySet (SEM Exportable)
   */
  ipcMain.handle('certificates:install', async (_event, id: number) => {
    const cert = certRepo.findById(id);
    if (!cert) throw new Error('Certificado não encontrado.');
    if (!cert.pfxPath) throw new Error('Caminho do arquivo PFX não configurado.');
    return installCertificate({ pfxPath: cert.pfxPath, password: cert.pfxPassword || '' });
  });

  // ─── Handlers de Caminhos de Rede ──────────────────────────────────────
  ipcMain.handle('networkPaths:getAll', () =>
    networkRepo.findAll()
  );

  ipcMain.handle('networkPaths:create', (_event, data) =>
    networkRepo.create(data)
  );

  ipcMain.handle('networkPaths:update', (_event, id: number, data) =>
    networkRepo.update(id, data)
  );

  ipcMain.handle('networkPaths:delete', (_event, id: number) =>
    networkRepo.delete(id)
  );

  // ─── Handlers de Diálogo ───────────────────────────────────────────────
  ipcMain.handle('dialog:openFile', async (_event, filters) => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: filters ?? [{ name: 'Certificados', extensions: ['pfx', 'p12'] }],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  closeDatabase();
  if (process.platform !== 'darwin') app.quit();
});

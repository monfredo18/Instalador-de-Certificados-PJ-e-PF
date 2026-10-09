import { ICertificate, ICertificateFilter, IDashboardStats } from './certificate';
import { INetworkPath } from './network-path';

/**
 * Resultado de uma operação de instalação de certificado.
 */
export interface IInstallResult {
  success: boolean;
  message: string;
  thumbprint?: string;
}

/**
 * API exposta pelo preload script do Electron via contextBridge.
 * Todos os métodos retornam Promises (IPC invoke assíncrono).
 *
 * Esta interface garante type safety entre o processo principal
 * e o renderer, e é reutilizada por todos os 3 apps do ecossistema.
 */
export interface IElectronAPI {
  certificates: {
    getAll(filter?: ICertificateFilter): Promise<ICertificate[]>;
    getById(id: number): Promise<ICertificate | null>;
    create(cert: Omit<ICertificate, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<ICertificate>;
    update(id: number, data: Partial<ICertificate>): Promise<ICertificate | null>;
    delete(id: number): Promise<boolean>;
    getStats(): Promise<IDashboardStats>;
    import(filePath: string, password: string, customName?: string): Promise<ICertificate>;
    importBatch(indicePath: string): Promise<any>;
    install(id: number): Promise<IInstallResult>;
  };
  networkPaths: {
    getAll(): Promise<INetworkPath[]>;
    create(data: Omit<INetworkPath, 'id' | 'createdAt' | 'updatedAt'>): Promise<INetworkPath>;
    update(id: number, data: Partial<INetworkPath>): Promise<INetworkPath | null>;
    delete(id: number): Promise<boolean>;
  };
  dialog: {
    openFile(filters?: { name: string; extensions: string[] }[]): Promise<string | null>;
    openDirectory(): Promise<string | null>;
  };
}

/**
 * Declaração global para acesso à API do Electron no renderer.
 */
declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}

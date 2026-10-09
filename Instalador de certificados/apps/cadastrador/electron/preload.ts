import { contextBridge, ipcRenderer } from 'electron';
import { IElectronAPI } from '@cert-ecosystem/shared-types';

const api: IElectronAPI = {
  certificates: {
    getAll: (filter) => ipcRenderer.invoke('certificates:getAll', filter),
    getById: (id) => ipcRenderer.invoke('certificates:getById', id),
    create: (data) => ipcRenderer.invoke('certificates:create', data),
    update: (id, data) => ipcRenderer.invoke('certificates:update', id, data),
    delete: (id) => ipcRenderer.invoke('certificates:delete', id),
    getStats: () => ipcRenderer.invoke('certificates:getStats'),
    import: (filePath, password, customName?: string) => ipcRenderer.invoke('certificates:import', filePath, password, customName),
    importBatch: (indicePath: string) => ipcRenderer.invoke('certificates:importBatch', indicePath),
    install: (id) => ipcRenderer.invoke('certificates:install', id)
  },
  networkPaths: {
    getAll: () => ipcRenderer.invoke('networkPaths:getAll'),
    create: (data) => ipcRenderer.invoke('networkPaths:create', data),
    update: (id, data) => ipcRenderer.invoke('networkPaths:update', id, data),
    delete: (id) => ipcRenderer.invoke('networkPaths:delete', id)
  },
  dialog: {
    openFile: (filters?: any) => ipcRenderer.invoke('dialog:openFile', filters),
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory')
  }
};

contextBridge.exposeInMainWorld('electronAPI', api);

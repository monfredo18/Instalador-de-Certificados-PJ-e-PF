// Database
export {
  initDatabase,
  getDatabase,
  closeDatabase,
  saveDatabase,
  isAdminMode,
} from './database/connection';
export { runMigrations } from './database/migrations';
export { queryAll, queryOne, executeSQL } from './database/db-helpers';

// Repositories
export { CertificateRepository } from './database/repositories/certificate.repository';
export { NetworkPathRepository } from './database/repositories/network-path.repository';

// Certificate operations
export { parsePfxFile, type ParsedCertificate } from './certificate/parser';
export { classifyCertificate, formatDocument } from './certificate/classifier';
export { installCertificate } from './certificate/installer';
export {
  importarIndiceJson,
  importarVarreduraPasta,
  type BatchImportResult,
  type BatchItemResult,
} from './certificate/batch-importer';

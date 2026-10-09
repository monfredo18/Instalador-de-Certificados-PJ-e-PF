/**
 * Modo de acesso ao banco de dados.
 * - ADMIN: Leitura e Escrita (usado pelo Cadastrador)
 * - CLIENT: Somente Leitura (usado pelos Instaladores)
 */
export enum DatabaseMode {
  ADMIN = 'admin',
  CLIENT = 'client',
}

/**
 * Configuração de conexão com o banco de dados.
 */
export interface IConnectionConfig {
  /** Caminho completo para o arquivo SQLite (.db) */
  dbPath: string;
  /** Modo de acesso: admin (R/W) ou client (R/O) */
  mode: DatabaseMode;
}

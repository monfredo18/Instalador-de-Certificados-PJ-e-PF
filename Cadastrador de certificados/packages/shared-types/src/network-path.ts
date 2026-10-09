/**
 * Representa um caminho de rede configurado no sistema.
 * Usado para localizar arquivos PFX em diretórios de rede (UNC paths).
 */
export interface INetworkPath {
  id?: number;
  /** Nome amigável para identificação */
  label: string;
  /** Caminho UNC ou local (ex: \\\\servidor\\certificados) */
  path: string;
  /** Se o caminho está ativo para escaneamento */
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

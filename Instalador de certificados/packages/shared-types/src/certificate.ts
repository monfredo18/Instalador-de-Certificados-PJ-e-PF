/**
 * Tipos de certificado baseados no documento do titular.
 * PF = Pessoa Física (CPF, 11 dígitos)
 * PJ = Pessoa Jurídica (CNPJ, 14 dígitos)
 */
export enum CertificateType {
  PF = 'PF',
  PJ = 'PJ',
}

/**
 * Status computado a partir da data de expiração do certificado.
 * - VALID: mais de 30 dias para expirar
 * - EXPIRING_SOON: 30 dias ou menos para expirar
 * - EXPIRED: já expirou
 */
export enum CertificateStatus {
  VALID = 'VALID',
  EXPIRING_SOON = 'EXPIRING_SOON',
  EXPIRED = 'EXPIRED',
}

/**
 * Representa um certificado digital armazenado no sistema.
 */
export interface ICertificate {
  id?: number;
  /** Nome comum (CN) extraído do certificado */
  name: string;
  /** CPF (11 dígitos) ou CNPJ (14 dígitos), apenas números */
  document: string;
  /** Classificação PF ou PJ */
  type: CertificateType;
  /** Número de série do certificado */
  serialNumber: string;
  /** Emissor (Issuer CN) */
  issuer: string;
  /** Data de início de validade (ISO 8601) */
  validFrom: string;
  /** Data de expiração (ISO 8601) */
  validTo: string;
  /** Status computado — não armazenado no banco */
  status: CertificateStatus;
  /** Caminho completo do arquivo .pfx/.p12 */
  pfxPath: string;
  /** Senha do PFX (criptografada no banco) */
  pfxPassword: string;
  /** Thumbprint SHA-1 do certificado (identificador único) */
  thumbprint: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Filtros para consulta de certificados.
 */
export interface ICertificateFilter {
  type?: CertificateType;
  status?: CertificateStatus;
  search?: string;
}

/**
 * Estatísticas do dashboard.
 */
export interface IDashboardStats {
  total: number;
  valid: number;
  expiringSoon: number;
  expired: number;
  totalPF: number;
  totalPJ: number;
}

import { CertificateStatus } from '@cert-ecosystem/shared-types';

export const statusColors = {
  [CertificateStatus.VALID]: 'border-l-status-valid text-status-valid bg-green-50 dark:bg-green-950/30',
  [CertificateStatus.EXPIRING_SOON]: 'border-l-status-warning text-status-warning bg-amber-50 dark:bg-amber-950/30',
  [CertificateStatus.EXPIRED]: 'border-l-status-expired text-status-expired bg-red-50 dark:bg-red-950/30',
};

export const statusLabels = {
  [CertificateStatus.VALID]: 'Válido',
  [CertificateStatus.EXPIRING_SOON]: 'A vencer',
  [CertificateStatus.EXPIRED]: 'Vencido',
};

export const statusIcons = {
  [CertificateStatus.VALID]: 'Check circle icon indicating validity',
  [CertificateStatus.EXPIRING_SOON]: 'Warning icon indicating imminent expiration',
  [CertificateStatus.EXPIRED]: 'Error icon indicating expired certificate',
};

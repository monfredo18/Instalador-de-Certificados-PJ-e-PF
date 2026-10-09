import React from 'react';
import { CertificateStatus } from '@cert-ecosystem/shared-types';
import { statusColors, statusLabels } from '../theme/theme';

export interface StatusBadgeProps {
  status: CertificateStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const colorClass = statusColors[status] || statusColors[CertificateStatus.VALID];
  const label = statusLabels[status] || 'Unknown';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border-l-4 ${colorClass}`}>
      {label}
    </span>
  );
};

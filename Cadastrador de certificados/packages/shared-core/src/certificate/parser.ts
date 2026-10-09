import * as forge from 'node-forge';
import * as fs from 'fs';
import * as crypto from 'crypto';

export interface ParsedCertificate {
  name: string;
  document: string;
  serialNumber: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  thumbprint: string;
}

export function parsePfxFile(filePath: string, password: string): ParsedCertificate {
  const pfxDer = fs.readFileSync(filePath, 'binary');
  const pfxAsn1 = forge.asn1.fromDer(pfxDer);
  const p12 = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, false, password);
  
  let targetCert: forge.pki.Certificate | null = null;
  const safeBags = p12.getBags({ bagType: forge.pki.oids.certBag });

  const certBags = safeBags[forge.pki.oids.certBag];
  if (certBags && Array.isArray(certBags)) {
    for (const bag of certBags) {
      const cert = bag.cert;
      if (cert) {
        let isCA = false;
        const basicConstraints = cert.getExtension('basicConstraints') as any;
        if (basicConstraints && basicConstraints.cA) {
          isCA = true;
        }
        if (!isCA) {
          targetCert = cert;
          break;
        }
      }
    }
  }

  if (!targetCert) {
    throw new Error('End-entity certificate not found in PFX.');
  }

  const subject = targetCert.subject;
  const cnAttr = subject.attributes.find(a => a.shortName === 'CN' || a.name === 'commonName');
  const rawName = cnAttr ? cnAttr.value as string : 'Unknown';
  const issuerAttr = targetCert.issuer.attributes.find(a => a.shortName === 'CN' || a.name === 'commonName');
  const issuer = issuerAttr ? (issuerAttr.value as string) : 'Unknown';

  let document = '';
  
  const cnMatch = rawName.match(/:(\d{11}|\d{14})$/);
  if (cnMatch) {
    document = cnMatch[1];
  } else {
    const san = targetCert.getExtension('subjectAltName') as any;
    if (san && san.altNames) {
      for (const alt of san.altNames) {
        if (alt.value && typeof alt.value === 'string' && /^\d{11,14}$/.test(alt.value.replace(/\D/g, ''))) {
          document = alt.value.replace(/\D/g, '');
          break;
        }
      }
    }
    if (!document) {
      const docMatch = rawName.replace(/\D/g, '').match(/(\d{11}|\d{14})/);
      if (docMatch) document = docMatch[1];
    }
  }

  // Remove o CPF ou CNPJ do nome (ex: "EMPRESA LTDA:12345678000199" -> "EMPRESA LTDA")
  let name = rawName.split(':')[0].trim();
  if (document && document !== '00000000000') {
    name = name.replace(new RegExp(`[-/ ]*${document}`, 'g'), '').trim();
  }

  if (!document) {
    document = '00000000000';
  }

  const derCert = forge.pki.certificateToAsn1(targetCert);
  const derBytes = forge.asn1.toDer(derCert).getBytes();
  
  const hash = crypto.createHash('sha1');
  hash.update(Buffer.from(derBytes, 'binary'));
  const thumbprint = hash.digest('hex').toUpperCase();

  return {
    name,
    document,
    serialNumber: targetCert.serialNumber,
    issuer,
    validFrom: targetCert.validity.notBefore.toISOString(),
    validTo: targetCert.validity.notAfter.toISOString(),
    thumbprint
  };
}

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { IInstallResult } from '@cert-ecosystem/shared-types';
import * as crypto from 'crypto';

/**
 * Instala um certificado PFX no repositório do Windows.
 *
 * - Repositório: Usuário Atual → Pessoal (CurrentUser\My)
 * - Flags:
 *   • UserKeySet      → armazena no perfil do usuário atual
 *   • UserProtected   → proteção forte de chave privada (avisa ao usar)
 *   • PersistKeySet   → persiste após a importação
 *   • SEM Exportable  → chave NÃO exportável
 *
 * O script PowerShell é criado como arquivo temporário e a senha é passada
 * via variável de ambiente CERT_PASSWORD (não fica inline no script).
 */
export async function installCertificate(options: {
  pfxPath: string;
  password: string;
}): Promise<IInstallResult> {
  const scriptName = `install_cert_${crypto.randomBytes(4).toString('hex')}.ps1`;
  const scriptPath = path.join(os.tmpdir(), scriptName);

  // Script PowerShell — usa SecureString para a senha e flags sem Exportable
  const psScript = `
    param([string]$pfxPath)

    $password = $env:CERT_PASSWORD
    $secPassword = ConvertTo-SecureString -String $password -AsPlainText -Force

    $flags = [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::UserKeySet -bor \`
             [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::UserProtected -bor \`
             [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::PersistKeySet

    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2
    $cert.Import($pfxPath, $secPassword, $flags)

    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store("My", [System.Security.Cryptography.X509Certificates.StoreLocation]::CurrentUser)
    $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
    $store.Add($cert)
    $store.Close()

    Write-Output $cert.Thumbprint
  `;

  try {
    fs.writeFileSync(scriptPath, psScript);

    const output = execSync(
      `powershell -ExecutionPolicy Bypass -File "${scriptPath}" -pfxPath "${options.pfxPath}"`,
      {
        env: { ...process.env, CERT_PASSWORD: options.password },
        timeout: 30000,
        encoding: 'utf-8',
      }
    );

    const thumbprint = output.trim();
    return {
      success: true,
      message: 'Certificado instalado com sucesso.',
      thumbprint,
    };
  } catch (error: any) {
    const msg = error.message || 'Erro desconhecido';
    return { success: false, message: 'Falha na instalação: ' + msg };
  } finally {
    // Limpa o script temporário
    try {
      if (fs.existsSync(scriptPath)) {
        fs.unlinkSync(scriptPath);
      }
    } catch {
      // Ignora erro de limpeza
    }
  }
}

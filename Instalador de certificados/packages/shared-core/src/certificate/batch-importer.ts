import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { parsePfxFile } from './parser';
import { classifyCertificate } from './classifier';
import { CertificateRepository } from '../database/repositories/certificate.repository';

export interface BatchItemResult {
  nome: string;
  arquivo: string;
  sucesso: boolean;
  mensagem: string;
  precisaSenha?: boolean;
  caminhoCompleto?: string;
}

export interface BatchImportResult {
  total: number;
  importados: number;
  falhas: number;
  pendentesSenha: Array<{
    nome: string;
    arquivo: string;
    caminhoCompleto: string;
  }>;
  detalhes: BatchItemResult[];
}

/**
 * Tenta descriptografar a senha protegida por DPAPI via PowerShell.
 */
function tentarDescriptografarDPAPI(base64Cipher: string): string | null {
  if (!base64Cipher || typeof base64Cipher !== 'string') return null;
  try {
    const psScript = `
Add-Type -AssemblyName System.Security
$b = [Convert]::FromBase64String('${base64Cipher.replace(/'/g, "''")}')
try {
  $d = [System.Security.Cryptography.ProtectedData]::Unprotect($b, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
  [Console]::Out.Write([System.Text.Encoding]::UTF8.GetString($d))
} catch {
  try {
    $d = [System.Security.Cryptography.ProtectedData]::Unprotect($b, $null, [System.Security.Cryptography.DataProtectionScope]::LocalMachine)
    [Console]::Out.Write([System.Text.Encoding]::UTF8.GetString($d))
  } catch {
    exit 1
  }
}
`;
    const out = execSync(`powershell -NoProfile -NonInteractive -Command "${psScript.replace(/\r?\n/g, ' ')}"`, {
      encoding: 'utf8',
      timeout: 5000,
      windowsHide: true,
    });
    return out ? out.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Extrai senha do nome do arquivo caso contenha 'SENHA' (ex: "CERT. EMPRESA - SENHA Abcd1234.pfx")
 */
function extrairSenhaDoNome(nomeArquivo: string): string | null {
  const match = nomeArquivo.match(/SENHA\s*[:=-]?\s*([^\.]+)\.pfx$/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
}

/**
 * Varre um diretório recursivamente retornando todos os caminhos de arquivos.
 */
function varrerDiretorioRecursivo(dir: string): string[] {
  let resultados: string[] = [];
  try {
    const list = fs.readdirSync(dir);
    for (const item of list) {
      const fullPath = path.join(dir, item);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          resultados = resultados.concat(varrerDiretorioRecursivo(fullPath));
        } else {
          resultados.push(fullPath);
        }
      } catch {
        // Ignora arquivos/pastas sem permissão
      }
    }
  } catch {
    // Ignora erro ao ler diretório
  }
  return resultados;
}

/**
 * Processa a importação de um único certificado a partir de caminho e dados.
 */
function processarCertificado(
  pfxPath: string,
  nomeSugerido: string,
  senhaCandidata: string | null,
  certRepo: CertificateRepository,
  result: BatchImportResult
) {
  const arquivoNome = path.basename(pfxPath);
  let senhaEncontrada = senhaCandidata;

  // 1. Tentar ler .json individual na mesma pasta do .pfx
  if (!senhaEncontrada) {
    const pastaDoCert = path.dirname(pfxPath);
    try {
      const arquivosNaPasta = fs.readdirSync(pastaDoCert);
      const jsonIndividual = arquivosNaPasta.find(
        (f) => f.endsWith('.json') && !f.toLowerCase().includes('indice')
      );

      if (jsonIndividual) {
        const jsonContent = JSON.parse(fs.readFileSync(path.join(pastaDoCert, jsonIndividual), 'utf8'));
        if (jsonContent.SenhaProtegida) {
          senhaEncontrada = tentarDescriptografarDPAPI(jsonContent.SenhaProtegida);
        }
        if (!nomeSugerido && jsonContent.Nome) {
          nomeSugerido = jsonContent.Nome;
        }
      }
    } catch {
      // Ignora erro ao ler json individual
    }
  }

  // 2. Fallback: Extrair senha do nome do arquivo
  if (!senhaEncontrada) {
    senhaEncontrada = extrairSenhaDoNome(arquivoNome);
  }

  // Se ainda não encontrou senha, adiciona à lista de pendências
  if (!senhaEncontrada) {
    result.falhas++;
    result.pendentesSenha.push({
      nome: nomeSugerido || arquivoNome,
      arquivo: arquivoNome,
      caminhoCompleto: pfxPath,
    });
    result.detalhes.push({
      nome: nomeSugerido || arquivoNome,
      arquivo: arquivoNome,
      sucesso: false,
      mensagem: 'Senha não identificada automaticamente.',
      precisaSenha: true,
      caminhoCompleto: pfxPath,
    });
    return;
  }

  // 3. Tentar fazer o parse e persistir
  try {
    const parsed = parsePfxFile(pfxPath, senhaEncontrada);
    const certType = classifyCertificate(parsed.document);

    // Trava de duplicidade
    const jaExiste = certRepo.findByThumbprint(parsed.thumbprint);
    if (jaExiste) {
      result.detalhes.push({
        nome: jaExiste.name,
        arquivo: arquivoNome,
        sucesso: false,
        mensagem: 'Já cadastrado anteriormente (Thumbprint idêntico).',
      });
      return;
    }

    // Limpeza do nome: sem CPF/CNPJ
    let nomeFinal = nomeSugerido || parsed.name;
    if (parsed.document && parsed.document !== '00000000000') {
      nomeFinal = nomeFinal.replace(new RegExp(`[-/ ]*${parsed.document}`, 'g'), '').trim();
    }

    certRepo.create({
      name: nomeFinal,
      document: parsed.document,
      type: certType,
      serialNumber: parsed.serialNumber,
      issuer: parsed.issuer,
      validFrom: parsed.validFrom,
      validTo: parsed.validTo,
      thumbprint: parsed.thumbprint,
      pfxPath: pfxPath,
      pfxPassword: senhaEncontrada,
      status: 'VALID' as any,
    });

    result.importados++;
    result.detalhes.push({
      nome: nomeFinal,
      arquivo: arquivoNome,
      sucesso: true,
      mensagem: 'Importado com sucesso',
    });
  } catch (err: any) {
    result.falhas++;
    result.pendentesSenha.push({
      nome: nomeSugerido || arquivoNome,
      arquivo: arquivoNome,
      caminhoCompleto: pfxPath,
    });
    result.detalhes.push({
      nome: nomeSugerido || arquivoNome,
      arquivo: arquivoNome,
      sucesso: false,
      mensagem: `Falha ao validar senha: ${err.message}`,
      precisaSenha: true,
      caminhoCompleto: pfxPath,
    });
  }
}

/**
 * Importa um lote de certificados a partir de um arquivo indice.json
 */
export async function importarIndiceJson(
  indicePath: string,
  certRepo: CertificateRepository
): Promise<BatchImportResult> {
  const baseDir = path.dirname(indicePath);
  let content = fs.readFileSync(indicePath, 'utf8');

  // Remove BOM (Byte Order Mark) se presente
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  content = content.trim();

  let items: any[] = [];
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (typeof parsed === 'object' && parsed !== null) {
      items = [parsed];
    }
  } catch (err) {
    try {
      const wrapped = JSON.parse(`[${content}]`);
      if (Array.isArray(wrapped)) {
        items = wrapped;
      }
    } catch {
      const matches = content.match(/\{[\s\S]*?\}(?=\s*(,|$|\{))/g);
      if (matches && matches.length > 0) {
        for (const m of matches) {
          try {
            items.push(JSON.parse(m));
          } catch {}
        }
      }
    }
  }

  if (items.length === 0) {
    throw new Error('Não foi possível interpretar o conteúdo do arquivo de índice como JSON.');
  }

  const result: BatchImportResult = {
    total: items.length,
    importados: 0,
    falhas: 0,
    pendentesSenha: [],
    detalhes: [],
  };

  for (const item of items) {
    const nomeOriginal = item.Nome || item.nome || '';
    const arquivoNome = item.Arquivo || item.arquivo || '';
    const pastaRelativa = item.PastaRelativa || item.pastaRelativa || '';

    let pfxPath = '';
    if (pastaRelativa) {
      pfxPath = path.join(baseDir, pastaRelativa, arquivoNome);
    } else {
      pfxPath = path.join(baseDir, arquivoNome);
    }

    if (!fs.existsSync(pfxPath)) {
      const alternatePath = path.join(baseDir, arquivoNome);
      if (fs.existsSync(alternatePath)) {
        pfxPath = alternatePath;
      }
    }

    if (!fs.existsSync(pfxPath)) {
      result.falhas++;
      result.detalhes.push({
        nome: nomeOriginal || arquivoNome,
        arquivo: arquivoNome,
        sucesso: false,
        mensagem: `Arquivo .pfx não encontrado: ${pfxPath}`,
      });
      continue;
    }

    processarCertificado(pfxPath, nomeOriginal, null, certRepo, result);
  }

  return result;
}

/**
 * Importa varrendo uma pasta e todas as suas subpastas (Opção B).
 * Encontra todos os pares de .pfx e .json individuais.
 */
export async function importarVarreduraPasta(
  folderPath: string,
  certRepo: CertificateRepository
): Promise<BatchImportResult> {
  const todosArquivos = varrerDiretorioRecursivo(folderPath);
  const pfxArquivos = todosArquivos.filter((f) => /\.(pfx|p12)$/i.test(f));

  const result: BatchImportResult = {
    total: pfxArquivos.length,
    importados: 0,
    falhas: 0,
    pendentesSenha: [],
    detalhes: [],
  };

  for (const pfxPath of pfxArquivos) {
    processarCertificado(pfxPath, '', null, certRepo, result);
  }

  return result;
}

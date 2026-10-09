# Ecossistema de Certificados Digitais

## 🚀 Como Executar

### Pré-requisitos
- Node.js >= 20 ([nodejs.org](https://nodejs.org))
- npm >= 10

### Setup Inicial
```powershell
# Na raiz do projeto (uma única vez):
npm install
```

### Iniciar o Cadastrador (modo desenvolvimento)
```powershell
cd apps\cadastrador
npm run dev
```

### Build de Produção
```powershell
cd apps\cadastrador
npm run build
```

O executável será gerado em `apps/cadastrador/release/`.

---

## 📦 Estrutura do Projeto

```
certificados-ecosystem/
├── apps/
│   └── cadastrador/          # Sistema 1 — Admin (CRUD completo)
│       ├── electron/         # Processo principal Electron
│       └── src/              # React + TypeScript
├── packages/
│   ├── shared-types/         # Interfaces e enums TypeScript
│   ├── shared-core/          # DB (SQLite) + Parser PFX + Instalador
│   └── shared-ui/            # Componentes React reutilizáveis
```

## 🔒 Instalação de Certificados

Ao instalar via botão **Instalar**, o sistema usa PowerShell com as seguintes flags:

| Configuração | Valor |
|---|---|
| Repositório | **Usuário Atual** (`CurrentUser\My`) |
| Exportável | ❌ **Não** (sem flag `Exportable`) |
| Proteção de chave | ✅ **UserProtected** (aviso ao usar a chave) |
| Persistência | ✅ **PersistKeySet** |

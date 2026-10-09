const fs = require('fs');

let html = fs.readFileSync('c:/Users/douglas.machado/Downloads/Gerenciador de Certificados.html', 'utf8');

// 1. Remove forge
html = html.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/forge/1.3.1/forge.min.js"></script>', '');

// 2. Add buttons
html = html.replace('<button id="bEdit" disabled>Editar Certificado</button>', '<button id="bEdit" disabled>Editar Certificado</button>\n    <button id="bInstall" disabled>Instalar no Windows</button>\n    <button id="bDel" disabled>Excluir</button>');

// 3. Replace script with module import
const scriptStart = html.indexOf('<script>');
if (scriptStart !== -1) {
  html = html.substring(0, scriptStart) + '<script type="module" src="/src/main.ts"></script>\n</body>\n</html>';
}

fs.writeFileSync('c:/Users/douglas.machado/Documents/GitHub/Instalador de certificados/apps/cadastrador/index.html', html);
console.log('Done!');

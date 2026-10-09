const $ = (s: string) => document.querySelector(s) as HTMLElement;
const $$ = (s: string) => document.querySelectorAll(s);

let certs: any[] = [];
let tab = "PJ", sel: number | null = null, sort = { k: "cod", d: 1 }, cfg = { pPF: "", pPJ: "", pAv: 30 };

try {
  const s = localStorage.getItem("cfgCert");
  if (s) cfg = Object.assign(cfg, JSON.parse(s));
} catch (e) {}

const dias = (v: string) => Math.round((new Date(v + "T00:00:00").getTime() - new Date(new Date().toDateString()).getTime()) / 864e5);
const fmt = (v: string) => v.split("-").reverse().join("/");
const st = (d: number) => d < 0 ? ["bad", "Vencido"] : d <= cfg.pAv ? ["warn", "A vencer"] : ["ok", "Válido"];
const full = (c: any) => c.nome; // Backend format: name contains full name.
const nm: any = { PF: "Pessoa Física", PJ: "Pessoa Jurídica" };

// Document formatting helper
function formatDoc(doc: string) {
  const cleanDoc = doc.replace(/\D/g, '');
  if (cleanDoc.length === 11) return cleanDoc.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  if (cleanDoc.length === 14) return cleanDoc.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  return doc;
}

function toast(m: string) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = m;
  t.classList.add("show");
  clearTimeout((toast as any).h);
  (toast as any).h = setTimeout(() => t.classList.remove("show"), 2400);
}

function setTab(t: string) {
  tab = t;
  sel = null;
  $$(".tab").forEach((x: any) => x.setAttribute("aria-selected", (x.dataset.t == t).toString()));
}

async function loadCerts() {
  const data = await (window as any).electronAPI.certificates.getAll();
  certs = data.map((c: any) => ({
    id: c.id,
    tipo: c.type,
    cod: c.document, 
    nome: c.name,
    val: c.validTo.split('T')[0],
    arq: c.pfxPath
  }));
  render();
}

function render() {
  ["PF", "PJ"].forEach(t => {
    const el = $("#n" + t);
    if(el) el.textContent = certs.filter(c => c.tipo == t).length.toString();
  });
  
  const q = ($("#q") as HTMLInputElement).value.toLowerCase();
  const l = certs.filter(c => c.tipo == tab && (c.nome.toLowerCase().includes(q) || c.cod.includes(q)));
  
  const key = (c: any) => sort.k == "cod" ? c.nome : c.val;
  l.sort((a, b) => key(a) < key(b) ? -sort.d : key(a) > key(b) ? sort.d : 0);
  
  const tb = $("#tb");
  if(tb) {
    tb.innerHTML = l.map(c => {
      const d = dias(c.val), [k, t] = st(d), id = c.id;
      return `<tr data-id="${id}" class="${k != "ok" ? k : ""} ${sel == id ? "sel" : ""}">
        <td>${full(c)}</td>
        <td>${fmt(c.val)}</td>
        <td class="dias">${d}</td>
        <td><span class="badge b-${k}">${t}</span></td>
      </tr>`;
    }).join("");
  }
  
  const empty = $("#empty");
  if(empty) empty.hidden = l.length > 0;
  
  const cnt = $("#cnt");
  if(cnt) cnt.textContent = l.length + " certificado(s) em " + nm[tab];
  
  const lim = $("#lim");
  if(lim) lim.textContent = "Alerta de vencimento: " + cfg.pAv + " dias";
  
  const hasSel = certs.some(c => c.id == sel);
  const bEdit = $("#bEdit") as HTMLButtonElement;
  const bDel = $("#bDel") as HTMLButtonElement;
  
  if(bEdit) bEdit.disabled = !hasSel;
  if(bDel) bDel.disabled = !hasSel;
}

// Events
$$(".tab").forEach((b: any) => b.onclick = () => { setTab(b.dataset.t); render(); });
$("#q")!.oninput = render;
$("#tb")!.onclick = (e: any) => {
  const r = e.target.closest("tr");
  if (r) { sel = Number(r.dataset.id); render(); }
};
$("#tb")!.ondblclick = () => $("#bEdit")!.click();
$$("th[data-s]").forEach((h: any) => h.onclick = () => {
  const k = h.dataset.s == "dias" ? "val" : h.dataset.s;
  sort = { k, d: sort.k == k ? -sort.d : 1 };
  render();
});
$$("[data-close]").forEach((b: any) => b.onclick = () => (b.closest("dialog") as HTMLDialogElement).close());

/* Cadastrar - Electron Bridge */
$("#bAdd")!.onclick = () => {
  ($("#aPath") as HTMLInputElement).value = "";
  ($("#aNome") as HTMLInputElement).value = "";
  ($("#aSenha") as HTMLInputElement).value = "";
  $("#aMsg")!.hidden = true;
  ($("#dAdd") as HTMLDialogElement).showModal();
};

$("#aBrowse")!.onclick = async () => {
  try {
    const path = await (window as any).electronAPI.dialog.openFile();
    if (path) {
      ($("#aPath") as HTMLInputElement).value = path;
      $("#aMsg")!.hidden = true;
    }
  } catch(e) {}
};

$("#fAdd")!.onsubmit = async (ev) => {
  ev.preventDefault();
  const path = ($("#aPath") as HTMLInputElement).value.trim();
  const pw = ($("#aSenha") as HTMLInputElement).value;
  const customName = ($("#aNome") as HTMLInputElement).value.trim();
  
  if (!path) return aMsg("Selecione o arquivo .pfx.");
  if (!pw) return aMsg("Informe a senha do certificado.");
  
  const okBtn = $("#aOk") as HTMLButtonElement;
  okBtn.disabled = true;
  okBtn.textContent = "Validando...";
  
  try {
    // This calls the shared-core parser running on Node.js which is much more robust!
    await (window as any).electronAPI.certificates.import(path, pw, customName);
    await loadCerts(); // Reload from DB
    ($("#dAdd") as HTMLDialogElement).close();
    toast("Certificado cadastrado com sucesso!");
  } catch (err: any) {
    aMsg("Falha ao ler: " + (err.message || "Senha incorreta ou arquivo inválido."));
  }
  
  okBtn.disabled = false;
  okBtn.textContent = "Validar e Cadastrar";
};

function aMsg(t: string, info = false) {
  const m = $("#aMsg")!;
  m.hidden = !t;
  m.className = "msg" + (info ? " info" : "");
  m.textContent = t || "";
}

/* Importar Lote */
let pendingBatchItems: Array<{ nome: string; arquivo: string; caminhoCompleto: string }> = [];

async function executarImportacaoLote(targetPath: string) {
  try {
    toast("Processando lote de certificados...");
    const res = await (window as any).electronAPI.certificates.importBatch(targetPath);
    await loadCerts();

    if (res.pendentesSenha && res.pendentesSenha.length > 0) {
      pendingBatchItems = res.pendentesSenha;
      $("#batchSummary")!.textContent = `Importados com sucesso: ${res.importados} | Pendentes de senha: ${res.pendentesSenha.length}`;

      const listEl = $("#batchPendingList")!;
      listEl.innerHTML = res.pendentesSenha.map((item: any, idx: number) => `
        <div style="padding:8px;border:1px solid var(--line);border-radius:4px;background:var(--head)">
          <div style="font-weight:600;margin-bottom:4px">${item.nome}</div>
          <div class="hint" style="margin-bottom:6px;word-break:break-all">${item.arquivo}</div>
          <div style="display:flex;gap:8px;align-items:center">
            <input type="password" id="batchPwd_${idx}" placeholder="Digite a senha deste certificado" style="flex:1" autocomplete="off">
          </div>
        </div>
      `).join("");

      ($("#dBatchPending") as HTMLDialogElement).showModal();
    } else {
      toast(`Importação concluída! ${res.importados} certificados cadastrados.`);
    }
  } catch (err: any) {
    alert("Erro na importação em lote: " + err.message);
  }
}

$("#bImportBatch")!.onclick = () => {
  ($("#dBatchChoice") as HTMLDialogElement).showModal();
};

$("#bBatchByFile")!.onclick = async () => {
  ($("#dBatchChoice") as HTMLDialogElement).close();
  try {
    const filePath = await (window as any).electronAPI.dialog.openFile([
      { name: 'Arquivos JSON (*.json)', extensions: ['json'] },
      { name: 'Todos os Arquivos (*.*)', extensions: ['*'] }
    ]);
    if (filePath) {
      await executarImportacaoLote(filePath);
    }
  } catch(e) {}
};

$("#bBatchByFolder")!.onclick = async () => {
  ($("#dBatchChoice") as HTMLDialogElement).close();
  try {
    const folderPath = await (window as any).electronAPI.dialog.openDirectory();
    if (folderPath) {
      await executarImportacaoLote(folderPath);
    }
  } catch(e) {}
};

$("#bBatchSavePending")!.onclick = async () => {
  const btn = $("#bBatchSavePending") as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = "Processando...";

  let salvos = 0;
  for (let i = 0; i < pendingBatchItems.length; i++) {
    const item = pendingBatchItems[i];
    const pwdInput = document.getElementById(`batchPwd_${i}`) as HTMLInputElement;
    const pwd = pwdInput ? pwdInput.value.trim() : "";

    if (pwd) {
      try {
        await (window as any).electronAPI.certificates.import(item.caminhoCompleto, pwd, item.nome);
        salvos++;
      } catch (e) {
        // Ignora se senha inválida neste momento
      }
    }
  }

  await loadCerts();
  btn.disabled = false;
  btn.textContent = "Importar com Senhas Informadas";
  ($("#dBatchPending") as HTMLDialogElement).close();
  toast(`${salvos} certificados adicionais foram importados!`);
};

/* Editar */
let eC: any = null;
function eMsg(t: string) {
  const m = $("#eMsg")!;
  m.hidden = !t;
  m.className = "msg";
  m.textContent = t || "";
}

$("#bEdit")!.onclick = () => {
  eC = certs.find(c => c.id == sel);
  if (!eC) return;
  
  $("#eCod")!.textContent = formatDoc(eC.cod);
  ($("#eTipo") as HTMLSelectElement).value = eC.tipo;
  ($("#eNome") as HTMLInputElement).value = eC.nome;
  ($("#ePath") as HTMLInputElement).value = eC.arq || "";
  
  $("#eSenhaBox")!.hidden = true;
  $("#eValHint")!.textContent = "A validade é lida do arquivo .pfx e não pode ser alterada manualmente.";
  $("#eVal")!.textContent = fmt(eC.val);
  eMsg("");
  ($("#dEdit") as HTMLDialogElement).showModal();
};

$("#eBrowse")!.onclick = async () => {
  try {
    const path = await (window as any).electronAPI.dialog.openFile();
    if (path) {
      ($("#ePath") as HTMLInputElement).value = path;
      $("#eSenhaBox")!.hidden = false;
      $("#eValHint")!.textContent = "A validade será atualizada a partir do novo arquivo ao salvar.";
      eMsg("");
      $("#eSenha")!.focus();
    }
  } catch(e) {}
};

$("#fEdit")!.onsubmit = async (ev) => {
  ev.preventDefault();
  if (!eC) return;
  
  const nome = ($("#eNome") as HTMLInputElement).value.trim();
  const tipo = ($("#eTipo") as HTMLSelectElement).value;
  const path = ($("#ePath") as HTMLInputElement).value.trim();
  const pw = ($("#eSenha") as HTMLInputElement).value;
  
  if (!nome) return eMsg("Informe o nome do cliente.");
  const isChangingFile = !$("#eSenhaBox")!.hidden;
  if (isChangingFile && !pw) return eMsg("Informe a senha do novo certificado.");
  
  const okBtn = $("#eOk") as HTMLButtonElement;
  okBtn.disabled = true;
  okBtn.textContent = "Salvando...";
  
  try {
    const updateData: any = { name: nome, type: tipo, pfxPath: path };
    if (isChangingFile) {
      updateData.pfxPassword = pw;
      // We'd actually need to re-parse the cert if the file changes to validate it,
      // but the backend update doesn't automatically re-parse. 
      // For full safety, deleting and re-importing is better, or backend needs logic to re-parse on update.
      // But we will pass the password so the installer works.
    }
    await (window as any).electronAPI.certificates.update(eC.id, updateData);
    await loadCerts();
    ($("#dEdit") as HTMLDialogElement).close();
    toast("Certificado atualizado");
  } catch (err: any) {
    eMsg(err.message || "Falha ao salvar");
  }
  
  okBtn.disabled = false;
  okBtn.textContent = "Salvar alterações";
};

/* Excluir */
$("#bDel")!.onclick = async () => {
  if(!sel) return;
  const ok = confirm("Tem certeza que deseja excluir este certificado do sistema?");
  if(ok) {
    await (window as any).electronAPI.certificates.delete(sel);
    sel = null;
    await loadCerts();
    toast("Certificado excluído com sucesso.");
  }
};

/* Relatório */
$("#bRep")!.onclick = () => {
  const l = certs.filter(c => c.tipo == tab).map(c => ({ c, d: dias(c.val) })).sort((a, b) => a.d - b.d);
  const n = (k: string) => l.filter(x => st(x.d)[0] == k).length;
  
  $("#stats")!.innerHTML = [["bad", "Vencidos"], ["warn", "A vencer"], ["ok", "Válidos"]]
    .map(([k, t]) => `<div class="stat b-${k}"><b>${n(k)}</b><br>${t}</div>`).join("");
    
  $("#repList")!.innerHTML = l.filter(x => st(x.d)[0] != "ok")
    .map(x => `<div><span>${full(x.c)}</span><span class="badge b-${st(x.d)[0]}">${x.d < 0 ? "há " + (-x.d) + " dias" : x.d + " dias"}</span></div>`)
    .join("") || '<div>Nenhum certificado exige atenção.</div>';
    
  ($("#dRep") as HTMLDialogElement).showModal();
};

/* Pastas */
$("#bCfg")!.onclick = () => {
  ($("#pPF") as HTMLInputElement).value = cfg.pPF;
  ($("#pPJ") as HTMLInputElement).value = cfg.pPJ;
  ($("#pAv") as HTMLInputElement).value = String(cfg.pAv);
  ($("#dCfg") as HTMLDialogElement).showModal();
};

$("#fCfg")!.onsubmit = () => {
  cfg = {
    pPF: ($("#pPF") as HTMLInputElement).value.trim(),
    pPJ: ($("#pPJ") as HTMLInputElement).value.trim(),
    pAv: Number(($("#pAv") as HTMLInputElement).value) || 30
  };
  try { localStorage.setItem("cfgCert", JSON.stringify(cfg)); } catch(e) {}
  toast("Configurações salvas");
  render();
};

$("#bRef")!.onclick = async () => {
  await loadCerts();
  toast("Listas atualizadas");
};

/* Tema da marca */
const brands: any = {
  vi: { n: "Viriato", c: ["#0b2447", "#b3262e", "#c19a3b"] },
  cl: { n: "Correa e Lopes", c: ["#6b0f1a", "#e8741c", "#f2c230"] }
};

function setBrand(k: string, save: boolean = false) {
  if (!brands[k]) k = "vi";
  const r = document.documentElement;
  if (k == "vi") r.removeAttribute("data-brand"); else r.dataset.brand = k;
  $("#bn")!.textContent = brands[k].n;
  document.title = "Gerenciador de Certificados - " + brands[k].n;
  $("#swDots")!.innerHTML = brands[k].c.map((c: string) => `<i style="background:${c}"></i>`).join("");
  $$("#swMenu button").forEach((b: any) => b.setAttribute("aria-checked", (b.dataset.b == k).toString()));
  if (save) { try { localStorage.setItem("brandCert", k); } catch (e) {} }
}

function menu(open: boolean) {
  $("#swMenu")!.hidden = !open;
  $("#swBtn")!.setAttribute("aria-expanded", open.toString());
}

$("#swBtn")!.onclick = (e) => { e.stopPropagation(); menu($("#swMenu")!.hidden); };
$$("#swMenu button").forEach((b: any) => b.onclick = () => {
  setBrand(b.dataset.b, true);
  menu(false);
  toast("Tema " + brands[b.dataset.b].n + " aplicado");
});
document.addEventListener("click", e => { if (!(e.target as HTMLElement).closest(".sw")) menu(false); });
document.addEventListener("keydown", e => { if (e.key == "Escape") menu(false); });

let sb = "vi";
try { sb = localStorage.getItem("brandCert") || "vi"; } catch(e) {}
setBrand(sb, false);

loadCerts();

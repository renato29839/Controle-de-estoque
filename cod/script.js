const SUBGRUPOS_DATA = {
    "Imobilizado": ["Informática", "Móveis", "Máquinas", "Climatização"],
    "Limpeza": ["Higiene", "Químicos", "Descartáveis", "Copa"]
};

let estoque = JSON.parse(localStorage.getItem('np_estoque_v3')) || [];
let auditoria = JSON.parse(localStorage.getItem('np_auditoria_v3')) || [];

function salvarApp() {
    localStorage.setItem('np_estoque_v3', JSON.stringify(estoque));
    localStorage.setItem('np_auditoria_v3', JSON.stringify(auditoria));
    renderizarTabela();
    atualizarDashboard();
}

function registrarLog(user, item, operacao, local) {
    auditoria.unshift({
        timestamp: new Date().toLocaleString('pt-BR'),
        user, item, operacao, local
    });
}

function sugerirSKU() {
    if (estoque.length === 0) return "NP-001";
    const ids = estoque.map(i => parseInt(i.sku.split('-')[1]) || 0);
    return `NP-${(Math.max(...ids) + 1).toString().padStart(3, '0')}`;
}

function atualizarDashboard() {
    let financeiro = 0, zerados = 0, criticos = 0;
    estoque.forEach(it => {
        ["MATRIZ", "LIFE", "SUL"].forEach(un => {
            const qtd = it.saldos[un];
            financeiro += (qtd * it.preco);
            if (qtd <= 0) zerados++;
            else if (qtd <= it.minimos[un]) criticos++;
        });
    });
    document.getElementById('dash-total-geral').innerText = `R$ ${financeiro.toLocaleString('pt-BR', {minimumFractionDigits:2})}`;
    document.getElementById('dash-itens-criticos').innerText = zerados;
    document.getElementById('dash-itens-atencao').innerText = criticos;
}

// FORMULÁRIO CADASTRO
document.getElementById('form-estoque').addEventListener('submit', function(e) {
    e.preventDefault();
    const idx = document.getElementById('edit-index').value;
    
    const produto = {
        sku: idx === "" ? sugerirSKU() : document.getElementById('item-sku').value,
        grupo: document.getElementById('grupo').value,
        subgrupo: document.getElementById('subgrupo').value,
        nome: document.getElementById('item-nome').value.trim(),
        preco: parseFloat(document.getElementById('item-preco').value) || 0,
        saldos: {
            "MATRIZ": parseInt(document.getElementById('qtd-matriz').value) || 0,
            "LIFE": parseInt(document.getElementById('qtd-life').value) || 0,
            "SUL": parseInt(document.getElementById('qtd-sul').value) || 0
        },
        minimos: {
            "MATRIZ": parseInt(document.getElementById('min-matriz').value) || 0,
            "LIFE": parseInt(document.getElementById('min-life').value) || 0,
            "SUL": parseInt(document.getElementById('min-sul').value) || 0
        }
    };

    if (idx === "") {
        estoque.push(produto);
        registrarLog("Sistema", produto.nome, "Cadastro", "Global");
    } else {
        estoque[idx] = produto;
        registrarLog("Sistema", produto.nome, "Edição", "Global");
    }

    salvarApp();
    limparFormulario();
    toast("Salvo com sucesso!");
});

// MOVIMENTAÇÃO
document.getElementById('form-movimentacao').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('mov-item').value;
    const tipo = document.getElementById('mov-tipo').value;
    const qtd = parseInt(document.getElementById('mov-qtd').value);
    const ori = document.getElementById('mov-unidade-origem').value;
    const des = document.getElementById('mov-unidade-destino').value;
    const user = document.getElementById('mov-usuario').value;

    const item = estoque[id];
    if (tipo !== 'entrada' && item.saldos[ori] < qtd) {
        alert("Saldo insuficiente!"); return;
    }

    if (tipo === 'entrada') item.saldos[ori] += qtd;
    else if (tipo === 'saida') item.saldos[ori] -= qtd;
    else {
        item.saldos[ori] -= qtd;
        item.saldos[des] += qtd;
    }

    registrarLog(user, item.nome, `${tipo.toUpperCase()} (${qtd})`, ori);
    salvarApp();
    this.reset();
    toggleDestino();
    toast("Concluído!");
});

// IMPRESSÃO CORRIGIDA (ESTRUTURA DE TABELA COMPLETA)
function prepararImpressao() {
    const area = document.getElementById('area-impressao');
    const unidades = ["MATRIZ", "LIFE", "SUL"];
    area.innerHTML = "";

    unidades.forEach(un => {
        let content = `
            <div class="report-page">
                <h2 style="text-align:center">NEUROPSICOCENTRO - INVENTÁRIO ${un}</h2>
                <p>Data: ${new Date().toLocaleDateString('pt-BR')} | Unidade: ${un}</p>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>SKU</th>
                            <th>Item</th>
                            <th>Sistema</th>
                            <th>Físico</th>
                            <th>Obs</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${estoque.map(i => `
                            <tr>
                                <td>${i.sku}</td>
                                <td>${i.nome}</td>
                                <td style="text-align:center">${i.saldos[un]}</td>
                                <td></td>
                                <td></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
        area.innerHTML += content;
    });

    setTimeout(() => { window.print(); }, 500);
}

// UTILITÁRIOS
function renderizarTabela() {
    const corpo = document.getElementById('corpo-tabela');
    const filtro = document.getElementById('filtro-unidade').value;
    const busca = document.getElementById('busca-estoque').value.toLowerCase();
    corpo.innerHTML = "";

    estoque.forEach((it, i) => {
        const unidades = filtro === "TODAS" ? ["MATRIZ", "LIFE", "SUL"] : [filtro];
        unidades.forEach(un => {
            if (it.nome.toLowerCase().includes(busca) || it.sku.toLowerCase().includes(busca)) {
                const s = it.saldos[un], m = it.minimos[un];
                const status = s <= 0 ? 'status-critico' : (s <= m ? 'status-atencao' : '');
                corpo.innerHTML += `
                    <tr class="${status}">
                        <td><strong>${un}</strong></td>
                        <td><span class="badge-sku">${it.sku}</span></td>
                        <td>${it.nome}</td>
                        <td>${s}</td>
                        <td>${m}</td>
                        <td>R$ ${(s * it.preco).toFixed(2)}</td>
                        <td><button onclick="editarItem(${i})">✎</button></td>
                    </tr>`;
            }
        });
    });
}

function editarItem(i) {
    const it = estoque[i];
    document.getElementById('edit-index').value = i;
    document.getElementById('item-sku').value = it.sku;
    document.getElementById('grupo').value = it.grupo;
    atualizarSubgrupos();
    document.getElementById('subgrupo').value = it.subgrupo;
    document.getElementById('item-nome').value = it.nome;
    document.getElementById('item-preco').value = it.preco;
    document.getElementById('qtd-matriz').value = it.saldos.MATRIZ;
    document.getElementById('min-matriz').value = it.minimos.MATRIZ;
    document.getElementById('qtd-life').value = it.saldos.LIFE;
    document.getElementById('min-life').value = it.minimos.LIFE;
    document.getElementById('qtd-sul').value = it.saldos.SUL;
    document.getElementById('min-sul').value = it.minimos.SUL;
    window.scrollTo(0,0);
}

function trocarAba(e, id) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    e.currentTarget.classList.add('active');
    if(id === 'aba-movimentacao') popularSelect();
    if(id === 'aba-historico') renderizarLogs();
}

function popularSelect() {
    const s = document.getElementById('mov-item');
    s.innerHTML = '<option value="">Selecione...</option>';
    estoque.forEach((it, i) => s.innerHTML += `<option value="${i}">${it.nome}</option>`);
}

function renderizarLogs() {
    document.getElementById('corpo-historico').innerHTML = auditoria.map(l => `
        <tr><td><small>${l.timestamp}</small></td><td>${l.operacao}</td><td>${l.item}</td><td>${l.local}</td><td>${l.user}</td></tr>
    `).join('');
}

function toggleDestino() {
    const t = document.getElementById('mov-tipo').value;
    document.getElementById('mov-unidade-destino').style.display = (t === 'transferencia') ? 'block' : 'none';
}

function atualizarSubgrupos() {
    const g = document.getElementById('grupo').value;
    const s = document.getElementById('subgrupo');
    s.innerHTML = '<option value="">Subgrupo</option>';
    if (SUBGRUPOS_DATA[g]) SUBGRUPOS_DATA[g].forEach(i => s.innerHTML += `<option value="${i}">${i}</option>`);
}

function limparFormulario() {
    document.getElementById('form-estoque').reset();
    document.getElementById('edit-index').value = "";
    document.getElementById('item-sku').value = sugerirSKU();
}

function toast(m) { const t = document.getElementById('toast-msg'); t.innerText = m; t.style.display='block'; setTimeout(()=>t.style.display='none',3000); }

function exportarBackup() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify({estoque, auditoria})], {type: 'application/json'}));
    a.download = `backup_npc.json`; a.click();
}

function importarBackup(e) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        const d = JSON.parse(ev.target.result);
        estoque = d.estoque; auditoria = d.auditoria; salvarApp();
    };
    reader.readAsText(e.target.files[0]);
}

function limparHistorico() { if(confirm("Limpar logs?")) { auditoria = []; salvarApp(); renderizarLogs(); } }

document.addEventListener('DOMContentLoaded', () => { salvarApp(); limparFormulario(); });

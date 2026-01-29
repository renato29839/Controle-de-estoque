const SUBGRUPOS = {
    "Imobilizado": ["Informática", "Móveis", "Máquinas", "Climatização"],
    "Limpeza": ["Higiene", "Químicos", "Descartáveis", "Copa"]
};

let estoque = JSON.parse(localStorage.getItem('np_global_v2_estoque')) || [];
let historico = JSON.parse(localStorage.getItem('np_global_v2_auditoria')) || [];

// --- SKU ---
function gerarProximoSKU() {
    if (estoque.length === 0) return "NP-001";
    const numeros = estoque.map(i => {
        const p = i.sku.split('-');
        return p.length > 1 ? parseInt(p[1]) : 0;
    });
    const proximo = Math.max(...numeros, 0) + 1;
    return `NP-${proximo.toString().padStart(3, '0')}`;
}

function prepararNovoCadastro() {
    document.getElementById('edit-index').value = "";
    document.getElementById('item-sku').value = gerarProximoSKU();
}

// --- NAVEGAÇÃO ---
function trocarAba(event, abaId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(abaId).classList.add('active');
    if (event) event.currentTarget.classList.add('active');
    
    if (abaId === 'aba-estoque') renderizarTabela();
    if (abaId === 'aba-movimentacao') popularSelectItens();
    if (abaId === 'aba-historico') renderizarHistorico();
    atualizarDashboard();
}

function atualizarSubgrupos() {
    const grupo = document.getElementById('grupo').value;
    const sub = document.getElementById('subgrupo');
    sub.innerHTML = '<option value="">Subgrupo</option>';
    if (SUBGRUPOS[grupo]) SUBGRUPOS[grupo].forEach(s => sub.innerHTML += `<option value="${s}">${s}</option>`);
}

// --- DASHBOARD ---
function atualizarDashboard() {
    let totalFin = 0, criticos = 0, atencao = 0;
    estoque.forEach(item => {
        ["MATRIZ", "LIFE", "SUL"].forEach(un => {
            const qtd = item.saldos[un];
            const min = item.minimos[un];
            totalFin += (qtd * item.preco);
            if (qtd <= 0) criticos++;
            else if (qtd <= min) atencao++;
        });
    });
    document.getElementById('dash-total-geral').innerText = `R$ ${totalFin.toLocaleString('pt-BR', {minimumFractionDigits:2})}`;
    document.getElementById('dash-itens-criticos').innerText = criticos;
    document.getElementById('dash-itens-atencao').innerText = atencao;
}

// --- SALVAR ---
function salvarDados() {
    localStorage.setItem('np_global_v2_estoque', JSON.stringify(estoque));
    localStorage.setItem('np_global_v2_auditoria', JSON.stringify(historico));
    renderizarTabela();
    atualizarDashboard();
}

// --- CADASTRO ---
document.getElementById('form-estoque').addEventListener('submit', function(e) {
    e.preventDefault();
    const idx = document.getElementById('edit-index').value;
    const itemObj = {
        sku: (idx === "") ? gerarProximoSKU() : document.getElementById('item-sku').value,
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

    if (idx === "") estoque.push(itemObj);
    else estoque[idx] = itemObj;
    
    salvarDados();
    limparFormulario();
    mostrarMensagem("Dados salvos!");
});

// --- RENDERIZAR TELA ---
function renderizarTabela() {
    const corpo = document.getElementById('corpo-tabela');
    const filtro = document.getElementById('filtro-unidade').value;
    const busca = document.getElementById('busca-estoque').value.toLowerCase();
    corpo.innerHTML = '';

    estoque.forEach((item, i) => {
        const unidades = filtro === "TODAS" ? ["MATRIZ", "LIFE", "SUL"] : [filtro];
        unidades.forEach(un => {
            if (item.sku.toLowerCase().includes(busca) || item.nome.toLowerCase().includes(busca)) {
                const qtd = item.saldos[un], min = item.minimos[un];
                const status = qtd <= 0 ? 'status-critico' : (qtd <= min ? 'status-atencao' : '');
                corpo.innerHTML += `<tr class="${status}">
                    <td><strong>${un}</strong></td>
                    <td><span class="badge-sku">${item.sku}</span></td>
                    <td>${item.nome}</td>
                    <td><strong>${qtd}</strong></td>
                    <td>${min}</td>
                    <td>R$ ${(qtd * item.preco).toFixed(2)}</td>
                    <td>
                        <button onclick="editarItem(${i})" class="btn" style="background:orange;padding:4px 8px">✎</button>
                    </td></tr>`;
            }
        });
    });
}

// --- IMPRESSÃO (ESTÉTICA MELHORADA) ---
function prepararImpressao() {
    const areaPrint = document.getElementById('area-impressao');
    const unidades = ["MATRIZ", "LIFE", "SUL"];
    let html = `<h1 style="text-align:center">RELATÓRIO DE INVENTÁRIO - NEUROPSICOCENTRO</h1>`;

    unidades.forEach(un => {
        html += `
            <div class="page-break">
                <h2>Unidade: ${un}</h2>
                <table>
                    <thead>
                        <tr>
                            <th style="width:15%">SKU</th>
                            <th style="width:50%">Descrição</th>
                            <th style="width:10%">Saldo</th>
                            <th style="width:25%">Conferência Física</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${estoque.map(item => `
                            <tr>
                                <td>${item.sku}</td>
                                <td>${item.nome}</td>
                                <td style="text-align:center">${item.saldos[un]}</td>
                                <td></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <p style="margin-top:20px">Data: ____/____/____ &nbsp;&nbsp; Assinatura: __________________________</p>
            </div>`;
    });
    areaPrint.innerHTML = html;
    window.print();
}

// --- BACKUP ---
function exportarBackup() {
    const data = JSON.stringify({estoque, historico});
    const blob = new Blob([data], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'backup_npc.json';
    a.click();
}

function importarBackup(e) {
    const reader = new FileReader();
    reader.onload = (event) => {
        const d = JSON.parse(event.target.result);
        estoque = d.estoque; historico = d.historico;
        salvarDados();
    };
    reader.readAsText(e.target.files[0]);
}

// Funções de apoio (log, limpar, editar) permanecem com a lógica padrão.
function mostrarMensagem(m) { const t = document.getElementById('toast-msg'); t.innerText = m; t.style.display = 'block'; setTimeout(() => t.style.display = 'none', 3000); }
function limparFormulario() { document.getElementById('form-estoque').reset(); prepararNovoCadastro(); }
function popularSelectItens() {
    const s = document.getElementById('mov-item');
    s.innerHTML = '<option value="">Selecione...</option>';
    estoque.forEach((it, i) => s.innerHTML += `<option value="${i}">${it.nome}</option>`);
}

// Inicializar
prepararNovoCadastro();
atualizarDashboard();
renderizarTabela();

const SUBGRUPOS = {
    "Imobilizado": ["Informática", "Móveis", "Máquinas", "Climatização"],
    "Limpeza": ["Higiene", "Químicos", "Descartáveis", "Copa"]
};

let estoque = JSON.parse(localStorage.getItem('np_global_v2_estoque')) || [];
let historico = JSON.parse(localStorage.getItem('np_global_v2_auditoria')) || [];

// --- NAVEGAÇÃO ---
function trocarAba(event, abaId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(abaId).classList.add('active');
    if (event) event.currentTarget.classList.add('active');
    
    if (abaId === 'aba-estoque') { renderizarTabela(); atualizarDashboard(); }
    if (abaId === 'aba-movimentacao') popularSelectItens();
    if (abaId === 'aba-historico') renderizarHistorico();
}

function atualizarSubgrupos() {
    const grupo = document.getElementById('grupo').value;
    const sub = document.getElementById('subgrupo');
    sub.innerHTML = '<option value="">Subgrupo</option>';
    if (SUBGRUPOS[grupo]) SUBGRUPOS[grupo].forEach(s => sub.innerHTML += `<option value="${s}">${s}</option>`);
}

// --- DASHBOARD (CORRIGIDO) ---
function atualizarDashboard() {
    let totalFin = 0;
    let criticos = 0;
    let atencao = 0;

    estoque.forEach(item => {
        ["MATRIZ", "LIFE", "SUL"].forEach(un => {
            const qtd = item.saldos[un];
            const min = item.minimos[un];
            totalFin += (qtd * item.preco);

            if (qtd <= 0) {
                criticos++;
            } else if (qtd <= min) {
                atencao++;
            }
        });
    });

    const elTotal = document.getElementById('dash-total-geral');
    const elCriticos = document.getElementById('dash-itens-criticos');
    const elAtencao = document.getElementById('dash-itens-atencao');

    if (elTotal) elTotal.innerText = `R$ ${totalFin.toLocaleString('pt-BR', {minimumFractionDigits:2})}`;
    if (elCriticos) elCriticos.innerText = criticos;
    if (elAtencao) elAtencao.innerText = atencao;
}

// --- CADASTRO E SALVAMENTO ---
document.getElementById('form-estoque').addEventListener('submit', function(e) {
    e.preventDefault();
    const idx = document.getElementById('edit-index').value;
    const itemObj = {
        sku: document.getElementById('item-sku').value.toUpperCase().trim(),
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
        if (estoque.some(i => i.sku === itemObj.sku)) return alert("SKU já cadastrado!");
        estoque.push(itemObj);
    } else {
        estoque[idx] = itemObj;
    }
    
    salvarDados();
    limparFormulario();
    mostrarMensagem("Produto atualizado no catálogo!");
});

function salvarDados() {
    localStorage.setItem('np_global_v2_estoque', JSON.stringify(estoque));
    localStorage.setItem('np_global_v2_auditoria', JSON.stringify(historico));
    renderizarTabela();
    atualizarDashboard();
}

// --- EXCLUSÃO ---
function removerItem(index) {
    const item = estoque[index];
    if (confirm(`Excluir permanentemente "${item.nome}"?`)) {
        registrarNoLog("EXCLUSÃO", item.nome, `${item.sku} removido`);
        estoque.splice(index, 1);
        salvarDados();
        mostrarMensagem("Item removido.");
    }
}

// --- LOGS E MOVIMENTAÇÃO ---
function registrarNoLog(operacao, item, mov, usuario = "Sistema") {
    historico.unshift({
        data: new Date().toLocaleString('pt-BR'),
        operacao, item, mov, responsavel: usuario
    });
}

document.getElementById('form-movimentacao').addEventListener('submit', function(e) {
    e.preventDefault();
    const idx = document.getElementById('mov-item').value;
    const origem = document.getElementById('mov-unidade-origem').value;
    const tipo = document.getElementById('mov-tipo').value;
    const qtd = parseInt(document.getElementById('mov-qtd').value);
    const destino = document.getElementById('mov-unidade-destino').value;
    const usuario = document.getElementById('mov-usuario').value;

    const item = estoque[idx];

    if ((tipo === 'saida' || tipo === 'transferencia') && item.saldos[origem] < qtd) return alert("Saldo insuficiente!");

    if (tipo === 'transferencia') {
        item.saldos[origem] -= qtd;
        item.saldos[destino] += qtd;
        registrarNoLog("TRANSFERÊNCIA", item.nome, `${origem} ➔ ${destino} (${qtd} un)`, usuario);
    } else {
        item.saldos[origem] += (tipo === 'entrada' ? qtd : -qtd);
        registrarNoLog(tipo.toUpperCase(), item.nome, `${origem}: ${qtd} un`, usuario);
    }

    salvarDados();
    this.reset();
    document.getElementById('mov-unidade-destino').style.display = 'none';
    mostrarMensagem("Movimentação concluída!");
});

// --- RENDERIZAÇÃO ---
function renderizarTabela() {
    const corpo = document.getElementById('corpo-tabela');
    const filtro = document.getElementById('filtro-unidade').value;
    const busca = document.getElementById('busca-estoque').value.toLowerCase();
    corpo.innerHTML = '';

    estoque.forEach((item, i) => {
        const unidades = filtro === "TODAS" ? ["MATRIZ", "LIFE", "SUL"] : [filtro];
        unidades.forEach(un => {
            if (item.sku.toLowerCase().includes(busca) || item.nome.toLowerCase().includes(busca)) {
                const qtd = item.saldos[un];
                const min = item.minimos[un];
                const status = qtd <= 0 ? 'status-critico' : (qtd <= min ? 'status-atencao' : '');
                
                corpo.innerHTML += `
                    <tr class="${status}">
                        <td><strong>${un}</strong></td>
                        <td><span class="badge-sku">${item.sku}</span></td>
                        <td>${item.nome}</td>
                        <td><strong>${qtd}</strong></td>
                        <td>${min}</td>
                        <td>R$ ${(qtd * item.preco).toFixed(2)}</td>
                        <td>
                            <button onclick="editarItem(${i})" class="btn" style="background:orange;padding:4px 8px">✎</button>
                            <button onclick="removerItem(${i})" class="btn" style="background:#e74c3c;padding:4px 8px">✕</button>
                        </td>
                    </tr>`;
            }
        });
    });
}

function renderizarHistorico() {
    document.getElementById('corpo-historico').innerHTML = historico.map(h => `
        <tr><td><small>${h.data}</small></td><td><strong>${h.operacao}</strong></td><td>${h.item}</td><td>${h.mov}</td><td>${h.responsavel}</td></tr>
    `).join('');
}

// --- AUXILIARES ---
function popularSelectItens() {
    const s = document.getElementById('mov-item');
    s.innerHTML = '<option value="">Selecione o Item...</option>';
    estoque.forEach((item, i) => s.innerHTML += `<option value="${i}">${item.nome} (${item.sku})</option>`);
}

function toggleDestino() {
    const tipo = document.getElementById('mov-tipo').value;
    document.getElementById('mov-unidade-destino').style.display = (tipo === 'transferencia') ? 'block' : 'none';
}

function editarItem(i) {
    const item = estoque[i];
    document.getElementById('edit-index').value = i;
    document.getElementById('item-sku').value = item.sku;
    document.getElementById('item-nome').value = item.nome;
    document.getElementById('item-preco').value = item.preco;
    document.getElementById('grupo').value = item.grupo;
    atualizarSubgrupos();
    document.getElementById('subgrupo').value = item.subgrupo;
    document.getElementById('qtd-matriz').value = item.saldos.MATRIZ;
    document.getElementById('min-matriz').value = item.minimos.MATRIZ;
    document.getElementById('qtd-life').value = item.saldos.LIFE;
    document.getElementById('min-life').value = item.minimos.LIFE;
    document.getElementById('qtd-sul').value = item.saldos.SUL;
    document.getElementById('min-sul').value = item.minimos.SUL;
    trocarAba(null, 'aba-estoque');
}

function limparFormulario() { document.getElementById('form-estoque').reset(); document.getElementById('edit-index').value = ""; }
function mostrarMensagem(m) { const t = document.getElementById('toast-msg'); t.innerText = m; t.style.display = 'block'; setTimeout(() => t.style.display = 'none', 3000); }
function limparHistorico() { if(confirm("Limpar todos os logs?")) { historico = []; salvarDados(); renderizarHistorico(); } }

// Inicialização
atualizarDashboard();
renderizarTabela();

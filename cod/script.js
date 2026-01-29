const SUBGRUPOS = {
    "Imobilizado": ["Informática", "Móveis", "Máquinas", "Climatização"],
    "Limpeza": ["Higiene", "Químicos", "Descartáveis", "Copa"]
};

let estoque = JSON.parse(localStorage.getItem('np_final_unidades')) || [];
let historico = JSON.parse(localStorage.getItem('np_auditoria_unidades')) || [];

function trocarAba(event, abaId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(abaId).classList.add('active');
    if (event) event.currentTarget.classList.add('active');
    
    if (abaId === 'aba-estoque') renderizarTabela();
    if (abaId === 'aba-historico') renderizarHistorico();
}

function atualizarSubgrupos() {
    const grupo = document.getElementById('grupo').value;
    const sub = document.getElementById('subgrupo');
    sub.innerHTML = '<option value="">Subgrupo</option>';
    if (SUBGRUPOS[grupo]) {
        SUBGRUPOS[grupo].forEach(s => sub.innerHTML += `<option value="${s}">${s}</option>`);
    }
}

function salvarTudo() {
    localStorage.setItem('np_final_unidades', JSON.stringify(estoque));
    localStorage.setItem('np_auditoria_unidades', JSON.stringify(historico));
    renderizarTabela();
}

// Renderização com Filtro por Unidade
function renderizarTabela() {
    const corpo = document.getElementById('corpo-tabela');
    const filtroUnidade = document.getElementById('filtro-unidade').value;
    const busca = document.getElementById('busca-estoque').value.toLowerCase();
    let totalFinanceiro = 0;
    corpo.innerHTML = '';

    estoque.forEach((item, i) => {
        const atendeFiltroUnidade = filtroUnidade === "TODAS" || item.unidade === filtroUnidade;
        const atendeBusca = item.sku.toLowerCase().includes(busca) || item.nome.toLowerCase().includes(busca);

        if (atendeFiltroUnidade && atendeBusca) {
            const valorEstoque = item.quantidade * item.preco;
            totalFinanceiro += valorEstoque;

            let statusCls = '';
            let label = 'OK';
            if (item.quantidade <= 0) { statusCls = 'status-critico'; label = 'ZERADO'; }
            else if (item.quantidade <= item.minimo) { statusCls = 'status-atencao'; label = 'REPOR'; }

            corpo.innerHTML += `
                <tr class="${statusCls}">
                    <td><strong>${item.unidade}</strong><br><span class="badge-sku">${item.sku}</span></td>
                    <td><small>${item.grupo}<br>${item.subgrupo}</small></td>
                    <td>${item.nome}</td>
                    <td><strong>${item.quantidade}</strong> / ${item.minimo}<br><small>${label}</small></td>
                    <td>R$ ${valorEstoque.toFixed(2)}<br><small>Unit: R$ ${item.preco.toFixed(2)}</small></td>
                    <td>
                        <button onclick="editarItem(${i})" class="btn" style="background:orange; padding:5px">Editar</button>
                    </td>
                </tr>
            `;
        }
    });
    const labelFin = filtroUnidade === "TODAS" ? "Total Geral" : `Total ${filtroUnidade}`;
    document.getElementById('resumo-financeiro').innerText = `${labelFin}: R$ ${totalFinanceiro.toFixed(2)}`;
}

// Lógica de Movimentação Filtrada
function popularSelectItens() {
    const unidadeSel = document.getElementById('mov-unidade-filtro').value;
    const s = document.getElementById('mov-item');
    s.innerHTML = '<option value="">Selecione o Item...</option>';
    
    estoque.forEach((item, i) => {
        if (item.unidade === unidadeSel) {
            s.innerHTML += `<option value="${i}">${item.nome} (${item.sku}) - Saldo: ${item.quantidade}</option>`;
        }
    });
}

document.getElementById('form-estoque').addEventListener('submit', function(e) {
    e.preventDefault();
    const index = document.getElementById('edit-index').value;
    const itemObj = {
        sku: document.getElementById('item-sku').value.toUpperCase().trim(),
        unidade: document.getElementById('unidade').value,
        grupo: document.getElementById('grupo').value,
        subgrupo: document.getElementById('subgrupo').value,
        nome: document.getElementById('item-nome').value.trim(),
        quantidade: parseInt(document.getElementById('item-qtd').value),
        minimo: parseInt(document.getElementById('item-min').value),
        preco: parseFloat(document.getElementById('item-preco').value)
    };

    if (index === "" && estoque.some(i => i.sku === itemObj.sku && i.unidade === itemObj.unidade)) {
        alert("SKU duplicado nesta unidade!"); return;
    }

    if (index === "") estoque.push(itemObj);
    else estoque[index] = itemObj;

    salvarTudo();
    limparFormulario();
    mostrarMensagem("Salvo com sucesso!");
});

document.getElementById('form-movimentacao').addEventListener('submit', function(e) {
    e.preventDefault();
    const idx = document.getElementById('mov-item').value;
    if(!idx) return;

    const tipo = document.getElementById('mov-tipo').value;
    const qtd = parseInt(document.getElementById('mov-qtd').value);
    const usuario = document.getElementById('mov-usuario').value;

    if (tipo === 'saida' && estoque[idx].quantidade < qtd) {
        alert("Saldo insuficiente!"); return;
    }

    const anterior = estoque[idx].quantidade;
    estoque[idx].quantidade += (tipo === 'entrada' ? qtd : -qtd);

    historico.unshift({
        data: new Date().toLocaleString(),
        unidade: estoque[idx].unidade,
        item: `[${estoque[idx].sku}] ${estoque[idx].nome}`,
        tipo: tipo.toUpperCase(),
        qtd: qtd,
        usuario: usuario,
        rastreio: `${anterior} para ${estoque[idx].quantidade}`
    });

    salvarTudo();
    mostrarMensagem("Movimentação registrada!");
    this.reset();
    popularSelectItens();
});

function renderizarHistorico() {
    const corpo = document.getElementById('corpo-historico');
    corpo.innerHTML = historico.map(h => `
        <tr>
            <td><small>${h.data}</small></td>
            <td><strong>${h.unidade}</strong></td>
            <td>${h.item}</td>
            <td style="color:${h.tipo==='ENTRADA'?'green':'red'}"><strong>${h.tipo} (${h.qtd})</strong></td>
            <td>${h.usuario}</td>
            <td><code style="background:#eee">${h.rastreio}</code></td>
        </tr>
    `).join('');
}

function editarItem(i) {
    const item = estoque[i];
    document.getElementById('item-sku').value = item.sku;
    document.getElementById('unidade').value = item.unidade;
    document.getElementById('grupo').value = item.grupo;
    atualizarSubgrupos();
    document.getElementById('subgrupo').value = item.subgrupo;
    document.getElementById('item-nome').value = item.nome;
    document.getElementById('item-qtd').value = item.quantidade;
    document.getElementById('item-min').value = item.minimo;
    document.getElementById('item-preco').value = item.preco;
    document.getElementById('edit-index').value = i;
    trocarAba(null, 'aba-estoque');
}

function limparFormulario() {
    document.getElementById('form-estoque').reset();
    document.getElementById('edit-index').value = "";
}

function mostrarMensagem(msg) {
    const t = document.getElementById('toast-msg');
    t.innerText = msg; t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 3000);
}

function exportarBackup() {
    const blob = new Blob([JSON.stringify({estoque, historico}, null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `estoque_neuropsico.json`;
    a.click();
}

function prepararImpressao() { window.print(); }

renderizarTabela();
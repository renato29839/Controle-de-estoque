const SUBGRUPOS = {
    "Imobilizado": ["Informática", "Móveis e Utensílios", "Máquinas", "Veículos", "Climatização"],
    "Limpeza": ["Higiene", "Produtos Químicos", "Descartáveis", "Copa"]
};

let estoque = JSON.parse(localStorage.getItem('np_estoque_db')) || [];
let historico = JSON.parse(localStorage.getItem('np_historico_db')) || [];

// Alternar Abas
function trocarAba(event, abaId) {
    document.querySelectorAll('.tab-content').forEach(a => a.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(abaId).classList.add('active');
    event.currentTarget.classList.add('active');

    if (abaId === 'aba-movimentacao') popularSelectItens();
    if (abaId === 'aba-historico') renderizarHistorico();
}

// Subgrupos Dinâmicos
function atualizarSubgrupos() {
    const grupo = document.getElementById('grupo').value;
    const sub = document.getElementById('subgrupo');
    sub.innerHTML = '<option value="">Subgrupo</option>';
    if (grupo) {
        SUBGRUPOS[grupo].forEach(s => {
            sub.innerHTML += `<option value="${s}">${s}</option>`;
        });
    }
}

// Cadastro
document.getElementById('form-estoque').addEventListener('submit', function(e) {
    e.preventDefault();
    const index = document.getElementById('edit-index').value;
    const itemObj = {
        unidade: document.getElementById('unidade').value,
        grupo: document.getElementById('grupo').value,
        subgrupo: document.getElementById('subgrupo').value,
        nome: document.getElementById('item-nome').value,
        quantidade: parseInt(document.getElementById('item-qtd').value)
    };

    if (index === "") estoque.push(itemObj);
    else estoque[index] = itemObj;

    salvarTudo();
    this.reset();
    document.getElementById('edit-index').value = "";
    alert("Item salvo!");
});

// Lógica de Movimentação (Registra no Histórico)
function popularSelectItens() {
    const s = document.getElementById('mov-item');
    s.innerHTML = '<option value="">Selecione...</option>';
    estoque.forEach((item, i) => {
        s.innerHTML += `<option value="${i}">${item.unidade} | ${item.nome} (Saldo: ${item.quantidade})</option>`;
    });
}

document.getElementById('form-movimentacao').addEventListener('submit', function(e) {
    e.preventDefault();
    const idx = document.getElementById('mov-item').value;
    const tipo = document.getElementById('mov-tipo').value;
    const qtd = parseInt(document.getElementById('mov-qtd').value);

    if (tipo === 'saida' && estoque[idx].quantidade < qtd) {
        alert("Saldo insuficiente!");
        return;
    }

    // Atualiza saldo
    if (tipo === 'entrada') estoque[idx].quantidade += qtd;
    else estoque[idx].quantidade -= qtd;

    // Registra Histórico
    historico.unshift({
        data: new Date().toLocaleString(),
        unidade: estoque[idx].unidade,
        item: estoque[idx].nome,
        tipo: tipo.toUpperCase(),
        qtd: qtd
    });

    salvarTudo();
    alert("Movimentação concluída!");
    this.reset();
    popularSelectItens();
});

// Funções de Renderização
function renderizarTabela() {
    const corpo = document.getElementById('corpo-tabela');
    corpo.innerHTML = '';
    estoque.forEach((item, i) => {
        corpo.innerHTML += `
            <tr>
                <td><strong>${item.unidade}</strong></td>
                <td><small>${item.grupo} > ${item.subgrupo}</small></td>
                <td>${item.nome}</td>
                <td>${item.quantidade}</td>
                <td>
                    <button onclick="editarItem(${i})" class="btn" style="background:orange; padding:4px 8px">✏️</button>
                    <button onclick="excluirItem(${i})" class="btn" style="background:red; padding:4px 8px">🗑️</button>
                </td>
            </tr>
        `;
    });
}

function renderizarHistorico() {
    const corpo = document.getElementById('corpo-historico');
    corpo.innerHTML = historico.map(h => `
        <tr>
            <td><small>${h.data}</small></td>
            <td>${h.unidade}</td>
            <td>${h.item}</td>
            <td style="color:${h.tipo==='ENTRADA'?'green':'red'}"><strong>${h.tipo}</strong></td>
            <td>${h.qtd}</td>
        </tr>
    `).join('');
}

// Impressão Separada por Empresa
function prepararImpressao() {
    const area = document.getElementById('area-impressao');
    area.innerHTML = '';
    const unidades = ["MATRIZ", "LIFE", "SUL"];

    unidades.forEach(un => {
        const itensUnidade = estoque.filter(i => i.unidade === un);
        if (itensUnidade.length > 0) {
            let html = `
                <div class="page-break">
                    <div class="header-print">
                        <h2>CONTROLE DE ESTOQUE - NEUROPSICOCENTRO</h2>
                        <h3>UNIDADE: ${un}</h3>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Grupo</th>
                                <th>Subgrupo</th>
                                <th>Item</th>
                                <th>Saldo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itensUnidade.map(i => `
                                <tr>
                                    <td>${i.grupo}</td>
                                    <td>${i.subgrupo}</td>
                                    <td>${i.nome}</td>
                                    <td>${i.quantidade}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <p><small>Relatório gerado em: ${new Date().toLocaleString()}</small></p>
                </div>
            `;
            area.innerHTML += html;
        }
    });
    window.print();
}

function salvarTudo() {
    localStorage.setItem('np_estoque_db', JSON.stringify(estoque));
    localStorage.setItem('np_historico_db', JSON.stringify(historico));
    renderizarTabela();
}

function editarItem(i) {
    const item = estoque[i];
    document.getElementById('unidade').value = item.unidade;
    document.getElementById('grupo').value = item.grupo;
    atualizarSubgrupos();
    document.getElementById('subgrupo').value = item.subgrupo;
    document.getElementById('item-nome').value = item.nome;
    document.getElementById('item-qtd').value = item.quantidade;
    document.getElementById('edit-index').value = i;
    trocarAba({currentTarget: document.querySelector('.nav-btn')}, 'aba-estoque');
}

function excluirItem(i) {
    if(confirm("Excluir item?")) { estoque.splice(i, 1); salvarTudo(); }
}

renderizarTabela();
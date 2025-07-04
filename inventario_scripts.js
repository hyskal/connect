// inventario_scripts.js

// Variáveis globais para armazenar os itens e categorias
let itensInventario = [];
let categoriasInventario = [];

// Função que é executada quando a página inventario.html é carregada
window.onload = async () => {
    console.log("Página de inventário carregada. Inicializando...");
    // Carregar categorias e itens ao iniciar
    await carregarCategoriasInventario();
    await carregarItensInventario();

    // Configurar o evento de pesquisa para a tabela de inventário
    document.getElementById('pesquisaInventario').addEventListener('input', filtrarItensInventario);
    
    // Configurar evento para sugestões de movimentação
    document.getElementById('itemMovimento').addEventListener('input', sugestaoItemMovimento);
    document.getElementById('itemMovimento').addEventListener('change', carregarQuantidadeAtualParaMovimento);

    // Configurar ordenação da tabela
    document.querySelectorAll('#inventarioTable th').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.sort;
            ordenarTabelaInventario(column);
        });
    });

    // Chamar alertas de estoque
    exibirAlertasEstoqueBaixo();
};

// --- Funções de Carregamento de Dados ---

async function carregarCategoriasInventario() {
    console.log("Carregando categorias do inventário...");
    const timestamp = new Date().getTime(); // Para evitar cache
    try {
        const response = await fetch(`categorias_inventario.txt?t=${timestamp}`);
        if (!response.ok) {
            console.warn(`Erro ao carregar categorias_inventario.txt (${response.status}).`);
            // Se o arquivo não existir ou houver erro, usa um conjunto padrão
            categoriasInventario = ["Materiais Consumíveis", "Reagentes", "Equipamentos", "Outros"];
        } else {
            const text = await response.text();
            categoriasInventario = text.trim().split('\\n').map(c => c.trim()).filter(c => c !== '');
            if (categoriasInventario.length === 0) {
                 categoriasInventario = ["Materiais Consumíveis", "Reagentes", "Equipamentos", "Outros"];
            }
        }
        console.log("Categorias carregadas:", categoriasInventario);
        // Preenche o datalist de categorias
        const datalist = document.getElementById('categoriasSugeridas');
        datalist.innerHTML = '';
        categoriasInventario.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            datalist.appendChild(option);
        });

    } catch (error) {
        console.error("Erro FATAL ao carregar categorias do inventário:", error);
        categoriasInventario = ["Materiais Consumíveis", "Reagentes", "Equipamentos", "Outros"]; // Fallback em caso de erro de rede
        alert("Não foi possível carregar a lista de categorias. Usando categorias padrão.");
    }
}

async function carregarItensInventario() {
    console.log("Carregando itens do inventário do Firestore...");
    const inventarioRef = window.firebaseFirestoreCollection(window.firestoreDb, 'inventario');
    const q = window.firebaseFirestoreQuery(inventarioRef, window.firebaseFirestoreOrderBy('nome', 'asc')); // Ordena por nome
    const querySnapshot = await window.firebaseFirestoreGetDocs(q);

    itensInventario = [];
    const tbody = document.getElementById('inventarioTableBody');
    tbody.innerHTML = ''; // Limpa a tabela

    if (querySnapshot.empty) {
        tbody.innerHTML = '<tr><td colspan="7">Nenhum item no inventário.</td></tr>';
        return;
    }

    querySnapshot.forEach(doc => {
        const item = { id: doc.id, ...doc.data() };
        itensInventario.push(item);
        adicionarItemNaTabela(item);
    });
    console.log("Itens do inventário carregados:", itensInventario);
    exibirAlertasEstoqueBaixo(); // Atualiza alertas após carregar itens
}

function adicionarItemNaTabela(item) {
    const tbody = document.getElementById('inventarioTableBody');
    const row = tbody.insertRow();
    row.dataset.itemId = item.id; // Armazena o ID do Firestore na linha

    const dataValidadeFormatada = item.dataValidade ? new Date(item.dataValidade).toLocaleDateString('pt-BR') : 'N/A';

    row.innerHTML = `
        <td>${item.nome}</td>
        <td>${item.categoria || 'N/A'}</td>
        <td>${item.quantidadeAtual}</td>
        <td>${item.unidadeMedida || 'N/A'}</td>
        <td>${dataValidadeFormatada}</td>
        <td>${item.limiteMinimo}</td>
        <td>
            <button onclick="editarItem('${item.id}')">Editar</button>
            <button onclick="confirmarExcluirItem('${item.id}', '${item.nome}')">Excluir</button>
        </td>
    `;
}

// --- Funções de Manipulação de Itens ---

async function salvarItemInventario() {
    console.log("Tentando salvar/atualizar item do inventário...");
    const itemId = document.getElementById('itemId').value;
    const nome = document.getElementById('nomeItem').value.trim();
    const categoria = document.getElementById('categoria').value.trim();
    const unidadeMedida = document.getElementById('unidadeMedida').value.trim();
    const localizacao = document.getElementById('localizacao').value.trim();
    const dataValidade = document.getElementById('dataValidade').value;
    const limiteMinimo = parseInt(document.getElementById('limiteMinimo').value, 10);
    const fornecedor = document.getElementById('fornecedor').value.trim();
    const observacoes = document.getElementById('observacoesItem').value.trim();

    if (!nome) {
        alert("O nome do item é obrigatório.");
        return;
    }
    if (isNaN(limiteMinimo) || limiteMinimo < 0) {
        alert("O limite mínimo deve ser um número válido e não negativo.");
        return;
    }

    const itemData = {
        nome: nome,
        categoria: categoria,
        // quantidadeAtual será inicializada apenas na criação e atualizada por movimentos
        unidadeMedida: unidadeMedida,
        localizacao: localizacao,
        dataValidade: dataValidade,
        limiteMinimo: limiteMinimo,
        fornecedor: fornecedor,
        observacoes: observacoes,
        ultimaAtualizacao: window.firebaseFirestoreServerTimestamp()
    };

    try {
        if (itemId) {
            // Atualizar item existente
            const itemRef = window.firebaseFirestoreDoc(window.firestoreDb, 'inventario', itemId);
            await window.firebaseFirestoreUpdateDoc(itemRef, itemData);
            alert("Item atualizado com sucesso!");
        } else {
            // Adicionar novo item
            // Garante que a quantidade inicial é 0 para novos itens
            itemData.quantidadeAtual = 0; 
            const inventarioRef = window.firebaseFirestoreCollection(window.firestoreDb, 'inventario');
            await window.firebaseFirestoreAddDoc(inventarioRef, itemData);
            alert("Item cadastrado com sucesso! Quantidade inicial definida como 0.");
        }
        limparFormularioItem();
        carregarItensInventario(); // Recarrega a lista para refletir as mudanças
    } catch (error) {
        console.error("Erro ao salvar item:", error);
        alert("Erro ao salvar item. Verifique o console para detalhes.");
    }
}

async function editarItem(itemId) {
    console.log("Editando item com ID:", itemId);
    const itemRef = window.firebaseFirestoreDoc(window.firestoreDb, 'inventario', itemId);
    const docSnap = await window.firebaseFirestoreGetDoc(itemRef);

    if (docSnap.exists) {
        const item = docSnap.data();
        document.getElementById('itemId').value = itemId;
        document.getElementById('nomeItem').value = item.nome;
        document.getElementById('categoria').value = item.categoria || '';
        document.getElementById('unidadeMedida').value = item.unidadeMedida || '';
        document.getElementById('localizacao').value = item.localizacao || '';
        document.getElementById('dataValidade').value = item.dataValidade || '';
        document.getElementById('limiteMinimo').value = item.limiteMinimo;
        document.getElementById('fornecedor').value = item.fornecedor || '';
        document.getElementById('observacoesItem').value = item.observacoes || '';
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Volta para o topo do formulário
    } else {
        alert("Item não encontrado.");
        console.error("Item não encontrado para edição:", itemId);
    }
}

async function confirmarExcluirItem(itemId, nomeItem) {
    if (confirm(`Tem certeza que deseja excluir o item "${nomeItem}" do inventário? Esta ação é irreversível.`)) {
        await excluirItemInventario(itemId);
    }
}

async function excluirItemInventario(itemId) {
    console.log("Excluindo item com ID:", itemId);
    try {
        const itemRef = window.firebaseFirestoreDoc(window.firestoreDb, 'inventario', itemId);
        await window.firebaseFirestoreDeleteDoc(itemRef);
        alert("Item excluído com sucesso!");
        carregarItensInventario(); // Recarrega a lista
    } catch (error) {
        console.error("Erro ao excluir item:", error);
        alert("Erro ao excluir item. Verifique o console.");
    }
}

function limparFormularioItem() {
    document.getElementById('itemId').value = '';
    document.getElementById('nomeItem').value = '';
    document.getElementById('categoria').value = '';
    document.getElementById('unidadeMedida').value = '';
    document.getElementById('localizacao').value = '';
    document.getElementById('dataValidade').value = '';
    document.getElementById('limiteMinimo').value = '0';
    document.getElementById('fornecedor').value = '';
    document.getElementById('observacoesItem').value = '';
    document.getElementById('quantidadeAtualDisplay').textContent = '--'; // Limpa display de quantidade atual no movimento
    document.getElementById('itemMovimentoId').value = ''; // Limpa o ID do item selecionado para movimento
    document.getElementById('itemMovimento').value = ''; // Limpa o campo de pesquisa de movimento
}

// --- Funções de Movimentação de Estoque ---

// Sugere itens no campo de movimentação
function sugestaoItemMovimento() {
    const input = document.getElementById('itemMovimento');
    const datalist = document.getElementById('itensDisponiveis');
    const termo = input.value.toLowerCase();

    datalist.innerHTML = ''; // Limpa sugestões anteriores

    const itensFiltrados = itensInventario.filter(item =>
        item.nome.toLowerCase().includes(termo)
    );

    itensFiltrados.forEach(item => {
        const option = document.createElement('option');
        option.value = item.nome;
        option.dataset.itemId = item.id; // Armazena o ID no dataset da opção
        datalist.appendChild(option);
    });

    // Quando o usuário seleciona um item da datalist, seu ID é capturado no evento 'change'
}

// Carrega a quantidade atual do item selecionado no campo de movimentação
function carregarQuantidadeAtualParaMovimento() {
    const input = document.getElementById('itemMovimento');
    const selectedOption = document.querySelector(`#itensDisponiveis option[value='${input.value}']`);

    if (selectedOption) {
        const itemId = selectedOption.dataset.itemId;
        document.getElementById('itemMovimentoId').value = itemId; // Salva o ID real
        const item = itensInventario.find(i => i.id === itemId);
        if (item) {
            document.getElementById('quantidadeAtualDisplay').textContent = item.quantidadeAtual;
        } else {
            document.getElementById('quantidadeAtualDisplay').textContent = '--';
        }
    } else {
        document.getElementById('quantidadeAtualDisplay').textContent = '--';
        document.getElementById('itemMovimentoId').value = '';
    }
}


async function registrarMovimentoEstoque() {
    console.log("Registrando movimento de estoque...");
    const itemId = document.getElementById('itemMovimentoId').value;
    const itemNome = document.getElementById('itemMovimento').value.trim();
    const tipoMovimento = document.getElementById('tipoMovimento').value;
    const quantidadeMovimento = parseInt(document.getElementById('quantidadeMovimento').value, 10);
    const responsavel = document.getElementById('responsavelMovimento').value.trim();
    const motivo = document.getElementById('motivoMovimento').value.trim();

    if (!itemId || !itemNome) {
        alert("Selecione um item válido para movimentar.");
        return;
    }
    if (isNaN(quantidadeMovimento) || quantidadeMovimento <= 0) {
        alert("A quantidade a movimentar deve ser um número positivo.");
        return;
    }
    if (!responsavel) {
        alert("O campo 'Responsável' é obrigatório.");
        return;
    }

    const itemRef = window.firebaseFirestoreDoc(window.firestoreDb, 'inventario', itemId);

    try {
        // Usar uma transação para garantir a atomicidade da atualização de estoque
        await window.firestoreDb.runTransaction(async (transaction) => {
            const itemDoc = await transaction.get(itemRef);

            if (!itemDoc.exists) {
                throw "Item não encontrado no inventário!";
            }

            const itemAtual = itemDoc.data();
            const quantidadeAntes = itemAtual.quantidadeAtual;
            let novaQuantidade = quantidadeAntes;

            if (tipoMovimento === 'Entrada') {
                novaQuantidade += quantidadeMovimento;
            } else { // Saída
                if (quantidadeAntes < quantidadeMovimento) {
                    throw "Quantidade em estoque insuficiente para esta saída.";
                }
                novaQuantidade -= quantidadeMovimento;
            }

            // Atualiza o item no inventário
            transaction.update(itemRef, {
                quantidadeAtual: novaQuantidade,
                ultimaAtualizacao: window.firebaseFirestoreServerTimestamp()
            });

            // Registra o log da movimentação
            const inventarioLogRef = window.firebaseFirestoreCollection(window.firestoreDb, 'inventario_log');
            transaction.set(inventarioLogRef.doc(), { // Cria um novo documento com ID automático
                itemId: itemId,
                nomeItem: itemNome, // Salva o nome para facilitar consultas no log
                tipoMovimento: tipoMovimento,
                quantidade: quantidadeMovimento,
                quantidadeAntes: quantidadeAntes,
                quantidadeDepois: novaQuantidade,
                dataMovimento: window.firebaseFirestoreServerTimestamp(),
                responsavel: responsavel,
                motivo: motivo
            });
        });

        alert("Movimento de estoque registrado com sucesso!");
        limparFormularioMovimento();
        carregarItensInventario(); // Recarrega a lista e alertas
    } catch (error) {
        console.error("Erro ao registrar movimento de estoque:", error);
        alert(`Erro ao registrar movimento: ${error}`);
    }
}

function limparFormularioMovimento() {
    document.getElementById('itemMovimento').value = '';
    document.getElementById('itemMovimentoId').value = '';
    document.getElementById('tipoMovimento').value = 'Entrada';
    document.getElementById('quantidadeMovimento').value = '1';
    document.getElementById('responsavelMovimento').value = '';
    document.getElementById('motivoMovimento').value = '';
    document.getElementById('quantidadeAtualDisplay').textContent = '--';
}

// --- Funções de Filtragem e Ordenação ---

function filtrarItensInventario() {
    const termo = document.getElementById('pesquisaInventario').value.toLowerCase();
    const rows = document.querySelectorAll('#inventarioTableBody tr');

    rows.forEach(row => {
        const nome = row.cells[0].textContent.toLowerCase();
        const categoria = row.cells[1].textContent.toLowerCase();
        const localizacao = row.cells[4].textContent.toLowerCase(); // Supondo que localizacao esteja nesta célula

        if (nome.includes(termo) || categoria.includes(termo) || localizacao.includes(termo)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

let sortDirection = {}; // Para controlar a direção da ordenação por coluna

function ordenarTabelaInventario(column) {
    const tbody = document.getElementById('inventarioTableBody');
    const rows = Array.from(tbody.querySelectorAll('tr'));

    const isAsc = sortDirection[column] === 'asc';
    sortDirection[column] = isAsc ? 'desc' : 'asc';

    rows.sort((a, b) => {
        let aValue, bValue;

        switch (column) {
            case 'nome':
            case 'categoria':
            case 'unidadeMedida':
            case 'localizacao':
            case 'fornecedor':
                aValue = a.cells[getColumnIndex(column)].textContent.toLowerCase();
                bValue = b.cells[getColumnIndex(column)].textContent.toLowerCase();
                break;
            case 'quantidadeAtual':
            case 'limiteMinimo':
                aValue = parseFloat(a.cells[getColumnIndex(column)].textContent);
                bValue = parseFloat(b.cells[getColumnIndex(column)].textContent);
                break;
            case 'dataValidade':
                aValue = new Date(a.cells[getColumnIndex(column)].textContent.split('/').reverse().join('-') || '9999-12-31'); // Tratar N/A
                bValue = new Date(b.cells[getColumnIndex(column)].textContent.split('/').reverse().join('-') || '9999-12-31');
                break;
            default:
                return 0;
        }

        if (aValue < bValue) return isAsc ? -1 : 1;
        if (aValue > bValue) return isAsc ? 1 : -1;
        return 0;
    });

    // Remove as linhas existentes e adiciona-as na nova ordem
    rows.forEach(row => tbody.appendChild(row));
}

// Função auxiliar para obter o índice da coluna
function getColumnIndex(columnName) {
    const headers = document.querySelectorAll('#inventarioTable th');
    let index = -1;
    headers.forEach((header, i) => {
        if (header.dataset.sort === columnName) {
            index = i;
        }
    });
    return index;
}


// --- Funções de Alerta ---

function exibirAlertasEstoqueBaixo() {
    const alertasDiv = document.getElementById('alertasEstoqueBaixo');
    alertasDiv.innerHTML = '<h4>Alertas de Estoque Baixo:</h4>';
    let temAlerta = false;

    itensInventario.forEach(item => {
        if (item.quantidadeAtual <= item.limiteMinimo) {
            temAlerta = true;
            const p = document.createElement('p');
            p.classList.add('alert-item');
            p.textContent = `🚨 ${item.nome} (${item.quantidadeAtual} ${item.unidadeMedida}) está abaixo ou no limite mínimo (${item.limiteMinimo} ${item.unidadeMedida}).`;
            alertasDiv.appendChild(p);
        }
    });

    if (!temAlerta) {
        alertasDiv.innerHTML += '<p>Nenhum alerta no momento.</p>';
    }
}

// --- Geração de Relatórios em PDF ---

async function gerarRelatorioInventarioPDF() {
    console.log("Gerando relatório de inventário PDF...");
    if (itensInventario.length === 0) {
        alert("Não há itens no inventário para gerar relatório.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let currentY = 15;

    // Cabeçalho
    doc.setFontSize(18);
    doc.text("Relatório de Inventário SISLAB", 105, currentY, null, null, "center");
    currentY += 10;
    doc.setFontSize(10);
    doc.text(`Data de Geração: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, 105, currentY, null, null, "center");
    currentY += 15;

    // Tabela de itens
    const headers = [
        ["Nome do Item", "Categoria", "Qtd. Atual", "Unidade", "Validade", "Limite Mín.", "Localização"]
    ];

    const data = itensInventario.map(item => [
        item.nome,
        item.categoria || 'N/A',
        item.quantidadeAtual,
        item.unidadeMedida || 'N/A',
        item.dataValidade ? new Date(item.dataValidade).toLocaleDateString('pt-BR') : 'N/A',
        item.limiteMinimo,
        item.localizacao || 'N/A'
    ]);

    doc.autoTable({
        startY: currentY,
        head: headers,
        body: data,
        theme: 'striped',
        headStyles: { fillColor: [26, 43, 76] }, // Cor do cabeçalho similar aos botões
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
            0: { cellWidth: 40 }, // Nome do Item
            1: { cellWidth: 25 }, // Categoria
            2: { cellWidth: 15 }, // Qtd. Atual
            3: { cellWidth: 15 }, // Unidade
            4: { cellWidth: 20 }, // Validade
            5: { cellWidth: 20 }, // Limite Mín.
            6: { cellWidth: 35 }  // Localização
        },
        didDrawPage: function (data) {
            // Rodapé com número de página
            doc.setFontSize(8);
            doc.text("Página " + doc.internal.getNumberOfPages(), data.settings.margin.left, doc.internal.pageSize.height - 10);
        }
    });

    currentY = doc.autoTable.previous.finalY + 10;

    // Incluir alertas de estoque baixo no PDF
    const itensComAlerta = itensInventario.filter(item => item.quantidadeAtual <= item.limiteMinimo);
    if (itensComAlerta.length > 0) {
        doc.setFontSize(12);
        doc.text("Itens com Estoque Baixo:", 20, currentY);
        currentY += 8;
        doc.setFontSize(10);
        itensComAlerta.forEach(item => {
            if (currentY > doc.internal.pageSize.height - 30) { // Nova página se não couber
                doc.addPage();
                currentY = 20;
            }
            doc.text(`- ${item.nome} (Atual: ${item.quantidadeAtual}, Mínimo: ${item.limiteMinimo})`, 25, currentY);
            currentY += 7;
        });
    }


    doc.output('dataurlnewwindow', { filename: 'Relatorio_Inventario_SISLAB.pdf' });
                }

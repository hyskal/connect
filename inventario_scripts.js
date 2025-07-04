// VERSÃO: 2.0.1 (inventario_scripts.js)
// CHANGELOG:
// - Nova Versão: Marca o início oficial da Versão 2.0 do Sistema de Inventário.
// - Adicionado: Campo cod (código sequencial numérico) em itens, com geração automática via transação no Firebase (config/contadores).
// - Adicionado: categorias para itens, com carregamento dinâmico de Gist público e padrão "Geral".
// - Modificado: listarItensInventario() para exibir cod e categoria, incluir os controles de movimentação direta (input de quantidade e botões +/-), e implementar filtragem por cod/item e por categoria.
// - Adicionado: updateItemQuantityDirectly() para gerenciar as movimentações rápidas via botões +/-, incluindo solicitação do operador e alerta de estoque negativo.
// - Modificado: saveOrUpdateItem() para: integrar solicitação de operador; gerar e salvar cod para novos itens; salvar categoria e observacoes gerais; implementar alerta de estoque negativo para saídas via edição; registrar logs detalhados (tipo "CADASTRO", "ENTRADA", "SAIDA", "AJUSTE"), incluindo itemCod e operador.
// - Modificado: loadItemForEdit() para preencher todos os campos do formulário (cod, item, quantidade, observacoes, categoria).
// - Modificado: deleteItem() para integrar solicitação de operador e registrar log de "REMOCAO" detalhado.
// - Modificado: showItemLog() e hideItemLog() para exibir log por item com campos itemCod e operador.
// - Remanejado e Modificado: Funções de relatório imprimirRelatorioInventario() e gerarRelatorioReposicao() para este script, acionadas por botões na inventario.html. Incluem solicitação de operador e exibição de cod e categoria.
// - Modificado: A leitura das categorias para itens agora é feita de um arquivo local categorias_inventario.txt na raiz do projeto, em vez de um Gist público.
// - Refatorado: Removidas as constantes relacionadas ao Gist para categorias.


// --- CONFIGURAÇÃO DO ARQUIVO LOCAL PARA CATEGORIAS ---
const LOCAL_FILENAME_CATEGORIES = 'categorias_inventario.txt'; // <-- Nome do arquivo local na raiz


// Variáveis Globais de Estado
let currentEditingItemId = null;
let categoriasDisponiveis = []; // Armazena as categorias carregadas do arquivo local

// --- Event Listeners Iniciais ---
document.addEventListener('DOMContentLoaded', async () => {
    // Carregar categorias antes de listar os itens, pois a lista depende delas
    await loadCategories(); 
    listarItensInventario(); // Lista itens após carregar categorias

    document.getElementById('saveItemBtn').addEventListener('click', saveOrUpdateItem);
    document.getElementById('clearItemFormBtn').addEventListener('click', clearItemForm);
    document.getElementById('searchInventory').addEventListener('input', listarItensInventario);
    document.getElementById('filterCategory').addEventListener('change', listarItensInventario); // Filtra por categoria

    // Adiciona event listeners para os botões de relatório (agora na inventario.html)
    document.getElementById('printInventoryReportBtn').addEventListener('click', imprimirRelatorioInventario);
    document.getElementById('generateReplenishmentReportBtn').addEventListener('click', gerarRelatorioReposicao);
});

// --- Funções Auxiliares Comuns ---
async function getOperadorName() {
    let operador = '';
    while (true) {
        operador = prompt("Por favor, digite seu nome (operador):");
        if (operador === null) { // Usuário clicou em cancelar
            return null; 
        }
        if (operador.trim() !== '') {
            return operador.trim();
        }
        alert("O nome do operador não pode ser vazio. Por favor, digite seu nome.");
    }
}

function showError(elementId, message) {
    const inputElement = document.getElementById(elementId);
    const errorDiv = document.getElementById(`${elementId}-error`);
    if (inputElement && errorDiv) {
        inputElement.classList.add('error');
        errorDiv.textContent = message;
    }
}

function clearError(elementId) {
    const inputElement = document.getElementById(elementId);
    const errorDiv = document.getElementById(`${elementId}-error`);
    if (inputElement && errorDiv) {
        inputElement.classList.remove('error');
        errorDiv.textContent = '';
    }
}

function formatarCod(num) {
    // Garante 4 dígitos com zeros à esquerda
    return String(num).padStart(4, '0');
}

// --- Funções de Carregamento Dinâmico ---
async function loadCategories() {
    const itemCategorySelect = document.getElementById('itemCategory');
    const filterCategorySelect = document.getElementById('filterCategory');
    const timestamp = new Date().getTime(); // Para evitar cache do navegador no arquivo local

    // Acessa o arquivo local na raiz do projeto
    const localFileUrl = `${LOCAL_FILENAME_CATEGORIES}?t=${timestamp}`; 

    try {
        const response = await fetch(localFileUrl);
        if (!response.ok) {
            console.warn(`Erro ao carregar categorias do arquivo local (${response.status}). Usando categorias padrão.`);
            categoriasDisponiveis = ["Geral"]; // Categoria padrão se o arquivo falhar
        } else {
            const text = await response.text();
            categoriasDisponiveis = text.trim().split('\n').map(c => c.trim()).filter(c => c !== '');
            if (categoriasDisponiveis.length === 0) {
                categoriasDisponiveis = ["Geral"]; // Garante "Geral" se o arquivo estiver vazio
            }
        }
    } catch (error) {
        console.error("Erro FATAL ao carregar categorias do arquivo local:", error);
        categoriasDisponiveis = ["Geral"]; // Categoria padrão em caso de erro fatal
    }

    // Popular o select do formulário de cadastro/edição
    itemCategorySelect.innerHTML = '';
    categoriasDisponiveis.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        itemCategorySelect.appendChild(option);
    });
    // Define "Geral" como padrão, ou a primeira opção se "Geral" não existir
    itemCategorySelect.value = "Geral"; 
    if (itemCategorySelect.selectedIndex === -1 && categoriasDisponiveis.length > 0) {
        itemCategorySelect.selectedIndex = 0;
    }


    // Popular o select de filtro por categoria
    filterCategorySelect.innerHTML = '<option value="">Todas as Categorias</option>';
    categoriasDisponiveis.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        filterCategorySelect.appendChild(option);
    });
}


// --- Funções de CRUD de Itens ---

async function listarItensInventario() {
    const inventoryListBody = document.querySelector('#inventoryList tbody');
    inventoryListBody.innerHTML = '<tr><td colspan="7">Carregando itens...</td></tr>'; // 7 colunas, ajustado no HTML para 8 (cod+mov_direta)
    
    const searchTerm = document.getElementById('searchInventory').value.toLowerCase();
    const filterCategory = document.getElementById('filterCategory').value; // Valor da categoria selecionada para filtro
    let items = [];

    if (typeof window.firestoreDb === 'undefined' || !window.firestoreDb) {
        inventoryListBody.innerHTML = '<tr><td colspan="7">Banco de dados não inicializado.</td></tr>';
        return;
    }

    try {
        const inventarioRef = window.firebaseFirestoreCollection(window.firestoreDb, 'inventario');
        // Ordena por item (descrição) para a listagem principal
        let q = window.firebaseFirestoreQuery(inventarioRef, window.firebaseFirestoreOrderBy('item', 'asc')); 

        const querySnapshot = await window.firebaseFirestoreGetDocs(q);
        items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Filtragem em memória (para até 300 itens, performance ok)
        let filteredItems = items.filter(item => {
            const matchesSearch = searchTerm === '' || 
                                  (item.item && item.item.toLowerCase().includes(searchTerm)) || 
                                  (item.cod && item.cod.toLowerCase().includes(searchTerm)); // Busca por cod ou item (descrição)
            const matchesCategory = filterCategory === '' || (item.categoria && item.categoria === filterCategory);
            return matchesSearch && matchesCategory;
        });

        if (filteredItems.length === 0) {
            inventoryListBody.innerHTML = '<tr><td colspan="7">Nenhum item encontrado com os filtros aplicados.</td></tr>'; // 7 colunas, ajustado no HTML para 8
            return;
        }

        inventoryListBody.innerHTML = ''; // Limpa antes de preencher
        filteredItems.forEach(item => {
            const row = inventoryListBody.insertRow();
            row.dataset.itemId = item.id; // Guarda o ID no elemento da linha
            
            const dataCadastroDate = item.dataCadastro ? item.dataCadastro.toDate() : null;
            const dataCadastroFormatada = dataCadastroDate ? dataCadastroDate.toLocaleDateString('pt-BR') : 'N/A';

            // Colunas da tabela
            row.insertCell(0).textContent = item.cod || 'N/A'; // Cód.
            row.insertCell(1).textContent = item.item; // Descrição
            row.insertCell(2).textContent = item.quantidade; // Qtd.
            row.insertCell(3).textContent = item.categoria || 'Geral'; // Categoria
            row.insertCell(4).textContent = dataCadastroFormatada; // Data Cadastro
            
            // Coluna Ações
            const actionsCell = row.insertCell(5);
            actionsCell.classList.add('action-buttons');
            
            const editButton = document.createElement('button');
            editButton.textContent = 'Editar';
            editButton.classList.add('edit-btn');
            // Passa todos os campos necessários para edição
            editButton.onclick = () => loadItemForEdit(item.id, item.cod, item.item, item.quantidade, item.observacoes, item.categoria);
            actionsCell.appendChild(editButton);

            const viewLogButton = document.createElement('button');
            viewLogButton.textContent = 'Ver Log';
            viewLogButton.classList.add('view-log-btn'); 
            viewLogButton.onclick = () => showItemLog(item.id, item.item, item.cod); // Passa item.item e item.cod para o log
            actionsCell.appendChild(viewLogButton);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Remover';
            deleteButton.classList.add('delete-btn');
            // Passa item.item, item.cod e quantidade atual para o log de remoção
            deleteButton.onclick = () => deleteItem(item.id, item.item, item.cod, item.quantidade); 
            actionsCell.appendChild(deleteButton);

            // Coluna Movimentação Direta
            const directMoveCell = row.insertCell(6);
            directMoveCell.classList.add('direct-movement-controls'); // Adiciona classe para estilos
            directMoveCell.style.whiteSpace = 'nowrap'; // Evita quebra de linha

            const moveInput = document.createElement('input');
            moveInput.type = 'number';
            moveInput.value = '1'; // Padrão 1
            moveInput.min = '1';
            moveInput.classList.add('movement-input');
            directMoveCell.appendChild(moveInput);

            const plusButton = document.createElement('button');
            plusButton.textContent = '+';
            plusButton.classList.add('movement-button', 'plus');
            // Ao clicar, atualiza a quantidade diretamente com o valor do input
            plusButton.onclick = () => updateItemQuantityDirectly(item.id, item.item, item.cod, item.quantidade, parseInt(moveInput.value));
            directMoveCell.appendChild(plusButton);

            const minusButton = document.createElement('button');
            minusButton.textContent = '-';
            minusButton.classList.add('movement-button', 'minus');
            // Ao clicar, atualiza a quantidade diretamente com o valor NEGATIVO do input
            minusButton.onclick = () => updateItemQuantityDirectly(item.id, item.item, item.cod, item.quantidade, -parseInt(moveInput.value));
            directMoveCell.appendChild(minusButton);
        });

    } catch (error) {
        console.error("Erro ao listar itens do inventário:", error);
        inventoryListBody.innerHTML = '<tr><td colspan="7">Erro ao carregar itens.</td></tr>'; // 7 colunas, ajustado no HTML para 8
    }
}

function clearItemForm() {
    document.getElementById('itemCod').value = ''; // Limpa o cod
    document.getElementById('itemDescription').value = '';
    document.getElementById('itemQuantity').value = '0';
    document.getElementById('itemObservations').value = ''; 
    document.getElementById('itemCategory').value = 'Geral'; // Reseta para categoria padrão
    document.getElementById('itemIdToEdit').value = '';
    document.getElementById('saveItemBtn').textContent = 'Salvar Item';
    clearError('itemDescription');
    clearError('itemQuantity');
    currentEditingItemId = null; // Reseta o ID do item em edição
    hideItemLog(); // Oculta o log caso estivesse aberto
}

async function saveOrUpdateItem() {
    const itemCodInput = document.getElementById('itemCod');
    const descriptionInput = document.getElementById('itemDescription');
    const quantityInput = document.getElementById('itemQuantity');
    const observationsInput = document.getElementById('itemObservations'); 
    const categorySelect = document.getElementById('itemCategory'); 
    const itemIdToEdit = document.getElementById('itemIdToEdit').value;

    const description = descriptionInput.value.trim();
    const quantity = parseInt(quantityInput.value);
    const observations = observationsInput.value.trim();
    const category = categorySelect.value;

    let isValid = true;
    if (!description) {
        showError('itemDescription', 'A descrição é obrigatória.');
        isValid = false;
    } else {
        clearError('itemDescription');
    }
    if (isNaN(quantity) || quantity < 0) { // Quantidade pode ser 0 no cadastro
        showError('itemQuantity', 'Quantidade inválida. Deve ser um número maior ou igual a zero.');
        isValid = false;
    } else {
        clearError('itemQuantity');
    }

    if (!isValid) return;

    const operador = await getOperadorName();
    if (operador === null) {
        alert("Operação de salvar/atualizar item cancelada: Nome do operador não fornecido.");
        return;
    }

    try {
        const inventarioRef = window.firebaseFirestoreCollection(window.firestoreDb, 'inventario');
        const logRef = window.firebaseFirestoreCollection(window.firestoreDb, 'inventario_log');

        if (itemIdToEdit) { // Modo de Edição (Item Existente)
            const itemDocRef = window.firebaseFirestoreDoc(window.firestoreDb, 'inventario', itemIdToEdit);
            const docSnap = await window.firebaseFirestoreGetDoc(itemDocRef);
            const oldData = docSnap.data();

            const oldQuantity = oldData.quantidade;
            const quantityChange = quantity - oldQuantity;
            const currentItemCod = oldData.cod; // Pega o COD atual do item

            let tipoMovimentoLog = "AJUSTE"; 
            if (quantityChange > 0) {
                tipoMovimentoLog = "ENTRADA";
            } else if (quantityChange < 0) {
                tipoMovimentoLog = "SAIDA";
            }

            // Alerta de estoque negativo para saída em edição
            if (tipoMovimentoLog === "SAIDA" && quantity < 0) { // A nova quantidade não pode ser negativa
                alert(`Impossível realizar a saída. A nova quantidade (${quantity}) resultaria em estoque negativo.`);
                return;
            }

            await window.firebaseFirestoreUpdateDoc(itemDocRef, {
                item: description, 
                quantidade: quantity,
                observacoes: observations,
                categoria: category, 
                ultimaAtualizacao: window.firebaseFirestoreServerTimestamp()
            });

            // Registrar no log SÓ SE HOUVER MUDANÇA RELEVANTE
            if (quantityChange !== 0 || oldData.item !== description || oldData.observacoes !== observations || oldData.categoria !== category) {
                await window.firebaseFirestoreAddDoc(logRef, {
                    itemId: itemIdToEdit,
                    itemNome: description, 
                    itemCod: currentItemCod, // COD do item no momento da edição
                    tipoMovimento: tipoMovimentoLog,
                    quantidadeMovimentada: quantityChange, 
                    quantidadeAntes: oldQuantity,
                    quantidadeDepois: quantity,
                    dataHoraMovimento: window.firebaseFirestoreServerTimestamp(),
                    observacoesMovimento: (quantityChange !== 0 ? `Qtd. de ${oldQuantity} para ${quantity}. ` : '') + 
                                 (oldData.item !== description ? `Desc. de '${oldData.item}' para '${description}'. ` : '') +
                                 (oldData.observacoes !== observations ? `Obs. atualizada. ` : '') +
                                 (oldData.categoria !== category ? `Cat. de '${oldData.categoria}' para '${category}'.` : ''),
                    operador: operador
                });
            }
            alert('Item atualizado com sucesso!');

        } else { // Modo de Cadastro (Novo Item)
            // Geração do código sequencial via transação
            const configRef = window.firebaseFirestoreCollection(window.firestoreDb, 'config');
            const counterDocRef = window.firebaseFirestoreDoc(configRef, 'contadores');

            let newCod = '';
            await window.firebaseFirestoreRunTransaction(window.firestoreDb, async (transaction) => {
                const counterDoc = await transaction.get(counterDocRef);
                let currentCounter = 0;
                if (counterDoc.exists) {
                    currentCounter = counterDoc.data().ultimoCodInventario || 0;
                }
                const nextCounter = currentCounter + 1;
                newCod = formatarCod(nextCounter); // Formata com zeros à esquerda
                transaction.set(counterDocRef, { ultimoCodInventario: nextCounter });
            });

            const newItemRef = await window.firebaseFirestoreAddDoc(inventarioRef, {
                cod: newCod, // Salva o novo código
                item: description, 
                quantidade: quantity,
                observacoes: observations,
                categoria: category, 
                dataCadastro: window.firebaseFirestoreServerTimestamp(),
                ultimaAtualizacao: window.firebaseFirestoreServerTimestamp()
            });

            // Registrar no log
            await window.firebaseFirestoreAddDoc(logRef, {
                itemId: newItemRef.id,
                itemNome: description,
                itemCod: newCod,
                tipoMovimento: "CADASTRO", // Tipo de movimento para novo item
                quantidadeMovimentada: quantity,
                quantidadeAntes: 0, 
                quantidadeDepois: quantity,
                dataHoraMovimento: window.firebaseFirestoreServerTimestamp(),
                observacoesMovimento: "Cadastro inicial do item",
                operador: operador
            });
            alert('Item salvo com sucesso! Código gerado: ' + newCod);
        }
        clearItemForm();
        listarItensInventario(); // Atualiza a lista
    } catch (error) {
        console.error("Erro ao salvar/atualizar item:", error);
        alert("Erro ao salvar/atualizar item. Verifique o console.");
    }
}

async function loadItemForEdit(id, cod, item, quantidade, observacoes, categoria) {
    document.getElementById('itemCod').value = cod || ''; 
    document.getElementById('itemDescription').value = item;
    document.getElementById('itemQuantity').value = quantidade;
    document.getElementById('itemObservations').value = observacoes || ''; 
    document.getElementById('itemCategory').value = categoria || 'Geral'; 
    document.getElementById('itemIdToEdit').value = id;
    document.getElementById('saveItemBtn').textContent = 'Atualizar Item';
    currentEditingItemId = id; 

    window.scrollTo({ top: 0, behavior: 'smooth' }); 
}

async function updateItemQuantityDirectly(itemId, itemDescription, itemCod, currentQuantity, quantityChange) {
    const operador = await getOperadorName();
    if (operador === null) {
        alert("Operação de movimentação cancelada: Nome do operador não fornecido.");
        return;
    }

    const newQuantity = currentQuantity + quantityChange;
    const tipoMovimento = quantityChange > 0 ? "ENTRADA" : "SAIDA";

    // Alerta de estoque negativo
    if (newQuantity < 0) {
        alert(`Impossível realizar a saída. Quantidade atual (${currentQuantity}) é menor que a quantidade a ser retirada (${Math.abs(quantityChange)}).`);
        return;
    }
    // Alerta se a quantidade a ser movimentada for 0 ou NaN
    if (isNaN(quantityChange) || quantityChange === 0) {
        alert("Por favor, digite uma quantidade válida (maior que 0) para movimentar.");
        return;
    }

    try {
        const itemDocRef = window.firebaseFirestoreDoc(window.firestoreDb, 'inventario', itemId);
        
        await window.firebaseFirestoreUpdateDoc(itemDocRef, {
            quantidade: newQuantity,
            ultimaAtualizacao: window.firebaseFirestoreServerTimestamp()
        });

        // Registrar no log
        const logRef = window.firebaseFirestoreCollection(window.firestoreDb, 'inventario_log');
        await window.firebaseFirestoreAddDoc(logRef, {
            itemId: itemId,
            itemNome: itemDescription,
            itemCod: itemCod,
            tipoMovimento: tipoMovimento,
            quantidadeMovimentada: quantityChange,
            quantidadeAntes: currentQuantity,
            quantidadeDepois: newQuantity,
            dataHoraMovimento: window.firebaseFirestoreServerTimestamp(),
            observacoesMovimento: `Movimentação direta: ${quantityChange > 0 ? '+' : ''}${quantityChange} unidades.`,
            operador: operador
        });

        alert(`Quantidade de "${itemDescription}" atualizada para ${newQuantity}.`);
        listarItensInventario(); // Atualiza a lista para refletir a nova quantidade
        hideItemLog(); // Oculta o log caso estivesse aberto
    } catch (error) {
        console.error("Erro ao atualizar quantidade diretamente:", error);
        alert("Erro ao atualizar quantidade. Verifique o console.");
    }
}


async function deleteItem(id, itemNome, itemCod, quantidadeAtual) {
    if (!confirm(`Tem certeza que deseja remover o item "${itemNome}" (Cód: ${itemCod})? Esta ação não pode ser desfeita.`)) {
        return;
    }

    const operador = await getOperadorName();
    if (operador === null) {
        alert("Remoção de item cancelada: Nome do operador não fornecido.");
        return;
    }

    try {
        const itemDocRef = window.firebaseFirestoreDoc(window.firestoreDb, 'inventario', id);
        await window.firebaseFirestoreDeleteDoc(itemDocRef);
        
        // Registrar no log
        const logRef = window.firebaseFirestoreCollection(window.firestoreDb, 'inventario_log');
        await window.firebaseFirestoreAddDoc(logRef, {
            itemId: id,
            itemNome: itemNome,
            itemCod: itemCod,
            tipoMovimento: "REMOCAO",
            quantidadeMovimentada: -quantidadeAtual, // Registra como saída total
            quantidadeAntes: quantidadeAtual,
            quantidadeDepois: 0, // A quantidade final é 0 após a remoção
            dataHoraMovimento: window.firebaseFirestoreServerTimestamp(),
            observacoesMovimento: "Item removido do inventário",
            operador: operador
        });
        alert('Item removido com sucesso!');
        listarItensInventario(); // Atualiza a lista
        clearItemForm(); // Limpa o formulário caso estivesse editando o item removido
        hideItemLog(); // Oculta o log caso estivesse aberto
    } catch (error) {
        console.error("Erro ao remover item:", error);
        alert("Erro ao remover item. Verifique o console.");
    }
}

// --- Funções de Log Específico por Item ---
async function showItemLog(itemId, itemDescription, itemCod) { // Adicionado itemCod para o título do log
    const itemLogSection = document.getElementById('itemLogSection');
    const itemLogDescriptionSpan = document.getElementById('itemLogDescription'); // Span dentro do título
    const itemLogTableBody = document.querySelector('#itemLogTable tbody');

    itemLogDescriptionSpan.textContent = `${itemDescription} (Cód: ${itemCod})`; // Título com descrição e código
    itemLogTableBody.innerHTML = '<tr><td colspan="6" style="border: 1px solid #ddd; padding: 8px;">Carregando histórico...</td></tr>';
    itemLogSection.style.display = 'block'; // Mostra a seção do log

    if (typeof window.firestoreDb === 'undefined' || !window.firestoreDb) {
        itemLogTableBody.innerHTML = '<tr><td colspan="6" style="border: 1px solid #ddd; padding: 8px;">Banco de dados não inicializado.</td></tr>';
        return;
    }

    try {
        const logRef = window.firebaseFirestoreCollection(window.firestoreDb, 'inventario_log');
        const q = window.firebaseFirestoreQuery(
            logRef,
            window.firebaseFirestoreWhere('itemId', '==', itemId),
            window.firebaseFirestoreOrderBy('dataHoraMovimento', 'asc') // Ordena por data ascendente para histórico
        );
        const querySnapshot = await window.firebaseFirestoreGetDocs(q);
        const logs = querySnapshot.docs.map(doc => doc.data());

        if (logs.length === 0) {
            itemLogTableBody.innerHTML = '<tr><td colspan="6" style="border: 1px solid #ddd; padding: 8px;">Nenhum histórico encontrado para este item.</td></tr>';
            return;
        }

        itemLogTableBody.innerHTML = ''; // Limpa antes de preencher
        logs.forEach(log => {
            const row = itemLogTableBody.insertRow();
            const dataHoraFormatada = log.dataHoraMovimento ? new Date(log.dataHoraMovimento.toDate()).toLocaleString('pt-BR') : 'N/A';

            row.insertCell(0).textContent = log.tipoMovimento || 'N/A';
            row.insertCell(1).textContent = log.quantidadeMovimentada !== undefined ? log.quantidadeMovimentada.toString() : 'N/A';
            row.insertCell(2).textContent = log.quantidadeDepois !== undefined ? log.quantidadeDepois.toString() : 'N/A'; 
            row.insertCell(3).textContent = dataHoraFormatada;
            row.insertCell(4).textContent = log.operador || 'Desconhecido';
            row.insertCell(5).textContent = log.observacoesMovimento || '';
        });

        window.scrollTo({ top: itemLogSection.offsetTop, behavior: 'smooth' }); // Rola para a seção do log

    } catch (error) {
        console.error("Erro ao carregar histórico do item:", error);
        itemLogTableBody.innerHTML = '<tr><td colspan="6" style="border: 1px solid #ddd; padding: 8px;">Erro ao carregar histórico.</td></tr>';
    }
}

function hideItemLog() {
    document.getElementById('itemLogSection').style.display = 'none';
    document.querySelector('#itemLogTable tbody').innerHTML = '<tr><td colspan="6" style="border: 1px solid #ddd; padding: 8px;">Selecione um item para ver o histórico.</td></tr>';
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola para o topo da página
}

// --- Funções de Relatórios PDF ---
async function imprimirRelatorioInventario() {
    const operador = await getOperadorName();
    if (operador === null) {
        alert("Operação cancelada: Nome do operador não fornecido.");
        return;
    }

    if (typeof window.firestoreDb === 'undefined' || !window.firestoreDb) {
        alert("Banco de dados não inicializado. Não é possível imprimir o relatório de inventário.");
        return;
    }

    let itensInventario = [];
    try {
        const inventarioRef = window.firebaseFirestoreCollection(window.firestoreDb, 'inventario');
        // Ordena por item (descrição) para o relatório
        const q = window.firebaseFirestoreQuery(inventarioRef, window.firebaseFirestoreOrderBy('item', 'asc')); 
        const querySnapshot = await window.firebaseFirestoreGetDocs(q);
        itensInventario = querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
        console.error("Erro ao carregar itens para o relatório de inventário:", error);
        alert("Erro ao carregar itens para o relatório. Verifique o console.");
        return;
    }

    if (itensInventario.length === 0) {
        alert("Não há itens no inventário para imprimir o relatório.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let currentY = 15; // Posição Y inicial no PDF

    // --- Cabeçalho do PDF (reutilizando o padrão do SISLAB) ---
    doc.setFontSize(18);
    doc.text("Laboratório de Análises Clínicas CETEP/LNAB", 105, currentY, null, null, "center");
    currentY += 10;
    doc.setFontSize(10);
    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
    const formattedTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    doc.text(`Data: ${formattedDate} - Hora: ${formattedTime} - Operador: ${operador}`, 105, currentY, null, null, "center");
    currentY += 5;
    doc.setFontSize(8);
    doc.text("Endereço: 233, R. Mario Laérte, 163 - Centro, Alagoinhas - BA, 48005-098", 105, currentY, null, null, "center");
    currentY += 4;
    doc.text("Site: https://www.ceteplnab.com.br/", 105, currentY, null, null, "center");
    currentY += 6;
    doc.setLineWidth(0.5);
    doc.line(20, currentY, 190, currentY);
    currentY += 10;

    // --- Título do Relatório ---
    doc.setFontSize(14);
    doc.text("RELATÓRIO DE INVENTÁRIO ATUAL", 105, currentY, null, null, "center");
    currentY += 8;
    doc.setLineWidth(0.2);
    doc.line(20, currentY, 190, currentY);
    currentY += 10;

    // --- Conteúdo: Itens do Inventário ---
    doc.setFontSize(9); // Reduzindo fonte para caber mais colunas
    const startX = 10; // Margem esquerda
    const colCodX = startX;
    const colDescX = colCodX + 18; 
    const colQtdX = colDescX + 60; 
    const colCatX = colQtdX + 20; 
    const colDataCadX = colCatX + 30; 
    const colObsX = colDataCadX + 30; // Coluna para observações
    const lineHeight = 5; // Reduzindo espaçamento entre linhas

    // Títulos das colunas
    doc.setFont(undefined, 'bold');
    doc.text("CÓD.", colCodX, currentY);
    doc.text("DESCRIÇÃO", colDescX, currentY);
    doc.text("QTD.", colQtdX, currentY);
    doc.text("CATEGORIA", colCatX, currentY);
    doc.text("DATA CAD.", colDataCadX, currentY);
    doc.text("OBSERVAÇÕES", colObsX, currentY);
    currentY += lineHeight + 3; 

    doc.setFont(undefined, 'normal'); // Volta para fonte normal para o conteúdo

    itensInventario.forEach(item => {
        // Verifica se precisa de nova página
        if (currentY > 280) { 
            doc.addPage();
            currentY = 15; 

            // Opcional: Adicionar cabeçalho e título novamente em cada nova página
            doc.setFontSize(18);
            doc.text("Laboratório de Análises Clínicas CETEP/LNAB", 105, currentY, null, null, "center");
            currentY += 10;
            doc.setFontSize(10);
            doc.text(`Data: ${formattedDate} - Hora: ${formattedTime} - Operador: ${operador}`, 105, currentY, null, null, "center");
            currentY += 5;
            doc.setFontSize(8);
            doc.text("Endereço: 233, R. Mario Laérte, 163 - Centro, Alagoinhas - BA, 48005-098", 105, currentY, null, null, "center");
            currentY += 4;
            doc.text("Site: https://www.ceteplnab.com.br/", 105, currentY, null, null, "center");
            currentY += 6;
            doc.setLineWidth(0.5);
            doc.line(20, currentY, 190, currentY);
            currentY += 10;
            doc.setFontSize(14);
            doc.text("RELATÓRIO DE INVENTÁRIO ATUAL (Continuação)", 105, currentY, null, null, "center");
            currentY += 8;
            doc.setLineWidth(0.2);
            doc.line(20, currentY, 190, currentY);
            currentY += 10;
            doc.setFontSize(9); 
            doc.setFont(undefined, 'bold');
            doc.text("CÓD.", colCodX, currentY);
            doc.text("DESCRIÇÃO", colDescX, currentY);
            doc.text("QTD.", colQtdX, currentY);
            doc.text("CATEGORIA", colCatX, currentY);
            doc.text("DATA CAD.", colDataCadX, currentY);
            doc.text("OBSERVAÇÕES", colObsX, currentY);
            currentY += lineHeight + 3; 
            doc.setFont(undefined, 'normal');
        }

        const itemDataCadastroFormatada = item.dataCadastro ? new Date(item.dataCadastro.toDate()).toLocaleDateString('pt-BR') : 'N/A';
        const itemObservacoes = doc.splitTextToSize(item.observacoes || '', 45); // Quebra observações longas

        doc.text(item.cod || 'N/A', colCodX, currentY);
        doc.text(item.item, colDescX, currentY);
        doc.text(item.quantidade.toString(), colQtdX, currentY);
        doc.text(item.categoria || 'Geral', colCatX, currentY);
        doc.text(itemObservacoes, colObsX, currentY); 
        currentY += Math.max(lineHeight, itemObservacoes.length * (lineHeight - 2)); // Ajusta linha conforme observações
    });

    // --- Rodapé do PDF ---
    doc.setPage(doc.internal.getNumberOfPages());
    doc.setFontSize(9);
    doc.text("Documento gerado automaticamente pelo SISLAB.", 105, 280, null, null, "center");

    doc.output('dataurlnewwindow', { filename: `Relatorio_Inventario_${formattedDate}.pdf` });

    alert(`Relatório de Inventário gerado com sucesso por ${operador}! Verifique a nova aba para visualizar e imprimir.`);
}

async function gerarRelatorioReposicao() {
    const operador = await getOperadorName();
    if (operador === null) {
        alert("Operação cancelada: Nome do operador não fornecido.");
        return;
    }

    let minQuantityInput = prompt("Digite a quantidade MÁXIMA em estoque para um item entrar no relatório de reposição (ex: 3):");
    if (minQuantityInput === null) { // Usuário cancelou
        alert("Operação de relatório de reposição cancelada.");
        return;
    }
    const minQuantity = parseInt(minQuantityInput.trim());

    if (isNaN(minQuantity) || minQuantity < 0) {
        alert("Quantidade mínima inválida. Por favor, digite um número positivo ou zero.");
        return;
    }

    if (typeof window.firestoreDb === 'undefined' || !window.firestoreDb) {
        alert("Banco de dados não inicializado. Não é possível imprimir o relatório de reposição.");
        return;
    }

    let itensInventario = [];
    try {
        const inventarioRef = window.firebaseFirestoreCollection(window.firestoreDb, 'inventario');
        const q = window.firebaseFirestoreQuery(inventarioRef, window.firebaseFirestoreOrderBy('item', 'asc')); 
        const querySnapshot = await window.firebaseFirestoreGetDocs(q);
        itensInventario = querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
        console.error("Erro ao carregar itens para o relatório de reposição:", error);
        alert("Erro ao carregar itens para o relatório de reposição. Verifique o console.");
        return;
    }

    // Filtragem em memória para itens <= minQuantity
    const itensParaReposicao = itensInventario.filter(item => item.quantidade <= minQuantity);

    if (itensParaReposicao.length === 0) {
        alert(`Nenhum item encontrado com quantidade igual ou inferior a ${minQuantity}.`);
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let currentY = 15; 

    // --- Cabeçalho do PDF ---
    doc.setFontSize(18);
    doc.text("Laboratório de Análises Clínicas CETEP/LNAB", 105, currentY, null, null, "center");
    currentY += 10;
    doc.setFontSize(10);
    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
    const formattedTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    doc.text(`Data: ${formattedDate} - Hora: ${formattedTime} - Operador: ${operador}`, 105, currentY, null, null, "center");
    currentY += 5;
    doc.setFontSize(8);
    doc.text("Endereço: 233, R. Mario Laérte, 163 - Centro, Alagoinhas - BA, 48005-098", 105, currentY, null, null, "center");
    currentY += 4;
    doc.text("Site: https://www.ceteplnab.com.br/", 105, currentY, null, null, "center");
    currentY += 6;
    doc.setLineWidth(0.5);
    doc.line(20, currentY, 190, currentY);
    currentY += 10;

    // --- Título do Relatório ---
    doc.setFontSize(14);
    doc.text(`RELATÓRIO DE REPOSIÇÃO - Qtd. Mínima: ${minQuantity}`, 105, currentY, null, null, "center");
    currentY += 8;
    doc.setLineWidth(0.2);
    doc.line(20, currentY, 190, currentY);
    currentY += 10;

    // --- Conteúdo: Itens para Reposição ---
    doc.setFontSize(9); // Reduzindo fonte para caber mais colunas
    const repColCodX = startX;
    const repColDescX = repColCodX + 18;
    const repColQtdX = repColDescX + 60;
    const repColCatX = repColQtdX + 20;
    const repColObsX = repColCatX + 30; 
    
    doc.setFont(undefined, 'bold');
    doc.text("CÓD.", repColCodX, currentY);
    doc.text("DESCRIÇÃO", repColDescX, currentY);
    doc.text("QTD. ATUAL", repColQtdX, currentY);
    doc.text("CATEGORIA", repColCatX, currentY);
    doc.text("OBSERVAÇÕES", repColObsX, currentY); 
    currentY += lineHeight + 3;

    doc.setFont(undefined, 'normal');

    itensParaReposicao.forEach(item => {
        if (currentY > 280) { 
            doc.addPage();
            currentY = 15; 
            doc.setFontSize(18);
            doc.text("Laboratório de Análises Clínicas CETEP/LNAB", 105, currentY, null, null, "center");
            currentY += 10;
            doc.setFontSize(10);
            doc.text(`Data: ${formattedDate} - Hora: ${formattedTime} - Operador: ${operador}`, 105, currentY, null, null, "center");
            currentY += 5;
            doc.setFontSize(8);
            doc.text("Endereço: 233, R. Mario Laérte, 163 - Centro, Alagoinhas - BA, 48005-098", 105, currentY, null, null, "center");
            currentY += 4;
            doc.text("Site: https://www.ceteplnab.com.br/", 105, currentY, null, null, "center");
            currentY += 6;
            doc.setLineWidth(0.5);
            doc.line(20, currentY, 190, currentY);
            currentY += 10;
            doc.setFontSize(14);
            doc.text(`RELATÓRIO DE REPOSIÇÃO (Continuação) - Qtd. Mínima: ${minQuantity}`, 105, currentY, null, null, "center");
            currentY += 8;
            doc.setLineWidth(0.2);
            doc.line(20, currentY, 190, currentY);
            currentY += 10;
            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');
            doc.text("CÓD.", repColCodX, currentY);
            doc.text("DESCRIÇÃO", repColDescX, currentY);
            doc.text("QTD. ATUAL", repColQtdX, currentY);
            doc.text("CATEGORIA", repColCatX, currentY);
            doc.text("OBSERVAÇÕES", repColObsX, currentY);
            currentY += lineHeight + 3;
            doc.setFont(undefined, 'normal');
        }
        
        doc.text(item.cod || 'N/A', repColCodX, currentY);
        doc.text(item.item, repColDescX, currentY);
        doc.text(item.quantidade.toString(), repColQtdX, currentY);
        doc.text(item.categoria || 'Geral', repColCatX, currentY);
        doc.text(item.observacoes || '', repColObsX, currentY); 
        currentY += lineHeight;
    });

    // --- Rodapé do PDF ---
    doc.setPage(doc.internal.getNumberOfPages());
    doc.setFontSize(9);
    doc.text("Documento gerado automaticamente pelo SISLAB.", 105, 280, null, null, "center");

    doc.output('dataurlnewwindow', { filename: `Relatorio_Reposicao_${formattedDate}_QtdMin${minQuantity}.pdf` });

    alert(`Relatório de Reposição gerado com sucesso por ${operador}! Verifique a nova aba para visualizar e imprimir.`);
}

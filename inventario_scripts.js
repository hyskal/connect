// VERSÃO: 1.0.1 (inventario_scripts.js)
// CHANGELOG:
// - Adicionado: Implementação do campo cod (código sequencial numérico) para itens, com geração automática e uso de transação no Firebase para garantia de unicidade.
// - Adicionado: Implementação de categorias para itens.
// - Adicionado: Função loadCategories() para carregar categorias dinamicamente de uma Gist pública.
// - Modificado: Função listarItensInventario() para exibir cod e categoria, incluir os novos controles de movimentação direta (input de quantidade e botões +/-), e implementar filtragem por cod/item e por categoria.
// - Modificado: Função saveOrUpdateItem() para gerenciar o cod sequencial para novos itens, salvar categoria, e integrar a solicitação do operador.
// - Adicionado: Função updateItemQuantityDirectly() para gerenciar as movimentações diretas de quantidade via botões +/- na lista, incluindo solicitação do operador, alerta de estoque negativo e registro no inventario_log.
// - Modificado: Função deleteItem() para integrar a solicitação do operador.
// - Modificado: Funções de registro no inventario_log em saveOrUpdateItem, updateItemQuantityDirectly e deleteItem para incluir itemCod e operador.
// - Adicionado: Função getOperadorName() para solicitar o nome do operador via pop-up.
// - Adicionado: Funções imprimirRelatorioInventario() e gerarRelatorioReposicao() (lógica dos relatórios em PDF) agora estão neste script e são acionadas por botões na página inventario.html.
// - Modificado: Funções showItemLog() e hideItemLog() para exibir o campo operador no log por item.

// --- CONFIGURAÇÃO DA GIST PÚBLICA PARA CATEGORIAS ---
const GITHUB_USERNAME_CATEGORIES = 'hyskal'; // Ajuste se for outro usuário
const GIST_ID_CATEGORIES = 'SEU_GIST_ID_PARA_CATEGORIAS'; // <-- IMPORTANTE: SUBSTITUA PELO ID DO SEU GIST DE CATEGORIAS
const GIST_FILENAME_CATEGORIES = 'categorias_inventario.txt'; // Nome do arquivo dentro do Gist

// Variável global para armazenar o ID do item sendo editado
let currentEditingItemId = null;
let categoriasDisponiveis = []; // Armazena as categorias carregadas da Gist

// --- Event Listeners Iniciais ---
document.addEventListener('DOMContentLoaded', async () => {
    // Carregar categorias antes de listar os itens, pois a lista depende delas
    await loadCategories(); 
    listarItensInventario(); // Lista itens após carregar categorias

    document.getElementById('saveItemBtn').addEventListener('click', saveOrUpdateItem);
    document.getElementById('clearItemFormBtn').addEventListener('click', clearItemForm);
    document.getElementById('searchInventory').addEventListener('input', listarItensInventario);
    document.getElementById('filterCategory').addEventListener('change', listarItensInventario); // Filtra por categoria

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
    const categorySelect = document.getElementById('itemCategory');
    const filterCategorySelect = document.getElementById('filterCategory');
    const timestamp = new Date().getTime(); // Para evitar cache

    const gistRawUrl = `https://gist.githubusercontent.com/${GITHUB_USERNAME_CATEGORIES}/${GIST_ID_CATEGORIES}/raw/${GIST_FILENAME_CATEGORIES}?t=${timestamp}`;

    try {
        const response = await fetch(gistRawUrl);
        if (!response.ok) {
            console.warn(`Erro ao carregar categorias da Gist (${response.status}). Usando categorias padrão.`);
            categoriasDisponiveis = ["Geral"]; // Categoria padrão se a Gist falhar
        } else {
            const text = await response.text();
            categoriasDisponiveis = text.trim().split('\n').map(c => c.trim()).filter(c => c !== '');
            if (categoriasDisponiveis.length === 0) {
                categoriasDisponiveis = ["Geral"]; // Garante "Geral" se o arquivo estiver vazio
            }
        }
    } catch (error) {
        console.error("Erro FATAL ao carregar categorias:", error);
        categoriasDisponiveis = ["Geral"]; // Categoria padrão em caso de erro fatal
    }

    // Popular o select do formulário
    categorySelect.innerHTML = '';
    categoriasDisponiveis.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        categorySelect.appendChild(option);
    });
    // Define "Geral" como padrão, ou a primeira opção se "Geral" não existir
    categorySelect.value = "Geral"; 
    if (categorySelect.selectedIndex === -1 && categoriasDisponiveis.length > 0) {
        categorySelect.selectedIndex = 0;
    }


    // Popular o select de filtro
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
    inventoryListBody.innerHTML = '<tr><td colspan="7">Carregando itens...</td></tr>'; // 7 colunas
    
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
                                  item.item.toLowerCase().includes(searchTerm) || 
                                  (item.cod && item.cod.toLowerCase().includes(searchTerm)); // Busca por cod ou descrição
            const matchesCategory = filterCategory === '' || item.categoria === filterCategory;
            return matchesSearch && matchesCategory;
        });

        if (filteredItems.length === 0) {
            inventoryListBody.innerHTML = '<tr><td colspan="7">Nenhum item encontrado com os filtros aplicados.</td></tr>';
            return;
        }

        inventoryListBody.innerHTML = ''; // Limpa antes de preencher
        filteredItems.forEach(item => {
            const row = inventoryListBody.insertRow();
            row.dataset.itemId = item.id; // Guarda o ID no elemento da linha
            
            const dataCadastroDate = item.dataCadastro ? item.dataCadastro.toDate() : null;
            const dataCadastroFormatada = dataCadastroDate ? dataCadastroDate.toLocaleDateString('pt-BR') : 'N/A';

            row.insertCell(0).textContent = item.cod || 'N/A'; // Coluna Cod.
            row.insertCell(1).textContent = item.item; // Coluna Descrição
            row.insertCell(2).textContent = item.quantidade; // Coluna Qtd.
            row.insertCell(3).textContent = item.categoria || 'Geral'; // Coluna Categoria
            row.insertCell(4).textContent = dataCadastroFormatada; // Coluna Data Cadastro
            
            // Coluna Ações
            const actionsCell = row.insertCell(5);
            actionsCell.classList.add('action-buttons');
            
            const editButton = document.createElement('button');
            editButton.textContent = 'Editar';
            editButton.classList.add('edit-btn');
            editButton.onclick = () => loadItemForEdit(item.id, item.cod, item.item, item.quantidade, item.observacoes, item.categoria);
            actionsCell.appendChild(editButton);

            const viewLogButton = document.createElement('button');
            viewLogButton.textContent = 'Ver Log';
            viewLogButton.classList.add('view-log-btn'); 
            viewLogButton.onclick = () => showItemLog(item.id, item.item); // Passa item.item para descrição no log
            actionsCell.appendChild(viewLogButton);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Remover';
            deleteButton.classList.add('delete-btn');
            deleteButton.onclick = () => deleteItem(item.id, item.item, item.cod, item.quantidade); // Passa item.item e item.cod
            actionsCell.appendChild(deleteButton);

            // Coluna Movimentação Direta
            const directMoveCell = row.insertCell(6);
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
            plusButton.onclick = () => updateItemQuantityDirectly(item.id, item.item, item.cod, item.quantidade, parseInt(moveInput.value));
            directMoveCell.appendChild(plusButton);

            const minusButton = document.createElement('button');
            minusButton.textContent = '-';
            minusButton.classList.add('movement-button', 'minus');
            minusButton.onclick = () => updateItemQuantityDirectly(item.id, item.item, item.cod, item.quantidade, -parseInt(moveInput.value));
            directMoveCell.appendChild(minusButton);
        });

    } catch (error) {
        console.error("Erro ao listar itens do inventário:", error);
        inventoryListBody.innerHTML = '<tr><td colspan="7">Erro ao carregar itens.</td></tr>';
    }
}

function clearItemForm() {
    document.getElementById('itemCod').value = ''; // Limpa o cod também
    document.getElementById('itemDescription').value = '';
    document.getElementById('itemQuantity').value = '0';
    document.getElementById('itemObservations').value = ''; // Limpa observações
    document.getElementById('itemCategory').value = 'Geral'; // Reseta para categoria padrão
    document.getElementById('itemIdToEdit').value = '';
    document.getElementById('saveItemBtn').textContent = 'Salvar Item';
    clearError('itemDescription');
    clearError('itemQuantity');
    currentEditingItemId = null; // Reseta o ID do item em edição
}

async function saveOrUpdateItem() {
    const itemCodInput = document.getElementById('itemCod');
    const descriptionInput = document.getElementById('itemDescription');
    const quantityInput = document.getElementById('itemQuantity');
    const observationsInput = document.getElementById('itemObservations'); // Novo campo
    const categorySelect = document.getElementById('itemCategory'); // Novo campo
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
    if (isNaN(quantity) || quantity < 0) {
        showError('itemQuantity', 'Quantidade inválida.');
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

        if (itemIdToEdit) { // Modo de Edição
            const itemDocRef = window.firebaseFirestoreDoc(window.firestoreDb, 'inventario', itemIdToEdit);
            const docSnap = await window.firebaseFirestoreGetDoc(itemDocRef);
            const oldData = docSnap.data();

            const oldQuantity = oldData.quantidade;
            const quantityChange = quantity - oldQuantity;
            
            let tipoOperacaoLog = "AJUSTE"; 
            if (quantityChange > 0) {
                tipoOperacaoLog = "ENTRADA";
            } else if (quantityChange < 0) {
                tipoOperacaoLog = "SAIDA";
            }

            // Alerta de estoque negativo para saída em edição
            if (tipoOperacaoLog === "SAIDA" && oldData.quantidade < Math.abs(quantityChange)) { // Math.abs para garantir que a subtração não leve a negativo
                alert(`Impossível realizar a saída. Quantidade atual (${oldData.quantidade}) é menor que a quantidade a ser retirada (${Math.abs(quantityChange)}).`);
                return;
            }

            await window.firebaseFirestoreUpdateDoc(itemDocRef, {
                item: description, // Descrição agora é 'item' no banco de dados
                quantidade: quantity,
                observacoes: observations,
                categoria: category, // Salva a categoria
                ultimaAtualizacao: window.firebaseFirestoreServerTimestamp()
            });

            // Registrar no log SÓ SE HOUVER MUDANÇA RELEVANTE (quantidade, descrição, observações, categoria)
            if (quantityChange !== 0 || oldData.item !== description || oldData.observacoes !== observations || oldData.categoria !== category) {
                await window.firebaseFirestoreAddDoc(logRef, {
                    itemId: itemIdToEdit,
                    itemNome: description, // Salva a descrição atualizada no log
                    itemCod: oldData.cod, // Mantém o COD original no log
                    tipoMovimento: tipoOperacaoLog,
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

        } else { // Modo de Cadastro (novo item)
            // Geração do código sequencial via transação
            const configRef = window.firebaseFirestoreCollection(window.firestoreDb, 'config');
            const counterDocRef = window.firebaseFirestoreDoc(configRef, 'contadores');

            let newCod = '';
            await window.firebaseFirestoreRunTransaction(window.firestoreDb, async (transaction) => {
                const counterDoc = await transaction.get(counterDocRef);
                let currentCounter = 0;

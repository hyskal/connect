// VERSÃO: 3.0.0 (inventario_scripts.js)
// CHANGELOG:
// - Nova Versão: Marca o início oficial da Versão 3.0 do Sistema de Inventário.
// - Adicionado: Geração automática de cod sequencial para novos itens via transação no Firebase (config_v3/contadores).
// - Adicionado: categorias para itens, com carregamento dinâmico de categorias_inventario.txt (local) e usadas em formulário e filtro.
// - Adicionado: Novos campos de item (localizacao, dataVencimento, unidadeMedida) no formulário e na estrutura do Firestore (inventario_v3).
// - Adicionado: Campos dataUltimaModificacao e ultimoOperador no item (inventario_v3), atualizados automaticamente em cada modificação.
// - Modificado: saveOrUpdateItem() para: lidar com todos os novos campos, salvando "Não definido" para campos opcionais não preenchidos; integrar solicitação do operador e alertas de estoque negativo; registrar logs detalhados (tipos "CADASTRO", "ENTRADA", "SAIDA", "AJUSTE"), incluindo todos os novos campos no log.
// - Modificado: listarItensInventario() para: exibir todas as novas colunas; implementar filtros por cod/item e categoria; implementar Filtro Rápido por Status de Estoque; adicionar Notificação Visual para Estoque Crítico; incluir Contagem de "Dias em Estoque"; configurar os controles de Movimentação Direta.
// - Adicionado: updateItemQuantityDirectly() para gerenciar as movimentações rápidas via botões +/-, com operador, alerta de estoque negativo e registro detalhado no log.
// - Modificado: loadItemForEdit() para preencher todos os campos do formulário e exibir/ocultar o botão "Excluir Item".
// - Modificado: deleteItem() para integrar solicitação do operador, log detalhado "REMOCAO", e lidar com o botão "Excluir Item" do formulário.
// - Modificado: showItemLog() e hideItemLog() para exibir log por item com todos os campos relevantes.
// - Implementado: Funções de relatório PDF (imprimirRelatorioInventario, gerarRelatorioReposicao, gerarRelatorioConsumo, gerarRelatorioVencimento), acionadas pelos botões na inventario.html. Todos incluem operador no cabeçalho e detalhes dos novos campos nos relatórios.
// - Incluído: console.log para depuração em funções críticas.


// --- CONFIGURAÇÃO DO ARQUIVO LOCAL PARA CATEGORIAS ---
const LOCAL_FILENAME_CATEGORIES = 'categorias_inventario.txt'; 

// Variáveis Globais de Estado
let currentEditingItemId = null;
let categoriasDisponiveis = []; // Armazena as categorias carregadas do arquivo local
let currentFilterStatus = 'all'; // Estado atual do filtro de status (all, critical, inStock, outOfStock)


// --- Event Listeners Iniciais ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM totalmente carregado. Iniciando setup..."); // DEBUG
    
    // Carregar categorias antes de listar os itens, pois a lista depende delas
    await loadCategories(); 
    listarItensInventario(); // Lista itens após carregar categorias

    // Event listeners para o formulário de cadastro/edição
    document.getElementById('saveItemBtn').addEventListener('click', saveOrUpdateItem);
    document.getElementById('clearItemFormBtn').addEventListener('click', clearItemForm);
    document.getElementById('deleteItemFormBtn').addEventListener('click', deleteItemFromForm); // Novo botão de exclusão no formulário

    // Event listeners para filtros e pesquisa
    document.getElementById('searchInventory').addEventListener('input', listarItensInventario);
    document.getElementById('filterCategory').addEventListener('change', listarItensInventario); 
    document.getElementById('criticalQuantityInput').addEventListener('input', () => { // Ao mudar qtd crítica, atualiza a lista
        if (currentFilterStatus === 'critical') { // Só atualiza se o filtro crítico estiver ativo
            listarItensInventario();
        }
    });

    // Event listeners para botões de filtro de status
    document.getElementById('filterAllItemsBtn').addEventListener('click', () => { currentFilterStatus = 'all'; updateFilterButtons('filterAllItemsBtn'); listarItensInventario(); });
    document.getElementById('filterCriticalItemsBtn').addEventListener('click', () => { currentFilterStatus = 'critical'; updateFilterButtons('filterCriticalItemsBtn'); listarItensInventario(); });
    document.getElementById('filterInStockItemsBtn').addEventListener('click', () => { currentFilterStatus = 'inStock'; updateFilterButtons('filterInStockItemsBtn'); listarItensInventario(); });
    document.getElementById('filterOutOfStockItemsBtn').addEventListener('click', () => { currentFilterStatus = 'outOfStock'; updateFilterButtons('filterOutOfStockItemsBtn'); listarItensInventario(); });

    // Event listeners para os botões de relatório
    document.getElementById('printInventoryReportBtn').addEventListener('click', imprimirRelatorioInventario);
    document.getElementById('generateReplenishmentReportBtn').addEventListener('click', gerarRelatorioReposicao);
    document.getElementById('generateConsumptionReportBtn').addEventListener('click', gerarRelatorioConsumo);
    document.getElementById('generateDueDateReportBtn').addEventListener('click', gerarRelatorioVencimento);
    
    console.log("Setup inicial concluído."); // DEBUG
});

// Função para atualizar o estado visual dos botões de filtro
function updateFilterButtons(activeButtonId) {
    const buttons = ['filterAllItemsBtn', 'filterCriticalItemsBtn', 'filterInStockItemsBtn', 'filterOutOfStockItemsBtn'];
    buttons.forEach(id => {
        const button = document.getElementById(id);
        if (button) {
            button.classList.remove('active-filter');
            if (id === activeButtonId) {
                button.classList.add('active-filter');
            }
        }
    });
}

// --- Funções Auxiliares Comuns ---
async function getOperadorName() {
    console.log("Solicitando nome do operador..."); // DEBUG
    let operador = '';
    while (true) {
        operador = prompt("Por favor, digite seu nome (operador):");
        if (operador === null) { // Usuário clicou em cancelar
            console.log("Operação cancelada pelo operador."); // DEBUG
            return null; 
        }
        if (operador.trim() !== '') {
            console.log(`Nome do operador fornecido: ${operador}`); // DEBUG
            return operador.trim();
        }
        alert("O nome do operador não pode ser vazio. Por favor, digite seu nome.");
    }
}

function showError(elementId, message) {
    console.log(`Erro de validação para ${elementId}: ${message}`); // DEBUG
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
    return String(num).padStart(4, '0'); // Garante 4 dígitos com zeros à esquerda
}

function formatDateToInput(date) {
    // Formata um objeto Date para string YYYY-MM-DD para input[type="date"]
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}


// --- Funções de Carregamento Dinâmico ---
async function loadCategories() {
    console.log("Iniciando carregamento de categorias..."); // DEBUG
    const itemCategorySelect = document.getElementById('itemCategory');
    const filterCategorySelect = document.getElementById('filterCategory');
    const timestamp = new Date().getTime(); 

    const localFileUrl = `${LOCAL_FILENAME_CATEGORIES}?t=${timestamp}`; 

    try {
        const response = await fetch(localFileUrl);
        if (!response.ok) {
            console.warn(`Erro ao carregar categorias do arquivo local (${response.status}). Usando categorias padrão.`); // DEBUG
            categoriasDisponiveis = ["Geral"]; 
        } else {
            const text = await response.text();
            categoriasDisponiveis = text.trim().split('\n').map(c => c.trim()).filter(c => c !== '');
            if (categoriasDisponiveis.length === 0) {
                categoriasDisponiveis = ["Geral"]; 
            }
            console.log("Categorias carregadas:", categoriasDisponiveis); // DEBUG
        }
    } catch (error) {
        console.error("Erro FATAL ao carregar categorias do arquivo local:", error); // DEBUG
        categoriasDisponiveis = ["Geral"]; 
    }

    // Popular o select do formulário de cadastro/edição
    itemCategorySelect.innerHTML = '';
    categoriasDisponiveis.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        itemCategorySelect.appendChild(option);
    });
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
    console.log("Categorias carregadas nos selects."); // DEBUG
}


// --- Funções de CRUD de Itens ---

async function listarItensInventario() {
    console.log("Iniciando listagem de itens do inventário..."); // DEBUG
    const inventoryListBody = document.querySelector('#inventoryList tbody');
    inventoryListBody.innerHTML = '<tr><td colspan="11">Carregando itens...</td></tr>'; 
    
    const searchTerm = document.getElementById('searchInventory').value.toLowerCase();
    const filterCategory = document.getElementById('filterCategory').value;
    const criticalQuantity = parseInt(document.getElementById('criticalQuantityInput').value); // Qtd crítica para filtro
    let items = [];

    if (typeof window.firestoreDb === 'undefined' || !window.firestoreDb) {
        console.error("Firestore DB não inicializado em listarItensInventario."); // DEBUG
        inventoryListBody.innerHTML = '<tr><td colspan="11">Banco de dados não inicializado.</td></tr>';
        return;
    }

    try {
        const inventarioRef = window.firebaseFirestoreCollection(window.firestoreDb, 'inventario_v3'); // USAR _v3
        let q = window.firebaseFirestoreQuery(inventarioRef, window.firebaseFirestoreOrderBy('item', 'asc')); 

        const querySnapshot = await window.firebaseFirestoreGetDocs(q);
        items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`Total de itens brutos carregados: ${items.length}`); // DEBUG

        // Filtragem em memória
        let filteredItems = items.filter(item => {
            const matchesSearch = searchTerm === '' || 
                                  (item.item && item.item.toLowerCase().includes(searchTerm)) || 
                                  (item.cod && item.cod.toLowerCase().includes(searchTerm)); 
            const matchesCategory = filterCategory === '' || (item.categoria && item.categoria === filterCategory);
            
            // Lógica do filtro de status
            let matchesStatus = true;
            if (currentFilterStatus === 'critical') {
                matchesStatus = item.quantidade <= criticalQuantity;
            } else if (currentFilterStatus === 'inStock') {
                matchesStatus = item.quantidade > 0;
            } else if (currentFilterStatus === 'outOfStock') {
                matchesStatus = item.quantidade === 0;
            }
            
            return matchesSearch && matchesCategory && matchesStatus;
        });
        console.log(`Total de itens filtrados: ${filteredItems.length}`); // DEBUG

        if (filteredItems.length === 0) {
            inventoryListBody.innerHTML = '<tr><td colspan="11">Nenhum item encontrado com os filtros aplicados.</td></tr>'; 
            return;
        }

        inventoryListBody.innerHTML = ''; // Limpa antes de preencher
        filteredItems.forEach(item => {
            const row = inventoryListBody.insertRow();
            row.dataset.itemId = item.id; 
            
            // Formatação de datas
            const dataCadastroDate = item.dataCadastro ? item.dataCadastro.toDate() : null; // dataCadastro é do log, item tem dataUltimaAtualizacao
            const dataUltimaAtualizacaoDate = item.dataUltimaAtualizacao ? item.dataUltimaAtualizacao.toDate() : null;
            const dataVencimentoDate = item.dataVencimento ? item.dataVencimento.toDate() : null;

            const dataCadastroFormatada = dataCadastroDate ? dataCadastroDate.toLocaleDateString('pt-BR') : 'N/A';
            const dataUltimaAtualizacaoFormatada = dataUltimaAtualizacaoDate ? dataUltimaAtualizacaoDate.toLocaleDateString('pt-BR') : 'N/A';
            const dataVencimentoFormatada = dataVencimentoDate ? dataVencimentoDate.toLocaleDateString('pt-BR') : 'N/A';

            // Contagem de "Dias em Estoque" (baseado na dataCadastro do item, que é a primeira entrada no log)
            let diasEmEstoque = 'N/A';
            if (dataCadastroDate) {
                const diffTime = Math.abs(new Date().getTime() - dataCadastroDate.getTime());
                diasEmEstoque = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }


            // Colunas da tabela (11 colunas no total)
            row.insertCell(0).textContent = item.cod || 'N/A'; // Cód.
            row.insertCell(1).textContent = item.item; // Descrição
            row.insertCell(2).textContent = item.quantidade; // Qtd.
            row.insertCell(3).textContent = item.unidadeMedida || 'Não definida'; // Unidade
            row.insertCell(4).textContent = item.categoria || 'Não definida'; // Categoria
            row.insertCell(5).textContent = item.localizacao || 'Não definida'; // Localização
            row.insertCell(6).textContent = dataVencimentoFormatada; // Validade
            row.insertCell(7).textContent = dataUltimaAtualizacaoFormatada; // Última Atualização
            row.insertCell(8).textContent = item.ultimoOperador || 'Não definido'; // Últ. Operador (NOVO)

            // Destaque visual para estoque crítico
            if (item.quantidade <= criticalQuantity && item.quantidade > 0 && currentFilterStatus !== 'outOfStock') { // Crítico mas não zero
                row.style.backgroundColor = '#fff3cd'; // Amarelo claro (aviso)
            } else if (item.quantidade === 0) { // Estoque zero
                row.style.backgroundColor = '#f8d7da'; // Vermelho claro (perigo)
            }


            // Coluna Ações
            const actionsCell = row.insertCell(9);
            actionsCell.classList.add('action-buttons');
            
            const editButton = document.createElement('button');
            editButton.textContent = 'Editar';
            editButton.classList.add('edit-btn');
            editButton.onclick = () => loadItemForEdit(item); // Passa o objeto item completo
            actionsCell.appendChild(editButton);

            const viewLogButton = document.createElement('button');
            viewLogButton.textContent = 'Ver Log';
            viewLogButton.classList.add('view-log-btn'); 
            viewLogButton.onclick = () => showItemLog(item.id, item.item, item.cod); 
            actionsCell.appendChild(viewLogButton);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Remover';
            deleteButton.classList.add('delete-btn');
            deleteButton.onclick = () => deleteItem(item.id, item.item, item.cod, item.quantidade); 
            actionsCell.appendChild(deleteButton);

            // Coluna Movimentação Direta
            const directMoveCell = row.insertCell(10);
            directMoveCell.classList.add('direct-movement-controls'); 
            directMoveCell.style.whiteSpace = 'nowrap'; 

            const moveInput = document.createElement('input');
            moveInput.type = 'number';
            moveInput.value = '1'; 
            moveInput.min = '1';
            moveInput.classList.add('movement-input');
            directMoveCell.appendChild(moveInput);

            const plusButton = document.createElement('button');
            plusButton.textContent = '+';
            plusButton.classList.add('movement-button', 'plus');
            plusButton.onclick = () => updateItemQuantityDirectly(item.id, item.item, item.cod, item.quantidade, parseInt(moveInput.value), item.unidadeMedida || 'Não definida'); // Passa unidade
            directMoveCell.appendChild(plusButton);

            const minusButton = document.createElement('button');
            minusButton.textContent = '-';
            minusButton.classList.add('movement-button', 'minus');
            minusButton.onclick = () => updateItemQuantityDirectly(item.id, item.item, item.cod, item.quantidade, -parseInt(moveInput.value), item.unidadeMedida || 'Não definida'); // Passa unidade
            directMoveCell.appendChild(minusButton);
        });
        console.log("Listagem de itens concluída com sucesso."); // DEBUG

    } catch (error) {
        console.error("Erro ao listar itens do inventário:", error); // DEBUG
        inventoryListBody.innerHTML = '<tr><td colspan="11">Erro ao carregar itens.</td></tr>'; 
    }
}

function clearItemForm() {
    console.log("Limpando formulário de item..."); // DEBUG
    document.getElementById('itemCod').value = ''; 
    document.getElementById('itemDescription').value = '';
    document.getElementById('itemQuantity').value = '0';
    document.getElementById('itemUnit').value = 'Unidade'; // Reseta unidade para padrão
    document.getElementById('itemCategory').value = 'Geral'; 
    document.getElementById('itemLocation').value = ''; // Limpa localização
    document.getElementById('itemDueDate').value = ''; // Limpa data de vencimento
    document.getElementById('itemObservations').value = ''; 
    document.getElementById('itemLastUpdate').value = ''; // Limpa última atualização
    document.getElementById('itemIdToEdit').value = ''; 
    document.getElementById('saveItemBtn').textContent = 'Salvar Item';
    document.getElementById('deleteItemFormBtn').style.display = 'none'; // Oculta botão de exclusão
    clearError('itemDescription');
    clearError('itemQuantity');
    currentEditingItemId = null; 
    hideItemLog(); 
    console.log("Formulário limpo."); // DEBUG
}

async function saveOrUpdateItem() {
    console.log("Iniciando saveOrUpdateItem..."); // DEBUG
    const itemCodInput = document.getElementById('itemCod');
    const descriptionInput = document.getElementById('itemDescription');
    const quantityInput = document.getElementById('itemQuantity');
    const unitSelect = document.getElementById('itemUnit'); // Novo campo
    const categorySelect = document.getElementById('itemCategory'); 
    const locationInput = document.getElementById('itemLocation'); // Novo campo
    const dueDateInput = document.getElementById('itemDueDate'); // Novo campo
    const observationsInput = document.getElementById('itemObservations'); 
    const itemIdToEdit = document.getElementById('itemIdToEdit').value;

    const description = descriptionInput.value.trim();
    const quantity = parseInt(quantityInput.value);
    const unit = unitSelect.value; // Valor da unidade
    const category = categorySelect.value;
    const location = locationInput.value.trim();
    const dueDate = dueDateInput.value ? new Date(dueDateInput.value + 'T00:00:00') : null; // Converte para Date ou null
    const observations = observationsInput.value.trim();
    
    // Default para campos opcionais
    const finalDescription = description; // Descrição é obrigatória
    const finalQuantity = quantity; // Quantidade é obrigatória
    const finalUnit = unit || 'Unidade'; // Padrão 'Unidade'
    const finalCategory = category || 'Geral'; // Padrão 'Geral'
    const finalLocation = location || 'Não definido'; // Padrão 'Não definido'
    const finalDueDate = dueDate; // Pode ser null
    const finalObservations = observations || 'Não definido'; // Padrão 'Não definido'


    let isValid = true;
    if (!finalDescription) {
        showError('itemDescription', 'A descrição é obrigatória.');
        isValid = false;
    } else {
        clearError('itemDescription');
    }
    if (isNaN(finalQuantity) || finalQuantity < 0) { 
        showError('itemQuantity', 'Quantidade inválida. Deve ser um número maior ou igual a zero.');
        isValid = false;
    } else {
        clearError('itemQuantity');
    }
    if (finalDueDate && isNaN(finalDueDate.getTime())) {
        showError('itemDueDate', 'Data de vencimento inválida.');
        isValid = false;
    } else {
        clearError('itemDueDate');
    }

    if (!isValid) {
        console.log("Validação do formulário falhou."); // DEBUG
        return;
    }

    const operador = await getOperadorName();
    if (operador === null) {
        alert("Operação de salvar/atualizar item cancelada: Nome do operador não fornecido.");
        console.log("Operação cancelada: Operador não fornecido."); // DEBUG
        return;
    }

    try {
        const inventarioRef = window.firebaseFirestoreCollection(window.firestoreDb, 'inventario_v3'); // USAR _v3
        const logRef = window.firebaseFirestoreCollection(window.firestoreDb, 'log_inventario_v3'); // USAR _v3

        let currentItemCod = itemCodInput.value; // Para logs de edição

        if (itemIdToEdit) { // Modo de Edição (Item Existente)
            console.log(`Editando item com ID: ${itemIdToEdit}`); // DEBUG
            const itemDocRef = window.firebaseFirestoreDoc(window.firestoreDb, 'inventario_v3', itemIdToEdit); // USAR _v3
            const docSnap = await window.firebaseFirestoreGetDoc(itemDocRef);
            const oldData = docSnap.data();

            const oldQuantity = oldData.quantidade;
            const quantityChange = finalQuantity - oldQuantity;
            
            let tipoMovimentoLog = "AJUSTE"; 
            if (quantityChange > 0) {
                tipoMovimentoLog = "ENTRADA";
            } else if (quantityChange < 0) {
                tipoMovimentoLog = "SAIDA";
            }

            // Alerta de estoque negativo para saída em edição
            if (tipoMovimentoLog === "SAIDA" && finalQuantity < 0) { 
                alert(`Impossível realizar a saída. A nova quantidade (${finalQuantity}) resultaria em estoque negativo.`);
                console.log("Saída em edição impedida: estoque negativo."); // DEBUG
                return;
            }

            // Atualiza o documento principal do item
            await window.firebaseFirestoreUpdateDoc(itemDocRef, {
                item: finalDescription, 
                quantidade: finalQuantity,
                unidadeMedida: finalUnit, // Novo campo
                categoria: finalCategory, 
                localizacao: finalLocation, // Novo campo
                dataVencimento: finalDueDate ? window.firebaseFirestoreServerTimestamp() : null, // Salva como Timestamp ou null
                observacoes: finalObservations, 
                dataUltimaModificacao: window.firebaseFirestoreServerTimestamp(), // NOVO: Data/Hora da última modificação
                ultimoOperador: operador // NOVO: Último operador que modificou
            });
            console.log("Documento de inventário atualizado."); // DEBUG

            // Registrar no log SÓ SE HOUVER MUDANÇA RELEVANTE
            const hasRelevantChange = quantityChange !== 0 || 
                                      oldData.item !== finalDescription || 
                                      oldData.observacoes !== finalObservations || 
                                      oldData.categoria !== finalCategory ||
                                      oldData.localizacao !== finalLocation ||
                                      oldData.unidadeMedida !== finalUnit ||
                                      (oldData.dataVencimento ? oldData.dataVencimento.toDate().getTime() : null) !== (finalDueDate ? finalDueDate.getTime() : null);

            if (hasRelevantChange) {
                console.log("Registrando log para edição com mudanças relevantes..."); // DEBUG
                await window.firebaseFirestoreAddDoc(logRef, {
                    itemId: itemIdToEdit,
                    itemNome: finalDescription, 
                    itemCod: currentItemCod, 
                    tipoMovimento: tipoMovimentoLog,
                    quantidadeMovimentada: quantityChange, 
                    unidadeMedidaLog: finalUnit, // Unidade no momento do log
                    quantidadeAntes: oldQuantity,
                    quantidadeDepois: finalQuantity,
                    dataHoraMovimento: window.firebaseFirestoreServerTimestamp(),
                    observacoesMovimento: (quantityChange !== 0 ? `Qtd. de ${oldQuantity} para ${finalQuantity}. ` : '') + 
                                 (oldData.item !== finalDescription ? `Desc. de '${oldData.item}' para '${finalDescription}'. ` : '') +
                                 (oldData.observacoes !== finalObservations ? `Obs. atualizada. ` : '') +
                                 (oldData.categoria !== finalCategory ? `Cat. de '${oldData.categoria}' para '${finalCategory}'. ` : '') +
                                 (oldData.localizacao !== finalLocation ? `Local de '${oldData.localizacao}' para '${finalLocation}'. ` : '') +
                                 ((oldData.dataVencimento ? oldData.dataVencimento.toDate().getTime() : null) !== (finalDueDate ? finalDueDate.getTime() : null) ? `Validade alterada. ` : '') +
                                 `Operador: ${operador}.`,
                    operador: operador
                });
                console.log("Log de edição registrado."); // DEBUG
            }
            alert('Item atualizado com sucesso!');

        } else { // Modo de Cadastro (Novo Item)
            console.log("Cadastrando novo item..."); // DEBUG
            // Geração do código sequencial via transação
            const configRef = window.firebaseFirestoreCollection(window.firestoreDb, 'config_v3'); // USAR _v3
            const counterDocRef = window.firebaseFirestoreDoc(configRef, 'contadores');

            let newCod = '';
            await window.firebaseFirestoreRunTransaction(window.firestoreDb, async (transaction) => {
                const counterDoc = await transaction.get(counterDocRef);
                let currentCounter = 0;
                if (counterDoc.exists) {
                    currentCounter = counterDoc.data().ultimoCodInventario || 0;
                }
                const nextCounter = currentCounter + 1;
                newCod = formatarCod(nextCounter); 
                transaction.set(counterDocRef, { ultimoCodInventario: nextCounter });
                console.log(`Código sequencial gerado: ${newCod}`); // DEBUG
            });

            const newItemRef = await window.firebaseFirestoreAddDoc(inventarioRef, {
                cod: newCod, 
                item: finalDescription, 
                quantidade: finalQuantity,
                unidadeMedida: finalUnit, // Novo campo
                categoria: finalCategory, 
                localizacao: finalLocation, // Novo campo
                dataVencimento: finalDueDate ? window.firebaseFirestoreServerTimestamp() : null, // Salva como Timestamp ou null
                observacoes: finalObservations, 
                dataCadastro: window.firebaseFirestoreServerTimestamp(), // Data de criação original
                dataUltimaModificacao: window.firebaseFirestoreServerTimestamp(), // NOVO: Data/Hora da última modificação
                ultimoOperador: operador // NOVO: Último operador que modificou
            });
            console.log("Novo documento de inventário salvo."); // DEBUG

            // Registrar no log
            await window.firebaseFirestoreAddDoc(logRef, {
                itemId: newItemRef.id,
                itemNome: finalDescription,
                itemCod: newCod,
                tipoMovimento: "CADASTRO", 
                quantidadeMovimentada: finalQuantity,
                unidadeMedidaLog: finalUnit, // Unidade no momento do log
                quantidadeAntes: 0, 
                quantidadeDepois: finalQuantity,
                dataHoraMovimento: window.firebaseFirestoreServerTimestamp(),
                observacoesMovimento: "Cadastro inicial do item",
                operador: operador
            });
            alert('Item salvo com sucesso! Código gerado: ' + newCod);
            console.log("Log de cadastro inicial registrado."); // DEBUG
        }
        clearItemForm();
        listarItensInventario(); 
    } catch (error) {
        console.error("Erro ao salvar/atualizar item:", error); // DEBUG
        alert("Erro ao salvar/atualizar item. Verifique o console.");
    }
}

async function loadItemForEdit(itemData) { // Agora recebe o objeto item completo
    console.log("Carregando item para edição:", itemData); // DEBUG
    document.getElementById('itemCod').value = itemData.cod || ''; 
    document.getElementById('itemDescription').value = itemData.item;
    document.getElementById('itemQuantity').value = itemData.quantidade;
    document.getElementById('itemUnit').value = itemData.unidadeMedida || 'Unidade'; // Preenche unidade
    document.getElementById('itemCategory').value = itemData.categoria || 'Geral'; 
    document.getElementById('itemLocation').value = itemData.localizacao || ''; // Preenche localização
    document.getElementById('itemDueDate').value = itemData.dataVencimento ? formatDateToInput(itemData.dataVencimento.toDate()) : ''; // Preenche data de vencimento
    document.getElementById('itemObservations').value = itemData.observacoes || ''; 
    document.getElementById('itemLastUpdate').value = itemData.dataUltimaModificacao ? new Date(itemData.dataUltimaModificacao.toDate()).toLocaleString('pt-BR') : ''; // Preenche última atualização
    document.getElementById('itemIdToEdit').value = itemData.id;
    document.getElementById('saveItemBtn').textContent = 'Atualizar Item';
    document.getElementById('deleteItemFormBtn').style.display = 'inline-block'; // Mostra botão de exclusão
    currentEditingItemId = itemData.id; 

    window.scrollTo({ top: 0, behavior: 'smooth' }); 
    console.log("Item carregado no formulário."); // DEBUG
}

async function updateItemQuantityDirectly(itemId, itemDescription, itemCod, currentQuantity, quantityChange, unidadeMedida) {
    console.log(`Movimentação direta: ID=${itemId}, Desc=${itemDescription}, Cod=${itemCod}, QtdAtual=${currentQuantity}, Mudança=${quantityChange}`); // DEBUG
    const operador = await getOperadorName();
    if (operador === null) {
        alert("Operação de movimentação cancelada: Nome do operador não fornecido.");
        console.log("Movimentação cancelada: Operador não fornecido."); // DEBUG
        return;
    }

    const newQuantity = currentQuantity + quantityChange;
    const tipoMovimento = quantityChange > 0 ? "ENTRADA" : "SAIDA";

    // Alerta de estoque negativo
    if (newQuantity < 0) {
        alert(`Impossível realizar a saída. Quantidade atual (${currentQuantity} ${unidadeMedida}) é menor que a quantidade a ser retirada (${Math.abs(quantityChange)} ${unidadeMedida}).`);
        console.log("Movimentação direta impedida: estoque negativo."); // DEBUG
        return;
    }
    // Alerta se a quantidade a ser movimentada for 0 ou NaN
    if (isNaN(quantityChange) || quantityChange === 0) {
        alert("Por favor, digite uma quantidade válida (maior que 0) para movimentar.");
        console.log("Movimentação direta impedida: quantidade inválida."); // DEBUG
        return;
    }

    try {
        const itemDocRef = window.firebaseFirestoreDoc(window.firestoreDb, 'inventario_v3', itemId); // USAR _v3
        
        // Atualiza o item principal
        await window.firebaseFirestoreUpdateDoc(itemDocRef, {
            quantidade: newQuantity,
            ultimaAtualizacao: window.firebaseFirestoreServerTimestamp(),
            ultimoOperador: operador
        });
        console.log("Documento de inventário atualizado por movimentação direta."); // DEBUG

        // Registrar no log
        const logRef = window.firebaseFirestoreCollection(window.firestoreDb, 'log_inventario_v3'); // USAR _v3
        await window.firebaseFirestoreAddDoc(logRef, {
            itemId: itemId,
            itemNome: itemDescription,
            itemCod: itemCod,
            tipoMovimento: tipoMovimento,
            quantidadeMovimentada: quantityChange,
            unidadeMedidaLog: unidadeMedida, // Unidade no momento do log
            quantidadeAntes: currentQuantity,
            quantidadeDepois: newQuantity,
            dataHoraMovimento: window.firebaseFirestoreServerTimestamp(),
            observacoesMovimento: `Movimentação direta: ${quantityChange > 0 ? '+' : ''}${quantityChange} ${unidadeMedida}.`,
            operador: operador
        });
        console.log("Log de movimentação direta registrado."); // DEBUG

        alert(`Quantidade de "${itemDescription}" atualizada para ${newQuantity} ${unidadeMedida}.`);
        listarItensInventario(); // Atualiza a lista para refletir a nova quantidade
        hideItemLog(); 
    } catch (error) {
        console.error("Erro ao atualizar quantidade diretamente:", error); // DEBUG
        alert("Erro ao atualizar quantidade. Verifique o console.");
    }
}

// NOVO: Função para deletar item a partir do formulário de edição
async function deleteItemFromForm() {
    const itemId = document.getElementById('itemIdToEdit').value;
    const itemNome = document.getElementById('itemDescription').value;
    const itemCod = document.getElementById('itemCod').value;
    const quantidadeAtual = parseInt(document.getElementById('itemQuantity').value);

    // Reutiliza a função deleteItem existente
    await deleteItem(itemId, itemNome, itemCod, quantidadeAtual);
}


async function deleteItem(id, itemNome, itemCod, quantidadeAtual) {
    console.log(`Iniciando exclusão de item: ID=${id}, Nome=${itemNome}, Cod=${itemCod}`); // DEBUG
    if (!confirm(`Tem certeza que deseja remover o item "${itemNome}" (Cód: ${itemCod})? Esta ação não pode ser desfeita.`)) {
        console.log("Exclusão cancelada pelo usuário."); // DEBUG
        return;
    }

    const operador = await getOperadorName();
    if (operador === null) {
        alert("Remoção de item cancelada: Nome do operador não fornecido.");
        console.log("Exclusão cancelada: Operador não fornecido."); // DEBUG
        return;
    }

    try {
        const itemDocRef = window.firebaseFirestoreDoc(window.firestoreDb, 'inventario_v3', id); // USAR _v3
        await window.firebaseFirestoreDeleteDoc(itemDocRef);
        console.log("Documento de inventário excluído do Firestore."); // DEBUG
        
        // Registrar no log
        const logRef = window.firebaseFirestoreCollection(window.firestoreDb, 'log_inventario_v3'); // USAR _v3
        await window.firebaseFirestoreAddDoc(logRef, {
            itemId: id,
            itemNome: itemNome,
            itemCod: itemCod,
            tipoMovimento: "REMOCAO",
            quantidadeMovimentada: -quantidadeAtual, 
            unidadeMedidaLog: 'Não definida', // Unidade no momento da remoção (se não puder buscar a original)
            quantidadeAntes: quantidadeAtual,
            quantidadeDepois: 0, 
            dataHoraMovimento: window.firebaseFirestoreServerTimestamp(),
            observacoesMovimento: "Item removido do inventário",
            operador: operador
        });
        alert('Item removido com sucesso!');
        console.log("Log de remoção registrado."); // DEBUG
        listarItensInventario(); 
        clearItemForm(); 
    } catch (error) {
        console.error("Erro ao remover item:", error); // DEBUG
        alert("Erro ao remover item. Verifique o console.");
    }
}

// --- Funções de Log Específico por Item ---
async function showItemLog(itemId, itemDescription, itemCod) { 
    console.log(`Exibindo log para item: ID=${itemId}, Desc=${itemDescription}, Cod=${itemCod}`); // DEBUG
    const itemLogSection = document.getElementById('itemLogSection');
    const itemLogDescriptionSpan = document.getElementById('itemLogDescription'); 
    const itemLogTableBody = document.querySelector('#itemLogTable tbody');

    itemLogDescriptionSpan.textContent = `${itemDescription} (Cód: ${itemCod})`; 
    itemLogTableBody.innerHTML = '<tr><td colspan="6" style="border: 1px solid #ddd; padding: 8px;">Carregando histórico...</td></tr>';
    itemLogSection.style.display = 'block'; 

    if (typeof window.firestoreDb === 'undefined' || !window.firestoreDb) {
        console.error("Firestore DB não inicializado em showItemLog."); // DEBUG
        itemLogTableBody.innerHTML = '<tr><td colspan="6" style="border: 1px solid #ddd; padding: 8px;">Banco de dados não inicializado.</td></tr>';
        return;
    }

    try {
        const logRef = window.firebaseFirestoreCollection(window.firestoreDb, 'log_inventario_v3'); // USAR _v3
        const q = window.firebaseFirestoreQuery(
            logRef,
            window.firebaseFirestoreWhere('itemId', '==', itemId),
            window.firebaseFirestoreOrderBy('dataHoraMovimento', 'asc') 
        );
        const querySnapshot = await window.firebaseFirestoreGetDocs(q);
        const logs = querySnapshot.docs.map(doc => doc.data());
        console.log(`Logs encontrados para o item: ${logs.length}`); // DEBUG

        if (logs.length === 0) {
            itemLogTableBody.innerHTML = '<tr><td colspan="6" style="border: 1px solid #ddd; padding: 8px;">Nenhum histórico encontrado para este item.</td></tr>';
            return;
        }

        itemLogTableBody.innerHTML = ''; 
        logs.forEach(log => {
            const row = itemLogTableBody.insertRow();
            const dataHoraFormatada = log.dataHoraMovimento ? new Date(log.dataHoraMovimento.toDate()).toLocaleString('pt-BR') : 'N/A';

            row.insertCell(0).textContent = log.tipoMovimento || 'N/A';
            row.insertCell(1).textContent = `${log.quantidadeMovimentada !== undefined ? log.quantidadeMovimentada.toString() : 'N/A'} ${log.unidadeMedidaLog || ''}`; // Qtd com unidade
            row.insertCell(2).textContent = `${log.quantidadeDepois !== undefined ? log.quantidadeDepois.toString() : 'N/A'} ${log.unidadeMedidaLog || ''}`; // Qtd final com unidade
            row.insertCell(3).textContent = dataHoraFormatada;
            row.insertCell(4).textContent = log.operador || 'Desconhecido';
            row.insertCell(5).textContent = log.observacoesMovimento || '';
        });

        window.scrollTo({ top: itemLogSection.offsetTop, behavior: 'smooth' }); 
        console.log("Histórico do item exibido."); // DEBUG

    } catch (error) {
        console.error("Erro ao carregar histórico do item:", error); // DEBUG
        itemLogTableBody.innerHTML = '<tr><td colspan="6" style="border: 1px solid #ddd; padding: 8px;">Erro ao carregar histórico.</td></tr>';
    }
}

function hideItemLog() {
    console.log("Ocultando seção de log de item."); // DEBUG
    document.getElementById('itemLogSection').style.display = 'none';
    document.querySelector('#itemLogTable tbody').innerHTML = '<tr><td colspan="6" style="border: 1px solid #ddd; padding: 8px;">Selecione um item para ver o histórico.</td></tr>';
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
}

// --- Funções de Relatórios PDF ---
async function imprimirRelatorioInventario() {
    console.log("Iniciando geração de Relatório de Estoque Atual..."); // DEBUG
    const operador = await getOperadorName();
    if (operador === null) {
        alert("Operação cancelada: Nome do operador não fornecido.");
        console.log("Relatório cancelado: Operador não fornecido."); // DEBUG
        return;
    }

    // Pergunta o tipo de relatório
    const reportType = prompt("Digite 'completo' para relatório em ordem alfabética ou 'categoria' para relatório por categoria (padrão: completo):").toLowerCase();
    let orderByField = 'item'; // Padrão: ordem alfabética por item
    let selectedCategory = null;

    if (reportType === 'categoria') {
        const categoryInput = prompt("Digite a categoria para filtrar (ou deixe vazio para todas as categorias):");
        selectedCategory = categoryInput ? categoryInput.trim() : null;
        if (selectedCategory && !categoriasDisponiveis.includes(selectedCategory)) {
            alert("Categoria não encontrada. Gerando relatório completo.");
            selectedCategory = null;
        }
    }


    if (typeof window.firestoreDb === 'undefined' || !window.firestoreDb) {
        alert("Banco de dados não inicializado. Não é possível imprimir o relatório de inventário.");
        console.error("Firestore DB não inicializado para relatório de inventário."); // DEBUG
        return;
    }

    let itensInventario = [];
    try {
        const inventarioRef = window.firebaseFirestoreCollection(window.firestoreDb, 'inventario_v3'); // USAR _v3
        let q = window.firebaseFirestoreQuery(inventarioRef, window.firebaseFirestoreOrderBy(orderByField, 'asc')); 
        
        const querySnapshot = await window.firebaseFirestoreGetDocs(q);
        itensInventario = querySnapshot.docs.map(doc => doc.data());
        console.log(`Itens carregados para relatório: ${itensInventario.length}`); // DEBUG

        if (selectedCategory) {
            itensInventario = itensInventario.filter(item => item.categoria === selectedCategory);
            console.log(`Itens filtrados por categoria '${selectedCategory}': ${itensInventario.length}`); // DEBUG
        }

    } catch (error) {
        console.error("Erro ao carregar itens para o relatório de inventário:", error); // DEBUG
        alert("Erro ao carregar itens para o relatório. Verifique o console.");
        return;
    }

    if (itensInventario.length === 0) {
        alert("Não há itens no inventário para imprimir o relatório com os filtros aplicados.");
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
    let reportTitle = "RELATÓRIO DE INVENTÁRIO ATUAL";
    if (selectedCategory) {
        reportTitle += ` (Categoria: ${selectedCategory})`;
    }
    doc.text(reportTitle, 105, currentY, null, null, "center");
    currentY += 8;
    doc.setLineWidth(0.2);
    doc.line(20, currentY, 190, currentY);
    currentY += 10;

    // --- Conteúdo: Itens do Inventário ---
    doc.setFontSize(8); // Reduzindo fonte para caber mais colunas
    const startX = 5; 
    const colWidths = [15, 50, 15, 20, 25, 25, 25, 25]; // Ajuste para caber todos
    const colPositions = [];
    let currentX = startX;
    colWidths.forEach(width => {
        colPositions.push(currentX);
        currentX += width;
    });

    // Títulos das colunas
    doc.setFont(undefined, 'bold');
    doc.text("CÓD.", colPositions[0], currentY);
    doc.text("DESCRIÇÃO", colPositions[1], currentY);
    doc.text("QTD.", colPositions[2], currentY);
    doc.text("UNID.", colPositions[3], currentY);
    doc.text("CATEGORIA", colPositions[4], currentY);
    doc.text("LOCALIZAÇÃO", colPositions[5], currentY);
    doc.text("VALIDADE", colPositions[6], currentY);
    doc.text("ÚLT. ATUALIZAÇÃO", colPositions[7], currentY);
    // As observações serão tratadas com quebra de linha no loop

    currentY += lineHeight + 2; 

    doc.setFont(undefined, 'normal'); // Volta para fonte normal para o conteúdo

    itensInventario.forEach(item => {
        if (currentY > 280) { // Verifica se precisa de nova página
            doc.addPage();
            currentY = 15; 

            // Cabeçalho e Título em nova página
            doc.setFontSize(18); doc.text("Laboratório de Análises Clínicas CETEP/LNAB", 105, currentY, null, null, "center"); currentY += 10;
            doc.setFontSize(10); doc.text(`Data: ${formattedDate} - Hora: ${formattedTime} - Operador: ${operador}`, 105, currentY, null, null, "center"); currentY += 5;
            doc.setFontSize(8); doc.text("Endereço: 233, R. Mario Laérte, 163 - Centro, Alagoinhas - BA, 48005-098", 105, currentY, null, null, "center"); currentY += 4;
            doc.text("Site: https://www.ceteplnab.com.br/", 105, currentY, null, null, "center"); currentY += 6;
            doc.setLineWidth(0.5); doc.line(20, currentY, 190, currentY); currentY += 10;
            doc.setFontSize(14); doc.text(`${reportTitle} (Continuação)`, 105, currentY, null, null, "center"); currentY += 8;
            doc.setLineWidth(0.2); doc.line(20, currentY, 190, currentY); currentY += 10;
            
            doc.setFontSize(8); 
            doc.setFont(undefined, 'bold');
            doc.text("CÓD.", colPositions[0], currentY);
            doc.text("DESCRIÇÃO", colPositions[1], currentY);
            doc.text("QTD.", colPositions[2], currentY);
            doc.text("UNID.", colPositions[3], currentY);
            doc.text("CATEGORIA", colPositions[4], currentY);
            doc.text("LOCALIZAÇÃO", colPositions[5], currentY);
            doc.text("VALIDADE", colPositions[6], currentY);
            doc.text("ÚLT. ATUALIZAÇÃO", colPositions[7], currentY);
            currentY += lineHeight + 2; 
            doc.setFont(undefined, 'normal');
        }

        const dataValidade = item.dataVencimento ? new Date(item.dataVencimento.toDate()).toLocaleDateString('pt-BR') : 'N/D';
        const dataUltimaAtualizacao = item.dataUltimaAtualizacao ? new Date(item.dataUltimaAtualizacao.toDate()).toLocaleDateString('pt-BR') : 'N/D';
        const itemObsText = item.observacoes && item.observacoes !== 'Não definido' ? `Obs: ${item.observacoes}` : '';
        const itemLocalizacao = item.localizacao || 'Não definida';

        // Linha 1 do item
        doc.text(item.cod || 'N/D', colPositions[0], currentY);
        doc.text(item.item, colPositions[1], currentY);
        doc.text(item.quantidade.toString(), colPositions[2], currentY);
        doc.text(item.unidadeMedida || 'Não definida', colPositions[3], currentY);
        doc.text(item.categoria || 'Geral', colPositions[4], currentY);
        doc.text(itemLocalizacao, colPositions[5], currentY);
        doc.text(dataValidade, colPositions[6], currentY);
        doc.text(dataUltimaAtualizacao, colPositions[7], currentY);
        currentY += lineHeight;

        // Se houver observações, exibe em uma linha separada abaixo do item, com indentação
        if (itemObsText) {
            const splitObs = doc.splitTextToSize(itemObsText, doc.internal.pageSize.width - startX - 10); // Ajusta largura da observação
            doc.text(splitObs, startX + 5, currentY); // 5mm de indentação
            currentY += (splitObs.length * (lineHeight - 1)); // Ajusta linha conforme observações
        }
        currentY += 1; // Espaço extra entre itens


    });

    // --- Rodapé do PDF ---
    doc.setPage(doc.internal.getNumberOfPages()); 
    doc.setFontSize(9);
    doc.text("Documento gerado automaticamente pelo SISLAB.", 105, 280, null, null, "center");

    doc.output('dataurlnewwindow', { filename: `Relatorio_Inventario_${formattedDate}.pdf` });

    alert(`Relatório de Inventário gerado com sucesso por ${operador}! Verifique a nova aba para visualizar e imprimir.`);
    console.log("Relatório de inventário geral gerado."); // DEBUG
}

async function gerarRelatorioReposicao() {
    console.log("Iniciando geração de Relatório de Reposição..."); // DEBUG
    const operador = await getOperadorName();
    if (operador === null) {
        alert("Operação cancelada: Nome do operador não fornecido.");
        console.log("Relatório de reposição cancelado: Operador não fornecido."); // DEBUG
        return;
    }

    let minQuantityInput = prompt("Digite a quantidade MÁXIMA em estoque para um item entrar no relatório de reposição (ex: 3):");
    if (minQuantityInput === null) { 
        alert("Operação de relatório de reposição cancelada.");
        console.log("Relatório de reposição cancelado pelo usuário."); // DEBUG
        return;
    }
    const minQuantity = parseInt(minQuantityInput.trim());

    if (isNaN(minQuantity) || minQuantity < 0) {
        alert("Quantidade mínima inválida. Por favor, digite um número positivo ou zero.");
        console.log("Relatório de reposição impedido: Qtd mínima inválida."); // DEBUG
        return;
    }

    if (typeof window.firestoreDb === 'undefined' || !window.firestoreDb) {
        alert("Banco de dados não inicializado. Não é possível imprimir o relatório de reposição.");
        console.error("Firestore DB não inicializado para relatório de reposição."); // DEBUG
        return;
    }

    let itensInventario = [];
    try {
        const inventarioRef = window.firebaseFirestoreCollection(window.firestoreDb, 'inventario_v3'); 
        const q = window.firebaseFirestoreQuery(inventarioRef, window.firebaseFirestoreOrderBy('item', 'asc')); 
        const querySnapshot = await window.firebaseFirestoreGetDocs(q);
        itensInventario = querySnapshot.docs.map(doc => doc.data());
        console.log(`Itens carregados para relatório de reposição: ${itensInventario.length}`); // DEBUG
    } catch (error) {
        console.error("Erro ao carregar itens para o relatório de reposição:", error); // DEBUG
        alert("Erro ao carregar itens para o relatório de reposição. Verifique o console.");
        return;
    }

    // Filtragem em memória para itens <= minQuantity
    const itensParaReposicao = itensInventario.filter(item => item.quantidade <= minQuantity);

    if (itensParaReposicao.length === 0) {
        alert(`Nenhum item encontrado com quantidade igual ou inferior a ${minQuantity}.`);
        console.log("Nenhum item para reposição encontrado."); // DEBUG
        return;
    }

    // Agrupar por categoria e ordenar as categorias
    const itensPorCategoria = itensParaReposicao.reduce((acc, item) => {
        const categoria = item.categoria || 'Geral';
        if (!acc[categoria]) {
            acc[categoria] = [];
        }
        acc[categoria].push(item);
        return acc;
    }, {});

    const categoriasOrdenadas = Object.keys(itensPorCategoria).sort();


    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let currentY = 15; 

    // --- Cabeçalho do PDF --- (Igual aos outros)
    doc.setFontSize(18); doc.text("Laboratório de Análises Clínicas CETEP/LNAB", 105, currentY, null, null, "center"); currentY += 10;
    doc.setFontSize(10); const now = new Date(); const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`; const formattedTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    doc.text(`Data: ${formattedDate} - Hora: ${formattedTime} - Operador: ${operador}`, 105, currentY, null, null, "center"); currentY += 5;
    doc.setFontSize(8); doc.text("Endereço: 233, R. Mario Laérte, 163 - Centro, Alagoinhas - BA, 48005-098", 105, currentY, null, null, "center"); currentY += 4;
    doc.text("Site: https://www.ceteplnab.com.br/", 105, currentY, null, null, "center"); currentY += 6;
    doc.setLineWidth(0.5); doc.line(20, currentY, 190, currentY); currentY += 10;

    // --- Título do Relatório ---
    doc.setFontSize(14);
    doc.text(`RELATÓRIO DE REPOSIÇÃO - Qtd. Mínima: ${minQuantity}`, 105, currentY, null, null, "center");
    currentY += 8;
    doc.setLineWidth(0.2);
    doc.line(20, currentY, 190, currentY);
    currentY += 10;

    // --- Conteúdo: Itens para Reposição (Separados por Categoria) ---
    doc.setFontSize(8); 
    const repColWidths = [15, 50, 15, 20, 25, 25]; // Ajuste para colunas
    const repColPositions = [];
    let repCurrentX = startX;
    repColWidths.forEach(width => {
        repColPositions.push(repCurrentX);
        repCurrentX += width;
    });

    categoriasOrdenadas.forEach(categoria => {
        const itensDaCategoria = itensPorCategoria[categoria];
        
        // Categoria como subtítulo
        if (currentY > 270) { // Verifica se há espaço para categoria e item
            doc.addPage();
            currentY = 15; 
            // Cabeçalho e Título em nova página (repetir cabeçalho completo)
            doc.setFontSize(18); doc.text("Laboratório de Análises Clínicas CETEP/LNAB", 105, currentY, null, null, "center"); currentY += 10;
            doc.setFontSize(10); doc.text(`Data: ${formattedDate} - Hora: ${formattedTime} - Operador: ${operador}`, 105, currentY, null, null, "center"); currentY += 5;
            doc.setFontSize(8); doc.text("Endereço: 233, R. Mario Laérte, 163 - Centro, Alagoinhas - BA, 48005-098", 105, currentY, null, null, "center"); currentY += 4;
            doc.text("Site: https://www.ceteplnab.com.br/", 105, currentY, null, null, "center"); currentY += 6;
            doc.setLineWidth(0.5); doc.line(20, currentY, 190, currentY); currentY += 10;
            doc.setFontSize(14); doc.text(`RELATÓRIO DE REPOSIÇÃO (Continuação) - Qtd. Mínima: ${minQuantity}`, 105, currentY, null, null, "center"); currentY += 8;
            doc.setLineWidth(0.2); doc.line(20, currentY, 190, currentY); currentY += 10;
            doc.setFontSize(8); // Volta fonte do conteúdo
        }
        
        doc.setFont(undefined, 'bold');
        doc.text(`Categoria: ${categoria}`, startX + 5, currentY); // Subtítulo da categoria
        currentY += lineHeight;
        
        // Títulos das colunas dentro da categoria
        doc.text("CÓD.", repColPositions[0], currentY);
        doc.text("DESCRIÇÃO", repColPositions[1], currentY);
        doc.text("QTD. ATUAL", repColPositions[2], currentY);
        doc.text("UNID.", repColPositions[3], currentY);
        doc.text("LOCALIZAÇÃO", repColPositions[4], currentY);
        doc.text("VALIDADE", repColPositions[5], currentY);
        currentY += lineHeight + 1; // Espaço após os títulos

        doc.setFont(undefined, 'normal');
        
        itensDaCategoria.forEach(item => {
            if (currentY > 280) { // Se o item não couber, nova página
                doc.addPage();
                currentY = 15;
                // Repetir cabeçalho e título do relatório
                doc.setFontSize(18); doc.text("Laboratório de Análises Clínicas CETEP/LNAB", 105, currentY, null, null, "center"); currentY += 10;
                doc.setFontSize(10); doc.text(`Data: ${formattedDate} - Hora: ${formattedTime} - Operador: ${operador}`, 105, currentY, null, null, "center"); currentY += 5;
                doc.setFontSize(8); doc.text("Endereço: 233, R. Mario Laérte, 163 - Centro, Alagoinhas - BA, 48005-098", 105, currentY, null, null, "center"); currentY += 4;
                doc.text("Site: https://www.ceteplnab.com.br/", 105, currentY, null, null, "center"); currentY += 6;
                doc.setLineWidth(0.5); doc.line(20, currentY, 190, currentY); currentY += 10;
                doc.setFontSize(14); doc.text(`RELATÓRIO DE REPOSIÇÃO (Continuação) - Qtd. Mínima: ${minQuantity}`, 105, currentY, null, null, "center"); currentY += 8;
                doc.setLineWidth(0.2); doc.line(20, currentY, 190, currentY); currentY += 10;
                doc.setFontSize(8);
                doc.setFont(undefined, 'bold');
                doc.text("CÓD.", repColPositions[0], currentY);
                doc.text("DESCRIÇÃO", repColPositions[1], currentY);
                doc.text("QTD. ATUAL", repColPositions[2], currentY);
                doc.text("UNID.", repColPositions[3], currentY);
                doc.text("LOCALIZAÇÃO", repColPositions[4], currentY);
                doc.text("VALIDADE", repColPositions[5], currentY);
                currentY += lineHeight + 1;
                doc.setFont(undefined, 'normal');
            }
            
            const repDataValidade = item.dataVencimento ? new Date(item.dataVencimento.toDate()).toLocaleDateString('pt-BR') : 'N/D';
            const repItemLocalizacao = item.localizacao || 'Não definida';

            doc.text(item.cod || 'N/D', repColPositions[0], currentY);
            doc.text(item.item, repColPositions[1], currentY);
            doc.text(item.quantidade.toString(), repColPositions[2], currentY);
            doc.text(item.unidadeMedida || 'Não definida', repColPositions[3], currentY);
            doc.text(repItemLocalizacao, repColPositions[4], currentY);
            doc.text(repDataValidade, repColPositions[5], currentY);
            currentY += lineHeight;
        });
        currentY += lineHeight; // Espaço após cada categoria
    });

    // --- Rodapé do PDF ---
    doc.setPage(doc.internal.getNumberOfPages());
    doc.setFontSize(9);
    doc.text("Documento gerado automaticamente pelo SISLAB.", 105, 280, null, null, "center");

    doc.output('dataurlnewwindow', { filename: `Relatorio_Reposicao_${formattedDate}_QtdMin${minQuantity}.pdf` });

    alert(`Relatório de Reposição gerado com sucesso por ${operador}! Verifique a nova aba para visualizar e imprimir.`);
    console.log("Relatório de reposição gerado."); // DEBUG
}

async function gerarRelatorioConsumo() {
    console.log("Iniciando geração de Relatório de Consumo..."); // DEBUG
    const operador = await getOperadorName();
    if (operador === null) {
        alert("Operação cancelada: Nome do operador não fornecido.");
        console.log("Relatório de consumo cancelado: Operador não fornecido."); // DEBUG
        return;
    }

    let startDateInput = prompt("Digite a Data de Início (AAAA-MM-DD) para o relatório de consumo:");
    if (startDateInput === null) { alert("Operação cancelada."); return; }
    let endDateInput = prompt("Digite a Data de Término (AAAA-MM-DD) para o relatório de consumo:");
    if (endDateInput === null) { alert("Operação cancelada."); return; }

    const startDate = new Date(startDateInput + 'T00:00:00');
    const endDate = new Date(endDateInput + 'T23:59:59'); // Até o final do dia
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate > endDate) {
        alert("Datas inválidas. Por favor, digite datas no formato AAAA-MM-DD e certifique-se de que a data de início não é posterior à de término.");
        console.log("Relatório de consumo impedido: Datas inválidas."); // DEBUG
        return;
    }

    if (typeof window.firestoreDb === 'undefined' || !window.firestoreDb) {
        alert("Banco de dados não inicializado. Não é possível imprimir o relatório de consumo.");
        console.error("Firestore DB não inicializado para relatório de consumo."); // DEBUG
        return;
    }

    let logsConsumo = [];
    try {
        const logRef = window.firebaseFirestoreCollection(window.firestoreDb, 'log_inventario_v3');
        // Consulta todos os logs no período
        const q = window.firebaseFirestoreQuery(
            logRef,
            window.firebaseFirestoreWhere('dataHoraMovimento', '>=', startDate),
            window.firebaseFirestoreWhere('dataHoraMovimento', '<=', endDate),
            window.firebaseFirestoreOrderBy('dataHoraMovimento', 'asc') // Ordenar para depuração se necessário
        );
        const querySnapshot = await window.firebaseFirestoreGetDocs(q);
        logsConsumo = querySnapshot.docs.map(doc => doc.data());
        console.log(`Logs de consumo carregados para o período: ${logsConsumo.length}`); // DEBUG

    } catch (error) {
        console.error("Erro ao carregar logs para o relatório de consumo:", error); // DEBUG
        alert("Erro ao carregar logs para o relatório de consumo. Verifique o console.");
        return;
    }

    // Processamento e Agregação de Dados de Consumo
    const consumoPorItemECategoria = {}; // {categoria: {itemId: {itemNome, itemCod, totalConsumido}}}

    logsConsumo.forEach(log => {
        if (log.tipoMovimento === "SAIDA") { // Ou REMOCAO, se quiser contabilizar como consumo completo
            const categoria = log.categoria || 'Geral'; // Categoria no momento da saída (se existir no log)
            const itemId = log.itemId;
            const quantidadeConsumida = Math.abs(log.quantidadeMovimentada); // Consumo é sempre positivo

            if (!consumoPorItemECategoria[categoria]) {
                consumoPorItemECategoria[categoria] = {};
            }
            if (!consumoPorItemECategoria[categoria][itemId]) {
                consumoPorItemECategoria[categoria][itemId] = {
                    itemNome: log.itemNome,
                    itemCod: log.itemCod,
                    totalConsumido: 0,
                    unidadeMedida: log.unidadeMedidaLog || 'Não definida'
                };
            }
            consumoPorItemECategoria[categoria][itemId].totalConsumido += quantidadeConsumida;
        }
    });
    console.log("Consumo processado por item e categoria:", consumoPorItemECategoria); // DEBUG

    const categoriasConsumoOrdenadas = Object.keys(consumoPorItemECategoria).sort();

    if (categoriasConsumoOrdenadas.length === 0) {
        alert("Nenhum consumo registrado no período selecionado.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let currentY = 15; 

    // --- Cabeçalho do PDF ---
    doc.setFontSize(18); doc.text("Laboratório de Análises Clínicas CETEP/LNAB", 105, currentY, null, null, "center"); currentY += 10;
    doc.setFontSize(10); doc.text(`Data: ${formattedDate} - Hora: ${formattedTime} - Operador: ${operador}`, 105, currentY, null, null, "center"); currentY += 5;
    doc.setFontSize(8); doc.text("Endereço: 233, R. Mario Laérte, 163 - Centro, Alagoinhas - BA, 48005-098", 105, currentY, null, null, "center"); currentY += 4;
    doc.text("Site: https://www.ceteplnab.com.br/", 105, currentY, null, null, "center"); currentY += 6;
    doc.setLineWidth(0.5); doc.line(20, currentY, 190, currentY); currentY += 10;

    // --- Título do Relatório ---
    doc.setFontSize(14);
    doc.text(`RELATÓRIO DE CONSUMO - Período: ${startDateInput} a ${endDateInput}`, 105, currentY, null, null, "center");
    currentY += 8;
    doc.setLineWidth(0.2);
    doc.line(20, currentY, 190, currentY);
    currentY += 10;

    // --- Conteúdo: Consumo por Categoria ---
    doc.setFontSize(9);
    const consColWidths = [20, 60, 20, 30]; // Cód, Descrição, Consumo, Unidade
    const consColPositions = [];
    let consCurrentX = startX;
    consColWidths.forEach(width => {
        consColPositions.push(consCurrentX);
        consCurrentX += width;
    });

    categoriasConsumoOrdenadas.forEach(categoria => {
        const itensConsumidosNaCategoria = consumoPorItemECategoria[categoria];
        
        if (currentY > 270) { 
            doc.addPage();
            currentY = 15; 
            // Cabeçalho e Título em nova página (repetir cabeçalho completo)
            doc.setFontSize(18); doc.text("Laboratório de Análises Clínicas CETEP/LNAB", 105, currentY, null, null, "center"); currentY += 10;
            doc.setFontSize(10); doc.text(`Data: ${formattedDate} - Hora: ${formattedTime} - Operador: ${operador}`, 105, currentY, null, null, "center"); currentY += 5;
            doc.setFontSize(8); doc.text("Endereço: 233, R. Mario Laérte, 163 - Centro, Alagoinhas - BA, 48005-098", 105, currentY, null, null, "center"); currentY += 4;
            doc.text("Site: https://www.ceteplnab.com.br/", 105, currentY, null, null, "center"); currentY += 6;
            doc.setLineWidth(0.5); doc.line(20, currentY, 190, currentY); currentY += 10;
            doc.setFontSize(14); doc.text(`RELATÓRIO DE CONSUMO (Continuação) - Período: ${startDateInput} a ${endDateInput}`, 105, currentY, null, null, "center"); currentY += 8;
            doc.setLineWidth(0.2); doc.line(20, currentY, 190, currentY); currentY += 10;
            doc.setFontSize(9); 
        }
        
        doc.setFont(undefined, 'bold');
        doc.text(`Categoria: ${categoria}`, startX + 5, currentY); 
        currentY += lineHeight;
        
        doc.text("CÓD.", consColPositions[0], currentY);
        doc.text("DESCRIÇÃO", consColPositions[1], currentY);
        doc.text("CONSUMO", consColPositions[2], currentY);
        doc.text("UNID.", consColPositions[3], currentY);
        currentY += lineHeight + 1; 

        doc.setFont(undefined, 'normal');
        
        // Ordena itens por nome para exibição
        Object.values(itensConsumidosNaCategoria).sort((a,b) => a.itemNome.localeCompare(b.itemNome)).forEach(itemConsumo => {
            if (currentY > 280) { 
                doc.addPage();
                currentY = 15;
                // Repetir cabeçalho e título do relatório
                doc.setFontSize(18); doc.text("Laboratório de Análises Clínicas CETEP/LNAB", 105, currentY, null, null, "center"); currentY += 10;
                doc.setFontSize(10); doc.text(`Data: ${formattedDate} - Hora: ${formattedTime} - Operador: ${operador}`, 105, currentY, null, null, "center"); currentY += 5;
                doc.setFontSize(8); doc.text("Endereço: 233, R. Mario Laérte, 163 - Centro, Alagoinhas - BA, 48005-098", 105, currentY, null, null, "center"); currentY += 4;
                doc.text("Site: https://www.ceteplnab.com.br/", 105, currentY, null, null, "center"); currentY += 6;
                doc.setLineWidth(0.5); doc.line(20, currentY, 190, currentY); currentY += 10;
                doc.setFontSize(14); doc.text(`RELATÓRIO DE CONSUMO (Continuação) - Período: ${startDateInput} a ${endDateInput}`, 105, currentY, null, null, "center"); currentY += 8;
                doc.setLineWidth(0.2); doc.line(20, currentY, 190, currentY); currentY += 10;
                doc.setFontSize(9);
                doc.setFont(undefined, 'bold');
                doc.text("CÓD.", consColPositions[0], currentY);
                doc.text("DESCRIÇÃO", consColPositions[1], currentY);
                doc.text("CONSUMO", consColPositions[2], currentY);
                doc.text("UNID.", consColPositions[3], currentY);
                currentY += lineHeight + 1;
                doc.setFont(undefined, 'normal');
            }
            
            doc.text(itemConsumo.itemCod || 'N/D', consColPositions[0], currentY);
            doc.text(itemConsumo.itemNome, consColPositions[1], currentY);
            doc.text(itemConsumo.totalConsumido.toString(), consColPositions[2], currentY);
            doc.text(itemConsumo.unidadeMedida, consColPositions[3], currentY);
            currentY += lineHeight;
        });
        currentY += lineHeight; // Espaço após cada categoria
    });

    // --- Rodapé do PDF ---
    doc.setPage(doc.internal.getNumberOfPages());
    doc.setFontSize(9);
    doc.text("Documento gerado automaticamente pelo SISLAB.", 105, 280, null, null, "center");

    doc.output('dataurlnewwindow', { filename: `Relatorio_Consumo_${formattedDate}.pdf` });

    alert(`Relatório de Consumo gerado com sucesso por ${operador}! Verifique a nova aba para visualizar e imprimir.`);
    console.log("Relatório de consumo gerado."); // DEBUG
}

async function gerarRelatorioVencimento() {
    console.log("Iniciando geração de Relatório de Itens Próximos do Vencimento..."); // DEBUG
    const operador = await getOperadorName();
    if (operador === null) {
        alert("Operação cancelada: Nome do operador não fornecido.");
        console.log("Relatório de vencimento cancelado: Operador não fornecido."); // DEBUG
        return;
    }

    let daysUntilDueInput = prompt("Digite o número de dias MÁXIMO para o vencimento para um item entrar no relatório (ex: 90 para 90 dias):");
    if (daysUntilDueInput === null) {
        alert("Operação de relatório de vencimento cancelada.");
        console.log("Relatório de vencimento cancelado pelo usuário."); // DEBUG
        return;
    }
    const daysUntilDue = parseInt(daysUntilDueInput.trim());

    if (isNaN(daysUntilDue) || daysUntilDue < 0) {
        alert("Número de dias inválido. Por favor, digite um número positivo ou zero.");
        console.log("Relatório de vencimento impedido: Dias inválidos."); // DEBUG
        return;
    }

    if (typeof window.firestoreDb === 'undefined' || !window.firestoreDb) {
        alert("Banco de dados não inicializado. Não é possível imprimir o relatório de vencimento.");
        console.error("Firestore DB não inicializado para relatório de vencimento."); // DEBUG
        return;
    }

    let itensInventario = [];
    try {
        const inventarioRef = window.firebaseFirestoreCollection(window.firestoreDb, 'inventario_v3'); 
        const q = window.firebaseFirestoreQuery(inventarioRef, window.firebaseFirestoreOrderBy('item', 'asc')); 
        const querySnapshot = await window.firebaseFirestoreGetDocs(q);
        itensInventario = querySnapshot.docs.map(doc => doc.data());
        console.log(`Itens carregados para relatório de vencimento: ${itensInventario.length}`); // DEBUG
    } catch (error) {
        console.error("Erro ao carregar itens para o relatório de vencimento:", error); // DEBUG
        alert("Erro ao carregar itens para o relatório de vencimento. Verifique o console.");
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zera hora para comparação de data
    const dueDateLimit = new Date();
    dueDateLimit.setDate(today.getDate() + daysUntilDue);
    dueDateLimit.setHours(23, 59, 59, 999); // Até o final do dia limite

    // Filtrar itens com data de vencimento válida e dentro do limite
    const itensProximosVencimento = itensInventario.filter(item => {
        if (item.dataVencimento) {
            const vencimentoDate = item.dataVencimento.toDate();
            return vencimentoDate >= today && vencimentoDate <= dueDateLimit;
        }
        return false;
    });

    if (itensProximosVencimento.length === 0) {
        alert(`Nenhum item encontrado que vence em até ${daysUntilDue} dias.`);
        console.log("Nenhum item próximo do vencimento encontrado."); // DEBUG
        return;
    }

    // Agrupar por categoria e ordenar as categorias
    const itensPorCategoria = itensProximosVencimento.reduce((acc, item) => {
        const categoria = item.categoria || 'Geral';
        if (!acc[categoria]) {
            acc[categoria] = [];
        }
        acc[categoria].push(item);
        return acc;
    }, {});

    const categoriasOrdenadas = Object.keys(itensPorCategoria).sort();


    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let currentY = 15; 

    // --- Cabeçalho do PDF ---
    doc.setFontSize(18); doc.text("Laboratório de Análises Clínicas CETEP/LNAB", 105, currentY, null, null, "center"); currentY += 10;
    doc.setFontSize(10); doc.text(`Data: ${formattedDate} - Hora: ${formattedTime} - Operador: ${operador}`, 105, currentY, null, null, "center"); currentY += 5;
    doc.setFontSize(8); doc.text("Endereço: 233, R. Mario Laérte, 163 - Centro, Alagoinhas - BA, 48005-098", 105, currentY, null, null, "center"); currentY += 4;
    doc.text("Site: https://www.ceteplnab.com.br/", 105, currentY, null, null, "center"); currentY += 6;
    doc.setLineWidth(0.5); doc.line(20, currentY, 190, currentY); currentY += 10;

    // --- Título do Relatório ---
    doc.setFontSize(14);
    doc.text(`RELATÓRIO DE ITENS PRÓXIMOS DO VENCIMENTO (Até ${daysUntilDue} dias)`, 105, currentY, null, null, "center");
    currentY += 8;
    doc.setLineWidth(0.2);
    doc.line(20, currentY, 190, currentY);
    currentY += 10;

    // --- Conteúdo: Itens por Categoria ---
    doc.setFontSize(8); 
    // Larguras das colunas
    const vencColWidths = [15, 45, 15, 20, 25, 25, 25]; // Cód, Descrição, Qtd, Unid, Local, Validade, Obs
    const vencColPositions = [];
    let vencCurrentX = startX;
    vencColWidths.forEach(width => {
        vencColPositions.push(vencCurrentX);
        vencCurrentX += width;
    });

    categoriasOrdenadas.forEach(categoria => {
        const itensDaCategoria = itensPorCategoria[categoria];
        
        if (currentY > 270) { 
            doc.addPage();
            currentY = 15; 
            // Repetir cabeçalho e título do relatório
            doc.setFontSize(18); doc.text("Laboratório de Análises Clínicas CETEP/LNAB", 105, currentY, null, null, "center"); currentY += 10;
            doc.setFontSize(10); doc.text(`Data: ${formattedDate} - Hora: ${formattedTime} - Operador: ${operador}`, 105, currentY, null, null, "center"); currentY += 5;
            doc.setFontSize(8); doc.text("Endereço: 233, R. Mario Laérte, 163 - Centro, Alagoinhas - BA, 48005-098", 105, currentY, null, null, "center"); currentY += 4;
            doc.text("Site: https://www.ceteplnab.com.br/", 105, currentY, null, null, "center"); currentY += 6;
            doc.setLineWidth(0.5); doc.line(20, currentY, 190, currentY); currentY += 10;
            doc.setFontSize(14); doc.text(`RELATÓRIO DE ITENS PRÓXIMOS DO VENCIMENTO (Continuação) - Até ${daysUntilDue} dias`, 105, currentY, null, null, "center"); currentY += 8;
            doc.setLineWidth(0.2); doc.line(20, currentY, 190, currentY); currentY += 10;
            doc.setFontSize(8);
        }
        
        doc.setFont(undefined, 'bold');
        doc.text(`Categoria: ${categoria}`, startX + 5, currentY); 
        currentY += lineHeight;
        
        doc.text("CÓD.", vencColPositions[0], currentY);
        doc.text("DESCRIÇÃO", vencColPositions[1], currentY);
        doc.text("QTD.", vencColPositions[2], currentY);
        doc.text("UNID.", vencColPositions[3], currentY);
        doc.text("LOCALIZAÇÃO", vencColPositions[4], currentY);
        doc.text("VALIDADE", vencColPositions[5], currentY);
        doc.text("OBS.", vencColPositions[6], currentY); // Observações aqui
        currentY += lineHeight + 1; 

        doc.setFont(undefined, 'normal');
        
        // Ordena itens por data de vencimento para exibição
        itensDaCategoria.sort((a, b) => {
            const dateA = a.dataVencimento ? a.dataVencimento.toDate().getTime() : Infinity;
            const dateB = b.dataVencimento ? b.dataVencimento.toDate().getTime() : Infinity;
            return dateA - dateB;
        }).forEach(item => {
            if (currentY > 280) { 
                doc.addPage();
                currentY = 15;
                // Repetir cabeçalho e título do relatório
                doc.setFontSize(18); doc.text("Laboratório de Análises Clínicas CETEP/LNAB", 105, currentY, null, null, "center"); currentY += 10;
                doc.setFontSize(10); doc.text(`Data: ${formattedDate} - Hora: ${formattedTime} - Operador: ${operador}`, 105, currentY, null, null, "center"); currentY += 5;
                doc.setFontSize(8); doc.text("Endereço: 233, R. Mario Laérte, 163 - Centro, Alagoinhas - BA, 48005-098", 105, currentY, null, null, "center"); currentY += 4;
                doc.text("Site: https://www.ceteplnab.com.br/", 105, currentY, null, null, "center"); currentY += 6;
                doc.setLineWidth(0.5); doc.line(20, currentY, 190, currentY); currentY += 10;
                doc.setFontSize(14); doc.text(`RELATÓRIO DE ITENS PRÓXIMOS DO VENCIMENTO (Continuação) - Até ${daysUntilDue} dias`, 105, currentY, null, null, "center"); currentY += 8;
                doc.setLineWidth(0.2); doc.line(20, currentY, 190, currentY); currentY += 10;
                doc.setFontSize(8);
                doc.setFont(undefined, 'bold');
                doc.text("CÓD.", vencColPositions[0], currentY);
                doc.text("DESCRIÇÃO", vencColPositions[1], currentY);
                doc.text("QTD.", vencColPositions[2], currentY);
                doc.text("UNID.", vencColPositions[3], currentY);
                doc.text("LOCALIZAÇÃO", vencColPositions[4], currentY);
                doc.text("VALIDADE", vencColPositions[5], currentY);
                doc.text("OBS.", vencColPositions[6], currentY);
                currentY += lineHeight + 1;
                doc.setFont(undefined, 'normal');
            }
            
            const itemVencimentoFormatted = item.dataVencimento ? new Date(item.dataVencimento.toDate()).toLocaleDateString('pt-BR') : 'N/D';
            const itemObservacoesVenc = doc.splitTextToSize(item.observacoes && item.observacoes !== 'Não definido' ? item.observacoes : '', 20); // Quebra observações longas
            
            doc.text(item.cod || 'N/D', vencColPositions[0], currentY);
            doc.text(item.item, vencColPositions[1], currentY);
            doc.text(item.quantidade.toString(), vencColPositions[2], currentY);
            doc.text(item.unidadeMedida || 'Não definida', vencColPositions[3], currentY);
            doc.text(item.localizacao || 'Não definida', vencColPositions[4], currentY);
            doc.text(itemVencimentoFormatted, vencColPositions[5], currentY);
            doc.text(itemObservacoesVenc, vencColPositions[6], currentY);
            currentY += Math.max(lineHeight, itemObservacoesVenc.length * (lineHeight - 2)); // Ajusta linha conforme observações
        });
        currentY += lineHeight; // Espaço após cada categoria
    });

    // --- Rodapé do PDF ---
    doc.setPage(doc.internal.getNumberOfPages());
    doc.setFontSize(9);
    doc.text("Documento gerado automaticamente pelo SISLAB.", 105, 280, null, null, "center");

    doc.output('dataurlnewwindow', { filename: `Relatorio_Vencimento_${formattedDate}.pdf` });

    alert(`Relatório de Itens Próximos do Vencimento gerado com sucesso por ${operador}! Verifique a nova aba para visualizar e imprimir.`);
    console.log("Relatório de vencimento gerado."); // DEBUG
}

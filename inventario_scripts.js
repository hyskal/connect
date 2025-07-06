// VERSÃO: 3.0.8g (inventario_scripts.js)
// CHANGELOG:
// - Corrigido: Posicionamento definitivo dos botões de "Mov. Rápida" para a coluna correta, confirmando a lógica de anexação.
// - Melhorado: Estrutura do código refatorada em 20 seções para facilitar manutenção e edições futuras.
// - Refatorado: Implementada a função createActionButtons para modularizar a criação de botões de ação.
// - Otimizado: Adicionado uso de DocumentFragment para melhor performance na listagem de itens.
// - Atualizado: Changelog simplificado e focado nas mudanças desta versão.

// --- SEÇÃO 1: Importações e Constantes Globais ---
import {
    getOperadorNameFromInput,
    showError,
    clearError,
    formatarCod,
    formatDateToInput,
    formatDateToDisplay,
    formatDateTimeToDisplay,
    loadCategories,
    LOCAL_FILENAME_CATEGORIES // Importa também a constante do nome do arquivo de categorias
} from './sislab_utils.js';

let currentEditingItemId = null;
// A variável categoriasDisponiveis não é mais estritamente necessária aqui,
// pois loadCategories em sislab_utils.js já popula os selects diretamente,
// e a validação de categoria em relatórios agora usa as opções do select.
// Mantida por compatibilidade ou se houver outro uso futuro.
let categoriasDisponiveis = [];
let currentFilterStatus = 'all'; // Estado atual do filtro de status (all, critical, inStock, outOfStock)
const OPERATOR_NAME_STORAGE_KEY = 'sislab_inventario_operator_name'; // Chave para localStorage

// --- SEÇÃO 2: Event Listeners Iniciais (DOMContentLoaded) ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM totalmente carregado. Iniciando setup..."); // DEBUG

    // Carregar categorias antes de listar os itens, pois a lista depende delas
    await loadCategories();

    listarItensInventario(); // Lista itens após carregar categorias

    // Carregar nome do operador do localStorage, se existir
    const savedOperatorName = localStorage.getItem(OPERATOR_NAME_STORAGE_KEY);
    if (savedOperatorName) {
        document.getElementById('operatorName').value = savedOperatorName;
    }

    // Event listeners para o formulário de cadastro/edição
    document.getElementById('saveItemBtn').addEventListener('click', saveOrUpdateItem);
    document.getElementById('clearItemFormBtn').addEventListener('click', clearItemForm);
    document.getElementById('deleteItemFormBtn').addEventListener('click', deleteItemFromForm);

    // Event listener para o novo botão "Cadastrar Novo Item"
    document.getElementById('showAddItemFormBtn').addEventListener('click', () => {
        clearItemForm(); // Limpa o formulário antes de exibi-lo para novo cadastro
        showItemForm(); // Exibe o formulário
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola para o topo
    });

    // --- CONSOLIDAÇÃO DOS LISTENERS DE FILTROS E RELATÓRIOS AQUI ---
    // Event listeners para filtros e pesquisa
    document.getElementById('searchInventory').addEventListener('input', listarItensInventario);
    document.getElementById('filterCategory').addEventListener('change', listarItensInventario);
    document.getElementById('criticalQuantityInput').addEventListener('input', () => {
        if (currentFilterStatus === 'critical') {
            listarItensInventario();
        }
    });

    // Event listeners para botões de filtro de status
    document.getElementById('filterAllItemsBtn').addEventListener('click', () => { currentFilterStatus = 'all'; updateFilterButtons('filterAllItemsBtn'); listarItensInventario(); });
    document.getElementById('filterCriticalItemsBtn').addEventListener('click', () => { currentFilterStatus = 'critical'; updateFilterButtons('filterCriticalItemsBtn'); listarItensInventario(); });
    document.getElementById('filterInStockItemsBtn').addEventListener('click', () => { currentFilterStatus = 'inStock'; updateFilterButtons('filterInStockItemsBtn'); listarItensInventario(); });
    document.getElementById('filterOutOfStockItemsBtn').addEventListener('click', () => { currentFilterStatus = 'outOfStock'; updateFilterButtons('filterOutOfStockItemsBtn'); listarItensInventario(); });

    // Event listener para o botão de RELATÓRIO DE ESTOQUE ATUAL
    document.getElementById('printInventoryReportBtn').addEventListener('click', imprimirRelatorioInventario); // MUDANÇA: CONSOLIDADO AQUI

    // Event listeners para os outros botões de relatório (mantidos aqui)
    document.getElementById('generateReplenishmentReportBtn').addEventListener('click', gerarRelatorioReposicao);
    document.getElementById('generateConsumptionReportBtn').addEventListener('click', gerarRelatorioConsumo);
    document.getElementById('generateDueDateReportBtn').addEventListener('click', gerarRelatorioVencimento);
    
    // Event listener para fechar histórico
    document.getElementById('closeItemLogBtn').addEventListener('click', hideItemLog);


    console.log("Setup inicial concluído."); // DEBUG
});

// --- SEÇÃO 3: Funções de Exibição/Ocultação do Formulário ---
// (Esta seção permanece inalterada)
function showItemForm() {
    document.getElementById('itemFormSection').style.display = 'flex'; // Altera para flex para manter layout
    console.log("Formulário de item exibido."); // DEBUG
}

function hideItemForm() {
    document.getElementById('itemFormSection').style.display = 'none';
    console.log("Formulário de item ocultado."); // DEBUG
}

// --- SEÇÃO 4: Funções de Filtros de Tabela e Pesquisa (Listeners) ---
// ESTA SEÇÃO AGORA ESTÁ VAZIA, POIS SEUS LISTENERS FORAM CONSOLIDADOS NA SEÇÃO 2.
// NÃO DEVE HAVER MAIS UM document.addEventListener('DOMContentLoaded', ...) AQUI.



// --- SEÇÃO 5: Lógica de Listagem de Itens (listarItensInventario) ---
async function listarItensInventario() {
    console.log("DEBUG: Iniciando listagem de itens do inventário..."); // DEBUG
    const inventoryListBody = document.querySelector('#inventoryList tbody');
    // Mantenha a mensagem inicial de carregamento para feedback rápido ao usuário
    inventoryListBody.innerHTML = '<tr><td colspan="11">Carregando itens...</td></tr>';

    const searchTerm = document.getElementById('searchInventory').value.toLowerCase();
    const filterCategory = document.getElementById('filterCategory').value;
    const criticalQuantity = parseInt(document.getElementById('criticalQuantityInput').value);
    let items = [];

    if (typeof window.firestoreDb === 'undefined' || !window.firestoreDb) {
        console.error("DEBUG: Firestore DB não inicializado em listarItensInventario."); // DEBUG
        inventoryListBody.innerHTML = '<tr><td colspan="11">Banco de dados não inicializado.</td></tr>';
        return;
    }

    try {
        const inventarioRef = window.firebaseFirestoreCollection(window.firestoreDb, 'inventario_v3');
        let q = window.firebaseFirestoreQuery(inventarioRef, window.firebaseFirestoreOrderBy('item', 'asc'));

        const querySnapshot = await window.firebaseFirestoreGetDocs(q);
        items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`DEBUG: Total de itens brutos carregados: ${items.length}`); // DEBUG

        // Filtragem em memória
        let filteredItems = items.filter(item => {
            const matchesSearch = searchTerm === '' ||
                                  (item.item && item.item.toLowerCase().includes(searchTerm)) ||
                                  (item.cod && item.cod.toLowerCase().includes(searchTerm));
            const matchesCategory = filterCategory === '' || (item.categoria && item.categoria === filterCategory);

            // Lógica do filtro de status
            let matchesStatus = true;
            if (currentFilterStatus === 'critical') {
                matchesStatus = item.quantidade <= criticalQuantity && item.quantidade > 0;
            } else if (currentFilterStatus === 'inStock') {
                matchesStatus = item.quantidade > 0;
            } else if (currentFilterStatus === 'outOfStock') {
                matchesStatus = item.quantidade === 0;
            } else if (currentFilterStatus === 'all') {
                matchesStatus = true;
            }

            return matchesSearch && matchesCategory && matchesStatus;
        });
        console.log(`DEBUG: Total de itens filtrados: ${filteredItems.length}`); // DEBUG

        if (filteredItems.length === 0) {
            // Se nenhum item for encontrado, limpa a tabela e mostra a mensagem de "nenhum item"
            inventoryListBody.innerHTML = '<tr><td colspan="11">Nenhum item encontrado com os filtros aplicados.</td></tr>';
            return;
        }

        // LIMPAR A TABELA ANTES DE ADICIONAR OS NOVOS ITENS. ESTE É O PONTO CRÍTICO PARA REMOVER "Carregando itens..."
        inventoryListBody.innerHTML = ''; 
        
        // Usando DocumentFragment para otimização de performance
        const fragment = document.createDocumentFragment();

        filteredItems.forEach(item => {
            const row = document.createElement('tr'); // Cria a linha explicitamente
            row.dataset.itemId = item.id;

            // Formatação de datas
            const dataVencimentoDate = item.dataVencimento ? item.dataVencimento.toDate() : null;
            const dataUltimaModificacaoDate = item.dataUltimaModificacao ? item.dataUltimaModificacao.toDate() : null;

            // Contagem de "Dias em Estoque"
            let diasEmEstoque = 'N/D';
            if (item.dataCadastro) {
                const dataCadastroOriginal = item.dataCadastro.toDate();
                const diffTime = Math.abs(new Date().getTime() - dataCadastroOriginal.getTime());
                diasEmEstoque = `${Math.ceil(diffTime / (1000 * 60 * 60 * 24))} dias`;
            }

            // Destaque visual para estoque crítico/zerado
            if (item.quantidade <= criticalQuantity && item.quantidade > 0 && currentFilterStatus !== 'outOfStock') {
                row.style.backgroundColor = '#fff3cd'; // Amarelo claro (aviso)
            } else if (item.quantidade === 0) {
                row.style.backgroundColor = '#f8d7da'; // Vermelho claro (perigo)
            }

            // --- Criação e Anexação das Células da Tabela ---

            // Coluna Cód. (0)
            const cellCod = document.createElement('td');
            cellCod.textContent = item.cod || 'N/D';
            row.appendChild(cellCod);

            // Coluna Descrição (1) - AGORA COM OBSERVAÇÕES
            const cellDescription = document.createElement('td');
            
            const descriptionSpan = document.createElement('span');
            descriptionSpan.textContent = item.item;
            descriptionSpan.style.display = 'block'; // Garante que a descrição ocupe uma linha
            cellDescription.appendChild(descriptionSpan);

            // Adiciona a observação se ela existe e não é "Não definido" ou vazia
            if (item.observacoes && item.observacoes !== 'Não definido' && item.observacoes.trim() !== '') {
                const observationsSpan = document.createElement('span');
                // Adiciona "Obs: " antes do conteúdo da observação
                observationsSpan.textContent = `Obs: ${item.observacoes}`; 
                observationsSpan.style.fontSize = '0.7em'; // Um pouco menor para diferenciar
                observationsSpan.style.color = '#555'; // Cor mais suave
                observationsSpan.style.display = 'block'; // Garante que a observação ocupe uma nova linha
                observationsSpan.style.marginTop = '2px'; // Pequena margem para separar da descrição
                cellDescription.appendChild(observationsSpan);
            }
            row.appendChild(cellDescription);


            // Coluna Qtd. (2)
            const cellQuantity = document.createElement('td');
            cellQuantity.textContent = item.quantidade;
            row.appendChild(cellQuantity);

            // Coluna Unid. (3)
            const cellUnit = document.createElement('td');
            cellUnit.textContent = item.unidadeMedida || 'Não definida';
            row.appendChild(cellUnit);

            // Coluna Categoria (4)
            const cellCategory = document.createElement('td');
            cellCategory.textContent = item.categoria || 'Geral';
            row.appendChild(cellCategory);

            // Coluna Localização (5)
            const cellLocation = document.createElement('td');
            cellLocation.textContent = item.localizacao || 'Não definida';
            row.appendChild(cellLocation);

            // Coluna Validade (6)
            const cellDueDate = document.createElement('td');
            cellDueDate.textContent = formatDateToDisplay(dataVencimentoDate);
            row.appendChild(cellDueDate);

            // Coluna Últ. Atual. (7)
            const cellLastUpdate = document.createElement('td');
            cellLastUpdate.textContent = formatDateTimeToDisplay(dataUltimaModificacaoDate);
            row.appendChild(cellLastUpdate);

            // Coluna Últ. Operador (8)
            const cellLastOperator = document.createElement('td');
            cellLastOperator.textContent = item.ultimoOperador || 'Não definido';
            row.appendChild(cellLastOperator);

            // Coluna Ações (9) - Usando a função refatorada
            console.log(`DEBUG: Criando célula para Ações (coluna 9) para item ${item.id}`);
            const actionsCell = document.createElement('td');
            actionsCell.classList.add('action-buttons');
            
            // Adiciona os botões criados pela função modularizada
            const actionButtonsContainer = createActionButtons(item);
            actionsCell.appendChild(actionButtonsContainer);

            row.appendChild(actionsCell); // ANEXA A CÉLULA À LINHA
            console.log(`DEBUG: Botões de Ações adicionados à actionsCell (coluna 9) para item ${item.id}. HTML da célula: ${actionsCell.outerHTML}`);

            // Coluna Movimentação Direta (10)
            console.log(`DEBUG: Criando célula para Mov. Rápida (coluna 10) para item ${item.id}`);
            const directMoveCell = document.createElement('td');
            directMoveCell.classList.add('direct-movement-controls');
            directMoveCell.style.whiteSpace = 'nowrap'; // Garante que não quebre linha dentro da célula

            // --- MUDANÇA CRÍTICA AQUI: Ordem dos elementos para + (quantidade) - ---
            const plusButton = document.createElement('button');
            plusButton.textContent = '+';
            plusButton.classList.add('movement-button', 'plus');
            plusButton.onclick = () => updateItemQuantityDirectly(item.id, item.item, item.cod, item.quantidade, parseInt(moveInput.value), item.unidadeMedida || 'Unidade');
            directMoveCell.appendChild(plusButton); // ANEXA O BOTÃO '+' PRIMEIRO

            const moveInput = document.createElement('input');
            moveInput.type = 'number';
            moveInput.value = '1';
            moveInput.min = '1';
            moveInput.classList.add('movement-input');
            directMoveCell.appendChild(moveInput); // ANEXA O CAMPO DE QUANTIDADE

            const minusButton = document.createElement('button');
            minusButton.textContent = '-';
            minusButton.classList.add('movement-button', 'minus');
            minusButton.onclick = () => updateItemQuantityDirectly(item.id, item.item, item.cod, item.quantidade, -parseInt(moveInput.value), item.unidadeMedida || 'Unidade');
            directMoveCell.appendChild(minusButton); // ANEXA O BOTÃO '-' POR ÚLTIMO
            // --- FIM DA MUDANÇA DE ORDEM ---

            row.appendChild(directMoveCell); // ANEXA A CÉLULA À LINHA
            console.log(`DEBUG: Controles de Mov. Rápida adicionados à directMoveCell (coluna 10) para item ${item.id}. HTML da célula: ${directMoveCell.outerHTML}`);

            // Anexa a linha completa ao fragmento
            fragment.appendChild(row);
        });

        // Anexa o fragmento completo ao corpo da tabela (otimização de performance)
        inventoryListBody.appendChild(fragment);
        console.log("DEBUG: Listagem de itens concluída com sucesso."); // DEBUG

    } catch (error) {
        console.error("DEBUG: Erro ao listar itens do inventário:", error); // DEBUG
        // Se houver um erro grave no carregamento, limpa a tabela e exibe uma mensagem de erro
        inventoryListBody.innerHTML = '<tr><td colspan="11">Erro ao carregar itens. Verifique o console.</td></tr>';
    }
}

// --- SEÇÃO 6: Função de Atualização Visual dos Botões de Filtro ---
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

// --- SEÇÃO 7: Criação Modular de Botões de Ação (createActionButtons) ---
// Função para criar e retornar um container com os botões de ação para um item
function createActionButtons(item) {
    const container = document.createElement('div');
    container.className = 'action-buttons-inner-container'; // Nova classe para container interno de botões
    
    // Removido actionsCell.classList.add('action-buttons'); daqui e colocado direto na td na seção 5.
    // O container principal da célula já terá a classe action-buttons.
    // Este container é para os botões dentro da célula.

    const buttonsData = [
        { text: 'Editar', className: 'edit-btn', onClick: () => loadItemForEdit(item) },
        { text: 'Ver Log', className: 'view-log-btn', onClick: () => showItemLog(item.id, item.item, item.cod) },
        { text: 'Remover', className: 'delete-btn', onClick: () => deleteItem(item.id, item.item, item.cod, item.quantidade) }
    ];
    
    buttonsData.forEach(btn => {
        const button = document.createElement('button');
        button.textContent = btn.text;
        button.className = btn.className; // A classe action-buttons-inner-container já lida com o layout flex
        button.onclick = btn.onClick;
        container.appendChild(button);
    });
    
    return container;
}


// --- SEÇÃO 8: Limpeza do Formulário (clearItemForm) ---
function clearItemForm() {
    console.log("Limpando formulário de item..."); // DEBUG
    document.getElementById('itemCod').value = '';
    document.getElementById('itemDescription').value = '';
    document.getElementById('itemQuantity').value = '0';
    document.getElementById('itemUnit').value = 'Unidade';
    document.getElementById('itemCategory').value = 'Geral';
    document.getElementById('itemLocation').value = '';
    document.getElementById('itemDueDate').value = '';
    document.getElementById('itemObservations').value = '';
    document.getElementById('itemLastUpdate').value = '';
    document.getElementById('itemIdToEdit').value = '';
    document.getElementById('saveItemBtn').textContent = 'Salvar Item';
    document.getElementById('deleteItemFormBtn').style.display = 'none';
    clearError('operatorName'); // Usando função importada
    clearError('itemDescription'); // Usando função importada
    clearError('itemQuantity'); // Usando função importada
    clearError('itemDueDate'); // Usando função importada
    currentEditingItemId = null;
    hideItemLog();
    console.log("Formulário limpo."); // DEBUG
}

// --- SEÇÃO 9: Salvar ou Atualizar Item (saveOrUpdateItem) ---
async function saveOrUpdateItem() {
    console.log("Iniciando saveOrUpdateItem..."); // DEBUG
    const operatorNameInput = document.getElementById('operatorName');
    const itemCodInput = document.getElementById('itemCod');
    const descriptionInput = document.getElementById('itemDescription');
    const quantityInput = document.getElementById('itemQuantity');
    const unitSelect = document.getElementById('itemUnit');
    const categorySelect = document.getElementById('itemCategory');
    const locationInput = document.getElementById('itemLocation');
    const dueDateInput = document.getElementById('itemDueDate');
    const observationsInput = document.getElementById('itemObservations');
    const itemIdToEdit = document.getElementById('itemIdToEdit').value;

    const operador = getOperadorNameFromInput(); // Usando função importada
    if (operador === null) {
        console.log("Validação: Nome do operador vazio."); // DEBUG
        return;
    }

    const description = descriptionInput.value.trim();
    const quantity = parseInt(quantityInput.value);
    const unit = unitSelect.value;
    const category = categorySelect.value;
    const location = locationInput.value.trim();
    const dueDate = dueDateInput.value ? new Date(dueDateInput.value + 'T00:00:00') : null;
    const observations = observationsInput.value.trim();

    // --- Atribuir "Não definido" para campos opcionais vazios conforme diretriz ---
    const finalLocation = location || 'Não definido';
    const finalObservations = observations || 'Não definido';
    const finalDueDate = dueDate; // dataVencimento pode ser null
    const finalUnit = unit || 'Unidade';
    const finalCategory = category || 'Geral';


    // Validação de campos obrigatórios (item e quantidade) - operador já validado acima
    let isValid = true;
    if (!description) {
        showError('itemDescription', 'A descrição é obrigatória.'); // Usando função importada
        isValid = false;
    } else {
        clearError('itemDescription'); // Usando função importada
    }
    if (isNaN(quantity) || quantity < 0) {
        showError('itemQuantity', 'Quantidade inválida. Deve ser um número maior ou igual a zero.'); // Usando função importada
        isValid = false;
    } else {
        clearError('itemQuantity'); // Usando função importada
    }
    if (finalDueDate && isNaN(finalDueDate.getTime())) {
        showError('itemDueDate', 'Data de vencimento inválida.'); // Usando função importada
        isValid = false;
    } else {
        clearError('itemDueDate'); // Usando função importada
    }

    if (!isValid) {
        console.log("Validação do formulário falhou."); // DEBUG
        return;
    }

    try {
        const inventarioRef = window.firebaseFirestoreCollection(window.firestoreDb, 'inventario_v3');
        const logRef = window.firebaseFirestoreCollection(window.firestoreDb, 'log_inventario_v3');

        let currentItemCod = itemCodInput.value;

        if (itemIdToEdit) { // Modo de Edição (Item Existente)
            console.log(`Editando item com ID: ${itemIdToEdit}`); // DEBUG
            const itemDocRef = window.firebaseFirestoreDoc(window.firestoreDb, 'inventario_v3', itemIdToEdit);
            const docSnap = await window.firebaseFirestoreGetDoc(itemDocRef);
            const oldData = docSnap.data();

            const oldQuantity = oldData.quantidade;
            const quantityChange = quantity - oldQuantity;

            let tipoMovimentoLog = "AJUSTE";
            if (quantityChange > 0) {
                tipoMovimentoLog = "ENTRADA";
            } else if (quantityChange < 0) {
                tipoMovimentoLog = "SAIDA";
            }

            // Alerta de estoque negativo para saída em edição
            if (tipoMovimentoLog === "SAIDA" && quantity < 0) {
                alert(`Impossível realizar a saída. A nova quantidade (${quantity}) resultaria em estoque negativo.`);
                console.log("Saída em edição impedida: estoque negativo."); // DEBUG
                return;
            }

            // Atualiza o documento principal do item
            await window.firebaseFirestoreUpdateDoc(itemDocRef, {
                item: description,
                quantidade: quantity,
                unidadeMedida: finalUnit,
                categoria: finalCategory,
                localizacao: finalLocation,
                dataVencimento: finalDueDate ? finalDueDate : null,
                observacoes: finalObservations,
                dataUltimaModificacao: window.firebaseFirestoreServerTimestamp(),
                ultimoOperador: operador
            });
            console.log("Documento de inventário atualizado."); // DEBUG

            // Registrar no log SÓ SE HOUVER MUDANÇA RELEVANTE (qualquer campo que não seja o id/cod)
            const oldDueDateTimestamp = oldData.dataVencimento ? oldData.dataVencimento.toDate().getTime() : null;
            const newDueDateTimestamp = finalDueDate ? finalDueDate.getTime() : null;


            const hasRelevantChange = quantityChange !== 0 ||
                                      oldData.item !== description ||
                                      oldData.observacoes !== finalObservations ||
                                      oldData.categoria !== finalCategory ||
                                      oldData.localizacao !== finalLocation ||
                                      oldData.unidadeMedida !== finalUnit ||
                                      oldDueDateTimestamp !== newDueDateTimestamp;

            if (hasRelevantChange) {
                console.log("Registrando log para edição com mudanças relevantes..."); // DEBUG
                await window.firebaseFirestoreAddDoc(logRef, {
                    itemId: itemIdToEdit,
                    itemNome: description,
                    itemCod: currentItemCod,
                    tipoMovimento: tipoMovimentoLog,
                    quantidadeMovimentada: quantityChange,
                    unidadeMedidaLog: finalUnit,
                    quantidadeAntes: oldQuantity,
                    quantidadeDepois: quantity,
                    dataHoraMovimento: window.firebaseFirestoreServerTimestamp(),
                    observacoesMovimento: (quantityChange !== 0 ? `Qtd. de ${oldQuantity} ${oldData.unidadeMedida||'Unid.'} para ${quantity} ${finalUnit}. ` : '') +
                                 (oldData.item !== description ? `Desc. de '${oldData.item}' para '${description}'. ` : '') +
                                 (oldData.observacoes !== finalObservations ? `Obs. atualizada. ` : '') +
                                 (oldData.categoria !== finalCategory ? `Cat. de '${oldData.categoria}' para '${finalCategory}'. ` : '') +
                                 (oldData.localizacao !== finalLocation ? `Local de '${oldData.localizacao}' para '${finalLocation}'. ` : '') +
                                 ((oldDueDateTimestamp !== newDueDateTimestamp) && (newDueDateTimestamp !== null) ? `Validade alterada para '${formatDateToDisplay(new Date(newDueDateTimestamp))}'. ` : '') +
                                 ((oldDueDateTimestamp !== newDueDateTimestamp) && (oldDueDateTimestamp !== null) && (newDueDateTimestamp === null) ? `Validade removida. ` : '') +
                                 `Operador: ${operador}.`,
                    operador: operador
                });
                console.log("Log de edição registrado."); // DEBUG
            }
            alert('Item atualizado com sucesso!');
            hideItemForm(); // Oculta o formulário após salvar
        } else { // Modo de Cadastro (Novo Item)
            console.log("Cadastrando novo item..."); // DEBUG
            // Geração do código sequencial via transação
            const configRef = window.firebaseFirestoreCollection(window.firestoreDb, 'config_v3');
            const counterDocRef = window.firebaseFirestoreDoc(configRef, 'contadores');

            let newCod = '';
            await window.firebaseFirestoreRunTransaction(window.firestoreDb, async (transaction) => {
                const counterDoc = await transaction.get(counterDocRef);
                let currentCounter = 0;
                if (counterDoc.exists) {
                    currentCounter = counterDoc.data().ultimoCodInventario || 0;
                } else {
                    // Se o contador não existe, cria ele com 0 para a primeira transação
                    transaction.set(counterDocRef, { ultimoCodInventario: 0 });
                }
                const nextCounter = currentCounter + 1;
                newCod = formatarCod(nextCounter); // Usando função importada
                transaction.set(counterDocRef, { ultimoCodInventario: nextCounter });
                console.log(`Código sequencial gerado: ${newCod}`); // DEBUG
            });

            const newItemRef = await window.firebaseFirestoreAddDoc(inventarioRef, {
                cod: newCod,
                item: description,
                quantidade: quantity,
                unidadeMedida: finalUnit,
                categoria: finalCategory,
                localizacao: finalLocation,
                dataVencimento: finalDueDate ? finalDueDate : null,
                observacoes: finalObservations,
                dataCadastro: window.firebaseFirestoreServerTimestamp(),
                dataUltimaModificacao: window.firebaseFirestoreServerTimestamp(),
                ultimoOperador: operador
            });
            console.log("Novo documento de inventário salvo."); // DEBUG

            // Registrar no log
            await window.firebaseFirestoreAddDoc(logRef, {
                itemId: newItemRef.id,
                itemNome: description,
                itemCod: newCod,
                tipoMovimento: "CADASTRO",
                quantidadeMovimentada: quantity,
                unidadeMedidaLog: finalUnit,
                quantidadeAntes: 0,
                quantidadeDepois: quantity,
                dataHoraMovimento: window.firebaseFirestoreServerTimestamp(),
                observacoesMovimento: "Cadastro inicial do item",
                operador: operador
            });
            alert('Item salvo com sucesso! Código gerado: ' + newCod);
            console.log("Log de cadastro inicial registrado."); // DEBUG
            hideItemForm(); // Oculta o formulário após salvar
        }
        clearItemForm();
        listarItensInventario();
    } catch (error) {
        console.error("Erro ao salvar/atualizar item:", error); // DEBUG
        alert("Erro ao salvar/atualizar item. Verifique o console.");
    }
}

// --- SEÇÃO 10: Carregar Item para Edição (loadItemForEdit) ---
async function loadItemForEdit(itemData) {
    console.log("Carregando item para edição:", itemData); // DEBUG
    document.getElementById('itemCod').value = itemData.cod || '';
    document.getElementById('itemDescription').value = itemData.item;
    document.getElementById('itemQuantity').value = itemData.quantidade;
    document.getElementById('itemUnit').value = itemData.unidadeMedida || 'Unidade';
    document.getElementById('itemCategory').value = itemData.categoria || 'Geral';
    document.getElementById('itemLocation').value = itemData.localizacao && itemData.localizacao !== 'Não definido' ? itemData.localizacao : '';
    // Converte Timestamp do Firebase ou objeto Date para o formato de input
    if (itemData.dataVencimento instanceof window.firebaseFirestoreTimestamp) {
        document.getElementById('itemDueDate').value = itemData.dataVencimento ? formatDateToInput(itemData.dataVencimento.toDate()) : ''; // Usando função importada
    } else if (itemData.dataVencimento instanceof Date) {
        document.getElementById('itemDueDate').value = itemData.dataVencimento ? formatDateToInput(itemData.dataVencimento) : ''; // Usando função importada
    } else {
        document.getElementById('itemDueDate').value = '';
    }

    document.getElementById('itemObservations').value = itemData.observacoes && itemData.observacoes !== 'Não definido' ? itemData.observacoes : '';
    document.getElementById('itemLastUpdate').value = itemData.dataUltimaModificacao ? formatDateTimeToDisplay(itemData.dataUltimaModificacao.toDate()) : ''; // Usando função importada
    document.getElementById('itemIdToEdit').value = itemData.id;
    document.getElementById('saveItemBtn').textContent = 'Atualizar Item';
    document.getElementById('deleteItemFormBtn').style.display = 'inline-block';
    currentEditingItemId = itemData.id;

    // Preenche o campo operador com o último operador que modificou o item, se existir
    const operatorNameInput = document.getElementById('operatorName');
    if (itemData.ultimoOperador && itemData.ultimoOperador !== 'Não definido') {
        operatorNameInput.value = itemData.ultimoOperador;
    } else {
        // Se não houver operador no item, tenta carregar do localStorage ou deixa vazio
        const savedOperatorName = localStorage.getItem(OPERATOR_NAME_STORAGE_KEY);
        if (savedOperatorName) {
            operatorNameInput.value = savedOperatorName;
        } else {
            operatorNameInput.value = '';
        }
    }
    clearError('operatorName'); // Usando função importada

    showItemForm(); // Exibe o formulário ao carregar item para edição
    window.scrollTo({ top: 0, behavior: 'smooth' });
    console.log("Item carregado no formulário."); // DEBUG
}

// --- SEÇÃO 11: Atualizar Quantidade Diretamente (updateItemQuantityDirectly) ---
async function updateItemQuantityDirectly(itemId, itemDescription, itemCod, currentQuantity, quantityChange, unidadeMedida) {
    console.log(`Movimentação direta: ID=${itemId}, Desc=${itemDescription}, Cod=${itemCod}, QtdAtual=${currentQuantity}, Mudança=${quantityChange}, Unid=${unidadeMedida}`); // DEBUG

    // Validação do operador
    const operador = getOperadorNameFromInput(); // Usando função importada
    if (operador === null) {
        alert("Operação de movimentação cancelada: Nome do operador é obrigatório.");
        console.log("Movimentação cancelada: Operador não fornecido no input."); // DEBUG
        return;
    }

    const newQuantity = currentQuantity + quantityChange;
    const tipoMovimento = quantityChange > 0 ? "ENTRADA" : "SAIDA";

    // Valida se a quantidade a ser movimentada é um número válido e positivo
    if (isNaN(quantityChange) || quantityChange === 0 || Math.abs(quantityChange) < 1) {
        alert("Por favor, digite uma quantidade válida (número inteiro maior que 0) para movimentar.");
        console.log("Movimentação direta impedida: quantidade inválida ou zero."); // DEBUG
        return;
    }

    // Alerta de estoque negativo
    if (newQuantity < 0) {
        alert(`Impossível realizar a saída. Quantidade atual (${currentQuantity} ${unidadeMedida}) é menor que a quantidade a ser retirada (${Math.abs(quantityChange)} ${unidadeMedida}).`);
        console.log("Movimentação direta impedida: estoque negativo."); // DEBUG
        return;
    }

    try {
        const itemDocRef = window.firebaseFirestoreDoc(window.firestoreDb, 'inventario_v3', itemId);

        // Atualiza o item principal
        await window.firebaseFirestoreUpdateDoc(itemDocRef, {
            quantidade: newQuantity,
            dataUltimaModificacao: window.firebaseFirestoreServerTimestamp(),
            ultimoOperador: operador
        });
        console.log("Documento de inventário atualizado por movimentação direta."); // DEBUG

        // Registrar no log
        const logRef = window.firebaseFirestoreCollection(window.firestoreDb, 'log_inventario_v3');
        await window.firebaseFirestoreAddDoc(logRef, {
            itemId: itemId,
            itemNome: itemDescription,
            itemCod: itemCod,
            tipoMovimento: tipoMovimento,
            quantidadeMovimentada: quantityChange,
            unidadeMedidaLog: unidadeMedida,
            quantidadeAntes: currentQuantity,
            quantidadeDepois: newQuantity,
            dataHoraMovimento: window.firebaseFirestoreServerTimestamp(),
            observacoesMovimento: `Movimentação direta: ${quantityChange > 0 ? '+' : ''}${quantityChange} ${unidadeMedida}.`,
            operador: operador
        });
        console.log("Log de movimentação direta registrado."); // DEBUG

        alert(`Quantidade de "${itemDescription}" atualizada para ${newQuantity} ${unidadeMedida}.`);
        listarItensInventario();
        hideItemLog();
    } catch (error) {
        console.error("Erro ao atualizar quantidade diretamente:", error); // DEBUG
        alert("Erro ao atualizar quantidade. Verifique o console.");
    }
}

// --- SEÇÃO 12: Deletar Item a partir do Formulário (deleteItemFromForm) ---
async function deleteItemFromForm() {
    console.log("Botão 'Excluir Item' do formulário clicado."); // DEBUG
    const itemId = document.getElementById('itemIdToEdit').value;
    const itemNome = document.getElementById('itemDescription').value;
    const itemCod = document.getElementById('itemCod').value;
    const quantidadeAtual = parseInt(document.getElementById('itemQuantity').value);

    // Reutiliza a função deleteItem existente, que já tem a confirmação e lógica de log
    await deleteItem(itemId, itemNome, itemCod, quantidadeAtual);
}

// --- SEÇÃO 13: Deletar Item (deleteItem) ---
async function deleteItem(id, itemNome, itemCod, quantidadeAtual) {
    console.log(`Iniciando exclusão de item: ID=${id}, Nome=${itemNome}, Cod=${itemCod}`); // DEBUG
    if (!confirm(`Tem certeza que deseja remover o item "${itemNome}" (Cód: ${itemCod})? Esta ação não pode ser desfeita.`)) {
        console.log("Exclusão cancelada pelo usuário."); // DEBUG
        return;
    }

    // Validação do operador
    const operador = getOperadorNameFromInput(); // Usando função importada
    if (operador === null) {
        alert("Remoção de item cancelada: Nome do operador é obrigatório.");
        console.log("Exclusão cancelada: Operador não fornecido no input."); // DEBUG
        return;
    }

    try {
        const itemDocRef = window.firebaseFirestoreDoc(window.firestoreDb, 'inventario_v3', id);
        await window.firebaseFirestoreDeleteDoc(itemDocRef);
        console.log("Documento de inventário excluído do Firestore."); // DEBUG

        // Registrar no log
        const logRef = window.firebaseFirestoreCollection(window.firestoreDb, 'log_inventario_v3');
        await window.firebaseFirestoreAddDoc(logRef, {
            itemId: id,
            itemNome: itemNome,
            itemCod: itemCod,
            tipoMovimento: "REMOCAO",
            quantidadeMovimentada: -quantidadeAtual,
            unidadeMedidaLog: 'Não definida',
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

// --- SEÇÃO 14: Exibir Log de Item (showItemLog) ---
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
        const logRef = window.firebaseFirestoreCollection(window.firestoreDb, 'log_inventario_v3');
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
            const dataHoraFormatada = log.dataHoraMovimento ? formatDateTimeToDisplay(log.dataHoraMovimento.toDate()) : 'N/D'; // Usando função importada

            row.insertCell(0).textContent = log.tipoMovimento || 'N/D';
            row.insertCell(1).textContent = `${log.quantidadeMovimentada !== undefined ? log.quantidadeMovimentada.toString() : 'N/D'} ${log.unidadeMedidaLog || ''}`;
            row.insertCell(2).textContent = `${log.quantidadeDepois !== undefined ? log.quantidadeDepois.toString() : 'N/D'} ${log.unidadeMedidaLog || ''}`;
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

// --- SEÇÃO 15: Ocultar Log de Item (hideItemLog) ---
function hideItemLog() {
    console.log("Ocultando seção de log de item."); // DEBUG
    document.getElementById('itemLogSection').style.display = 'none';
    document.querySelector('#itemLogTable tbody').innerHTML = '<tr><td colspan="6" style="border: 1px solid #ddd; padding: 8px;">Selecione um item para ver o histórico.</td></tr>';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- SEÇÃO 16: Imprimir Relatório de Estoque Atual (imprimirRelatorioInventario) ---
async function imprimirRelatorioInventario() {
    console.log("DEBUG(Relatorio): Botão 'Imprimir Relatório de Estoque Atual' clicado. Iniciando geração."); // DEBUG 1
    const operador = getOperadorNameFromInput(); // Usando função importada
    if (operador === null) {
        alert("Operação cancelada: Nome do operador é obrigatório.");
        console.log("DEBUG(Relatorio): Operação cancelada: Nome do operador vazio."); // DEBUG 2
        return;
    }
    console.log(`DEBUG(Relatorio): Operador identificado: ${operador}. Prosseguindo.`); // DEBUG 3

    let orderByField = 'item'; // Sempre ordena por item para o relatório geral
    let selectedCategory = null; // Sempre null para imprimir o relatório completo

    if (typeof window.firestoreDb === 'undefined' || !window.firestoreDb) {
        alert("Banco de dados não inicializado. Não é possível imprimir o relatório de inventário.");
        console.error("DEBUG(Relatorio): Erro: Firestore DB não inicializado."); // DEBUG 4
        return;
    }
    console.log("DEBUG(Relatorio): Firestore DB inicializado. Buscando itens."); // DEBUG 5

    let itensInventario = [];
    try {
        const inventarioRef = window.firebaseFirestoreCollection(window.firestoreDb, 'inventario_v3');
        let q = window.firebaseFirestoreQuery(inventarioRef, window.firebaseFirestoreOrderBy(orderByField, 'asc'));
        console.log("DEBUG(Relatorio): Query Firestore construída."); // DEBUG 6

        const querySnapshot = await window.firebaseFirestoreGetDocs(q);
        itensInventario = querySnapshot.docs.map(doc => doc.data());
        console.log(`DEBUG(Relatorio): Itens carregados do Firestore: ${itensInventario.length} itens.`); // DEBUG 7

    }
    catch (error) {
        console.error("DEBUG(Relatorio): Erro ao carregar itens para o relatório de inventário:", error); // DEBUG 8
        alert("Erro ao carregar itens para o relatório. Verifique o console.");
        return;
    }

    if (itensInventario.length === 0) {
        alert("Não há itens no inventário para imprimir o relatório com os filtros aplicados.");
        console.log("DEBUG(Relatorio): Nenhum item encontrado para o relatório."); // DEBUG 9
        return;
    }
    console.log("DEBUG(Relatorio): Itens disponíveis para geração do relatório. Iniciando jsPDF."); // DEBUG 10

    const { jsPDF } = window.jspdf;
    if (typeof jsPDF === 'undefined') {
        console.error("DEBUG(Relatorio): Erro: jsPDF não está definido. Verifique a importação no HTML."); // DEBUG 11
        alert("A biblioteca de PDF não foi carregada. Não é possível gerar o relatório.");
        return;
    }
    const doc = new jsPDF();
    let currentY = 15;
    console.log("DEBUG(Relatorio): jsPDF inicializado. Gerando cabeçalho."); // DEBUG 12

    // --- Cabeçalho do PDF ---
    doc.setFontSize(18); doc.text("Laboratório de Análises Clínicas CETEP/LNAB", 105, currentY, null, null, "center"); currentY += 10;
    doc.setFontSize(10); const now = new Date(); const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`; const formattedTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    doc.text(`Data: ${formattedDate} - Hora: ${formattedTime} - Operador: ${operador}`, 105, currentY, null, null, "center"); currentY += 5;
    doc.setFontSize(8); doc.text("Endereço: 233, R. Mario Laérte, 163 - Centro, Alagoinhas - BA, 48005-098", 105, currentY, null, null, "center"); currentY += 4;
    doc.text("Site: https://www.ceteplnab.com.br/", 105, currentY, null, null, "center"); currentY += 6;
    doc.setLineWidth(0.5); doc.line(20, currentY, 190, currentY); currentY += 10;
    console.log("DEBUG(Relatorio): Cabeçalho do PDF gerado. Gerando título."); // DEBUG 13

    // --- Título do Relatório ---
    doc.setFontSize(14);
    let reportTitle = "RELATÓRIO DE INVENTÁRIO ATUAL (GERAL)";
    doc.text(reportTitle, 105, currentY, null, null, "center");
    currentY += 8;
    doc.setLineWidth(0.2);
    doc.line(20, currentY, 190, currentY);
    currentY += 10;
    console.log("DEBUG(Relatorio): Título do PDF gerado. Adicionando conteúdo da tabela."); // DEBUG 14

    // --- Conteúdo: Itens do Inventário ---
    doc.setFontSize(8);
    const startX = 5;
    // Larguras das colunas do relatório
    // Cód (15), Descrição (40), Qtd (15), Unid (15), Categoria (25), Localização (25), Validade (25), Últ. Atualização (25)
    const colWidths = [15, 40, 15, 15, 25, 25, 25, 25]; 
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
    currentY += 4; // Espaço após os títulos das colunas
    doc.setFont(undefined, 'normal');
    console.log("DEBUG(Relatorio): Títulos das colunas do relatório gerados."); // DEBUG 15

    itensInventario.forEach((item, index) => { // Adicionado 'index' para debug de loop
        console.log(`DEBUG(Relatorio): Processando item para PDF: ${item.item} (Índice: ${index})`); // DEBUG 16
        
        let initialY = currentY; // Salva o Y inicial da linha para desenhar todos os textos
        let maxHeightInRow = 4; // Altura mínima de uma linha de texto (p.ex., para a descrição ou outros campos)

        // Processar Descrição (pode ter várias linhas)
        doc.setFontSize(8); // Tamanho normal da fonte para dados
        const descriptionText = item.item || 'N/D';
        const splitDescription = doc.splitTextToSize(descriptionText, colWidths[1] - 2); // colWidths[1] = 40
        doc.text(splitDescription, colPositions[1], initialY);
        maxHeightInRow = Math.max(maxHeightInRow, splitDescription.length * 4); // Altura da descrição, 4px por linha

        // Processar Observações (se existirem e se encaixarem na largura da descrição)
        let itemObsText = '';
        let splitObs = [];
        if (item.observacoes && item.observacoes !== 'Não definido' && item.observacoes.trim() !== '') {
            itemObsText = `Obs: ${item.observacoes}`;
            doc.setFontSize(7); // Fonte menor para observação
            doc.setTextColor(100); // Cor mais suave para observação
            // colWidths[1] = 40, usar uma largura ligeiramente menor para observações para evitar invasão
            splitObs = doc.splitTextToSize(itemObsText, colWidths[1] - 5); 
            doc.text(splitObs, colPositions[1] + 2, initialY + maxHeightInRow); // Alinha com a descrição, um pouco indentado
            maxHeightInRow += (splitObs.length * 3); // 3px por linha de observação
            doc.setFontSize(8); // Volta ao tamanho da fonte normal
            doc.setTextColor(0); // Volta à cor preta normal
        }
        
        // Colunas com texto único, sempre na mesma linha Y inicial da linha do item
        doc.text(item.cod || 'N/D', colPositions[0], initialY);
        doc.text(item.quantidade.toString() || 'N/D', colPositions[2], initialY);
        doc.text(item.unidadeMedida || 'Não definida', colPositions[3], initialY);
        doc.text(item.categoria || 'Geral', colPositions[4], initialY);
        doc.text(item.localizacao || 'Não definido', colPositions[5], initialY);
        doc.text(formatDateToDisplay(item.dataVencimento ? item.dataVencimento.toDate() : null) || 'N/D', colPositions[6], initialY);
        doc.text(formatDateTimeToDisplay(item.dataUltimaModificacao ? item.dataUltimaModificacao.toDate() : null) || 'N/D', colPositions[7], initialY);
        
        // Atualiza currentY para a próxima linha do PDF, considerando a altura máxima do item recém-adicionado
        currentY = initialY + maxHeightInRow + 2; // +2 para um pequeno espaço extra

        // --- Verificação de Quebra de Página ---
        if (currentY > 280) { // 280 é a margem inferior aproximada da página
            doc.addPage();
            currentY = 15; // Reset Y para a nova página
            console.log("DEBUG(Relatorio): Nova página adicionada ao PDF."); // DEBUG 17

            // Cabeçalho e Título em nova página (refeito)
            doc.setFontSize(18); doc.text("Laboratório de Análises Clínicas CETEP/LNAB", 105, currentY, null, null, "center"); currentY += 10;
            doc.setFontSize(10); doc.text(`Data: ${formattedDate} - Hora: ${formattedTime} - Operador: ${operador}`, 105, currentY, null, null, "center"); currentY += 5;
            doc.setFontSize(8); doc.text("Endereço: 233, R. Mario Laérte, 163 - Centro, Alagoinhas - BA, 48005-098", 105, currentY, null, null, "center"); currentY += 4;
            doc.text("Site: https://www.ceteplnab.com.br/", 105, currentY, null, null, "center"); currentY += 6;
            doc.setLineWidth(0.5); doc.line(20, currentY, 190, currentY); currentY += 10;
            doc.setFontSize(14); doc.text(`${reportTitle} (Continuação)`, 105, currentY, null, null, "center"); currentY += 8;
            doc.setLineWidth(0.2); doc.line(20, currentY, 190, currentY); currentY += 10;

            doc.setFontSize(8); // Resetando font size após o título
            doc.setFont(undefined, 'bold');
            doc.text("CÓD.", colPositions[0], currentY);
            doc.text("DESCRIÇÃO", colPositions[1], currentY);
            doc.text("QTD.", colPositions[2], currentY);
            doc.text("UNID.", colPositions[3], currentY);
            doc.text("CATEGORIA", colPositions[4], currentY);
            doc.text("LOCALIZAÇÃO", colPositions[5], currentY);
            doc.text("VALIDADE", colPositions[6], currentY);
            doc.text("ÚLT. ATUALIZAÇÃO", colPositions[7], currentY);
            currentY += 4; // Espaço após os títulos das colunas na nova página
            doc.setFont(undefined, 'normal'); // Resetar fonte para normal
        }
        
        // --- Adicionar linha separadora após cada item (exceto o último) ---
        if (index < itensInventario.length - 1) { 
            doc.setLineWidth(0.1);
            doc.line(colPositions[0], currentY, colPositions[0] + colWidths.reduce((a, b) => a + b, 0), currentY); // Desenha a linha
            currentY += 3; // Espaço após a linha separadora para o próximo item
        }
    });
    console.log("DEBUG(Relatorio): Conteúdo da tabela do relatório adicionado. Gerando rodapé."); // DEBUG 18

    // --- Rodapé do PDF ---
    doc.setPage(doc.internal.getNumberOfPages());
    doc.setFontSize(9);
    doc.text(`Documento gerado automaticamente pelo SISLAB. Operador: ${operador}`, 105, 280, null, null, "center"); // Inclui o nome do operador no rodapé

    console.log("DEBUG(Relatorio): Rodapé do PDF gerado. Tentando abrir o PDF."); // DEBUG 19
    try {
        doc.output('dataurlnewwindow', { filename: `Relatorio_Inventario_${formattedDate}.pdf` });
        console.log("DEBUG(Relatorio): Chamada doc.output() bem-sucedida."); // DEBUG 20
        alert(`Relatório de Inventário gerado com sucesso por ${operador}! Verifique a nova aba para visualizar e imprimir.`);
    } catch (outputError) {
        console.error("DEBUG(Relatorio): Erro ao gerar ou abrir o PDF (doc.output):", outputError); // DEBUG 21
        alert("Erro ao gerar ou exibir o PDF. Verifique o console para detalhes.");
    }

    console.log("DEBUG(Relatorio): Geração de relatório geral concluída."); // DEBUG 22
}

// --- SEÇÃO 17: Gerar Relatório de Reposição (gerarRelatorioReposicao) ---
async function gerarRelatorioReposicao() {
    console.log("Iniciando geração de Relatório de Reposição..."); // DEBUG
    const operador = getOperadorNameFromInput(); // Usando função importada
    if (operador === null) {
        alert("Operação cancelada: Nome do operador é obrigatório.");
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
    const repColWidths = [15, 50, 15, 20, 25, 25, 25];
    const repColPositions = [];
    let repCurrentX = startX;
    repColWidths.forEach(width => {
        repColPositions.push(repCurrentX);
        repCurrentX += width;
    });

    categoriasOrdenadas.forEach(categoria => {
        const itensDaCategoria = itensPorCategoria[categoria];

        if (currentY > 270) {
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
            doc.setFontSize(8);
            doc.setFont(undefined, 'bold');
            doc.text("CÓD.", repColPositions[0], currentY);
            doc.text("DESCRIÇÃO", repColPositions[1], currentY);
            doc.text("QTD. ATUAL", repColPositions[2], currentY);
            doc.text("UNID.", repColPositions[3], currentY);
            doc.text("LOCALIZAÇÃO", repColPositions[4], currentY);
            doc.text("VALIDADE", repColPositions[5], currentY);
            doc.text("OBS.", repColPositions[6], currentY);
            currentY += 4;
            doc.setFont(undefined, 'normal');
        }

        doc.setFont(undefined, 'bold');
        doc.text(`Categoria: ${categoria}`, startX + 5, currentY);
        currentY += 4;

        doc.text("CÓD.", repColPositions[0], currentY);
        doc.text("DESCRIÇÃO", repColPositions[1], currentY);
        doc.text("QTD. ATUAL", repColPositions[2], currentY);
        doc.text("UNID.", repColPositions[3], currentY);
        doc.text("LOCALIZAÇÃO", repColPositions[4], currentY);
        doc.text("VALIDADE", repColPositions[5], currentY);
        doc.text("OBS.", repColPositions[6], currentY);
        currentY += 4;

        doc.setFont(undefined, 'normal');

        itensDaCategoria.forEach(item => {
            if (currentY > 280) {
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
                doc.text("OBS.", repColPositions[6], currentY);
                currentY += 4;
                doc.setFont(undefined, 'normal');
            }

            const repDataValidade = item.dataVencimento ? formatDateToDisplay(item.dataVencimento.toDate()) : 'N/D';
            const repItemObsText = item.observacoes && item.observacoes !== 'Não definido' ? `Obs: ${item.observacoes}` : '';

            doc.text(item.cod || 'N/D', repColPositions[0], currentY);
            doc.text(item.item, repColPositions[1], currentY);
            doc.text(item.quantidade.toString(), repColPositions[2], currentY);
            doc.text(item.unidadeMedida || 'Não definida', repColPositions[3], currentY);
            doc.text(item.localizacao || 'Não definida', repColPositions[4], currentY);
            doc.text(repDataValidade, repColPositions[5], currentY);
            doc.text(repItemObsText, repColPositions[6], currentY);
            currentY += 4;
        });
        currentY += 4;
    });

    // --- Rodapé do PDF ---
    doc.setPage(doc.internal.getNumberOfPages());
    doc.setFontSize(9);
    doc.text("Documento gerado automaticamente pelo SISLAB.", 105, 280, null, null, "center");

    doc.output('dataurlnewwindow', { filename: `Relatorio_Reposicao_${formattedDate}_QtdMin${minQuantity}.pdf` });

    alert(`Relatório de Reposição gerado com sucesso por ${operador}! Verifique a nova aba para visualizar e imprimir.`);
    console.log("Relatório de reposição gerado."); // DEBUG
}

// --- SEÇÃO 18: Gerar Relatório de Consumo (gerarRelatorioConsumo) ---
async function gerarRelatorioConsumo() {
    console.log("Iniciando geração de Relatório de Consumo..."); // DEBUG
    const operador = getOperadorNameFromInput(); // Usando função importada
    if (operador === null) {
        alert("Operação cancelada: Nome do operador é obrigatório.");
        console.log("Relatório de consumo cancelado: Operador não fornecido."); // DEBUG
        return;
    }

    let startDateInput = prompt("Digite a Data de Início (AAAA-MM-DD) para o relatório de consumo:");
    if (startDateInput === null) { alert("Operação cancelada."); return; }
    let endDateInput = prompt("Digite a Data de Término (AAAA-MM-DD) para o relatório de consumo:");
    if (endDateInput === null) { alert("Operação cancelada."); return; }

    const startDate = new Date(startDateInput + 'T00:00:00');
    const endDate = new Date(endDateInput + 'T23:59:59');

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate > endDate) {
        alert("Datas inválidas. Por favor, digite datas no formato AAAA-MM-DD e certifique-se de que a data de início não é posterior à de término.");
        console.log("Relatório de consumo impedido: Datas inválidas."); // DEBUG
        return;
    }

    // Formatação de datas para o título do relatório (DDMMAAAA)
    const formattedStartDateForTitle = `${startDate.getDate().toString().padStart(2, '0')}${(startDate.getMonth() + 1).toString().padStart(2, '0')}${startDate.getFullYear()}`;
    const formattedEndDateForTitle = `${endDate.getDate().toString().padStart(2, '0')}${(endDate.getMonth() + 1).toString().padStart(2, '0')}${endDate.getFullYear()}`;


    if (typeof window.firestoreDb === 'undefined' || !window.firestoreDb) {
        alert("Banco de dados não inicializado. Não é possível imprimir o relatório de consumo.");
        console.error("Firestore DB não inicializado para relatório de consumo."); // DEBUG
        return;
    }

    let logsConsumo = [];
    try {
        const logRef = window.firebaseFirestoreCollection(window.firestoreDb, 'log_inventario_v3');
        const q = window.firebaseFirestoreQuery(
            logRef,
            window.firebaseFirestoreWhere('dataHoraMovimento', '>=', startDate),
            window.firebaseFirestoreWhere('dataHoraMovimento', '<=', endDate),
            window.firebaseFirestoreOrderBy('dataHoraMovimento', 'asc')
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
    const consumoPorItemECategoria = {};

    logsConsumo.forEach(log => {
        if (log.tipoMovimento === "SAIDA") {
            const categoria = log.categoria || 'Geral'; // Categoria no momento da saída (se existir no log)
            const itemId = log.itemId;
            const quantidadeConsumida = Math.abs(log.quantidadeMovimentada);

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
    doc.setFontSize(10); const now = new Date(); const generalFormattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`; const generalFormattedTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    doc.text(`Data: ${generalFormattedDate} - Hora: ${generalFormattedTime} - Operador: ${operador}`, 105, currentY, null, null, "center"); currentY += 5;
    doc.setFontSize(8); doc.text("Endereço: 233, R. Mario Laérte, 163 - Centro, Alagoinhas - BA, 48005-098", 105, currentY, null, null, "center"); currentY += 4;
    doc.text("Site: https://www.ceteplnab.com.br/", 105, currentY, null, null, "center"); currentY += 6;
    doc.setLineWidth(0.5); doc.line(20, currentY, 190, currentY); currentY += 10;

    // --- Título do Relatório ---
    doc.setFontSize(14);
    doc.text(`RELATÓRIO DE CONSUMO - Período: ${formattedStartDateForTitle} a ${formattedEndDateForTitle}`, 105, currentY, null, null, "center");
    currentY += 8;
    doc.setLineWidth(0.2);
    doc.line(20, currentY, 190, currentY);
    currentY += 10;

    // --- Conteúdo: Consumo por Categoria ---
    doc.setFontSize(9);
    const consColWidths = [20, 60, 20, 30];
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
            doc.setFontSize(10); doc.text(`Data: ${generalFormattedDate} - Hora: ${generalFormattedTime} - Operador: ${operador}`, 105, currentY, null, null, "center"); currentY += 5;
            doc.setFontSize(8); doc.text("Endereço: 233, R. Mario Laérte, 163 - Centro, Alagoinhas - BA, 48005-098", 105, currentY, null, null, "center"); currentY += 4;
            doc.text("Site: https://www.ceteplnab.com.br/", 105, currentY, null, null, "center"); currentY += 6;
            doc.setLineWidth(0.5); doc.line(20, currentY, 190, currentY); currentY += 10;
            doc.setFontSize(14); doc.text(`RELATÓRIO DE CONSUMO (Continuação) - Período: ${formattedStartDateForTitle} a ${formattedEndDateForTitle}`, 105, currentY, null, null, "center"); currentY += 8;
            doc.setLineWidth(0.2); doc.line(20, currentY, 190, currentY); currentY += 10;
            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');
            doc.text("CÓD.", consColPositions[0], currentY);
            doc.text("DESCRIÇÃO", consColPositions[1], currentY);
            doc.text("CONSUMO", consColPositions[2], currentY);
            doc.text("UNID.", consColPositions[3], currentY);
            currentY += 4;
            doc.setFont(undefined, 'normal');
        }

        doc.setFont(undefined, 'bold');
        doc.text(`Categoria: ${categoria}`, startX + 5, currentY);
        currentY += 4;

        doc.text("CÓD.", consColPositions[0], currentY);
        doc.text("DESCRIÇÃO", consColPositions[1], currentY);
        doc.text("CONSUMO", consColPositions[2], currentY);
        doc.text("UNID.", consColPositions[3], currentY);
        currentY += 4;

        doc.setFont(undefined, 'normal');

        Object.values(itensConsumidosNaCategoria).sort((a,b) => a.itemNome.localeCompare(b.itemNome)).forEach(itemConsumo => {
            if (currentY > 280) {
                doc.addPage();
                currentY = 15;
                // Repetir cabeçalho e título do relatório
                doc.setFontSize(18); doc.text("Laboratório de Análises Clínicas CETEP/LNAB", 105, currentY, null, null, "center"); currentY += 10;
                doc.setFontSize(10); doc.text(`Data: ${generalFormattedDate} - Hora: ${generalFormattedTime} - Operador: ${operador}`, 105, currentY, null, null, "center"); currentY += 5;
                doc.setFontSize(8); doc.text("Endereço: 233, R. Mario Laérte, 163 - Centro, Alagoinhas - BA, 48005-098", 105, currentY, null, null, "center"); currentY += 4;
                doc.text("Site: https://www.ceteplnab.com.br/", 105, currentY, null, null, "center"); currentY += 6;
                doc.setLineWidth(0.5); doc.line(20, currentY, 190, currentY); currentY += 10;
                doc.setFontSize(14); doc.text(`RELATÓRIO DE CONSUMO (Continuação) - Período: ${formattedStartDateForTitle} a ${formattedEndDateForTitle}`, 105, currentY, null, null, "center"); currentY += 8;
                doc.setLineWidth(0.2); doc.line(20, currentY, 190, currentY); currentY += 10;
                doc.setFontSize(9);
                doc.setFont(undefined, 'bold');
                doc.text("CÓD.", consColPositions[0], currentY);
                doc.text("DESCRIÇÃO", consColPositions[1], currentY);
                doc.text("CONSUMO", consColPositions[2], currentY);
                doc.text("UNID.", consColPositions[3], currentY);
                currentY += 4;
                doc.setFont(undefined, 'normal');
            }

            doc.text(itemConsumo.itemCod || 'N/D', consColPositions[0], currentY);
            doc.text(itemConsumo.itemNome, consColPositions[1], currentY);
            doc.text(itemConsumo.totalConsumido.toString(), consColPositions[2], currentY);
            doc.text(itemConsumo.unidadeMedida, consColPositions[3], currentY);
            currentY += 4;
        });
        currentY += 4;
    });

    // --- Rodapé do PDF ---
    doc.setPage(doc.internal.getNumberOfPages());
    doc.setFontSize(9);
    doc.text("Documento gerado automaticamente pelo SISLAB.", 105, 280, null, null, "center");

    doc.output('dataurlnewwindow', { filename: `Relatorio_Consumo_${formattedDate}.pdf` });

    alert(`Relatório de Consumo gerado com sucesso por ${operador}! Verifique a nova aba para visualizar e imprimir.`);
    console.log("Relatório de consumo gerado."); // DEBUG
}

// --- SEÇÃO 19: Gerar Relatório de Vencimento (gerarRelatorioVencimento) ---
async function gerarRelatorioVencimento() {
    console.log("Iniciando geração de Relatório de Itens Próximos do Vencimento..."); // DEBUG
    const operador = getOperadorNameFromInput(); // Usando função importada
    if (operador === null) {
        alert("Operação cancelada: Nome do operador é obrigatório.");
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
    today.setHours(0, 0, 0, 0);
    const dueDateLimit = new Date();
    dueDateLimit.setDate(today.getDate() + daysUntilDue);
    dueDateLimit.setHours(23, 59, 59, 999);

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
    doc.setFontSize(10); const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`; const formattedTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    doc.text(`Data: ${formattedDate} - Hora: ${formattedTime} - Operador: ${operador}`, 105, currentY, null, null, "center"); currentY += 5;
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
    const vencColWidths = [15, 45, 15, 20, 25, 25, 25];
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
            doc.setFont(undefined, 'bold');
            doc.text("CÓD.", vencColPositions[0], currentY);
            doc.text("DESCRIÇÃO", vencColPositions[1], currentY);
            doc.text("QTD.", vencColPositions[2], currentY);
            doc.text("UNID.", vencColPositions[3], currentY);
            doc.text("LOCALIZAÇÃO", vencColPositions[4], currentY);
            doc.text("VALIDADE", vencColPositions[5], currentY);
            doc.text("OBS.", vencColPositions[6], currentY);
            currentY += 4;
            doc.setFont(undefined, 'normal');
        }

        doc.setFont(undefined, 'bold');
        doc.text(`Categoria: ${categoria}`, startX + 5, currentY);
        currentY += 4;

        doc.text("CÓD.", vencColPositions[0], currentY);
        doc.text("DESCRIÇÃO", vencColPositions[1], currentY);
        doc.text("QTD.", vencColPositions[2], currentY);
        doc.text("UNID.", vencColPositions[3], currentY);
        doc.text("LOCALIZAÇÃO", vencColPositions[4], currentY);
        doc.text("VALIDADE", vencColPositions[5], currentY);
        doc.text("OBS.", vencColPositions[6], currentY);
        currentY += 4; // Espaço após os títulos

        doc.setFont(undefined, 'normal');

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
                currentY += 4;
                doc.setFont(undefined, 'normal');
            }

            const itemVencimentoFormatted = item.dataVencimento ? formatDateToDisplay(item.dataVencimento.toDate()) : 'N/D';
            const itemObservacoesVenc = doc.splitTextToSize(item.observacoes && item.observacoes !== 'Não definido' ? item.observacoes : '', 20);

            doc.text(item.cod || 'N/D', vencColPositions[0], currentY);
            doc.text(item.item, vencColPositions[1], currentY);
            doc.text(item.quantidade.toString(), vencColPositions[2], currentY);
            doc.text(item.unidadeMedida || 'Não definida', vencColPositions[3], currentY);
            doc.text(item.localizacao || 'Não definida', vencColPositions[4], currentY);
            doc.text(itemVencimentoFormatted, vencColPositions[5], currentY);
            doc.text(itemObservacoesVenc, vencColPositions[6], currentY);
            currentY += Math.max(4, itemObservacoesVenc.length * 3);
        });
        currentY += 4;
    });

    // --- Rodapé do PDF ---
    doc.setPage(doc.internal.getNumberOfPages());
    doc.setFontSize(9);
    doc.text("Documento gerado automaticamente pelo SISLAB.", 105, 280, null, null, "center");

    doc.output('dataurlnewwindow', { filename: `Relatorio_Vencimento_${formattedDate}.pdf` });

    alert(`Relatório de Itens Próximos do Vencimento gerado com sucesso por ${operador}! Verifique a nova aba para visualizar e imprimir.`);
    console.log("Relatório de vencimento gerado."); // DEBUG
}

// --- SEÇÃO 20: Lógica de Exibição/Ocultação de Histórico (showItemLog, closeItemLogBtn) ---
// (Esta seção já está implementada nas seções 14 e 15 e foi movida para um agrupamento lógico)
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('closeItemLogBtn').addEventListener('click', hideItemLog);
});

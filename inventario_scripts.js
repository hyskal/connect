// VERSÃO: 1.0.0 (inventario_scripts.js)
// CHANGELOG:
// - Novo Arquivo: Criado para conter toda a lógica JavaScript da página de controle de inventário (inventario.html).
// - Implementado: Funções de CRUD para itens (adicionarItem, listarItensInventario, saveOrUpdateItem, loadItemForEdit, deleteItem).
// - Adicionado: Integração com Firebase Firestore para persistência de dados de inventario e inventario_log.
// - Reaproveitado: Funções auxiliares de erro (showError, clearError) do script.js principal.

document.addEventListener('DOMContentLoaded', listarItensInventario);
document.getElementById('saveItemBtn').addEventListener('click', saveOrUpdateItem);
document.getElementById('clearItemFormBtn').addEventListener('click', clearItemForm);
document.getElementById('searchInventory').addEventListener('input', listarItensInventario); // Atualiza a lista ao pesquisar

// Variável global para armazenar o ID do item sendo editado
let currentEditingItemId = null; 

async function listarItensInventario() {
    const inventoryListBody = document.querySelector('#inventoryList tbody');
    inventoryListBody.innerHTML = '<tr><td colspan="4">Carregando itens...</td></tr>';
    
    const searchTerm = document.getElementById('searchInventory').value.toLowerCase();
    let items = [];

    // window.firestoreDb e outras funções Firebase são globalizadas no inventario.html
    if (typeof window.firestoreDb === 'undefined' || !window.firestoreDb) {
        inventoryListBody.innerHTML = '<tr><td colspan="4">Banco de dados não inicializado.</td></tr>';
        return;
    }

    try {
        const inventarioRef = window.firebaseFirestoreCollection(window.firestoreDb, 'inventario');
        let q = window.firebaseFirestoreQuery(inventarioRef, window.firebaseFirestoreOrderBy('descricao', 'asc'));

        const querySnapshot = await window.firebaseFirestoreGetDocs(q);
        items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Filtragem em memória se houver termo de busca (Firestore não permite "contains" diretamente sem índices complexos)
        if (searchTerm) {
            items = items.filter(item => item.descricao.toLowerCase().includes(searchTerm));
        }

        if (items.length === 0) {
            inventoryListBody.innerHTML = '<tr><td colspan="4">Nenhum item encontrado.</td></tr>';
            return;
        }

        inventoryListBody.innerHTML = ''; // Limpa antes de preencher
        items.forEach(item => {
            const row = inventoryListBody.insertRow();
            row.dataset.itemId = item.id; // Guarda o ID no elemento da linha
            
            // Assume que dataCadastro é um Timestamp do Firebase e converte para Date
            const dataCadastroDate = item.dataCadastro ? item.dataCadastro.toDate() : null;
            const dataCadastroFormatada = dataCadastroDate ? dataCadastroDate.toLocaleDateString('pt-BR') : 'N/A';

            row.insertCell(0).textContent = item.descricao;
            row.insertCell(1).textContent = item.quantidade;
            row.insertCell(2).textContent = dataCadastroFormatada;
            
            const actionsCell = row.insertCell(3);
            actionsCell.classList.add('action-buttons');
            
            const editButton = document.createElement('button');
            editButton.textContent = 'Editar';
            editButton.classList.add('edit-btn');
            editButton.onclick = () => loadItemForEdit(item.id, item.descricao, item.quantidade);
            actionsCell.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Remover';
            deleteButton.classList.add('delete-btn');
            deleteButton.onclick = () => deleteItem(item.id, item.descricao);
            actionsCell.appendChild(deleteButton);
        });

    } catch (error) {
        console.error("Erro ao listar itens do inventário:", error);
        inventoryListBody.innerHTML = '<tr><td colspan="4">Erro ao carregar itens.</td></tr>';
    }
}

function clearItemForm() {
    document.getElementById('itemDescription').value = '';
    document.getElementById('itemQuantity').value = '0';
    document.getElementById('itemIdToEdit').value = '';
    document.getElementById('saveItemBtn').textContent = 'Salvar Item';
    clearError('itemDescription');
    clearError('itemQuantity');
    currentEditingItemId = null; // Reseta o ID do item em edição
}

async function saveOrUpdateItem() {
    const descriptionInput = document.getElementById('itemDescription');
    const quantityInput = document.getElementById('itemQuantity');
    const itemIdToEdit = document.getElementById('itemIdToEdit').value;

    const description = descriptionInput.value.trim();
    const quantity = parseInt(quantityInput.value);

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

    try {
        const inventarioRef = window.firebaseFirestoreCollection(window.firestoreDb, 'inventario');
        const logRef = window.firebaseFirestoreCollection(window.firestoreDb, 'inventario_log');

        if (itemIdToEdit) { // Modo de Edição
            const itemDocRef = window.firebaseFirestoreDoc(window.firestoreDb, 'inventario', itemIdToEdit);
            const docSnap = await window.firebaseFirestoreGetDoc(itemDocRef);
            const oldData = docSnap.data();

            const oldQuantity = oldData.quantidade;
            const quantityChange = quantity - oldQuantity;
            
            let tipoOperacaoLog = "AJUSTE"; // Default para ajuste de descrição ou sem mudança de quantidade
            if (quantityChange > 0) {
                tipoOperacaoLog = "ENTRADA";
            } else if (quantityChange < 0) {
                tipoOperacaoLog = "SAIDA";
            }


            await window.firebaseFirestoreUpdateDoc(itemDocRef, {
                descricao: description,
                quantidade: quantity,
                ultimaAtualizacao: window.firebaseFirestoreServerTimestamp()
            });

            // Registrar no log SÓ SE HOUVER MUDANÇA RELEVANTE (quantidade ou descrição)
            if (quantityChange !== 0 || oldData.descricao !== description) {
                await window.firebaseFirestoreAddDoc(logRef, {
                    itemId: itemIdToEdit,
                    itemDescricao: description, // Salva a descrição atualizada no log
                    tipoOperacao: tipoOperacaoLog,
                    quantidadeMovimentada: quantityChange, // Pode ser 0 se for só ajuste de descrição
                    quantidadeFinal: quantity,
                    dataOperacao: window.firebaseFirestoreServerTimestamp(),
                    observacoes: (quantityChange !== 0 ? `Qtd. de ${oldQuantity} para ${quantity}. ` : '') + 
                                 (oldData.descricao !== description ? `Desc. de '${oldData.descricao}' para '${description}'.` : '')
                });
            }
            alert('Item atualizado com sucesso!');

        } else { // Modo de Cadastro (novo item)
            const newItemRef = await window.firebaseFirestoreAddDoc(inventarioRef, {
                descricao: description,
                quantidade: quantity,
                dataCadastro: window.firebaseFirestoreServerTimestamp(),
                ultimaAtualizacao: window.firebaseFirestoreServerTimestamp()
            });

            // Registrar no log
            await window.firebaseFirestoreAddDoc(logRef, {
                itemId: newItemRef.id,
                itemDescricao: description,
                tipoOperacao: "ENTRADA_INICIAL",
                quantidadeMovimentada: quantity,
                quantidadeFinal: quantity,
                dataOperacao: window.firebaseFirestoreServerTimestamp(),
                observacoes: "Cadastro inicial do item"
            });
            alert('Item salvo com sucesso!');
        }
        clearItemForm();
        listarItensInventario(); // Atualiza a lista
    } catch (error) {
        console.error("Erro ao salvar/atualizar item:", error);
        alert("Erro ao salvar/atualizar item. Verifique o console.");
    }
}

async function loadItemForEdit(id, description, quantity) {
    document.getElementById('itemDescription').value = description;
    document.getElementById('itemQuantity').value = quantity;
    document.getElementById('itemIdToEdit').value = id;
    document.getElementById('saveItemBtn').textContent = 'Atualizar Item';
    currentEditingItemId = id; // Define o ID do item em edição

    window.scrollTo({ top: 0, behavior: 'smooth' }); // Volta para o topo do formulário
}

async function deleteItem(id, description) {
    if (!confirm(`Tem certeza que deseja remover o item "${description}"? Esta ação não pode ser desfeita.`)) {
        return;
    }

    try {
        // Obter a quantidade atual antes de deletar para registrar no log
        const itemDocRef = window.firebaseFirestoreDoc(window.firestoreDb, 'inventario', id);
        const docSnap = await window.firebaseFirestoreGetDoc(itemDocRef);
        const itemData = docSnap.data();
        const quantidadePreRemocao = itemData ? itemData.quantidade : 0; // Quantidade no momento da remoção

        await window.firebaseFirestoreDeleteDoc(itemDocRef);
        
        // Registrar no log
        const logRef = window.firebaseFirestoreCollection(window.firestoreDb, 'inventario_log');
        await window.firebaseFirestoreAddDoc(logRef, {
            itemId: id,
            itemDescricao: description,
            tipoOperacao: "REMOCAO",
            quantidadeMovimentada: -quantidadePreRemocao, // Registra como saída total
            quantidadeFinal: 0, // A quantidade final é 0 após a remoção
            dataOperacao: window.firebaseFirestoreServerTimestamp(),
            observacoes: "Item removido do inventário"
        });
        alert('Item removido com sucesso!');
        listarItensInventario(); // Atualiza a lista
        clearItemForm(); // Limpa o formulário caso estivesse editando o item removido
    } catch (error) {
        console.error("Erro ao remover item:", error);
        alert("Erro ao remover item. Verifique o console.");
    }
}

// Funções de erro (reaproveitadas do script.js principal)
// Estas funções são idênticas às do script.js e podem ser consideradas "globais" ou duplicadas.
// Para evitar duplicação em um ambiente maior, elas poderiam ser movidas para um arquivo utils.js compartilhado.
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

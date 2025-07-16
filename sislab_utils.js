// VERSÃO: 1.0.2 (sislab_utils.js)
// CHANGELOG:
// - Alterado: formatDateTimeToDisplay agora inclui uma quebra de linha para formatar data e hora em duas linhas.

// --- CONFIGURAÇÃO DO ARQUIVO LOCAL PARA CATEGORIAS ---
export const LOCAL_FILENAME_CATEGORIES = 'categorias_inventario.txt';

// Chave para localStorage (aqui apenas para garantir que a constante existe no módulo de utilitários, se necessário)
export const OPERATOR_NAME_STORAGE_KEY = 'sislab_inventario_operator_name';

// --- Funções Auxiliares Comuns ---
// Lê o nome do operador do input e valida
export function getOperadorNameFromInput() {
    console.log("DEBUG(sislab_utils): Lendo nome do operador do input..."); // DEBUG
    const operatorNameInput = document.getElementById('operatorName');
    
    // MODIFICAÇÃO AQUI: Verifica se o elemento existe antes de tentar acessar .value
    if (!operatorNameInput) {
        console.warn("DEBUG(sislab_utils): Elemento 'operatorName' não encontrado. Retornando null."); // DEBUG
        return null; // Retorna null se o elemento não for encontrado
    }

    const operador = operatorNameInput.value.trim();

    if (!operador) {
        showError('operatorName', 'Nome do operador é obrigatório.');
        console.log("DEBUG(sislab_utils): Validação: Nome do operador vazio."); // DEBUG
        return null;
    }
    clearError('operatorName');
    localStorage.setItem(OPERATOR_NAME_STORAGE_KEY, operador); // Salva no localStorage
    console.log(`DEBUG(sislab_utils): Nome do operador lido e salvo: ${operador}`); // DEBUG
    return operador;
}

export function showError(elementId, message) {
    console.log(`DEBUG(sislab_utils): Erro de validação para ${elementId}: ${message}`); // DEBUG
    const inputElement = document.getElementById(elementId);
    const errorDiv = document.getElementById(`${elementId}-error`);
    if (inputElement && errorDiv) {
        inputElement.classList.add('error');
        errorDiv.textContent = message;
    }
}

export function clearError(elementId) {
    const inputElement = document.getElementById(elementId);
    const errorDiv = document.getElementById(`${elementId}-error`);
    if (inputElement && errorDiv) {
        inputElement.classList.remove('error');
        errorDiv.textContent = '';
    }
}

export function formatarCod(num) {
    return String(num).padStart(4, '0'); // Garante 4 dígitos com zeros à esquerda
}

export function formatDateToInput(date) {
    // Formata um objeto Date para string YYYY-MM-DD para input[type="date"]
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function formatDateToDisplay(date) {
    // Formata um objeto Date para DD/MM/AAAA
    if (!date) return 'N/D';
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

export function formatDateTimeToDisplay(date) {
    // Formata um objeto Date para DD/MM/AAAA HH:MM:SS
    if (!date) return 'N/D';
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');
    // MODIFICAÇÃO AQUI: Adiciona a quebra de linha
    return `${day}/${month}/${year}\n${hours}:${minutes}:${seconds}`;
}

// --- Funções de Carregamento Dinâmico ---
export async function loadCategories() {
    console.log("DEBUG(sislab_utils): Iniciando carregamento de categorias..."); // DEBUG
    const itemCategorySelect = document.getElementById('itemCategory');
    const filterCategorySelect = document.getElementById('filterCategory');
    const timestamp = new Date().getTime();

    // Nota: LOCAL_FILENAME_CATEGORIES é exportada deste mesmo arquivo
    const localFileUrl = `${LOCAL_FILENAME_CATEGORIES}?t=${timestamp}`;

    let categoriasDisponiveis = []; // Variável local para esta função

    try {
        const response = await fetch(localFileUrl);
        if (!response.ok) {
            console.warn(`DEBUG(sislab_utils): Erro ao carregar categorias do arquivo local (${response.status}). Usando categorias padrão.`); // DEBUG
            categoriasDisponiveis = ["Geral"];
        } else {
            const text = await response.text();
            categoriasDisponiveis = text.trim().split('\n').map(c => c.trim()).filter(c => c !== '');
            if (categoriasDisponiveis.length === 0) {
                categoriasDisponiveis = ["Geral"];
            }
            console.log("DEBUG(sislab_utils): Categorias carregadas:", categoriasDisponiveis); // DEBUG
        }
    } catch (error) {
        console.error("DEBUG(sislab_utils): Erro FATAL ao carregar categorias do arquivo local:", error); // DEBUG
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
    console.log("DEBUG(sislab_utils): Categorias carregadas nos selects."); // DEBUG

    // Retorna as categorias disponíveis, caso o módulo principal precise delas para validação ou outros fins
    return categoriasDisponiveis;
}

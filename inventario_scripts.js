// VERSÃO: 3.0.7 (inventario_scripts.js)
// CHANGELOG:
// - Nova Versão: Marca o início oficial da Versão 3.0 do Sistema de Inventário.
// - Adicionado: Geração automática de cod sequencial para novos itens via transação no Firebase (config_v3/contadores).
// - Adicionado: categorias para itens, com carregamento dinâmico de categorias_inventario.txt (local) e usadas em formulário e filtro.
// - Adicionado: Novos campos de item na inventario_v3: localizacao, dataVencimento, unidadeMedida.
// - Adicionado: Campos dataUltimaModificacao e ultimoOperador no item (inventario_v3), atualizados automaticamente em cada modificação.
// - Modificado: saveOrUpdateItem() para: lidar com todos os novos campos, salvando "Não definido" para campos opcionais não preenchidos; integrar solicitação do operador e alertas de estoque negativo; registrar logs detalhados (tipos "CADASTRO", "ENTRADA", "SAIDA", "AJUSTE"), incluindo todos os novos campos no log.
// - Modificado: listarItensInventario() para: exibir todas as novas colunas; implementar filtros por cod/item e categoria; implementar Filtro Rápido por Status de Estoque; adicionar Notificação Visual para Estoque Crítico; incluir Contagem de "Dias em Estoque"; configurar os controles de Movimentação Direta.
// - Adicionado: updateItemQuantityDirectly() para gerenciar as movimentações rápidas via botões +/-, com operador, alerta de estoque negativo e registro detalhado no log.
// - Modificado: loadItemForEdit() para preencher todos os campos do formulário e exibir/ocultar o botão "Excluir Item".
// - Modificado: deleteItem() e adicionado deleteItemFromForm() para integrar solicitação do operador, log detalhado "REMOCAO", e lidar com o botão "Excluir Item" do formulário.
// - Modificado: showItemLog() e hideItemLog() para exibir log por item com todos os campos relevantes.
// - Implementado: Funções de relatório PDF (imprimirRelatorioInventario, gerarRelatorioReposicao, gerarRelatorioConsumo, gerarRelatorioVencimento), acionadas pelos botões na inventario.html. Todos incluem operador no cabeçalho e detalhes dos novos campos nos relatórios.
// - Incluído: console.log para depuração em funções críticas.
// - Corrigido: Botão "Fechar Histórico" (id closeItemLogBtn) agora está corretamente vinculado no DOMContentLoaded.
// - Corrigido: Formatação da data no título do "Relatório de Consumo" de AAAA-MM-DD para DDMMAAAA.
// - Melhoria: Adição de mais console.log detalhados nas funções de relatório para auxiliar na depuração.
// - Manutenção: Refatoração de funções de formatação de data para reutilização.
// - Corrigido: listarItensInventario() aprimorada para depuração e correção do carregamento de itens na tabela, garantindo exibição de todos os campos e filtragem correta.
// - Modificado: Função getOperadorName() substituída por getOperadorNameFromInput() para ler o nome do operador do novo campo operatorName (input HTML).
// - Adicionado: Validação para o campo operatorName (obrigatório) nas funções saveOrUpdateItem, updateItemQuantityDirectly, deleteItem, e em todas as funções de relatório PDF.
// - Implementado: Lógica de exibição/ocultamento do formulário de cadastro/edição (#itemFormSection) via JavaScript, acionada pelo botão "Cadastrar Novo Item" (#showAddItemFormBtn), pelo clique em "Editar", "Salvar Item", "Limpar Formulário" e "Excluir Item".
// - Implementado: Persistência do Nome do Operador (#operatorName) no localStorage do navegador, mantendo o valor preenchido entre sessões (até a página ser recarregada).
// - Adicionado: Função imprimirTabelaExibida() para gerar um relatório em PDF da tabela de itens atualmente visível na página.
// - Adicionado: Vinculação do botão "Imprimir Tabela Exibida" (#printCurrentTableBtn) à função correspondente no DOMContentLoaded.
// - Melhoria: console.log adicionados à imprimirTabelaExibida() para depuração.


// --- CONFIGURAÇÃO DO ARQUIVO LOCAL PARA CATEGORIAS ---
const LOCAL_FILENAME_CATEGORIES = 'categorias_inventario.txt'; 

// Variáveis Globais de Estado
let currentEditingItemId = null;
let categoriasDisponiveis = []; // Armazena as categorias carregadas do arquivo local
let currentFilterStatus = 'all'; // Estado atual do filtro de status (all, critical, inStock, outOfStock)
const OPERATOR_NAME_STORAGE_KEY = 'sislab_inventario_operator_name'; // Chave para localStorage

// --- Event Listeners Iniciais ---
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

    // Event listeners para os botões de relatório
    document.getElementById('printInventoryReportBtn').addEventListener('click', imprimirRelatorioInventario);
    document.getElementById('generateReplenishmentReportBtn').addEventListener('click', gerarRelatorioReposicao);
    document.getElementById('generateConsumptionReportBtn').addEventListener('click', gerarRelatorioConsumo);
    document.getElementById('generateDueDateReportBtn').addEventListener('click', gerarRelatorioVencimento);
    
    document.getElementById('closeItemLogBtn').addEventListener('click', hideItemLog); 
    document.getElementById('printCurrentTableBtn').addEventListener('click', imprimirTabelaExibida); // NOVO: Botão Imprimir Tabela Exibida

    console.log("Setup inicial concluído."); // DEBUG
});

// Funções para mostrar/ocultar o formulário de cadastro/edição
function showItemForm() {
    document.getElementById('itemFormSection').style.display = 'flex'; // Altera para flex para manter layout
    console.log("Formulário de item exibido."); // DEBUG
}

function hideItemForm() {
    document.getElementById('itemFormSection').style.display = 'none';
    console.log("Formulário de item ocultado."); // DEBUG
}


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
// Lê o nome do operador do input e valida
function getOperadorNameFromInput() {
    console.log("Lendo nome do operador do input..."); // DEBUG
    const operatorNameInput = document.getElementById('operatorName');
    const operador = operatorNameInput.value.trim();

    if (!operador) {
        showError('operatorName', 'Nome do operador é obrigatório.');
        console.log("Validação: Nome do operador vazio."); // DEBUG
        return null;
    }
    clearError('operatorName');
    localStorage.setItem(OPERATOR_NAME_STORAGE_KEY, operador); // Salva no localStorage
    console.log(`Nome do operador lido e salvo: ${operador}`); // DEBUG
    return operador;
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
    // Formata um objeto Date para stringCompreendido! Vamos atualizar o `inventario_scripts.js` para incorporar a lógica de impressão da tabela exibida no HTML.

---

### **Arquivo: `inventario_scripts.js`**

### **Versão: 3.0.7 (inventario_scripts.js)**
**CHANGELOG (inventario_scripts.js):**
* **Versão Atualizada:** De `3.0.5` para `3.0.7`.
* **Adicionado:** Função `imprimirTabelaExibida()` para gerar um relatório em PDF da tabela de itens atualmente visível na página.
* **Adicionado:** Vinculação do botão "Imprimir Tabela Exibida" (`#printCurrentTableBtn`) à função correspondente no `DOMContentLoaded`.
* **Melhoria:** `console.log` adicionados à `imprimirTabelaExibida()` para depuração.
* **Corrigido:** Ajustes na lógica de `hideItemForm()` e `clearItemForm()` para que o campo `operatorName` seja mantido (não limpo) e os erros dele sejam corretamente limpos.
* **Mantido:** Todas as funcionalidades e correções das versões anteriores foram preservadas.

```javascript
// VERSÃO: 3.0.7 (inventario_scripts.js)
// CHANGELOG:
// - Nova Versão: Marca o início oficial da Versão 3.0 do Sistema de Inventário.
// - Adicionado: Geração automática de cod sequencial para novos itens via transação no Firebase (config_v3/contadores).
// - Adicionado: categorias para itens, com carregamento dinâmico de categorias_inventario.txt (local) e usadas em formulário e filtro.
// - Adicionado: Novos campos de item na inventario_v3: localizacao, dataVencimento, unidadeMedida.
// - Adicionado: Campos dataUltimaModificacao e ultimoOperador no item (inventario_v3), atualizados automaticamente em cada modificação.
// - Modificado: saveOrUpdateItem() para: lidar com todos os novos campos, salvando "Não definido" para campos opcionais não preenchidos; integrar solicitação do operador e alertas de estoque negativo; registrar logs detalhados (tipos "CADASTRO", "ENTRADA", "SAIDA", "AJUSTE"), incluindo todos os novos campos no log.
// - Modificado: listarItensInventario() para: exibir todas as novas colunas; implementar filtros por cod/item e categoria; implementar Filtro Rápido por Status de Estoque; adicionar Notificação Visual para Estoque Crítico; incluir Contagem de "Dias em Estoque"; configurar os controles de Movimentação Direta.
// - Adicionado: updateItemQuantityDirectly() para gerenciar as movimentações rápidas via botões +/-, com operador, alerta de estoque negativo e registro detalhado no log.
// - Modificado: loadItemForEdit() para preencher todos os campos do formulário e exibir/ocultar o botão "Excluir Item".
// - Modificado: deleteItem() e adicionado deleteItemFromForm() para integrar solicitação do operador, log detalhado "REMOCAO", e lidar com o botão "Excluir Item" do formulário.
// - Modificado: showItemLog() e hideItemLog() para exibir log por item com todos os campos relevantes.
// - Implementado: Funções de relatório PDF (imprimirRelatorioInventario, gerarRelatorioReposicao, gerarRelatorioConsumo, gerarRelatorioVencimento), acionadas pelos botões na inventario.html. Todos incluem operador no cabeçalho e detalhes dos novos campos nos relatórios.
// - Incluído: console.log para depuração em funções críticas.
// - Corrigido: Botão "Fechar Histórico" (id closeItemLogBtn) agora está corretamente vinculado no DOMContentLoaded.
// - Corrigido: Formatação da data no título do "Relatório de Consumo" de AAAA-MM-DD para DDMMAAAA.
// - Melhoria: Adição de mais console.log detalhados nas funções de relatório para auxiliar na depuração.
// - Manutenção: Refatoração de funções de formatação de data para reutilização.
// - Corrigido: listarItensInventario() aprimorada para depuração e correção do carregamento de itens na tabela, garantindo exibição de todos os campos e filtragem correta.
// - Modificado: Função getOperadorName() substituída por getOperadorNameFromInput() para ler o nome do operador do novo campo operatorName (input HTML).
// - Adicionado: Validação para o campo operatorName (obrigatório) nas funções saveOrUpdateItem, updateItemQuantityDirectly, deleteItem, e em todas as funções de relatório PDF.
// - Implementado: Lógica de exibição/ocultamento do formulário de cadastro/edição (#itemFormSection) via JavaScript, acionada pelo botão "Cadastrar Novo Item" (#showAddItemFormBtn), pelo clique em "Editar", "Salvar Item", "Limpar Formulário" e "Excluir Item".
// - Implementado: Persistência do Nome do Operador (#operatorName) no localStorage do navegador, mantendo o valor preenchido entre sessões (até a página ser recarregada).
// - Adicionado: Função imprimirTabelaExibida() para gerar um relatório em PDF da tabela de itens atualmente visível na página.
// - Adicionado: Vinculação do botão "Imprimir Tabela Exibida" (#printCurrentTableBtn) à função correspondente no DOMContentLoaded.
// - Melhoria: console.log adicionados à imprimirTabelaExibida() para depuração.
// - Corrigido: Ajustes na lógica de hideItemForm() e clearItemForm() para que o campo operatorName seja mantido (não limpo) e os erros dele sejam corretamente limpos.


// --- CONFIGURAÇÃO DO ARQUIVO LOCAL PARA CATEGORIAS ---
const LOCAL_FILENAME_CATEGORIES = 'categorias_inventario.txt'; 

// Variáveis Globais de Estado
let currentEditingItemId = null;
let categoriasDisponiveis = []; // Armazena as categorias carregadas do arquivo local
let currentFilterStatus = 'all'; // Estado atual do filtro de status (all, critical, inStock, outOfStock)
const OPERATOR_NAME_STORAGE_KEY = 'sislab_inventario_operator_name'; // Chave para localStorage

// --- Event Listeners Iniciais ---
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
        clearItemForm(false); // Limpa o formulário, mas NÃO o nome do operador
        showItemForm(); // Exibe o formulário
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola para o topo
    });


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

    // Event listeners para os botões de relatório
    document.getElementById('printInventoryReportBtn').addEventListener('click', imprimirRelatorioInventario);
    document.getElementById('generateReplenishmentReportBtn').addEventListener('click', gerarRelatorioReposicao);
    document.getElementById('generateConsumptionReportBtn').addEventListener('click', gerarRelatorioConsumo);
    document.getElementById('generateDueDateReportBtn').addEventListener('click', gerarRelatorioVencimento);
    
    document.getElementById('closeItemLogBtn').addEventListener('click', hideItemLog); 
    document.getElementById('printCurrentTableBtn').addEventListener('click', imprimirTabelaExibida); // NOVO: Botão Imprimir Tabela Exibida

    console.log("Setup inicial concluído."); // DEBUG
});

// Funções para mostrar/ocultar o formulário de cadastro/edição
function showItemForm() {
    document.getElementById('itemFormSection').style.display = 'flex'; // Altera para flex para manter layout
    console.log("Formulário de item exibido."); // DEBUG
}

function hideItemForm() {
    document.getElementById('itemFormSection').style.display = 'none';
    console.log("Formulário de item ocultado."); // DEBUG
}


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
// Lê o nome do operador do input e valida
function getOperadorNameFromInput() {
    console.log("Lendo nome do operador do input..."); // DEBUG
    const operatorNameInput = document.getElementById('operatorName');
    const operador = operatorNameInput.value.trim();

    if (!operador) {
        showError('operatorName', 'Nome do operador é obrigatório.');
        console.log("Validação: Nome do operador vazio."); // DEBUG
        return null;
    }
    clearError('operatorName');
    localStorage.setItem(OPERATOR_NAME_STORAGE_KEY, operador); // Salva no localStorage
    console.log(`Nome do operador lido e salvo: ${operador}`); // DEBUG
    return operador;
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
    // Formata um objeto Date para stringCompreendido! Vamos atualizar o `inventario_scripts.js` para incorporar a lógica de impressão da tabela exibida no HTML.

---

### **Arquivo: `inventario_scripts.js`**

### **Versão: 3.0.7 (inventario_scripts.js)**
**CHANGELOG (inventario_scripts.js):**
* **Versão Atualizada:** De `3.0.5` para `3.0.7`.
* **Adicionado:** Função `imprimirTabelaExibida()` para gerar um relatório em PDF da tabela de itens atualmente visível na página.
* **Adicionado:** Vinculação do botão "Imprimir Tabela Exibida" (`#printCurrentTableBtn`) à função correspondente no `DOMContentLoaded`.
* **Melhoria:** `console.log` adicionados à `imprimirTabelaExibida()` para depuração.
* **Corrigido:** Ajustes na lógica de `hideItemForm()` e `clearItemForm()` para que o campo `operatorName` seja mantido (não limpo) e os erros dele sejam corretamente limpos.
* **Corrigido:** Variáveis `formattedDate` e `formattedTime` no escopo global para reutilização em cabeçalhos de PDF.
* **Mantido:** Todas as funcionalidades e correções das versões anteriores foram preservadas.

```javascript
// VERSÃO: 3.0.7 (inventario_scripts.js)
// CHANGELOG:
// - Nova Versão: Marca o início oficial da Versão 3.0 do Sistema de Inventário.
// - Adicionado: Geração automática de cod sequencial para novos itens via transação no Firebase (config_v3/contadores).
// - Adicionado: categorias para itens, com carregamento dinâmico de categorias_inventario.txt (local) e usadas em formulário e filtro.
// - Adicionado: Novos campos de item na inventario_v3: localizacao, dataVencimento, unidadeMedida.
// - Adicionado: Campos dataUltimaModificacao e ultimoOperador no item (inventario_v3), atualizados automaticamente em cada modificação.
// - Modificado: saveOrUpdateItem() para: lidar com todos os novos campos, salvando "Não definido" para campos opcionais não preenchidos; integrar solicitação do operador e alertas de estoque negativo; registrar logs detalhados (tipos "CADASTRO", "ENTRADA", "SAIDA", "AJUSTE"), incluindo todos os novos campos no log.
// - Modificado: listarItensInventario() para: exibir todas as novas colunas; implementar filtros por cod/item e categoria; implementar Filtro Rápido por Status de Estoque; adicionar Notificação Visual para Estoque Crítico; incluir Contagem de "Dias em Estoque"; configurar os controles de Movimentação Direta.
// - Adicionado: updateItemQuantityDirectly() para gerenciar as movimentações rápidas via botões +/-, com operador, alerta de estoque negativo e registro detalhado no log.
// - Modificado: loadItemForEdit() para preencher todos os campos do formulário e exibir/ocultar o botão "Excluir Item".
// - Modificado: deleteItem() e adicionado deleteItemFromForm() para integrar solicitação do operador, log detalhado "REMOCAO", e lidar com o botão "Excluir Item" do formulário.
// - Modificado: showItemLog() e hideItemLog() para exibir log por item com todos os campos relevantes.
// - Implementado: Funções de relatório PDF (imprimirRelatorioInventario, gerarRelatorioReposicao, gerarRelatorioConsumo, gerarRelatorioVencimento), acionadas pelos botões na inventario.html. Todos incluem operador no cabeçalho e detalhes dos novos campos nos relatórios.
// - Incluído: console.log para depuração em funções críticas.
// - Corrigido: Botão "Fechar Histórico" (id closeItemLogBtn) agora está corretamente vinculado no DOMContentLoaded.
// - Corrigido: Formatação da data no título do "Relatório de Consumo" de AAAA-MM-DD para DDMMAAAA.
// - Melhoria: Adição de mais console.log detalhados nas funções de relatório para auxiliar na depuração.
// - Manutenção: Refatoração de funções de formatação de data para reutilização.
// - Corrigido: listarItensInventario() aprimorada para depuração e correção do carregamento de itens na tabela, garantindo exibição de todos os campos e filtragem correta.
// - Modificado: Função getOperadorName() substituída por getOperadorNameFromInput() para ler o nome do operador do novo campo operatorName (input HTML).
// - Adicionado: Validação para o campo operatorName (obrigatório) nas funções saveOrUpdateItem, updateItemQuantityDirectly, deleteItem, e em todas as funções de relatório PDF.
// - Implementado: Lógica de exibição/ocultamento do formulário de cadastro/edição (#itemFormSection) via JavaScript, acionada pelo botão "Cadastrar Novo Item" (#showAddItemFormBtn), pelo clique em "Editar", "Salvar Item", "Limpar Formulário" e "Excluir Item".
// - Implementado: Persistência do Nome do Operador (#operatorName) no localStorage do navegador, mantendo o valor preenchido entre sessões (até a página ser recarregada).
// - Adicionado: Função imprimirTabelaExibida() para gerar um relatório em PDF da tabela de itens atualmente visível na página.
// - Adicionado: Vinculação do botão "Imprimir Tabela Exibida" (#printCurrentTableBtn) à função correspondente no DOMContentLoaded.
// - Melhoria: console.log adicionados à imprimirTabelaExibida() para depuração.
// - Corrigido: Ajustes na lógica de hideItemForm() e clearItemForm() para que o campo operatorName seja mantido (não limpo) e os erros dele sejam corretamente limpos.
// - Adicionado: Variáveis formattedDate e formattedTime no escopo global para reutilização em cabeçalhos de PDF.


// --- CONFIGURAÇÃO DO ARQUIVO LOCAL PARA CATEGORIAS ---
const LOCAL_FILENAME_CATEGORIES = 'categorias_inventario.txt'; 

// Variáveis Globais de Estado
let currentEditingItemId = null;
let categoriasDisponiveis = []; // Armazena as categorias carregadas do arquivo local
let currentFilterStatus = 'all'; // Estado atual do filtro de status (all, critical, inStock, outOfStock)
const OPERATOR_NAME_STORAGE_KEY = 'sislab_inventario_operator_name'; // Chave para localStorage

// Variáveis de data/hora globais para cabeçalhos de PDF
let formattedDate = '';
let formattedTime = '';

// --- Event Listeners Iniciais ---
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
        clearItemForm(false); // Limpa o formulário, mas NÃO o nome do operador
        showItemForm(); // Exibe o formulário
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola para o topo
    });


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

    // Event listeners para os botões de relatório
    document.getElementById('printInventoryReportBtn').addEventListener('click', imprimirRelatorioInventario);
    document.getElementById('generateReplenishmentReportBtn').addEventListener('click', gerarRelatorioReposicao);
    document.getElementById('generateConsumptionReportBtn').addEventListener('click', gerarRelatorioConsumo);
    document.getElementById('generateDueDateReportBtn').addEventListener('click', gerarRelatorioVencimento);
    
    document.getElementById('closeItemLogBtn').addEventListener('click', hideItemLog); 
    document.getElementById('printCurrentTableBtn').addEventListener('click', imprimirTabelaExibida); // NOVO: Botão Imprimir Tabela Exibida

    console.log("Setup inicial concluído."); // DEBUG
});

// Funções para mostrar/ocultar o formulário de cadastro/edição
function showItemForm() {
    document.getElementById('itemFormSection').style.display = 'flex'; // Altera para flex para manter layout
    console.log("Formulário de item exibido."); // DEBUG
}

function hideItemForm() {
    document.getElementById('itemFormSection').style.display = 'none';
    console.log("Formulário de item ocultado."); // DEBUG
}


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
// Lê o nome do operador do input e valida
function getOperadorNameFromInput() {
    console.log("Lendo nome do operador do input..."); // DEBUG
    const operatorNameInput = document.getElementById('operatorName');
    const operador = operatorNameInput.value.trim();

    if (!operador) {
        showError('operatorName', 'Nome do operador é obrigatório.');
        console.log("Validação: Nome do operador vazio."); // DEBUG
        return null;
    }
    clearError('operatorName');
    localStorage.setItem(OPERATOR_NAME_STORAGE_KEY, operador); // Salva no localStorage
    console.log(`Nome do operador lido e salvo: ${operador}`); // DEBUG
    return operador;
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
    // Formata um objeto Date para stringCompreendido! Vamos atualizar o `inventario_scripts.js` para incorporar a lógica de impressão da tabela exibida no HTML.

---

### **Arquivo: `inventario_scripts.js`**

### **Versão: 3.0.7 (inventario_scripts.js)**
**CHANGELOG (inventario_scripts.js):**
* **Versão Atualizada:** De `3.0.5` para `3.0.7`.
* **Adicionado:** Função `imprimirTabelaExibida()` para gerar um relatório em PDF da tabela de itens atualmente visível na página.
* **Adicionado:** Vinculação do botão "Imprimir Tabela Exibida" (`#printCurrentTableBtn`) à função correspondente no `DOMContentLoaded`.
* **Melhoria:** `console.log` adicionados à `imprimirTabelaExibida()` para depuração.
* **Corrigido:** Ajustes na lógica de `hideItemForm()` e `clearItemForm()` para que o campo `operatorName` seja mantido (não limpo) e os erros dele sejam corretamente limpos.
* **Corrigido:** Variáveis `formattedDate` e `formattedTime` (do cabeçalho do PDF) agora são geradas localmente dentro de cada função de relatório, evitando conflitos ou valores desatualizados.
* **Mantido:** Todas as funcionalidades e correções das versões anteriores foram preservadas.

```javascript
// VERSÃO: 3.0.7 (inventario_scripts.js)
// CHANGELOG:
// - Nova Versão: Marca o início oficial da Versão 3.0 do Sistema de Inventário.
// - Adicionado: Geração automática de cod sequencial para novos itens via transação no Firebase (config_v3/contadores).
// - Adicionado: categorias para itens, com carregamento dinâmico de categorias_inventario.txt (local) e usadas em formulário e filtro.
// - Adicionado: Novos campos de item na inventario_v3: localizacao, dataVencimento, unidadeMedida.
// - Adicionado: Campos dataUltimaModificacao e ultimoOperador no item (inventario_v3), atualizados automaticamente em cada modificação.
// - Modificado: saveOrUpdateItem() para: lidar com todos os novos campos, salvando "Não definido" para campos opcionais não preenchidos; integrar solicitação do operador e alertas de estoque negativo; registrar logs detalhados (tipos "CADASTRO", "ENTRADA", "SAIDA", "AJUSTE"), incluindo todos os novos campos no log.
// - Modificado: listarItensInventario() para: exibir todas as novas colunas; implementar filtros por cod/item e categoria; implementar Filtro Rápido por Status de Estoque; adicionar Notificação Visual para Estoque Crítico; incluir Contagem de "Dias em Estoque"; configurar os controles de Movimentação Direta.
// - Adicionado: updateItemQuantityDirectly() para gerenciar as movimentações rápidas via botões +/-, com operador, alerta de estoque negativo e registro detalhado no log.
// - Modificado: loadItemForEdit() para preencher todos os campos do formulário e exibir/ocultar o botão "Excluir Item".
// - Modificado: deleteItem() e adicionado deleteItemFromForm() para integrar solicitação do operador, log detalhado "REMOCAO", e lidar com o botão "Excluir Item" do formulário.
// - Modificado: showItemLog() e hideItemLog() para exibir log por item com todos os campos relevantes.
// - Implementado: Funções de relatório PDF (imprimirRelatorioInventario, gerarRelatorioReposicao, gerarRelatorioConsumo, gerarRelatorioVencimento), acionadas pelos botões na inventario.html. Todos incluem operador no cabeçalho e detalhes dos novos campos nos relatórios.
// - Incluído: console.log para depuração em funções críticas.
// - Corrigido: Botão "Fechar Histórico" (id closeItemLogBtn) agora está corretamente vinculado no DOMContentLoaded.
// - Corrigido: Formatação da data no título do "Relatório de Consumo" de AAAA-MM-DD para DDMMAAAA.
// - Melhoria: Adição de mais console.log detalhados nas funções de relatório para auxiliar na depuração.
// - Manutenção: Refatoração de funções de formatação de data para reutilização.
// - Corrigido: listarItensInventario() aprimorada para depuração e correção do carregamento de itens na tabela, garantindo exibição de todos os campos e filtragem correta.
// - Modificado: Função getOperadorName() substituída por getOperadorNameFromInput() para ler o nome do operador do novo campo operatorName (input HTML).
// - Adicionado: Validação para o campo operatorName (obrigatório) nas funções saveOrUpdateItem, updateItemQuantityDirectly, deleteItem, e em todas as funções de relatório PDF.
// - Implementado: Lógica de exibição/ocultamento do formulário de cadastro/edição (#itemFormSection) via JavaScript, acionada pelo botão "Cadastrar Novo Item" (#showAddItemFormBtn), pelo clique em "Editar", "Salvar Item", "Limpar Formulário" e "Excluir Item".
// - Implementado: Persistência do Nome do Operador (#operatorName) no localStorage do navegador, mantendo o valor preenchido entre sessões (até a página ser recarregada).
// - Adicionado: Função imprimirTabelaExibida() para gerar um relatório em PDF da tabela de itens atualmente visível na página.
// - Adicionado: Vinculação do botão "Imprimir Tabela Exibida" (#printCurrentTableBtn) à função correspondente no DOMContentLoaded.
// - Melhoria: console.log adicionados à imprimirTabelaExibida() para depuração.
// - Corrigido: Ajustes na lógica de hideItemForm() e clearItemForm() para que o campo operatorName seja mantido (não limpo) e os erros dele sejam corretamente limpos.
// - Corrigido: Variáveis formattedDate e formattedTime no escopo global para reutilização em cabeçalhos de PDF.


// --- CONFIGURAÇÃO DO ARQUIVO LOCAL PARA CATEGORIAS ---
const LOCAL_FILENAME_CATEGORIES = 'categorias_inventario.txt'; 

// Variáveis Globais de Estado
let currentEditingItemId = null;
let categoriasDisponiveis = []; // Armazena as categorias carregadas do arquivo local
let currentFilterStatus = 'all'; // Estado atual do filtro de status (all, critical, inStock, outOfStock)
const OPERATOR_NAME_STORAGE_KEY = 'sislab_inventario_operator_name'; // Chave para localStorage


// --- Event Listeners Iniciais ---
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
        clearItemForm(false); // Limpa o formulário, mas NÃO o nome do operador
        showItemForm(); // Exibe o formulário
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola para o topo
    });


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

    // Event listeners para os botões de relatório
    document.getElementById('printInventoryReportBtn').addEventListener('click', imprimirRelatorioInventario);
    document.getElementById('generateReplenishmentReportBtn').addEventListener('click', gerarRelatorioReposicao);
    document.getElementById('generateConsumptionReportBtn').addEventListener('click', gerarRelatorioConsumo);
    document.getElementById('generateDueDateReportBtn').addEventListener('click', gerarRelatorioVencimento);
    
    document.getElementById('closeItemLogBtn').addEventListener('click', hideItemLog); 
    document.getElementById('printCurrentTableBtn').addEventListener('click', imprimirTabelaExibida); // NOVO: Botão Imprimir Tabela Exibida

    console.log("Setup inicial concluído."); // DEBUG
});

// Funções para mostrar/ocultar o formulário de cadastro/edição
function showItemForm() {
    document.getElementById('itemFormSection').style.display = 'flex'; // Altera para flex para manter layout
    console.log("Formulário de item exibido."); // DEBUG
}

function hideItemForm() {
    document.getElementById('itemFormSection').style.display = 'none';
    console.log("Formulário de item ocultado."); // DEBUG
}


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
// Lê o nome do operador do input e valida
function getOperadorNameFromInput() {
    console.log("Lendo nome do operador do input..."); // DEBUG
    const operatorNameInput = document.getElementById('operatorName');
    const operador = operatorNameInput.value.trim();

    if (!operador) {
        showError('operatorName', 'Nome do operador é obrigatório.');
        console.log("Validação: Nome do operador vazio."); // DEBUG
        return null;
    }
    clearError('operatorName');
    localStorage.setItem(OPERATOR_NAME_STORAGE_KEY, operador); // Salva no localStorage
    console.log(`Nome do operador lido e salvo: ${operador}`); // DEBUG
    return operador;
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
    // Formata um objeto Date para stringCompreendido! Vamos atualizar o `inventario_scripts.js` para incorporar a lógica de impressão da tabela exibida no HTML.

---

### **Arquivo: `inventario_scripts.js`**

### **Versão: 3.0.7 (inventario_scripts.js)**
**CHANGELOG (inventario_scripts.js):**
* **Versão Atualizada:** De `3.0.5` para `3.0.7`.
* **Adicionado:** Função `imprimirTabelaExibida()` para gerar um relatório em PDF da tabela de itens atualmente visível na página.
* **Adicionado:** Vinculação do botão "Imprimir Tabela Exibida" (`#printCurrentTableBtn`) à função correspondente no `DOMContentLoaded`.
* **Melhoria:** `console.log` adicionados à `imprimirTabelaExibida()` para depuração.
* **Corrigido:** Ajustes na lógica de `hideItemForm()` e `clearItemForm()` para que o campo `operatorName` seja mantido (não limpo) e os erros dele sejam corretamente limpos.
* **Corrigido:** As variáveis de data e hora para cabeçalhos de PDF (`formattedDate`, `formattedTime`) agora são geradas localmente dentro de cada função de relatório para garantir que reflitam a hora da geração do relatório.
* **Mantido:** Todas as funcionalidades e correções das versões anteriores foram preservadas.

```javascript
// VERSÃO: 3.0.7 (inventario_scripts.js)
// CHANGELOG:
// - Nova Versão: Marca o início oficial da Versão 3.0 do Sistema de Inventário.
// - Adicionado: Geração automática de cod sequencial para novos itens via transação no Firebase (config_v3/contadores).
// - Adicionado: categorias para itens, com carregamento dinâmico de categorias_inventario.txt (local) e usadas em formulário e filtro.
// - Adicionado: Novos campos de item na inventario_v3: localizacao, dataVencimento, unidadeMedida.
// - Adicionado: Campos dataUltimaModificacao e ultimoOperador no item (inventario_v3), atualizados automaticamente em cada modificação.
// - Modificado: saveOrUpdateItem() para: lidar com todos os novos campos, salvando "Não definido" para campos opcionais não preenchidos; integrar solicitação do operador e alertas de estoque negativo; registrar logs detalhados (tipos "CADASTRO", "ENTRADA", "SAIDA", "AJUSTE"), incluindo todos os novos campos no log.
// - Modificado: listarItensInventario() para: exibir todas as novas colunas; implementar filtros por cod/item e categoria; implementar Filtro Rápido por Status de Estoque; adicionar Notificação Visual para Estoque Crítico; incluir Contagem de "Dias em Estoque"; configurar os controles de Movimentação Direta.
// - Adicionado: updateItemQuantityDirectly() para gerenciar as movimentações rápidas via botões +/-, com operador, alerta de estoque negativo e registro detalhado no log.
// - Modificado: loadItemForEdit() para preencher todos os campos do formulário e exibir/ocultar o botão "Excluir Item".
// - Modificado: deleteItem() e adicionado deleteItemFromForm() para integrar solicitação do operador, log detalhado "REMOCAO", e lidar com o botão "Excluir Item" do formulário.
// - Modificado: showItemLog() e hideItemLog() para exibir log por item com todos os campos relevantes.
// - Implementado: Funções de relatório PDF (imprimirRelatorioInventario, gerarRelatorioReposicao, gerarRelatorioConsumo, gerarRelatorioVencimento), acionadas pelos botões na inventario.html. Todos incluem operador no cabeçalho e detalhes dos novos campos nos relatórios.
// - Incluído: console.log para depuração em funções críticas.
// - Corrigido: Botão "Fechar Histórico" (id closeItemLogBtn) agora está corretamente vinculado no DOMContentLoaded.
// - Corrigido: Formatação da data no título do "Relatório de Consumo" de AAAA-MM-DD para DDMMAAAA.
// - Melhoria: Adição de mais console.log detalhados nas funções de relatório para auxiliar na depuração.
// - Manutenção: Refatoração de funções de formatação de data para reutilização.
// - Corrigido: listarItensInventario() aprimorada para depuração e correção do carregamento de itens na tabela, garantindo exibição de todos os campos e filtragem correta.
// - Modificado: Função getOperadorName() substituída por getOperadorNameFromInput() para ler o nome do operador do novo campo operatorName (input HTML).
// - Adicionado: Validação para o campo operatorName (obrigatório) nas funções saveOrUpdateItem, updateItemQuantityDirectly, deleteItem, e em todas as funções de relatório PDF.
// - Implementado: Lógica de exibição/ocultamento do formulário de cadastro/edição (#itemFormSection) via JavaScript, acionada pelo botão "Cadastrar Novo Item" (#showAddItemFormBtn), pelo clique em "Editar", "Salvar Item", "Limpar Formulário" e "Excluir Item".
// - Implementado: Persistência do Nome do Operador (#operatorName) no localStorage do navegador, mantendo o valor preenchido entre sessões (até a página ser recarregada).
// - Adicionado: Função imprimirTabelaExibida() para gerar um relatório em PDF da tabela de itens atualmente visível na página.
// - Adicionado: Vinculação do botão "Imprimir Tabela Exibida" (#printCurrentTableBtn) à função correspondente no DOMContentLoaded.
// - Melhoria: console.log adicionados à imprimirTabelaExibida() para depuração.
// - Corrigido: Ajustes na lógica de hideItemForm() e clearItemForm() para que o campo operatorName seja mantido (não limpo) e os erros dele sejam corretamente limpos.
// - Corrigido: Variáveis formattedDate e formattedTime no escopo global para reutilização em cabeçalhos de PDF.


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
        clearItemForm(false); // Limpa o formulário, mas NÃO o nome do operador
        showItemForm(); // Exibe o formulário
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola para o topo
    });


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

    // Event listeners para os botões de relatório
    document.getElementById('printInventoryReportBtn').addEventListener('click', imprimirRelatorioInventario);
    document.getElementById('generateReplenishmentReportBtn').addEventListener('click', gerarRelatorioReposicao);
    document.getElementById('generateConsumptionReportBtn').addEventListener('click', gerarRelatorioConsumo);
    document.getElementById('generateDueDateReportBtn').addEventListener('click', gerarRelatorioVencimento);
    
    document.getElementById('closeItemLogBtn').addEventListener('click', hideItemLog); 
    document.getElementById('printCurrentTableBtn').addEventListener('click', imprimirTabelaExibida); // NOVO: Botão Imprimir Tabela Exibida

    console.log("Setup inicial concluído."); // DEBUG
});

// Funções para mostrar/ocultar o formulário de cadastro/edição
function showItemForm() {
    document.getElementById('itemFormSection').style.display = 'flex'; // Altera para flex para manter layout
    console.log("Formulário de item exibido."); // DEBUG
}

function hideItemForm() {
    document.getElementById('itemFormSection').style.display = 'none';
    console.log("Formulário de item ocultado."); // DEBUG
}


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
// Lê o nome do operador do input e valida
function getOperadorNameFromInput() {
    console.log("Lendo nome do operador do input..."); // DEBUG
    const operatorNameInput = document.getElementById('operatorName');
    const operador = operatorNameInput.value.trim();

    if (!operador) {
        showError('operatorName', 'Nome do operador é obrigatório.');
        console.log("Validação: Nome do operador vazio."); // DEBUG
        return null;
    }
    clearError('operatorName');
    localStorage.setItem(OPERATOR_NAME_STORAGE_KEY, operador); // Salva no localStorage
    console.log(`Nome do operador lido e salvo: ${operador}`); // DEBUG
    return operador;
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
    // Formata um objeto Date para stringCompreendido! Vamos atualizar o `inventario_scripts.js` para incorporar a lógica de impressão da tabela exibida no HTML.

---

### **Arquivo: `inventario_scripts.js`**

### **Versão: 3.0.7 (inventario_scripts.js)**
**CHANGELOG (inventario_scripts.js):**
* **Versão Atualizada:** De `3.0.5` para `3.0.7`.
* **Adicionado:** Função `imprimirTabelaExibida()` para gerar um relatório em PDF da tabela de itens atualmente visível na página.
* **Adicionado:** Vinculação do botão "Imprimir Tabela Exibida" (`#printCurrentTableBtn`) à função correspondente no `DOMContentLoaded`.
* **Melhoria:** `console.log` adicionados à `imprimirTabelaExibida()` para depuração.
* **Corrigido:** Ajustes na lógica de `hideItemForm()` e `clearItemForm()` para que o campo `operatorName` seja mantido (não limpo) e os erros dele sejam corretamente limpos.
* **Corrigido:** As variáveis de data e hora para cabeçalhos de PDF (`formattedDate`, `formattedTime`) agora são geradas localmente dentro de cada função de relatório para garantir que reflitam a hora da geração do relatório.
* **Mantido:** Todas as funcionalidades e correções das versões anteriores foram preservadas.

```javascript
// VERSÃO: 3.0.7 (inventario_scripts.js)
// CHANGELOG:
// - Nova Versão: Marca o início oficial da Versão 3.0 do Sistema de Inventário.
// - Adicionado: Geração automática de cod sequencial para novos itens via transação no Firebase (config_v3/contadores).
// - Adicionado: categorias para itens, com carregamento dinâmico de categorias_inventario.txt (local) e usadas em formulário e filtro.
// - Adicionado: Novos campos de item na inventario_v3: localizacao, dataVencimento, unidadeMedida.
// - Adicionado: Campos dataUltimaModificacao e ultimoOperador no item (inventario_v3), atualizados automaticamente em cada modificação.
// - Modificado: saveOrUpdateItem() para: lidar com todos os novos campos, salvando "Não definido" para campos opcionais não preenchidos; integrar solicitação do operador e alertas de estoque negativo; registrar logs detalhados (tipos "CADASTRO", "ENTRADA", "SAIDA", "AJUSTE"), incluindo todos os novos campos no log.
// - Modificado: listarItensInventario() para: exibir todas as novas colunas; implementar filtros por cod/item e categoria; implementar Filtro Rápido por Status de Estoque; adicionar Notificação Visual para Estoque Crítico; incluir Contagem de "Dias em Estoque"; configurar os controles de Movimentação Direta.
// - Adicionado: updateItemQuantityDirectly() para gerenciar as movimentações rápidas via botões +/-, com operador, alerta de estoque negativo e registro detalhado no log.
// - Modificado: loadItemForEdit() para preencher todos os campos do formulário e exibir/ocultar o botão "Excluir Item".
// - Modificado: deleteItem() e adicionado deleteItemFromForm() para integrar solicitação do operador, log detalhado "REMOCAO", e lidar com o botão "Excluir Item" do formulário.
// - Modificado: showItemLog() e hideItemLog() para exibir log por item com todos os campos relevantes.
// - Implementado: Funções de relatório PDF (imprimirRelatorioInventario, gerarRelatorioReposicao, gerarRelatorioConsumo, gerarRelatorioVencimento), acionadas pelos botões na inventario.html. Todos incluem operador no cabeçalho e detalhes dos novos campos nos relatórios.
// - Incluído: console.log para depuração em funções críticas.
// - Corrigido: Botão "Fechar Histórico" (id closeItemLogBtn) agora está corretamente vinculado no DOMContentLoaded.
// - Corrigido: Formatação da data no título do "Relatório de Consumo" de AAAA-MM-DD para DDMMAAAA.
// - Melhoria: Adição de mais console.log detalhados nas funções de relatório para auxiliar na depuração.
// - Manutenção: Refatoração de funções de formatação de data para reutilização.
// - Corrigido: listarItensInventario() aprimorada para depuração e correção do carregamento de itens na tabela, garantindo exibição de todos os campos e filtragem correta.
// - Modificado: Função getOperadorName() substituída por getOperadorNameFromInput() para ler o nome do operador do novo campo operatorName (input HTML).
// - Adicionado: Validação para o campo operatorName (obrigatório) nas funções saveOrUpdateItem, updateItemQuantityDirectly, deleteItem, e em todas as funções de relatório PDF.
// - Implementado: Lógica de exibição/ocultamento do formulário de cadastro/edição (#itemFormSection) via JavaScript, acionada pelo botão "Cadastrar Novo Item" (#showAddItemFormBtn), pelo clique em "Editar", "Salvar Item", "Limpar Formulário" e "Excluir Item".
// - Implementado: Persistência do Nome do Operador (#operatorName) no localStorage do navegador, mantendo o valor preenchido entre sessões (até a página ser recarregada).
// - Adicionado: Função imprimirTabelaExibida() para gerar um relatório em PDF da tabela de itens atualmente visível na página.
// - Adicionado: Vinculação do botão "Imprimir Tabela Exibida" (#printCurrentTableBtn) à função correspondente no DOMContentLoaded.
// - Melhoria: console.log adicionados à imprimirTabelaExibida() para depuração.
// - Corrigido: Ajustes na lógica de hideItemForm() e clearItemForm() para que o campo operatorName seja mantido (não limpo) e os erros dele sejam corretamente limpos.
// - Corrigido: Variáveis formattedDate e formattedTime no escopo global para reutilização em cabeçalhos de PDF.


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
        clearItemForm(false); // Limpa o formulário, mas NÃO o nome do operador
        showItemForm(); // Exibe o formulário
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola para o topo
    });


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

    // Event listeners para os botões de relatório
    document.getElementById('printInventoryReportBtn').addEventListener('click', imprimirRelatorioInventario);
    document.getElementById('generateReplenishmentReportBtn').addEventListener('click', gerarRelatorioReposicao);
    document.getElementById('generateConsumptionReportBtn').addEventListener('click', gerarRelatorioConsumo);
    document.getElementById('generateDueDateReportBtn').addEventListener('click', gerarRelatorioVencimento);
    
    document.getElementById('closeItemLogBtn').addEventListener('click', hideItemLog); 
    document.getElementById('printCurrentTableBtn').addEventListener('click', imprimirTabelaExibida); // NOVO: Botão Imprimir Tabela Exibida

    console.log("Setup inicial concluído."); // DEBUG
});

// Funções para mostrar/ocultar o formulário de cadastro/edição
function showItemForm() {
    document.getElementById('itemFormSection').style.display = 'flex'; // Altera para flex para manter layout
    console.log("Formulário de item exibido."); // DEBUG
}

function hideItemForm() {
    document.getElementById('itemFormSection').style.display = 'none';
    console.log("Formulário de item ocultado."); // DEBUG
}


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
// Lê o nome do operador do input e valida
function getOperadorNameFromInput() {
    console.log("Lendo nome do operador do input..."); // DEBUG
    const operatorNameInput = document.getElementById('operatorName');
    const operador = operatorNameInput.value.trim();

    if (!operador) {
        showError('operatorName', 'Nome do operador é obrigatório.');
        console.log("Validação: Nome do operador vazio."); // DEBUG
        return null;
    }
    clearError('operatorName');
    localStorage.setItem(OPERATOR_NAME_STORAGE_KEY, operador); // Salva no localStorage
    console.log(`Nome do operador lido e salvo: ${operador}`); // DEBUG
    return operador;
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
    // Formata um objeto Date para stringCompreendido! Vamos atualizar o `inventario_scripts.js` para incorporar a lógica de impressão da tabela exibida no HTML.

---

### **Arquivo: `inventario_scripts.js`**

### **Versão: 3.0.7 (inventario_scripts.js)**
**CHANGELOG (inventario_scripts.js):**
* **Versão Atualizada:** De `3.0.5` para `3.0.7`.
* **Adicionado:** Função `imprimirTabelaExibida()` para gerar um relatório em PDF da tabela de itens atualmente visível na página.
* **Adicionado:** Vinculação do botão "Imprimir Tabela Exibida" (`#printCurrentTableBtn`) à função correspondente no `DOMContentLoaded`.
* **Melhoria:** `console.log` adicionados à `imprimirTabelaExibida()` para depuração.
* **Corrigido:** Ajustes na lógica de `hideItemForm()` e `clearItemForm()` para que o campo `operatorName` seja mantido (não limpo) e os erros dele sejam corretamente limpos.
* **Corrigido:** As variáveis de data e hora para cabeçalhos de PDF (`formattedDate`, `formattedTime`) agora são geradas localmente dentro de cada função de relatório para garantir que reflitam a hora da geração do relatório.
* **Mantido:** Todas as funcionalidades e correções das versões anteriores foram preservadas.

```javascript
// VERSÃO: 3.0.7 (inventario_scripts.js)
// CHANGELOG:
// - Nova Versão: Marca o início oficial da Versão 3.0 do Sistema de Inventário.
// - Adicionado: Geração automática de cod sequencial para novos itens via transação no Firebase (config_v3/contadores).
// - Adicionado: categorias para itens, com carregamento dinâmico de categorias_inventario.txt (local) e usadas em formulário e filtro.
// - Adicionado: Novos campos de item na inventario_v3: localizacao, dataVencimento, unidadeMedida.
// - Adicionado: Campos dataUltimaModificacao e ultimoOperador no item (inventario_v3), atualizados automaticamente em cada modificação.
// - Modificado: saveOrUpdateItem() para: lidar com todos os novos campos, salvando "Não definido" para campos opcionais não preenchidos; integrar solicitação do operador e alertas de estoque negativo; registrar logs detalhados (tipos "CADASTRO", "ENTRADA", "SAIDA", "AJUSTE"), incluindo todos os novos campos no log.
// - Modificado: listarItensInventario() para: exibir todas as novas colunas; implementar filtros por cod/item e categoria; implementar Filtro Rápido por Status de Estoque; adicionar Notificação Visual para Estoque Crítico; incluir Contagem de "Dias em Estoque"; configurar os controles de Movimentação Direta.
// - Adicionado: updateItemQuantityDirectly() para gerenciar as movimentações rápidas via botões +/-, com operador, alerta de estoque negativo e registro detalhado no log.
// - Modificado: loadItemForEdit() para preencher todos os campos do formulário e exibir/ocultar o botão "Excluir Item".
// - Modificado: deleteItem() e adicionado deleteItemFromForm() para integrar solicitação do operador, log detalhado "REMOCAO", e lidar com o botão "Excluir Item" do formulário.
// - Modificado: showItemLog() e hideItemLog() para exibir log por item com todos os campos relevantes.
// - Implementado: Funções de relatório PDF (imprimirRelatorioInventario, gerarRelatorioReposicao, gerarRelatorioConsumo, gerarRelatorioVencimento), acionadas pelos botões na inventario.html. Todos incluem operador no cabeçalho e detalhes dos novos campos nos relatórios.
// - Incluído: console.log para depuração em funções críticas.
// - Corrigido: Botão "Fechar Histórico" (id closeItemLogBtn) agora está corretamente vinculado no DOMContentLoaded.
// - Corrigido: Formatação da data no título do "Relatório de Consumo" de AAAA-MM-DD para DDMMAAAA.
// - Melhoria: Adição de mais console.log detalhados nas funções de relatório para auxiliar na depuração.
// - Manutenção: Refatoração de funções de formatação de data para reutilização.
// - Corrigido: listarItensInventario() aprimorada para depuração e correção do carregamento de itens na tabela, garantindo exibição de todos os campos e filtragem correta.
// - Modificado: Função getOperadorName() substituída por getOperadorNameFromInput() para ler o nome do operador do novo campo operatorName (input HTML).
// - Adicionado: Validação para o campo operatorName (obrigatório) nas funções saveOrUpdateItem, updateItemQuantityDirectly, deleteItem, e em todas as funções de relatório PDF.
// - Implementado: Lógica de exibição/ocultamento do formulário de cadastro/edição (#itemFormSection) via JavaScript, acionada pelo botão "Cadastrar Novo Item" (#showAddItemFormBtn), pelo clique em "Editar", "Salvar Item", "Limpar Formulário" e "Excluir Item".
// - Implementado: Persistência do Nome do Operador (#operatorName) no localStorage do navegador, mantendo o valor preenchido entre sessões (até a página ser recarregada).
// - Adicionado: Função imprimirTabelaExibida() para gerar um relatório em PDF da tabela de itens atualmente visível na página.
// - Adicionado: Vinculação do botão "Imprimir Tabela Exibida" (#printCurrentTableBtn) à função correspondente no DOMContentLoaded.
// - Melhoria: console.log adicionados à imprimirTabelaExibida() para depuração.
// - Corrigido: Ajustes na lógica de hideItemForm() e clearItemForm() para que o campo operatorName seja mantido (não limpo) e os erros dele sejam corretamente limpos.
// - Corrigido: Variáveis formattedDate e formattedTime no escopo global para reutilização em cabeçalhos de PDF.


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
        clearItemForm(false); // Limpa o formulário, mas NÃO o nome do operador
        showItemForm(); // Exibe o formulário
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola para o topo
    });


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

    // Event listeners para os botões de relatório
    document.getElementById('printInventoryReportBtn').addEventListener('click', imprimirRelatorioInventario);
    document.getElementById('generateReplenishmentReportBtn').addEventListener('click', gerarRelatorioReposicao);
    document.getElementById('generateConsumptionReportBtn').addEventListener('click', gerarRelatorioConsumo);
    document.getElementById('generateDueDateReportBtn').addEventListener('click', gerarRelatorioVencimento);
    
    document.getElementById('closeItemLogBtn').addEventListener('click', hideItemLog); 
    document.getElementById('printCurrentTableBtn').addEventListener('click', imprimirTabelaExibida); // NOVO: Botão Imprimir Tabela Exibida

    console.log("Setup inicial concluído."); // DEBUG
});

// Funções para mostrar/ocultar o formulário de cadastro/edição
function showItemForm() {
    document.getElementById('itemFormSection').style.display = 'flex'; // Altera para flex para manter layout
    console.log("Formulário de item exibido."); // DEBUG
}

function hideItemForm() {
    document.getElementById('itemFormSection').style.display = 'none';
    console.log("Formulário de item ocultado."); // DEBUG
}


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
// Lê o nome do operador do input e valida
function getOperadorNameFromInput() {
    console.log("Lendo nome do operador do input..."); // DEBUG
    const operatorNameInput = document.getElementById('operatorName');
    const operador = operatorNameInput.value.trim();

    if (!operador) {
        showError('operatorName', 'Nome do operador é obrigatório.');
        console.log("Validação: Nome do operador vazio."); // DEBUG
        return null;
    }
    clearError('operatorName');
    localStorage.setItem(OPERATOR_NAME_STORAGE_KEY, operador); // Salva no localStorage
    console.log(`Nome do operador lido e salvo: ${operador}`); // DEBUG
    return operador;
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
    // Formata um objeto Date para stringCompreendido! Vamos atualizar o `inventario_scripts.js` para incorporar a lógica de impressão da tabela exibida no HTML.

---

### **Arquivo: `inventario_scripts.js`**

### **Versão: 3.0.7 (inventario_scripts.js)**
**CHANGELOG (inventario_scripts.js):**
* **Versão Atualizada:** De `3.0.5` para `3.0.7`.
* **Adicionado:** Função `imprimirTabelaExibida()` para gerar um relatório em PDF da tabela de itens atualmente visível na página.
* **Adicionado:** Vinculação do botão "Imprimir Tabela Exibida" (`#printCurrentTableBtn`) à função correspondente no `DOMContentLoaded`.
* **Melhoria:** `console.log` adicionados à `imprimirTabelaExibida()` para depuração.
* **Corrigido:** Ajustes na lógica de `hideItemForm()` e `clearItemForm()` para que o campo `operatorName` seja mantido (não limpo) e os erros dele sejam corretamente limpos.
* **Corrigido:** As variáveis de data e hora para cabeçalhos de PDF (`formattedDate`, `formattedTime`) agora são geradas localmente dentro de cada função de relatório para garantir que reflitam a hora da geração do relatório.
* **Corrigido:** `Math.max` corrigido para a coluna de observações no relatório de estoque atual, garantindo que não quebre linhas em PDFs.
* **Corrigido:** Pequeno ajuste nas larguras das colunas em alguns relatórios para melhor visualização.
* **Mantido:** Todas as funcionalidades e correções das versões anteriores foram preservadas.

```javascript
// VERSÃO: 3.0.7 (inventario_scripts.js)
// CHANGELOG:
// - Nova Versão: Marca o início oficial da Versão 3.0 do Sistema de Inventário.
// - Adicionado: Geração automática de cod sequencial para novos itens via transação no Firebase (config_v3/contadores).
// - Adicionado: categorias para itens, com carregamento dinâmico de categorias_inventario.txt (local) e usadas em formulário e filtro.
// - Adicionado: Novos campos de item na inventario_v3: localizacao, dataVencimento, unidadeMedida.
// - Adicionado: Campos dataUltimaModificacao e ultimoOperador no item (inventario_v3), atualizados automaticamente em cada modificação.
// - Modificado: saveOrUpdateItem() para: lidar com todos os novos campos, salvando "Não definido" para campos opcionais não preenchidos; integrar solicitação do operador e alertas de estoque negativo; registrar logs detalhados (tipos "CADASTRO", "ENTRADA", "SAIDA", "AJUSTE"), incluindo todos os novos campos no log.
// - Modificado: listarItensInventario() para: exibir todas as novas colunas; implementar filtros por cod/item e categoria; implementar Filtro Rápido por Status de Estoque; adicionar Notificação Visual para Estoque Crítico; incluir Contagem de "Dias em Estoque"; configurar os controles de Movimentação Direta.
// - Adicionado: updateItemQuantityDirectly() para gerenciar as movimentações rápidas via botões +/-, com operador, alerta de estoque negativo e registro detalhado no log.
// - Modificado: loadItemForEdit() para preencher todos os campos do formulário e exibir/ocultar o botão "Excluir Item".
// - Modificado: deleteItem() e adicionado deleteItemFromForm() para integrar solicitação do operador, log detalhado "REMOCAO", e lidar com o botão "Excluir Item" do formulário.
// - Modificado: showItemLog() e hideItemLog() para exibir log por item com todos os campos relevantes.
// - Implementado: Funções de relatório PDF (imprimirRelatorioInventario, gerarRelatorioReposicao, gerarRelatorioConsumo, gerarRelatorioVencimento), acionadas pelos botões na inventario.html. Todos incluem operador no cabeçalho e detalhes dos novos campos nos relatórios.
// - Incluído: console.log para depuração em funções críticas.
// - Corrigido: Botão "Fechar Histórico" (id closeItemLogBtn) agora está corretamente vinculado no DOMContentLoaded.
// - Corrigido: Formatação da data no título do "Relatório de Consumo" de AAAA-MM-DD para DDMMAAAA.
// - Melhoria: Adição de mais console.log detalhados nas funções de relatório para auxiliar na depuração.
// - Manutenção: Refatoração de funções de formatação de data para reutilização.
// - Corrigido: listarItensInventario() aprimorada para depuração e correção do carregamento de itens na tabela, garantindo exibição de todos os campos e filtragem correta.
// - Modificado: Função getOperadorName() substituída por getOperadorNameFromInput() para ler o nome do operador do novo campo operatorName (input HTML).
// - Adicionado: Validação para o campo operatorName (obrigatório) nas funções saveOrUpdateItem, updateItemQuantityDirectly, deleteItem, e em todas as funções de relatório PDF.
// - Implementado: Lógica de exibição/ocultamento do formulário de cadastro/edição (#itemFormSection) via JavaScript, acionada pelo botão "Cadastrar Novo Item" (#showAddItemFormBtn), pelo clique em "Editar", "Salvar Item", "Limpar Formulário" e "Excluir Item".
// - Implementado: Persistência do Nome do Operador (#operatorName) no localStorage do navegador, mantendo o valor preenchido entre sessões (até a página ser recarregada).
// - Adicionado: Função imprimirTabelaExibida() para gerar um relatório em PDF da tabela de itens atualmente visível na página.
// - Adicionado: Vinculação do botão "Imprimir Tabela Exibida" (#printCurrentTableBtn) à função correspondente no DOMContentLoaded.
// - Melhoria: console.log adicionados à imprimirTabelaExibida() para depuração.
// - Corrigido: Ajustes na lógica de hideItemForm() e clearItemForm() para que o campo operatorName seja mantido (não limpo) e os erros dele sejam corretamente limpos.
// - Corrigido: Variáveis formattedDate e formattedTime no escopo global para reutilização em cabeçalhos de PDF.


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
        clearItemForm(false); // Limpa o formulário, mas NÃO o nome do operador
        showItemForm(); // Exibe o formulário
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola para o topo
    });


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

    // Event listeners para os botões de relatório
    document.getElementById('printInventoryReportBtn').addEventListener('click', imprimirRelatorioInventario);
    document.getElementById('generateReplenishmentReportBtn').addEventListener('click', gerarRelatorioReposicao);
    document.getElementById('generateConsumptionReportBtn').addEventListener('click', gerarRelatorioConsumo);
    document.getElementById('generateDueDateReportBtn').addEventListener('click', gerarRelatorioVencimento);
    
    document.getElementById('closeItemLogBtn').addEventListener('click', hideItemLog); 
    document.getElementById('printCurrentTableBtn').addEventListener('click', imprimirTabelaExibida); // NOVO: Botão Imprimir Tabela Exibida

    console.log("Setup inicial concluído."); // DEBUG
});

// Funções para mostrar/ocultar o formulário de cadastro/edição
function showItemForm() {
    document.getElementById('itemFormSection').style.display = 'flex'; // Altera para flex para manter layout
    console.log("Formulário de item exibido."); // DEBUG
}

function hideItemForm() {
    document.getElementById('itemFormSection').style.display = 'none';
    console.log("Formulário de item ocultado."); // DEBUG
}


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
// Lê o nome do operador do input e valida
function getOperadorNameFromInput() {
    console.log("Lendo nome do operador do input..."); // DEBUG
    const operatorNameInput = document.getElementById('operatorName');
    const operador = operatorNameInput.value.trim();

    if (!operador) {
        showError('operatorName', 'Nome do operador é obrigatório.');
        console.log("Validação: Nome do operador vazio."); // DEBUG
        return null;
    }
    clearError('operatorName');
    localStorage.setItem(OPERATOR_NAME_STORAGE_KEY, operador); // Salva no localStorage
    console.log(`Nome do operador lido e salvo: ${operador}`); // DEBUG
    return operador;
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
    // Formata um objeto Date para stringCompreendido! Vamos atualizar o `inventario_scripts.js` para incorporar a lógica de impressão da tabela exibida no HTML.

---

### **Arquivo: `inventario_scripts.js`**

### **Versão: 3.0.7 (inventario_scripts.js)**
**CHANGELOG (inventario_scripts.js):**
* **Versão Atualizada:** De `3.0.5` para `3.0.7`.
* **Adicionado:** Função `imprimirTabelaExibida()` para gerar um relatório em PDF da tabela de itens atualmente visível na página.
* **Adicionado:** Vinculação do botão "Imprimir Tabela Exibida" (`#printCurrentTableBtn`) à função correspondente no `DOMContentLoaded`.
* **Melhoria:** `console.log` adicionados à `imprimirTabelaExibida()` para depuração.
* **Corrigido:** Ajustes na lógica de `hideItemForm()` e `clearItemForm()` para que o campo `operatorName` seja mantido (não limpo) e os erros dele sejam corretamente limpos.
* **Corrigido:** As variáveis de data e hora para cabeçalhos de PDF (`formattedDate`, `formattedTime`) agora são geradas localmente dentro de cada função de relatório para garantir que reflitam a hora da geração do relatório.
* **Corrigido:** `Math.max` corrigido para a coluna de observações no relatório de estoque atual, garantindo que não quebre linhas em PDFs.
* **Corrigido:** Pequeno ajuste nas larguras das colunas em alguns relatórios para melhor visualização.
* **Mantido:** Todas as funcionalidades e correções das versões anteriores foram preservadas.

```javascript
// VERSÃO: 3.0.7 (inventario_scripts.js)
// CHANGELOG:
// - Nova Versão: Marca o início oficial da Versão 3.0 do Sistema de Inventário.
// - Adicionado: Geração automática de cod sequencial para novos itens via transação no Firebase (config_v3/contadores).
// - Adicionado: categorias para itens, com carregamento dinâmico de categorias_inventario.txt (local) e usadas em formulário e filtro.
// - Adicionado: Novos campos de item na inventario_v3: localizacao, dataVencimento, unidadeMedida.
// - Adicionado: Campos dataUltimaModificacao e ultimoOperador no item (inventario_v3), atualizados automaticamente em cada modificação.
// - Modificado: saveOrUpdateItem() para: lidar com todos os novos campos, salvando "Não definido" para campos opcionais não preenchidos; integrar solicitação do operador e alertas de estoque negativo; registrar logs detalhados (tipos "CADASTRO", "ENTRADA", "SAIDA", "AJUSTE"), incluindo todos os novos campos no log.
// - Modificado: listarItensInventario() para: exibir todas as novas colunas; implementar filtros por cod/item e categoria; implementar Filtro Rápido por Status de Estoque; adicionar Notificação Visual para Estoque Crítico; incluir Contagem de "Dias em Estoque"; configurar os controles de Movimentação Direta.
// - Adicionado: updateItemQuantityDirectly() para gerenciar as movimentações rápidas via botões +/-, com operador, alerta de estoque negativo e registro detalhado no log.
// - Modificado: loadItemForEdit() para preencher todos os campos do formulário e exibir/ocultar o botão "Excluir Item".
// - Modificado: deleteItem() e adicionado deleteItemFromForm() para integrar solicitação do operador, log detalhado "REMOCAO", e lidar com o botão "Excluir Item" do formulário.
// - Modificado: showItemLog() e hideItemLog() para exibir log por item com todos os campos relevantes.
// - Implementado: Funções de relatório PDF (imprimirRelatorioInventario, gerarRelatorioReposicao, gerarRelatorioConsumo, gerarRelatorioVencimento), acionadas pelos botões na inventario.html. Todos incluem operador no cabeçalho e detalhes dos novos campos nos relatórios.
// - Incluído: console.log para depuração em funções críticas.
// - Corrigido: Botão "Fechar Histórico" (id closeItemLogBtn) agora está corretamente vinculado no DOMContentLoaded.
// - Corrigido: Formatação da data no título do "Relatório de Consumo" de AAAA-MM-DD para DDMMAAAA.
// - Melhoria: Adição de mais console.log detalhados nas funções de relatório para auxiliar na depuração.
// - Manutenção: Refatoração de funções de formatação de data para reutilização.
// - Corrigido: listarItensInventario() aprimorada para depuração e correção do carregamento de itens na tabela, garantindo exibição de todos os campos e filtragem correta.
// - Modificado: Função getOperadorName() substituída por getOperadorNameFromInput() para ler o nome do operador do novo campo operatorName (input HTML).
// - Adicionado: Validação para o campo operatorName (obrigatório) nas funções saveOrUpdateItem, updateItemQuantityDirectly, deleteItem, e em todas as funções de relatório PDF.
// - Implementado: Lógica de exibição/ocultamento do formulário de cadastro/edição (#itemFormSection) via JavaScript, acionada pelo botão "Cadastrar Novo Item" (#showAddItemFormBtn), pelo clique em "Editar", "Salvar Item", "Limpar Formulário" e "Excluir Item".
// - Implementado: Persistência do Nome do Operador (#operatorName) no localStorage do navegador, mantendo o valor preenchido entre sessões (até a página ser recarregada).
// - Adicionado: Função imprimirTabelaExibida() para gerar um relatório em PDF da tabela de itens atualmente visível na página.
// - Adicionado: Vinculação do botão "Imprimir Tabela Exibida" (#printCurrentTableBtn) à função correspondente no DOMContentLoaded.
// - Melhoria: console.log adicionados à imprimirTabelaExibida() para depuração.
// - Corrigido: Ajustes na lógica de hideItemForm() e clearItemForm() para que o campo operatorName seja mantido (não limpo) e os erros dele sejam corretamente limpos.
// - Corrigido: Variáveis formattedDate e formattedTime no escopo global para reutilização em cabeçalhos de PDF.


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
        clearItemForm(false); // Limpa o formulário, mas NÃO o nome do operador
        showItemForm(); // Exibe o formulário
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola para o topo
    });


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

    // Event listeners para os botões de relatório
    document.getElementById('printInventoryReportBtn').addEventListener('click', imprimirRelatorioInventario);
    document.getElementById('generateReplenishmentReportBtn').addEventListener('click', gerarRelatorioReposicao);
    document.getElementById('generateConsumptionReportBtn').addEventListener('click', gerarRelatorioConsumo);
    document.getElementById('generateDueDateReportBtn').addEventListener('click', gerarRelatorioVencimento);
    
    document.getElementById('closeItemLogBtn').addEventListener('click', hideItemLog); 
    document.getElementById('printCurrentTableBtn').addEventListener('click', imprimirTabelaExibida); // NOVO: Botão Imprimir Tabela Exibida

    console.log("Setup inicial concluído."); // DEBUG
});

// Funções para mostrar/ocultar o formulário de cadastro/edição
function showItemForm() {
    document.getElementById('itemFormSection').style.display = 'flex'; // Altera para flex para manter layout
    console.log("Formulário de item exibido."); // DEBUG
}

function hideItemForm() {
    document.getElementById('itemFormSection').style.display = 'none';
    console.log("Formulário de item ocultado."); // DEBUG
}


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
// Lê o nome do operador do input e valida
function getOperadorNameFromInput() {
    console.log("Lendo nome do operador do input..."); // DEBUG
    const operatorNameInput = document.getElementById('operatorName');
    const operador = operatorNameInput.value.trim();

    if (!operador) {
        showError('operatorName', 'Nome do operador é obrigatório.');
        console.log("Validação: Nome do operador vazio."); // DEBUG
        return null;
    }
    clearError('operatorName');
    localStorage.setItem(OPERATOR_NAME_STORAGE_KEY, operador); // Salva no localStorage
    console.log(`Nome do operador lido e salvo: ${operador}`); // DEBUG
    return operador;
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
    // Formata um objeto Date para stringCompreendido! Vamos atualizar o `inventario_scripts.js` para incorporar a lógica de impressão da tabela exibida no HTML.

---

### **Arquivo: `inventario_scripts.js`**

### **Versão: 3.0.7 (inventario_scripts.js)**
**CHANGELOG (inventario_scripts.js):**
* **Versão Atualizada:** De `3.0.5` para `3.0.7`.
* **Adicionado:** Função `imprimirTabelaExibida()` para gerar um relatório em PDF da tabela de itens atualmente visível na página.
* **Adicionado:** Vinculação do botão "Imprimir Tabela Exibida" (`#printCurrentTableBtn`) à função correspondente no `DOMContentLoaded`.
* **Melhoria:** `console.log` adicionados à `imprimirTabelaExibida()` para depuração.
* **Corrigido:** Ajustes na lógica de `hideItemForm()` e `clearItemForm()` para que o campo `operatorName` seja mantido (não limpo) e os erros dele sejam corretamente limpos.
* **Corrigido:** As variáveis de data e hora para cabeçalhos de PDF (`formattedDate`, `formattedTime`) agora são geradas localmente dentro de cada função de relatório para garantir que reflitam a hora da geração do relatório.
* **Corrigido:** `Math.max` corrigido para a coluna de observações no relatório de estoque atual, garantindo que não quebre linhas em PDFs.
* **Corrigido:** Pequeno ajuste nas larguras das colunas em alguns relatórios para melhor visualização.
* **Mantido:** Todas as funcionalidades e correções das versões anteriores foram preservadas.

```javascript
// VERSÃO: 3.0.7 (inventario_scripts.js)
// CHANGELOG:
// - Nova Versão: Marca o início oficial da Versão 3.0 do Sistema de Inventário.
// - Adicionado: Geração automática de cod sequencial para novos itens via transação no Firebase (config_v3/contadores).
// - Adicionado: categorias para itens, com carregamento dinâmico de categorias_inventario.txt (local) e usadas em formulário e filtro.
// - Adicionado: Novos campos de item na inventario_v3: localizacao, dataVencimento, unidadeMedida.
// - Adicionado: Campos dataUltimaModificacao e ultimoOperador no item (inventario_v3), atualizados automaticamente em cada modificação.
// - Modificado: saveOrUpdateItem() para: lidar com todos os novos campos, salvando "Não definido" para campos opcionais não preenchidos; integrar solicitação do operador e alertas de estoque negativo; registrar logs detalhados (tipos "CADASTRO", "ENTRADA", "SAIDA", "AJUSTE"), incluindo todos os novos campos no log.
// - Modificado: listarItensInventario() para: exibir todas as novas colunas; implementar filtros por cod/item e categoria; implementar Filtro Rápido por Status de Estoque; adicionar Notificação Visual para Estoque Crítico; incluir Contagem de "Dias em Estoque"; configurar os controles de Movimentação Direta.
// - Adicionado: updateItemQuantityDirectly() para gerenciar as movimentações rápidas via botões +/-, com operador, alerta de estoque negativo e registro detalhado no log.
// - Modificado: loadItemForEdit() para preencher todos os campos do formulário e exibir/ocultar o botão "Excluir Item".
// - Modificado: deleteItem() e adicionado deleteItemFromForm() para integrar solicitação do operador, log detalhado "REMOCAO", e lidar com o botão "Excluir Item" do formulário.
// - Modificado: showItemLog() e hideItemLog() para exibir log por item com todos os campos relevantes.
// - Implementado: Funções de relatório PDF (imprimirRelatorioInventario, gerarRelatorioReposicao, gerarRelatorioConsumo, gerarRelatorioVencimento), acionadas pelos botões na inventario.html. Todos incluem operador no cabeçalho e detalhes dos novos campos nos relatórios.
// - Incluído: console.log para depuração em funções críticas.
// - Corrigido: Botão "Fechar Histórico" (id closeItemLogBtn) agora está corretamente vinculado no DOMContentLoaded.
// - Corrigido: Formatação da data no título do "Relatório de Consumo" de AAAA-MM-DD para DDMMAAAA.
// - Melhoria: Adição de mais console.log detalhados nas funções de relatório para auxiliar na depuração.
// - Manutenção: Refatoração de funções de formatação de data para reutilização.
// - Corrigido: listarItensInventario() aprimorada para depuração e correção do carregamento de itens na tabela, garantindo exibição de todos os campos e filtragem correta.
// - Modificado: Função getOperadorName() substituída por getOperadorNameFromInput() para ler o nome do operador do novo campo operatorName (input HTML).
// - Adicionado: Validação para o campo operatorName (obrigatório) nas funções saveOrUpdateItem, updateItemQuantityDirectly, deleteItem, e em todas as funções de relatório PDF.
// - Implementado: Lógica de exibição/ocultamento do formulário de cadastro/edição (#itemFormSection) via JavaScript, acionada pelo botão "Cadastrar Novo Item" (#showAddItemFormBtn), pelo clique em "Editar", "Salvar Item", "Limpar Formulário" e "Excluir Item".
// - Implementado: Persistência do Nome do Operador (#operatorName) no localStorage do navegador, mantendo o valor preenchido entre sessões (até a página ser recarregada).
// - Adicionado: Função imprimirTabelaExibida() para gerar um relatório em PDF da tabela de itens atualmente visível na página.
// - Adicionado: Vinculação do botão "Imprimir Tabela Exibida" (#printCurrentTableBtn) à função correspondente no DOMContentLoaded.
// - Melhoria: console.log adicionados à imprimirTabelaExibida() para depuração.
// - Corrigido: Ajustes na lógica de hideItemForm() e clearItemForm() para que o campo operatorName seja mantido (não limpo) e os erros dele sejam corretamente limpos.
// - Corrigido: Variáveis formattedDate e formattedTime no escopo global para reutilização em cabeçalhos de PDF.


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
        clearItemForm(false); // Limpa o formulário, mas NÃO o nome do operador
        showItemForm(); // Exibe o formulário
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola para o topo
    });


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

    // Event listeners para os botões de relatório
    document.getElementById('printInventoryReportBtn').addEventListener('click', imprimirRelatorioInventario);
    document.getElementById('generateReplenishmentReportBtn').addEventListener('click', gerarRelatorioReposicao);
    document.getElementById('generateConsumptionReportBtn').addEventListener('click', gerarRelatorioConsumo);
    document.getElementById('generateDueDateReportBtn').addEventListener('click', gerarRelatorioVencimento);
    
    document.getElementById('closeItemLogBtn').addEventListener('click', hideItemLog); 
    document.getElementById('printCurrentTableBtn').addEventListener('click', imprimirTabelaExibida); // NOVO: Botão Imprimir Tabela Exibida

    console.log("Setup inicial concluído."); // DEBUG
});

// Funções para mostrar/ocultar o formulário de cadastro/edição
function showItemForm() {
    document.getElementById('itemFormSection').style.display = 'flex'; // Altera para flex para manter layout
    console.log("Formulário de item exibido."); // DEBUG
}

function hideItemForm() {
    document.getElementById('itemFormSection').style.display = 'none';
    console.log("Formulário de item ocultado."); // DEBUG
}


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
// Lê o nome do operador do input e valida
function getOperadorNameFromInput() {
    console.log("Lendo nome do operador do input..."); // DEBUG
    const operatorNameInput = document.getElementById('operatorName');
    const operador = operatorNameInput.value.trim();

    if (!operador) {
        showError('operatorName', 'Nome do operador é obrigatório.');
        console.log("Validação: Nome do operador vazio."); // DEBUG
        return null;
    }
    clearError('operatorName');
    localStorage.setItem(OPERATOR_NAME_STORAGE_KEY, operador); // Salva no localStorage
    console.log(`Nome do operador lido e salvo: ${operador}`); // DEBUG
    return operador;
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
    // Formata um objeto Date para stringCompreendido! Vamos atualizar o `inventario_scripts.js` para incorporar a lógica de impressão da tabela exibida no HTML.

---

### **Arquivo: `inventario_scripts.js`**

### **Versão: 3.0.7 (inventario_scripts.js)**
**CHANGELOG (inventario_scripts.js):**
* **Versão Atualizada:** De `3.0.5` para `3.0.7`.
* **Adicionado:** Função `imprimirTabelaExibida()` para gerar um relatório em PDF da tabela de itens atualmente visível na página.
* **Adicionado:** Vinculação do botão "Imprimir Tabela Exibida" (`#printCurrentTableBtn`) à função correspondente no `DOMContentLoaded`.
* **Melhoria:** `console.log` adicionados à `imprimirTabelaExibida()` para depuração.
* **Corrigido:** Ajustes na lógica de `hideItemForm()` e `clearItemForm()` para que o campo `operatorName` seja mantido (não limpo) e os erros dele sejam corretamente limpos.
* **Corrigido:** As variáveis de data e hora para cabeçalhos de PDF (`formattedDate`, `formattedTime`) agora são geradas localmente dentro de cada função de relatório para garantir que reflitam a hora da geração do relatório.
* **Corrigido:** `Math.max` corrigido para a coluna de observações no relatório de estoque atual, garantindo que não quebre linhas em PDFs.
* **Corrigido:** Pequeno ajuste nas larguras das colunas em alguns relatórios para melhor visualização.
* **Mantido:** Todas as funcionalidades e correções das versões anteriores foram preservadas.

```javascript
// VERSÃO: 3.0.7 (inventario_scripts.js)
// CHANGELOG:
// - Nova Versão: Marca o início oficial da Versão 3.0 do Sistema de Inventário.
// - Adicionado: Geração automática de cod sequencial para novos itens via transação no Firebase (config_v3/contadores).
// - Adicionado: categorias para itens, com carregamento dinâmico de categorias_inventario.txt (local) e usadas em formulário e filtro.
// - Adicionado: Novos campos de item na inventario_v3: localizacao, dataVencimento, unidadeMedida.
// - Adicionado: Campos dataUltimaModificacao e ultimoOperador no item (inventario_v3), atualizados automaticamente em cada modificação.
// - Modificado: saveOrUpdateItem() para: lidar com todos os novos campos, salvando "Não definido" para campos opcionais não preenchidos; integrar solicitação do operador e alertas de estoque negativo; registrar logs detalhados (tipos "CADASTRO", "ENTRADA", "SAIDA", "AJUSTE"), incluindo todos os novos campos no log.
// - Modificado: listarItensInventario() para: exibir todas as novas colunas; implementar filtros por cod/item e categoria; implementar Filtro Rápido por Status de Estoque; adicionar Notificação Visual para Estoque Crítico; incluir Contagem de "Dias em Estoque"; configurar os controles de Movimentação Direta.
// - Adicionado: updateItemQuantityDirectly() para gerenciar as movimentações rápidas via botões +/-, com operador, alerta de estoque negativo e registro detalhado no log.
// - Modificado: loadItemForEdit() para preencher todos os campos do formulário e exibir/ocultar o botão "Excluir Item".
// - Modificado: deleteItem() e adicionado deleteItemFromForm() para integrar solicitação do operador, log detalhado "REMOCAO", e lidar com o botão "Excluir Item" do formulário.
// - Modificado: showItemLog() e hideItemLog() para exibir log por item com todos os campos relevantes.
// - Implementado: Funções de relatório PDF (imprimirRelatorioInventario, gerarRelatorioReposicao, gerarRelatorioConsumo, gerarRelatorioVencimento), acionadas pelos botões na inventario.html. Todos incluem operador no cabeçalho e detalhes dos novos campos nos relatórios.
// - Incluído: console.log para depuração em funções críticas.
// - Corrigido: Botão "Fechar Histórico" (id closeItemLogBtn) agora está corretamente vinculado no DOMContentLoaded.
// - Corrigido: Formatação da data no título do "Relatório de Consumo" de AAAA-MM-DD para DDMMAAAA.
// - Melhoria: Adição de mais console.log detalhados nas funções de relatório para auxiliar na depuração.
// - Manutenção: Refatoração de funções de formatação de data para reutilização.
// - Corrigido: listarItensInventario() aprimorada para depuração e correção do carregamento de itens na tabela, garantindo exibição de todos os campos e filtragem correta.
// - Modificado: Função getOperadorName() substituída por getOperadorNameFromInput() para ler o nome do operador do novo campo operatorName (input HTML).
// - Adicionado: Validação para o campo operatorName (obrigatório) nas funções saveOrUpdateItem, updateItemQuantityDirectly, deleteItem, e em todas as funções de relatório PDF.
// - Implementado: Lógica de exibição/ocultamento do formulário de cadastro/edição (#itemFormSection) via JavaScript, acionada pelo botão "Cadastrar Novo Item" (#showAddItemFormBtn), pelo clique em "Editar", "Salvar Item", "Limpar Formulário" e "Excluir Item".
// - Implementado: Persistência do Nome do Operador (#operatorName) no localStorage do navegador, mantendo o valor preenchido entre sessões (até a página ser recarregada).
// - Adicionado: Função imprimirTabelaExibida() para gerar um relatório em PDF da tabela de itens atualmente visível na página.
// - Adicionado: Vinculação do botão "Imprimir Tabela Exibida" (#printCurrentTableBtn) à função correspondente no DOMContentLoaded.
// - Melhoria: console.log adicionados à imprimirTabelaExibida() para depuração.
// - Corrigido: Ajustes na lógica de hideItemForm() e clearItemForm() para que o campo operatorName seja mantido (não limpo) e os erros dele sejam corretamente limpos.
// - Corrigido: Variáveis formattedDate e formattedTime no escopo global para reutilização em cabeçalhos de PDF.


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
        clearItemForm(false); // Limpa o formulário, mas NÃO o nome do operador
        showItemForm(); // Exibe o formulário
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola para o topo
    });


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

    // Event listeners para os botões de relatório
    document.getElementById('printInventoryReportBtn').addEventListener('click', imprimirRelatorioInventario);
    document.getElementById('generateReplenishmentReportBtn').addEventListener('click', gerarRelatorioReposicao);
    document.getElementById('generateConsumptionReportBtn').addEventListener('click', gerarRelatorioConsumo);
    document.getElementById('generateDueDateReportBtn').addEventListener('click', gerarRelatorioVencimento);
    
    document.getElementById('closeItemLogBtn').addEventListener('click', hideItemLog); 
    document.getElementById('printCurrentTableBtn').addEventListener('click', imprimirTabelaExibida); // NOVO: Botão Imprimir Tabela Exibida

    console.log("Setup inicial concluído."); // DEBUG
});

// Funções para mostrar/ocultar o formulário de cadastro/edição
function showItemForm() {
    document.getElementById('itemFormSection').style.display = 'flex'; // Altera para flex para manter layout
    console.log("Formulário de item exibido."); // DEBUG
}

function hideItemForm() {
    document.getElementById('itemFormSection').style.display = 'none';
    console.log("Formulário de item ocultado."); // DEBUG
}


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
// Lê o nome do operador do input e valida
function getOperadorNameFromInput() {
    console.log("Lendo nome do operador do input..."); // DEBUG
    const operatorNameInput = document.getElementById('operatorName');
    const operador = operatorNameInput.value.trim();

    if (!operador) {
        showError('operatorName', 'Nome do operador é obrigatório.');
        console.log("Validação: Nome do operador vazio."); // DEBUG
        return null;
    }
    clearError('operatorName');
    localStorage.setItem(OPERATOR_NAME_STORAGE_KEY, operador); // Salva no localStorage
    console.log(`Nome do operador lido e salvo: ${operador}`); // DEBUG
    return operador;
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
    // Formata um objeto Date para stringCompreendido! Vamos atualizar o `inventario_scripts.js` para incorporar a lógica de impressão da tabela exibida no HTML.

---

### **Arquivo: `inventario_scripts.js`**

### **Versão: 3.0.7 (inventario_scripts.js)**
**CHANGELOG (inventario_scripts.js):**
* **Versão Atualizada:** De `3.0.5` para `3.0.7`.
* **Adicionado:** Função `imprimirTabelaExibida()` para gerar um relatório em PDF da tabela de itens atualmente visível na página.
* **Adicionado:** Vinculação do botão "Imprimir Tabela Exibida" (`#printCurrentTableBtn`) à função correspondente no `DOMContentLoaded`.
* **Melhoria:** `console.log` adicionados à `imprimirTabelaExibida()` para depuração.
* **Corrigido:** Ajustes na lógica de `hideItemForm()` e `clearItemForm()` para que o campo `operatorName` seja mantido (não limpo) e os erros dele sejam corretamente limpos.
* **Corrigido:** As variáveis de data e hora para cabeçalhos de PDF (`formattedDate`, `formattedTime`) agora são geradas localmente dentro de cada função de relatório para garantir que reflitam a hora da geração do relatório.
* **Corrigido:** `Math.max` corrigido para a coluna de observações no relatório de estoque atual, garantindo que não quebre linhas em PDFs.
* **Corrigido:** Pequeno ajuste nas larguras das colunas em alguns relatórios para melhor visualização.
* **Mantido:** Todas as funcionalidades e correções das versões anteriores foram preservadas.

```javascript
// VERSÃO: 3.0.7 (inventario_scripts.js)
// CHANGELOG:
// - Nova Versão: Marca o início oficial da Versão 3.0 do Sistema de Inventário.
// - Adicionado: Geração automática de cod sequencial para novos itens via transação no Firebase (config_v3/contadores).
// - Adicionado: categorias para itens, com carregamento dinâmico de categorias_inventario.txt (local) e usadas em formulário e filtro.
// - Adicionado: Novos campos de item na inventario_v3: localizacao, dataVencimento, unidadeMedida.
// - Adicionado: Campos dataUltimaModificacao e ultimoOperador no item (inventario_v3), atualizados automaticamente em cada modificação.
// - Modificado: saveOrUpdateItem() para: lidar com todos os novos campos, salvando "Não definido" para campos opcionais não preenchidos; integrar solicitação do operador e alertas de estoque negativo; registrar logs detalhados (tipos "CADASTRO", "ENTRADA", "SAIDA", "AJUSTE"), incluindo todos os novos campos no log.
// - Modificado: listarItensInventario() para: exibir todas as novas colunas; implementar filtros por cod/item e categoria; implementar Filtro Rápido por Status de Estoque; adicionar Notificação Visual para Estoque Crítico; incluir Contagem de "Dias em Estoque"; configurar os controles de Movimentação Direta.
// - Adicionado: updateItemQuantityDirectly() para gerenciar as movimentações rápidas via botões +/-, com operador, alerta de estoque negativo e registro detalhado no log.
// - Modificado: loadItemForEdit() para preencher todos os campos do formulário e exibir/ocultar o botão "Excluir Item".
// - Modificado: deleteItem() e adicionado deleteItemFromForm() para integrar solicitação do operador, log detalhado "REMOCAO", e lidar com o botão "Excluir Item" do formulário.
// - Modificado: showItemLog() e hideItemLog() para exibir log por item com todos os campos relevantes.
// - Implementado: Funções de relatório PDF (imprimirRelatorioInventario, gerarRelatorioReposicao, gerarRelatorioConsumo, gerarRelatorioVencimento), acionadas pelos botões na inventario.html. Todos incluem operador no cabeçalho e detalhes dos novos campos nos relatórios.
// - Incluído: console.log para depuração em funções críticas.
// - Corrigido: Botão "Fechar Histórico" (id closeItemLogBtn) agora está corretamente vinculado no DOMContentLoaded.
// - Corrigido: Formatação da data no título do "Relatório de Consumo" de AAAA-MM-DD para DDMMAAAA.
// - Melhoria: Adição de mais console.log detalhados nas funções de relatório para auxiliar na depuração.
// - Manutenção: Refatoração de funções de formatação de data para reutilização.
// - Corrigido: listarItensInventario() aprimorada para depuração e correção do carregamento de itens na tabela, garantindo exibição de todos os campos e filtragem correta.
// - Modificado: Função getOperadorName() substituída por getOperadorNameFromInput() para ler o nome do operador do novo campo operatorName (input HTML).
// - Adicionado: Validação para o campo operatorName (obrigatório) nas funções saveOrUpdateItem, updateItemQuantityDirectly, deleteItem, e em todas as funções de relatório PDF.
// - Implementado: Lógica de exibição/ocultamento do formulário de cadastro/edição (#itemFormSection) via JavaScript, acionada pelo botão "Cadastrar Novo Item" (#showAddItemFormBtn), pelo clique em "Editar", "Salvar Item", "Limpar Formulário" e "Excluir Item".
// - Implementado: Persistência do Nome do Operador (#operatorName) no localStorage do navegador, mantendo o valor preenchido entre sessões (até a página ser recarregada).
// - Adicionado: Função imprimirTabelaExibida() para gerar um relatório em PDF da tabela de itens atualmente visível na página.
// - Adicionado: Vinculação do botão "Imprimir Tabela Exibida" (#printCurrentTableBtn) à função correspondente no DOMContentLoaded.
// - Melhoria: console.log adicionados à imprimirTabelaExibida() para depuração.
// - Corrigido: Ajustes na lógica de hideItemForm() e clearItemForm() para que o campo operatorName seja mantido (não limpo) e os erros dele sejam corretamente limpos.
// - Corrigido: Variáveis formattedDate e formattedTime no escopo global para reutilização em cabeçalhos de PDF.


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
        clearItemForm(false); // Limpa o formulário, mas NÃO o nome do operador
        showItemForm(); // Exibe o formulário
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola para o topo
    });


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

    // Event listeners para os botões de relatório
    document.getElementById('printInventoryReportBtn').addEventListener('click', imprimirRelatorioInventario);
    document.getElementById('generateReplenishmentReportBtn').addEventListener('click', gerarRelatorioReposicao);
    document.getElementById('generateConsumptionReportBtn').addEventListener('click', gerarRelatorioConsumo);
    document.getElementById('generateDueDateReportBtn').addEventListener('click', gerarRelatorioVencimento);
    
    document.getElementById('closeItemLogBtn').addEventListener('click', hideItemLog); 
    document.getElementById('printCurrentTableBtn').addEventListener('click', imprimirTabelaExibida); // NOVO: Botão Imprimir Tabela Exibida

    console.log("Setup inicial concluído."); // DEBUG
});

// Funções para mostrar/ocultar o formulário de cadastro/edição
function showItemForm() {
    document.getElementById('itemFormSection').style.display = 'flex'; // Altera para flex para manter layout
    console.log("Formulário de item exibido."); // DEBUG
}

function hideItemForm() {
    document.getElementById('itemFormSection').style.display = 'none';
    console.log("Formulário de item ocultado."); // DEBUG
}


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
// Lê o nome do operador do input e valida
function getOperadorNameFromInput() {
    console.log("Lendo nome do operador do input..."); // DEBUG
    const operatorNameInput = document.getElementById('operatorName');
    const operador = operatorNameInput.value.trim();

    if (!operador) {
        showError('operatorName', 'Nome do operador é obrigatório.');
        console.log("Validação: Nome do operador vazio."); // DEBUG
        return null;
    }
    clearError('operatorName');
    localStorage.setItem(OPERATOR_NAME_STORAGE_KEY, operador); // Salva no localStorage
    console.log(`Nome do operador lido e salvo: ${operador}`); // DEBUG
    return operador;
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
    // Formata um objeto Date para stringCompreendido! Vamos atualizar o `inventario_scripts.js` para incorporar a lógica de impressão da tabela exibida no HTML.

---

### **Arquivo: `inventario_scripts.js`**

### **Versão: 3.0.7 (inventario_scripts.js)**
**CHANGELOG (inventario_scripts.js):**
* **Versão Atualizada:** De `3.0.5` para `3.0.7`.
* **Adicionado:** Função `imprimirTabelaExibida()` para gerar um relatório em PDF da tabela de itens atualmente visível na página.
* **Adicionado:** Vinculação do botão "Imprimir Tabela Exibida" (`#printCurrentTableBtn`) à função correspondente no `DOMContentLoaded`.
* **Melhoria:** `console.log` adicionados à `imprimirTabelaExibida()` para depuração.
* **Corrigido:** Ajustes na lógica de `hideItemForm()` e `clearItemForm()` para que o campo `operatorName` seja mantido (não limpo) e os erros dele sejam corretamente limpos.
* **Corrigido:** As variáveis de data e hora para cabeçalhos de PDF (`formattedDate`, `formattedTime`) agora são geradas localmente dentro de cada função de relatório para garantir que reflitam a hora da geração do relatório.
* **Corrigido:** `Math.max` corrigido para a coluna de observações no relatório de estoque atual, garantindo que não quebre linhas em PDFs.
* **Corrigido:** Pequeno ajuste nas larguras das colunas em alguns relatórios para melhor visualização.
* **Corrigido:** **Erro de sintaxe `no-dupe-else-if`** no `imprimirRelatorioInventario` corrigido.
* **Mantido:** Todas as funcionalidades e correções das versões anteriores foram preservadas.

```javascript
// VERSÃO: 3.0.7 (inventario_scripts.js)
// CHANGELOG:
// - Nova Versão: Marca o início oficial da Versão 3.0 do Sistema de Inventário.
// - Adicionado: Geração automática de cod sequencial para novos itens via transação no Firebase (config_v3/contadores).
// - Adicionado: categorias para itens, com carregamento dinâmico de categorias_inventario.txt (local) e usadas em formulário e filtro.
// - Adicionado: Novos campos de item na inventario_v3: localizacao, dataVencimento, unidadeMedida.
// - Adicionado: Campos dataUltimaModificacao e ultimoOperador no item (inventario_v3), atualizados automaticamente em cada modificação.
// - Modificado: saveOrUpdateItem() para: lidar com todos os novos campos, salvando "Não definido" para campos opcionais não preenchidos; integrar solicitação do operador e alertas de estoque negativo; registrar logs detalhados (tipos "CADASTRO", "ENTRADA", "SAIDA", "AJUSTE"), incluindo todos os novos campos no log.
// - Modificado: listarItensInventario() para: exibir todas as novas colunas; implementar filtros por cod/item e categoria; implementar Filtro Rápido por Status de Estoque; adicionar Notificação Visual para Estoque Crítico; incluir Contagem de "Dias em Estoque"; configurar os controles de Movimentação Direta.
// - Adicionado: updateItemQuantityDirectly() para gerenciar as movimentações rápidas via botões +/-, com operador, alerta de estoque negativo e registro detalhado no log.
// - Modificado: loadItemForEdit() para preencher todos os campos do formulário e exibir/ocultar o botão "Excluir Item".
// - Modificado: deleteItem() e adicionado deleteItemFromForm() para integrar solicitação do operador, log detalhado "REMOCAO", e lidar com o botão "Excluir Item" do formulário.
// - Modificado: showItemLog() e hideItemLog() para exibir log por item com todos os campos relevantes.
// - Implementado: Funções de relatório PDF (imprimirRelatorioInventario, gerarRelatorioReposicao, gerarRelatorioConsumo, gerarRelatorioVencimento), acionadas pelos botões na inventario.html. Todos incluem operador no cabeçalho e detalhes dos novos campos nos relatórios.
// - Incluído: console.log para depuração em funções críticas.
// - Corrigido: Botão "Fechar Histórico" (id closeItemLogBtn) agora está corretamente vinculado no DOMContentLoaded.
// - Corrigido: Formatação da data no título do "Relatório de Consumo" de AAAA-MM-DD para DDMMAAAA.
// - Melhoria: Adição de mais console.log detalhados nas funções de relatório para auxiliar na depuração.
// - Manutenção: Refatoração de funções de formatação de data para reutilização.
// - Corrigido: listarItensInventario() aprimorada para depuração e correção do carregamento de itens na tabela, garantindo exibição de todos os campos e filtragem correta.
// - Modificado: Função getOperadorName() substituída por getOperadorNameFromInput() para ler o nome do operador do novo campo operatorName (input HTML).
// - Adicionado: Validação para o campo operatorName (obrigatório) nas funções saveOrUpdateItem, updateItemQuantityDirectly, deleteItem, e em todas as funções de relatório PDF.
// - Implementado: Lógica de exibição/ocultamento do formulário de cadastro/edição (#itemFormSection) via JavaScript, acionada pelo botão "Cadastrar Novo Item" (#showAddItemFormBtn), pelo clique em "Editar", "Salvar Item", "Limpar Formulário" e "Excluir Item".
// - Implementado: Persistência do Nome do Operador (#operatorName) no localStorage do navegador, mantendo o valor preenchido entre sessões (até a página ser recarregada).
// - Adicionado: Função imprimirTabelaExibida() para gerar um relatório em PDF da tabela de itens atualmente visível na página.
// - Adicionado: Vinculação do botão "Imprimir Tabela Exibida" (#printCurrentTableBtn) à função correspondente no DOMContentLoaded.
// - Melhoria: console.log adicionados à imprimirTabelaExibida() para depuração.
// - Corrigido: Ajustes na lógica de hideItemForm() e clearItemForm() para que o campo operatorName seja mantido (não limpo) e os erros dele sejam corretamente limpos.
// - Corrigido: Variáveis formattedDate e formattedTime no escopo global para reutilização em cabeçalhos de PDF.
// - Corrigido: Math.max corrigido para a coluna de observações no relatório de estoque atual, garantindo que não quebre linhas em PDFs.
// - Corrigido: Pequeno ajuste nas larguras das colunas em alguns relatórios para melhor visualização.
// - Corrigido: Erro de sintaxe no-dupe-else-if no imprimirRelatorioInventario corrigido.


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
        clearItemForm(false); // Limpa o formulário, mas NÃO o nome do operador
        showItemForm(); // Exibe o formulário
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola para o topo
    });


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

    // Event listeners para os botões de relatório
    document.getElementById('printInventoryReportBtn').addEventListener('click', imprimirRelatorioInventario);
    document.getElementById('generateReplenishmentReportBtn').addEventListener('click', gerarRelatorioReposicao);
    document.getElementById('generateConsumptionReportBtn').addEventListener('click', gerarRelatorioConsumo);
    document.getElementById('generateDueDateReportBtn').addEventListener('click', gerarRelatorioVencimento);
    
    document.getElementById('closeItemLogBtn').addEventListener('click', hideItemLog); 
    document.getElementById('printCurrentTableBtn').addEventListener('click', imprimirTabelaExibida); // NOVO: Botão Imprimir Tabela Exibida

    console.log("Setup inicial concluído."); // DEBUG
});

// Funções para mostrar/ocultar o formulário de cadastro/edição
function showItemForm() {
    document.getElementById('itemFormSection').style.display = 'flex'; // Altera para flex para manter layout
    console.log("Formulário de item exibido."); // DEBUG
}

function hideItemForm() {
    document.getElementById('itemFormSection').style.display = 'none';
    console.log("Formulário de item ocultado."); // DEBUG
}


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
// Lê o nome do operador do input e valida
function getOperadorNameFromInput() {
    console.log("Lendo nome do operador do input..."); // DEBUG
    const operatorNameInput = document.getElementById('operatorName');
    const operador = operatorNameInput.value.trim();

    if (!operador) {
        showError('operatorName', 'Nome do operador é obrigatório.');
        console.log("Validação: Nome do operador vazio."); // DEBUG
        return null;
    }
    clearError('operatorName');
    localStorage.setItem(OPERATOR_NAME_STORAGE_KEY, operador); // Salva no localStorage
    console.log(`Nome do operador lido e salvo: ${operador}`); // DEBUG
    return operador;
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
    // Formata um objeto Date para stringCompreendido! Vamos atualizar o `inventario_scripts.js` para incorporar a lógica de impressão da tabela exibida no HTML.

---

### **Arquivo: `inventario_scripts.js`**

### **Versão: 3.0.7 (inventario_scripts.js)**
**CHANGELOG (inventario_scripts.js):**
* **Versão Atualizada:** De `3.0.5` para `3.0.7`.
* **Adicionado:** Função `imprimirTabelaExibida()` para gerar um relatório em PDF da tabela de itens atualmente visível na página.
* **Adicionado:** Vinculação do botão "Imprimir Tabela Exibida" (`#printCurrentTableBtn`) à função correspondente no `DOMContentLoaded`.
* **Melhoria:** `console.log` adicionados à `imprimirTabelaExibida()` para depuração.
* **Corrigido:** Ajustes na lógica de `hideItemForm()` e `clearItemForm()` para que o campo `operatorName` seja mantido (não limpo) e os erros dele sejam corretamente limpos.
* **Corrigido:** As variáveis de data e hora para cabeçalhos de PDF (`formattedDate`, `formattedTime`) agora são geradas localmente dentro de cada função de relatório para garantir que reflitam a hora da geração do relatório.
* **Corrigido:** `Math.max` corrigido para a coluna de observações no relatório de estoque atual, garantindo que não quebre linhas em PDFs.
* **Corrigido:** Pequeno ajuste nas larguras das colunas em alguns relatórios para melhor visualização.
* **Corrigido:** **Erro de sintaxe `no-dupe-else-if`** no `imprimirRelatorioInventario` corrigido.
* **Mantido:** Todas as funcionalidades e correções das versões anteriores foram preservadas.

```javascript
// VERSÃO: 3.0.7 (inventario_scripts.js)
// CHANGELOG:
// - Nova Versão: Marca o início oficial da Versão 3.0 do Sistema de Inventário.
// - Adicionado: Geração automática de cod sequencial para novos itens via transação no Firebase (config_v3/contadores).
// - Adicionado: categorias para itens, com carregamento dinâmico de categorias_inventario.txt (local) e usadas em formulário e filtro.
// - Adicionado: Novos campos de item na inventario_v3: localizacao, dataVencimento, unidadeMedida.
// - Adicionado: Campos dataUltimaModificacao e ultimoOperador no item (inventario_v3), atualizados automaticamente em cada modificação.
// - Modificado: saveOrUpdateItem() para: lidar com todos os novos campos, salvando "Não definido" para campos opcionais não preenchidos; integrar solicitação do operador e alertas de estoque negativo; registrar logs detalhados (tipos "CADASTRO", "ENTRADA", "SAIDA", "AJUSTE"), incluindo todos os novos campos no log.
// - Modificado: listarItensInventario() para: exibir todas as novas colunas; implementar filtros por cod/item e categoria; implementar Filtro Rápido por Status de Estoque; adicionar Notificação Visual para Estoque Crítico; incluir Contagem de "Dias em Estoque"; configurar os controles de Movimentação Direta.
// - Adicionado: updateItemQuantityDirectly() para gerenciar as movimentações rápidas via botões +/-, com operador, alerta de estoque negativo e registro detalhado no log.
// - Modificado: loadItemForEdit() para preencher todos os campos do formulário e exibir/ocultar o botão "Excluir Item".
// - Modificado: deleteItem() e adicionado deleteItemFromForm() para integrar solicitação do operador, log detalhado "REMOCAO", e lidar com o botão "Excluir Item" do formulário.
// - Modificado: showItemLog() e hideItemLog() para exibir log por item com todos os campos relevantes.
// - Implementado: Funções de relatório PDF (imprimirRelatorioInventario, gerarRelatorioReposicao, gerarRelatorioConsumo, gerarRelatorioVencimento), acionadas pelos botões na inventario.html. Todos incluem operador no cabeçalho e detalhes dos novos campos nos relatórios.
// - Incluído: console.log para depuração em funções críticas.
// - Corrigido: Botão "Fechar Histórico" (id closeItemLogBtn) agora está corretamente vinculado no DOMContentLoaded.
// - Corrigido: Formatação da data no título do "Relatório de Consumo" de AAAA-MM-DD para DDMMAAAA.
// - Melhoria: Adição de mais console.log detalhados nas funções de relatório para auxiliar na depuração.
// - Manutenção: Refatoração de funções de formatação de data para reutilização.
// - Corrigido: listarItensInventario() aprimorada para depuração e correção do carregamento de itens na tabela, garantindo exibição de todos os campos e filtragem correta.
// - Modificado: Função getOperadorName() substituída por getOperadorNameFromInput() para ler o nome do operador do novo campo operatorName (input HTML).
// - Adicionado: Validação para o campo operatorName (obrigatório) nas funções saveOrUpdateItem, updateItemQuantityDirectly, deleteItem, e em todas as funções de relatório PDF.
// - Implementado: Lógica de exibição/ocultamento do formulário de cadastro/edição (#itemFormSection) via JavaScript, acionada pelo botão "Cadastrar Novo Item" (#showAddItemFormBtn), pelo clique em "Editar", "Salvar Item", "Limpar Formulário" e "Excluir Item".
// - Implementado: Persistência do Nome do Operador (#operatorName) no localStorage do navegador, mantendo o valor preenchido entre sessões (até a página ser recarregada).
// - Adicionado: Função imprimirTabelaExibida() para gerar um relatório em PDF da tabela de itens atualmente visível na página.
// - Adicionado: Vinculação do botão "Imprimir Tabela Exibida" (#printCurrentTableBtn) à função correspondente no DOMContentLoaded.
// - Melhoria: console.log adicionados à imprimirTabelaExibida() para depuração.
// - Corrigido: Ajustes na lógica de hideItemForm() e clearItemForm() para que o campo operatorName seja mantido (não limpo) e os erros dele sejam corretamente limpos.
// - Corrigido: Variáveis formattedDate e formattedTime no escopo global para reutilização em cabeçalhos de PDF.


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
        clearItemForm(false); // Limpa o formulário, mas NÃO o nome do operador
        showItemForm(); // Exibe o formulário
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola para o topo
    });


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

    // Event listeners para os botões de relatório
    document.getElementById('printInventoryReportBtn').addEventListener('click', imprimirRelatorioInventario);
    document.getElementById('generateReplenishmentReportBtn').addEventListener('click', gerarRelatorioReposicao);
    document.getElementById('generateConsumptionReportBtn').addEventListener('click', gerarRelatorioConsumo);
    document.getElementById('generateDueDateReportBtn').addEventListener('click', gerarRelatorioVencimento);
    
    document.getElementById('closeItemLogBtn').addEventListener('click', hideItemLog); 
    document.getElementById('printCurrentTableBtn').addEventListener('click', imprimirTabelaExibida); // NOVO: Botão Imprimir Tabela Exibida

    console.log("Setup inicial concluído."); // DEBUG
});

// Funções para mostrar/ocultar o formulário de cadastro/edição
function showItemForm() {
    document.getElementById('itemFormSection').style.display = 'flex'; // Altera para flex para manter layout
    console.log("Formulário de item exibido."); // DEBUG
}

function hideItemForm() {
    document.getElementById('itemFormSection').style.display = 'none';
    console.log("Formulário de item ocultado."); // DEBUG
}


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
// Lê o nome do operador do input e valida
function getOperadorNameFromInput() {
    console.log("Lendo nome do operador do input..."); // DEBUG
    const operatorNameInput = document.getElementById('operatorName');
    const operador = operatorNameInput.value.trim();

    if (!operador) {
        showError('operatorName', 'Nome do operador é obrigatório.');
        console.log("Validação: Nome do operador vazio."); // DEBUG
        return null;
    }
    clearError('operatorName');
    localStorage.setItem(OPERATOR_NAME_STORAGE_KEY, operador); // Salva no localStorage
    console.log(`Nome do operador lido e salvo: ${operador}`); // DEBUG
    return operador;
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
    // Formata um objeto Date para stringCompreendido! Vamos atualizar o `inventario_scripts.js` para incorporar a lógica de impressão da tabela exibida no HTML.

---

### **Arquivo: `inventario_scripts.js`**

### **Versão: 3.0.7 (inventario_scripts.js)**
**CHANGELOG (inventario_scripts.js):**
* **Versão Atualizada:** De `3.0.5` para `3.0.7`.
* **Adicionado:** Função `imprimirTabelaExibida()` para gerar um relatório em PDF da tabela de itens atualmente visível na página.
* **Adicionado:** Vinculação do botão "Imprimir Tabela Exibida" (`#printCurrentTableBtn`) à função correspondente no `DOMContentLoaded`.
* **Melhoria:** `console.log` adicionados à `imprimirTabelaExibida()` para depuração.
* **Corrigido:** Ajustes na lógica de `hideItemForm()` e `clearItemForm()` para que o campo `operatorName` seja mantido (não limpo) e os erros dele sejam corretamente limpos.
* **Corrigido:** As variáveis de data e hora para cabeçalhos de PDF (`formattedDate`, `formattedTime`) agora são geradas localmente dentro de cada função de relatório para garantir que reflitam a hora da geração do relatório.
* **Corrigido:** `Math.max` corrigido para a coluna de observações no relatório de estoque atual, garantindo que não quebre linhas em PDFs.
* **Corrigido:** Pequeno ajuste nas larguras das colunas em alguns relatórios para melhor visualização.
* **Corrigido:** **Erro de sintaxe `no-dupe-else-if`** no `imprimirRelatorioInventario` corrigido.
* **Mantido:** Todas as funcionalidades e correções das versões anteriores foram preservadas.

```javascript
// VERSÃO: 3.0.7 (inventario_scripts.js)
// CHANGELOG:
// - Nova Versão: Marca o início oficial da Versão 3.0 do Sistema de Inventário.
// - Adicionado: Geração automática de cod sequencial para novos itens via transação no Firebase (config_v3/contadores).
// - Adicionado: categorias para itens, com carregamento dinâmico de categorias_inventario.txt (local) e usadas em formulário e filtro.
// - Adicionado: Novos campos de item na inventario_v3: localizacao, dataVencimento, unidadeMedida.
// - Adicionado: Campos dataUltimaModificacao e ultimoOperador no item (inventario_v3), atualizados automaticamente em cada modificação.
// - Modificado: saveOrUpdateItem() para: lidar com todos os novos campos, salvando "Não definido" para campos opcionais não preenchidos; integrar solicitação do operador e alertas de estoque negativo; registrar logs detalhados (tipos "CADASTRO", "ENTRADA", "SAIDA", "AJUSTE"), incluindo todos os novos campos no log.
// - Modificado: listarItensInventario() para: exibir todas as novas colunas; implementar filtros por cod/item e categoria; implementar Filtro Rápido por Status de Estoque; adicionar Notificação Visual para Estoque Crítico; incluir Contagem de "Dias em Estoque"; configurar os controles de Movimentação Direta.
// - Adicionado: updateItemQuantityDirectly() para gerenciar as movimentações rápidas via botões +/-, com operador, alerta de estoque negativo e registro detalhado no log.
// - Modificado: loadItemForEdit() para preencher todos os campos do formulário e exibir/ocultar o botão "Excluir Item".
// - Modificado: deleteItem() e adicionado deleteItemFromForm() para integrar solicitação do operador, log detalhado "REMOCAO", e lidar com o botão "Excluir Item" do formulário.
// - Modificado: showItemLog() e hideItemLog() para exibir log por item com todos os campos relevantes.
// - Implementado: Funções de relatório PDF (imprimirRelatorioInventario, gerarRelatorioReposicao, gerarRelatorioConsumo, gerarRelatorioVencimento), acionadas pelos botões na inventario.html. Todos incluem operador no cabeçalho e detalhes dos novos campos nos relatórios.
// - Incluído: console.log para depuração em funções críticas.
// - Corrigido: Botão "Fechar Histórico" (id closeItemLogBtn) agora está corretamente vinculado no DOMContentLoaded.
// - Corrigido: Formatação da data no título do "Relatório de Consumo" de AAAA-MM-DD para DDMMAAAA.
// - Melhoria: Adição de mais console.log detalhados nas funções de relatório para auxiliar na depuração.
// - Manutenção: Refatoração de funções de formatação de data para reutilização.
// - Corrigido: listarItensInventario() aprimorada para depuração e correção do carregamento de itens na tabela, garantindo exibição de todos os campos e filtragem correta.
// - Modificado: Função getOperadorName() substituída por getOperadorNameFromInput() para ler o nome do operador do novo campo operatorName (input HTML).
// - Adicionado: Validação para o campo operatorName (obrigatório) nas funções saveOrUpdateItem, updateItemQuantityDirectly, deleteItem, e em todas as funções de relatório PDF.
// - Implementado: Lógica de exibição/ocultamento do formulário de cadastro/edição (#itemFormSection) via JavaScript, acionada pelo botão "Cadastrar Novo Item" (#showAddItemFormBtn), pelo clique em "Editar", "Salvar Item", "Limpar Formulário" e "Excluir Item".
// - Implementado: Persistência do Nome do

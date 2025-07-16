// VERSÃO: 2.0.12 (script.js)
// CHANGELOG:
// - Base: Código a partir da versão 2.0.9a fornecida pelo usuário.
// - Implementado: Alinhamento de campos de cadastro (Data/Idade, CPF/Contato) via CSS.
// - Implementado: Checkbox "Modo Teste" para validação simplificada (apenas nome) se habilitado.
// - Implementado: Botão "Fechar Histórico" na seção de histórico de pacientes.
// - Implementado: Campo de pesquisa dinâmica no histórico para filtrar por Nome, CPF ou Protocolo.
// - Reforçado: Uso consistente de funções de sislab_utils.js para validação e formatação.
// - Ajustado: Mapeamento de IDs de elementos do DOM para corresponder ao index.html base fornecido.
// - Removido: Funções e constantes descontinuadas para o fluxo atual (Google Forms, GITHUB_PAT_GIST).

// Seção 1: Importações e Constantes Globais
// As importações do Firebase serão feitas via window.firebaseFirestore* globalmente no HTML
import { formatDateToDisplay, formatDateTimeToDisplay, showError, clearError, formatarCpf, formatarTelefone, calcularIdade, validarCpf as sislabValidarCpf, validarTelefone as sislabValidarTelefone } from './sislab_utils.js';

// Variáveis globais de controle
let listaExames = []; // Array para armazenar exames da Gist
let selectedExamsArray = []; // Array para armazenar exames selecionados para o paciente (nomes da lista principal)
let nonListedExamsArray = []; // Array para armazenar exames não listados manualmente
let allPatientsData = []; // Armazenará todos os pacientes carregados do Firebase para filtragem dinâmica no histórico
let isModoTeste = false; // NOVO: Estado do Modo Teste

// Definir a senha base para todas as operações sensíveis (usada em admin e edição de Gist)
const SENHA_BASE_SISLAB = "sislab";

// --- CONFIGURAÇÃO DA GIST PÚBLICA ---
const GITHUB_USERNAME = 'hyskal'; 
const GIST_ID = '1c13fc257a5a7f42e09303eaf26da670'; 
const GIST_FILENAME = 'exames.txt'; 
// GITHUB_PAT_GIST não é mais usado no script.js, pois a edição da lista de exames agora depende de uma senha dinâmica em tempo real.
// Removida a constante GITHUB_PAT_GIST.

// Configurações da Planilha Google Forms (Descontinuadas para Histórico, mantidas por compatibilidade)
// const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/SEU_FORM_ID/formResponse';
// const GOOGLE_FORM_ENTRIES = { ... };

// Lista de DDDs brasileiros válidos (se ainda utilizada localmente para validação de contato)
const dddsValidos = [
    11, 12, 13, 14, 15, 16, 17, 18, 19,
    21, 22, 24,
    27, 28,
    31, 32, 33, 34, 35, 37, 38,
    41, 42, 43, 44, 45, 46,
    47, 48, 49,
    51, 53, 54, 55,
    61, 62, 64, 63, 65, 66, 67, 68, 69,
    71, 73, 74, 75, 77, 79,
    81, 87, 82, 83, 84, 85, 88, 89,
    91, 93, 94, 92, 97, 95, 96, 98, 99
];


// Seção 2: Mapeamento de Elementos do DOM (AJUSTADO PARA IDs DO HTML BASE FORNECIDO)
const patientNameInput = document.getElementById('nome');
const patientCpfInput = document.getElementById('cpf');
const patientBirthDateInput = document.getElementById('data_nasc');
const patientAgeInput = document.getElementById('idade');
const patientSexSelect = document.getElementById('sexo');
const patientContactInput = document.getElementById('contato');
const patientAddressInput = document.getElementById('endereco');
const additionalInfoTextarea = document.getElementById('observacoes'); // Mapeado para 'observacoes'
const examSearchInput = document.getElementById('pesquisaExame'); // Mapeado para 'pesquisaExame'
const examSearchResultsDiv = document.getElementById('sugestoes'); // Mapeado para 'sugestoes'
const examesDiv = document.getElementById('exames'); // Mapeado para a div de exames disponíveis (checkboxes)
const selectedExamsDisplayDiv = document.getElementById('examesSelecionadosDisplay'); // Mapeado para a div de display de exames selecionados
const nonListedExamTextarea = document.getElementById('examesNaoListados'); // Mapeado para 'examesNaoListados' (textarea)

// Botões
const saveProtocolBtn = document.getElementById('saveItemBtn'); // Assumindo este ID para 'Salvar Protocolo e Imprimir'
const clearFormBtn = document.getElementById('clearItemFormBtn'); // Assumindo este ID para 'Limpar Formulário'
const showHistoryBtn = document.getElementById('showHistoryBtn'); // Assumindo este ID para 'Ver Histórico de Pacientes'

const patientHistorySection = document.getElementById('historico'); // Mapeado para a div 'historico'
const patientHistoryListBody = document.getElementById('historico').querySelector('ul'); // Mapeado para a UL dentro de 'historico' (será ajustado para tabela)
// Ajuste: A estrutura do histórico no HTML base não usa tabela, mas lista (ul/li).
// No entanto, as funções do meu script esperam uma tabela. Vou adaptar o script para exibir em UL/LI temporariamente
// ou indicar que o HTML precisa ser ajustado para usar tabela como no log_inventario.html.
// Para manter a compatibilidade com a versão anterior do script e adaptar ao HTML fornecido,
// vou usar as IDs existentes e adaptar a lógica de display do histórico para UL/LI.

const patientIdToEditInput = null; // Não há campo oculto com ID 'patientIdToEdit' no HTML base, adaptar.
// A edição de paciente precisará ser adaptada para passar o ID via outro mecanismo ou um campo oculto se for adicionado.

// NOVOS ELEMENTOS DO DOM (adicionados ao HTML base)
const closeHistoryBtn = document.getElementById('closeHistoryBtn');
const historySearchInput = document.getElementById('historySearchInput');
const clearHistorySearchBtn = document.getElementById('clearHistorySearchBtn');
const modoTesteCheckbox = document.getElementById('modoTesteCheckbox'); // NOVO


// Seção 3: Funções de Inicialização e Event Listeners
window.onload = async () => {
    try {
        console.log("window.onload: Iniciando carregamento da página.");
        await loadExamsFromGist(); // Carrega listaExames

        // Adiciona checkboxes dinamicamente à div 'exames' (se a div existe no HTML)
        if (examesDiv) {
            updateAvailableExamsCheckboxes();
        }

        // Event Listeners para validação e formatação
        patientBirthDateInput.addEventListener('change', updatePatientAge); 
        patientBirthDateInput.addEventListener('blur', validatePatientBirthDate); 

        patientCpfInput.addEventListener('input', (event) => { event.target.value = formatarCpf(event.target.value); });
        patientCpfInput.addEventListener('blur', validateCpfAndCheckHistory); 

        patientContactInput.addEventListener('input', (event) => { event.target.value = formatarTelefone(event.target.value); });
        patientContactInput.addEventListener('blur', validatePatientContact); 
        
        // Evento para a área de display de exames selecionados (botão de remover)
        selectedExamsDisplayDiv.addEventListener('click', (event) => {
            if (event.target.classList.contains('remove-item-btn')) {
                removeExamFromSelected(event.target.dataset.examName);
            }
        });

        examSearchInput.addEventListener('input', filterExams);
        // O addNonListedExamBtn não existe mais no HTML base fornecido,
        // a lógica de exames não listados será lida diretamente do textarea.
        
        saveProtocolBtn.addEventListener('click', saveProtocolAndPrint); 
        clearFormBtn.addEventListener('click', clearForm);
        showHistoryBtn.addEventListener('click', showPatientHistory); 

        // Event Listeners dos NOVOS elementos
        if (closeHistoryBtn) {
            closeHistoryBtn.addEventListener('click', hidePatientHistory); 
        }
        if (historySearchInput) {
            historySearchInput.addEventListener('input', filterAndDisplayHistory); 
        }
        if (clearHistorySearchBtn) {
            clearHistorySearchBtn.addEventListener('click', clearHistorySearch); 
        }
        if (modoTesteCheckbox) { // NOVO Event Listener
            modoTesteCheckbox.addEventListener('change', (event) => {
                isModoTeste = event.target.checked;
                console.log("DEBUG: Modo Teste:", isModoTeste);
                validatePatientForm(); // Ao mudar o modo, revalida o formulário para feedback imediato
            });
        }


        // Lógica para gerar e carregar paciente aleatório se o parâmetro estiver na URL
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('gerar') === 'ficticio') {
            await generateAndLoadRandomPatient();
        }

        loadPatientHistory(); // Carrega o histórico ao iniciar a página (oculto por padrão)

    } catch (error) {
        console.error("Erro crítico na inicialização da página:", error);
        alert("Ocorreu um erro crítico ao carregar a página. Por favor, verifique o console para mais detalhes.");
    }
};


// Seção 4: Funções de Carregamento de Dados (Gist/Firebase)
async function loadExamsFromGist() {
    try {
        const gistRawUrl = `https://gist.githubusercontent.com/${GITHUB_USERNAME}/${GIST_ID}/raw/${GIST_FILENAME}?t=${new Date().getTime()}`;
        const response = await fetch(gistRawUrl);
        if (!response.ok) {
            const localResponse = await fetch('lista-de-exames.txt?t=' + new Date().getTime());
            if (!localResponse.ok) {
                throw new Error('Não foi possível carregar a lista de exames de nenhuma fonte.');
            }
            const localText = await localResponse.text();
            listaExames = localText.trim().split('\n').map(exam => exam.trim()).filter(exam => exam !== '');
            console.warn('Carregando lista de exames de "lista-de-exames.txt" (Gist falhou ou não configurado).');
        } else {
            const text = await response.text();
            listaExames = text.trim().split('\n').map(exam => exam.trim()).filter(exam => exam !== '');
            console.log('Lista de exames carregada do Gist.');
        }
    } catch (error) {
        console.error('Erro ao carregar exames:', error);
        alert('Erro ao carregar a lista de exames. Algumas funcionalidades podem estar limitadas.');
        throw error;
    }
}

// NOVO: Função para popular a div 'exames' com checkboxes (necessária no HTML base)
function updateAvailableExamsCheckboxes() {
    if (!examesDiv) return; // Garante que a div existe
    examesDiv.innerHTML = ''; // Limpa a div
    listaExames.forEach(exam => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" class="exam-checkbox" value="${exam}"> ${exam}`;
        examesDiv.appendChild(label);
        examesDiv.appendChild(document.createElement('br'));
    });
    // Atualiza a exibição dos selecionados caso já existam (após preencher form)
    updateSelectedExamsDisplay();
}


async function loadPatientHistory() {
    // patientHistoryList é a UL dentro da div 'historico'
    if (!patientHistoryListBody) {
        console.error("loadPatientHistory: Elemento 'patientHistoryListBody' (ul dentro de #historico) não encontrado. Não é possível exibir histórico.");
        return;
    }
    patientHistoryListBody.innerHTML = '<li>Carregando histórico...</li>'; // Feedback de carregamento
    
    try {
        if (typeof window.firestoreDb === 'undefined' || !window.firestoreDb) {
            patientHistoryListBody.innerHTML = '<li>Banco de dados não inicializado.</li>';
            console.warn("loadPatientHistory: Banco de dados não inicializado. Não foi possível carregar o histórico.");
            return;
        }
        const historicoCollection = window.firebaseFirestoreCollection(window.firestoreDb, 'historico');
        const q = window.firebaseFirestoreQuery(historicoCollection, window.firebaseFirestoreOrderBy('protocolo', 'desc')); // Ordenado por protocolo para consistência
        const querySnapshot = await window.firebaseFirestoreGetDocs(q);

        allPatientsData = []; // Limpa antes de preencher
        if (querySnapshot.empty) {
            patientHistoryListBody.innerHTML = '<li>Nenhum histórico encontrado.</li>';
            return;
        }
        querySnapshot.forEach(doc => {
            allPatientsData.push({ id: doc.id, ...doc.data() });
        });
        filterAndDisplayHistory(); // Exibe todos inicialmente
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        patientHistoryListBody.innerHTML = '<li>Erro ao carregar histórico.</li>';
    }
}

// checkCpfInHistory agora busca no banco de dados
async function checkAndLoadPatientByCpf(cpf) {
    if (!sislabValidarCpf(cpf)) return;

    try {
        if (typeof window.firestoreDb === 'undefined' || !window.firestoreDb) {
            console.warn("checkAndLoadPatientByCpf: Banco de dados não inicializado. Verificação de CPF desabilitada.");
            return;
        }
        const historicoCollection = window.firebaseFirestoreCollection(window.firestoreDb, 'historico');
        // Usar CPF sem máscara para busca
        const q = window.firebaseFirestoreQuery(historicoCollection, window.firebaseFirestoreWhere('cpf', '==', cpf.replace(/\D/g, '')), window.firebaseFirestoreLimit(1));
        const querySnapshot = await window.firebaseFirestoreGetDocs(q);

        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            const data = doc.data();
            const confirmLoad = confirm(
                `CPF (${formatarCpf(data.cpf)}) encontrado no histórico para:\n\n` +
                `Nome: ${data.nome}\n` +
                `Data de Nascimento: ${formatDateToDisplay(data.dataNascimento)}\n` +
                `Sexo: ${data.sexo}\n` +
                `Contato: ${formatarTelefone(data.contato)}\n\n` +
                `Deseja carregar esses dados básicos no formulário?`
            );
            if (confirmLoad) {
                fillFormWithPatientData(data, doc.id);
                alert('Paciente encontrado no histórico. Dados carregados.');
            }
        } else {
            // patientIdToEditInput.value = ''; // Não existe no HTML base
            saveProtocolBtn.textContent = 'Salvar Protocolo e Imprimir';
        }
    } catch (error) {
        console.error('Erro ao verificar CPF no histórico:', error);
    }
}

// Seção 5: Funções de Preenchimento e Limpeza do Formulário (AJUSTADAS PARA NOVAS IDs)
function fillFormWithPatientData(patientData, docId = '') {
    const isFormDirty = patientNameInput.value.trim() !== '' || patientCpfInput.value.trim() !== '';
    if (isFormDirty) {
        const confirmClear = confirm("Existem dados no formulário que serão substituídos. Deseja continuar?");
        if (!confirmClear) return;
    }
    clearForm(); // Limpa o formulário antes de preencher
    // patientIdToEditInput.value = docId; // patientIdToEditInput não existe no HTML base

    patientNameInput.value = patientData.nome || '';
    patientCpfInput.value = formatarCpf(patientData.cpf || '');
    patientBirthDateInput.value = patientData.dataNascimento || ''; 
    patientSexSelect.value = patientData.sexo || '';
    patientContactInput.value = formatarTelefone(patientData.contato || '');
    patientAddressInput.value = patientData.endereco || '';
    additionalInfoTextarea.value = patientData.observacoes || ''; 
    nonListedExamTextarea.value = (patientData.examesNaoListados && Array.isArray(patientData.examesNaoListados)) ? patientData.examesNaoListados.join('\n') : (patientData.examesNaoListados || ''); // Garante que é string

    // Dispara evento change na data de nascimento para calcular a idade
    if (patientData.dataNascimento) {
        patientBirthDateInput.dispatchEvent(new Event('change'));
    }

    // Preenche exames selecionados
    selectedExamsArray = patientData.examesSelecionados || []; // Array de nomes de exames
    // nonListedExamsArray já foi preenchido acima com o conteúdo do textarea
    updateSelectedExamsDisplay(); // Atualiza a div de display
    markExamsOnCheckboxes(selectedExamsArray); // Marca os checkboxes visíveis na div 'exames'
    
    saveProtocolBtn.textContent = 'Atualizar Protocolo'; 
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearForm() {
    patientNameInput.value = '';
    patientCpfInput.value = '';
    patientBirthDateInput.value = '';
    patientAgeInput.value = '';
    patientSexSelect.value = '';
    patientContactInput.value = '';
    patientAddressInput.value = '';
    additionalInfoTextarea.value = ''; 
    examSearchInput.value = '';
    examSearchResultsDiv.innerHTML = '';
    examSearchResultsDiv.style.display = 'none';
    nonListedExamTextarea.value = ''; // Campo 'examesNaoListados'
    
    clearSelectedExams(); // Limpa arrays e display
    unmarkAllCheckboxes(); // Desmarca todos os checkboxes visíveis
    
    // patientIdToEditInput.value = ''; // patientIdToEditInput não existe no HTML base
    saveProtocolBtn.textContent = 'Salvar Protocolo e Imprimir'; 
    clearAllErrors();
}

function clearAllErrors() {
    clearError('nome'); 
    clearError('cpf'); 
    clearError('data_nasc'); 
    clearError('sexo'); 
    clearError('contato'); 
    clearError('examesSelecionadosDisplay'); 
}

// Seção 6: Funções de Manipulação de Exames (AJUSTADAS PARA NOVAS IDs/ESTRUTURAS)
// examSearchResultsDiv é a div 'sugestoes'
function filterExams() {
    const searchTerm = examSearchInput.value.toLowerCase();
    examSearchResultsDiv.innerHTML = '';
    examSearchResultsDiv.style.display = 'none';

    if (searchTerm.length < 2) return;

    const filtered = listaExames.filter(exam => exam.toLowerCase().includes(searchTerm));

    if (filtered.length > 0) {
        examSearchResultsDiv.style.display = 'block';
        filtered.forEach(exam => {
            const div = document.createElement('div');
            div.textContent = exam;
            div.classList.add('search-result-item');
            div.onclick = () => {
                addExamToSelected(exam);
                examSearchInput.value = '';
                examSearchResultsDiv.style.display = 'none';
            };
            examSearchResultsDiv.appendChild(div);
        });
    }
}

function addExamToSelected(examName) {
    if (!selectedExamsArray.includes(examName)) {
        selectedExamsArray.push(examName);
        updateSelectedExamsDisplay(); // Atualiza a div de display
        clearError('examesSelecionadosDisplay'); // Ajuste para ID 'examesSelecionadosDisplay'
        markExamsOnCheckboxes([examName]); // Marca o checkbox correspondente
    }
}

// O conteúdo do textarea examesNaoListados será lido diretamente na função de salvar.
// Não há um botão explícito para "Adicionar Exame Não Listado" no HTML base fornecido.

function removeExamFromSelected(examName) {
    // Remove do array de selecionados
    selectedExamsArray = selectedExamsArray.filter(name => name !== examName);
    // Remove do array de não listados (se foi adicionado por lá, caso contrário não faz nada)
    // O examesNaoListados agora é um textarea, precisa ser reprocessado
    const nonListedTextLines = nonListedExamTextarea.value.split('\n').map(line => line.trim()).filter(line => line !== '');
    nonListedExamsArray = nonListedTextLines.filter(name => name !== examName);
    nonListedExamTextarea.value = nonListedExamsArray.join('\n'); // Atualiza o textarea

    updateSelectedExamsDisplay(); // Atualiza a div de display
    unmarkExamsOnCheckboxes([examName]); // Desmarca o checkbox correspondente

    // Se a lista ficar vazia após remover, adiciona o placeholder
    if (selectedExamsArray.length === 0 && nonListedExamsArray.length === 0) {
        selectedExamsDisplayDiv.innerHTML = "<p>Nenhum exame selecionado.</p>";
    }
}

// NOVO: Função para atualizar a div examesSelecionadosDisplay
function updateSelectedExamsDisplay() {
    if (!selectedExamsDisplayDiv) return;
    selectedExamsDisplayDiv.innerHTML = ""; // Limpa o conteúdo atual

    const allSelectedAndNonListed = [...selectedExamsArray, ...nonListedExamsArray];

    if (allSelectedAndNonListed.length === 0) {
        selectedExamsDisplayDiv.innerHTML = "<p>Nenhum exame selecionado.</p>";
        return;
    }

    allSelectedAndNonListed.forEach(examName => {
        const displayItem = document.createElement('div');
        displayItem.classList.add('display-item');
        displayItem.innerHTML = `
            <span>${examName}</span>
            <button class="remove-item-btn" data-exam-name="${examName}">-</button>
        `;
        selectedExamsDisplayDiv.appendChild(displayItem);
    });
}


function clearSelectedExams() {
    selectedExamsArray = [];
    nonListedExamsArray = []; // Limpa o array, mas o textarea será lido no save
    nonListedExamTextarea.value = ''; // Limpa o textarea manualmente
    updateSelectedExamsDisplay(); // Atualiza a div de display para mostrar "Nenhum exame selecionado."
}

function markExamsOnCheckboxes(examsToMark) {
    if (!examesDiv) return; // Garante que a div existe
    examsToMark.forEach(examName => {
        // Encontra o checkbox pelo valor
        const checkbox = examesDiv.querySelector(`input[type="checkbox"][value="${examName}"]`);
        if (checkbox) {
            checkbox.checked = true;
            // Opcional: rolar até o checkbox se ele não estiver visível
            checkbox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });
}

function unmarkAllCheckboxes() {
    if (!examesDiv) return; // Garante que a div existe
    // Percorre todos os checkboxes dentro da div 'exames'
    examesDiv.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
}
function unmarkExamsOnCheckboxes(examsToUnmark) {
    if (!examesDiv) return; // Garante que a div existe
    examsToUnmark.forEach(examName => {
        const checkbox = examesDiv.querySelector(`input[type="checkbox"][value="${examName}"]`);
        if (checkbox) {
            checkbox.checked = false;
        }
    });
}


// Seção 7: Funções de Validação de Formulário (AJUSTADO PARA MODO TESTE E NOVAS IDs)
function validatePatientForm() {
    let isValid = true;
    clearAllErrors();

    // Lógica do Modo Teste
    if (isModoTeste) {
        if (patientNameInput.value.trim() === '') {
            showError('nome', 'Nome do paciente é obrigatório no Modo Teste.');
            return false;
        }
        return true; // No Modo Teste, apenas o nome é obrigatório
    }

    // Validações normais
    if (patientNameInput.value.trim() === '') {
        showError('nome', 'Nome do paciente é obrigatório.');
        isValid = false;
    }
    if (!sislabValidarCpf(patientCpfInput.value)) { // Usa a validação do sislab_utils.js
        showError('cpf', 'CPF inválido.');
        isValid = false;
    }
    if (patientBirthDateInput.value === '') {
        showError('data_nasc', 'Data de nascimento é obrigatória.');
        isValid = false;
    }
    // A validação de idade já é feita em updatePatientAge e define erro na data_nasc
    if (patientSexSelect.value === '') {
        showError('sexo', 'Sexo é obrigatório.');
        isValid = false;
    }
    if (!sislabValidarTelefone(patientContactInput.value)) { // Usa a validação do sislab_utils.js
        showError('contato', 'Contato inválido (ex: (DD) 9XXXX-XXXX).');
        isValid = false;
    }
    // Para exames, verifica selectedExamsArray ou o conteúdo do textarea nonListedExamTextarea
    if (selectedExamsArray.length === 0 && nonListedExamTextarea.value.trim() === '') {
        showError('examesSelecionadosDisplay', 'Selecione ou adicione pelo menos um exame.');
        isValid = false;
    }
    return isValid;
}

function updatePatientAge() {
    const dataNasc = patientBirthDateInput.value;
    if (dataNasc) {
        const idadeObj = calcularIdade(dataNasc);
        if (idadeObj === null || idadeObj.anos < 0) {
            patientAgeInput.value = "";
            showError('data_nasc', "Data inválida ou no futuro.");
        } else {
            let idadeTexto = `${idadeObj.anos} anos`;
            if (idadeObj.meses > 0) {
                idadeTexto += ` e ${idadeObj.meses} meses`;
            }
            patientAgeInput.value = idadeTexto;
            clearError('data_nasc');
        }
    } else {
        patientAgeInput.value = "";
        clearError('data_nasc');
    }
}

function validatePatientBirthDate() {
    const dataNasc = patientBirthDateInput.value;
    if (dataNasc && (new Date(dataNasc) > new Date())) {
        showError('data_nasc', "Data de nascimento não pode ser no futuro.");
    } else {
        clearError('data_nasc');
    }
    updatePatientAge();
}

function formatCpfInput() {
    patientCpfInput.value = formatarCpf(patientCpfInput.value);
}

function formatContactInput() {
    patientContactInput.value = formatarTelefone(patientContactInput.value);
}

function validateCpfAndCheckHistory() {
    const cpfLimpo = patientCpfInput.value.replace(/\D/g, '');
    if (cpfLimpo && !sislabValidarCpf(cpfLimpo)) {
        showError('cpf', "CPF inválido.");
    } else {
        clearError('cpf');
        if (cpfLimpo.length === 11) {
            checkAndLoadPatientByCpf(cpfLimpo);
        }
    }
}

function validatePatientContact() {
    const contact = patientContactInput.value;
    if (contact && !sislabValidarTelefone(contact)) {
        showError('contato', "Contato inválido.");
    } else {
        clearError('contato');
    }
}


// Seção 8: Funções de Persistência de Dados (Firebase)
async function saveProtocolAndPrint() {
    if (!validatePatientForm()) {
        alert('Por favor, preencha todos os campos obrigatórios e corrija os erros.');
        return;
    }

    const patientData = {
        nome: patientNameInput.value.trim(),
        cpf: patientCpfInput.value.trim().replace(/\D/g, ''), // Salva CPF sem máscara
        dataNascimento: patientBirthDateInput.value,
        sexo: patientSexSelect.value,
        contato: patientContactInput.value.trim(),
        endereco: patientAddressInput.value.trim(),
        observacoes: additionalInfoTextarea.value.trim(), // Mapeado para 'observacoes'
        examesSelecionados: selectedExamsArray,
        examesNaoListados: nonListedExamTextarea.value.trim(), // Pega diretamente do textarea
        dataCadastro: window.firebaseFirestoreServerTimestamp(),
        protocolo: '', // Será preenchido após o addDoc/update
    };

    try {
        if (typeof window.firestoreDb === 'undefined' || !window.firestoreDb) {
            alert("Banco de dados não inicializado. Verifique a configuração.");
            console.error("saveProtocolAndPrint: Firestore não disponível.");
            return;
        }

        const historicoCollection = window.firebaseFirestoreCollection(window.firestoreDb, 'historico');
        let docRef;
        let finalProtocolo = '';

        // Adaptação para o HTML base que não tem patientIdToEditInput
        const currentPatientId = patientIdToEditInput ? patientIdToEditInput.value : '';

        if (currentPatientId) { // Edição de um protocolo existente
            docRef = window.firebaseFirestoreDoc(window.firestoreDb, 'historico', currentPatientId);
            const existingDoc = await window.firebaseFirestoreGetDoc(docRef);
            if (existingDoc.exists()) {
                finalProtocolo = existingDoc.data().protocolo;
                patientData.protocolo = finalProtocolo; 
            }
            await window.firebaseFirestoreUpdateDoc(docRef, patientData);
            alert('Protocolo atualizado com sucesso!');
        } else { // Novo protocolo
            const q = window.firebaseFirestoreQuery(
                historicoCollection,
                window.firebaseFirestoreOrderBy('protocolo', 'desc'),
                window.firebaseFirestoreLimit(1)
            );
            const querySnapshot = await window.firebaseFirestoreGetDocs(q);

            let lastProtocolNumber = 0;
            if (!querySnapshot.empty) {
                const lastDoc = querySnapshot.docs[0];
                const lastProtocoloCompleto = lastDoc.data().protocolo;
                lastProtocolNumber = parseInt(lastProtocoloCompleto.split('-')[0]) || 0;
            }
            const newProtocolNumber = (lastProtocolNumber + 1).toString().padStart(4, '0');
            const now = new Date();
            const protocolSuffix = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
            finalProtocolo = `${newProtocolNumber}-${protocolSuffix}`;

            patientData.protocolo = finalProtocolo;
            docRef = await window.firebaseFirestoreAddDoc(historicoCollection, patientData);
            alert('Protocolo salvo com sucesso!');
        }

        generateProtocolPdf({ ...patientData, protocolo: finalProtocolo });
        clearForm();
        showPatientHistory(); // Atualiza e exibe o histórico
    } catch (error) {
        console.error('Erro ao salvar ou atualizar protocolo:', error);
        alert('Erro ao salvar ou atualizar protocolo. Verifique o console para mais detalhes.');
    }
}

async function showPatientHistory() {
    if (!patientHistorySection || !patientHistoryListBody) {
        console.error("showPatientHistory: Elementos do histórico (div#historico ou ul) não encontrados.");
        alert("Erro: Elementos do histórico não encontrados no HTML. Verifique o console.");
        return;
    }
    patientHistorySection.style.display = 'block';
    patientHistoryListBody.innerHTML = '<li>Carregando histórico...</li>';

    try {
        if (typeof window.firestoreDb === 'undefined' || !window.firestoreDb) {
            patientHistoryListBody.innerHTML = '<li>Banco de dados não inicializado.</li>';
            console.warn("showPatientHistory: Banco de dados não inicializado. Não foi possível carregar o histórico.");
            return;
        }
        const historicoCollection = window.firebaseFirestoreCollection(window.firestoreDb, 'historico');
        const q = window.firebaseFirestoreQuery(historicoCollection, window.firebaseFirestoreOrderBy('protocolo', 'desc')); 
        const querySnapshot = await window.firebaseFirestoreGetDocs(q);

        allPatientsData = [];
        if (querySnapshot.empty) {
            patientHistoryListBody.innerHTML = '<li>Nenhum histórico encontrado.</li>';
            return;
        }
        querySnapshot.forEach(doc => {
            allPatientsData.push({ id: doc.id, ...doc.data() });
        });
        filterAndDisplayHistory(); // Exibe todos inicialmente
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        patientHistoryListBody.innerHTML = '<li>Erro ao carregar histórico.</li>';
    }
}

// Função para filtrar e exibir o histórico com base na pesquisa
function filterAndDisplayHistory() {
    const searchTerm = historySearchInput.value.toLowerCase().trim();
    if (!patientHistoryListBody) return;
    patientHistoryListBody.innerHTML = ''; // Limpa a lista

    const filteredPatients = allPatientsData.filter(patient => {
        const nome = (patient.nome || '').toLowerCase();
        const cpf = (patient.cpf || '').toLowerCase();
        const protocolo = (patient.protocolo || '').toLowerCase();
        return nome.includes(searchTerm) || cpf.includes(searchTerm.replace(/\D/g, '')) || protocolo.includes(searchTerm);
    });

    if (filteredPatients.length === 0) {
        patientHistoryListBody.innerHTML = '<li>Nenhum resultado encontrado para a pesquisa.</li>';
        return;
    }

    filteredPatients.forEach(patient => {
        const li = document.createElement('li');
        // No HTML base, a lista é UL/LI, não uma tabela com TR/TD
        const protocoloDisplay = patient.protocolo ? `Protocolo: ${patient.protocolo}` : `ID: ${patient.id}`;
        li.innerHTML = `<b>${protocoloDisplay}</b> - ${patient.nome} - CPF: ${formatarCpf(patient.cpf || '')} - Data Nasc.: ${formatDateToDisplay(patient.dataNascimento || '')} - Exames: ${[...(patient.examesSelecionados || []), patient.examesNaoListados ? patient.examesNaoListados : ''].filter(e => e).join(', ')}`;
        li.onclick = () => loadPatientForEdit(patient.id);
        patientHistoryListBody.appendChild(li);
    });
}

// Função para fechar o histórico
function hidePatientHistory() {
    if (!patientHistorySection) return;
    patientHistorySection.style.display = 'none';
    if (historySearchInput) historySearchInput.value = ''; // Limpa a pesquisa ao fechar
    filterAndDisplayHistory(); // Reseta a exibição para todos os pacientes
}

// Função para limpar a pesquisa do histórico
function clearHistorySearch() {
    if (!historySearchInput) return;
    historySearchInput.value = '';
    filterAndDisplayHistory(); // Recarrega a lista sem filtro
}


async function loadPatientForEdit(patientId) {
    try {
        if (typeof window.firestoreDb === 'undefined' || !window.firestoreDb) {
            console.warn("loadPatientForEdit: Banco de dados não inicializado. Carregamento de paciente desabilitado.");
            return;
        }
        const docRef = window.firebaseFirestoreDoc(window.firestoreDb, 'historico', patientId);
        const docSnap = await window.firebaseFirestoreGetDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            fillFormWithPatientData(data, docSnap.id);
            alert('Cadastro carregado para edição.');
        } else {
            alert('Paciente não encontrado no banco de dados.');
            clearForm();
        }
    } catch (error) {
        console.error('Erro ao carregar paciente para edição:', error);
        alert('Erro ao carregar paciente para edição. Verifique o console.');
    }
}

// Seção 9: Funções de Geração de PDF
function generateProtocolPdf(patientData) {
    const doc = new jsPDF();

    let y = 15;
    const margin = 15;
    const lineHeight = 7;

    // Título
    doc.setFontSize(18);
    doc.text('Protocolo de Atendimento SISLAB', doc.internal.pageSize.width / 2, y, { align: 'center' });
    y += lineHeight * 2;

    // Dados do Paciente
    doc.setFontSize(12);
    doc.text('Dados do Paciente:', margin, y);
    y += lineHeight;
    doc.setFontSize(10);
    doc.text(`Protocolo: ${patientData.protocolo || 'N/A'}`, margin, y); y += lineHeight;
    doc.text(`Nome: ${patientData.nome}`, margin, y); y += lineHeight;
    doc.text(`CPF: ${formatarCpf(patientData.cpf)}`, margin, y); y += lineHeight;
    doc.text(`Data de Nascimento: ${formatDateToDisplay(patientData.dataNascimento)} (Idade: ${calcularIdade(patientData.dataNascimento)})`, margin, y); y += lineHeight;
    doc.text(`Sexo: ${patientData.sexo}`, margin, y); y += lineHeight;
    doc.text(`Contato: ${formatarTelefone(patientData.contato)}`, margin, y); y += lineHeight;
    doc.text(`Endereço: ${patientData.endereco}`, margin, y); y += lineHeight;
    if (patientData.observacoes) { 
        doc.text(`Observações: ${patientData.observacoes}`, margin, y); y += lineHeight;
    }
    y += lineHeight;

    // Exames Solicitados
    doc.setFontSize(12);
    doc.text('Exames Solicitados:', margin, y);
    y += lineHeight;
    doc.setFontSize(10);

    // Ajuste para examesNaoListados ser uma string no HTML original
    const allExamsForPdf = [...(patientData.examesSelecionados || []), patientData.examesNaoListados ? patientData.examesNaoListados.split('\n').map(e => e.trim()).filter(e => e !== '') : []].flat();

    if (allExamsForPdf.length > 0) {
        allExamsForPdf.forEach((exam, index) => {
            if (y + lineHeight > doc.internal.pageSize.height - margin) {
                doc.addPage();
                y = margin;
            }
            doc.text(`- ${exam}`, margin + 5, y);
            y += lineHeight;
        });
    } else {
        doc.text('Nenhum exame solicitado.', margin + 5, y);
        y += lineHeight;
    }
    y += lineHeight;

    // Data e Assinatura
    if (y + lineHeight * 3 > doc.internal.pageSize.height - margin) {
        doc.addPage();
        y = margin;
    }
    doc.setFontSize(10);
    doc.text(`Data do Cadastro: ${formatDateTimeToDisplay(patientData.dataCadastro)}`, margin, y); y += lineHeight * 2;
    doc.text('___________________________________', doc.internal.pageSize.width / 2, y, { align: 'center' });
    y += lineHeight;
    doc.text('Assinatura do Responsável', doc.internal.pageSize.width / 2, y, { align: 'center' });

    doc.save(`Protocolo_${patientData.protocolo || patientData.nome}.pdf`);
}

// Seção 10: Funções de Geração de Pacientes Aleatórios
async function generateAndLoadRandomPatient() {
    try {
        const response = await fetch('pacientes_aleatorios.json');
        if (!response.ok) {
            throw new Error(`Erro ao carregar pacientes_aleatorios.json: ${response.statusText}`);
        }
        const pacientes = await response.json();
        const randomPatient = pacientes[Math.floor(Math.random() * pacientes.length)];
        
        // Mapeia os nomes das propriedades do paciente aleatório para as IDs do formulário
        const mappedPatientData = {
            nome: randomPatient.nome,
            dataNascimento: randomPatient.dataNasc,
            sexo: randomPatient.sexo,
            cpf: randomPatient.cpf,
            contato: randomPatient.contato,
            endereco: randomPatient.endereco,
            observacoes: randomPatient.observacoes, // Mapeado para observacoes
            examesSelecionados: randomPatient.examesSelecionados || [],
            examesNaoListados: (randomPatient.examesNaoListados && Array.isArray(randomPatient.examesNaoListados)) 
                               ? randomPatient.examesNaoListados.join('\n') 
                               : (randomPatient.examesNaoListados || '')
        };

        fillFormWithPatientData(mappedPatientData); 
        alert("Paciente aleatório gerado e formulário preenchido!");
    } catch (err) {
        console.error("Erro ao gerar/carregar paciente aleatório:", err);
        alert("Erro ao gerar/carregar paciente aleatório. Verifique se o arquivo JSON está acessível e formatado corretamente.");
    }
}

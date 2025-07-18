// laudo_scripts.js
// VERSÃO: 1.0.0 (laudo_scripts.js)
// CHANGELOG:
// - NOVO: Implementação da funcionalidade de busca de paciente por protocolo, CPF ou nome no Firebase Firestore.
// - NOVO: Exibição dos resultados da busca e dos dados do paciente selecionado.
// - NOVO: Adição de diversos pontos de depuração (console.log) para rastreamento.
// - NOVO: Inclusão de tratamento de erros e validações básicas.
// - NOVO: Implementação de funcionalidade para alternar modo de edição dos resultados dos exames.
// - CORREÇÃO: Função 'calcularIdade' importada corretamente de 'sislab_utils.js'.

// Seção 1: Importações e Variáveis Globais
// As funções do Firebase são globalizadas em laudo_resultados.html.
// Importamos apenas as funções de utilidade do sislab_utils.js
import { formatDateTimeToDisplay, formatDateToDisplay, calcularIdade, showError, clearError } from './sislab_utils.js';

let selectedPatientData = null; // Armazena os dados do paciente atualmente selecionado
console.log("DEBUG(laudo_scripts): Seção 1 - Importações e variáveis globais carregadas.");

// Seção 2: Event Listeners Iniciais (DOMContentLoaded)
document.addEventListener('DOMContentLoaded', () => {
    console.log("DEBUG(laudo_scripts): DOMContentLoaded - Iniciando setup da página de Emissão de Laudos.");

    const searchPatientBtn = document.getElementById('searchPatientBtn');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const saveLaudoBtn = document.getElementById('saveLaudoBtn');
    const generatePdfLaudoBtn = document.getElementById('generatePdfLaudoBtn');
    const clearLaudoFieldsBtn = document.getElementById('clearLaudoFieldsBtn');
    const searchQueryInput = document.getElementById('searchQuery');

    if (searchPatientBtn) {
        searchPatientBtn.addEventListener('click', searchPatient);
        console.log("DEBUG(laudo_scripts): Event listener para 'searchPatientBtn' adicionado.");
    } else {
        console.error("DEBUG(laudo_scripts): Elemento 'searchPatientBtn' não encontrado.");
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', clearSearchAndPatientData);
        console.log("DEBUG(laudo_scripts): Event listener para 'clearSearchBtn' adicionado.");
    } else {
        console.error("DEBUG(laudo_scripts): Elemento 'clearSearchBtn' não encontrado.");
    }

    if (saveLaudoBtn) {
        saveLaudoBtn.addEventListener('click', saveLaudo);
        console.log("DEBUG(laudo_scripts): Event listener para 'saveLaudoBtn' adicionado.");
    } else {
        console.error("DEBUG(laudo_scripts): Elemento 'saveLaudoBtn' não encontrado.");
    }

    if (generatePdfLaudoBtn) {
        generatePdfLaudoBtn.addEventListener('click', generatePdfLaudo);
        console.log("DEBUG(laudo_scripts): Event listener para 'generatePdfLaudoBtn' adicionado.");
    } else {
        console.error("DEBUG(laudo_scripts): Elemento 'generatePdfLaudoBtn' não encontrado.");
    }

    if (clearLaudoFieldsBtn) {
        clearLaudoFieldsBtn.addEventListener('click', clearAllLaudoFields);
        console.log("DEBUG(laudo_scripts): Event listener para 'clearLaudoFieldsBtn' adicionado.");
    } else {
        console.error("DEBUG(laudo_scripts): Elemento 'clearLaudoFieldsBtn' não encontrado.");
    }

    // Adiciona listener para a tecla 'Enter' no campo de busca
    if (searchQueryInput) {
        searchQueryInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // Evita que o formulário seja enviado, se houver
                searchPatient();
            }
        });
        console.log("DEBUG(laudo_scripts): Event listener 'keypress' (Enter) para 'searchQuery' adicionado.");
    }

    // Inicializa o modo de edição para os exemplos de exame no HTML
    setupExamResultItemEditing();
    console.log("DEBUG(laudo_scripts): DOMContentLoaded - Setup inicial concluído.");
});


// Seção 3: Funções Auxiliares de UI/Validação
function clearSearchAndPatientData() {
    console.log("DEBUG(clearSearchAndPatientData): Limpando busca e dados do paciente.");
    document.getElementById('searchQuery').value = '';
    clearError('searchQuery');
    document.getElementById('searchResultStatus').textContent = 'Nenhum paciente encontrado ou selecionado.';
    document.getElementById('patientResultsList').innerHTML = '';

    // Oculta as seções de display de paciente e resultados de exame
    document.querySelector('.patient-display-section').style.display = 'none';
    document.querySelector('.results-input-section').style.display = 'none';
    document.querySelector('.signature-section').style.display = 'none';

    // Limpa os dados do paciente selecionado
    selectedPatientData = null;
    clearPatientDisplay();
    document.getElementById('examResultsContainer').innerHTML = ''; // Limpa os exames exibidos
    document.getElementById('observacoesLaudoGeral').value = ''; // Limpa observações gerais

    console.log("DEBUG(clearSearchAndPatientData): Busca e dados do paciente limpos.");
}

function clearPatientDisplay() {
    console.log("DEBUG(clearPatientDisplay): Limpando campos de exibição do paciente.");
    document.getElementById('patientProtocol').textContent = '';
    document.getElementById('patientName').textContent = '';
    document.getElementById('patientCPF').textContent = '';
    document.getElementById('patientAge').textContent = '';
    document.getElementById('patientDOB').textContent = '';
    document.getElementById('patientGender').textContent = '';
    document.getElementById('patientContact').textContent = '';
    document.getElementById('patientAddress').textContent = '';
    console.log("DEBUG(clearPatientDisplay): Campos de exibição do paciente limpos.");
}

function clearAllLaudoFields() {
    console.log("DEBUG(clearAllLaudoFields): Limpando todos os campos do laudo.");
    clearSearchAndPatientData(); // Reutiliza a função para limpar busca e dados do paciente
    // Qualquer campo adicional específico do laudo pode ser limpo aqui
    // Ex: document.getElementById('campoAdicional').value = '';
    console.log("DEBUG(clearAllLaudoFields): Todos os campos do laudo limpos.");
    alert("Todos os campos do laudo foram limpos.");
}

// Função auxiliar para padronizar CPF para busca no banco de dados (sem máscara)
function formatarCPFParaBusca(cpfComMascara) {
    if (!cpfComMascara) return '';
    return cpfComMascara.replace(/\D/g, ''); // Remove todos os caracteres não-dígitos
}

// Seção 4: Funcionalidade de Busca de Paciente
async function searchPatient() {
    console.log("DEBUG(searchPatient): Iniciando função de busca de paciente.");
    const searchQuery = document.getElementById('searchQuery').value.trim();
    const searchResultStatus = document.getElementById('searchResultStatus');
    const patientResultsList = document.getElementById('patientResultsList');

    clearError('searchQuery');
    patientResultsList.innerHTML = ''; // Limpa resultados anteriores
    searchResultStatus.textContent = 'Buscando...';
    
    // Oculta as seções de display de paciente e resultados de exame enquanto busca
    document.querySelector('.patient-display-section').style.display = 'none';
    document.querySelector('.results-input-section').style.display = 'none';
    document.querySelector('.signature-section').style.display = 'none';

    if (!searchQuery) {
        showError('searchQuery', 'Por favor, digite um Protocolo, CPF ou Nome para buscar.');
        searchResultStatus.textContent = 'Nenhum paciente encontrado ou selecionado.';
        console.log("DEBUG(searchPatient): Busca cancelada: Termo de busca vazio.");
        return;
    }

    console.log(`DEBUG(searchPatient): Termo de busca: "${searchQuery}"`);

    // Verifica se o Firestore está inicializado
    if (typeof window.firestoreDb === 'undefined' || !window.firestoreDb) {
        searchResultStatus.textContent = 'Erro: Banco de dados não inicializado.';
        alert("Erro: O banco de dados não está inicializado. Verifique a configuração do Firebase no HTML.");
        console.error("DEBUG(searchPatient): Firestore DB não inicializado ou disponível.");
        return;
    }

    try {
        const historicoRef = window.firebaseFirestoreCollection(window.firestoreDb, 'historico');
        let q;
        let queryConstraints = [];

        // Tenta identificar o tipo de busca
        const isProtocol = /^\d{4}-\d{8}$/.test(searchQuery); // Ex: 0001-15301707
        const isCpf = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(searchQuery) || /^\d{11}$/.test(searchQuery); // Com ou sem máscara
        
        console.log(`DEBUG(searchPatient): Tentando identificar tipo de busca: isProtocol=${isProtocol}, isCpf=${isCpf}`);

        if (isProtocol) {
            console.log("DEBUG(searchPatient): Buscando por Protocolo.");
            queryConstraints.push(window.firebaseFirestoreWhere('protocolo', '==', searchQuery));
        } else if (isCpf) {
            const cpfLimpo = formatarCPFParaBusca(searchQuery);
            console.log(`DEBUG(searchPatient): Buscando por CPF (limpo): "${cpfLimpo}"`);
            queryConstraints.push(window.firebaseFirestoreWhere('cpf', '==', cpfLimpo));
            // IMPORTANTE: Se o CPF for armazenado com máscara no Firestore, a busca "==" pode falhar.
            // O seu script.js já salva o CPF sem máscara no Firestore.
        } else {
            // Assume busca por nome ou parte do nome (case-insensitive e contém)
            // Para buscas parciais de texto, Firestore requer orderBy ou uma complexidade maior.
            // Para simplicidade e evitar índices complexos para "contains", faremos um fetch geral e filtramos em memória.
            // Para uma busca "real" de nome, você precisaria de "startAt" e "endAt" para prefixos.
            // Para "contains", geralmente é melhor buscar tudo e filtrar no cliente ou usar soluções de busca externas.
            console.log("DEBUG(searchPatient): Buscando por Nome (filtro em memória).");
            // Não adiciona 'where' para nome no Firestore para não exigir índice complexo em todos os nomes.
            // A ordenação é importante para o Firestore mesmo em buscas amplas para evitar erros.
            queryConstraints.push(window.firebaseFirestoreOrderBy('nome', 'asc')); 
            // FIREBASE INDEX AVISO: Se você fizer uma busca mais complexa aqui, por exemplo:
            // queryConstraints.push(window.firebaseFirestoreWhere('nome', '>=', searchQuery));
            // queryConstraints.push(window.firebaseFirestoreWhere('nome', '<=', searchQuery + '\uf8ff'));
            // E também tiver um orderBy diferente ou outro where, o Firebase exigirá um índice composto.
            // O link para a criação do índice aparecerá no console do navegador se necessário.
            // Exemplo de erro no console: "The query requires an index. You can create it here: [link para o Firebase Console]"
        }

        // Constrói a query final
        q = window.firebaseFirestoreQuery(historicoRef, ...queryConstraints);
        console.log("DEBUG(searchPatient): Query Firebase construída:", q);

        const querySnapshot = await window.firebaseFirestoreGetDocs(q);
        const patients = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`DEBUG(searchPatient): ${patients.length} pacientes encontrados no Firestore.`);

        let filteredPatients = patients;

        // Se a busca não foi por protocolo ou CPF exato, aplica filtro de nome em memória (se necessário)
        if (!isProtocol && !isCpf && searchQuery) {
            filteredPatients = patients.filter(p => 
                p.nome && p.nome.toLowerCase().includes(searchQuery.toLowerCase())
            );
            console.log(`DEBUG(searchPatient): ${filteredPatients.length} pacientes após filtro de nome em memória.`);
        }

        if (filteredPatients.length === 0) {
            searchResultStatus.textContent = 'Nenhum paciente encontrado com o termo de busca.';
            console.log("DEBUG(searchPatient): Nenhum paciente encontrado após filtros.");
            return;
        }

        searchResultStatus.textContent = `Encontrados ${filteredPatients.length} paciente(s). Selecione abaixo:`;
        patientResultsList.innerHTML = ''; // Limpa lista de resultados para preencher
        
        filteredPatients.forEach(patient => {
            const li = document.createElement('li');
            li.textContent = `${patient.nome} (CPF: ${patient.cpf}, Protocolo: ${patient.protocolo || 'N/D'})`;
            li.style.cursor = 'pointer';
            li.style.padding = '8px';
            li.style.borderBottom = '1px solid #eee';
            li.addEventListener('click', () => selectPatient(patient.id));
            patientResultsList.appendChild(li);
        });
        console.log("DEBUG(searchPatient): Resultados da busca exibidos na lista.");

    } catch (error) {
        searchResultStatus.textContent = 'Erro ao buscar paciente. Verifique o console.';
        console.error("DEBUG(searchPatient): Erro ao buscar paciente no Firebase:", error);
        alert(`Erro ao buscar paciente: ${error.message}. Verifique o console para detalhes e considere criar um índice no Firebase, se sugerido pelo erro.`);
    }
}

// Seção 5: Seleção e Exibição de Dados do Paciente
async function selectPatient(patientId) {
    console.log(`DEBUG(selectPatient): Paciente com ID "${patientId}" selecionado. Carregando dados.`);
    const patientDisplaySection = document.querySelector('.patient-display-section');
    const resultsInputSection = document.querySelector('.results-input-section');
    const signatureSection = document.querySelector('.signature-section');
    const searchResultStatus = document.getElementById('searchResultStatus');
    const patientResultsList = document.getElementById('patientResultsList');

    patientResultsList.innerHTML = ''; // Limpa a lista de resultados da busca
    searchResultStatus.textContent = 'Paciente selecionado.';

    // Exibe as seções relevantes
    patientDisplaySection.style.display = 'block';
    resultsInputSection.style.display = 'block';
    signatureSection.style.display = 'block';

    // Limpa exames anteriores
    document.getElementById('examResultsContainer').innerHTML = '';

    if (typeof window.firestoreDb === 'undefined' || !window.firestoreDb) {
        console.error("DEBUG(selectPatient): Firestore DB não inicializado.");
        alert("Erro: Banco de dados não inicializado para carregar paciente.");
        return;
    }

    try {
        const docRef = window.firebaseFirestoreDoc(window.firestoreDb, 'historico', patientId);
        const docSnap = await window.firebaseFirestoreGetDoc(docRef);

        if (!docSnap.exists) {
            alert("Paciente não encontrado no banco de dados.");
            console.warn("DEBUG(selectPatient): Documento do paciente não encontrado para ID:", patientId);
            clearSearchAndPatientData();
            return;
        }

        selectedPatientData = { id: docSnap.id, ...docSnap.data() };
        console.log("DEBUG(selectPatient): Dados do paciente carregados:", selectedPatientData);

        displayPatientData(selectedPatientData);
        displayPatientExamsForLaudo(selectedPatientData.exames, selectedPatientData.examesNaoListados);

        // Preenche a data de geração do laudo na seção de assinatura
        const now = new Date();
        const formattedDate = formatDateToDisplay(now);
        const formattedTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        document.getElementById('laudoGenerationDate').textContent = `${formattedDate} ${formattedTime}`;

        window.scrollTo({ top: patientDisplaySection.offsetTop, behavior: 'smooth' });
        console.log("DEBUG(selectPatient): Paciente exibido e exames carregados.");

    } catch (error) {
        console.error("DEBUG(selectPatient): Erro ao carregar paciente selecionado:", error);
        alert(`Erro ao carregar dados do paciente: ${error.message}.`);
        clearSearchAndPatientData();
    }
}

function displayPatientData(patient) {
    console.log("DEBUG(displayPatientData): Exibindo dados do paciente no formulário.");
    document.getElementById('patientProtocol').textContent = patient.protocolo || 'N/D';
    document.getElementById('patientName').textContent = patient.nome || 'N/D';
    // Reformatar CPF com máscara para exibição
    let cpfDisplay = patient.cpf ? patient.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : 'N/D';
    document.getElementById('patientCPF').textContent = cpfDisplay;

    // Calcular idade para exibição
    let idadeTexto = 'N/D';
    if (patient.dataNasc) {
        const idadeObj = calcularIdade(patient.dataNasc);
        if (idadeObj) {
            idadeTexto = `${idadeObj.anos} anos`;
            if (idadeObj.meses > 0) {
                idadeTexto += ` e ${idadeObj.meses} meses`;
            }
        }
    }
    document.getElementById('patientAge').textContent = idadeTexto;
    document.getElementById('patientDOB').textContent = patient.dataNasc ? formatDateToDisplay(new Date(patient.dataNasc + 'T00:00:00')) : 'N/D';
    document.getElementById('patientGender').textContent = patient.sexo || 'N/D';
    document.getElementById('patientContact').textContent = patient.contato || 'N/D';
    document.getElementById('patientAddress').textContent = patient.endereco || 'N/D';
    console.log("DEBUG(displayPatientData): Dados do paciente preenchidos na UI.");
}

// Seção 6: Preenchimento Dinâmico dos Exames
function displayPatientExamsForLaudo(examesList, examesNaoListados) {
    console.log("DEBUG(displayPatientExamsForLaudo): Carregando exames para preenchimento de laudo.");
    const examResultsContainer = document.getElementById('examResultsContainer');
    examResultsContainer.innerHTML = ''; // Limpa quaisquer exames anteriores

    const allExams = [];
    if (Array.isArray(examesList) && examesList.length > 0) {
        allExams.push(...examesList);
    }
    if (examesNaoListados && examesNaoListados.trim() !== '') {
        // Divide a string de exames não listados em um array, um por linha
        allExams.push(...examesNaoListados.split('\n').map(e => e.trim()).filter(e => e !== ''));
    }

    if (allExams.length === 0) {
        examResultsContainer.innerHTML = '<p>Nenhum exame para laudar neste protocolo.</p>';
        console.log("DEBUG(displayPatientExamsForLaudo): Nenhum exame para laudar.");
        return;
    }

    // Cria um item de laudo para cada exame
    allExams.forEach((examName, index) => {
        const examId = `exam-${index}-${examName.replace(/[^a-zA-Z0-9]/g, '')}`; // ID único para o elemento
        const examItemHTML = `
            <div class="exam-result-item read-only" data-exam-id="${examId}" data-exam-name="${examName}">
                <strong>${examName}</strong>
                <div class="result-row">
                    <input type="text" class="exam-result-value" value="" placeholder="Resultado" readonly>
                    <input type="text" class="exam-unit-value" value="" placeholder="Unidade" readonly>
                    <input type="text" class="exam-ref-value" value="" placeholder="Ref. (opcional)" readonly>
                </div>
                <div class="edit-button-container">
                    <button class="edit-exam-btn" data-action="edit">Editar</button>
                </div>
                <textarea class="exam-observation" rows="2" placeholder="Observações específicas para este exame." readonly></textarea>
            </div>
        `;
        examResultsContainer.insertAdjacentHTML('beforeend', examItemHTML);
        console.log(`DEBUG(displayPatientExamsForLaudo): Item de exame "${examName}" adicionado ao container.`);
    });

    // Re-configura os listeners de edição para os novos elementos criados
    setupExamResultItemEditing();
    console.log("DEBUG(displayPatientExamsForLaudo): Exames do paciente exibidos e listeners de edição re-configurados.");
}


// Seção 7: Lógica de Edição de Itens de Exame (reutilizado do exemplo HTML)
function setupExamResultItemEditing() {
    console.log("DEBUG(setupExamResultItemEditing): Configurando/reconfigurando listeners de edição para itens de exame.");
    const examResultItems = document.querySelectorAll('.exam-result-item');

    examResultItems.forEach(item => {
        const editButton = item.querySelector('.edit-exam-btn');
        const resultInputs = item.querySelectorAll('input, textarea.exam-observation'); // Seleciona todos os inputs e textareas dentro do item

        // Garante que o estado inicial (read-only) é aplicado, caso o item seja novo ou recarregado
        item.classList.add('read-only');
        resultInputs.forEach(input => input.setAttribute('readonly', true));
        editButton.textContent = 'Editar';
        editButton.dataset.action = 'edit';

        // Remove listeners antigos para evitar duplicação (se chamado múltiplas vezes)
        const oldListener = item.dataset.editListener;
        if (oldListener) {
            editButton.removeEventListener('click', window[oldListener]);
        }

        // Cria um novo listener com um nome único para este item
        const newListenerName = `handleEditSave-${item.dataset.examId}`;
        window[newListenerName] = () => {
            if (editButton.dataset.action === 'edit') {
                // Mudar para modo de edição
                item.classList.remove('read-only');
                resultInputs.forEach(input => input.removeAttribute('readonly'));
                editButton.textContent = 'Salvar';
                editButton.dataset.action = 'save';
                console.log(`DEBUG(setupExamResultItemEditing): Modo de edição habilitado para ${item.dataset.examName}`);
            } else {
                // Mudar para modo de visualização (simular salvar)
                item.classList.add('read-only');
                resultInputs.forEach(input => input.setAttribute('readonly', true));
                editButton.textContent = 'Editar';
                editButton.dataset.action = 'edit';
                console.log(`DEBUG(setupExamResultItemEditing): Campos de exame salvos (simulado) para ${item.dataset.examName}`);
                // Em uma implementação real, aqui você chamaria uma função para salvar
                // os resultados específicos deste exame no objeto selectedPatientData,
                // ou em uma estrutura temporária para salvar o laudo completo depois.
            }
        };
        editButton.addEventListener('click', window[newListenerName]);
        item.dataset.editListener = newListenerName; // Armazena o nome do listener para futura remoção
        console.log(`DEBUG(setupExamResultItemEditing): Listener adicionado para ${item.dataset.examName} com nome ${newListenerName}`);
    });
    console.log("DEBUG(setupExamResultItemEditing): Finalizada configuração/reconfiguração de listeners.");
}


// Seção 8: Funcionalidade Salvar Laudo (Esboço)
async function saveLaudo() {
    console.log("DEBUG(saveLaudo): Iniciando salvamento do laudo.");

    if (!selectedPatientData) {
        alert("Por favor, selecione um paciente antes de salvar o laudo.");
        console.warn("DEBUG(saveLaudo): Tentativa de salvar laudo sem paciente selecionado.");
        return;
    }

    if (typeof window.firestoreDb === 'undefined' || !window.firestoreDb) {
        alert("Banco de dados não inicializado. Não é possível salvar o laudo.");
        console.error("DEBUG(saveLaudo): Firestore DB não inicializado.");
        return;
    }

    // Coleta dos resultados de cada exame
    const examResults = [];
    const examResultItems = document.querySelectorAll('.exam-result-item');
    examResultItems.forEach(item => {
        const examName = item.dataset.examName;
        const resultValue = item.querySelector('.exam-result-value').value.trim();
        const unitValue = item.querySelector('.exam-unit-value').value.trim();
        const refValue = item.querySelector('.exam-ref-value').value.trim();
        const observation = item.querySelector('.exam-observation').value.trim();

        examResults.push({
            nomeExame: examName,
            resultado: resultValue,
            unidade: unitValue,
            referencia: refValue,
            observacaoExame: observation
        });
    });
    console.log("DEBUG(saveLaudo): Resultados dos exames coletados:", examResults);

    const observacoesLaudoGeral = document.getElementById('observacoesLaudoGeral').value.trim();
    console.log("DEBUG(saveLaudo): Observações gerais do laudo:", observacoesLaudoGeral);

    const laudoData = {
        patientId: selectedPatientData.id,
        protocolo: selectedPatientData.protocolo,
        nomePaciente: selectedPatientData.nome,
        cpfPaciente: selectedPatientData.cpf,
        examesResultados: examResults,
        observacoesGerais: observacoesLaudoGeral,
        dataEmissao: window.firebaseFirestoreServerTimestamp(), // Usa timestamp do servidor
        responsavelTecnico: {
            nome: document.getElementById('responsavelTecnicoNome').textContent.replace('Dr(a). ', ''),
            registro: document.getElementById('responsavelTecnicoRegistro').textContent.replace('CRBM/CRF ', '')
        }
    };
    console.log("DEBUG(saveLaudo): Objeto de dados do laudo para salvar:", laudoData);

    try {
        const laudosRef = window.firebaseFirestoreCollection(window.firestoreDb, 'laudos_resultados');
        const docRef = await window.firebaseFirestoreAddDoc(laudosRef, laudoData);
        alert(`Laudo salvo com sucesso! ID do laudo: ${docRef.id}`);
        console.log("DEBUG(saveLaudo): Laudo salvo com sucesso. ID:", docRef.id);
        // Após salvar, pode-se gerar o PDF ou limpar os campos
        // generatePdfLaudo(); // Talvez não seja automático, o usuário clica depois
    } catch (error) {
        console.error("DEBUG(saveLaudo): Erro ao salvar laudo no Firebase:", error);
        alert(`Erro ao salvar laudo: ${error.message}. Verifique o console.`);
    }
}


// Seção 9: Funcionalidade Gerar PDF do Laudo (Esboço)
function generatePdfLaudo() {
    console.log("DEBUG(generatePdfLaudo): Iniciando geração do PDF do laudo.");

    if (!selectedPatientData) {
        alert("Por favor, selecione um paciente antes de gerar o PDF do laudo.");
        console.warn("DEBUG(generatePdfLaudo): Tentativa de gerar PDF sem paciente selecionado.");
        return;
    }

    const { jsPDF } = window.jspdf;
    if (typeof jsPDF === 'undefined') {
        console.error("DEBUG(generatePdfLaudo): jsPDF não está carregado. Verifique a importação no HTML.");
        alert("Erro: A biblioteca de PDF não foi carregada. Tente recarregar a página.");
        return;
    }
    const doc = new jsPDF();
    let currentY = 15;
    const lineHeight = 7;
    const marginX = 20;
    const pageHeightLimit = 280; // Limite para adicionar rodapé e nova página

    console.log("DEBUG(generatePdfLaudo): jsPDF inicializado.");

    // Helper para adicionar rodapé e nova página com cabeçalho repetido
    const addPageWithHeader = (sectionTitle = null) => {
        doc.setFontSize(8);
        doc.text(`Laudo gerado em: ${document.getElementById('laudoGenerationDate').textContent}`, 105, 290, null, null, "center");
        doc.addPage();
        currentY = 15; // Reset Y para a nova página

        // Cabeçalho repetido
        doc.setFontSize(18);
        doc.text("Laboratório de Análises Clínicas CETEP/LNAB", 105, currentY, null, null, "center");
        currentY += 10;
        doc.setFontSize(10);
        doc.text(`Data: ${document.getElementById('laudoGenerationDate').textContent.split(' ')[0]} - Hora: ${document.getElementById('laudoGenerationDate').textContent.split(' ')[1]}`, 105, currentY, null, null, "center");
        currentY += 5;
        doc.setFontSize(8);
        doc.text("Endereço: 233, R. Mario Laérte, 163 - Centro, Alagoinhas - BA, 48005-098", 105, currentY, null, null, "center");
        currentY += 4;
        doc.text("Site: https://www.ceteplnab.com.br/", 105, currentY, null, null, "center");
        currentY += 6;
        doc.setLineWidth(0.5);
        doc.line(marginX, currentY, 190, currentY);
        currentY += 10;

        if (sectionTitle) {
            doc.setFontSize(14);
            doc.text(sectionTitle, marginX, currentY);
            currentY += 8;
            doc.setFontSize(11);
        }
    };

    // --- Cabeçalho Principal do Laudo ---
    doc.setFontSize(18);
    doc.text("Laboratório de Análises Clínicas CETEP/LNAB", 105, currentY, null, null, "center");
    currentY += 10;
    doc.setFontSize(10);
    doc.text(`Data: ${document.getElementById('laudoGenerationDate').textContent.split(' ')[0]} - Hora: ${document.getElementById('laudoGenerationDate').textContent.split(' ')[1]}`, 105, currentY, null, null, "center");
    currentY += 5;
    doc.setFontSize(8);
    doc.text("Endereço: 233, R. Mario Laérte, 163 - Centro, Alagoinhas - BA, 48005-098", 105, currentY, null, null, "center");
    currentY += 4;
    doc.text("Site: https://www.ceteplnab.com.br/", 105, currentY, null, null, "center");
    currentY += 6;
    doc.setLineWidth(0.5);
    doc.line(marginX, currentY, 190, currentY);
    currentY += 10;

    doc.setFontSize(16);
    doc.text("LAUDO DE RESULTADOS", 105, currentY, null, null, "center");
    currentY += 10;
    doc.setLineWidth(0.2);
    doc.line(marginX, currentY, 190, currentY);
    currentY += 10;
    console.log("DEBUG(generatePdfLaudo): Cabeçalho do PDF gerado.");

    // --- Dados do Paciente ---
    if (currentY + (lineHeight * 6) + 10 > pageHeightLimit) { addPageWithHeader("DADOS DO PACIENTE:"); }
    doc.setFontSize(12);
    doc.text("DADOS DO PACIENTE:", marginX, currentY);
    currentY += 8;
    doc.setFontSize(11);
    
    doc.text(`Protocolo: ${document.getElementById('patientProtocol').textContent}`, marginX + 5, currentY);
    currentY += lineHeight;
    doc.text(`Nome: ${document.getElementById('patientName').textContent}`, marginX + 5, currentY);
    currentY += lineHeight;
    doc.text(`CPF: ${document.getElementById('patientCPF').textContent}`, marginX + 5, currentY);
    currentY += lineHeight;
    doc.text(`Data de Nasc.: ${document.getElementById('patientDOB').textContent} (Idade: ${document.getElementById('patientAge').textContent})`, marginX + 5, currentY);
    currentY += lineHeight;
    doc.text(`Sexo: ${document.getElementById('patientGender').textContent}`, marginX + 5, currentY);
    currentY += lineHeight;
    doc.text(`Contato: ${document.getElementById('patientContact').textContent}`, marginX + 5, currentY);
    currentY += lineHeight;
    doc.text(`Endereço: ${document.getElementById('patientAddress').textContent}`, marginX + 5, currentY);
    
    currentY += 5;
    if (currentY + 10 > pageHeightLimit) { addPageWithHeader(); }
    doc.setLineWidth(0.2);
    doc.line(marginX, currentY, 190, currentY);
    currentY += 10;
    console.log("DEBUG(generatePdfLaudo): Dados do paciente adicionados ao PDF.");

    // --- Resultados dos Exames ---
    if (currentY + 20 > pageHeightLimit) { addPageWithHeader("RESULTADOS DOS EXAMES:"); }
    doc.setFontSize(12);
    doc.text("RESULTADOS DOS EXAMES:", marginX, currentY);
    currentY += 8;
    doc.setFontSize(10); // Fonte menor para os detalhes dos exames

    const examResultItems = document.querySelectorAll('.exam-result-item');
    if (examResultItems.length === 0) {
        if (currentY + lineHeight > pageHeightLimit) { addPageWithHeader(); }
        doc.text("Nenhum resultado de exame preenchido.", marginX + 5, currentY);
        currentY += lineHeight;
    } else {
        examResultItems.forEach((item, index) => {
            const examName = item.querySelector('strong').textContent;
            const resultValue = item.querySelector('.exam-result-value').value.trim();
            const unitValue = item.querySelector('.exam-unit-value').value.trim();
            const refValue = item.querySelector('.exam-ref-value').value.trim();
            const observation = item.querySelector('.exam-observation').value.trim();

            let examContentLines = [];
            examContentLines.push(`${examName}: ${resultValue} ${unitValue}`);
            if (refValue) examContentLines.push(`Ref.: ${refValue}`);
            if (observation) examContentLines.push(`Obs.: ${observation}`);

            const textHeight = examContentLines.length * lineHeight;
            if (currentY + textHeight + 5 > pageHeightLimit) { addPageWithHeader("RESULTADOS DOS EXAMES (Continuação):"); }

            examContentLines.forEach(line => {
                const splitText = doc.splitTextToSize(line, 170); // Largura para o texto
                doc.text(splitText, marginX + 5, currentY);
                currentY += splitText.length * lineHeight;
            });
            currentY += 2; // Espaço entre os exames
            console.log(`DEBUG(generatePdfLaudo): Exame "${examName}" adicionado ao PDF.`);
        });
    }

    currentY += 5;
    if (currentY + 10 > pageHeightLimit) { addPageWithHeader(); }
    doc.setLineWidth(0.2);
    doc.line(marginX, currentY, 190, currentY);
    currentY += 10;

    // --- Observações Gerais do Laudo ---
    const observacoesLaudoGeral = document.getElementById('observacoesLaudoGeral').value.trim();
    if (observacoesLaudoGeral) {
        if (currentY + 20 > pageHeightLimit) { addPageWithHeader("OBSERVAÇÕES GERAIS DO LAUDO:"); }
        doc.setFontSize(12);
        doc.text("OBSERVAÇÕES GERAIS DO LAUDO:", marginX, currentY);
        currentY += 8;
        doc.setFontSize(11);
        const splitText = doc.splitTextToSize(observacoesLaudoGeral, 170);
        
        splitText.forEach(line => {
            if (currentY + lineHeight > pageHeightLimit) { addPageWithHeader("OBSERVAÇÕES GERAIS DO LAUDO (Continuação):"); }
            doc.text(line, marginX + 5, currentY);
            currentY += lineHeight;
        });
        currentY += 5;
        if (currentY + 10 > pageHeightLimit) { addPageWithHeader(); }
        doc.setLineWidth(0.2);
        doc.line(marginX, currentY, 190, currentY);
        currentY += 10;
        console.log("DEBUG(generatePdfLaudo): Observações gerais adicionadas ao PDF.");
    }

    // --- Seção de Assinatura ---
    if (currentY + 50 > pageHeightLimit) { addPageWithHeader(); } // Garante espaço para a assinatura
    doc.setFontSize(10);
    currentY = Math.max(currentY, pageHeightLimit - 50); // Posiciona a assinatura mais ao final da página, se houver espaço
    doc.text("__________________________________________", 105, currentY, null, null, "center");
    currentY += 5;
    doc.text("Assinatura do Responsável Técnico", 105, currentY, null, null, "center");
    currentY += 5;
    doc.text(`Nome: ${document.getElementById('responsavelTecnicoNome').textContent}`, 105, currentY, null, null, "center");
    currentY += 5;
    doc.text(`Registro: ${document.getElementById('responsavelTecnicoRegistro').textContent}`, 105, currentY, null, null, "center");
    currentY += 8;
    doc.setFontSize(8);
    doc.text(`Laudo gerado em: ${document.getElementById('laudoGenerationDate').textContent}`, 105, currentY, null, null, "center");
    console.log("DEBUG(generatePdfLaudo): Seção de assinatura adicionada ao PDF.");

    // Finaliza e abre o PDF
    console.log("DEBUG(generatePdfLaudo): Geração do PDF concluída. Abrindo em nova janela.");
    try {
        doc.output('dataurlnewwindow', { filename: `Laudo_${selectedPatientData.nomePaciente.replace(/\s+/g, "_")}_${selectedPatientData.protocolo}.pdf` });
        alert("PDF do laudo gerado com sucesso! Verifique a nova aba para visualizar e imprimir.");
        console.log("DEBUG(generatePdfLaudo): PDF aberto em nova janela.");
    } catch (outputError) {
        console.error("DEBUG(generatePdfLaudo): Erro ao gerar ou abrir o PDF:", outputError);
        alert(`Erro ao gerar ou exibir o PDF: ${outputError.message}. Verifique o console.`);
    }
}

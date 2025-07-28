// laudo_scripts.js
// VERSÃO: 1.0.21 (laudo_scripts.js)
// CHANGELOG:
// - CORREÇÃO CRÍTICA: Implementado um bloco try-catch global na geração do PDF para capturar e reportar erros dentro do próprio documento PDF.
// - ADICIONADO: Seção de relatório de erro no PDF com detalhes da mensagem e pilha de rastreamento, caso ocorra uma falha.
// - CRÍTICO: Nesta versão 1.0.21, o laudo impresso nao exibe o nome do responsavel tecnico e local pra assinatura nem as observações gerais do laudo. Verificar se remoção de página vazia pode ser o interferente.


console.log("DEBUG(laudo_scripts): Script carregado e iniciando execução. Versão 1.0.21."); // INÍCIO DE DEPURAÇÃO GLOBAL

// Seção 1: Importações e Variáveis Globais
// As funções do Firebase são globalizadas em laudo_resultados.html.
// Importamos APENAS as funções de utilidade de sislab_utils.js que são exportadas corretamente.
// 'calcularIdade' não será importada, pois será reimplementada localmente.
import { formatDateTimeToDisplay, formatDateToDisplay, showError, clearError } from './sislab_utils.js';
import { EXAM_DETAILS } from './exames_ref.js'; // Importa EXAM_DETAILS do novo arquivo

console.log("DEBUG(laudo_scripts): Módulo sislab_utils.js importado. Verificando acessibilidade das funções:");
console.log("DEBUG(laudo_scripts): formatDateTimeToDisplay é tipo:", typeof formatDateTimeToDisplay);
console.log("DEBUG(laudo_scripts): formatDateToDisplay é tipo:", typeof formatDateToDisplay);
console.log("DEBUG(laudo_scripts): showError é tipo:", typeof showError);
console.log("DEBUG(laudo_scripts): clearError é tipo:", typeof clearError);

let selectedPatientData = null; // Armazena os dados do paciente atualmente selecionado
console.log("DEBUG(laudo_scripts): Seção 1 - Variáveis globais declaradas. selectedPatientData:", selectedPatientData);

// NOVO: Reimplementação local de calcularIdade e validarDataNascimento (copiado de script.js)
function calcularIdade(dataString) {
    console.log("DEBUG(calcularIdade - local): Calculando idade para data:", dataString);
    const hoje = new Date();
    const nascimento = new Date(dataString + 'T00:00:00');
    if (isNaN(nascimento.getTime()) || nascimento > hoje) {
        console.log("DEBUG(calcularIdade - local): Data de nascimento inválida ou no futuro.");
        return null;
    }

    let anos = hoje.getFullYear() - nascimento.getFullYear();
    let meses = hoje.getMonth() - nascimento.getMonth();

    if (hoje.getDate() < nascimento.getDate()) {
        meses--;
    }

    if (meses < 0) {
        meses += 12;
    }
    console.log(`DEBUG(calcularIdade - local): Idade calculada: ${anos} anos e ${meses} meses.`);
    return { anos: anos, meses: meses };
}

function validarDataNascimento(dataString) {
    console.log("DEBUG(validarDataNascimento - local): Validando data:", dataString);
    const nascimento = new Date(dataString + 'T00:00:00');
    const hoje = new Date();
    const isValid = !isNaN(nascimento.getTime()) && nascimento <= hoje;
    console.log("DEBUG(validarDataNascimento - local): Data válida?", isValid);
    return isValid;
}
console.log("DEBUG(laudo_scripts): Funções 'calcularIdade' e 'validarDataNascimento' reimplementadas localmente.");
console.log("DEBUG(laudo_scripts): calcularIdade (local) é tipo:", typeof calcularIdade);

// A constante EXAM_DETAILS foi movida para exames_ref.js

// Seção 2: Event Listeners Iniciais (DOMContentLoaded)
document.addEventListener('DOMContentLoaded', () => {
    console.log("DEBUG(laudo_scripts): DOMContentLoaded - Iniciando setup da página de Emissão de Laudos.");

    // Verificação de inicialização do Firebase Firestore
    if (typeof window.firestoreDb === 'undefined' || !window.firestoreDb) {
        console.error("DEBUG(laudo_scripts): ERRO FATAL: window.firestoreDb não está definido. Firebase não inicializado corretamente no HTML.");
        alert("Erro: O banco de dados Firebase não foi inicializado corretamente. Verifique o console para detalhes.");
        return; // Impede a continuação da execução se o DB não estiver disponível
    } else {
        console.log("DEBUG(laudo_scripts): Firebase Firestore acessível via window.firestoreDb. Prosseguindo.");
    }

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
        console.error("DEBUG(laudo_scripts): Elemento 'searchPatientBtn' não encontrado. Verifique o HTML.");
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', clearSearchAndPatientData);
        console.log("DEBUG(laudo_scripts): Event listener para 'clearSearchBtn' adicionado.");
    } else {
        console.error("DEBUG(laudo_scripts): Elemento 'clearSearchBtn' não encontrado. Verifique o HTML.");
    }

    if (saveLaudoBtn) {
        saveLaudoBtn.addEventListener('click', saveLaudo);
        console.log("DEBUG(laudo_scripts): Event listener para 'saveLaudoBtn' adicionado.");
    } else {
        console.error("DEBUG(laudo_scripts): Elemento 'saveLaudoBtn' não encontrado. Verifique o HTML.");
    }

    if (generatePdfLaudoBtn) {
        generatePdfLaudoBtn.addEventListener('click', generatePdfLaudo);
        console.log("DEBUG(laudo_scripts): Event listener para 'generatePdfLaudoBtn' adicionado.");
    } else {
        console.error("DEBUG(laudo_scripts): Elemento 'generatePdfLaudoBtn' não encontrado. Verifique o HTML.");
    }

    if (clearLaudoFieldsBtn) {
        clearLaudoFieldsBtn.addEventListener('click', clearAllLaudoFields);
        console.log("DEBUG(laudo_scripts): Event listener para 'clearLaudoFieldsBtn' adicionado.");
    } else {
        console.error("DEBUG(laudo_scripts): Elemento 'clearLaudoFieldsBtn' não encontrado. Verifique o HTML.");
    }

    // Adiciona listener para a tecla 'Enter' no campo de busca
    if (searchQueryInput) {
        searchQueryInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // Evita que o formulário seja enviado, se houver
                console.log("DEBUG(laudo_scripts): Tecla 'Enter' pressionada no campo de busca. Chamando searchPatient().");
                searchPatient();
            }
        });
        console.log("DEBUG(laudo_scripts): Event listener 'keypress' (Enter) para 'searchQuery' adicionado.");
    } else {
        console.error("DEBUG(laudo_scripts): Elemento 'searchQueryInput' não encontrado. Verifique o HTML.");
    }
    
    console.log("DEBUG(laudo_scripts): DOMContentLoaded - Setup inicial concluído.");
});


// Seção 3: Funções Auxiliares de UI/Validação
function clearSearchAndPatientData() {
    console.log("DEBUG(clearSearchAndPatientData): Iniciando limpeza de busca e dados do paciente.");
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

    // Limpa os campos de Responsável Técnico
    document.getElementById('responsavelTecnicoNome').value = '';
    document.getElementById('responsavelTecnicoRegistro').value = '';

    console.log("DEBUG(clearSearchAndPatientData): Limpeza de busca e dados do paciente concluída.");
}

function clearPatientDisplay() {
    console.log("DEBUG(clearPatientData): Iniciando limpeza de campos de exibição do paciente.");
    document.getElementById('patientProtocol').textContent = '';
    document.getElementById('patientName').textContent = '';
    document.getElementById('patientCPF').textContent = '';
    document.getElementById('patientAge').textContent = '';
    document.getElementById('patientDOB').textContent = '';
    document.getElementById('patientGender').textContent = '';
    document.getElementById('patientContact').textContent = '';
    document.getElementById('patientAddress').textContent = '';
    console.log("DEBUG(clearPatientData): Limpeza de campos de exibição do paciente concluída.");
}

function clearAllLaudoFields() {
    console.log("DEBUG(clearAllLaudoFields): Iniciando limpeza de TODOS os campos do laudo.");
    clearSearchAndPatientData(); // Reutiliza a função para limpar busca e dados do paciente
    console.log("DEBUG(clearAllLaudoFields): Limpeza de todos os campos do laudo concluída.");
    alert("Todos os campos do laudo foram limpos.");
}

// Função auxiliar para padronizar CPF para busca no banco de dados (sem máscara)
function formatarCPFParaBusca(cpfComMascara) {
    console.log("DEBUG(formatarCPFParaBusca): Formatando CPF para busca:", cpfComMascara);
    if (!cpfComMascara) {
        console.log("DEBUG(formatarCPFParaBusca): CPF para busca é vazio.");
        return '';
    }
    const cpfLimpo = cpfComMascara.replace(/\D/g, ''); // Remove todos os caracteres não-dígitos
    console.log("DEBUG(formatarCPFParaBusca): CPF formatado para busca:", cpfLimpo);
    return cpfLimpo;
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

    console.log(`DEBUG(searchPatient): Termo de busca atual: "${searchQuery}"`);

    // Verifica se o Firestore está inicializado (checagem redundante para segurança)
    if (typeof window.firestoreDb === 'undefined' || !window.firestoreDb) {
        searchResultStatus.textContent = 'Erro: Banco de dados não inicializado.';
        alert("Erro: O banco de dados não está inicializado. Verifique a configuração do Firebase no HTML.");
        console.error("DEBUG(searchPatient): Firestore DB não inicializado ou disponível ao tentar buscar.");
        return;
    }

    try {
        const historicoRef = window.firebaseFirestoreCollection(window.firestoreDb, 'historico');
        let queryConstraints = [];

        // Tenta identificar o tipo de busca
        const isProtocol = /^\d{4}-\d{8}$/.test(searchQuery); // Ex: 0001-15301707
        const isCpf = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(searchQuery) || /^\d{11}$/.test(searchQuery.replace(/\D/g, '')); // Com ou sem máscara
        
        console.log(`DEBUG(searchPatient): Tentativa de identificar tipo de busca para "${searchQuery}": isProtocol=${isProtocol}, isCpf=${isCpf}`);

        if (!searchQuery) {
            // Se o campo de busca estiver vazio, carrega todos os históricos (similar a mostrarHistorico do index.html)
            console.log("DEBUG(searchPatient): Termo de busca vazio detectado. Carregando TODO o histórico por 'protocolo' (desc).");
            queryConstraints.push(window.firebaseFirestoreOrderBy('protocolo', 'desc')); // Ordena para pegar os mais recentes primeiro
        } else if (isProtocol) {
            console.log(`DEBUG(searchPatient): Busca identificada como Protocolo: "${searchQuery}".`);
            queryConstraints.push(window.firebaseFirestoreWhere('protocolo', '==', searchQuery));
        } else if (isCpf) {
            const cpfLimpo = formatarCPFParaBusca(searchQuery);
            console.log(`DEBUG(searchPatient): Busca identificada como CPF. CPF limpo para consulta: "${cpfLimpo}".`);
            queryConstraints.push(window.firebaseFirestoreWhere('cpf', '==', cpfLimpo));
        } else {
            // Busca por nome ou parte do nome. Firestore não suporta 'contains' diretamente para texto sem índices específicos.
            // A melhor abordagem é buscar tudo ordenado por nome e filtrar em memória para 'contains'.
            console.log(`DEBUG(searchPatient): Busca por nome/termo genérico: "${searchQuery}". Realizando busca ampla e filtro em memória.`);
            // Adicionamos um orderBy por nome para otimizar o filtro em memória, e para que o Firestore não reclame de falta de ordenação.
            queryConstraints.push(window.firebaseFirestoreOrderBy('nome', 'asc')); 
        }

        // Constrói a query final
        const q = window.firebaseFirestoreQuery(historicoRef, ...queryConstraints);
        console.log("DEBUG(searchPatient): Query Firebase construída:", q);

        console.log("DEBUG(searchPatient): Executando getDocs no Firebase Firestore...");
        const querySnapshot = await window.firebaseFirestoreGetDocs(q);
        let patients = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`DEBUG(searchPatient): Query executada. ${patients.length} pacientes encontrados no Firestore antes do filtro em memória.`);
        // console.log("DEBUG(searchPatient): Dados brutos dos pacientes retornados:", patients); // Descomente para ver todos os dados brutos

        let filteredPatients = patients;

        // Se a busca não foi por protocolo ou CPF exato E há um termo de busca, aplica filtro de nome/protocolo/CPF parcial em memória
        if (!isProtocol && !isCpf && searchQuery) {
            const lowerCaseSearchQuery = searchQuery.toLowerCase();
            const cpfSearchPart = formatarCPFParaBusca(lowerCaseSearchQuery);

            filteredPatients = patients.filter(p => 
                (p.nome && p.nome.toLowerCase().includes(lowerCaseSearchQuery)) ||
                (p.protocolo && p.protocolo.toLowerCase().includes(lowerCaseSearchQuery)) ||
                (p.cpf && formatarCPFParaCpfParaBusca(p.cpf).includes(cpfSearchPart))
            );
            console.log(`DEBUG(searchPatient): ${filteredPatients.length} pacientes após filtro de nome/protocolo/CPF parcial em memória.`);
        }

        if (filteredPatients.length === 0) {
            searchResultStatus.textContent = 'Nenhum paciente encontrado com o termo de busca.';
            console.log("DEBUG(searchPatient): Nenhum paciente encontrado após todos os filtros.");
            return;
        }

        searchResultStatus.textContent = `Encontrados ${filteredPatients.length} paciente(s). Selecione abaixo:`;
        patientResultsList.innerHTML = ''; // Limpa lista de resultados para preencher
        
        filteredPatients.forEach(patient => {
            const li = document.createElement('li');
            li.textContent = `${patient.nome} (CPF: ${patient.cpf || 'N/D'}, Protocolo: ${patient.protocolo || 'N/D'})`;
            li.style.cursor = 'pointer';
            li.style.padding = '8px';
            li.style.borderBottom = '1px solid #eee';
            li.addEventListener('click', () => selectPatient(patient.id));
            patientResultsList.appendChild(li);
        });
        console.log("DEBUG(searchPatient): Resultados da busca exibidos na lista. Final da função searchPatient.");

    } catch (error) {
        searchResultStatus.textContent = 'Erro ao buscar paciente. Verifique o console.';
        console.error("DEBUG(searchPatient): Erro FATAL ao buscar paciente no Firebase:", error);
        alert(`Erro ao buscar paciente: ${error.message}. Verifique o console para detalhes e considere criar um índice no Firebase, se sugerido pelo erro.`);
    }
}

// Seção 5: Seleção e Exibição de Dados do Paciente
async function selectPatient(patientId) {
    console.log(`DEBUG(selectPatient): Iniciando seleção de paciente com ID "${patientId}".`);
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
    document.getElementById('observacoesLaudoGeral').value = ''; // Limpa observações gerais

    if (typeof window.firestoreDb === 'undefined' || !window.firestoreDb) {
        console.error("DEBUG(selectPatient): Firestore DB não inicializado. Não é possível carregar paciente.");
        alert("Erro: Banco de dados não inicializado para carregar paciente.");
        return;
    }

    try {
        const docRef = window.firebaseFirestoreDoc(window.firestoreDb, 'historico', patientId);
        console.log(`DEBUG(selectPatient): Buscando documento do paciente no Firestore para ID: "${patientId}".`);
        const docSnap = await window.firebaseFirestoreGetDoc(docRef);

        if (!docSnap.exists) {
            alert("Paciente não encontrado no banco de dados.");
            console.warn("DEBUG(selectPatient): Documento do paciente não encontrado para ID:", patientId);
            clearSearchAndPatientData();
            return;
        }

        selectedPatientData = { id: docSnap.id, ...docSnap.data() };
        console.log("DEBUG(selectPatient): Dados do paciente carregados do Firestore (coleção 'historico'):", selectedPatientData);

        // NOVO: Buscar o último laudo salvo para este paciente
        const laudosRef = window.firebaseFirestoreCollection(window.firestoreDb, 'laudos_resultados');
        const qLaudo = window.firebaseFirestoreQuery(
            laudosRef,
            window.firebaseFirestoreWhere('patientId', '==', patientId), // Ou 'protocolo', se preferir
            window.firebaseFirestoreOrderBy('dataEmissao', 'desc'),
            window.firebaseFirestoreLimit(1)
        );
        console.log(`DEBUG(selectPatient): Buscando último laudo salvo para patientId: "${patientId}".`);
        const laudoSnapshot = await window.firebaseFirestoreGetDocs(qLaudo);
        let lastLaudoData = null;
        if (!laudoSnapshot.empty) {
            lastLaudoData = laudoSnapshot.docs[0].data();
            console.log("DEBUG(selectPatient): Último laudo salvo encontrado:", lastLaudoData);

            // Pré-preenche os campos de Responsável Técnico se houver dados salvos no laudo
            if (lastLaudoData.responsavelTecnico) {
                document.getElementById('responsavelTecnicoNome').value = lastLaudoData.responsavelTecnico.nome || '';
                document.getElementById('responsavelTecnicoRegistro').value = lastLaudoData.responsavelTecnico.registro || '';
                console.log("DEBUG(selectPatient): Campos de Responsável Técnico pré-preenchidos do laudo salvo.");
            }
        } else {
            console.log("DEBUG(selectPatient): Nenhum laudo salvo encontrado para este paciente. Campos de Responsável Técnico permanecerão vazios.");
            // Garante que os campos de RT estão limpos se não houver laudo salvo
            document.getElementById('responsavelTecnicoNome').value = '';
            document.getElementById('responsavelTecnicoRegistro').value = '';
        }

        displayPatientData(selectedPatientData);
        // Passar os exames do laudo salvo, se existirem, para pré-preencher
        displayPatientExamsForLaudo(
            selectedPatientData.exames,
            selectedPatientData.examesNaoListados,
            selectedPatientData.sexo,
            lastLaudoData ? lastLaudoData.examesResultados : null, // Novo parâmetro
            lastLaudoData ? lastLaudoData.observacoesGerais : '' // Preenche observações gerais
        );

        // Preenche a data de geração do laudo na seção de assinatura
        const now = new Date();
        const formattedDate = formatDateToDisplay(now);
        const formattedTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        document.getElementById('laudoGenerationDate').textContent = `${formattedDate} ${formattedTime}`;
        console.log(`DEBUG(selectPatient): Data e hora do laudo preenchidos: "${formattedDate} ${formattedTime}".`);

        window.scrollTo({ top: patientDisplaySection.offsetTop, behavior: 'smooth' });
        console.log("DEBUG(selectPatient): Paciente exibido e exames carregados. Final da função selectPatient.");

    } catch (error) {
        console.error("DEBUG(selectPatient): Erro FATAL ao carregar paciente selecionado:", error);
        alert(`Erro ao carregar dados do paciente: ${error.message}.`);
        clearSearchAndPatientData();
    }
}

function displayPatientData(patient) {
    console.log("DEBUG(displayPatientData): Iniciando exibição dos dados do paciente no formulário.");
    document.getElementById('patientProtocol').textContent = patient.protocolo || 'N/D';
    document.getElementById('patientName').textContent = patient.nome || 'N/D';
    // Reformatar CPF com máscara para exibição
    let cpfDisplay = patient.cpf ? patient.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : 'N/D';
    document.getElementById('patientCPF').textContent = cpfDisplay;
    console.log(`DEBUG(displayPatientData): Protocolo: ${patient.protocolo}, Nome: ${patient.nome}, CPF Display: ${cpfDisplay}`);

    // Calcular idade para exibição usando a função local
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
    console.log("DEBUG(displayPatientData): Campos de exibição do paciente preenchidos na UI. Final da função displayPatientData.");
}

// Seção 6: Preenchimento Dinâmico dos Exames
// Corrigido para usar parâmetros padrão na assinatura da função, removendo o fallback redundante no corpo.
function displayPatientExamsForLaudo(examesList, examesNaoListados, patientGender, savedExamesResults = null, savedObservacoesGerais = '') {
    console.log("DEBUG(displayPatientExamsForLaudo): Iniciando carregamento de exames para preenchimento de laudo.");
    console.log("DEBUG(displayPatientExamsForLaudo): Exames da lista (iniciais):", examesList);
    console.log("DEBUG(displayPatientExamsForLaudo): Exames não listados (texto):", examesNaoListados);
    console.log("DEBUG(displayPatientExamsForLaudo): Sexo do paciente:", patientGender);
    console.log("DEBUG(displayPatientExamsForLaudo): Dados de laudos salvos passados (savedExamesResults):", savedExamesResults);
    console.log("DEBUG(displayPatientExamsForLaudo): Observações gerais salvas passadas (savedObservacoesGerais):", savedObservacoesGerais);

    const examResultsContainer = document.getElementById('examResultsContainer');
    examResultsContainer.innerHTML = ''; // Limpa quaisquer exames anteriores

    // Preenche as observações gerais, se houverem
    const defaultObsText = "As informações contidas neste laudo não substituem a realização de exames laboratoriais. Para sua segurança e precisão nos resultados, recomenda-se a consulta a um laboratório de sua confiança.";
    document.getElementById('observacoesLaudoGeral').value = savedObservacoesGerais || defaultObsText;
    console.log("DEBUG(displayPatientExamsForLaudo): Observações gerais do laudo preenchidas. Valor: ", document.getElementById('observacoesLaudoGeral').value);


    const allExams = [];
    if (Array.isArray(examesList) && examesList.length > 0) {
        allExams.push(...examesList);
        console.log(`DEBUG(displayPatientExamsForLaudo): Adicionados ${examesList.length} exames da lista principal.`);
    }
    if (examesNaoListados && examesNaoListados.trim() !== '') {
        // Divide a string de exames não listados em um array, um por linha
        const nonListedArray = examesNaoListados.split('\n').map(e => e.trim()).filter(e => e !== '');
        allExams.push(...nonListedArray);
        console.log(`DEBUG(displayPatientExamsForLaudo): Adicionados ${nonListedArray.length} exames não listados.`);
    }

    if (allExams.length === 0) {
        examResultsContainer.innerHTML = '<p>Nenhum exame para laudar neste protocolo.</p>';
        console.log("DEBUG(displayPatientExamesForLaudo): Nenhum exame para laudar neste protocolo. Container de exames vazio.");
        return;
    }

    console.log(`DEBUG(displayPatientExamesForLaudo): Total de exames a processar: ${allExams.length}.`);

    // Converte savedExamesResults para um mapa para busca eficiente
    const savedResultsMap = new Map();
    if (Array.isArray(savedExamesResults)) {
        savedExamesResults.forEach(exam => {
            if (exam.nomeExame) {
                savedResultsMap.set(exam.nomeExame, exam);
            }
        });
        console.log("DEBUG(displayPatientExamesForLaudo): Mapa de resultados salvos criado:", savedResultsMap);
    }


    // Cria um item de laudo para cada exame
    allExams.forEach((examName, index) => {
        console.log(`DEBUG(displayPatientExamsForLaudo): Processando exame [${index}]: "${examName}".`);
        
        // Tentar obter dados salvos para este exame
        const savedExamData = savedResultsMap.get(examName);
        console.log(`DEBUG(displayPatientExamsForLaudo): Dados salvos para "${examName}":`, savedExamData);

        const examDetail = EXAM_DETAILS[examName] || {};
        console.log("DEBUG(displayPatientExamesForLaudo): Detalhes do EXAM_DETAILS para este exame (examDetail):", examDetail);

        // Prioriza valores salvos, senão usa os defaults do EXAM_DETAILS
        const initialResultValue = savedExamData ? savedExamData.resultado : "";
        const initialUnitValue = savedExamData ? savedExamData.unidade : (examDetail.defaultUnit || 'N/A'); // Corrected from savedData.unidade
        const initialObservation = savedExamData ? savedExamData.observacaoExame : "";
        
        let initialReferenceText = savedExamData ? savedExamData.referencia : 'N/A'; // Prioriza salvo, senão calcula
        if (!savedExamData && examDetail.referenceRange) { // Se não houver salvo e tiver ref no EXAM_DETAILS
            const genderKey = patientGender === 'Masculino' ? 'male' : (patientGender === 'Feminino' ? 'female' : 'general');
            if (examDetail.referenceRange[genderKey]) {
                initialReferenceText = examDetail.referenceRange[genderKey];
                console.log(`DEBUG(displayPatientExamsForLaudo): Ref. específica para sexo (${genderKey}) para "${examName}": "${initialReferenceText}".`);
            } else if (examDetail.referenceRange.general) {
                initialReferenceText = examDetail.referenceRange.general;
                console.log(`DEBUG(displayPatientExamsForLaudo): Ref. geral utilizada para "${examName}": "${initialReferenceText}".`);
            }
        }
        console.log(`DEBUG(displayPatientExamsForLaudo): Final initialUnitValue para "${examName}": "${initialUnitValue}".`);
        console.log(`DEBUG(displayPatientExamsForLaudo): Final initialReferenceText para "${examName}": "${initialReferenceText}".`);
        

        let resultInputField;
        if (examDetail.inputType === 'select' && examDetail.options && examDetail.options.length > 0) {
            console.log(`DEBUG(displayPatientExamsForLaudo): Criando SELECT para exame "${examName}" com opções:`, examDetail.options);
            resultInputField = `<select class="exam-result-value" readonly disabled>`;
            examDetail.options.forEach(option => {
                const selectedAttr = (option === initialResultValue) ? 'selected' : '';
                resultInputField += `<option value="${option}" ${selectedAttr}>${option}</option>`;
            });
            resultInputField += `</select>`;
        } else {
            console.log(`DEBUG(displayPatientExamesForLaudo): Criando INPUT TEXT para exame "${examName}".`);
            resultInputField = `<input type="text" class="exam-result-value" value="${initialResultValue}" placeholder="Resultado" readonly>`;
        }

        const examId = `exam-${index}-${examName.replace(/[^a-zA-Z0-9]/g, '')}`; // ID único para o elemento
        const examItemHTML = `
            <div class="exam-result-item read-only" data-exam-id="${examId}" data-exam-name="${examName}">
                <strong>${examName}</strong>
                <div class="result-row">
                    ${resultInputField}
                    <input type="text" class="exam-unit-value" value="${initialUnitValue}" placeholder="Unidade" readonly>
                    <input type="text" class="exam-ref-value" value="${initialReferenceText}" placeholder="Ref. (opcional)" readonly>
                </div>
                <div class="edit-button-container">
                    <button class="edit-exam-btn" data-action="edit">Editar</button>
                </div>
                <textarea class="exam-observation" rows="2" placeholder="Observações específicas para este exame." readonly>${initialObservation}</textarea>
            </div>
        `;
        examResultsContainer.insertAdjacentHTML('beforeend', examItemHTML);
        console.log(`DEBUG(displayPatientExamsForLaudo): Item de exame "${examName}" (ID: ${examId}) adicionado ao container. HTML gerado para o campo resultado: ${resultInputField.substring(0,50)}...`);
    });

    // Re-configura os listeners de edição para os novos elementos criados
    setupExamResultItemEditing();
    console.log("DEBUG(displayPatientExamsForLaudo): Finalizada. Exames do paciente exibidos e listeners de edição re-configurados.");
}


// Seção 7: Lógica de Edição de Itens de Exame (reutilizado do exemplo HTML)
function setupExamResultItemEditing() {
    console.log("DEBUG(setupExamResultItemEditing): Iniciando configuração/reconfiguração de listeners de edição para itens de exame.");
    const examResultItems = document.querySelectorAll('.exam-result-item');
    console.log(`DEBUG(setupExamResultItemEditing): Encontrados ${examResultItems.length} itens de exame para configurar.`);

    examResultItems.forEach((item, index) => {
        const editButton = item.querySelector('.edit-exam-btn');
        // Seleciona todos os inputs, selects e textareas dentro do item
        const resultInputs = item.querySelectorAll('input, select, textarea.exam-observation'); 

        // Garante que o estado inicial (read-only) é aplicado, caso o item seja novo ou recarregado
        item.classList.add('read-only');
        resultInputs.forEach(input => input.setAttribute('readonly', true));
        // Para selects, a propriedade 'disabled' é usada para torná-los não editáveis
        item.querySelectorAll('select').forEach(select => select.setAttribute('disabled', true)); 
        editButton.textContent = 'Editar';
        editButton.dataset.action = 'edit';

        // Remove listeners antigos para evitar duplicação (se chamado múltiplas vezes)
        const oldListener = item.dataset.editListener;
        if (oldListener && typeof window[oldListener] === 'function') {
            editButton.removeEventListener('click', window[oldListener]);
            delete window[oldListener]; // Remove a função global para evitar vazamento de memória
            console.log(`DEBUG(setupExamResultItemEditing): Listener antigo "${oldListener}" removido para item ${index}.`);
        }

        // Cria um novo listener com um nome único para este item
        const newListenerName = `handleEditSave-${item.dataset.examId}`;
        window[newListenerName] = () => {
            console.log(`DEBUG(setupExamResultItemEditing): Botão 'Editar/Salvar' clicado para exame "${item.dataset.examName}". Ação atual: ${editButton.dataset.action}.`);
            if (editButton.dataset.action === 'edit') {
                // Mudar para modo de edição
                item.classList.remove('read-only');
                resultInputs.forEach(input => input.removeAttribute('readonly'));
                item.querySelectorAll('select').forEach(select => select.removeAttribute('disabled')); // Habilita selects
                editButton.textContent = 'Salvar';
                editButton.dataset.action = 'save';
                console.log(`DEBUG(setupExamResultItemEditing): Modo de edição HABILITADO para ${item.dataset.examName}.`);
            } else {
                // Mudar para modo de visualização (simular salvar)
                item.classList.add('read-only');
                resultInputs.forEach(input => input.setAttribute('readonly', true));
                item.querySelectorAll('select').forEach(select => select.setAttribute('disabled', true)); // Desabilita selects
                editButton.textContent = 'Editar';
                editButton.dataset.action = 'edit';
                console.log(`DEBUG(setupExamResultItemEditing): Campos de exame SALVOS (simulado) para ${item.dataset.examName}.`);
                // Em uma implementação real, aqui você chamaria uma função para salvar
                // os resultados específicos deste exame no objeto selectedPatientData,
                // ou em uma estrutura temporária para salvar o laudo completo depois.
            }
        };
        editButton.addEventListener('click', window[newListenerName]);
        item.dataset.editListener = newListenerName; // Armazena o nome do listener para futura remoção
        console.log(`DEBUG(setupExamResultItemEditing): Listener novo adicionado para "${item.dataset.examName}" com nome "${newListenerName}".`);
    });
    console.log("DEBUG(setupExamResultItemEditing): Finalizada configuração/reconfiguração de listeners.");
}


// Seção 8: Funcionalidade Salvar Laudo (Esboço)
async function saveLaudo() {
    console.log("DEBUG(saveLaudo): Iniciando salvamento do laudo.");

    if (!selectedPatientData) {
        alert("Por favor, selecione um paciente antes de salvar o laudo.");
        console.warn("DEBUG(saveLaudo): Tentativa de salvar laudo sem paciente selecionado. Ação abortada.");
        return;
    }

    if (typeof window.firestoreDb === 'undefined' || !window.firestoreDb) {
        alert("Banco de dados não inicializado. Não é possível salvar o laudo.");
        console.error("DEBUG(saveLaudo): Firestore DB não inicializado. Ação abortada.");
        return;
    }

    // Coleta dos resultados de cada exame
    const examResults = [];
    const examResultItems = document.querySelectorAll('.exam-result-item');
    console.log(`DEBUG(saveLaudo): Coletando resultados de ${examResultItems.length} itens de exame.`);
    examResultItems.forEach((item, index) => {
        const examName = item.dataset.examName;
        // Pega o valor do input ou do select
        const resultInput = item.querySelector('.exam-result-value');
        const resultValue = resultInput ? resultInput.value.trim() : ''; // Garante que o elemento existe
        const unitValue = item.querySelector('.exam-unit-value')?.value.trim() || ''; // Optional chaining
        const refValue = item.querySelector('.exam-ref-value')?.value.trim() || ''; // Optional chaining
        const observation = item.querySelector('.exam-observation')?.value.trim() || ''; // Optional chaining

        examResults.push({
            nomeExame: examName,
            resultado: resultValue,
            unidade: unitValue,
            referencia: refValue,
            observacaoExame: observation
        });
        console.log(`DEBUG(saveLaudo): Exame [${index}] - Nome: "${examName}", Resultado: "${resultValue}", Unidade: "${unitValue}".`);
    });
    console.log("DEBUG(saveLaudo): Resultados dos exames coletados:", examResults);

    const observacoesLaudoGeral = document.getElementById('observacoesLaudoGeral').value.trim();
    console.log("DEBUG(saveLaudo): Observações gerais do laudo:", observacoesLaudoGeral);

    const laudoData = {
        patientId: selectedPatientData.id,
        protocolo: selectedPatientData.protocolo,
        nomePaciente: selectedPatientData.nome, // Ensure this matches Firestore (selectedPatientData.nome)
        cpfPaciente: selectedPatientData.cpf,
        examesResultados: examResults,
        observacoesGerais: observacoesLaudoGeral,
        dataEmissao: window.firebaseFirestoreServerTimestamp(), // Usa timestamp do servidor
        responsavelTecnico: {
            nome: document.getElementById('responsavelTecnicoNome').value.trim() || '', // Lendo do input
            registro: document.getElementById('responsavelTecnicoRegistro').value.trim() || '' // Lendo do input
        }
    };
    console.log("DEBUG(saveLaudo): Objeto de dados do laudo para salvar no Firebase:", laudoData);

    try {
        const laudosRef = window.firebaseFirestoreCollection(window.firestoreDb, 'laudos_resultados');
        console.log("DEBUG(saveLaudo): Adicionando documento à coleção 'laudos_resultados'.");
        const docRef = await window.firebaseFirestoreAddDoc(laudosRef, laudoData);
        alert(`Laudo salvo com sucesso! ID do laudo: ${docRef.id}`);
        console.log("DEBUG(saveLaudo): Laudo salvo com sucesso. ID do documento Firebase:", docRef.id);
    } catch (error) {
        console.error("DEBUG(saveLaudo): Erro FATAL ao salvar laudo no Firebase:", error);
        alert(`Erro ao salvar laudo: ${error.message}. Verifique o console.`);
    } finally {
        console.log("DEBUG(saveLaudo): Final do processo de salvamento do laudo.");
    }
}


// Function to sanitize text for PDF (ADD THIS NEW FUNCTION)
function sanitizePdfText(text) {
    if (typeof text !== 'string') return text;
    return text.replace(/[$~]/g, ''); // Remove $ and ~ characters
}


// Seção 9: Funcionalidade Gerar PDF do Laudo (Esboço)
function generatePdfLaudo() {
    console.log("DEBUG(generatePdfLaudo): Iniciando geração do PDF do laudo.");

    if (!selectedPatientData) {
        console.warn("DEBUG(generatePdfLaudo): Paciente não selecionado. Não é possível gerar PDF."); // Log to confirm this specific warning path
        alert("Por favor, selecione um paciente antes de gerar o PDF do laudo.");
        console.warn("DEBUG(generatePdfLaudo): Tentativa de gerar PDF sem paciente selecionado. Ação abortada.");
        return;
    }
    console.log("DEBUG(generatePdfLaudo): selectedPatientData está presente. Prosseguindo com a geração do PDF.");

    const { jsPDF } = window.jspdf;
    if (typeof jsPDF === 'undefined') {
        console.error("DEBUG(generatePdfLaudo): jsPDF não está carregado. Verifique a importação no HTML. Ação abortada.");
        alert("Erro: A biblioteca de PDF não foi carregada. Tente recarregar a página.");
        return;
    }
    console.log("DEBUG(generatePdfLaudo): jsPDF library loaded successfully.");
    const doc = new jsPDF();
    let currentY = 15;
    const lineHeight = 7;
    const marginX = 20;
    const pageHeightLimit = 280; // Limite para adicionar rodapé e nova página

    // Variables for error logging
    let pdfGenerationError = null; // To store any error caught during PDF generation

    // Get responsible technician data from inputs (populated from saved laudo or manual input)
    const responsavelNome = document.getElementById('responsavelTecnicoNome').value.trim();
    const responsavelRegistro = document.getElementById('responsavelTecnicoRegistro').value.trim();
    const laudoDate = document.getElementById('laudoGenerationDate').textContent;


    console.log("DEBUG(generatePdfLaudo): jsPDF inicializado.");

    // Helper para adicionar rodapé e nova página com cabeçalho repetido
    const handlePageBreakAndHeader = (docInstance, yPosition, sectionTitle, responsavelNome, responsavelRegistro, laudoDate) => {
        console.log(`DEBUG(handlePageBreakAndHeader): Adicionando rodapé e nova página. yPosition atual: ${yPosition}.`);
        // Add footer to the current page (before adding a new one)
        docInstance.setFontSize(9);
        const footerText = `Liberado por: Dr(a). ${responsavelNome || 'N/D'}${responsavelRegistro ? `, CRF/CRBM: ${responsavelRegistro}` : ''}`;
        docInstance.text(footerText, 105, pageHeightLimit + 20, null, null, "center");

        docInstance.addPage();
        yPosition = 15; // Reset Y for the new page

        // Re-draw standard Lab Header on the new page
        docInstance.setFontSize(18);
        docInstance.text("Laboratório de Análises Clínicas CETEP/LNAB", 105, yPosition, null, null, "center");
        yPosition += 10;
        docInstance.setFontSize(10);
        docInstance.text(`Data: ${laudoDate.split(' ')[0]} - Hora: ${laudoDate.split(' ')[1]}`, 105, yPosition, null, null, "center");
        yPosition += 5;
        docInstance.setFontSize(8);
        docInstance.text("Endereço: 233, R. Mario Laérte, 163 - Centro, Alagoinhas - BA, 48005-098", 105, yPosition, null, null, "center");
        yPosition += 4;
        docInstance.text("Site: https://www.ceteplnab.com.br/", 105, yPosition, null, null, "center");
        yPosition += 6;
        docInstance.setLineWidth(0.5);
        docInstance.line(marginX, yPosition, 190, yPosition);
        yPosition += 10;

        if (sectionTitle) {
            docInstance.setFontSize(14);
            docInstance.text(sectionTitle, marginX, yPosition);
            yPosition += 8;
            docInstance.setFontSize(11);
        }
        return yPosition;
    };

    try { // START OF GLOBAL TRY BLOCK
        // --- Initial Page Header and Main Title ---
        // Manually draw the Lab Header on the first page (no doc.addPage() here)
        doc.setFontSize(18);
        doc.text("Laboratório de Análises Clínicas CETEP/LNAB", 105, currentY, null, null, "center");
        currentY += 10;
        doc.setFontSize(10);
        doc.text(`Data: ${laudoDate.split(' ')[0]} - Hora: ${laudoDate.split(' ')[1]}`, 105, currentY, null, null, "center");
        currentY += 5;
        doc.setFontSize(8);
        doc.text("Endereço: 233, R. Mario Laérte, 163 - Centro, Alagoinhas - BA, 48005-098", 105, currentY, null, null, "center");
        currentY += 4;
        doc.text("Site: https://www.ceteplnab.com.br/", 105, currentY, null, null, "center");
        currentY += 6;
        doc.setLineWidth(0.5);
        // REMOVED: doc.line(marginX, currentY, 190, currentY); // This line was causing the extra separator
        // REMOVED: currentY += 10; // Corresponding Y adjustment removed

        // Main document title "RESULTADOS" between lines
        currentY += 10; // Space before the first separator line for the title
        doc.setLineWidth(0.2); // Thinner line for this block
        doc.line(marginX, currentY, 190, currentY); // First separator line
        currentY += 5; // Small space
        doc.setFontSize(16);
        doc.text("RESULTADOS", 105, currentY, null, null, "center"); // Updated main title
        currentY += 5; // Small space
        doc.setLineWidth(0.2);
        doc.line(marginX, currentY, 190, currentY); // Second separator line
        currentY += 10; // Space after the block

        // --- Dados do Paciente ---
        console.log("DEBUG(generatePdfLaudo): Adicionando seção 'DADOS DO PACIENTE'.");
        // Check for page break BEFORE drawing the section title and content
        if (currentY + (lineHeight * 6) + 10 > pageHeightLimit) { 
            currentY = handlePageBreakAndHeader(doc, currentY, "DADOS DO PACIENTE:", responsavelNome, responsavelRegistro, laudoDate);
        }
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
        if (currentY + 10 > pageHeightLimit) { 
            currentY = handlePageBreakAndHeader(doc, currentY, null, responsavelNome, responsavelRegistro, laudoDate);
        }
        doc.setLineWidth(0.2);
        doc.line(marginX, currentY, 190, currentY);
        currentY += 10;
        console.log("DEBUG(generatePdfLaudo): Seção 'DADOS DO PACIENTE' adicionada.");

        // --- Resultados dos Exames ---
        console.log("DEBUG(generatePdfLaudo): Adicionando seção 'RESULTADOS'.");
        if (currentY + 20 > pageHeightLimit) { 
            currentY = handlePageBreakAndHeader(doc, currentY, "RESULTADOS:", responsavelNome, responsavelRegistro, laudoDate);
        }
        doc.setFontSize(12);
        doc.text("RESULTADOS:", marginX, currentY); // Changed title
        currentY += 8;
        doc.setFontSize(10); // Fonte menor para os detalhes dos exames

        const examResultItems = document.querySelectorAll('.exam-result-item');
        if (examResultItems.length === 0) {
            console.log("DEBUG(generatePdfLaudo): Nenhum item de exame encontrado para adicionar ao PDF.");
            if (currentY + lineHeight > pageHeightLimit) { 
                currentY = handlePageBreakAndHeader(doc, currentY, null, responsavelNome, responsavelRegistro, laudoDate);
            }
            doc.text("Nenhum resultado de exame preenchido.", marginX + 5, currentY);
            currentY += lineHeight;
        } else {
            console.log(`DEBUG(generatePdfLaudo): Processando ${examResultItems.length} itens de exame para o PDF.`);
            examResultItems.forEach((item, index) => {
                const examName = item.querySelector('strong').textContent;
                const resultValue = sanitizePdfText(item.querySelector('.exam-result-value').value.trim()); // Sanitize
                const unitValue = sanitizePdfText(item.querySelector('.exam-unit-value').value.trim());    // Sanitize
                const refValue = sanitizePdfText(item.querySelector('.exam-ref-value').value.trim());      // Sanitize
                const observation = sanitizePdfText(item.querySelector('.exam-observation').value.trim()); // Sanitize

                // Calculate height needed for this exam entry BEFORE drawing
                let requiredHeight = lineHeight; // for exam name and result line
                if (refValue) requiredHeight += lineHeight;
                if (observation) {
                    const splitObs = doc.splitTextToSize(`Obs.: ${observation}`, 170);
                    requiredHeight += (splitObs.length * lineHeight);
                }
                requiredHeight += 5; // Spacing after item

                // Check for page break before drawing this exam item
                if (currentY + requiredHeight > pageHeightLimit) {
                    currentY = handlePageBreakAndHeader(doc, currentY, "RESULTADOS (Continuação):", responsavelNome, responsavelRegistro, laudoDate);
                }

                doc.setFontSize(10); // Font size for exam details

                // Draw exam name
                doc.text(`${examName}:`, marginX + 5, currentY);

                // Draw result value in bold
                const examNameTextWidth = doc.getStringUnitWidth(`${examName}: `) * (doc.internal.getFontSize() / doc.internal.scaleFactor);
                doc.setFont(undefined, 'bold'); // Set bold font
                doc.text(`${resultValue} ${unitValue}`, marginX + 5 + examNameTextWidth, currentY);
                doc.setFont(undefined, 'normal'); // Reset to normal font
                currentY += lineHeight;

                // Ref value (already sanitized)
                if (refValue) {
                    doc.text(`Ref.: ${refValue}`, marginX + 5, currentY);
                    currentY += lineHeight;
                }

                // Observations (now with per-line page break check)
                if (observation) {
                    // The `Obs.:` prefix should be added here
                    const observationContent = `Obs.: ${observation}`;
                    const splitObsText = doc.splitTextToSize(observationContent, 170);
                    
                    // Check for page break BEFORE drawing each line of observation
                    for (let i = 0; i < splitObsText.length; i++) {
                        if (currentY + lineHeight > pageHeightLimit) {
                            currentY = handlePageBreakAndHeader(doc, currentY, "RESULTS (Continuação):", responsavelNome, responsavelRegistro, laudoDate);
                        }
                        doc.text(splitObsText[i], marginX + 5, currentY);
                        currentY += lineHeight;
                    }
                }

                currentY += 2; // Small space after exam content

                // Add dashed line between exams, but not after the last one
                if (index < examResultItems.length - 1) {
                    doc.setLineDash([2, 2]); // Sets dashed line style
                    doc.line(marginX, currentY, 190, currentY); // Draw the line
                    doc.setLineDash([]); // Resets line style to solid
                    currentY += 5; // Space after the dashed line
                }
            });
        }

        // After the loop, ensure the final currentY is correct and handle the overall section end line.
        let remainingHeightForResultsSection = 10; // Space for the final line and next section start
        if (currentY + remainingHeightForResultsSection > pageHeightLimit) {
            currentY = handlePageBreakAndHeader(doc, currentY, "RESULTADOS (Continuação):", responsavelNome, responsavelRegistro, laudoDate);
        }
        doc.setLineWidth(0.2);
        doc.line(marginX, currentY, 190, currentY); // End line for the whole "RESULTADOS" section
        currentY += 10; // Space after the block
        console.log("DEBUG(generatePdfLaudo): Seção 'RESULTADOS' concluída.");

        // --- Signature Section ---
        console.log("DEBUG(generatePdfLaudo): Adicionando seção de Assinatura do Responsável Técnico.");
        if (currentY + (lineHeight * 4) + 10 > pageHeightLimit) { 
            currentY = handlePageBreakAndHeader(doc, currentY, "ASSINATURA DO RESPONSÁVEL TÉCNICO:", responsavelNome, responsavelRegistro, laudoDate);
        }
        
        // Draw the signature line and text
        doc.setFontSize(10); // Adjust font size for signature block
        doc.text("__________________________________________", 105, currentY, null, null, "center");
        currentY += lineHeight;
        doc.text("Assinatura do Responsável Técnico", 105, currentY, null, null, "center");
        currentY += lineHeight;

        // Use the collected responsavelNome and responsavelRegistro, adding "Dr(a)."
        const nomeResponsavelText = `Nome: Dr(a). ${responsavelNome || 'N/D'}`;
        const registroResponsavelText = `Registro: ${responsavelRegistro ? `CRF/CRBM: ${responsavelRegistro}` : 'N/D'}`;

        doc.text(nomeResponsavelText, 105, currentY, null, null, "center");
        currentY += lineHeight;
        doc.text(registroResponsavelText, 105, currentY, null, null, "center");
        currentY += 5; // Extra space after signature block

        if (currentY + 10 > pageHeightLimit) { 
            currentY = handlePageBreakAndHeader(doc, currentY, null, responsavelNome, responsavelRegistro, laudoDate);
        }
        doc.setLineWidth(0.2);
        doc.line(marginX, currentY, 190, currentY);
        currentY += 10;
        console.log("DEBUG(generatePdfLaudo): Seção 'Assinatura do Responsável Técnico' adicionada.");


        // --- Observações Gerais do Laudo ---
        const observacoesLaudoGeral = document.getElementById('observacoesLaudoGeral').value.trim();
        console.log("DEBUG(generatePdfLaudo): Conteúdo de observacoesLaudoGeral antes de desenhar:", observacoesLaudoGeral); // Debug log
        if (observacoesLaudoGeral) {
            console.log("DEBUG(generatePdfLaudo): Adicionando seção 'OBSERVATIONS GERAIS DO LAUDO'.");
            if (currentY + 20 > pageHeightLimit) { 
                currentY = handlePageBreakAndHeader(doc, currentY, "OBSERVATIONS GERAIS DO LAUDO:", responsavelNome, responsavelRegistro, laudoDate);
            }
            doc.setFontSize(10); // Changed title font size (2 levels smaller than 12)
            doc.text("OBSERVATIONS GERAIS DO LAUDO:", marginX, currentY);
            currentY += 8;
            doc.setFontSize(9); // Changed text font size (2 levels smaller than 11)
            doc.setFont(undefined, 'italic'); // Set font to italic

            const observationContent = observacoesLaudoGeral; // No "Obs.:" prefix here, it's the general section
            const splitText = doc.splitTextToSize(observationContent, 170);
            
            for (let i = 0; i < splitText.length; i++) { // Loop per line
                if (currentY + lineHeight > pageHeightLimit) { 
                    currentY = handlePageBreakAndHeader(doc, currentY, "OBSERVATIONS GERAIS DO LAUDO (Continuação):", responsavelNome, responsavelRegistro, laudoDate);
                    doc.setFont(undefined, 'italic'); // Re-apply italic on new page
                    doc.setFontSize(9); // Re-apply font size on new page
                }
                doc.text(splitText[i], marginX + 5, currentY);
                currentY += lineHeight;
            }
            doc.setFont(undefined, 'normal'); // Reset font to normal after italic text
            currentY += 5;
            if (currentY + 10 > pageHeightLimit) { 
                currentY = handlePageBreakAndHeader(doc, currentY, null, responsavelNome, responsavelRegistro, laudoDate);
            }
            doc.setLineWidth(0.2);
            doc.line(marginX, currentY, 190, currentY); // Line after observations
        }

    } catch (error) { // CATCH BLOCK FOR PDF GENERATION ERRORS
        pdfGenerationError = error;
        console.error("DEBUG(generatePdfLaudo): Erro capturado durante a geração do PDF:", error);

        // Add a new page for the error report
        doc.addPage();
        currentY = 15; // Reset Y for error page

        doc.setFontSize(18);
        doc.text("ERRO NA GERAÇÃO DO LAUDO", 105, currentY, null, null, "center");
        currentY += 10;
        doc.setLineWidth(0.5);
        doc.line(marginX, currentY, 190, currentY);
        currentY += 15;

        doc.setFontSize(12);
        doc.text("Detalhes do Erro:", marginX, currentY);
        currentY += 8;
        doc.setFontSize(10);
        doc.setTextColor(200, 0, 0); // Red color for error text

        const errorMessage = `Mensagem: ${error.message}`;
        const errorStack = error.stack ? `Pilha: ${error.stack}` : 'Pilha de rastreamento não disponível.';

        let splitErrorMessage = doc.splitTextToSize(errorMessage, 170);
        for (let i = 0; i < splitErrorMessage.length; i++) {
            if (currentY + lineHeight > pageHeightLimit) {
                doc.addPage();
                currentY = 15;
            }
            doc.text(splitErrorMessage[i], marginX + 5, currentY);
            currentY += lineHeight;
        }

        currentY += 10; // Space before stack trace

        let splitErrorStack = doc.splitTextToSize(errorStack, 170);
        for (let i = 0; i < splitErrorStack.length; i++) {
            if (currentY + lineHeight > pageHeightLimit) {
                doc.addPage();
                currentY = 15;
            }
            doc.text(splitErrorStack[i], marginX + 5, currentY);
            currentY += lineHeight;
        }

        doc.setTextColor(0, 0, 0); // Reset text color to black
        doc.setFontSize(8);
        doc.text("O laudo pode estar incompleto devido a este erro.", marginX, currentY + 10);
        currentY += 20;

    } finally { // FINALLY BLOCK to ensure output is called
        console.log("DEBUG(generatePdfLaudo): Conteúdo do PDF gerado. Tentando abrir o PDF em nova janela.");
        try {
            // Ensure there isn't an extra blank page at the very end (existing logic)
            if (doc.internal.getNumberOfPages() > 1 && currentY <= (pageHeightLimit - 50)) { 
                 doc.deletePage(doc.internal.getNumberOfPages()); 
                 console.log("DEBUG(generatePdfLaudo): Página vazia no final removida, se existia.");
            }

            // Output the PDF
            doc.output('dataurlnewwindow', { filename: `Laudo_${selectedPatientData.nome.replace(/\s+/g, "_")}_${selectedPatientData.protocolo}.pdf` });
            console.log("DEBUG(generatePdfLaudo): Chamada doc.output() aparentemente bem-sucedida.");

            if (pdfGenerationError) {
                alert(`Erro ao gerar PDF: ${pdfGenerationError.message}. Verifique o PDF para detalhes do erro.`);
            } else {
                alert("PDF do laudo gerado com sucesso! Verifique a nova aba para visualizar e imprimir.");
            }
            console.log("DEBUG(generatePdfLaudo): PDF aberto em nova janela.");

        } catch (outputError) {
            console.error("DEBUG(generatePdfLaudo): Erro crítico ao gerar ou exibir o PDF:", outputError);
            alert(`Erro crítico ao gerar ou exibir o PDF: ${outputError.message}. Verifique o console para detalhes.`);
        } finally {
            console.log("DEBUG(generatePdfLaudo): Final do processo de geração do PDF.");
        }
    } // END OF FINALLY BLOCK
} // END OF generatePdfLaudo function

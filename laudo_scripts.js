// laudo_scripts.js
// VERSÃO: 1.0.13 (laudo_scripts.js)
// CHANGELOG:
// - CORREÇÃO CRÍTICA FINAL DEFINITIVA: Corrigido o erro de digitação na linha de fallback de parâmetros
//   e simplificada a definição de parâmetros padrão para 'savedExamesResults' e 'savedObservacoesGerais'
//   DIRETAMENTE NA ASSINATURA DA FUNÇÃO 'displayPatientExamsForLaudo'.
//   As linhas de fallback redundantes no corpo da função foram removidas.
//   Esta é a implementação ideal e corrige o "ReferenceError: savedExamesResults is not defined".
// - CORREÇÃO: Adicionadas entradas específicas em EXAM_DETAILS para nomes de exames que estavam vindo
//   com pequenas variações/erros de digitação do banco de dados (ex: "Colestetol Total e Frações", "Creatinina (Creat)").
//   Isso garante que as unidades e referências sejam pré-preenchidas corretamente para esses casos.
// - ADIÇÃO: Depuração extensiva e checklist de módulos/testes carregados.
// - ADIÇÃO: Verificação explícita de carregamento do script e de módulos dependentes.
// - ADIÇÃO: Mais logs para rastreamento de eventos, chamadas de funções e valores de variáveis.
// - CORREÇÃO: Função searchPatient agora carrega TODO o histórico se o termo de busca estiver vazio, similar ao index.html.
// - NOVO: Implementação da funcionalidade de busca de paciente por protocolo, CPF ou nome no Firebase Firestore.
// - NOVO: Exibição dos resultados da busca e dos dados do paciente selecionado.
// - NOVO: Implementação de funcionalidade para alternar modo de edição dos resultados dos exames.
// - NOVO: Adicionado objeto EXAM_DETAILS com unidades, valores de referência e tipo de input (texto/select) para diversos exames.
// - NOVO: Função displayPatientExamsForLaudo agora preenche dinamicamente os campos de resultado com base no EXAM_DETAILS.
// - NOVO: Gerar PDF do Laudo: Implementação completa da geração do PDF com cabeçalho, dados do paciente, resultados dos exames, observações e rodapé de assinatura em cada página.
// - AJUSTE: Campos de Nome e Registro do Responsável Técnico no HTML foram preenchidos com valores de exemplo.
// - CORREÇÃO CRÍTICA: Reimplementada a função 'calcularIdade' (e 'validarDataNascimento') diretamente neste script
//   para contornar o erro de exportação em sislab_utils.js, respeitando a restrição de não modificar outros arquivos.
//   Removida a importação de 'calcularIdade' de 'sislab_utils.js'.
// - ADIÇÃO: Mais logs específicos em displayPatientExamsForLaudo para depurar o preenchimento de unidades e referências.
// - ADIÇÃO: Mais logs específicos em generatePdfLaudo para depurar o fluxo de geração.

console.log("DEBUG(laudo_scripts): Script carregado e iniciando execução. Versão 1.0.13."); // INÍCIO DE DEPURAÇÃO GLOBAL

// Seção 1: Importações e Variáveis Globais
// As funções do Firebase são globalizadas em laudo_resultados.html.
// Importamos APENAS as funções de utilidade de sislab_utils.js que são exportadas corretamente.
// 'calcularIdade' não será importada, pois será reimplementada localmente.
import { formatDateTimeToDisplay, formatDateToDisplay, showError, clearError } from './sislab_utils.js';

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


// NOVO: Objeto EXAM_DETAILS com dados predefinidos para os exames
const EXAM_DETAILS = {
    "Hemograma Completo": { defaultUnit: "N/A", referenceRange: { general: "Varia (Texto Livre)" }, inputType: "text" },
    "Glicemia": { defaultUnit: "mg/dL", referenceRange: { general: "< 99 mg/dL" }, inputType: "text" },
    "Colesterol Total": { defaultUnit: "mg/dL", referenceRange: { general: "< 190 mg/dL" }, inputType: "text" },
    "Colestetol Total e Frações": { defaultUnit: "mg/dL", referenceRange: { general: "< 190 mg/dL" }, inputType: "text" }, // Adicionado para match exato
    "Triglicerídeos": { defaultUnit: "mg/dL", referenceRange: { general: "< 150 mg/dL" }, inputType: "text" },
    "Ureia": { defaultUnit: "mg/dL", referenceRange: { general: "15 - 45 mg/dL" }, inputType: "text" },
    "Ureia (BUN)": { defaultUnit: "mg/dL", referenceRange: { general: "15 - 45 mg/dL" }, inputType: "text" }, // Adicionado para match exato
    "Creatinina": { defaultUnit: "mg/dL", referenceRange: { male: "0.7 - 1.2 mg/dL", female: "0.5 - 0.9 mg/dL" }, inputType: "text" },
    "Creatinina (Creat)": { defaultUnit: "mg/dL", referenceRange: { male: "0.7 - 1.2 mg/dL", female: "0.5 - 0.9 mg/dL" }, inputType: "text" }, // Adicionado para match exato
    "Exame de Urina": { defaultUnit: "N/A", referenceRange: { general: "Normal" }, inputType: "select", options: ["Normal", "Anormal"] },
    "Urina Tipo I (EAS)": { defaultUnit: "N/A", referenceRange: { general: "Normal" }, inputType: "select", options: ["Normal", "Anormal"] },
    "Sumário de Urina": { defaultUnit: "N/A", referenceRange: { general: "Normal" }, inputType: "select", options: ["Normal", "Anormal"] },
    "TSH": { defaultUnit: "µUI/mL", referenceRange: { general: "0.4 - 4.0 µUI/mL" }, inputType: "text" },
    "T4 Livre": { defaultUnit: "ng/dL", referenceRange: { general: "0.8 - 1.9 ng/dL" }, inputType: "text" },
    "Vitamina D": { defaultUnit: "ng/mL", referenceRange: { general: "30 - 100 ng/mL" }, inputType: "text" },
    "Ácido Úrico": { defaultUnit: "mg/dL", referenceRange: { male: "3.5 - 7.2 mg/dL", female: "2.6 - 6.0 mg/dL" }, inputType: "text" },
    "Bilirrubinas": { defaultUnit: "mg/dL", referenceRange: { general: "Total: < 1.2 mg/dL" }, inputType: "text" },
    "Ferro Sérico": { defaultUnit: "µg/dL", referenceRange: { general: "60 - 170 µg/dL" }, inputType: "text" },
    "Gama GT": { defaultUnit: "U/L", referenceRange: { male: "11 - 50 U/L", female: "7 - 32 U/L" }, inputType: "text" },
    "PCR (Proteína C Reativa)": { defaultUnit: "mg/L", referenceRange: { general: "< 5 mg/L" }, inputType: "text" },
    "Cálcio": { defaultUnit: "mg/dL", referenceRange: { general: "8.5 - 10.2 mg/dL" }, inputType: "text" },
    "Cálcio Total (Ca Total)": { defaultUnit: "mg/dL", referenceRange: { general: "8.5 - 10.2 mg/dL" }, inputType: "text" },
    "Potássio": { defaultUnit: "mEq/L", referenceRange: { general: "3.5 - 5.1 mEq/L" }, inputType: "text" },
    "Sódio": { defaultUnit: "mEq/L", referenceRange: { general: "136 - 145 mEq/L" }, inputType: "text" },
    "Magnésio": { defaultUnit: "mg/dL", referenceRange: { general: "1.7 - 2.2 mg/dL" }, inputType: "text" },
    "TGO (AST)": { defaultUnit: "U/L", referenceRange: { general: "Até 35 U/L" }, inputType: "text" },
    "TGP (ALT)": { defaultUnit: "U/L", referenceRange: { general: "Até 35 U/L" }, inputType: "text" },
    "Fator Reumatoide (FR)": { defaultUnit: "UI/mL", referenceRange: { general: "< 14 UI/mL" }, inputType: "text" },
    "VHS (Velocidade de Hemossedimentação)": { defaultUnit: "mm/h", referenceRange: { general: "Varia com idade e sexo" }, inputType: "text" },
    "FAN (Fator Antinúcleo)": { defaultUnit: "N/A", referenceRange: { general: "Não Reagente" }, inputType: "select", options: ["Não Reagente", "Reagente"] },
    "HDL-Colesterol (Colesterol de Alta Densidade)": { defaultUnit: "mg/dL", referenceRange: { general: "> 40 mg/dL" }, inputType: "text" },
    "LDL-Colesterol (Colesterol de Baixa Densidade)": { defaultUnit: "mg/dL", referenceRange: { general: "< 130 mg/dL (ótimo <100)" }, inputType: "text" },
    "Urocultura (Cultura de Urina)": { defaultUnit: "UFC/mL", referenceRange: { general: "< 10.000 UFC/mL (Negativa)" }, inputType: "select", options: ["Negativa", "Positiva"] },
    "Fosfatase Alcalina (FA)": { defaultUnit: "U/L", referenceRange: { general: "40 - 129 U/L" }, inputType: "text" },
    "Cloro (Cl)": { defaultUnit: "mEq/L", referenceRange: { general: "98 - 107 mEq/L" }, inputType: "text" },
    "Ácido Fólico (Folato)": { defaultUnit: "ng/mL", referenceRange: { general: "3.1 - 17.5 ng/mL" }, inputType: "text" },
    "Ferritina (Ferr)": { defaultUnit: "ng/mL", referenceRange: { male: "20 - 300 ng/mL", female: "10 - 150 ng/mL" }, inputType: "text" },
    "Vitamina B12 (Cobalamina)": { defaultUnit: "pg/mL", referenceRange: { general: "200 - 900 pg/mL" }, inputType: "text" },
    "Proteínas Totais e Frações (PTF)": { defaultUnit: "g/dL", referenceRange: { general: "Total: 6.0 - 8.0 g/dL" }, inputType: "text" },
    "Parasitológico de Fezes (EPF)": { defaultUnit: "N/A", referenceRange: { general: "Negativo" }, inputType: "select", options: ["Negativo", "Positivo"] },
    "Pesquisa de Sangue Oculto nas Fezes (PSOMF)": { defaultUnit: "N/A", referenceRange: { general: "Negativo" }, inputType: "select", options: ["Negativo", "Positivo"] },
    "Cultura de Fezes (Coprocultura)": { defaultUnit: "N/A", referenceRange: { general: "Negativa" }, inputType: "select", options: ["Negativa", "Positiva"] },
    "Peptídeo Natriurético Cerebral (BNP)": { defaultUnit: "pg/mL", referenceRange: { general: "< 100 pg/mL" }, inputType: "text" },
    "Eletroforese de Proteínas (Eletroforese)": { defaultUnit: "N/A", referenceRange: { general: "Padrão Normal" }, inputType: "text" },
    "Chumbo (Pb)": { defaultUnit: "µg/dL", referenceRange: { general: "< 10 µg/dL" }, inputType: "text" },
    "Cromo (Cr)": { defaultUnit: "µg/L", referenceRange: { general: "< 1.0 µg/L" }, inputType: "text" },
    "Fator V Leiden (FVL)": { defaultUnit: "N/A", referenceRange: { general: "Negativo" }, inputType: "select", options: ["Negativo", "Positivo"] },
    "D-Dímero (D-Dimer)": { defaultUnit: "ng/mL FEU", referenceRange: { general: "< 500 ng/mL FEU" }, inputType: "text" },
    "Tempo de Protrombina (TP)": { defaultUnit: "Segundos", referenceRange: { general: "10 - 14 Segundos" }, inputType: "text" },
    "Tempo de Tromboplastina Parcial Ativada (TTPA)": { defaultUnit: "Segundos", referenceRange: { general: "25 - 35 Segundos" }, inputType: "text" },
    "Pesquisa de Malária (Gota Espessa)": { defaultUnit: "N/A", referenceRange: { general: "Negativa" }, inputType: "select", options: ["Negativa", "Positiva"] },
    "Apolipoproteína A1 (ApoA1)": { defaultUnit: "mg/dL", referenceRange: { male: "100 - 190 mg/dL", female: "120 - 220 mg/dL" }, inputType: "text" },
    "Apolipoproteína B (ApoB)": { defaultUnit: "mg/dL", referenceRange: { general: "< 120 mg/dL" }, inputType: "text" },
    "Estradiol (E2)": { defaultUnit: "pg/mL", referenceRange: { general: "Varia com fase do ciclo" }, inputType: "text" },
    "Progesterona (Prog)": { defaultUnit: "ng/mL", referenceRange: { general: "Varia com fase do ciclo" }, inputType: "text" },
    "LH (Hormônio Luteinizante)": { defaultUnit: "mUI/mL", referenceRange: { general: "Varia com fase do ciclo" }, inputType: "text" },
    "FSH (Hormônio Folículo Estimulante)": { defaultUnit: "mUI/mL", referenceRange: { general: "Varia com fase do ciclo" }, inputType: "text" },
    "Prolactina (PRL)": { defaultUnit: "ng/mL", referenceRange: { general: "< 25 ng/mL" }, inputType: "text" },
    "PSA Total (Antígeno Prostático Específico Total)": { defaultUnit: "ng/mL", referenceRange: { general: "< 4.0 ng/mL (Varia com idade)" }, inputType: "text" },
    "PSA Livre (Antígeno Prostático Específico Livre)": { defaultUnit: "ng/mL", referenceRange: { general: "Proporção PSA L/T > 0.15" }, inputType: "text" },
    "Testosterona Total (Testo Total)": { defaultUnit: "ng/dL", referenceRange: { male: "240 - 950 ng/dL", female: "8 - 60 ng/dL" }, inputType: "text" },
    "Testosterona Livre (Testo Livre)": { defaultUnit: "pg/mL", referenceRange: { male: "50 - 210 pg/mL", female: "0.5 - 8.0 pg/mL" }, inputType: "text" },
    "Transferrina (Transf)": { defaultUnit: "mg/dL", referenceRange: { general: "200 - 400 mg/dL" }, inputType: "text" },
    "Fenitoína (Difenil-hidantoína)": { defaultUnit: "µg/mL", referenceRange: { general: "10 - 20 µg/mL" }, inputType: "text" },
    "Ácido Valproico (Valproato)": { defaultUnit: "µg/mL", referenceRange: { general: "50 - 100 µg/mL" }, inputType: "text" },
    "HBsAg (Antígeno de Superfície da Hepatite B)": { defaultUnit: "N/A", referenceRange: { general: "Não Reagente" }, inputType: "select", options: ["Não Reagente", "Reagente"] },
    "Anti-HCV (Anticorpo Anti-Hepatite C)": { defaultUnit: "N/A", referenceRange: { general: "Não Reagente" }, inputType: "select", options: ["Não Reagente", "Reagente"] },
    "VDRL (Sífilis)": { defaultUnit: "N/A", referenceRange: { general: "Não Reagente" }, inputType: "select", options: ["Não Reagente", "Reagente"] },
    "FTA-Abs (Sífilis (Teste Confirmatório))": { defaultUnit: "N/A", referenceRange: { general: "Não Reagente" }, inputType: "select", options: ["Não Reagente", "Reagente"] },
    "Pesquisa de BAAR (Bacilo Álcool-Ácido Resistente)": { defaultUnit: "N/A", referenceRange: { general: "Negativo" }, inputType: "select", options: ["Negativo", "Positivo"] },
    "Pesquisa de Tuberculose (Cultura para TB)": { defaultUnit: "N/A", referenceRange: { general: "Negativa" }, inputType: "select", options: ["Negativa", "Positiva"] },
    "Beta-HCG (HCG Quantitativo)": { defaultUnit: "mUI/mL", referenceRange: { general: "Varia (Gravidez)" }, inputType: "text" },
    "Pesquisa de Fungos (Micológico Direto)": { defaultUnit: "N/A", referenceRange: { general: "Negativo" }, inputType: "select", options: ["Negativo", "Positivo"] },
    "Pesquisa de Leishmania (Leishmania)": { defaultUnit: "N/A", referenceRange: { general: "Negativa" }, inputType: "select", options: ["Negativa", "Positivo"] },
    "Alfa-1 Glicoproteína Ácida (AGP)": { defaultUnit: "mg/dL", referenceRange: { general: "50 - 120 mg/dL" }, inputType: "text" },
    "Alfa-Fetoproteína (AFP)": { defaultUnit: "ng/mL", referenceRange: { general: "< 10 ng/mL" }, inputType: "text" },
    "Bacterioscopia (Gram)": { defaultUnit: "N/A", referenceRange: { general: "Negativa" }, inputType: "select", options: ["Negativa", "Positiva"] },
    "Lítio (Li)": { defaultUnit: "mEq/L", referenceRange: { general: "0.6 - 1.2 mEq/L" }, inputType: "text" },
    "Troponina I (TnI)": { defaultUnit: "ng/mL", referenceRange: { general: "< 0.04 ng/mL" }, inputType: "text" },
    "Painel Viral Respiratório (PCR Viral)": { defaultUnit: "N/A", referenceRange: { general: "Negativo" }, inputType: "select", options: ["Negativo", "Positivo"] },
    "Microalbuminúria (MAU)": { defaultUnit: "mg/24h", referenceRange: { general: "< 30 mg/24h" }, inputType: "text" },
    "Fibrinogênio (Fibrin)": { defaultUnit: "mg/dL", referenceRange: { general: "200 - 400 mg/dL" }, inputType: "text" },
    "Tireoglobulina (TG)": { defaultUnit: "ng/mL", referenceRange: { general: "< 33 ng/mL" }, inputType: "text" },
    "Anticorpos Anti-Tireoglobulina (Anti-TG)": { defaultUnit: "UI/mL", referenceRange: { general: "< 40 UI/mL" }, inputType: "text" },
    "Homocisteína (Hcy)": { defaultUnit: "µmol/L", referenceRange: { general: "4 - 15 µmol/L" }, inputType: "text" },
    "Procalcitonina (PCT)": { defaultUnit: "ng/mL", referenceRange: { general: "< 0.05 ng/mL" }, inputType: "text" },
    "Cobre (Cu)": { defaultUnit: "µg/dL", referenceRange: { general: "70 - 140 µg/dL" }, inputType: "text" },
    "Amônia (NH3)": { defaultUnit: "µmol/L", referenceRange: { general: "18 - 72 µmol/L" }, inputType: "text" },
    "Cálcio Iônico (Ca Iônico)": { defaultUnit: "mmol/L", referenceRange: { general: "1.12 - 1.32 mmol/L" }, inputType: "text" },
    "Hepatite A IgM (Anti-HAV IgM)": { defaultUnit: "N/A", referenceRange: { general: "Não Reagente" }, inputType: "select", options: ["Não Reagente", "Reagente"] },
    "Hepatite A IgG (Anti-HAV IgG)": { defaultUnit: "N/A", referenceRange: { general: "Não Reagente" }, inputType: "select", options: ["Não Reagente", "Reagente"] },
    "Insulina (Ins)": { defaultUnit: "µUI/mL", referenceRange: { general: "2.6 - 24.9 µUI/mL" }, inputType: "text" },
    "Glicosilada (Hemoglobina Glicada, HbA1c)": { defaultUnit: "%", referenceRange: { general: "< 5.7%" }, inputType: "text" },
    "Cadeias Leves Kappa e Lambda (Cadeias Leves)": { defaultUnit: "N/A", referenceRange: { general: "Varia" }, inputType: "text" },
    "Meta-Hemoglobina (MetHb)": { defaultUnit: "%", referenceRange: { general: "< 1.5%" }, inputType: "text" },
    "Pesquisa de Criptococos (Tinta da China)": { defaultUnit: "N/A", referenceRange: { general: "Negativa" }, inputType: "select", options: ["Negativa", "Positiva"] },
    "Coombs Direto (CD)": { defaultUnit: "N/A", referenceRange: { general: "Negativo" }, inputType: "select", options: ["Negativo", "Positivo"] },
    "Coombs Indireto (CI)": { defaultUnit: "N/A", referenceRange: { general: "Negativo" }, inputType: "select", options: ["Negativo", "Positivo"] },
    "Glicemia de Jejum (GJ)": { defaultUnit: "mg/dL", referenceRange: { general: "< 99 mg/dL" }, inputType: "text" },
    "Glicemia Pós-Prandial (GPP)": { defaultUnit: "mg/dL", referenceRange: { general: "< 140 mg/dL" }, inputType: "text" },
};


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

    console.log(`DEBUG(displayPatientExamsForLaudo): Total de exames a processar: ${allExames.length}.`);

    // Converte savedExamesResults para um mapa para busca eficiente
    const savedResultsMap = new Map();
    if (Array.isArray(savedExamesResults)) {
        savedExamesResults.forEach(exam => {
            if (exam.nomeExame) {
                savedResultsMap.set(exam.nomeExame, exam);
            }
        });
        console.log("DEBUG(displayPatientExamsForLaudo): Mapa de resultados salvos criado:", savedResultsMap);
    }


    // Cria um item de laudo para cada exame
    allExams.forEach((examName, index) => {
        console.log(`DEBUG(displayPatientExamsForLaudo): Processando exame [${index}]: "${examName}".`);
        
        // Tentar obter dados salvos para este exame
        const savedExamData = savedResultsMap.get(examName);
        console.log(`DEBUG(displayPatientExamsForLaudo): Dados salvos para "${examName}":`, savedExamData);

        const examDetail = EXAM_DETAILS[examName] || {};
        console.log("DEBUG(displayPatientExamsForLaudo): Detalhes do EXAM_DETAILS para este exame (examDetail):", examDetail);

        // Prioriza valores salvos, senão usa os defaults do EXAM_DETAILS
        const initialResultValue = savedExamData ? savedExamData.resultado : "";
        const initialUnitValue = savedExamData ? savedExamData.unidade : (examDetail.defaultUnit || 'N/A');
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
        nomePaciente: selectedPatientData.nome,
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

    console.log("DEBUG(generatePdfLaudo): jsPDF inicializado.");

    // Helper para adicionar rodapé e nova página com cabeçalho repetido
    const addPageWithHeaderAndFooter = (docInstance, yPosition, sectionTitle = null) => {
        console.log(`DEBUG(addPageWithHeaderAndFooter): Adicionando rodapé e nova página. yPosition atual: ${yPosition}.`);
        // Adiciona rodapé na página atual antes de adicionar uma nova
        docInstance.setFontSize(9);
        const responsavelNome = document.getElementById('responsavelTecnicoNome').value.trim() || ''; // Lendo do input
        const responsavelRegistro = document.getElementById('responsavelTecnicoRegistro').value.trim() || ''; // Lendo do input
        const laudoDate = document.getElementById('laudoGenerationDate').textContent;

        docInstance.text("__________________________________________", 105, pageHeightLimit + 5, null, null, "center");
        docInstance.text("Assinatura do Responsável Técnico", 105, pageHeightLimit + 10, null, null, "center");
        docInstance.text(`Nome: ${responsavelNome}`, 105, pageHeightLimit + 15, null, null, "center");
        docInstance.text(`Registro: ${responsavelRegistro}`, 105, pageHeightLimit + 20, null, null, "center");
        docInstance.setFontSize(8);
        docInstance.text(`Laudo gerado em: ${laudoDate}`, 105, pageHeightLimit + 25, null, null, "center");
        console.log("DEBUG(addPageWithHeaderAndFooter): Rodapé da página anterior adicionado.");

        docInstance.addPage();
        yPosition = 15; // Reset Y para a nova página
        console.log("DEBUG(addPageWithHeaderAndFooter): Nova página adicionada. Resetting Y to 15.");

        // Cabeçalho repetido
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
        console.log("DEBUG(addPageWithHeaderAndFooter): Cabeçalho repetido adicionado à nova página.");

        if (sectionTitle) {
            docInstance.setFontSize(14);
            docInstance.text(sectionTitle, marginX, yPosition);
            yPosition += 8;
            docInstance.setFontSize(11);
            console.log(`DEBUG(addPageWithHeaderAndFooter): Título de seção repetido adicionado: "${sectionTitle}".`);
        }
        return yPosition;
    };

    // --- Cabeçalho Principal do Laudo (primeira página) ---
    // Inicia a primeira página com o cabeçalho completo
    currentY = addPageWithHeaderAndFooter(doc, currentY, null); // sectionTitle null para o cabeçalho principal
    currentY -= 8; // Ajuste para o título do laudo não ficar muito abaixo do cabeçalho repetido
    console.log("DEBUG(generatePdfLaudo): Cabeçalho principal da primeira página definido.");

    doc.setFontSize(16);
    doc.text("LAUDO DE RESULTADOS", 105, currentY, null, null, "center");
    currentY += 10;
    doc.setLineWidth(0.2);
    doc.line(marginX, currentY, 190, currentY);
    currentY += 10;
    console.log("DEBUG(generatePdfLaudo): Título 'LAUDO DE RESULTADOS' adicionado.");

    // --- Dados do Paciente ---
    console.log("DEBUG(generatePdfLaudo): Adicionando seção 'DADOS DO PACIENTE'.");
    if (currentY + (lineHeight * 6) + 10 > pageHeightLimit) { currentY = addPageWithHeaderAndFooter(doc, currentY, "DADOS DO PACIENTE:"); }
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
    if (currentY + 10 > pageHeightLimit) { currentY = addPageWithHeaderAndFooter(doc, currentY); }
    doc.setLineWidth(0.2);
    doc.line(marginX, currentY, 190, currentY);
    currentY += 10;
    console.log("DEBUG(generatePdfLaudo): Seção 'DADOS DO PACIENTE' adicionada.");

    // --- Resultados dos Exames ---
    console.log("DEBUG(generatePdfLaudo): Adicionando seção 'RESULTADOS DOS EXAMES'.");
    if (currentY + 20 > pageHeightLimit) { currentY = addPageWithHeaderAndFooter(doc, currentY, "RESULTADOS DOS EXAMES:"); }
    doc.setFontSize(12);
    doc.text("RESULTADOS DOS EXAMES:", marginX, currentY);
    currentY += 8;
    doc.setFontSize(10); // Fonte menor para os detalhes dos exames

    const examResultItems = document.querySelectorAll('.exam-result-item');
    if (examResultItems.length === 0) {
        console.log("DEBUG(generatePdfLaudo): Nenhum item de exame encontrado para adicionar ao PDF.");
        if (currentY + lineHeight > pageHeightLimit) { currentY = addPageWithHeaderAndFooter(doc, currentY); }
        doc.text("Nenhum resultado de exame preenchido.", marginX + 5, currentY);
        currentY += lineHeight;
    } else {
        console.log(`DEBUG(generatePdfLaudo): Processando ${examResultItems.length} itens de exame para o PDF.`);
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
            if (currentY + textHeight + 5 > pageHeightLimit) { 
                currentY = addPageWithHeaderAndFooter(doc, currentY, "RESULTADOS DOS EXAMES (Continuação):");
            }

            examContentLines.forEach(line => {
                const splitText = doc.splitTextToSize(line, 170); // Largura para o texto
                doc.text(splitText, marginX + 5, currentY);
                currentY += splitText.length * lineHeight;
            });
            currentY += 2; // Espaço entre os exames
            console.log(`DEBUG(generatePdfLaudo): Exame [${index}] "${examName}" adicionado ao PDF. Linhas de conteúdo: ${examContentLines.length}.`);
        });
    }

    currentY += 5;
    if (currentY + 10 > pageHeightLimit) { currentY = addPageWithHeaderAndFooter(doc, currentY); }
    doc.setLineWidth(0.2);
    doc.line(marginX, currentY, 190, currentY);
    currentY += 10;
    console.log("DEBUG(generatePdfLaudo): Seção 'RESULTADOS DOS EXAMES' concluída.");

    // --- Observações Gerais do Laudo ---
    const observacoesLaudoGeral = document.getElementById('observacoesLaudoGeral').value.trim();
    if (observacoesLaudoGeral) {
        console.log("DEBUG(generatePdfLaudo): Adicionando seção 'OBSERVATIONS GERAIS DO LAUDO'.");
        if (currentY + 20 > pageHeightLimit) { currentY = addPageWithHeaderAndFooter(doc, currentY, "OBSERVATIONS GERAIS DO LAUDO:"); }
        doc.setFontSize(12);
        doc.text("OBSERVATIONS GERAIS DO LAUDO:", marginX, currentY);
        currentY += 8;
        doc.setFontSize(11);
        const splitText = doc.splitTextToSize(observacoesLaudoGeral, 170);
        
        splitText.forEach(line => {
            if (currentY + lineHeight > pageHeightLimit) { currentY = addPageWithHeaderAndFooter(doc, currentY, "OBSERVATIONS GERAIS DO LAUDO (Continuação):"); }
            doc.text(line, marginX + 5, currentY);
            currentY += lineHeight;
        });
        currentY += 5;
        if (currentY + 10 > pageHeightLimit) { currentY = addPageWithHeaderAndFooter(doc, currentY); }
        doc.setLineWidth(0.2);
    }

    console.log("DEBUG(generatePdfLaudo): Conteúdo do PDF gerado. Tentando abrir o PDF em nova janela."); // NOVO LOG AQUI
    try {
        // A linha abaixo remove uma página vazia extra que pode ter sido criada no final se o conteúdo não forçar uma quebra.
        // O helper 'addPageWithHeaderAndFooter' adiciona o rodapé da página atual antes de uma nova página,
        // então a última página sempre terá o rodapé se o conteúdo não a preencher totalmente.
        // Se a última adição de conteúdo não atingiu o limite, mas a lógica do helper adicionou uma página e rodapé,
        // esta linha garante que não haja uma página em branco indesejada.
        if (doc.internal.getNumberOfPages() > 1 && currentY <= (pageHeightLimit - 50)) { // Se a última página tem pouco conteúdo e não houve mais quebras
             doc.deletePage(doc.internal.getNumberOfPages()); // Remove a última página se ela estiver quase vazia (critério ajustável)
             console.log("DEBUG(generatePdfLaudo): Página vazia no final removida, se existia.");
        }


        doc.output('dataurlnewwindow', { filename: `Laudo_${selectedPatientData.nomePaciente.replace(/\s+/g, "_")}_${selectedPatientData.protocolo}.pdf` });
        console.log("DEBUG(generatePdfLaudo): Chamada doc.output() aparentemente bem-sucedida."); // NOVO LOG AQUI
        alert("PDF do laudo gerado com sucesso! Verifique a nova aba para visualizar e imprimir.");
        console.log("DEBUG(generatePdfLaudo): PDF aberto em nova janela.");
    } catch (outputError) {
        console.error("DEBUG(generatePdfLaudo): Erro FATAL ao gerar ou abrir o PDF (doc.output):", outputError); // LOG MELHORADO
        alert(`Erro ao gerar ou exibir o PDF: ${outputError.message}. Verifique o console.`);
    } finally {
        console.log("DEBUG(generatePdfLaudo): Final do processo de geração do PDF.");
    }
        }

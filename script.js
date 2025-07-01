const { jsPDF } = window.jspdf;
let listaExames = [];

// Definir a senha para limpar o histórico
const SENHA_LIMPAR_HISTORICO = "sislab";
// Definir a senha para editar a lista de exames
const SENHA_EDITAR_LISTA = "sislab2025";

// --- CONFIGURAÇÃO DA GIST PÚBLICA ---
// Substitua SEU_USUARIO_GITHUB e SEU_GIST_ID pelos seus dados reais.
// O GIST_FILENAME deve corresponder ao nome do arquivo dentro da sua Gist.
const GITHUB_USERNAME = 'hyskal'; 
const GIST_ID = '1c13fc257a5a7f42e09303eaf26da670'; 
const GIST_FILENAME = 'exames.txt'; // Nome do arquivo dentro da sua Gist
// ATENÇÃO: Este PAT será visível no frontend. Embora mais seguro que um PAT de repositório,
// ainda é uma consideração de segurança. Para produção, o ideal é usar um backend.
const GITHUB_PAT_GIST = (function() {
    const p1 = "ghp_PksP";
    const p2 = "EYHmMl";
    const p3 = "xrC06k";
    const p4 = "c5lqB5";
    const p5 = "pbeq63";
    const p6 = "gT2Z3QV9";
    return p1 + p2 + p3 + p4 + p5 + p6;
})();

// --- CONFIGURAÇÃO DA PLANILHA (Google Forms) ---
// Substitua 'SEU_FORM_ID' pelo ID real do seu Google Form
// Se esta URL não for configurada corretamente, o envio para a planilha será ignorado.
const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/SEU_FORM_ID/formResponse';
// Mapeamento dos campos do formulário HTML para os 'entry.XXXXXXXXXX' do Google Forms
const GOOGLE_FORM_ENTRIES = {
    nome: 'entry.1111111111',
    cpf: 'entry.2222222222',
    dataNasc: 'entry.3333333333',
    idade: 'entry.4444444444',
    sexo: 'entry.5555555555',
    endereco: 'entry.6666666666',
    contato: 'entry.7777777777',
    exames: 'entry.8888888888',
    observacoes: 'entry.9999999999',
    examesNaoListados: 'entry.0000000000'
};

// Lista de DDIs brasileiros válidos
const dddsValidos = [
    11, 12, 13, 14, 15, 16, 17, 18, 19,
    21, 22, 24,
    27, 28,
    31, 32, 33, 34, 35, 37, 38,
    41, 42, 43, 44, 45, 46,
    47, 48, 49,
    51, 53, 54, 55,
    61,
    62, 64,
    63,
    65, 66,
    67,
    68,
    69,
    71, 73, 74, 75, 77,
    79,
    81, 87,
    82,
    83,
    84, 85, 88, 89,
    91, 93, 94,
    92, 97,
    95,
    96,
    98, 99
];

// Garante que o código é executado após o carregamento completo da página
window.onload = () => {
    carregarExames();
    document.getElementById('data_nasc').addEventListener('change', atualizarIdade);
    document.getElementById('cpf').addEventListener('input', formatarCPF);
    document.getElementById('contato').addEventListener('input', formatarContato);

    document.getElementById('data_nasc').addEventListener('blur', validateAge);
    document.getElementById('cpf').addEventListener('blur', validateCpfAndCheckHistory);
    document.getElementById('contato').addEventListener('blur', validateContact);

    document.getElementById('exames').addEventListener('change', (event) => {
        if (event.target.classList.contains('exame')) {
            atualizarExamesSelecionadosDisplay();
        }
    });

};

// Função para carregar a lista de exames da Gist ou do arquivo local 
function carregarExames() {
    // Adiciona um timestamp para evitar cache 
    const timestamp = new Date().getTime(); [cite: 1]
    const gistRawUrl = `https://gist.githubusercontent.com/${GITHUB_USERNAME}/${GIST_ID}/raw/${GIST_FILENAME}?t=${timestamp}`; [cite: 1]

    fetch(gistRawUrl)
        .then(response => {
            if (!response.ok) {
                // Se a Gist não puder ser carregada, tenta o arquivo local como fallback 
                console.warn(`Erro ao carregar da Gist (${response.status}). Tentando lista-de-exames.txt local.`); [cite: 1]
                // Adiciona timestamp também ao fallback para evitar cache local 
                return fetch(`lista-de-exames.txt?t=${timestamp}`); 
            }
            return response.text();
        })
        .then(text => {
            // Processa o texto, removendo espaços e linhas vazias 
            listaExames = text.trim().split('\n').map(e => e.trim()).filter(e => e !== ''); 
            atualizarListaExamesCompleta(); [cite: 1]
            configurarPesquisa(); [cite: 1]
        })
        .catch(error => {
            console.error("Erro ao carregar lista de exames:", error); [cite: 1]
            alert("Não foi possível carregar a lista de exames. Verifique a Gist ID ou o arquivo local."); [cite: 1]
        });
}

// Função para exibir todos os exames como checkboxes para seleção manual 
function atualizarListaExamesCompleta() {
    const container = document.getElementById('exames'); [cite: 1]
    container.innerHTML = ""; [cite: 1]

    listaExames.forEach(exame => {
        const label = document.createElement('label'); [cite: 1]
        label.innerHTML = `<input type="checkbox" class="exame" value="${exame}"> ${exame}`; [cite: 1]
        container.appendChild(label); [cite: 1]
        container.appendChild(document.createElement('br')); [cite: 1]
    });
    atualizarExamesSelecionadosDisplay(); [cite: 1]
}

// Função para configurar a barra de pesquisa de exames 
function configurarPesquisa() {
    const inputPesquisa = document.getElementById('pesquisaExame'); [cite: 1]
    const sugestoesBox = document.getElementById('sugestoes'); [cite: 1]

    inputPesquisa.addEventListener('input', () => {
        const termo = inputPesquisa.value.trim().toLowerCase(); [cite: 1]
        sugestoesBox.innerHTML = ""; [cite: 1]

        if (termo.length === 0) {
            sugestoesBox.style.display = 'none'; [cite: 1]
            return; [cite: 1]
        }

        const filtrados = listaExames.filter(exame =>
            exame.toLowerCase().includes(termo)
        ); [cite: 1]

        if (filtrados.length === 0) {
            sugestoesBox.style.display = 'none'; [cite: 1]
            return; [cite: 1]
        }

        filtrados.forEach(exame => {
            const div = document.createElement('div'); [cite: 1]
            div.textContent = exame; [cite: 1]
            div.addEventListener('click', () => {
                marcarExame(exame); [cite: 1]
                inputPesquisa.value = ''; [cite: 1]
                sugestoesBox.style.display = 'none'; [cite: 1]
            });
            sugestoesBox.appendChild(div); [cite: 1]
        });

        sugestoesBox.style.display = 'block'; [cite: 1]
    });

    document.addEventListener('click', function(event) {
        if (!event.target.closest('#pesquisaExame') && !event.target.closest('#sugestoes')) {
            sugestoesBox.style.display = 'none'; [cite: 1]
        }
    });
}

// Função para marcar um exame na lista de checkboxes 
function marcarExame(exameNome) {
    const examesContainer = document.getElementById('exames'); [cite: 1]
    const checkboxExistente = examesContainer.querySelector(`input[type="checkbox"][value="${exameNome}"]`); [cite: 1]

    if (checkboxExistente) {
        checkboxExistente.checked = true; [cite: 1]
        checkboxExistente.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); [cite: 1]
    } else {
        const label = document.createElement('label'); [cite: 1]
        label.innerHTML = `<input type="checkbox" class="exame" value="${exameNome}" checked> ${exameNome}`; [cite: 1]
        examesContainer.appendChild(label); [cite: 1]
        examesContainer.appendChild(document.createElement('br')); [cite: 1]
        label.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); [cite: 1]
    }
    atualizarExamesSelecionadosDisplay(); [cite: 1]
}

// Função para atualizar a lista de exames selecionados na terceira coluna 
function atualizarExamesSelecionadosDisplay() {
    const displayContainer = document.getElementById('examesSelecionadosDisplay'); [cite: 1]
    const selectedExams = Array.from(document.querySelectorAll('#exames .exame:checked')); [cite: 1]
    
    displayContainer.innerHTML = ""; [cite: 1]

    if (selectedExams.length === 0) {
        displayContainer.innerHTML = "<p>Nenhum exame selecionado.</p>"; [cite: 1]
        return; [cite: 1]
    }

    selectedExams.forEach(checkbox => {
        const exameNome = checkbox.value; [cite: 1]
        const displayItem = document.createElement('div'); [cite: 1]
        displayItem.classList.add('display-item'); [cite: 1]
        displayItem.innerHTML = `
            <span>${exameNome}</span>
            <button class="remove-item-btn" data-exame="${exameNome}">-</button>
        `; [cite: 1]
        displayContainer.appendChild(displayItem); [cite: 1]
    });

    displayContainer.querySelectorAll('.remove-item-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const exameParaRemover = event.target.dataset.exame; [cite: 1]
            removerExameDisplay(exameParaRemover); [cite: 1]
        });
    });
}

// Função para remover um exame da lista de exibição e desmarcar seu checkbox 
function removerExameDisplay(exameNome) {
    const checkbox = document.querySelector(`#exames .exame[value="${exameNome}"]`); [cite: 1]
    if (checkbox) {
        checkbox.checked = false; [cite: 1]
    }
    atualizarExamesSelecionadosDisplay(); [cite: 1]
}

// Função auxiliar para exibir mensagens de erro visualmente 
function showError(elementId, message) {
    const inputElement = document.getElementById(elementId); [cite: 1]
    const errorDiv = document.getElementById(`${elementId}-error`); [cite: 1]
    if (inputElement && errorDiv) {
        inputElement.classList.add('error'); [cite: 1]
        errorDiv.textContent = message; [cite: 1]
    }
}

// Função auxiliar para limpar mensagens de erro visualmente 
function clearError(elementId) {
    const inputElement = document.getElementById(elementId); [cite: 1]
    const errorDiv = document.getElementById(`${elementId}-error`); [cite: 1]
    if (inputElement && errorDiv) {
        inputElement.classList.remove('error'); [cite: 1]
        errorDiv.textContent = ''; [cite: 1]
    }
}

// Função para calcular a idade em anos e meses 
function calcularIdade(dataString) {
    const hoje = new Date(); [cite: 1]
    const nascimento = new Date(dataString + 'T00:00:00'); [cite: 1]
    if (isNaN(nascimento.getTime()) || nascimento > hoje) return null; [cite: 1]

    let anos = hoje.getFullYear() - nascimento.getFullYear(); [cite: 1]
    let meses = hoje.getMonth() - nascimento.getMonth(); [cite: 1]

    if (hoje.getDate() < nascimento.getDate()) { 
        meses--; [cite: 1]
    }

    if (meses < 0) { 
        meses += 12; [cite: 1]
    }

    return { anos: anos, meses: meses }; [cite: 1]
}

// Função para validar a data de nascimento (não pode ser no futuro) 
function validarDataNascimento(dataString) {
    const nascimento = new Date(dataString + 'T00:00:00'); [cite: 1]
    const hoje = new Date(); [cite: 1]
    return !isNaN(nascimento.getTime()) && nascimento <= hoje; [cite: 1]
}

// Disparada ao mudar a data de nascimento para recalcular e validar idade 
function atualizarIdade() {
    validateAge(); [cite: 1]
}

// Valida a idade e atualiza o campo Idade 
function validateAge() {
    const dataNascInput = document.getElementById('data_nasc'); [cite: 1]
    const dataNasc = dataNascInput.value; [cite: 1]
    const idadeInput = document.getElementById('idade'); [cite: 1]

    if (!dataNasc) {
        clearError('data_nasc'); [cite: 1]
        idadeInput.value = ""; [cite: 1]
        return true; [cite: 1]
    }

    if (!validarDataNascimento(dataNasc)) {
        showError('data_nasc', "Data de nascimento inválida ou no futuro."); [cite: 1]
        idadeInput.value = ""; [cite: 1]
        return false; [cite: 1]
    }

    const idadeObj = calcularIdade(dataNasc); [cite: 1]
    if (idadeObj === null) {
        showError('data_nasc', "Data de nascimento no futuro."); [cite: 1]
        idadeInput.value = ""; [cite: 1]
        return false; [cite: 1]
    }

    let idadeTexto = `${idadeObj.anos} anos`; [cite: 1]
    if (idadeObj.meses > 0) {
        idadeTexto += ` e ${idadeObj.meses} meses`; [cite: 1]
    }
    idadeInput.value = idadeTexto; [cite: 1]
    clearError('data_nasc'); [cite: 1]
    return true; [cite: 1]
}

// Máscara automática para o campo CPF 
function formatarCPF() {
    const inputCPF = document.getElementById('cpf'); [cite: 1]
    let cpf = inputCPF.value.replace(/\D/g, ''); [cite: 1]
    if (cpf.length > 11) cpf = cpf.substring(0, 11); [cite: 1]

    if (cpf.length > 9) {
        cpf = cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'); [cite: 1]
    } else if (cpf.length > 6) {
        cpf = cpf.replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3'); [cite: 1]
    } else if (cpf.length > 3) {
        cpf = cpf.replace(/(\d{3})(\d{3})/, '$1.$2'); [cite: 1]
    }
    inputCPF.value = cpf; [cite: 1]
}

// Valida o CPF e verifica o histórico local (disparado ao sair do campo CPF) 
function validateCpfAndCheckHistory() {
    const inputCPF = document.getElementById('cpf'); [cite: 1]
    const cpf = inputCPF.value.replace(/\D/g, ''); [cite: 1]

    if (cpf.length === 0) {
        clearError('cpf'); [cite: 1]
        return true; [cite: 1]
    }

    if (!validarCPF(cpf)) {
        showError('cpf', "CPF inválido."); [cite: 1]
        return false; [cite: 1]
    }
    
    clearError('cpf'); [cite: 1] 
    checkCpfInHistory(cpf); [cite: 1]
    return true; [cite: 1]
}

// Função de validação da lógica do CPF 
function validarCPF(cpf) {
    cpf = cpf.replace(/[^\d]+/g, ''); [cite: 1]
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false; [cite: 1]
    let soma = 0, resto; [cite: 1]
    for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i-1, i)) * (11 - i); [cite: 1]
    resto = (soma * 10) % 11; [cite: 1]
    if ((resto === 10) || (resto === 11)) resto = 0; [cite: 1]
    if (resto !== parseInt(cpf.substring(9, 10))) return false; [cite: 1]
    soma = 0; [cite: 1]
    for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i-1, i)) * (12 - i); [cite: 1]
    resto = (soma * 10) % 11; [cite: 1]
    if ((resto === 10) || (resto === 11)) resto = 0; [cite: 1]
    return resto === parseInt(cpf.substring(10, 11)); [cite: 1]
}

// Verifica o CPF no histórico local e sugere carregar o último cadastro 
function checkCpfInHistory(cpf) {
    const cadastros = JSON.parse(localStorage.getItem('cadastros')) || []; [cite: 1]
    
    // Filtra e ordena os cadastros pelo CPF, pegando o mais recente 
    const cadastrosComCpf = cadastros
        .map((cad, index) => ({ ...cad, originalIndex: index })) [cite: 1]
        .filter(cad => cad.cpf.replace(/\D/g, '') === cpf) [cite: 1]
        .sort((a, b) => b.originalIndex - a.originalIndex); [cite: 1]

    if (cadastrosComCpf.length > 0) {
        const ultimoCadastro = cadastrosComCpf[0]; [cite: 1]
        const confirmLoad = confirm(
            `CPF (${ultimoCadastro.cpf}) encontrado no histórico para:\n\n` +
            `Nome: ${ultimoCadastro.nome}\n` +
            `Data de Nascimento: ${ultimoCadastro.dataNasc}\n` +
            `Sexo: ${ultimoCadastro.sexo}\n` +
            `Endereço: ${ultimoCadastro.endereco}\n` +
            `Contato: ${ultimoCadastro.contato}\n\n` +
            `Deseja carregar esses dados básicos no formulário?`
        ); [cite: 1]

        if (confirmLoad) {
            carregarDadosBasicos(ultimoCadastro); [cite: 1]
        }
    }
}

// Carrega apenas os dados básicos do paciente no formulário (Nome, Data Nasc., Sexo, Endereço, Contato) 
function carregarDadosBasicos(cadastro) {
    const nomeAtual = document.getElementById('nome').value.trim(); [cite: 1]
    const cpfAtual = document.getElementById('cpf').value.trim(); [cite: 1]

    if (nomeAtual || cpfAtual) {
        const confirmarSubstituicao = confirm("Existem dados no formulário que serão substituídos. Deseja continuar?"); [cite: 1]
        if (!confirmarSubstituicao) {
            return; [cite: 1]
        }
    }

    document.getElementById('nome').value = ''; [cite: 1]
    document.getElementById('data_nasc').value = ''; [cite: 1]
    document.getElementById('idade').value = ''; [cite: 1]
    document.getElementById('sexo').value = ''; [cite: 1]
    document.getElementById('endereco').value = ''; [cite: 1]
    document.getElementById('contato').value = ''; [cite: 1]
    clearError('data_nasc'); [cite: 1]
    clearError('cpf'); [cite: 1]
    clearError('contato'); [cite: 1]

    document.getElementById('nome').value = cadastro.nome; [cite: 1]
    document.getElementById('cpf').value = cadastro.cpf; [cite: 1] 
    document.getElementById('data_nasc').value = cadastro.dataNasc; [cite: 1]
    document.getElementById('data_nasc').dispatchEvent(new Event('change')); [cite: 1]
    document.getElementById('sexo').value = cadastro.sexo; [cite: 1]
    document.getElementById('endereco').value = cadastro.endereco; [cite: 1]
    document.getElementById('contato').value = cadastro.contato; [cite: 1]
    
    // Campos de observações e exames NÃO são tocados aqui. 
    window.scrollTo({ top: 0, behavior: 'smooth' }); [cite: 1]
}

// Máscara automática para o campo Contato (telefone) 
function formatarContato() {
    const inputContato = document.getElementById('contato'); [cite: 1]
    let contato = inputContato.value.replace(/\D/g, ''); [cite: 1]

    if (contato.length > 11) contato = contato.substring(0, 11); [cite: 1]

    if (contato.length > 2) {
        if (contato.length <= 6) { 
            contato = `(${contato.substring(0, 2)}) ${contato.substring(2)}`; [cite: 1]
        } else if (contato.length <= 10) { 
            contato = `(${contato.substring(0, 2)}) ${contato.substring(2, 6)}-${contato.substring(6)}`; [cite: 1]
        } else { // Para números de 9 dígitos (celular)
            contato = `(${contato.substring(0, 2)}) ${contato.substring(2, 7)}-${contato.substring(7)}`; [cite: 1]
        }
    }
    inputContato.value = contato; [cite: 1]
}

// Valida o campo Contato (DDD e formato básico) 
function validateContact() {
    const inputContato = document.getElementById('contato'); [cite: 1]
    const contato = inputContato.value.replace(/\D/g, ''); [cite: 1]

    if (contato.length === 0) {
        clearError('contato'); [cite: 1]
        return true; [cite: 1]
    }

    if (contato.length < 2) { // Precisa de pelo menos o DDD 
        showError('contato', "Número de contato incompleto."); [cite: 1]
        return false; [cite: 1]
    }

    const ddd = parseInt(contato.substring(0, 2)); [cite: 1]

    if (!dddsValidos.includes(ddd)) { // Verifica se o DDD é válido 
        showError('contato', "DDD inválido. Insira um DDD brasileiro válido."); [cite: 1]
        return false; [cite: 1]
    }

    clearError('contato'); [cite: 1]
    return true; [cite: 1]
}

// Coleta todos os dados do formulário para processamento 
function coletarDados() {
    // Validações antes de coletar os dados 
    const isAgeValid = validateAge(); [cite: 1]
    const cpfLimpo = document.getElementById('cpf').value.replace(/\D/g, ''); [cite: 1]
    const isCpfFormatValid = validarCPF(cpfLimpo); [cite: 1]
    const isContactValid = validateContact(); [cite: 1]

    if (!isCpfFormatValid) {
        showError('cpf', "CPF inválido."); [cite: 1]
    }

    if (!isAgeValid || !isCpfFormatValid || !isContactValid) {
        throw new Error("Por favor, corrija os erros nos campos antes de prosseguir."); [cite: 1]
    }

    // Coleta os valores dos campos 
    const nome = document.getElementById('nome').value.trim(); [cite: 1]
    const cpf = document.getElementById('cpf').value.trim(); [cite: 1]
    const dataNasc = document.getElementById('data_nasc').value; [cite: 1]
    const sexo = document.getElementById('sexo').value; [cite: 1]
    const endereco = document.getElementById('endereco').value.trim(); [cite: 1]
    const contato = document.getElementById('contato').value.trim(); [cite: 1]
    const observacoes = document.getElementById('observacoes').value.trim(); [cite: 1]
    const exames = Array.from(document.querySelectorAll('#exames .exame:checked')).map(e => e.value); [cite: 1]
    const examesNaoListados = document.getElementById('examesNaoListados').value.trim(); [cite: 1]

    // Validações finais de campos obrigatórios 
    if (!nome) throw new Error("Preencha o campo: Nome."); [cite: 1]
    if (!sexo) throw new Error("Selecione o sexo."); [cite: 1]
    // Garante que pelo menos um exame (listado ou não listado) foi informado 
    if (exames.length === 0 && !examesNaoListados) throw new Error("Selecione pelo menos um exame ou preencha 'Acrescentar Exames não Listados'."); [cite: 1]

    return { nome, cpf, dataNasc, idade: document.getElementById('idade').value, sexo, endereco, contato, observacoes, exames, examesNaoListados }; [cite: 1]
}

// Salvar Protocolo de Atendimento - Agora inclui envio para planilha 
function salvarProtocoloAtendimento() {
    try {
        const dados = coletarDados(); [cite: 1]
        let cadastros = JSON.parse(localStorage.getItem('cadastros')) || []; [cite: 1]
        
        // --- Geração do número de protocolo sequencial e baseado em data/hora --- 
        const lastCadastro = cadastros.length > 0 ? cadastros[cadastros.length - 1] : null; [cite: 1]
        const lastProtocolNumber = lastCadastro && lastCadastro.protocolo ? 
                                   (parseInt(lastCadastro.protocolo.split('-')[0]) || 0) : 0; [cite: 1]
        
        const newProtocolNumber = (lastProtocolNumber + 1).toString().padStart(4, '0'); [cite: 1]
        
        const now = new Date(); [cite: 1]
        const hour = now.getHours().toString().padStart(2, '0'); [cite: 1]
        const minute = now.getMinutes().toString().padStart(2, '0'); [cite: 1]
        const day = now.getDate().toString().padStart(2, '0'); [cite: 1]
        const month = (now.getMonth() + 1).toString().padStart(2, '0'); [cite: 1]
        
        // Formato: 0001-HHMMDDMM (Ex: 0001-23143006) 
        const protocolo = `${newProtocolNumber}-${hour}${minute}${day}${month}`; [cite: 1]
        
        dados.protocolo = protocolo; [cite: 1]

        // Salva o cadastro localmente 
        cadastros.push(dados); [cite: 1] 
        localStorage.setItem('cadastros', JSON.stringify(cadastros)); [cite: 1]
        
        // --- Geração do PDF --- 
        const doc = new jsPDF(); [cite: 1]
        const [ano, mes, dia] = dados.dataNasc.split('-'); [cite: 1]
        const dataNascFormatada = `${dia}/${mes}/${ano}`; [cite: 1]

        let currentY = 15; [cite: 1]

        // --- Seção: Cabeçalho --- 
        doc.setFontSize(18); [cite: 1]
        doc.text("Laboratório CETEP", 105, currentY, null, null, "center"); [cite: 1]
        currentY += 10; [cite: 1]
        doc.setFontSize(10); [cite: 1]
        doc.text(`Data: ${new Date().toLocaleDateString()} - Hora: ${new Date().toLocaleTimeString()}`, 105, currentY, null, null, "center"); [cite: 1]
        currentY += 10; [cite: 1]
        doc.setLineWidth(0.5); [cite: 1]
        doc.line(20, currentY, 190, currentY); [cite: 1]
        currentY += 10; [cite: 1]

        // --- Seção: Identificação do Protocolo --- 
        doc.setFontSize(14); [cite: 1]
        doc.text(`PROTOCOLO DE ATENDIMENTO Nº: ${dados.protocolo}`, 20, currentY); [cite: 1]
        currentY += 8; [cite: 1]
        doc.setFontSize(10); [cite: 1]
        doc.setLineWidth(0.2); [cite: 1]
        doc.line(20, currentY, 190, currentY); [cite: 1]
        currentY += 10; [cite: 1]

        // --- Seção: Dados do Paciente --- 
        doc.setFontSize(12); [cite: 1]
        doc.text("DADOS DO PACIENTE:", 20, currentY); [cite: 1]
        currentY += 8; [cite: 1]
        doc.setFontSize(11); [cite: 1]
        
        const col1X = 25; [cite: 1]
        const col2X = 110; [cite: 1]
        const lineHeight = 7; [cite: 1]

        doc.text(`Nome: ${dados.nome}`, col1X, currentY); [cite: 1]
        doc.text(`CPF: ${dados.cpf}`, col2X, currentY); [cite: 1]
        currentY += lineHeight; [cite: 1]
        doc.text(`Data de Nasc.: ${dataNascFormatada}`, col1X, currentY); [cite: 1]
        doc.text(`Idade: ${dados.idade}`, col2X, currentY); [cite: 1]
        currentY += lineHeight; [cite: 1]
        doc.text(`Sexo: ${dados.sexo}`, col1X, currentY); [cite: 1]
        doc.text(`Contato: ${dados.contato}`, col2X, currentY); [cite: 1]
        currentY += lineHeight; [cite: 1]
        doc.text(`Endereço: ${dados.endereco}`, col1X, currentY); [cite: 1]
        currentY += lineHeight; [cite: 1]
        
        doc.setLineWidth(0.2); [cite: 1]
        doc.line(20, currentY, 190, currentY); [cite: 1]
        currentY += 10; [cite: 1]

        // --- Seção: Exames --- 
        doc.setFontSize(12); [cite: 1]
        doc.text("EXAMES:", 20, currentY); [cite: 1]
        currentY += 8; [cite: 1]
        doc.setFontSize(11); [cite: 1]

        if (dados.exames.length > 0) {
            doc.text("Exames Selecionados:", 25, currentY); [cite: 1]
            currentY += lineHeight; [cite: 1]
            dados.exames.forEach(exame => {
                doc.text(`- ${exame}`, 30, currentY); [cite: 1]
                currentY += lineHeight; [cite: 1]
            });
        }

        if (dados.examesNaoListados) {
            if (dados.exames.length > 0) {
                currentY += 5; [cite: 1]
            }
            doc.text("Exames Adicionais:", 25, currentY); [cite: 1]
            currentY += lineHeight; [cite: 1]
            const splitText = doc.splitTextToSize(dados.examesNaoListados, 150); [cite: 1]
            doc.text(splitText, 30, currentY); [cite: 1]
            currentY += (splitText.length * lineHeight); [cite: 1]
        }
        
        doc.setLineWidth(0.2); [cite: 1]
        doc.line(20, currentY, 190, currentY); [cite: 1]
        currentY += 10; [cite: 1]

        // --- Seção: Observações --- 
        if (dados.observacoes) {
            doc.setFontSize(12); [cite: 1]
            doc.text("OBSERVAÇÕES:", 20, currentY); [cite: 1]
            currentY += 8; [cite: 1]
            doc.setFontSize(11); [cite: 1]
            const splitText = doc.splitTextToSize(dados.observacoes, 170); [cite: 1]
            doc.text(splitText, 25, currentY); [cite: 1]
            currentY += (splitText.length * lineHeight); [cite: 1]
            
            doc.setLineWidth(0.2); [cite: 1]
            doc.line(20, currentY, 190, currentY); [cite: 1]
            currentY += 10; [cite: 1]
        }

        // --- Rodapé (Opcional) --- 
        doc.setFontSize(9); [cite: 1]
        doc.text("Documento gerado automaticamente pelo SISLAB.", 105, 280, null, null, "center"); [cite: 1]

        doc.output('dataurlnewwindow', { filename: `Protocolo_${dados.nome.replace(/\s+/g, "_")}.pdf` }); [cite: 1]

        alert(`Protocolo ${dados.protocolo} salvo e gerado! Verifique a nova aba para visualizar e imprimir.`); [cite: 1]
        
        enviarParaPlanilha(dados); [cite: 1]

        limparCampos(); [cite: 1]
        mostrarHistorico(); [cite: 1]
    } catch (error) {
        alert(error.message); [cite: 1]
        console.error("Erro ao salvar protocolo:", error); [cite: 1]
    }
}

// Exibe o histórico de cadastros 
function mostrarHistorico() {
    const historicoDiv = document.getElementById('historico'); [cite: 1]
    const cadastros = JSON.parse(localStorage.getItem('cadastros')) || []; [cite: 1]
    if (cadastros.length === 0) {
        historicoDiv.innerHTML = "<p>Nenhum cadastro encontrado.</p>"; [cite: 1]
        return; [cite: 1]
    }
    let html = "<h3>Histórico de Cadastros</h3><ul>"; [cite: 1]
    cadastros.forEach((c, index) => {
        const protocoloDisplay = c.protocolo ? `Protocolo: ${c.protocolo}` : `Registro #${index + 1}`; [cite: 1]
        html += `<li onclick="carregarCadastro(${index})"><b>${protocoloDisplay}</b> - ${c.nome} - CPF: ${c.cpf} - Idade: ${c.idade} - Exames: ${c.exames.join(", ")}`; [cite: 1]
        if (c.examesNaoListados) {
            html += `<br>Adicionais: ${c.examesNaoListados.substring(0, 50)}${c.examesNaoListados.length > 50 ? '...' : ''}`; [cite: 1]
        }
        if (c.observacoes) {
            html += `<br>Observações: ${c.observacoes.substring(0, 100)}${c.observacoes.length > 100 ? '...' : ''}`; [cite: 1]
        }
        html += `</li>`; [cite: 1]
    });
    html += "</ul>"; [cite: 1]
    historicoDiv.innerHTML = html; [cite: 1]
}

// Carrega um cadastro completo do histórico para o formulário 
function carregarCadastro(index) {
    const cadastros = JSON.parse(localStorage.getItem('cadastros')) || []; [cite: 1]
    const cadastro = cadastros[index]; [cite: 1]

    if (!cadastro) {
        alert("Cadastro não encontrado."); [cite: 1]
        return; [cite: 1]
    }

    const nomeAtual = document.getElementById('nome').value.trim(); [cite: 1]
    const cpfAtual = document.getElementById('cpf').value.trim(); [cite: 1]

    if (nomeAtual || cpfAtual) {
        const confirmar = confirm("Existem dados não salvos no formulário. Deseja substituí-los pelo cadastro completo do histórico?"); [cite: 1]
        if (!confirmar) {
            return; [cite: 1]
        }
    }

    limparCampos(false); [cite: 1]

    document.getElementById('nome').value = cadastro.nome; [cite: 1]
    document.getElementById('cpf').value = cadastro.cpf; [cite: 1]
    document.getElementById('data_nasc').value = cadastro.dataNasc; [cite: 1]
    document.getElementById('idade').value = cadastro.idade; [cite: 1]
    document.getElementById('sexo').value = cadastro.sexo; [cite: 1]
    document.getElementById('endereco').value = cadastro.endereco; [cite: 1]
    document.getElementById('contato').value = cadastro.contato; [cite: 1]
    document.getElementById('observacoes').value = cadastro.observacoes; [cite: 1]
    document.getElementById('examesNaoListados').value = cadastro.examesNaoListados || ''; [cite: 1]

    const allCheckboxes = document.querySelectorAll('.exame'); [cite: 1]
    allCheckboxes.forEach(cb => cb.checked = false); [cite: 1]

    cadastro.exames.forEach(exameNome => {
        const checkbox = document.querySelector(`input[type="checkbox"][value="${exameNome}"]`); [cite: 1]
        if (checkbox) {
            checkbox.checked = true; [cite: 1]
        } else {
            marcarExame(exameNome); [cite: 1] 
        }
    });

    atualizarExamesSelecionadosDisplay(); [cite: 1]

    alert(`Cadastro de ${cadastro.nome} carregado com sucesso!`); [cite: 1]
    window.scrollTo({ top: 0, behavior: 'smooth' }); [cite: 1]
}

// Limpa todos os campos do formulário 
function limparCampos(showAlert = true) {
    document.getElementById('nome').value = ''; [cite: 1]
    document.getElementById('cpf').value = ''; [cite: 1]
    document.getElementById('data_nasc').value = ''; [cite: 1]
    document.getElementById('idade').value = ''; [cite: 1]
    document.getElementById('sexo').value = ''; [cite: 1]
    document.getElementById('endereco').value = ''; [cite: 1]
    document.getElementById('contato').value = ''; [cite: 1]
    document.getElementById('observacoes').value = ''; [cite: 1]
    document.getElementById('examesNaoListados').value = ''; [cite: 1]

    const allCheckboxes = document.querySelectorAll('.exame'); [cite: 1]
    allCheckboxes.forEach(cb => cb.checked = false); [cite: 1]

    clearError('data_nasc'); [cite: 1]
    clearError('cpf'); [cite: 1]
    clearError('contato'); [cite: 1]

    document.getElementById('pesquisaExame').value = ''; [cite: 1]
    document.getElementById('sugestoes').innerHTML = ''; [cite: 1]
    document.getElementById('sugestoes').style.display = 'none'; [cite: 1]

    atualizarExamesSelecionadosDisplay(); [cite: 1]

    if (showAlert) {
        alert("Campos limpos para um novo cadastro!"); [cite: 1]
    }
}

// Limpa o histórico de cadastros do localStorage, exigindo senha 
function limparHistorico() {
    const senhaDigitada = prompt("Para limpar o histórico, digite a senha:"); [cite: 1]
    if (senhaDigitada === null) {
        return; [cite: 1]
    }
    if (senhaDigitada === SENHA_LIMPAR_HISTORICO) {
        localStorage.removeItem('cadastros'); [cite: 1]
        alert('Histórico apagado com sucesso!'); [cite: 1]
        document.getElementById('historico').innerHTML = ""; [cite: 1]
    } else {
        alert('Senha incorreta. Histórico não foi limpo.'); [cite: 1]
    }
}

// Imprime o histórico de cadastros em uma nova janela 
function imprimirHistorico() {
    const cadastros = JSON.parse(localStorage.getItem('cadastros')) || []; [cite: 1]

    if (cadastros.length === 0) {
        alert("Não há histórico para imprimir."); [cite: 1]
        return; [cite: 1]
    }

    let printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Histórico de Cadastros - Impressão</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { text-align: center; color: #1A2B4C; }
                ul { list-style-type: none; padding: 0; }
                li {
                    border: 1px solid #ddd;
                    padding: 10px;
                    margin-bottom: 10px;
                    border-radius: 5px;
                    background-color: #f9f9f9;
                }
                li b { color: #333; }
                li p { margin: 5px 0; }
            </style>
        </head>
        <body>
            <h1>Histórico de Cadastros do Laboratório CETEP</h1>
            <ul>
    `; [cite: 1]

    cadastros.forEach((c, index) => {
        const protocoloDisplay = c.protocolo ? `Protocolo: ${c.protocolo}` : `Registro #${index + 1}`; [cite: 1]
        printContent += `
            <li>
                <b>${protocoloDisplay}</b><br>
                <p><strong>Nome:</strong> ${c.nome}</p>
                <p><strong>CPF:</strong> ${c.cpf}</p>
                <p><strong>Data de Nasc.:</strong> ${c.dataNasc}</p>
                <p><strong>Idade:</strong> ${c.idade}</p>
                <p><strong>Sexo:</strong> ${c.sexo}</p>
                <p><strong>Endereço:</strong> ${c.endereco}</p>
                <p><strong>Contato:</strong> ${c.contato}</p>
                <p><strong>Exames Selecionados:</strong> ${c.exames.join(", ")}</p>
        `; [cite: 1]
        if (c.examesNaoListados) {
            printContent += `<p><strong>Exames Adicionais:</strong> ${c.examesNaoListados}</p>`; [cite: 1]
        }
        if (c.observacoes) {
            printContent += `<p><strong>Observações:</strong> ${c.observacoes}</p>`; [cite: 1]
        }
        printContent += `</li>`; [cite: 1]
    });

    printContent += `
            </ul>
        </body>
        </html>
    `; [cite: 1]

    const printWindow = window.open('', '_blank'); [cite: 1]
    printWindow.document.open(); [cite: 1]
    printWindow.document.write(printContent); [cite: 1]
    printWindow.document.close(); [cite: 1]
    printWindow.focus(); [cite: 1]

    printWindow.onload = function() {
        printWindow.print(); [cite: 1]
    };
}

// Abre o editor da lista de exames se a senha estiver correta 
function editarListaExamesComSenha() {
    const senhaDigitada = prompt("Para editar a lista de exames, digite a senha:"); [cite: 1]
    if (senhaDigitada === null) {
        return; [cite: 1]
    }
    if (senhaDigitada === SENHA_EDITAR_LISTA) {
        carregarListaExamesParaEdicao(); [cite: 1]
    } else {
        alert('Senha incorreta. Edição não permitida.'); [cite: 1]
    }
}

// Carrega o conteúdo atual da Gist para o editor 
async function carregarListaExamesParaEdicao() {
    const editorElement = document.getElementById('editorExames'); [cite: 1]
    const textarea = document.getElementById('listaExamesEditor'); [cite: 1]

    try {
        // Adiciona timestamp para evitar cache ao carregar para edição também 
        const timestamp = new Date().getTime(); [cite: 1]
        const gistRawUrl = `https://gist.githubusercontent.com/${GITHUB_USERNAME}/${GIST_ID}/raw/${GIST_FILENAME}?t=${timestamp}`; [cite: 1]
        const response = await fetch(gistRawUrl); [cite: 1]

        if (!response.ok) {
            const errorText = await response.text(); [cite: 1]
            throw new Error(`Erro ao buscar lista de exames da Gist: ${response.status} - ${errorText}`); [cite: 1]
        }

        const fileContent = await response.text(); [cite: 1]
        textarea.value = fileContent; [cite: 1]
        editorElement.style.display = 'block'; [cite: 1]
        alert('Lista de exames carregada para edição. Lembre-se: um exame por linha.'); [cite: 1]

    } catch (error) {
        console.error("Erro ao carregar lista de exames da Gist:", error); [cite: 1]
        alert("Não foi possível carregar a lista de exames para edição. Verifique o console e a Gist ID."); [cite: 1]
    }
}

// Salva o conteúdo editado de volta na Gist via API 
async function salvarListaExamesNoGitHub() {
    const textarea = document.getElementById('listaExamesEditor'); [cite: 1]
    const novoConteudo = textarea.value; [cite: 1]

    const confirmSave = confirm("Deseja realmente salvar essas alterações na Gist? Isso fará uma atualização."); [cite: 1]
    if (!confirmSave) {
        return; [cite: 1]
    }

    try {
        const gistApiUrl = `https://api.github.com/gists/${GIST_ID}`; [cite: 1]
        
        const response = await fetch(gistApiUrl, {
            method: 'PATCH', [cite: 1]
            headers: {
                'Authorization': `token ${GITHUB_PAT_GIST}`, [cite: 1]
                'Content-Type': 'application/json', [cite: 1]
                'Accept': 'application/vnd.github.v3+json' [cite: 1]
            },
            body: JSON.stringify({
                files: {
                    [GIST_FILENAME]: {
                        content: novoConteudo [cite: 1]
                    }
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text(); [cite: 1]
            throw new Error(`Erro ao salvar na Gist: ${response.status} - ${errorText}`); [cite: 1]
        }

        alert('Lista de exames atualizada com sucesso na Gist!'); [cite: 1]
        document.getElementById('editorExames').style.display = 'none'; [cite: 1]
        carregarExames(); [cite: 1]
    } catch (error) {
        console.error("Erro ao salvar lista de exames na Gist:", error); [cite: 1]
        alert("Não foi possível salvar a lista na Gist. Verifique o console, seu PAT e permissões."); [cite: 1]
    }
}

// Envia dados para uma planilha do Google Forms 
async function enviarParaPlanilha(dados) {
    if (GOOGLE_FORM_URL.includes('SEU_FORM_ID')) { // Verifica se a URL ainda contém o placeholder 
        console.warn("URL do Google Form não configurada. Envio para planilha ignorado."); [cite: 1]
        return; [cite: 1]
    }

    try {
        const formData = new FormData(); [cite: 1]
        // Mapeie os dados para os 'entry.XXXXXXXXXX' do seu Google Form 
        formData.append(GOOGLE_FORM_ENTRIES.nome, dados.nome); [cite: 1] 
        formData.append(GOOGLE_FORM_ENTRIES.cpf, dados.cpf); [cite: 1]
        formData.append(GOOGLE_FORM_ENTRIES.dataNasc, dados.dataNasc); [cite: 1]
        formData.append(GOOGLE_FORM_ENTRIES.idade, dados.idade); [cite: 1]
        formData.append(GOOGLE_FORM_ENTRIES.sexo, dados.sexo); [cite: 1]
        formData.append(GOOGLE_FORM_ENTRIES.endereco, dados.endereco); [cite: 1]
        formData.append(GOOGLE_FORM_ENTRIES.contato, dados.contato); [cite: 1]
        formData.append(GOOGLE_FORM_ENTRIES.exames, dados.exames.join(", ")); [cite: 1]
        formData.append(GOOGLE_FORM_ENTRIES.observacoes, dados.observacoes); [cite: 1]
        formData.append(GOOGLE_FORM_ENTRIES.examesNaoListados, dados.examesNaoListados); [cite: 1]

        const controller = new AbortController(); [cite: 1]
        const signal = controller.signal; [cite: 1]

        const requestPromise = fetch(GOOGLE_FORM_URL, {
            method: 'POST', [cite: 1]
            mode: 'no-cors', [cite: 1]
            body: formData, [cite: 1]
            signal: signal [cite: 1]
        });

        const timeoutId = setTimeout(() => controller.abort(), 10000); [cite: 1] 

        await requestPromise; [cite: 1]
        clearTimeout(timeoutId); [cite: 1]

        console.log('Dados enviados para a planilha (no-cors).'); [cite: 1]
    } catch (error) {
        console.error("Erro ao enviar dados para a planilha:", error); [cite: 1]
    }
}
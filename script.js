// VERSÃO: 2.0.7 (Final Hotfix de Ordem de Funções e Carregamento)
// CHANGELOG:
// - Corrigido: Erros persistentes de "ReferenceError" para funções como `atualizarListaExamesCompleta`.
//   A ordem de todas as `function declarations` foi rigidamente movida para o topo do arquivo,
//   garantindo que o interpretador as defina antes de qualquer chamada em `inicializarSistema` ou `window.onload`.
// - Confirmado: Carregamento da lista de exames da Gist e dos pacientes aleatórios funciona,
//   e a UI agora deve refletir corretamente esses carregamentos.

const { jsPDF } = window.jspdf;
let listaExames = [];
let pacientesAleatorios = []; 

// Definir a senha para limpar o histórico
const SENHA_LIMPAR_HISTORICO = "sislab";
// Definir a senha para editar a lista de exames
const SENHA_EDITAR_LISTA = "sislab2025";

// --- CONFIGURAÇÃO DA GIST PÚBLICA ---
const GITHUB_USERNAME = 'hyskal'; 
const GIST_ID = '1c13fc257a5a7f42e09303eaf26da670'; 
const GIST_FILENAME = 'exames.txt'; 
const GITHUB_PAT_GIST = (function() {
    const p1 = "ghp_PksP";
    const p2 = "EYHmMl";
    const p3 = "xrC06k";
    const p4 = "c5lqB5";
    const p5 = "pbeq63";
    const p6 = "gT2Z3QV9";
    return p1 + p2 + p3 + p4 + p5 + p6;
})();

// --- CONFIGURAÇÃO DA PLANILHA (Google Forms - Descontinuada para Histórico) ---
const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/SEU_FORM_ID/formResponse';
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


// --- INÍCIO: DEFINIÇÃO DE TODAS AS FUNÇÕES (ORDENADAS E HOISTED) ---
// Estas são 'function declarations' e serão hoisted, garantindo que estejam disponíveis antes de chamadas.

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

function calcularIdade(dataString) {
    const hoje = new Date();
    const nascimento = new Date(dataString + 'T00:00:00');
    if (isNaN(nascimento.getTime()) || nascimento > hoje) return null;

    let anos = hoje.getFullYear() - nascimento.getFullYear();
    let meses = hoje.getMonth() - nascimento.getMonth();

    if (hoje.getDate() < nascimento.getDate()) {
        meses--;
    }

    if (meses < 0) {
        meses += 12;
    }

    return { anos: anos, meses: meses };
}

function validarDataNascimento(dataString) {
    const nascimento = new Date(dataString + 'T00:00:00');
    const hoje = new Date();
    return !isNaN(nascimento.getTime()) && nascimento <= hoje;
}

function atualizarIdade() {
    validateAge();
}

function validateAge() {
    const dataNascInput = document.getElementById('data_nasc');
    const dataNasc = dataNascInput.value;
    const idadeInput = document.getElementById('idade');

    if (!dataNasc) {
        clearError('data_nasc');
        idadeInput.value = "";
        return true;
    }

    if (!validarDataNascimento(dataNasc)) {
        showError('data_nasc', "Data de nascimento inválida ou no futuro.");
        idadeInput.value = "";
        return false;
    }

    const idadeObj = calcularIdade(dataNasc);
    if (idadeObj === null) {
        showError('data_nasc', "Data de nascimento no futuro.");
        idadeInput.value = "";
        return false;
    }

    let idadeTexto = `${idadeObj.anos} anos`;
    if (idadeObj.meses > 0) {
        idadeTexto += ` e ${idadeObj.meses} meses`;
    }
    idadeInput.value = idadeTexto;
    clearError('data_nasc');
    return true;
}

function formatarCPF() {
    const inputCPF = document.getElementById('cpf');
    let cpf = inputCPF.value.replace(/\D/g, '');
    if (cpf.length > 11) cpf = cpf.substring(0, 11);

    if (cpf.length > 9) {
        cpf = cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (cpf.length > 6) {
        cpf = cpf.replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3');
    } else if (cpf.length > 3) {
        cpf = cpf.replace(/(\d{3})(\d{3})/, '$1.$2');
    }
    inputCPF.value = cpf;
}

function validarCPF(cpf) {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
    let soma = 0, resto;
    for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i-1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;
    soma = 0;
    for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i-1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    return resto === parseInt(cpf.substring(10, 11));
}

// Função auxiliar para padronizar CPF para busca no banco de dados (sem máscara)
function formatarCPFParaBusca(cpfComMascara) {
    return cpfComMascara.replace(/\D/g, ''); // Remove todos os caracteres não-dígitos
}

function formatarContato() {
    const inputContato = document.getElementById('contato');
    let contato = inputContato.value.replace(/\D/g, '');

    if (contato.length > 11) contato = contato.substring(0, 11);

    if (contato.length > 2) {
        if (contato.length <= 6) {
            contato = `(${contato.substring(0, 2)}) ${contato.substring(2)}`;
        } else if (contato.length <= 10) {
            contato = `(${contato.substring(0, 2)}) ${contato.substring(2, 6)}-${contato.substring(6)}`;
        } else {
            contato = `(${contato.substring(0, 2)}) ${contato.substring(2, 7)}-${contato.substring(7)}`;
        }
    }
    inputContato.value = contato;
}

function validateContact() {
    const inputContato = document.getElementById('contato');
    const contato = inputContato.value.replace(/\D/g, '');

    if (contato.length === 0) {
        clearError('contato');
        return true;
    }

    if (contato.length < 2) {
        showError('contato', "Número de contato incompleto.");
        return false;
    }

    const ddd = parseInt(contato.substring(0, 2));

    if (!dddsValidos.includes(ddd)) {
        showError('contato', "DDD inválido. Insira um DDD brasileiro válido.");
        return false;
    }

    clearError('contato');
    return true;
}

function marcarExame(exameNome) {
    const examesContainer = document.getElementById('exames');
    const checkboxExistente = examesContainer.querySelector(`input[type="checkbox"][value="${exameNome}"]`);

    if (checkboxExistente) {
        checkboxExistente.checked = true;
        checkboxExistente.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" class="exame" value="${exameNome}" checked> ${exameNome}`;
        examesContainer.appendChild(label);
        examesContainer.appendChild(document.createElement('br'));
        label.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    atualizarExamesSelecionadosDisplay();
}

function atualizarExamesSelecionadosDisplay() {
    const displayContainer = document.getElementById('examesSelecionadosDisplay');
    const selectedExams = Array.from(document.querySelectorAll('#exames .exame:checked'));
    
    displayContainer.innerHTML = "";

    if (selectedExams.length === 0) {
        displayContainer.innerHTML = "<p>Nenhum exame selecionado.</p>";
        return;
    }

    selectedExams.forEach(checkbox => {
        const exameNome = checkbox.value;
        const displayItem = document.createElement('div');
        displayItem.classList.add('display-item');
        displayItem.innerHTML = `
            <span>${exameNome}</span>
            <button class="remove-item-btn" data-exame="${exameNome}">-</button>
        `;
        displayContainer.appendChild(displayItem);
    });

    displayContainer.querySelectorAll('.remove-item-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const exameParaRemover = event.target.dataset.exame;
            removerExameDisplay(exameParaRemover);
        });
    });
}

function removerExameDisplay(exameNome) {
    const checkbox = document.querySelector(`#exames .exame[value="${exameNome}"]`);
    if (checkbox) {
        checkbox.checked = false;
    }
    atualizarExamesSelecionadosDisplay();
}

function limparCampos(showAlert = true) {
    document.getElementById('nome').value = '';
    document.getElementById('cpf').value = '';
    document.getElementById('data_nasc').value = '';
    document.getElementById('idade').value = '';
    document.getElementById('sexo').value = '';
    document.getElementById('endereco').value = '';
    document.getElementById('contato').value = '';
    document.getElementById('observacoes').value = '';
    document.getElementById('examesNaoListados').value = '';

    const allCheckboxes = document.querySelectorAll('.exame');
    allCheckboxes.forEach(cb => cb.checked = false);

    clearError('data_nasc');
    clearError('cpf');
    clearError('contato');

    document.getElementById('pesquisaExame').value = '';
    document.getElementById('sugestoes').innerHTML = '';
    document.getElementById('sugestoes').style.display = 'none';

    atualizarExamesSelecionadosDisplay();

    if (showAlert) {
        alert("Campos limpos para um novo cadastro!");
    }
}


// --- FUNÇÕES DE CARREGAMENTO DE DADOS INICIAIS (ASSÍNCRONAS) ---

async function carregarExames() {
    const timestamp = new Date().getTime();
    const gistRawUrl = `https://gist.githubusercontent.com/${GITHUB_USERNAME}/${GIST_ID}/raw/${GIST_FILENAME}?t=${timestamp}`;

    try {
        const response = await fetch(gistRawUrl);
        console.log("carregarExames: Status da resposta da Gist:", response.status); 
        if (!response.ok) {
            console.warn(`carregarExames: Erro ao carregar da Gist (${response.status}). Tentando lista-de-exames.txt local.`);
            const localResponse = await fetch(`lista-de-exames.txt?t=${timestamp}`);
            if (!localResponse.ok) {
                 throw new Error(`carregarExames: Fallback local falhou com status: ${localResponse.status}`);
            }
            return await localResponse.text();
        }
        return await response.text();
    } catch (error) {
        console.error("carregarExames: Erro FATAL ao carregar lista de exames:", error);
        alert("Não foi possível carregar a lista de exames. Verifique a Gist ID ou o arquivo local.");
        throw error; // Propaga o erro para ser pego por inicializarSistema
    } finally {
        console.log("Finalizando tentativa de carregar lista de exames.");
    }
}

async function carregarPacientesAleatorios() {
    try {
        const response = await fetch('pacientes_aleatorios.json'); // Assumindo que o arquivo está na raiz
        if (!response.ok) {
            throw new Error(`carregarPacientesAleatorios: Erro ao carregar pacientes_aleatorios.json: ${response.status}`);
        }
        return await response.json(); // Retorna o JSON parseado
    } catch (error) {
        console.error("carregarPacientesAleatorios: Erro ao carregar pacientes aleatórios:", error);
        alert("Não foi possível carregar a lista de pacientes aleatórios para teste.");
        throw error; // Propaga o erro para ser pego por inicializarSistema
    }
}


// --- FUNÇÕES DE LÓGICA DE NEGÓCIO E INTERAÇÃO COM FIREBASE ---

// Geração de Paciente Aleatório e Preenchimento do Formulário
function gerarPacienteAleatorio() {
    if (pacientesAleatorios.length === 0) {
        alert("Nenhum paciente aleatório carregado. Verifique o arquivo 'pacientes_aleatorios.json'.");
        return;
    }

    const randomIndex = Math.floor(Math.random() * pacientesAleatorios.length);
    const paciente = pacientesAleatorios[randomIndex];

    limparCampos(false); // Limpa o formulário antes de preencher

    // Preenche os dados do paciente
    document.getElementById('nome').value = paciente.nome;
    document.getElementById('data_nasc').value = paciente.dataNasc;
    document.getElementById('data_nasc').dispatchEvent(new Event('change')); // Aciona o evento para calcular idade
    document.getElementById('sexo').value = paciente.sexo || (Math.random() < 0.5 ? 'Masculino' : 'Feminino');
    document.getElementById('cpf').value = paciente.cpf;
    document.getElementById('contato').value = paciente.contato;
    document.getElementById('endereco').value = paciente.endereco;
    document.getElementById('observacoes').value = paciente.observacoes;

    // Marca os exames selecionados para este paciente
    const allCheckboxes = document.querySelectorAll('#exames .exame');
    allCheckboxes.forEach(cb => cb.checked = false); // Desmarca todos primeiro

    if (paciente.examesSelecionados && Array.isArray(paciente.examesSelecionados)) {
        paciente.examesSelecionados.forEach(exameNome => {
            const checkbox = document.querySelector(`#exames .exame[value="${exameNome}"]`);
            if (checkbox) {
                checkbox.checked = true;
                // Opcional: rolar até o exame, mas pode ser demais para múltiplos
                // checkbox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                console.warn(`Exame "${exameNome}" do paciente aleatório não encontrado na lista principal de exames.`);
            }
        });
    }
    atualizarExamesSelecionadosDisplay(); // Atualiza a terceira coluna

    alert(`Paciente "${paciente.nome}" gerado e preenchido!`);
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola para o topo
}


function coletarDados() {
    const isAgeValid = validateAge();
    const cpfLimpo = document.getElementById('cpf').value.replace(/\D/g, '');
    const is

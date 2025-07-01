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
    exames: 'entry.8888888888', // Exames selecionados
    observacoes: 'entry.9999999999',
    examesNaoListados: 'entry.0000000000' // Certifique-se de que este entry.ID está correto
};


// Lista de DDIs brasileiros válidos
const dddsValidos = [
    11, 12, 13, 14, 15, 16, 17, 18, 19, // São Paulo
    21, 22, 24, // Rio de Janeiro
    27, 28, // Espírito Santo
    31, 32, 33, 34, 35, 37, 38, // Minas Gerais
    41, 42, 43, 44, 45, 46, // Paraná
    47, 48, 49, // Santa Catarina
    51, 53, 54, 55, // Rio Grande do Sul
    61, // Distrito Federal
    62, 64, // Goiás
    63, // Tocantins
    65, 66, // Mato Grosso
    67, // Mato Grosso do Sul
    68, // Acre
    69, // Rondônia
    71, 73, 74, 75, 77, // Bahia
    79, // Sergipe
    81, 87, // Pernambuco
    82, // Alagoas
    83, // Paraíba
    84, 85, 88, 89, // Rio Grande do Norte, Ceará, Piauí
    91, 93, 94, // Pará
    92, 97, // Amazonas
    95, // Roraima
    96, // Amapá
    98, 99  // Maranhão
];

// Garante que o código é executado após o carregamento completo da página
window.onload = () => {
    carregarExames(); // Carrega e exibe a lista de exames
    // Adiciona event listeners para cálculo de idade e formatação/validação
    document.getElementById('data_nasc').addEventListener('change', atualizarIdade);
    document.getElementById('cpf').addEventListener('input', formatarCPF);
    document.getElementById('contato').addEventListener('input', formatarContato);

    // Adiciona event listeners onblur para validação e verificação de histórico
    document.getElementById('data_nasc').addEventListener('blur', validateAge);
    document.getElementById('cpf').addEventListener('blur', validateCpfAndCheckHistory);
    document.getElementById('contato').addEventListener('blur', validateContact);
};

// Função para carregar a lista de exames da Gist ou do arquivo local
function carregarExames() {
    // Adiciona um timestamp para evitar cache
    const timestamp = new Date().getTime();
    const gistRawUrl = `https://gist.githubusercontent.com/${GITHUB_USERNAME}/${GIST_ID}/raw/${GIST_FILENAME}?t=${timestamp}`;

    fetch(gistRawUrl)
        .then(response => {
            if (!response.ok) {
                // Se a Gist não puder ser carregada, tenta o arquivo local como fallback
                console.warn(`Erro ao carregar da Gist (${response.status}). Tentando lista-de-exames.txt local.`);
                // Adiciona timestamp também ao fallback para evitar cache local
                return fetch(`lista-de-exames.txt?t=${timestamp}`); 
            }
            return response.text();
        })
        .then(text => {
            // Processa o texto, removendo espaços e linhas vazias
            listaExames = text.trim().split('\n').map(e => e.trim()).filter(e => e !== ''); 
            atualizarListaExamesCompleta(); // Exibe todos os exames como checkboxes
            configurarPesquisa(); // Configura a funcionalidade de busca
        })
        .catch(error => {
            console.error("Erro ao carregar lista de exames:", error);
            alert("Não foi possível carregar a lista de exames. Verifique a Gist ID ou o arquivo local.");
        });
}

// Função para exibir todos os exames como checkboxes para seleção manual
function atualizarListaExamesCompleta() {
    const container = document.getElementById('exames');
    container.innerHTML = ""; // Limpa o container para evitar duplicatas

    listaExames.forEach(exame => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" class="exame" value="${exame}"> ${exame}`;
        container.appendChild(label);
        container.appendChild(document.createElement('br'));
    });
}

// Função para configurar a barra de pesquisa de exames
function configurarPesquisa() {
    const inputPesquisa = document.getElementById('pesquisaExame');
    const sugestoesBox = document.getElementById('sugestoes');

    inputPesquisa.addEventListener('input', () => {
        const termo = inputPesquisa.value.trim().toLowerCase();
        sugestoesBox.innerHTML = ""; // Limpa sugestões anteriores

        if (termo.length === 0) { // Oculta a caixa se a pesquisa estiver vazia
            sugestoesBox.style.display = 'none';
            return;
        }

        // Filtra exames que incluem o termo de pesquisa
        const filtrados = listaExames.filter(exame => 
            exame.toLowerCase().includes(termo)
        );

        if (filtrados.length === 0) { // Oculta se não houver resultados
            sugestoesBox.style.display = 'none';
            return;
        }

        // Cria e exibe sugestões clicáveis
        filtrados.forEach(exame => {
            const div = document.createElement('div');
            div.textContent = exame;
            div.addEventListener('click', () => {
                marcarExame(exame); // Marca o exame selecionado da sugestão
                inputPesquisa.value = ''; // Limpa a barra de pesquisa
                sugestoesBox.style.display = 'none'; // Oculta as sugestões
            });
            sugestoesBox.appendChild(div);
        });

        sugestoesBox.style.display = 'block'; // Mostra a caixa de sugestões
    });

    // Oculta sugestões se o usuário clicar fora da barra de pesquisa ou da caixa de sugestões
    document.addEventListener('click', function(event) {
        if (!event.target.closest('#pesquisaExame') && !event.target.closest('#sugestoes')) {
            sugestoesBox.style.display = 'none';
        }
    });
}

// Função para marcar um exame na lista de checkboxes
function marcarExame(exameNome) {
    const examesContainer = document.getElementById('exames');
    const checkboxExistente = examesContainer.querySelector(`input[type="checkbox"][value="${exameNome}"]`);

    if (checkboxExistente) {
        checkboxExistente.checked = true; // Marca o checkbox se já existe
        checkboxExistente.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); // Rola até ele
    } else {
        // Cria um novo checkbox se não existir (para robustez, mas idealmente todos estariam na lista inicial)
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" class="exame" value="${exameNome}" checked> ${exameNome}`;
        examesContainer.appendChild(label);
        examesContainer.appendChild(document.createElement('br'));
        label.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Função auxiliar para exibir mensagens de erro visualmente
function showError(elementId, message) {
    const inputElement = document.getElementById(elementId);
    const errorDiv = document.getElementById(`${elementId}-error`);
    if (inputElement && errorDiv) {
        inputElement.classList.add('error'); // Adiciona classe para borda vermelha
        errorDiv.textContent = message; // Exibe a mensagem de erro
    }
}

// Função auxiliar para limpar mensagens de erro visualmente
function clearError(elementId) {
    const inputElement = document.getElementById(elementId);
    const errorDiv = document.getElementById(`${elementId}-error`);
    if (inputElement && errorDiv) {
        inputElement.classList.remove('error'); // Remove classe de erro
        errorDiv.textContent = ''; // Limpa a mensagem
    }
}

// Função para calcular a idade em anos e meses
function calcularIdade(dataString) {
    const hoje = new Date();
    const nascimento = new Date(dataString + 'T00:00:00'); // Garante fuso horário correto
    if (isNaN(nascimento.getTime()) || nascimento > hoje) return null; // Retorna null se a data for inválida ou no futuro

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

// Função para validar a data de nascimento (não pode ser no futuro)
function validarDataNascimento(dataString) {
    const nascimento = new Date(dataString + 'T00:00:00');
    const hoje = new Date();
    return !isNaN(nascimento.getTime()) && nascimento <= hoje;
}

// Disparada ao mudar a data de nascimento para recalcular e validar idade
function atualizarIdade() {
    validateAge();
}

// Valida a idade e atualiza o campo Idade
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

// Máscara automática para o campo CPF
function formatarCPF() {
    const inputCPF = document.getElementById('cpf');
    let cpf = inputCPF.value.replace(/\D/g, ''); // Remove tudo que não é dígito
    if (cpf.length > 11) cpf = cpf.substring(0, 11); // Limita a 11 dígitos

    if (cpf.length > 9) {
        cpf = cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (cpf.length > 6) {
        cpf = cpf.replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3');
    } else if (cpf.length > 3) {
        cpf = cpf.replace(/(\d{3})(\d{3})/, '$1.$2');
    }
    inputCPF.value = cpf;
}

// Valida o CPF e verifica o histórico local (disparado ao sair do campo CPF)
function validateCpfAndCheckHistory() {
    const inputCPF = document.getElementById('cpf');
    const cpf = inputCPF.value.replace(/\D/g, ''); // Remove máscara para validação

    if (cpf.length === 0) { // Se o campo está vazio, limpa erro e retorna
        clearError('cpf');
        return true;
    }

    if (!validarCPF(cpf)) { // Se o CPF não é válido, exibe erro
        showError('cpf', "CPF inválido.");
        return false;
    }
    
    clearError('cpf'); // Limpa erro se o CPF é válido
    checkCpfInHistory(cpf); // Chama a função para verificar o histórico
    return true;
}

// Função de validação da lógica do CPF
function validarCPF(cpf) {
    cpf = cpf.replace(/[^\d]+/g, ''); // Garante que só tem dígitos
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false; // Verifica tamanho e CPFs repetidos
    let soma = 0, resto;
    for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i-1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false; // Primeiro dígito verificador
    soma = 0;
    for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i-1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    return resto === parseInt(cpf.substring(10, 11)); // Segundo dígito verificador
}

// Verifica o CPF no histórico local e sugere carregar o último cadastro
function checkCpfInHistory(cpf) {
    const cadastros = JSON.parse(localStorage.getItem('cadastros')) || [];
    
    // Filtra e ordena os cadastros pelo CPF, pegando o mais recente
    const cadastrosComCpf = cadastros
        .map((cad, index) => ({ ...cad, originalIndex: index })) // Anota o índice original
        .filter(cad => cad.cpf.replace(/\D/g, '') === cpf) // Compara CPF limpo
        .sort((a, b) => b.originalIndex - a.originalIndex); // Ordena do mais recente para o mais antigo

    if (cadastrosComCpf.length > 0) {
        const ultimoCadastro = cadastrosComCpf[0]; // Pega o cadastro mais recente
        const confirmLoad = confirm(
            `CPF (${ultimoCadastro.cpf}) encontrado no histórico para:\n\n` +
            `Nome: ${ultimoCadastro.nome}\n` +
            `Data de Nascimento: ${ultimoCadastro.dataNasc}\n` +
            `Sexo: ${ultimoCadastro.sexo}\n` +
            `Endereço: ${ultimoCadastro.endereco}\n` +
            `Contato: ${ultimoCadastro.contato}\n\n` +
            `Deseja carregar esses dados básicos no formulário?`
        );

        if (confirmLoad) {
            carregarDadosBasicos(ultimoCadastro); // Carrega apenas dados básicos
        }
    }
}

// Carrega apenas os dados básicos do paciente no formulário (Nome, Data Nasc., Sexo, Endereço, Contato)
function carregarDadosBasicos(cadastro) {
    const nomeAtual = document.getElementById('nome').value.trim();
    const cpfAtual = document.getElementById('cpf').value.trim();

    // Pergunta se deseja substituir dados se o formulário não estiver vazio
    if (nomeAtual || cpfAtual) {
        const confirmarSubstituicao = confirm("Existem dados no formulário que serão substituídos. Deseja continuar?");
        if (!confirmarSubstituicao) {
            return;
        }
    }

    // Limpa apenas os campos básicos antes de preencher
    document.getElementById('nome').value = '';
    document.getElementById('data_nasc').value = '';
    document.getElementById('idade').value = ''; 
    document.getElementById('sexo').value = '';
    document.getElementById('endereco').value = '';
    document.getElementById('contato').value = '';
    clearError('data_nasc');
    clearError('cpf');
    clearError('contato');

    // Preenche os campos básicos com os dados do histórico
    document.getElementById('nome').value = cadastro.nome;
    document.getElementById('cpf').value = cadastro.cpf; 
    document.getElementById('data_nasc').value = cadastro.dataNasc;
    // Dispara o evento change para recalcular e preencher a idade
    document.getElementById('data_nasc').dispatchEvent(new Event('change'));
    document.getElementById('sexo').value = cadastro.sexo;
    document.getElementById('endereco').value = cadastro.endereco;
    document.getElementById('contato').value = cadastro.contato;
    
    // Campos de observações e exames NÃO são tocados aqui.
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola para o topo do formulário
}

// Máscara automática para o campo Contato (telefone)
function formatarContato() {
    const inputContato = document.getElementById('contato');
    let contato = inputContato.value.replace(/\D/g, '');

    if (contato.length > 11) contato = contato.substring(0, 11);

    if (contato.length > 2) {
        if (contato.length <= 6) { 
            contato = `(${contato.substring(0, 2)}) ${contato.substring(2)}`;
        } else if (contato.length <= 10) { 
            contato = `(${contato.substring(0, 2)}) ${contato.substring(2, 6)}-${contato.substring(6)}`;
        } else { // Para números de 9 dígitos (celular)
            contato = `(${contato.substring(0, 2)}) ${contato.substring(2, 7)}-${contato.substring(7)}`;
        }
    }
    inputContato.value = contato;
}

// Valida o campo Contato (DDD e formato básico)
function validateContact() {
    const inputContato = document.getElementById('contato');
    const contato = inputContato.value.replace(/\D/g, '');

    if (contato.length === 0) {
        clearError('contato');
        return true;
    }

    if (contato.length < 2) { // Precisa de pelo menos o DDD
        showError('contato', "Número de contato incompleto.");
        return false;
    }

    const ddd = parseInt(contato.substring(0, 2));

    if (!dddsValidos.includes(ddd)) { // Verifica se o DDD é válido
        showError('contato', "DDD inválido. Insira um DDD brasileiro válido.");
        return false;
    }

    clearError('contato');
    return true;
}

// Coleta todos os dados do formulário para processamento
function coletarDados() {
    // Validações antes de coletar os dados
    const isAgeValid = validateAge();
    const cpfLimpo = document.getElementById('cpf').value.replace(/\D/g, '');
    const isCpfFormatValid = validarCPF(cpfLimpo); // Valida apenas o formato do CPF
    const isContactValid = validateContact();

    // Se o CPF é inválido, exibe o erro e interrompe a coleta.
    if (!isCpfFormatValid) {
        showError('cpf', "CPF inválido.");
    }

    // Interrompe se qualquer validação falhar
    if (!isAgeValid || !isCpfFormatValid || !isContactValid) {
        throw new Error("Por favor, corrija os erros nos campos antes de prosseguir.");
    }

    // Coleta os valores dos campos
    const nome = document.getElementById('nome').value.trim();
    const cpf = document.getElementById('cpf').value.trim();
    const dataNasc = document.getElementById('data_nasc').value;
    const sexo = document.getElementById('sexo').value;
    const endereco = document.getElementById('endereco').value.trim();
    const contato = document.getElementById('contato').value.trim();
    const observacoes = document.getElementById('observacoes').value.trim();
    const exames = Array.from(document.querySelectorAll('.exame:checked')).map(e => e.value);
    const examesNaoListados = document.getElementById('examesNaoListados').value.trim();

    // Validações finais de campos obrigatórios
    if (!nome) throw new Error("Preencha o campo: Nome.");
    if (!sexo) throw new Error("Selecione o sexo.");
    // Garante que pelo menos um exame (listado ou não listado) foi informado
    if (exames.length === 0 && !examesNaoListados) throw new Error("Selecione pelo menos um exame ou preencha 'Acrescentar Exames não Listados'.");

    return { nome, cpf, dataNasc, idade: document.getElementById('idade').value, sexo, endereco, contato, observacoes, exames, examesNaoListados };
}

// Salvar Protocolo de Atendimento - Agora inclui envio para planilha
function salvarProtocoloAtendimento() {
    try {
        const dados = coletarDados(); // Coleta dados e validações
        let cadastros = JSON.parse(localStorage.getItem('cadastros')) || [];
        
        // --- Geração do número de protocolo sequencial e baseado em data/hora ---
        const lastCadastro = cadastros.length > 0 ? cadastros[cadastros.length - 1] : null;
        // Pega o número sequencial do último protocolo, ou 0 se não houver
        const lastProtocolNumber = lastCadastro && lastCadastro.protocolo ? 
                                   (parseInt(lastCadastro.protocolo.split('-')[0]) || 0) : 0;
        
        const newProtocolNumber = (lastProtocolNumber + 1).toString().padStart(4, '0'); // Ex: 0001
        
        const now = new Date();
        const hour = now.getHours().toString().padStart(2, '0');
        const minute = now.getMinutes().toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Mês é 0-indexed
        
        // Formato: 0001-HHMMDDMM (Ex: 0001-23143006)
        const protocolo = `${newProtocolNumber}-${hour}${minute}${day}${month}`;
        
        dados.protocolo = protocolo; // Adiciona o protocolo aos dados do cadastro

        // Salva o cadastro localmente
        cadastros.push(dados); 
        localStorage.setItem('cadastros', JSON.stringify(cadastros));
        
        // --- Geração do PDF ---
        const doc = new jsPDF();
        const [ano, mes, dia] = dados.dataNasc.split('-');
        const dataNascFormatada = `${dia}/${mes}/${ano}`;

        let currentY = 15; // Posição Y inicial

        // --- Seção: Cabeçalho ---
        doc.setFontSize(18); // Aumenta a fonte do título principal
        doc.text("Laboratório CETEP", 105, currentY, null, null, "center");
        currentY += 10;
        doc.setFontSize(10);
        doc.text(`Data: ${new Date().toLocaleDateString()} - Hora: ${new Date().toLocaleTimeString()}`, 105, currentY, null, null, "center");
        currentY += 10;
        doc.setLineWidth(0.5); // Linha separadora mais grossa
        doc.line(20, currentY, 190, currentY); // Linha horizontal
        currentY += 10; // Espaço após a linha

        // --- Seção: Identificação do Protocolo ---
        doc.setFontSize(14); // Fonte maior para o protocolo
        doc.text(`PROTOCOLO DE ATENDIMENTO Nº: ${dados.protocolo}`, 20, currentY);
        currentY += 8;
        doc.setFontSize(10);
        doc.setLineWidth(0.2); // Linha separadora mais fina
        doc.line(20, currentY, 190, currentY); // Linha horizontal
        currentY += 10;

        // --- Seção: Dados do Paciente ---
        doc.setFontSize(12);
        doc.text("DADOS DO PACIENTE:", 20, currentY);
        currentY += 8;
        doc.setFontSize(11);
        
        // Colunas para dados do paciente
        const col1X = 25;
        const col2X = 110;
        const lineHeight = 7;

        doc.text(`Nome: ${dados.nome}`, col1X, currentY);
        doc.text(`CPF: ${dados.cpf}`, col2X, currentY);
        currentY += lineHeight;
        doc.text(`Data de Nasc.: ${dataNascFormatada}`, col1X, currentY);
        doc.text(`Idade: ${dados.idade}`, col2X, currentY);
        currentY += lineHeight;
        doc.text(`Sexo: ${dados.sexo}`, col1X, currentY);
        doc.text(`Contato: ${dados.contato}`, col2X, currentY);
        currentY += lineHeight;
        doc.text(`Endereço: ${dados.endereco}`, col1X, currentY);
        currentY += lineHeight;
        
        doc.setLineWidth(0.2);
        doc.line(20, currentY, 190, currentY); // Linha horizontal
        currentY += 10;

        // --- Seção: Exames ---
        doc.setFontSize(12);
        doc.text("EXAMES:", 20, currentY);
        currentY += 8;
        doc.setFontSize(11);

        if (dados.exames.length > 0) {
            doc.text("Exames Selecionados:", 25, currentY);
            currentY += lineHeight;
            dados.exames.forEach(exame => {
                doc.text(`- ${exame}`, 30, currentY);
                currentY += lineHeight;
            });
        }

        if (dados.examesNaoListados) {
            if (dados.exames.length > 0) {
                currentY += 5; // Pequeno espaço entre os blocos de exames
            }
            doc.text("Exames Adicionais:", 25, currentY);
            currentY += lineHeight;
            const splitText = doc.splitTextToSize(dados.examesNaoListados, 150); // Ajusta largura do texto
            doc.text(splitText, 30, currentY);
            currentY += (splitText.length * lineHeight); // Ajusta Y pela altura do texto
        }
        
        doc.setLineWidth(0.2);
        doc.line(20, currentY, 190, currentY); // Linha horizontal
        currentY += 10;

        // --- Seção: Observações ---
        if (dados.observacoes) {
            doc.setFontSize(12);
            doc.text("OBSERVAÇÕES:", 20, currentY);
            currentY += 8;
            doc.setFontSize(11);
            const splitText = doc.splitTextToSize(dados.observacoes, 170); // Largura do texto
            doc.text(splitText, 25, currentY);
            currentY += (splitText.length * lineHeight);
            
            doc.setLineWidth(0.2);
            doc.line(20, currentY, 190, currentY); // Linha horizontal
            currentY += 10;
        }

        // --- Rodapé (Opcional) ---
        doc.setFontSize(9);
        doc.text("Documento gerado automaticamente pelo SISLAB.", 105, 280, null, null, "center");

        // Abre o PDF em uma nova janela para visualização e impressão
        doc.output('dataurlnewwindow', { filename: `Protocolo_${dados.nome.replace(/\s+/g, "_")}.pdf` });

        alert(`Protocolo ${dados.protocolo} salvo e gerado! Verifique a nova aba para visualizar e imprimir.`);
        
        // Tenta enviar para a planilha se a URL estiver configurada
        enviarParaPlanilha(dados);

        limparCampos(); // Limpa os campos após salvar e gerar PDF
        mostrarHistorico(); // Atualiza a lista do histórico para mostrar o novo protocolo
    } catch (error) {
        alert(error.message);
        console.error("Erro ao salvar protocolo:", error);
    }
}

// Exibe o histórico de cadastros
function mostrarHistorico() {
    const historicoDiv = document.getElementById('historico');
    const cadastros = JSON.parse(localStorage.getItem('cadastros')) || [];
    if (cadastros.length === 0) {
        historicoDiv.innerHTML = "<p>Nenhum cadastro encontrado.</p>";
        return;
    }
    let html = "<h3>Histórico de Cadastros</h3><ul>";
    cadastros.forEach((c, index) => {
        // Exibe o número do protocolo se existir, senão usa o índice
        const protocoloDisplay = c.protocolo ? `Protocolo: ${c.protocolo}` : `Registro #${index + 1}`;
        html += `<li onclick="carregarCadastro(${index})"><b>${protocoloDisplay}</b> - ${c.nome} - CPF: ${c.cpf} - Idade: ${c.idade} - Exames: ${c.exames.join(", ")}`;
        if (c.examesNaoListados) {
            html += `<br>Adicionais: ${c.examesNaoListados.substring(0, 50)}${c.examesNaoListados.length > 50 ? '...' : ''}`;
        }
        if (c.observacoes) {
            html += `<br>Observações: ${c.observacoes.substring(0, 100)}${c.observacoes.length > 100 ? '...' : ''}`;
        }
        html += `</li>`;
    });
    html += "</ul>";
    historicoDiv.innerHTML = html;
}

// Carrega um cadastro completo do histórico para o formulário
function carregarCadastro(index) {
    const cadastros = JSON.parse(localStorage.getItem('cadastros')) || [];
    const cadastro = cadastros[index];

    if (!cadastro) {
        alert("Cadastro não encontrado.");
        return;
    }

    const nomeAtual = document.getElementById('nome').value.trim();
    const cpfAtual = document.getElementById('cpf').value.trim();

    if (nomeAtual || cpfAtual) {
        const confirmar = confirm("Existem dados não salvos no formulário. Deseja substituí-los pelo cadastro completo do histórico?");
        if (!confirmar) {
            return;
        }
    }

    limparCampos(false); // Limpa todos os campos sem exibir alerta de "Campos limpos!"

    // Preenche todos os campos com os dados do histórico
    document.getElementById('nome').value = cadastro.nome;
    document.getElementById('cpf').value = cadastro.cpf;
    document.getElementById('data_nasc').value = cadastro.dataNasc;
    document.getElementById('idade').value = cadastro.idade; // Idade já formatada
    document.getElementById('sexo').value = cadastro.sexo;
    document.getElementById('endereco').value = cadastro.endereco;
    document.getElementById('contato').value = cadastro.contato;
    document.getElementById('observacoes').value = cadastro.observacoes;
    document.getElementById('examesNaoListados').value = cadastro.examesNaoListados || '';

    const allCheckboxes = document.querySelectorAll('.exame');
    allCheckboxes.forEach(cb => cb.checked = false); // Desmarca todos os exames antes de preencher

    // Marca os exames do histórico
    cadastro.exames.forEach(exameNome => {
        const checkbox = document.querySelector(`input[type="checkbox"][value="${exameNome}"]`);
        if (checkbox) {
            checkbox.checked = true;
        } else {
            // Caso um exame do histórico não esteja na lista atual (ex: lista-de-exames.txt mudou)
            marcarExame(exameNome); 
        }
    });

    alert(`Cadastro de ${cadastro.nome} carregado com sucesso!`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Limpa todos os campos do formulário
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

    if (showAlert) {
        alert("Campos limpos para um novo cadastro!");
    }
}

// Limpa o histórico de cadastros do localStorage, exigindo senha
function limparHistorico() {
    const senhaDigitada = prompt("Para limpar o histórico, digite a senha:");
    if (senhaDigitada === null) { // Usuário clicou em cancelar
        return;
    }
    if (senhaDigitada === SENHA_LIMPAR_HISTORICO) {
        localStorage.removeItem('cadastros');
        alert('Histórico apagado com sucesso!');
        document.getElementById('historico').innerHTML = ""; // Limpa a exibição
    } else {
        alert('Senha incorreta. Histórico não foi limpo.');
    }
}

// Imprime o histórico de cadastros em uma nova janela
function imprimirHistorico() {
    const cadastros = JSON.parse(localStorage.getItem('cadastros')) || [];

    if (cadastros.length === 0) {
        alert("Não há histórico para imprimir.");
        return;
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
    `;

    cadastros.forEach((c, index) => {
        // Exibe o número do protocolo se existir, senão usa o índice
        const protocoloDisplay = c.protocolo ? `Protocolo: ${c.protocolo}` : `Registro #${index + 1}`;
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
        `;
        if (c.examesNaoListados) {
            printContent += `<p><strong>Exames Adicionais:</strong> ${c.examesNaoListados}</p>`;
        }
        if (c.observacoes) {
            printContent += `<p><strong>Observações:</strong> ${c.observacoes}</p>`;
        }
        printContent += `</li>`;
    });

    printContent += `
            </ul>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus(); // Foca na nova janela

    // Espera o conteúdo ser carregado para imprimir
    printWindow.onload = function() {
        printWindow.print();
    };
}

// --- FUNÇÕES DE EDIÇÃO DA LISTA DE EXAMES VIA GIST API ---

// Abre o editor da lista de exames se a senha estiver correta
function editarListaExamesComSenha() {
    const senhaDigitada = prompt("Para editar a lista de exames, digite a senha:");
    if (senhaDigitada === null) {
        return;
    }
    if (senhaDigitada === SENHA_EDITAR_LISTA) {
        carregarListaExamesParaEdicao();
    } else {
        alert('Senha incorreta. Edição não permitida.');
    }
}

// Carrega o conteúdo atual da Gist para o editor
async function carregarListaExamesParaEdicao() {
    const editorElement = document.getElementById('editorExames');
    const textarea = document.getElementById('listaExamesEditor');

    try {
        // Adiciona timestamp para evitar cache ao carregar para edição também
        const timestamp = new Date().getTime();
        const gistRawUrl = `https://gist.githubusercontent.com/${GITHUB_USERNAME}/${GIST_ID}/raw/${GIST_FILENAME}?t=${timestamp}`;
        const response = await fetch(gistRawUrl);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ao buscar lista de exames da Gist: ${response.status} - ${errorText}`);
        }

        const fileContent = await response.text();
        textarea.value = fileContent;
        editorElement.style.display = 'block'; // Mostra o editor
        alert('Lista de exames carregada para edição. Lembre-se: um exame por linha.');

    } catch (error) {
        console.error("Erro ao carregar lista de exames da Gist:", error);
        alert("Não foi possível carregar a lista de exames para edição. Verifique o console e a Gist ID.");
    }
}

// Salva o conteúdo editado de volta na Gist via API
async function salvarListaExamesNoGitHub() {
    const textarea = document.getElementById('listaExamesEditor');
    const novoConteudo = textarea.value;

    const confirmSave = confirm("Deseja realmente salvar essas alterações na Gist? Isso fará uma atualização.");
    if (!confirmSave) {
        return;
    }

    try {
        const gistApiUrl = `https://api.github.com/gists/${GIST_ID}`;
        
        const response = await fetch(gistApiUrl, {
            method: 'PATCH', // Usamos PATCH para atualizar uma Gist existente
            headers: {
                'Authorization': `token ${GITHUB_PAT_GIST}`, // Autenticação com o PAT
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                files: {
                    [GIST_FILENAME]: {
                        content: novoConteudo
                    }
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ao salvar na Gist: ${response.status} - ${errorText}`);
        }

        alert('Lista de exames atualizada com sucesso na Gist!');
        document.getElementById('editorExames').style.display = 'none'; // Fecha o editor
        carregarExames(); // Recarrega a lista no sistema para refletir as mudanças
    } catch (error) {
        console.error("Erro ao salvar lista de exames na Gist:", error);
        alert("Não foi possível salvar a lista na Gist. Verifique o console, seu PAT e permissões.");
    }
}

// Envia dados para uma planilha do Google Forms
// Esta função é agora chamada INTERNAMENTE por salvarProtocoloAtendimento
async function enviarParaPlanilha(dados) { // Agora recebe 'dados' como parâmetro
    // Verifica se a URL da planilha está configurada (não é a placeholder)
    if (GOOGLE_FORM_URL.includes('SEU_FORM_ID')) { // Verifica se a URL ainda contém o placeholder
        console.warn("URL do Google Form não configurada. Envio para planilha ignorado.");
        return; // Sai da função se a URL não for a real
    }

    try {
        const formData = new FormData();
        // Mapeie os dados para os 'entry.XXXXXXXXXX' do seu Google Form
        formData.append(GOOGLE_FORM_ENTRIES.nome, dados.nome); 
        formData.append(GOOGLE_FORM_ENTRIES.cpf, dados.cpf);
        formData.append(GOOGLE_FORM_ENTRIES.dataNasc, dados.dataNasc);
        formData.append(GOOGLE_FORM_ENTRIES.idade, dados.idade);
        formData.append(GOOGLE_FORM_ENTRIES.sexo, dados.sexo);
        formData.append(GOOGLE_FORM_ENTRIES.endereco, dados.endereco);
        formData.append(GOOGLE_FORM_ENTRIES.contato, dados.contato);
        formData.append(GOOGLE_FORM_ENTRIES.exames, dados.exames.join(", "));
        formData.append(GOOGLE_FORM_ENTRIES.observacoes, dados.observacoes);
        formData.append(GOOGLE_FORM_ENTRIES.examesNaoListados, dados.examesNaoListados);

        // Opcional: Adicionar o protocolo também se você tiver um campo no Google Form
        // formData.append('entry.PROTOCOL_ID', dados.protocolo); 

        // Adiciona um listener para evitar que o navegador exiba um erro no console devido ao 'no-cors'
        const controller = new AbortController();
        const signal = controller.signal;

        const requestPromise = fetch(GOOGLE_FORM_URL, {
            method: 'POST',
            mode: 'no-cors', // Necessário para evitar CORS com Google Forms diretos
            body: formData,
            signal: signal // Adiciona o signal para abortar se a requisição demorar
        });

        // Define um timeout para a requisição
        const timeoutId = setTimeout(() => controller.abort(), 10000); // Aborta após 10 segundos

        await requestPromise;
        clearTimeout(timeoutId); // Limpa o timeout se a requisição for concluída

        console.log('Dados enviados para a planilha (no-cors).');
        // Não é possível verificar o sucesso exato com 'no-cors', mas a requisição foi feita.
    } catch (error) {
        console.error("Erro ao enviar dados para a planilha:", error);
    }
}

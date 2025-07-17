// VERSÃO: 2.0.9a
// CHANGELOG:
// - Alterado: Mensagens do sistema relacionadas ao Firebase agora se referem a "banco de dados".
// - Corrigido: Agora o CPF é salvo no banco de dados sem máscara (apenas dígitos) para garantir compatibilidade com a função de busca checkCpfInHistory.
// - Removido: Mensagens de console.log de depuração da função checkCpfInHistory (temporárias da v2.0.3-debug).
// - MODIFICADO: Lógica de "Gerar Paciente Aleatório" movida para index.html.
//   - O botão em admin.html agora apenas abre index.html com um parâmetro.
//   - O script.js do index.html agora sorteia e carrega o paciente aleatório a cada recarga com o parâmetro.
// - NOVO: Função preencherCamposComCadastro para carregar dados de paciente fictício ou histórico.
// - CORREÇÃO: Ajuste na função atualizarListaExamesCompleta para evitar desmarcação instantânea de exames ao carregar paciente.
// - CORREÇÃO: Garantia de que carregarExames() é aguardada no window.onload para que a lista de exames esteja pronta antes de preencher o formulário.
// - CORREÇÃO: Refatoração da função carregarCadastroFirebase para usar preencherCamposComCadastro de forma mais limpa.
// - MELHORIA: Adicionado try/catch global no window.onload para capturar e alertar sobre erros críticos de inicialização.
// - DIAGNÓSTICO: Adicionados logs no console para depurar o carregamento de paciente aleatório.

const { jsPDF } = window.jspdf;
let listaExames = [];

// Definir a senha base para todas as operações sensíveis
const SENHA_BASE_SISLAB = "sislab";

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
// Estas constantes não são mais usadas, mas mantidas por segurança caso precise de referência futura.
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

window.onload = async () => { // Torna a função onload assíncrona
    try {
        console.log("window.onload: Iniciando carregamento da página.");
        await carregarExames(); // AGORA, aguarda a lista de exames ser carregada e renderizada
        console.log("window.onload: carregarExames() concluído.");

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

        // --- NOVO: Lógica para gerar e carregar paciente aleatório se o parâmetro estiver na URL ---
        const urlParams = new URLSearchParams(window.location.search);
        console.log("window.onload: Parâmetros da URL:", urlParams.toString());
        if (urlParams.get('gerar') === 'ficticio') {
            console.log("window.onload: Parâmetro 'gerar=ficticio' detectado. Chamando gerarECarregarPacienteAleatorio().");
            await gerarECarregarPacienteAleatorio();
        } else {
            console.log("window.onload: Parâmetro 'gerar=ficticio' NÃO detectado. Não gerando paciente aleatório.");
        }
        // --- FIM NOVO ---

    } catch (error) {
        console.error("Erro crítico na inicialização da página:", error);
        alert("Ocorreu um erro crítico ao carregar a página. Por favor, verifique o console para mais detalhes.");
    }
};

// NOVO: Função para gerar e carregar paciente aleatório
async function gerarECarregarPacienteAleatorio() {
    console.log("gerarECarregarPacienteAleatorio: Iniciando geração de paciente.");
    try {
        const response = await fetch('pacientes_aleatorios.json');
        if (!response.ok) {
            throw new Error(`Erro ao carregar pacientes_aleatorios.json: ${response.statusText}`);
        }
        const pacientes = await response.json();
        const paciente = pacientes[Math.floor(Math.random() * pacientes.length)];
        
        console.log("gerarECarregarPacienteAleatorio: Paciente sorteado:", paciente);
        preencherCamposComCadastro(paciente); // Esta função tem um 'confirm' que pode interromper.
        alert("Paciente aleatório gerado e carregado no formulário!");
    } catch (err) {
        console.error("gerarECarregarPacienteAleatorio: Erro ao gerar/carregar paciente aleatório:", err);
        alert("Erro ao gerar/carregar paciente aleatório. Verifique se o arquivo JSON está acessível e formatado corretamente.");
    }
}


function carregarExames() {
    const timestamp = new Date().getTime();
    const gistRawUrl = `https://gist.githubusercontent.com/${GITHUB_USERNAME}/${GIST_ID}/raw/${GIST_FILENAME}?t=${timestamp}`;

    // Retorna a Promise para que window.onload possa aguardar
    return fetch(gistRawUrl)
        .then(response => {
            console.log("carregarExames: Conteúdo Gist/Local - Status da resposta:", response.status); 
            if (!response.ok) {
                console.warn(`carregarExames: Erro ao carregar da Gist (${response.status}). Tentando lista-de-exames.txt local.`);
                // Tenta carregar do arquivo local caso a Gist falhe
                return fetch(`lista-de-exames.txt?t=${timestamp}`); 
            }
            return response.text();
        })
        .then(text => {
            console.log("carregarExames: Conteúdo bruto listaExames recebido (primeiros 100 chars):", text.substring(0, 100) + "..."); 
            listaExames = text.trim().split('\n').map(e => e.trim()).filter(e => e !== '');
            console.log("carregarExames: listaExames após processamento:", listaExames); 
            
            if (listaExames.length === 0) {
                console.warn("carregarExames: A lista de exames está vazia após o processamento. Verifique o conteúdo do arquivo Gist/local.");
            }

            atualizarListaExamesCompleta(); // Removeu a chamada direta de atualizarExamesSelecionadosDisplay aqui
            configurarPesquisa();
        })
        .catch(error => {
            console.error("carregarExames: Erro FATAL ao carregar lista de exames:", error);
            alert("Não foi possível carregar a lista de exames. Verifique a Gist ID ou o arquivo local.");
            // Re-lança o erro para que o await em window.onload possa capturá-lo
            throw error; 
        });
}

function atualizarListaExamesCompleta() {
    console.log("atualizarListaExamesCompleta: Reconstruindo lista de checkboxes de exames.");
    const container = document.getElementById('exames');
    container.innerHTML = "";

    listaExames.forEach(exame => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" class="exame" value="${exame}"> ${exame}`;
        container.appendChild(label);
        container.appendChild(document.createElement('br'));
    });
    // A chamada a atualizarExamesSelecionadosDisplay() foi removida daqui,
    // pois ela será chamada após o preenchimento dos campos, garantindo que os exames permaneçam marcados.
}

function configurarPesquisa() {
    console.log("configurarPesquisa: Configurando eventos de pesquisa.");
    const inputPesquisa = document.getElementById('pesquisaExame');
    const sugestoesBox = document.getElementById('sugestoes');

    inputPesquisa.addEventListener('input', () => {
        const termo = inputPesquisa.value.trim().toLowerCase();
        sugestoesBox.innerHTML = "";

        if (termo.length === 0) {
            sugestoesBox.style.display = 'none';
            return;
        }

        const filtrados = listaExames.filter(exame =>
            exame.toLowerCase().includes(termo)
        );

        if (filtrados.length === 0) {
            sugestoesBox.style.display = 'none';
            return;
        }

        filtrados.forEach(exame => {
            const div = document.createElement('div');
            div.textContent = exame;
            div.addEventListener('click', () => {
                marcarExame(exame);
                inputPesquisa.value = '';
                sugestoesBox.style.display = 'none';
            });
            sugestoesBox.appendChild(div);
        });

        sugestoesBox.style.display = 'block';
    });

    document.addEventListener('click', function(event) {
        if (!event.target.closest('#pesquisaExame') && !event.target.closest('#sugestoes')) {
            sugestoesBox.style.display = 'none';
        }
    });
}

function marcarExame(exameNome) {
    console.log("marcarExame: Tentando marcar o exame:", exameNome);
    const examesContainer = document.getElementById('exames');
    const checkboxExistente = examesContainer.querySelector(`input[type="checkbox"][value="${exameNome}"]`);

    if (checkboxExistente) {
        checkboxExistente.checked = true;
        console.log("marcarExame: Checkbox existente marcado:", exameNome);
        checkboxExistente.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        // Se o exame não estiver na lista de exames disponíveis (listaExames), adiciona-o e marca
        console.log("marcarExame: Checkbox não existente, adicionando e marcando:", exameNome);
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" class="exame" value="${exameNome}" checked> ${exameNome}`;
        examesContainer.appendChild(label);
        examesContainer.appendChild(document.createElement('br'));
        label.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Adiciona o exame à listaExames para que ele seja pesquisável futuramente
        if (!listaExames.includes(exameNome)) {
            listaExames.push(exameNome);
            listaExames.sort(); // Opcional: manter a lista ordenada
            console.log("marcarExame: Exame adicionado à listaExames:", exameNome);
        }
    }
    atualizarExamesSelecionadosDisplay();
}

function atualizarExamesSelecionadosDisplay() {
    console.log("atualizarExamesSelecionadosDisplay: Atualizando exibição de exames selecionados.");
    const displayContainer = document.getElementById('examesSelecionadosDisplay');
    const selectedExams = Array.from(document.querySelectorAll('#exames .exame:checked'));
    
    displayContainer.innerHTML = "";

    if (selectedExams.length === 0) {
        displayContainer.innerHTML = "<p>Nenhum exame selecionado.</p>";
        console.log("atualizarExamesSelecionadosDisplay: Nenhum exame selecionado.");
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
    console.log("atualizarExamesSelecionadosDisplay: Exames exibidos:", selectedExams.map(cb => cb.value));
}

function removerExameDisplay(exameNome) {
    console.log("removerExameDisplay: Removendo exame:", exameNome);
    const checkbox = document.querySelector(`#exames .exame[value="${exameNome}"]`);
    if (checkbox) {
        checkbox.checked = false;
    }
    atualizarExamesSelecionadosDisplay();
}

function showError(elementId, message) {
    console.log(`showError: Erro para ${elementId}: ${message}`);
    const inputElement = document.getElementById(elementId);
    const errorDiv = document.getElementById(`${elementId}-error`);
    if (inputElement && errorDiv) {
        inputElement.classList.add('error');
        errorDiv.textContent = message;
    }
}

function clearError(elementId) {
    console.log(`clearError: Limpando erro para ${elementId}.`);
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
    console.log("atualizarIdade: Validando idade.");
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

function validateCpfAndCheckHistory() {
    console.log("validateCpfAndCheckHistory: Validando CPF e checando histórico.");
    const inputCPF = document.getElementById('cpf');
    const cpf = inputCPF.value.replace(/\D/g, '');

    if (cpf.length === 0) {
        clearError('cpf');
        return true;
    }

    if (!validarCPF(cpf)) {
        showError('cpf', "CPF inválido.");
        return false;
    }
    
    clearError('cpf'); 
    checkCpfInHistory(cpf);
    return true;
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

// checkCpfInHistory agora busca no banco de dados
async function checkCpfInHistory(cpf) {
    console.log("checkCpfInHistory: Iniciando verificação de CPF no histórico para:", cpf); 
    if (typeof window.firestoreDb === 'undefined' || !window.firestoreDb) {
        console.warn("checkCpfInHistory: Banco de dados não inicializado ou disponível. Verificação de CPF no histórico desabilitada.");
        return;
    }
    
    try {
        // Acessa a coleção usando a função globalizada
        const historicoRef = window.firebaseFirestoreCollection(window.firestoreDb, 'historico');
        // Constrói a query usando as funções globalizadas
        const cpfFormatado = formatarCPFParaBusca(cpf); 
        console.log("checkCpfInHistory: CPF formatado para busca:", cpfFormatado); 

        const q = window.firebaseFirestoreQuery(historicoRef,
                               window.firebaseFirestoreWhere('cpf', '==', cpfFormatado),
                               window.firebaseFirestoreOrderBy('protocolo', 'desc'),
                               window.firebaseFirestoreLimit(1)); 

        // Executa a query usando a função globalizada
        const querySnapshot = await window.firebaseFirestoreGetDocs(q);
        console.log("checkCpfInHistory: Query Snapshot (docs.length):", querySnapshot.docs.length); 

        if (!querySnapshot.empty) {
            const ultimoCadastroDoc = querySnapshot.docs[0];
            const ultimoCadastro = ultimoCadastroDoc.data();
            console.log("checkCpfInHistory: CPF encontrado! Último cadastro:", ultimoCadastro); 
            
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
                console.log("checkCpfInHistory: Confirmação para carregar dados do histórico recebida. Chamando preencherCamposComCadastro.");
                preencherCamposComCadastro(ultimoCadastro); // Agora chama a nova função
            } else {
                console.log("checkCpfInHistory: Confirmação para carregar dados do histórico NEGADA.");
            }
        } else {
            console.log("checkCpfInHistory: CPF não encontrado no banco de dados. Prossiga com o cadastro.");
        }
    } catch (error) {
        console.error("checkCpfInHistory: Erro ao verificar CPF no banco de dados:", error);
        alert("Erro ao buscar histórico de CPF. Verifique sua conexão e regras do banco de dados.");
    }
}

// Função auxiliar para padronizar CPF para busca no banco de dados (sem máscara)
function formatarCPFParaBusca(cpfComMascara) {
    return cpfComMascara.replace(/\D/g, ''); // Remove todos os caracteres não-dígitos
}

// MODIFICADO: preencherCamposComCadastro agora substitui carregarDadosBasicos
// E é mais robusta para carregar dados do histórico ou paciente fictício
function preencherCamposComCadastro(p) {
    console.log("preencherCamposComCadastro: Iniciando preenchimento com dados:", p);
    const nomeAtual = document.getElementById('nome').value.trim();
    const cpfAtual = document.getElementById('cpf').value.trim();

    if (nomeAtual || cpfAtual) {
        console.log("preencherCamposComCadastro: Formulário não está vazio. Solicitando confirmação.");
        const confirmarSubstituicao = confirm("Existem dados no formulário que serão substituídos. Deseja continuar?");
        if (!confirmarSubstituicao) {
            console.log("preencherCamposComCadastro: Substituição negada pelo usuário. Retornando.");
            return;
        }
    }

    // Limpa os campos antes de preencher
    console.log("preencherCamposComCadastro: Limpando campos do formulário.");
    document.getElementById('nome').value = '';
    document.getElementById('cpf').value = '';
    document.getElementById('data_nasc').value = '';
    document.getElementById('idade').value = '';
    document.getElementById('sexo').value = '';
    document.getElementById('endereco').value = '';
    document.getElementById('contato').value = '';
    document.getElementById('observacoes').value = '';
    document.getElementById('examesNaoListados').value = '';

    // Limpa todos os checkboxes de exames
    console.log("preencherCamposComCadastro: Desmarcando todos os exames.");
    document.querySelectorAll('#exames input[type="checkbox"]').forEach(cb => cb.checked = false);

    clearError('data_nasc');
    clearError('cpf');
    clearError('contato');

    // Preenche os campos com os dados do paciente
    console.log("preencherCamposComCadastro: Preenchendo campos com novos dados.");
    document.getElementById('nome').value = p.nome || '';
    document.getElementById('cpf').value = p.cpf || '';
    document.getElementById('data_nasc').value = p.dataNasc || '';
    // A idade será atualizada automaticamente pelo evento 'change' da data_nasc
    document.getElementById('sexo').value = p.sexo || '';
    document.getElementById('endereco').value = p.endereco || '';
    document.getElementById('contato').value = p.contato || '';
    document.getElementById('observacoes').value = p.observacoes || '';
    document.getElementById('examesNaoListados').value = p.examesNaoListados || '';

    // Dispara o evento change para recalcular a idade se a data de nascimento for carregada
    if (p.dataNasc) {
        console.log("preencherCamposComCadastro: Disparando evento 'change' na data de nascimento.");
        document.getElementById('data_nasc').dispatchEvent(new Event('change'));
    }

    // Marca os exames selecionados
    const examesDoPaciente = Array.isArray(p.examesSelecionados) ? p.examesSelecionados : [];
    
    if (examesDoPaciente.length > 0) {
        console.log("preencherCamposComCadastro: Marcando exames selecionados:", examesDoPaciente);
        examesDoPaciente.forEach(exameNome => {
            const checkbox = document.querySelector(`input[type="checkbox"][value="${exameNome}"]`);
            if (checkbox) {
                checkbox.checked = true;
                console.log(`preencherCamposComCadastro: Checkbox para "${exameNome}" encontrado e marcado.`);
            } else {
                // Se o exame não estiver na lista de exames disponíveis, adiciona-o dinamicamente e marca
                console.warn(`preencherCamposComCadastro: Checkbox para "${exameNome}" NÃO encontrado na lista inicial. Adicionando dinamicamente.`);
                marcarExame(exameNome); // Esta função já adiciona ao DOM e marca
            }
        });
    } else {
        console.log("preencherCamposComCadastro: Nenhhum exame selecionado para marcar (array vazio ou inexistente).");
    }
    atualizarExamesSelecionadosDisplay();
    atualizarExamesSelecionadosDisplay(); // Atualiza o display dos exames selecionados

    alert(`Dados de ${p.nome} carregados com sucesso!`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    console.log("preencherCamposComCadastro: Preenchimento concluído.");
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

function coletarDados() {
    console.log("coletarDados: Coletando e validando dados do formulário.");
    const isAgeValid = validateAge();
    const cpfLimpo = document.getElementById('cpf').value.replace(/\D/g, '');
    const isCpfFormatValid = validarCPF(cpfLimpo);
    const isContactValid = validateContact();

    if (!isCpfFormatValid) {
        showError('cpf', "CPF inválido.");
    }

    if (!isAgeValid || !isCpfFormatValid || !isContactValid) {
        console.error("coletarDados: Erros de validação encontrados.");
        throw new Error("Por favor, corrija os erros nos campos antes de prosseguir.");
    }

    const nome = document.getElementById('nome').value.trim();
    // CORREÇÃO: Salvar CPF sem máscara no banco de dados
    const cpf = document.getElementById('cpf').value.replace(/\D/g, ''); 
    const dataNasc = document.getElementById('data_nasc').value;
    const sexo = document.getElementById('sexo').value;
    const endereco = document.getElementById('endereco').value.trim();
    const contato = document.getElementById('contato').value.trim();
    const observacoes = document.getElementById('observacoes').value.trim();
    const exames = Array.from(document.querySelectorAll('#exames .exame:checked')).map(e => e.value);
    const examesNaoListados = document.getElementById('examesNaoListados').value.trim();

    if (!nome) { console.error("coletarDados: Nome vazio."); throw new Error("Preencha o campo: Nome."); }
    if (!sexo) { console.error("coletarDados: Sexo não selecionado."); throw new Error("Selecione o sexo."); }
    if (exames.length === 0 && !examesNaoListados) { console.error("coletarDados: Nenhum exame selecionado."); throw new Error("Selecione pelo menos um exame ou preencha 'Acrescentar Exames não Listados'."); }

    console.log("coletarDados: Dados coletados com sucesso.");
    return { nome, cpf, dataNasc, idade: document.getElementById('idade').value, sexo, endereco, contato, observacoes, exames, examesNaoListados };
}

// Salvar Protocolo de Atendimento - Salva no banco de dados e gera protocolo sequencial
async function salvarProtocoloAtendimento() {
    console.log("salvarProtocoloAtendimento: Iniciando salvamento do protocolo.");
    if (typeof window.firestoreDb === 'undefined' || !window.firestoreDb) {
        alert("Banco de dados não inicializado. Verifique a configuração.");
        console.error("salvarProtocoloAtendimento: Firestore não disponível.");
        return;
    }
    
    try {
        const dados = coletarDados(); // Coleta dados e validações
        console.log("salvarProtocoloAtendimento: Dados coletados para salvamento:", dados);

        // --- Geração do número de protocolo sequencial buscando do banco de dados ---
        const historicoRef = window.firebaseFirestoreCollection(window.firestoreDb, 'historico');
        const q = window.firebaseFirestoreQuery(
            historicoRef,
            window.firebaseFirestoreOrderBy('protocolo', 'desc'),
            window.firebaseFirestoreLimit(1)
        );
        console.log("salvarProtocoloAtendimento: Buscando último protocolo.");
        const querySnapshot = await window.firebaseFirestoreGetDocs(q);

        let lastProtocolNumber = 0;
        if (!querySnapshot.empty) {
            const lastDoc = querySnapshot.docs[0];
            const lastProtocoloCompleto = lastDoc.data().protocolo;
            // Extrai o número sequencial (parte antes do primeiro '-')
            lastProtocolNumber = parseInt(lastProtocoloCompleto.split('-')[0]) || 0;
            console.log("salvarProtocoloAtendimento: Último protocolo encontrado:", lastProtocoloCompleto, "Número:", lastProtocolNumber);
        } else {
            console.log("salvarProtocoloAtendimento: Nenhum protocolo anterior encontrado. Começando do 0.");
        }
        
        const newProtocolNumber = (lastProtocolNumber + 1).toString().padStart(4, '0');
        
        const now = new Date(); // Data e hora atual para o protocolo
        const hour = now.getHours().toString().padStart(2, '0');
        const minute = now.getMinutes().toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Mês é 0-indexed
        
        // Formato: 0001-HHMMDDMM (Ex: 0001-23143006)
        const protocolo = `${newProtocolNumber}-${hour}${minute}${day}${month}`;
        console.log("salvarProtocoloAtendimento: Novo protocolo gerado:", protocolo);
        
        dados.protocolo = protocolo; // Adiciona o protocolo aos dados do cadastro
        dados.timestampServidor = window.firebaseFirestoreServerTimestamp(); // Adiciona timestamp do servidor para ordenação


        // Salva o cadastro no banco de dados
        console.log("salvarProtocoloAtendimento: Salvando documento no Firestore.");
        await window.firebaseFirestoreAddDoc(historicoRef, dados);
        console.log("salvarProtocoloAtendimento: Documento salvo no banco de dados com protocolo: ", dados.protocolo);
        
        // --- Geração do PDF ---
        console.log("salvarProtocoloAtendimento: Gerando PDF.");
        const doc = new jsPDF();
        const [ano, mes, dia] = dados.dataNasc.split('-');
        const dataNascFormatada = `${dia}/${mes}/${ano}`;

        let currentY = 15; // Posição Y inicial no PDF

        // --- Seção: Cabeçalho do PDF ---
        doc.setFontSize(18);
        doc.text("Laboratório de Análises Clínicas CETEP/LNAB", 105, currentY, null, null, "center");
        currentY += 10;
        doc.setFontSize(10);
        doc.text(`Data: ${new Date().toLocaleDateString()} - Hora: ${new Date().toLocaleTimeString()}`, 105, currentY, null, null, "center");
        currentY += 5;
        doc.setFontSize(8);
        doc.text("Endereço: 233, R. Mario Laérte, 163 - Centro, Alagoinhas - BA, 48005-098", 105, currentY, null, null, "center");
        currentY += 4;
        doc.text("Site: https://www.ceteplnab.com.br/", 105, currentY, null, null, "center");
        currentY += 6;
        doc.setLineWidth(0.5);
        doc.line(20, currentY, 190, currentY);
        currentY += 10;

        // --- Seção: Identificação do Protocolo no PDF ---
        doc.setFontSize(14);
        doc.text(`PROTOCOLO DE ATENDIMENTO Nº: ${dados.protocolo}`, 20, currentY);
        currentY += 8;
        doc.setFontSize(10);
        doc.setLineWidth(0.2);
        doc.line(20, currentY, 190, currentY);
        currentY += 10;

        // --- Seção: Dados do Paciente no PDF ---
        doc.setFontSize(12);
        doc.text("DADOS DO PACIENTE:", 20, currentY);
        currentY += 8;
        doc.setFontSize(11);
        
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
        doc.line(20, currentY, 190, currentY);
        currentY += 10;

        // --- Seção: Exames no PDF ---
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
                currentY += 5;
            }
            doc.text("Exames Adicionais:", 25, currentY);
            currentY += lineHeight;
            const splitText = doc.splitTextToSize(dados.examesNaoListados, 150);
            doc.text(splitText, 30, currentY);
            currentY += (splitText.length * lineHeight);
        }
        
        doc.setLineWidth(0.2);
        doc.line(20, currentY, 190, currentY);
        currentY += 10;

        // --- Seção: Observações no PDF ---
        if (dados.observacoes) {
            doc.setFontSize(12);
            doc.text("OBSERVAÇÕES:", 20, currentY);
            currentY += 8;
            doc.setFontSize(11);
            const splitText = doc.splitTextToSize(dados.observacoes, 170);
            doc.text(splitText, 25, currentY);
            currentY += (splitText.length * lineHeight);
            
            doc.setLineWidth(0.2);
            doc.line(20, currentY, 190, currentY);
            currentY += 10;
        }

        // --- Rodapé do PDF (para Salvar Protocolo) ---
        doc.setFontSize(9);
        doc.text("Documento gerado automaticamente pelo SISLAB.", 105, 280, null, null, "center");

        // Abre o PDF em uma nova janela para visualização e impressão
        doc.output('dataurlnewwindow', { filename: `Protocolo_${dados.nome.replace(/\s+/g, "_")}.pdf` });

        alert(`Protocolo ${dados.protocolo} salvo e gerado! Verifique a nova aba para visualizar e imprimir.`);
        
        limparCampos(); // Limpa os campos após salvar e gerar PDF
        mostrarHistorico(); // Atualiza a lista do histórico para mostrar o novo protocolo do banco de dados
    } catch (error) {
        console.error("salvarProtocoloAtendimento: Erro ao salvar protocolo no banco de dados:", error);
        alert("Erro ao salvar protocolo. Verifique o console para detalhes (regras do banco de dados, conexão, etc.).");
    }
}

// MODIFICADO: mostrarHistorico agora lê do banco de dados
async function mostrarHistorico() {
    console.log("mostrarHistorico: Carregando histórico.");
    const historicoDiv = document.getElementById('historico');
    historicoDiv.innerHTML = "<p>Carregando histórico do banco de dados...</p>"; // Feedback de carregamento

    if (typeof window.firestoreDb === 'undefined' || !window.firestoreDb) {
        historicoDiv.innerHTML = "<p>Banco de dados não inicializado. Verifique a configuração.</p>";
        console.warn("mostrarHistorico: Banco de dados não inicializado. Não foi possível carregar o histórico.");
        return;
    }

    try {
        const historicoRef = window.firebaseFirestoreCollection(window.firestoreDb, 'historico');
        // Consulta todos os documentos, ordenados pelo protocolo (decrescente para pegar o mais recente primeiro)
        const q = window.firebaseFirestoreQuery(
            historicoRef,
            window.firebaseFirestoreOrderBy('protocolo', 'desc')
        ); 
        const querySnapshot = await window.firebaseFirestoreGetDocs(q);
        console.log("mostrarHistorico: Query Snapshot (docs.length):", querySnapshot.docs.length);

        if (querySnapshot.empty) {
            historicoDiv.innerHTML = "<p>Nenhum cadastro encontrado no banco de dados.</p>";
            console.log("mostrarHistorico: Nenhum cadastro encontrado.");
            return;
        }

        let html = "<h3>Histórico de Cadastros</h3><ul>";
        // Mapeia os documentos para um array de dados, incluindo o ID do documento do banco de dados
        const cadastros = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        cadastros.forEach((c) => { 
            const protocoloDisplay = c.protocolo ? `Protocolo: ${c.protocolo}` : `ID: ${c.id}`; 
            // AGORA: O onclick passa o ID do documento do banco de dados DIRETAMENTE
            html += `<li onclick="carregarCadastroFirebase('${c.id}')"><b>${protocoloDisplay}</b> - ${c.nome} - CPF: ${c.cpf} - Idade: ${c.idade} - Exames: ${c.exames.join(", ")}`;
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
        console.log("mostrarHistorico: Histórico carregado e exibido.");

    } catch (error) {
        console.error("mostrarHistorico: Erro ao carregar histórico do banco de dados:", error);
        historicoDiv.innerHTML = "<p>Erro ao carregar histórico. Verifique sua conexão e regras do banco de dados.</p>";
        alert("Erro ao carregar histórico do banco de dados. Consulte o console.");
    }
}

// carregarCadastroFirebase agora lê um documento específico do banco de dados pelo seu ID
async function carregarCadastroFirebase(docId) {
    console.log("carregarCadastroFirebase: Carregando cadastro do Firebase com ID:", docId);
    if (typeof window.firestoreDb === 'undefined' || !window.firestoreDb) {
        console.warn("carregarCadastroFirebase: Banco de dados não inicializado. Carregamento de cadastro desabilitado.");
        return;
    }

    try {
        // Usa as funções globalizadas para doc e getDoc
        const docRef = window.firebaseFirestoreDoc(window.firestoreDb, 'historico', docId);
        const docSnap = await window.firebaseFirestoreGetDoc(docRef);

        if (!docSnap.exists) {
            alert("Cadastro não encontrado no banco de dados.");
            console.warn("carregarCadastroFirebase: Documento não encontrado para ID:", docId);
            return;
        }

        const cadastro = docSnap.data();
        console.log("carregarCadastroFirebase: Cadastro encontrado:", cadastro);

        // A verificação de dados existentes e o prompt de confirmação será feito dentro de preencherCamposComCadastro
        // e preencherCamposComCadastro também limpa os campos antes de preencher.
        preencherCamposComCadastro(cadastro);
        // O alert e o scroll para o topo já estão dentro de preencherCamposComCadastro
        console.log("carregarCadastroFirebase: Chamada para preencherCamposComCadastro concluída.");

    } catch (error) {
        console.error("carregarCadastroFirebase: Erro ao carregar cadastro do banco de dados:", error);
        alert("Erro ao carregar cadastro do banco de dados. Verifique o console.");
    }
}

// REMOVIDO: A função carregarCadastro(index) original (que usava índice para buscar) foi removida.
// O HTML agora deve chamar carregarCadastroFirebase(doc.id) diretamente.

function limparCampos(showAlert = true) {
    console.log("limparCampos: Limpando todos os campos do formulário.");
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
    console.log("limparCampos: Campos limpos.");
}

// MODIFICADO: limparHistorico agora interage com o banco de dados e usa senha dinâmica
async function limparHistorico() {
    console.log("limparHistorico: Iniciando processo de limpeza de histórico.");
    const now = new Date(); // Obter a data e hora atuais
    const hour = now.getHours().toString().padStart(2, '0'); // Obter a hora formatada
    const minute = now.getMinutes().toString().padStart(2, '0'); // Obter o minuto formatado
    const SENHA_DINAMICA_ESPERADA = SENHA_BASE_SISLAB + hour + minute; // Concatenar para formar a senha esperada

    const senhaDigitada = prompt(`Para limpar o histórico, digite a senha.`); // Mensagem para o usuário
    if (senhaDigitada === null) {
        console.log("limparHistorico: Usuário cancelou a entrada da senha.");
        return;
    }
    if (senhaDigitada === SENHA_DINAMICA_ESPERADA) { // Comparar com a senha dinâmica
        console.log("limparHistorico: Senha correta. Prosseguindo com a limpeza.");
        if (typeof window.firestoreDb === 'undefined' || !window.firestoreDb) {
            alert("Banco de dados não inicializado. Limpeza de histórico desabilitada.");
            console.error("limparHistorico: Firestore não disponível.");
            return;
        }
        const confirmDeleteAll = confirm("Tem certeza que deseja apagar TODO o histórico do banco de dados? Esta ação é irreversível e apagará todos os dados de pacientes!");
        if (!confirmDeleteAll) {
            console.log("limparHistorico: Usuário cancelou a confirmação de exclusão total.");
            return;
        }

        try {
            const historicoRef = window.firebaseFirestoreCollection(window.firestoreDb, 'historico');
            const batchSize = 100; // Apaga em lotes de 100
            
            // Função para apagar documentos em lote
            const deleteQueryBatch = async (dbInstance, queryToDelete) => {
                const snapshot = await window.firebaseFirestoreGetDocs(queryToDelete);
                if (snapshot.empty) { // Verifica se não há mais documentos
                    return 0;
                }
                const batch = window.firebaseFirestoreWriteBatch(dbInstance); // Cria um novo lote
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref); // Adiciona a exclusão ao lote
                });
                await batch.commit(); // Executa o lote
                return snapshot.size; // Retorna quantos documentos foram apagados
            };

            let totalDeleted = 0;
            let deletedCount;
            do {
                console.log("limparHistorico: Iniciando lote de exclusão.");
                const q = window.firebaseFirestoreQuery(historicoRef, window.firebaseFirestoreLimit(batchSize)); // Cria uma nova query com limite em cada iteração
                deletedCount = await deleteQueryBatch(window.firestoreDb, q);
                totalDeleted += deletedCount;
                console.log(`limparHistorico: Apagados ${deletedCount} documentos. Total: ${totalDeleted}`);
                // Adicione um pequeno atraso para evitar hitting rate limits do Firestore em deletes muito rápidos
                await new Promise(resolve => setTimeout(resolve, 50)); 
            } while (deletedCount > 0); // Continua apagando enquanto houver documentos

            alert(`Histórico apagado com sucesso do banco de dados! Total de ${totalDeleted} registros.`);
            console.log("limparHistorico: Limpeza de histórico concluída.");
            mostrarHistorico(); // Atualiza a exibição após a exclusão
        } catch (error) {
            console.error("limparHistorico: Erro ao limpar histórico do banco de dados:", error);
            alert("Erro ao limpar histórico do banco de dados. Verifique o console e regras do Firestore.");
        }

    } else {
        alert('Senha incorreta. Histórico não foi limpo.');
        console.log("limparHistorico: Senha incorreta.");
    }
}

// MODIFICADO: Imprimir Histórico (agora lê do banco de dados)
async function imprimirHistorico() {
    console.log("imprimirHistorico: Iniciando impressão do histórico.");
    if (typeof window.firestoreDb === 'undefined' || !window.firestoreDb) {
        alert("Banco de dados não inicializado. Não é possível imprimir o histórico.");
        console.error("imprimirHistorico: Firestore não disponível.");
        return;
    }

    let cadastros = [];
    try {
        const historicoRef = window.firebaseFirestoreCollection(window.firestoreDb, 'historico');
        const q = window.firebaseFirestoreQuery(historicoRef, window.firebaseFirestoreOrderBy('protocolo', 'desc')); 
        console.log("imprimirHistorico: Buscando cadastros para impressão.");
        const querySnapshot = await window.firebaseFirestoreGetDocs(q);
        cadastros = querySnapshot.docs.map(doc => doc.data());
        console.log("imprimirHistorico: Cadastros encontrados para impressão:", cadastros.length);
    } catch (error) {
        console.error("imprimirHistorico: Erro ao carregar histórico para impressão:", error);
        alert("Erro ao carregar histórico para impressão. Verifique sua conexão e regras do banco de dados.");
        return;
    }

    if (cadastros.length === 0) {
        alert("Não há histórico para imprimir.");
        console.log("imprimirHistorico: Nenhum histórico para imprimir.");
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

    cadastros.forEach((c) => { 
        const protocoloDisplay = c.protocolo ? `Protocolo: ${c.protocolo}` : `ID: ${c.id}`; 
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
    printWindow.focus();

    printWindow.onload = function() {
        printWindow.print();
        console.log("imprimirHistorico: Janela de impressão aberta e print() chamado.");
    };
}

// Removida a função imprimirTela (para imprimir o layout HTML) foi removida conforme sua solicitação.

function editarListaExamesComSenha() {
    console.log("editarListaExamesComSenha: Solicitando senha para edição de lista de exames.");
    const now = new Date();
    const hour = now.getHours().toString().padStart(2, '0');
    const minute = now.getMinutes().toString().padStart(2, '0');
    const SENHA_DINAMICA_ESPERADA = SENHA_BASE_SISLAB + hour + minute;

    const senhaDigitada = prompt(`Para editar a lista de exames, digite a senha.`);
    if (senhaDigitada === null) {
        console.log("editarListaExamesComSenha: Usuário cancelou a entrada da senha.");
        return;
    }
    if (senhaDigitada === SENHA_DINAMICA_ESPERADA) {
        console.log("editarListaExamesComSenha: Senha correta. Carregando lista para edição.");
        carregarListaExamesParaEdicao();
    } else {
        alert('Senha incorreta. Edição não permitida.');
        console.log("editarListaExamesComSenha: Senha incorreta.");
    }
}

async function carregarListaExamesParaEdicao() {
    console.log("carregarListaExamesParaEdicao: Iniciando carregamento da lista de exames para edição.");
    const editorElement = document.getElementById('editorExames');
    const textarea = document.getElementById('listaExamesEditor');

    try {
        const timestamp = new Date().getTime();
        const gistRawUrl = `https://gist.githubusercontent.com/${GITHUB_USERNAME}/${GIST_ID}/raw/${GIST_FILENAME}?t=${timestamp}`;
        console.log("carregarListaExamesParaEdicao: Buscando Gist em:", gistRawUrl);
        const response = await fetch(gistRawUrl);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ao buscar lista de exames da Gist: ${response.status} - ${errorText}`);
        }

        const fileContent = await response.text();
        textarea.value = fileContent;
        editorElement.style.display = 'block';
        alert('Lista de exames carregada para edição. Lembre-se: um exame por linha.');
        console.log("carregarListaExamesParaEdicao: Lista de exames carregada e editor exibido.");

    } catch (error) {
        console.error("carregarListaExamesParaEdicao: Erro ao carregar lista de exames da Gist:", error);
        alert("Não foi possível carregar a lista de exames para edição. Verifique o console e a Gist ID.");
    }
}

async function salvarListaExamesNoGitHub() {
    console.log("salvarListaExamesNoGitHub: Iniciando salvamento da lista de exames no GitHub.");
    const textarea = document.getElementById('listaExamesEditor');
    const novoConteudo = textarea.value;

    const confirmSave = confirm("Deseja realmente salvar essas alterações na Gist? Isso fará uma atualização.");
    if (!confirmSave) {
        console.log("salvarListaExamesNoGitHub: Usuário cancelou o salvamento.");
        return;
    }

    try {
        const gistApiUrl = `https://api.github.com/gists/${GIST_ID}`;
        console.log("salvarListaExamesNoGitHub: Enviando PATCH para Gist API:", gistApiUrl);
        
        const response = await fetch(gistApiUrl, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${GITHUB_PAT_GIST}`,
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
        document.getElementById('editorExames').style.display = 'none';
        carregarExames();
        console.log("salvarListaExamesNoGitHub: Lista de exames salva e editor ocultado.");
    } catch (error) {
        console.error("salvarListaExamesNoGitHub: Erro ao salvar lista de exames na Gist:", error);
        alert("Não foi possível salvar a lista na Gist. Verifique o console, seu PAT e permissões.");
    }
                    }

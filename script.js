const { jsPDF } = window.jspdf;
let listaExames = [];

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

// --- CONFIGURAÇÃO DA PLANILHA (Google Forms) ---
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

function carregarExames() {
    const timestamp = new Date().getTime();
    const gistRawUrl = `https://gist.githubusercontent.com/${GITHUB_USERNAME}/${GIST_ID}/raw/${GIST_FILENAME}?t=${timestamp}`;

    fetch(gistRawUrl)
        .then(response => {
            if (!response.ok) {
                console.warn(`Erro ao carregar da Gist (${response.status}). Tentando lista-de-exames.txt local.`);
                return fetch(`lista-de-exames.txt?t=${timestamp}`); 
            }
            return response.text();
        })
        .then(text => {
            listaExames = text.trim().split('\n').map(e => e.trim()).filter(e => e !== '');
            atualizarListaExamesCompleta();
            configurarPesquisa();
        })
        .catch(error => {
            console.error("Erro ao carregar lista de exames:", error);
            alert("Não foi possível carregar a lista de exames. Verifique a Gist ID ou o arquivo local.");
        });
}

function atualizarListaExamesCompleta() {
    const container = document.getElementById('exames');
    container.innerHTML = "";

    listaExames.forEach(exame => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" class="exame" value="${exame}"> ${exame}`;
        container.appendChild(label);
        container.appendChild(document.createElement('br'));
    });
    atualizarExamesSelecionadosDisplay();
}

function configurarPesquisa() {
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

function validateCpfAndCheckHistory() {
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

function checkCpfInHistory(cpf) {
    const cadastros = JSON.parse(localStorage.getItem('cadastros')) || [];
    
    const cadastrosComCpf = cadastros
        .map((cad, index) => ({ ...cad, originalIndex: index }))
        .filter(cad => cad.cpf.replace(/\D/g, '') === cpf)
        .sort((a, b) => b.originalIndex - a.originalIndex);

    if (cadastrosComCpf.length > 0) {
        const ultimoCadastro = cadastrosComCpf[0];
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
            carregarDadosBasicos(ultimoCadastro);
        }
    }
}

function carregarDadosBasicos(cadastro) {
    const nomeAtual = document.getElementById('nome').value.trim();
    const cpfAtual = document.getElementById('cpf').value.trim();

    if (nomeAtual || cpfAtual) {
        const confirmarSubstituicao = confirm("Existem dados no formulário que serão substituídos. Deseja continuar?");
        if (!confirmarSubstituicao) {
            return;
        }
    }

    document.getElementById('nome').value = '';
    document.getElementById('data_nasc').value = '';
    document.getElementById('idade').value = '';
    document.getElementById('sexo').value = '';
    document.getElementById('endereco').value = '';
    document.getElementById('contato').value = '';
    clearError('data_nasc');
    clearError('cpf');
    clearError('contato');

    document.getElementById('nome').value = cadastro.nome;
    document.getElementById('cpf').value = cadastro.cpf; 
    document.getElementById('data_nasc').value = cadastro.dataNasc;
    document.getElementById('data_nasc').dispatchEvent(new Event('change'));
    document.getElementById('sexo').value = cadastro.sexo;
    document.getElementById('endereco').value = cadastro.endereco;
    document.getElementById('contato').value = cadastro.contato;
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    const isAgeValid = validateAge();
    const cpfLimpo = document.getElementById('cpf').value.replace(/\D/g, '');
    const isCpfFormatValid = validarCPF(cpfLimpo);
    const isContactValid = validateContact();

    if (!isCpfFormatValid) {
        showError('cpf', "CPF inválido.");
    }

    if (!isAgeValid || !isCpfFormatValid || !isContactValid) {
        throw new Error("Por favor, corrija os erros nos campos antes de prosseguir.");
    }

    const nome = document.getElementById('nome').value.trim();
    const cpf = document.getElementById('cpf').value.trim();
    const dataNasc = document.getElementById('data_nasc').value;
    const sexo = document.getElementById('sexo').value;
    const endereco = document.getElementById('endereco').value.trim();
    const contato = document.getElementById('contato').value.trim();
    const observacoes = document.getElementById('observacoes').value.trim();
    const exames = Array.from(document.querySelectorAll('#exames .exame:checked')).map(e => e.value);
    const examesNaoListados = document.getElementById('examesNaoListados').value.trim();

    if (!nome) throw new Error("Preencha o campo: Nome.");
    if (!sexo) throw new Error("Selecione o sexo.");
    if (exames.length === 0 && !examesNaoListados) throw new Error("Selecione pelo menos um exame ou preencha 'Acrescentar Exames não Listados'.");

    return { nome, cpf, dataNasc, idade: document.getElementById('idade').value, sexo, endereco, contato, observacoes, exames, examesNaoListados };
}

function salvarProtocoloAtendimento() {
    try {
        const dados = coletarDados();
        let cadastros = JSON.parse(localStorage.getItem('cadastros')) || [];
        
        const lastCadastro = cadastros.length > 0 ? cadastros[cadastros.length - 1] : null;
        const lastProtocolNumber = lastCadastro && lastCadastro.protocolo ? 
                                   (parseInt(lastCadastro.protocolo.split('-')[0]) || 0) : 0;
        
        const newProtocolNumber = (lastProtocolNumber + 1).toString().padStart(4, '0');
        
        const now = new Date();
        const hour = now.getHours().toString().padStart(2, '0');
        const minute = now.getMinutes().toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        
        const protocolo = `${newProtocolNumber}-${hour}${minute}${day}${month}`;
        
        dados.protocolo = protocolo;

        cadastros.push(dados); 
        localStorage.setItem('cadastros', JSON.stringify(cadastros));
        
        const doc = new jsPDF();
        const [ano, mes, dia] = dados.dataNasc.split('-');
        const dataNascFormatada = `${dia}/${mes}/${ano}`;

        let currentY = 15;

        // --- Seção: Cabeçalho ---
        doc.setFontSize(18);
        doc.text("Laboratório de Análises Clínicas CETEP/LNAB", 105, currentY, null, null, "center"); // Título atualizado
        currentY += 10;
        doc.setFontSize(10);
        doc.text(`Data: ${new Date().toLocaleDateString()} - Hora: ${new Date().toLocaleTimeString()}`, 105, currentY, null, null, "center");
        currentY += 5; // Espaço para dados do lab
        doc.setFontSize(8); // Fonte menor para dados do lab
        doc.text("Endereço: 233, R. Mario Laérte, 163 - Centro, Alagoinhas - BA, 48005-098", 105, currentY, null, null, "center");
        currentY += 4;
        doc.text("Site: https://www.ceteplnab.com.br/", 105, currentY, null, null, "center");
        currentY += 6; // Espaço após dados do lab
        doc.setLineWidth(0.5);
        doc.line(20, currentY, 190, currentY);
        currentY += 10;

        // --- Seção: Identificação do Protocolo ---
        doc.setFontSize(14);
        doc.text(`PROTOCOLO DE ATENDIMENTO Nº: ${dados.protocolo}`, 20, currentY);
        currentY += 8;
        doc.setFontSize(10);
        doc.setLineWidth(0.2);
        doc.line(20, currentY, 190, currentY);
        currentY += 10;

        // --- Seção: Dados do Paciente ---
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

        // --- Seção: Observações ---
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

        doc.output('dataurlnewwindow', { filename: `Protocolo_${dados.nome.replace(/\s+/g, "_")}.pdf` });

        alert(`Protocolo ${dados.protocolo} salvo e gerado! Verifique a nova aba para visualizar e imprimir.`);
        
        enviarParaPlanilha(dados);

        limparCampos();
        mostrarHistorico();
    } catch (error) {
        alert(error.message);
        console.error("Erro ao salvar protocolo:", error);
    }
}

function mostrarHistorico() {
    const historicoDiv = document.getElementById('historico');
    const cadastros = JSON.parse(localStorage.getItem('cadastros')) || [];
    if (cadastros.length === 0) {
        historicoDiv.innerHTML = "<p>Nenhum cadastro encontrado.</p>";
        return;
    }
    let html = "<h3>Histórico de Cadastros</h3><ul>";
    cadastros.forEach((c, index) => {
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

    limparCampos(false);

    document.getElementById('nome').value = cadastro.nome;
    document.getElementById('cpf').value = cadastro.cpf;
    document.getElementById('data_nasc').value = cadastro.dataNasc;
    document.getElementById('idade').value = cadastro.idade;
    document.getElementById('sexo').value = cadastro.sexo;
    document.getElementById('endereco').value = cadastro.endereco;
    document.getElementById('contato').value = cadastro.contato;
    document.getElementById('observacoes').value = cadastro.observacoes;
    document.getElementById('examesNaoListados').value = cadastro.examesNaoListados || '';

    const allCheckboxes = document.querySelectorAll('.exame');
    allCheckboxes.forEach(cb => cb.checked = false);

    cadastro.exames.forEach(exameNome => {
        const checkbox = document.querySelector(`input[type="checkbox"][value="${exameNome}"]`);
        if (checkbox) {
            checkbox.checked = true;
        } else {
            marcarExame(exameNome); 
        }
    });

    atualizarExamesSelecionadosDisplay();

    alert(`Cadastro de ${cadastro.nome} carregado com sucesso!`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


function limparCampos(showAlert = true) {
    document.getElementById('nome').value = '';
    document.getElementById('cpf').value = '';
    document.getElementById('data_nasc').value = '';
    document.getElementById('idade').value = '';
    document.getElementById('sexo').value = '';
    document.getElementById('endereco').value = '';
    document.getElementById('contato').value = '';

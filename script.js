const { jsPDF } = window.jspdf;
let listaExames = [];

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

window.onload = () => {
    carregarExames();
    document.getElementById('data_nasc').addEventListener('change', atualizarIdade);
    document.getElementById('cpf').addEventListener('input', formatarCPF);
    document.getElementById('contato').addEventListener('input', formatarContato);

    // Adiciona os event listeners onblur para validação
    document.getElementById('data_nasc').addEventListener('blur', validateAge);
    document.getElementById('cpf').addEventListener('blur', validateCpf);
    document.getElementById('contato').addEventListener('blur', validateContact);
};

function carregarExames() {
    fetch('lista-de-exames.txt')
        .then(response => response.text())
        .then(text => {
            listaExames = text.trim().split('\n').map(e => e.trim());
            configurarPesquisa();
        });
}

function configurarPesquisa() {
    const inputPesquisa = document.getElementById('pesquisaExame');
    const sugestoesBox = document.getElementById('sugestoes');
    const examesSelecionadosContainer = document.getElementById('exames'); // Container para os exames selecionados

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
            // Ao clicar na sugestão, chama marcarExame para adicionar à lista de selecionados
            div.addEventListener('click', () => {
                marcarExame(exame); // Não precisa mais passar o container, ele será acessado diretamente
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

// FUNÇÃO MARCAR EXAME CORRIGIDA
function marcarExame(exameNome) {
    const examesContainer = document.getElementById('exames');
    // Verifica se o exame já está presente como um checkbox
    const checkboxExistente = examesContainer.querySelector(`input[type="checkbox"][value="${exameNome}"]`);

    if (checkboxExistente) {
        // Se já existe, apenas garante que está marcado
        checkboxExistente.checked = true;
    } else {
        // Se não existe, cria um novo label com checkbox e adiciona
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" class="exame" value="${exameNome}" checked> ${exameNome}`;
        examesContainer.appendChild(label);
        examesContainer.appendChild(document.createElement('br'));
    }
}


// Funções de Validação com Feedback Visual
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
    const nascimento = new Date(dataString);
    if (nascimento > hoje) return null;
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
        idade--;
    }
    return idade;
}

function validarDataNascimento(dataString) {
    const nascimento = new Date(dataString);
    const hoje = new Date();
    return nascimento instanceof Date && !isNaN(nascimento) && nascimento <= hoje;
}

function atualizarIdade() { // Mantida para o evento 'change' do input date
    validateAge(); // Chama a validação completa
}

// onblur para Data de Nascimento/Idade
function validateAge() {
    const dataNascInput = document.getElementById('data_nasc');
    const dataNasc = dataNascInput.value;
    const idadeInput = document.getElementById('idade');

    if (!dataNasc) {
        clearError('data_nasc');
        idadeInput.value = "";
        return true; // Considera válido se estiver vazio para permitir preenchimento futuro
    }

    if (!validarDataNascimento(dataNasc)) {
        showError('data_nasc', "Data de nascimento inválida ou no futuro.");
        idadeInput.value = "";
        return false;
    }

    const idade = calcularIdade(dataNasc);
    if (idade === null) {
        showError('data_nasc', "Data de nascimento no futuro.");
        idadeInput.value = "";
        return false;
    }

    idadeInput.value = idade;
    clearError('data_nasc');
    return true;
}

// Máscara para CPF (oninput)
function formatarCPF() {
    const inputCPF = document.getElementById('cpf');
    let cpf = inputCPF.value.replace(/\D/g, ''); // Remove tudo que não é dígito
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

// Validação de CPF (onblur)
function validateCpf() {
    const inputCPF = document.getElementById('cpf');
    const cpf = inputCPF.value.replace(/[^\d]+/g, ''); // Limpa a máscara para validar

    if (cpf.length === 0) {
        clearError('cpf');
        return true;
    }

    if (!validarCPF(cpf)) {
        showError('cpf', "CPF inválido.");
        return false;
    }
    clearError('cpf');
    return true;
}

// Função de validação de CPF (sem máscara)
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

// Máscara para Contato (oninput)
function formatarContato() {
    const inputContato = document.getElementById('contato');
    let contato = inputContato.value.replace(/\D/g, ''); // Remove tudo que não é dígito

    if (contato.length > 11) contato = contato.substring(0, 11);

    if (contato.length > 2) {
        if (contato.length <= 6) { // (DD) XXXX
            contato = `(${contato.substring(0, 2)}) ${contato.substring(2)}`;
        } else if (contato.length <= 10) { // (DD) XXXX-XXXX
            contato = `(${contato.substring(0, 2)}) ${contato.substring(2, 6)}-${contato.substring(6)}`;
        } else { // (DD) 9XXXX-XXXX
            contato = `(${contato.substring(0, 2)}) ${contato.substring(2, 7)}-${contato.substring(7)}`;
        }
    }
    inputContato.value = contato;
}

// Validação de Contato (onblur) - Apenas DDD brasileiro
function validateContact() {
    const inputContato = document.getElementById('contato');
    const contato = inputContato.value.replace(/\D/g, ''); // Remove máscara

    if (contato.length === 0) {
        clearError('contato');
        return true;
    }

    if (contato.length < 2) { // Precisa de pelo menos o DDD para validar
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


// Função para coletar todos os dados, incluindo a validação final antes de gerar PDF/salvar
function coletarDados() {
    // Chamar as validações onblur explicitamente para garantir que todos os campos foram verificados
    const isAgeValid = validateAge();
    const isCpfValid = validateCpf();
    const isContactValid = validateContact();

    // Se qualquer uma das validações falhar, impede a coleta e retorna
    if (!isAgeValid || !isCpfValid || !isContactValid) {
        // Não é necessário um alert aqui, pois as mensagens de erro já estão visíveis nos campos.
        // O alert seria redundante e possivelmente irritante para o usuário.
        throw new Error("Por favor, corrija os erros nos campos antes de prosseguir.");
    }

    const nome = document.getElementById('nome').value.trim();
    const cpf = document.getElementById('cpf').value.trim();
    const dataNasc = document.getElementById('data_nasc').value;
    const sexo = document.getElementById('sexo').value;
    const endereco = document.getElementById('endereco').value.trim();
    const contato = document.getElementById('contato').value.trim();
    const observacoes = document.getElementById('observacoes').value.trim();
    const exames = Array.from(document.querySelectorAll('.exame:checked')).map(e => e.value);

    // Validações de campos obrigatórios que não são onblur (ex: nome, sexo, exames selecionados)
    if (!nome) throw new Error("Preencha o campo: Nome.");
    if (!sexo) throw new Error("Selecione o sexo.");
    if (exames.length === 0) throw new Error("Selecione pelo menos um exame.");

    return { nome, cpf, dataNasc, idade: document.getElementById('idade').value, sexo, endereco, contato, observacoes, exames };
}

function gerarPDF() {
    try {
        const dados = coletarDados(); // coletarDados agora inclui validações
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text("Laboratório CETEP", 105, 15, null, null, "center");
        doc.setFontSize(12);
        doc.text(`Data: ${new Date().toLocaleDateString()} - Hora: ${new Date().toLocaleTimeString()}`, 105, 23, null, null, "center");
        doc.text(`Protocolo nº: ${Math.floor(Math.random() * 10000)}`, 10, 30);
        doc.text(`Nome: ${dados.nome}`, 10, 40);
        doc.text(`CPF: ${dados.cpf}`, 10, 47);
        doc.text(`Data de Nascimento: ${dados.dataNasc}`, 10, 54);
        doc.text(`Idade: ${dados.idade} anos`, 10, 61);
        doc.text(`Sexo: ${dados.sexo}`, 10, 68);
        doc.text(`Endereço: ${dados.endereco}`, 10, 75);
        doc.text(`Contato: ${dados.contato}`, 10, 82);
        doc.text("Exames Selecionados:", 10, 92);
        let y = 100;
        dados.exames.forEach(exame => {
            doc.text(`- ${exame}`, 15, y);
            y += 7;
        });

        if (dados.observacoes) {
            y += 10; // Espaço antes das observações
            doc.text("Observações:", 10, y);
            y += 7;
            const splitText = doc.splitTextToSize(dados.observacoes, 180); // Quebra o texto para caber na página
            doc.text(splitText, 15, y);
        }

        doc.save(`Protocolo_${dados.nome.replace(/\s+/g, "_")}.pdf`);
    } catch (error) {
        alert(error.message); // Exibe a mensagem de erro da validação
        console.error("Erro ao gerar PDF:", error);
    }
}

function salvarLocal() {
    try {
        const cadastro = coletarDados(); // coletarDados agora inclui validações
        let cadastros = JSON.parse(localStorage.getItem('cadastros')) || [];
        cadastros.push(cadastro);
        localStorage.setItem('cadastros', JSON.stringify(cadastros));
        alert("Cadastro salvo localmente!");
    } catch (error) {
        alert(error.message); // Exibe a mensagem de erro da validação
        console.error("Erro ao salvar localmente:", error);
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
        html += `<li><b>${index + 1}</b> - ${c.nome} - CPF: ${c.cpf} - Idade: ${c.idade} anos - Exames: ${c.exames.join(", ")}`;
        if (c.observacoes) {
            html += `<br>Observações: ${c.observacoes.substring(0, 100)}${c.observacoes.length > 100 ? '...' : ''}`;
        }
        html += `</li>`;
    });
    html += "</ul>";
    historicoDiv.innerHTML = html;
}

function limparHistorico() {
    localStorage.removeItem('cadastros');
    alert('Histórico apagado!');
    document.getElementById('historico').innerHTML = "";
}

function enviarParaPlanilha() {
    try {
        const dados = coletarDados(); // coletarDados agora inclui validações
        const url = 'https://docs.google.com/forms/d/e/SEU_FORM_ID/formResponse'; // Substituir pelo seu ID do Google Form

        const formData = new FormData();
        formData.append('entry.1111111111', dados.nome);
        formData.append('entry.2222222222', dados.cpf);
        formData.append('entry.3333333333', dados.dataNasc);
        formData.append('entry.4444444444', dados.idade);
        formData.append('entry.5555555555', dados.sexo);
        formData.append('entry.6666666666', dados.endereco);
        formData.append('entry.7777777777', dados.contato);
        formData.append('entry.8888888888', dados.exames.join(", "));
        formData.append('entry.9999999999', dados.observacoes); // Novo campo para observações

        fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            body: formData
        }).then(() => {
            alert('Dados enviados para a planilha com sucesso!');
        }).catch(error => {
            console.error("Erro ao enviar para planilha:", error);
            alert("Erro ao enviar dados para a planilha. Verifique o console para mais detalhes.");
        });
    } catch (error) {
        alert(error.message); // Exibe a mensagem de erro da validação
        console.error("Erro na coleta de dados para envio da planilha:", error);
    }
}

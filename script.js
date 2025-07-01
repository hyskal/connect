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
    carregarExames(); // Chama a função para carregar e exibir a lista
    document.getElementById('data_nasc').addEventListener('change', atualizarIdade);
    document.getElementById('cpf').addEventListener('input', formatarCPF);
    document.getElementById('contato').addEventListener('input', formatarContato);

    // Adiciona os event listeners onblur para validação
    document.getElementById('data_nasc').addEventListener('blur', validateAge);
    document.getElementById('cpf').addEventListener('blur', validateCpfAndCheckHistory); // Modificado para verificar histórico
    document.getElementById('contato').addEventListener('blur', validateContact);
};

function carregarExames() {
    fetch('lista-de-exames.txt')
        .then(response => response.text())
        .then(text => {
            listaExames = text.trim().split('\n').map(e => e.trim());
            atualizarListaExamesCompleta(); // GARANTE QUE A LISTA COMPLETA É EXIBIDA AO CARREGAR
            configurarPesquisa(); // Configura a busca APÓS a lista estar carregada
        })
        .catch(error => {
            console.error("Erro ao carregar lista-de-exames.txt:", error);
            alert("Não foi possível carregar a lista de exames. Verifique o arquivo 'lista-de-exames.txt'.");
        });
}

// FUNÇÃO PARA EXIBIR TODOS OS EXAMES COMO CHECKBOXES
function atualizarListaExamesCompleta() {
    const container = document.getElementById('exames');
    container.innerHTML = ""; // Limpa o container antes de popular

    listaExames.forEach(exame => {
        const label = document.createElement('label');
        // Cria um checkbox para cada exame da lista, inicialmente desmarcado
        label.innerHTML = `<input type="checkbox" class="exame" value="${exame}"> ${exame}`;
        container.appendChild(label);
        container.appendChild(document.createElement('br'));
    });
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

    // Oculta sugestões se clicar fora
    document.addEventListener('click', function(event) {
        if (!event.target.closest('#pesquisaExame') && !event.target.closest('#sugestoes')) {
            sugestoesBox.style.display = 'none';
        }
    });
}

// FUNÇÃO MARCAR EXAME: Agora ela busca o checkbox existente na lista completa e o marca
function marcarExame(exameNome) {
    const examesContainer = document.getElementById('exames');
    // Encontra o checkbox específico pelo seu valor
    const checkboxExistente = examesContainer.querySelector(`input[type="checkbox"][value="${exameNome}"]`);

    if (checkboxExistente) {
        // Se o checkbox existe na lista, apenas o marca
        checkboxExistente.checked = true;
        // Rola a visualização para o checkbox marcado (opcional, para UX)
        checkboxExistente.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        // Esta parte só seria acionada se, por algum erro, um exame da pesquisa não estivesse na lista inicial.
        // No cenário ideal, todos os exames da `listaExames` (e, portanto, da busca) já deveriam ter seu checkbox criado por `atualizarListaExamesCompleta()`.
        // Mas para robustez, adicionamos:
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" class="exame" value="${exameNome}" checked> ${exameNome}`;
        examesContainer.appendChild(label);
        examesContainer.appendChild(document.createElement('br'));
        label.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}


// Funções de Validação com Feedback Visual (mantidas)
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

// FUNÇÃO DE CÁLCULO DE IDADE COM MESES (mantida)
function calcularIdade(dataString) {
    const hoje = new Date();
    const nascimento = new Date(dataString + 'T00:00:00'); // Adiciona T00:00:00 para evitar problemas de fuso horário
    if (isNaN(nascimento.getTime()) || nascimento > hoje) return null;

    let anos = hoje.getFullYear() - nascimento.getFullYear();
    let meses = hoje.getMonth() - nascimento.getMonth();

    if (hoje.getDate() < nascimento.getDate()) { // Se o dia atual é menor que o dia de nascimento
        meses--; // Diminui um mês
    }

    if (meses < 0) { // Se os meses ficaram negativos (ex: nasceu em nov, hoje é jan)
        meses += 12; // Adiciona 12 meses
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

// Máscaras e Validações de CPF e Contato (mantidas)
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

// *** NOVA FUNÇÃO PARA VALIDAR CPF E VERIFICAR HISTÓRICO ***
function validateCpfAndCheckHistory() {
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
    
    // Se o CPF é válido, limpa qualquer erro e verifica o histórico
    clearError('cpf'); 
    checkCpfInHistory(cpf); // Chama a nova função para verificar histórico
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

// *** NOVA FUNÇÃO PARA VERIFICAR CPF NO HISTÓRICO LOCAL ***
function checkCpfInHistory(cpf) {
    const cadastros = JSON.parse(localStorage.getItem('cadastros')) || [];
    const indexFound = cadastros.findIndex(c => c.cpf.replace(/[^\d]+/g, '') === cpf);

    if (indexFound !== -1) {
        // Se o CPF foi encontrado no histórico
        const cadastroEncontrado = cadastros[indexFound];
        const confirmLoad = confirm(
            `CPF (${cadastroEncontrado.cpf}) encontrado no histórico para:\n\n` +
            `Nome: ${cadastroEncontrado.nome}\n` +
            `Data de Nascimento: ${cadastroEncontrado.dataNasc}\n` +
            `Sexo: ${cadastroEncontrado.sexo}\n` +
            `Endereço: ${cadastroEncontrado.endereco}\n` +
            `Contato: ${cadastroEncontrado.contato}\n\n` +
            `Deseja carregar esses dados no formulário?`
        );

        if (confirmLoad) {
            carregarCadastro(indexFound); // Reutiliza a função carregarCadastro
        }
    }
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


// Função para coletar todos os dados, incluindo o novo campo "examesNaoListados"
function coletarDados() {
    const isAgeValid = validateAge();
    const isCpfValid = validateCpfAndCheckHistory(); // Chamada de validação atualizada
    const isContactValid = validateContact();

    if (!isAgeValid || !isCpfValid || !isContactValid) {
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
    const examesNaoListados = document.getElementById('examesNaoListados').value.trim();

    if (!nome) throw new Error("Preencha o campo: Nome.");
    if (!sexo) throw new Error("Selecione o sexo.");
    if (exames.length === 0 && !examesNaoListados) throw new Error("Selecione pelo menos um exame ou preencha 'Acrescentar Exames não Listados'.");


    return { nome, cpf, dataNasc, idade: document.getElementById('idade').value, sexo, endereco, contato, observacoes, exames, examesNaoListados };
}

// FUNÇÃO GERAR PDF com "Exames Adicionais"
function gerarPDF() {
    try {
        const dados = coletarDados();
        const doc = new jsPDF();

        const [ano, mes, dia] = dados.dataNasc.split('-');
        const dataNascFormatada = `${dia}/${mes}/${ano}`;

        doc.setFontSize(16);
        doc.text("Laboratório CETEP", 105, 15, null, null, "center");
        doc.setFontSize(12);
        doc.text(`Data: ${new Date().toLocaleDateString()} - Hora: ${new Date().toLocaleTimeString()}`, 105, 23, null, null, "center");
        doc.text(`Protocolo nº: ${Math.floor(Math.random() * 10000)}`, 10, 30);
        doc.text(`Nome: ${dados.nome}`, 10, 40);
        doc.text(`CPF: ${dados.cpf}`, 10, 47);
        doc.text(`Data de Nascimento: ${dataNascFormatada}`, 10, 54);
        doc.text(`Idade: ${dados.idade}`, 10, 61);
        doc.text(`Sexo: ${dados.sexo}`, 10, 68);
        doc.text(`Endereço: ${dados.endereco}`, 10, 75);
        doc.text(`Contato: ${dados.contato}`, 10, 82);
        
        let y = 92; // Posição inicial para exames

        if (dados.exames.length > 0) {
            doc.text("Exames Selecionados:", 10, y);
            y += 7;
            dados.exames.forEach(exame => {
                doc.text(`- ${exame}`, 15, y);
                y += 7;
            });
        }

        // ADICIONAR EXAMES NÃO LISTADOS NO PDF
        if (dados.examesNaoListados) {
            if (dados.exames.length > 0) { // Adiciona um espaço se já houver exames listados
                y += 10;
            } else { // Se não houver exames listados, ajusta o y para ficar próximo
                y = Math.max(y, 92); // Garante que não sobreponha dados do paciente se não houver exames listados
            }
            doc.text("Exames Adicionais:", 10, y);
            y += 7;
            const splitText = doc.splitTextToSize(dados.examesNaoListados, 180);
            doc.text(splitText, 15, y);
        }

        if (dados.observacoes) {
            y += 10; // Espaço antes das observações
            doc.text("Observações:", 10, y);
            y += 7;
            const splitText = doc.splitTextToSize(dados.observacoes, 180);
            doc.text(splitText, 15, y);
        }

        doc.output('dataurlnewwindow', { filename: `Protocolo_${dados.nome.replace(/\s+/g, "_")}.pdf` });

        alert("PDF gerado! Verifique a nova aba para visualizar e imprimir.");
        limparCampos();
    } catch (error) {
        alert(error.message);
        console.error("Erro ao gerar PDF:", error);
    }
}

function salvarLocal() {
    try {
        const cadastro = coletarDados();
        let cadastros = JSON.parse(localStorage.getItem('cadastros')) || [];
        // Verifica se o CPF já existe para atualizar o registro em vez de duplicar
        const existingIndex = cadastros.findIndex(c => c.cpf.replace(/[^\d]+/g, '') === cadastro.cpf.replace(/[^\d]+/g, ''));
        if (existingIndex !== -1) {
            cadastros[existingIndex] = cadastro; // Atualiza o cadastro existente
            alert("Cadastro atualizado localmente!");
        } else {
            cadastros.push(cadastro); // Adiciona novo cadastro
            alert("Cadastro salvo localmente!");
        }
        localStorage.setItem('cadastros', JSON.stringify(cadastros));
        
        limparCampos();
    } catch (error) {
        alert(error.message);
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
        html += `<li onclick="carregarCadastro(${index})"><b>${index + 1}</b> - ${c.nome} - CPF: ${c.cpf} - Idade: ${c.idade} - Exames: ${c.exames.join(", ")}`;
        if (c.examesNaoListados) { // Inclui no histórico
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

// FUNÇÃO PARA CARREGAR CADASTRO DO HISTÓRICO
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
        const confirmar = confirm("Existem dados não salvos no formulário. Deseja substituí-los pelo cadastro do histórico?");
        if (!confirmar) {
            return;
        }
    }

    limparCampos(false); // Limpa sem exibir alerta

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
            // Caso um exame do histórico não esteja na lista atual (ex: lista-de-exames.txt mudou)
            marcarExame(exameNome); 
        }
    });

    alert(`Cadastro de ${cadastro.nome} carregado com sucesso!`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// FUNÇÃO PARA LIMPAR TODOS OS CAMPOS DO FORMULÁRIO
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


function limparHistorico() {
    localStorage.removeItem('cadastros');
    alert('Histórico apagado!');
    document.getElementById('historico').innerHTML = "";
}

function enviarParaPlanilha() {
    try {
        const dados = coletarDados();
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
        formData.append('entry.9999999999', dados.observacoes);
        formData.append('entry.0000000000', dados.examesNaoListados); // NOVO CAMPO para Google Forms (substitua o entry.ID)

        fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            body: formData
        }).then(() => {
            alert('Dados enviados para a planilha com sucesso!');
            limparCampos();
        }).catch(error => {
            console.error("Erro ao enviar para planilha:", error);
            alert("Erro ao enviar dados para a planilha. Verifique o console para mais detalhes.");
        });
    } catch (error) {
        alert(error.message);
        console.error("Erro na coleta de dados para envio da planilha:", error);
    }
}

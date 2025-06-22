const { jsPDF } = window.jspdf;
let listaExames = [];

window.onload = () => {
    carregarExames();
    document.getElementById('data_nasc').addEventListener('change', atualizarIdade);
};

function carregarExames() {
    fetch('lista-de-exames.txt')
        .then(response => response.text())
        .then(text => {
            listaExames = text.trim().split('\n').map(e => e.trim());
            atualizarListaExames();
            configurarPesquisa();
        });
}

function atualizarListaExames() {
    const container = document.getElementById('exames');
    container.innerHTML = "";

    listaExames.forEach(exame => {
        const label = document.createElement('label');
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

    document.addEventListener('click', function(event) {
        if (!event.target.closest('#pesquisaExame') && !event.target.closest('#sugestoes')) {
            sugestoesBox.style.display = 'none';
        }
    });
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

function atualizarIdade() {
    const dataNasc = document.getElementById('data_nasc').value;
    if (validarData(dataNasc)) {
        const idade = calcularIdade(dataNasc);
        document.getElementById('idade').value = idade !== null ? idade : "";
    } else {
        document.getElementById('idade').value = "";
    }
}

function validarData(dataString) {
    const nascimento = new Date(dataString);
    const hoje = new Date();
    return nascimento instanceof Date && !isNaN(nascimento) && nascimento <= hoje;
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

function coletarDados() {
    const nome = document.getElementById('nome').value.trim();
    const cpf = document.getElementById('cpf').value.trim();
    const dataNasc = document.getElementById('data_nasc').value;
    const sexo = document.getElementById('sexo').value;
    const endereco = document.getElementById('endereco').value.trim();
    const contato = document.getElementById('contato').value.trim();
    const exames = Array.from(document.querySelectorAll('.exame:checked')).map(e => e.value);

    if (!nome) throw alert("Preencha o nome.");
    if (!validarCPF(cpf)) throw alert("CPF inválido.");
    if (!validarData(dataNasc)) throw alert("Data de nascimento inválida.");
    const idade = calcularIdade(dataNasc);
    if (idade === null) throw alert("Data de nascimento no futuro.");
    if (!sexo) throw alert("Selecione o sexo.");
    if (exames.length === 0) throw alert("Selecione pelo menos um exame.");

    return { nome, cpf, dataNasc, idade, sexo, endereco, contato, exames };
}

function gerarPDF() {
    const dados = coletarDados();
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
    doc.save(`Protocolo_${dados.nome.replace(/\\s+/g, "_")}.pdf`);
}

function salvarLocal() {
    const cadastro = coletarDados();
    let cadastros = JSON.parse(localStorage.getItem('cadastros')) || [];
    cadastros.push(cadastro);
    localStorage.setItem('cadastros', JSON.stringify(cadastros));
    alert("Cadastro salvo localmente!");
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
        html += `<li><b>${index + 1}</b> - ${c.nome} - CPF: ${c.cpf} - Idade: ${c.idade} anos - Exames: ${c.exames.join(", ")}</li>`;
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

    fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        body: formData
    }).then(() => {
        alert('Dados enviados para a planilha com sucesso!');
    });
}

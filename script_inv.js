// VERSÃO: 1.0.3 (script_inv.js)
// CHANGELOG:
// - Removido: A validação obrigatória do nome do operador para a geração do relatório de log.
// - Atualizado: O cabeçalho do relatório de log agora usa "Desconhecido" se o nome do operador não for fornecido.
// - Estrutura: Código mantido dividido em 10 sessões.

// Seção 1: Importações e Configuração Inicial
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, where } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { jsPDF } from "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
import { formatDateTimeToDisplay, formatDateToDisplay, getOperadorNameFromInput } from './sislab_utils.js';

// Sua configuração do Firebase (a mesma do index.html e inventario.html)
const firebaseConfig = {
    apiKey: "AIzaSyA_LEim5s-_NSCk3ySVCcUzDjIq0RPlvnA",
    authDomain: "sislab-cetep.firebaseapp.com",
    projectId: "sislab-cetep",
    storageBucket: "sislab-cetep.firebasestorage.app",
    messagingSenderId: "958611861664",
    appId: "1:958611861664:web:97a3755f2b1958b0c8d9c5",
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Seção 2: Variáveis de Estado Globais
let currentLogFilterOperation = 'all'; // 'all' para todas as operações por padrão

// Seção 3: Funções Auxiliares de Depuração e UI
function updateDebugFilterStatus(status) {
    const debugElement = document.getElementById('debug-filter-status');
    if (debugElement) {
        debugElement.textContent = `Status do Filtro Atual: ${status}`;
    }
}

// Seção 4: Event Listeners Iniciais (DOMContentLoaded)
document.addEventListener('DOMContentLoaded', () => {
    console.log("DEBUG(script_inv.js): DOMContentLoaded - Iniciando setup da página de Log de Inventário.");

    // Event listener para o filtro de operação
    document.getElementById('filterOperationType').addEventListener('change', (event) => {
        currentLogFilterOperation = event.target.value;
        console.log(`DEBUG(script_inv.js): Filtro de operação alterado para: "${currentLogFilterOperation}"`);
        updateDebugFilterStatus(currentLogFilterOperation);
        listarLogGeralInventario();
    });

    // Event listener para o botão de impressão
    document.getElementById('printLogReportBtn').addEventListener('click', imprimirRelatorioLogGeral);

    // Event listeners para os campos de data (opcional: recarregar ao mudar data)
    document.getElementById('filterStartDate').addEventListener('change', () => {
        console.log("DEBUG: Data inicial alterada. Recarregando logs.");
        listarLogGeralInventario();
    });
    document.getElementById('filterEndDate').addEventListener('change', () => {
        console.log("DEBUG: Data final alterada. Recarregando logs.");
        listarLogGeralInventario();
    });


    updateDebugFilterStatus(currentLogFilterOperation); // Define o status inicial no HTML
    listarLogGeralInventario(); // Carrega o log inicialmente
});

// Seção 5: Lógica de Listagem da Tabela (listarLogGeralInventario)
async function listarLogGeralInventario() {
    console.log(`DEBUG(script_inv.js): Iniciando listarLogGeralInventario com filtro: "${currentLogFilterOperation}"`);
    const logTableBody = document.querySelector('#inventoryLogTable tbody');
    logTableBody.innerHTML = '<tr><td colspan="9">Carregando logs...</td></tr>';

    if (typeof db === 'undefined' || !db) {
        console.error("DEBUG(LogGeral): Erro - Banco de dados não inicializado.");
        logTableBody.innerHTML = '<tr><td colspan="9">Banco de dados não inicializado.</td></tr>';
        return;
    }

    try {
        const logRef = collection(db, 'log_inventario_v3');
        let q;

        const startDateInput = document.getElementById('filterStartDate').value;
        const endDateInput = document.getElementById('filterEndDate').value;

        // Validação básica das datas
        const startDate = startDateInput ? new Date(startDateInput + 'T00:00:00') : null;
        const endDate = endDateInput ? new Date(endDateInput + 'T23:59:59') : null;

        let queryConstraints = [];

        if (currentLogFilterOperation !== 'all') {
            queryConstraints.push(where('tipoMovimento', '==', currentLogFilterOperation));
            console.log(`DEBUG(LogGeral): Adicionando filtro por tipo de movimento: "${currentLogFilterOperation}"`);
        }

        if (startDate) {
            queryConstraints.push(where('dataHoraMovimento', '>=', startDate));
            console.log(`DEBUG(LogGeral): Adicionando filtro por data inicial: "${startDate.toISOString()}"`);
        }
        if (endDate) {
            queryConstraints.push(where('dataHoraMovimento', '<=', endDate));
            console.log(`DEBUG(LogGeral): Adicionando filtro por data final: "${endDate.toISOString()}"`);
        }

        queryConstraints.push(orderBy('dataHoraMovimento', 'desc'));
        console.log("DEBUG(LogGeral): Adicionando ordenação por dataHoraMovimento (decrescente).");

        q = query(logRef, ...queryConstraints);
        console.log("DEBUG(LogGeral): Query Firebase construída.");

        console.log("DEBUG(LogGeral): Executando query no Firebase Firestore...");
        const querySnapshot = await getDocs(q);
        const logs = querySnapshot.docs.map(doc => doc.data());
        console.log(`DEBUG(LogGeral): Query executada. ${logs.length} logs encontrados.`);

        if (logs.length === 0) {
            let noRecordsMessage = "Nenhum registro de movimentação encontrado.";
            if (currentLogFilterOperation !== 'all') {
                noRecordsMessage = `Nenhum registro de '${currentLogFilterOperation}' encontrado.`;
            }
            if (startDate || endDate) {
                const startStr = startDate ? formatDateToDisplay(startDate) : '';
                const endStr = endDate ? formatDateToDisplay(endDate) : '';
                noRecordsMessage += ` para o período ${startStr} - ${endStr}.`;
            }
            logTableBody.innerHTML = `<tr><td colspan="9">${noRecordsMessage}</td></tr>`;
            console.log(`DEBUG(LogGeral): Exibindo mensagem de nenhum registro: "${noRecordsMessage}"`);
            return;
        }

        logTableBody.innerHTML = ''; // Limpa antes de preencher
        logs.forEach((log) => {
            const row = logTableBody.insertRow();
            const dataHoraFormatada = log.dataHoraMovimento ? formatDateTimeToDisplay(log.dataHoraMovimento.toDate()) : 'N/A';

            row.insertCell(0).textContent = log.itemCod || 'N/A';
            row.insertCell(1).textContent = log.itemNome || 'N/A';
            row.insertCell(2).textContent = log.tipoMovimento || 'N/A';
            row.insertCell(3).textContent = log.quantidadeMovimentada !== undefined ? `${log.quantidadeMovimentada.toString()} ${log.unidadeMedidaLog || ''}` : 'N/A';
            row.insertCell(4).textContent = log.quantidadeAntes !== undefined ? log.quantidadeAntes.toString() : 'N/A';
            row.insertCell(5).textContent = log.quantidadeDepois !== undefined ? log.quantidadeDepois.toString() : 'N/A';
            row.insertCell(6).textContent = log.operador || 'Desconhecido';
            row.insertCell(7).textContent = dataHoraFormatada;
            row.insertCell(8).textContent = log.observacoesMovimento || '';
        });
        console.log("DEBUG(LogGeral): Logs carregados e exibidos na tabela.");

    } catch (error) {
        console.error("DEBUG(LogGeral): Erro FATAL ao carregar log geral de inventário:", error);
        logTableBody.innerHTML = '<tr><td colspan="9">Erro ao carregar log. Verifique o console para detalhes técnicos.</td></tr>';
    }
}

// Seção 6: Função de Impressão do Relatório (imprimirRelatorioLogGeral)
async function imprimirRelatorioLogGeral() {
    console.log("DEBUG(RelatorioLog): Iniciando geração de Relatório de Log Geral.");
    // Obtém o nome do operador. Não é obrigatório para impressão, usará "Desconhecido" se vazio.
    const operador = getOperadorNameFromInput() || 'Desconhecido'; 
    console.log(`DEBUG(RelatorioLog): Operador para o relatório: "${operador}"`);

    const startDateInput = document.getElementById('filterStartDate').value;
    const endDateInput = document.getElementById('filterEndDate').value;

    const startDate = startDateInput ? new Date(startDateInput + 'T00:00:00') : null;
    const endDate = endDateInput ? new Date(endDateInput + 'T23:59:59') : null;

    if (startDate && endDate && startDate > endDate) {
        alert("Erro: A 'Data Inicial' não pode ser posterior à 'Data Final'.");
        console.warn("DEBUG(RelatorioLog): Validação de data falhou: Data inicial > Data final.");
        return;
    }

    if (typeof db === 'undefined' || !db) {
        alert("Banco de dados não inicializado. Não é possível imprimir o relatório de log.");
        console.error("DEBUG(RelatorioLog): Erro: Firestore DB não inicializado.");
        return;
    }

    let logsRelatorio = [];
    try {
        const logRef = collection(db, 'log_inventario_v3');
        let queryConstraints = [];

        if (currentLogFilterOperation !== 'all') {
            queryConstraints.push(where('tipoMovimento', '==', currentLogFilterOperation));
        }
        if (startDate) {
            queryConstraints.push(where('dataHoraMovimento', '>=', startDate));
        }
        if (endDate) {
            queryConstraints.push(where('dataHoraMovimento', '<=', endDate));
        }
        queryConstraints.push(orderBy('dataHoraMovimento', 'asc')); // Ordem ascendente para o relatório

        const q = query(logRef, ...queryConstraints);
        console.log("DEBUG(RelatorioLog): Query Firestore para relatório construída.");

        const querySnapshot = await getDocs(q);
        logsRelatorio = querySnapshot.docs.map(doc => doc.data());
        console.log(`DEBUG(RelatorioLog): Logs carregados do Firestore para o relatório: ${logsRelatorio.length} logs.`);

    } catch (error) {
        console.error("DEBUG(RelatorioLog): Erro ao carregar logs para o relatório de log:", error);
        alert("Erro ao carregar logs para o relatório de log. Verifique o console.");
        return;
    }

    if (logsRelatorio.length === 0) {
        let noRecordsMessage = "Não há registros de movimentação para o período e filtro selecionados.";
        alert(noRecordsMessage);
        console.log("DEBUG(RelatorioLog): Nenhum log encontrado para o relatório.");
        return;
    }

    const doc = new jsPDF();
    let currentY = 15;
    console.log("DEBUG(RelatorioLog): jsPDF inicializado. Gerando cabeçalho do PDF.");

    // Gerar Cabeçalho do PDF
    currentY = gerarCabecalhoPdf(doc, currentY, operador);
    
    // Título do Relatório
    doc.setFontSize(14);
    let reportTitle = "RELATÓRIO DE LOG DE INVENTÁRIO";
    if (currentLogFilterOperation !== 'all') {
        reportTitle += ` - Tipo: ${currentLogFilterOperation}`;
    }
    let dateRangeText = "";
    if (startDate && endDate) {
        dateRangeText = `Período: ${formatDateToDisplay(startDate)} a ${formatDateToDisplay(endDate)}`;
    } else if (startDate) {
        dateRangeText = `A partir de: ${formatDateToDisplay(startDate)}`;
    } else if (endDate) {
        dateRangeText = `Até: ${formatDateToDisplay(endDate)}`;
    }
    
    doc.text(reportTitle, 105, currentY, null, null, "center");
    currentY += 6;
    if (dateRangeText) {
        doc.setFontSize(10);
        doc.text(dateRangeText, 105, currentY, null, null, "center");
        currentY += 4;
    }
    currentY += 2; // Espaço extra após título/período
    doc.setLineWidth(0.2);
    doc.line(20, currentY, 190, currentY);
    currentY += 10;
    console.log("DEBUG(RelatorioLog): Título do PDF gerado.");

    // Conteúdo: Logs do Inventário
    currentY = gerarConteudoTabelaLogPdf(doc, currentY, logsRelatorio, operador); // Passar operador para repetição de cabeçalho

    // Rodapé do PDF
    gerarRodapePdf(doc, operador);

    console.log("DEBUG(RelatorioLog): Geração do relatório concluída. Tentando abrir o PDF.");
    try {
        doc.output('dataurlnewwindow', { filename: `Relatorio_Log_Inventario_${formatDateToDisplay(new Date()).replace(/\//g, '-')}.pdf` });
        console.log("DEBUG(RelatorioLog): Chamada doc.output() bem-sucedida.");
        alert(`Relatório de Log de Inventário gerado com sucesso por ${operador}! Verifique a nova aba para visualizar e imprimir.`);
    } catch (outputError) {
        console.error("DEBUG(RelatorioLog): Erro ao gerar ou abrir o PDF (doc.output):", outputError);
        alert("Erro ao gerar ou exibir o PDF. Verifique o console para detalhes.");
    }

    console.log("DEBUG(RelatorioLog): Geração de relatório de log geral concluída.");
}

// Seção 7: Helper: Gerar Cabeçalho do PDF (Função Reutilizável)
function gerarCabecalhoPdf(doc, currentY, operador) {
    doc.setFontSize(18);
    doc.text("Laboratório de Análises Clínicas CETEP/LNAB", 105, currentY, null, null, "center");
    currentY += 10;
    doc.setFontSize(10);
    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
    const formattedTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    doc.text(`Data: ${formattedDate} - Hora: ${formattedTime} - Operador: ${operador}`, 105, currentY, null, null, "center");
    currentY += 5;
    doc.setFontSize(8);
    doc.text("Endereço: 233, R. Mario Laérte, 163 - Centro, Alagoinhas - BA, 48005-098", 105, currentY, null, null, "center");
    currentY += 4;
    doc.text("Site: https://www.ceteplnab.com.br/", 105, currentY, null, null, "center");
    currentY += 6;
    doc.setLineWidth(0.5);
    doc.line(20, currentY, 190, currentY);
    currentY += 10;
    return currentY;
}

// Seção 8: Helper: Gerar Conteúdo da Tabela do PDF (Log Específico)
function gerarConteudoTabelaLogPdf(doc, currentY, logs, operadorReport) {
    doc.setFontSize(8);
    const startX = 5;
    const colWidths = [12, 30, 18, 10, 10, 10, 18, 25, 30]; // Cód, Desc, Op, QtdMov, QtdAnt, QtdDep, Operador, DataHora, Obs
    const colPositions = [];
    let xOffset = startX;
    colWidths.forEach(width => {
        colPositions.push(xOffset);
        xOffset += width;
    });

    // Títulos das colunas
    doc.setFont(undefined, 'bold');
    doc.text("CÓD. ITEM", colPositions[0], currentY);
    doc.text("DESCRIÇÃO ITEM", colPositions[1], currentY);
    doc.text("OPERAÇÃO", colPositions[2], currentY);
    doc.text("QTD. MOV.", colPositions[3], currentY);
    doc.text("QTD. ANT.", colPositions[4], currentY);
    doc.text("QTD. DEP.", colPositions[5], currentY);
    doc.text("OPERADOR", colPositions[6], currentY);
    doc.text("DATA E HORA", colPositions[7], currentY);
    doc.text("OBSERVAÇÕES", colPositions[8], currentY);
    currentY += 4;
    doc.setFont(undefined, 'normal');

    logs.forEach((log, index) => {
        if (currentY > 280) { // Quebra de página
            doc.addPage();
            currentY = 15;
            // Repete cabeçalho completo da página
            currentY = gerarCabecalhoPdf(doc, currentY, operadorReport); // Usa o operador que gerou o relatório
            doc.setFontSize(14);
            doc.text("RELATÓRIO DE LOG DE INVENTÁRIO (Continuação)", 105, currentY, null, null, "center");
            currentY += 8;
            doc.setLineWidth(0.2);
            doc.line(20, currentY, 190, currentY);
            currentY += 10;
            doc.setFontSize(8);
            doc.setFont(undefined, 'bold'); // Repete títulos das colunas na nova página
            doc.text("CÓD. ITEM", colPositions[0], currentY);
            doc.text("DESCRIÇÃO ITEM", colPositions[1], currentY);
            doc.text("OPERAÇÃO", colPositions[2], currentY);
            doc.text("QTD. MOV.", colPositions[3], currentY);
            doc.text("QTD. ANT.", colPositions[4], currentY);
            doc.text("QTD. DEP.", colPositions[5], currentY);
            doc.text("OPERADOR", colPositions[6], currentY);
            doc.text("DATA E HORA", colPositions[7], currentY);
            doc.text("OBSERVAÇÕES", colPositions[8], currentY);
            currentY += 4;
            doc.setFont(undefined, 'normal');
        }

        let initialY = currentY; // Salva o Y inicial da linha para desenhar todos os textos
        let maxHeightInRow = 4; // Altura mínima de uma linha de texto

        const dataHoraFormatada = log.dataHoraMovimento ? formatDateTimeToDisplay(log.dataHoraMovimento.toDate()) : 'N/A';

        // Dividir e posicionar textos longos
        const splitDescription = doc.splitTextToSize(log.itemNome || 'N/A', colWidths[1] - 2);
        doc.text(splitDescription, colPositions[1], initialY);
        maxHeightInRow = Math.max(maxHeightInRow, splitDescription.length * 3.5); // Ajuste fino para altura da linha

        const splitObs = doc.splitTextToSize(log.observacoesMovimento || '', colWidths[8] - 2);
        doc.text(splitObs, colPositions[8], initialY);
        maxHeightInRow = Math.max(maxHeightInRow, splitObs.length * 3.5); // Ajuste fino para altura da linha

        doc.text(log.itemCod || 'N/A', colPositions[0], initialY);
        doc.text(log.tipoMovimento || 'N/A', colPositions[2], initialY);
        doc.text(log.quantidadeMovimentada !== undefined ? `${log.quantidadeMovimentada.toString()} ${log.unidadeMedidaLog || ''}` : 'N/A', colPositions[3], initialY);
        doc.text(log.quantidadeAntes !== undefined ? log.quantidadeAntes.toString() : 'N/A', colPositions[4], initialY);
        doc.text(log.quantidadeDepois !== undefined ? log.quantidadeDepois.toString() : 'N/A', colPositions[5], initialY);
        doc.text(log.operador || 'Desconhecido', colPositions[6], initialY);
        doc.text(dataHoraFormatada, colPositions[7], initialY);
        
        currentY = initialY + maxHeightInRow + 2; // +2 para pequeno espaço extra

        if (index < logs.length - 1) {
            doc.setLineWidth(0.1);
            doc.line(colPositions[0], currentY, colPositions[0] + colWidths.reduce((a, b) => a + b, 0), currentY);
            currentY += 3;
        }
    });
    return currentY;
}

// Seção 9: Helper: Rodapé do PDF (Função Reutilizável)
function gerarRodapePdf(doc, operador) {
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.text(`Documento gerado automaticamente pelo SISLAB. Operador: ${operador}`, 105, 290, null, null, "center");
    }
}

// Seção 10: Validações e Utilities para Relatórios (a ser adicionada se mais validações genéricas forem necessárias)
// Atualmente, as validações de data estão dentro de imprimirRelatorioLogGeral.
// Futuras validações complexas ou reutilizáveis poderiam ser adicionadas aqui.

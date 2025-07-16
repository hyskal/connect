// VERSÃO: 1.0.7 (script_inv.js)
// CHANGELOG:
// - Melhorado: Formatação do relatório PDF, com ajuste de larguras de coluna e tratamento de quebras de linha para evitar sobreposição.
// - Ajustado: Posicionamento dos títulos das colunas para melhor legibilidade.
// - Estrutura: Código mantido dividido em 10 sessões.

// Seção 1: Importações e Configuração Inicial
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, where, Timestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
// jsPDF agora é carregado no HTML e acessado globalmente.
import { formatDateTimeToDisplay, formatDateToDisplay, getOperadorNameFromInput } from './sislab_utils.js';

console.log("DEBUG(script_inv.js): Seção 1 - Importações e Configuração Inicial carregada.");

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
console.log("DEBUG(script_inv.js): Firebase inicializado. DB object:", db);


// Seção 2: Variáveis de Estado Globais
let currentLogFilterOperation = 'all'; // 'all' para todas as operações por padrão
console.log("DEBUG(script_inv.js): Seção 2 - Variáveis de Estado Globais definidas.");

// Seção 3: Funções Auxiliares de Depuração e UI
function updateDebugFilterStatus(status) {
    const debugElement = document.getElementById('debug-filter-status');
    if (debugElement) {
        debugElement.textContent = `Status do Filtro Atual: ${status}`;
        console.log(`DEBUG(script_inv.js): Status de depuração UI atualizado para: "${status}"`);
    } else {
        console.warn("DEBUG(script_inv.js): Elemento 'debug-filter-status' não encontrado no DOM.");
    }
}
console.log("DEBUG(script_inv.js): Seção 3 - Funções Auxiliares de Depuração e UI carregadas.");

// Seção 4: Event Listeners Iniciais (DOMContentLoaded)
document.addEventListener('DOMContentLoaded', () => {
    console.log("DEBUG(script_inv.js): DOMContentLoaded - Iniciando setup da página de Log de Inventário.");

    const filterOperationTypeElement = document.getElementById('filterOperationType');
    const printLogReportBtnElement = document.getElementById('printLogReportBtn');
    const filterStartDateElement = document.getElementById('filterStartDate');
    const filterEndDateElement = document.getElementById('filterEndDate');
    const clearDateFilterBtnElement = document.getElementById('clearDateFilterBtn'); // Novo botão

    if (filterOperationTypeElement) {
        filterOperationTypeElement.addEventListener('change', (event) => {
            currentLogFilterOperation = event.target.value;
            console.log(`DEBUG(script_inv.js): Filtro de operação alterado para: "${currentLogFilterOperation}"`);
            updateDebugFilterStatus(currentLogFilterOperation);
            listarLogGeralInventario();
        });
        console.log("DEBUG(script_inv.js): Event listener para 'filterOperationType' adicionado.");
    } else {
        console.error("DEBUG(script_inv.js): Elemento 'filterOperationType' não encontrado. Verifique o HTML.");
    }

    if (printLogReportBtnElement) {
        printLogReportBtnElement.addEventListener('click', imprimirRelatorioLogGeral);
        console.log("DEBUG(script_inv.js): Event listener para 'printLogReportBtn' adicionado.");
    } else {
        console.error("DEBUG(script_inv.js): Elemento 'printLogReportBtn' não encontrado. Verifique o HTML.");
    }

    if (filterStartDateElement) {
        filterStartDateElement.addEventListener('change', () => {
            console.log("DEBUG(script_inv.js): Data inicial alterada. Recarregando logs.");
            listarLogGeralInventario();
        });
        console.log("DEBUG(script_inv.js): Event listener para 'filterStartDate' adicionado.");
    } else {
        console.warn("DEBUG(script_inv.js): Elemento 'filterStartDate' não encontrado. Filtro por data inicial pode não funcionar.");
    }

    if (filterEndDateElement) {
        filterEndDateElement.addEventListener('change', () => {
            console.log("DEBUG(script_inv.js): Data final alterada. Recarregando logs.");
            listarLogGeralInventario();
        });
        console.log("DEBUG(script_inv.js): Event listener para 'filterEndDate' adicionado.");
    } else {
        console.warn("DEBUG(script_inv.js): Elemento 'filterEndDate' não encontrado. Filtro por data final pode não funcionar.");
    }

    // Event listener para o novo botão Limpar Período
    if (clearDateFilterBtnElement) {
        clearDateFilterBtnElement.addEventListener('click', clearDateFilters);
        console.log("DEBUG(script_inv.js): Event listener para 'clearDateFilterBtn' adicionado.");
    } else {
        console.warn("DEBUG(script_inv.js): Elemento 'clearDateFilterBtn' não encontrado. Botão Limpar Período pode não funcionar.");
    }


    updateDebugFilterStatus(currentLogFilterOperation); // Define o status inicial no HTML
    listarLogGeralInventario(); // Carrega o log inicialmente
    console.log("DEBUG(script_inv.js): DOMContentLoaded - Setup inicial concluído, chamando listarLogGeralInventario().");
});

// Nova função para limpar os filtros de data
function clearDateFilters() {
    console.log("DEBUG(clearDateFilters): Limpando campos de filtro de data.");
    const filterStartDateElement = document.getElementById('filterStartDate');
    const filterEndDateElement = document.getElementById('filterEndDate');

    if (filterStartDateElement) filterStartDateElement.value = '';
    if (filterEndDateElement) filterEndDateElement.value = '';

    listarLogGeralInventario(); // Recarrega a tabela sem os filtros de data
}

// Seção 5: Lógica de Listagem da Tabela (listarLogGeralInventario)
async function listarLogGeralInventario() {
    console.log(`DEBUG(listarLogGeralInventario): Iniciando com filtro de operação: "${currentLogFilterOperation}"`);
    const logTableBody = document.querySelector('#inventoryLogTable tbody');
    if (!logTableBody) {
        console.error("DEBUG(listarLogGeralInventario): Elemento '#inventoryLogTable tbody' não encontrado. Não é possível exibir logs.");
        return;
    }
    logTableBody.innerHTML = '<tr><td colspan="9">Carregando logs...</td></tr>';

    if (typeof db === 'undefined' || !db) {
        console.error("DEBUG(listarLogGeralInventario): Erro - Banco de dados não inicializado ou inacessível.");
        logTableBody.innerHTML = '<tr><td colspan="9">Banco de dados não inicializado.</td></tr>';
        return;
    }

    try {
        const logRef = collection(db, 'log_inventario_v3');
        let queryConstraints = [];

        const startDateInput = document.getElementById('filterStartDate')?.value;
        const endDateInput = document.getElementById('filterEndDate')?.value;

        console.log(`DEBUG(listarLogGeralInventario): Valores de input de data: Start="${startDateInput}", End="${endDateInput}"`);

        // Validação e conversão de datas para Timestamp do Firebase
        let startDate = null;
        let endDate = null;

        if (startDateInput) {
            try {
                startDate = Timestamp.fromDate(new Date(startDateInput + 'T00:00:00'));
                console.log(`DEBUG(listarLogGeralInventario): Data inicial convertida para Timestamp: ${startDate.toDate().toISOString()}`);
            } catch (e) {
                console.error("DEBUG(listarLogGeralInventario): Erro ao parsear data inicial:", e);
                alert("Erro ao processar a data inicial. Verifique o formato.");
                return;
            }
        }
        if (endDateInput) {
            try {
                endDate = Timestamp.fromDate(new Date(endDateInput + 'T23:59:59'));
                console.log(`DEBUG(listarLogGeralInventario): Data final convertida para Timestamp: ${endDate.toDate().toISOString()}`);
            } catch (e) {
                console.error("DEBUG(listarLogGeralInventario): Erro ao parsear data final:", e);
                alert("Erro ao processar a data final. Verifique o formato.");
                return;
            }
        }

        if (startDate && endDate && startDate.toDate() > endDate.toDate()) {
            alert("Erro: A 'Data Inicial' não pode ser posterior à 'Data Final'.");
            logTableBody.innerHTML = '<tr><td colspan="9">Erro de período: Data Inicial > Data Final.</td></tr>';
            console.warn("DEBUG(listarLogGeralInventario): Validação de data falhou: Data inicial > Data final.");
            return;
        }

        if (currentLogFilterOperation !== 'all') {
            queryConstraints.push(where('tipoMovimento', '==', currentLogFilterOperation));
            console.log(`DEBUG(listarLogGeralInventario): Adicionando 'where' para tipoMovimento: "${currentLogFilterOperation}"`);
        }

        if (startDate) {
            queryConstraints.push(where('dataHoraMovimento', '>=', startDate));
            console.log(`DEBUG(listarLogGeralInventario): Adicionando 'where' para dataHoraMovimento >= ${startDate.toDate().toISOString()}`);
        }
        if (endDate) {
            queryConstraints.push(where('dataHoraMovimento', '<=', endDate));
            console.log(`DEBUG(listarLogGeralInventario): Adicionando 'where' para dataHoraMovimento <= ${endDate.toDate().toISOString()}`);
        }

        queryConstraints.push(orderBy('dataHoraMovimento', 'desc'));
        console.log("DEBUG(listarLogGeralInventario): Adicionando 'orderBy' para dataHoraMovimento (desc).");
        console.log("DEBUG(listarLogGeralInventario): Restrições de query final:", queryConstraints);

        const q = query(logRef, ...queryConstraints);
        console.log("DEBUG(listarLogGeralInventario): Query Firebase construída:", q);

        console.log("DEBUG(listarLogGeralInventario): Executando getDocs no Firebase Firestore...");
        const querySnapshot = await getDocs(q);
        const logs = querySnapshot.docs.map(doc => doc.data());
        console.log(`DEBUG(listarLogGeralInventario): Query executada. ${logs.length} logs encontrados.`);
        // console.log("DEBUG(listarLogGeralInventario): Dados brutos dos logs:", logs); // Descomente para ver os dados completos

        if (logs.length === 0) {
            let noRecordsMessage = "Nenhum registro de movimentação encontrado.";
            if (currentLogFilterOperation !== 'all') {
                noRecordsMessage = `Nenhum registro de '${currentLogFilterOperation}' encontrado.`;
            }
            if (startDate || endDate) {
                const startStr = startDate ? formatDateToDisplay(startDate.toDate()) : '';
                const endStr = endDate ? formatDateToDisplay(endDate.toDate()) : '';
                noRecordsMessage += ` para o período ${startStr} - ${endStr}.`;
            }
            logTableBody.innerHTML = `<tr><td colspan="9">${noRecordsMessage}</td></tr>`;
            console.log(`DEBUG(listarLogGeralInventario): Exibindo mensagem de nenhum registro: "${noRecordsMessage}"`);
            return;
        }

        logTableBody.innerHTML = ''; // Limpa antes de preencher
        logs.forEach((log) => {
            const row = logTableBody.insertRow();
            // Verifica se log.dataHoraMovimento é um Timestamp do Firebase e o converte para Date
            const dataHoraObj = log.dataHoraMovimento instanceof Timestamp ? log.dataHoraMovimento.toDate() : (log.dataHoraMovimento ? new Date(log.dataHoraMovimento) : null);
            const dataHoraFormatada = dataHoraObj ? formatDateTimeToDisplay(dataHoraObj) : 'N/A';
            
            // console.log(`DEBUG(listarLogGeralInventario): Processando log:`, log); // Descomente para depurar linha a linha
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
        console.log("DEBUG(listarLogGeralInventario): Logs carregados e exibidos na tabela com sucesso.");

    } catch (error) {
        console.error("DEBUG(listarLogGeralInventario): Erro FATAL ao carregar log geral de inventário:", error);
        logTableBody.innerHTML = `<tr><td colspan="9">Erro ao carregar log: ${error.message}. Verifique o console.</td></tr>`;
        // Adiciona um alerta para o usuário ver o erro imediatamente
        alert(`Erro ao carregar logs: ${error.message}. Verifique o console para detalhes.`);
    }
}

// Seção 6: Função de Impressão do Relatório (imprimirRelatorioLogGeral)
async function imprimirRelatorioLogGeral() {
    console.log("DEBUG(imprimirRelatorioLogGeral): Iniciando geração de Relatório de Log Geral.");
    
    // Tenta obter o nome do operador. Se getOperadorNameFromInput() não existir ou retornar nulo, usa 'Desconhecido'.
    const operador = typeof getOperadorNameFromInput === 'function' ? (getOperadorNameFromInput() || 'Desconhecido') : 'Desconhecido';
    console.log(`DEBUG(imprimirRelatorioLogGeral): Operador para o relatório: "${operador}"`);

    const startDateInput = document.getElementById('filterStartDate')?.value;
    const endDateInput = document.getElementById('filterEndDate')?.value;

    console.log(`DEBUG(imprimirRelatorioLogGeral): Valores de input de data para relatório: Start="${startDateInput}", End="${endDateInput}"`);

    let startDate = null;
    let endDate = null;

    if (startDateInput) {
        try {
            startDate = Timestamp.fromDate(new Date(startDateInput + 'T00:00:00'));
        } catch (e) {
            console.error("DEBUG(imprimirRelatorioLogGeral): Erro ao parsear data inicial para relatório:", e);
            alert("Erro ao processar a data inicial para o relatório. Verifique o formato.");
            return;
        }
    }
    if (endDateInput) {
        try {
            endDate = Timestamp.fromDate(new Date(endDateInput + 'T23:59:59'));
        } catch (e) {
            console.error("DEBUG(imprimirRelatorioLogGeral): Erro ao parsear data final para relatório:", e);
            alert("Erro ao processar a data final para o relatório. Verifique o formato.");
            return;
        }
    }

    if (startDate && endDate && startDate.toDate() > endDate.toDate()) {
        alert("Erro: A 'Data Inicial' não pode ser posterior à 'Data Final' para o relatório.");
        console.warn("DEBUG(imprimirRelatorioLogGeral): Validação de data falhou para relatório: Data inicial > Data final.");
        return;
    }

    if (typeof db === 'undefined' || !db) {
        alert("Banco de dados não inicializado. Não é possível imprimir o relatório de log.");
        console.error("DEBUG(imprimirRelatorioLogGeral): Erro: Firestore DB não inicializado.");
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
        console.log("DEBUG(imprimirRelatorioLogGeral): Query Firestore para relatório construída:", q);

        const querySnapshot = await getDocs(q);
        logsRelatorio = querySnapshot.docs.map(doc => doc.data());
        console.log(`DEBUG(imprimirRelatorioLogGeral): Logs carregados do Firestore para o relatório: ${logsRelatorio.length} logs.`);

    } catch (error) {
        console.error("DEBUG(imprimirRelatorioLogGeral): Erro ao carregar logs para o relatório de log:", error);
        alert("Erro ao carregar logs para o relatório de log. Verifique o console.");
        return;
    }

    if (logsRelatorio.length === 0) {
        let noRecordsMessage = "Não há registros de movimentação para o período e filtro selecionados para o relatório.";
        alert(noRecordsMessage);
        console.log("DEBUG(imprimirRelatorioLogGeral): Nenhum log encontrado para o relatório.");
        return;
    }

    // Acessa jsPDF via objeto global window
    const jsPDF = window.jspdf.jsPDF; 
    if (typeof jsPDF === 'undefined') {
        console.error("DEBUG(imprimirRelatorioLogGeral): jsPDF não está carregado. Verifique a importação do CDN no HTML.");
        alert("Erro: Biblioteca de PDF não carregada. Tente recarregar a página.");
        return;
    }

    const doc = new jsPDF();
    let currentY = 15;
    console.log("DEBUG(imprimirRelatorioLogGeral): jsPDF inicializado. Gerando cabeçalho do PDF.");

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
        dateRangeText = `Período: ${formatDateToDisplay(startDate.toDate())} a ${formatDateToDisplay(endDate.toDate())}`;
    } else if (startDate) {
        dateRangeText = `A partir de: ${formatDateToDisplay(startDate.toDate())}`;
    } else if (endDate) {
        dateRangeText = `Até: ${formatDateToDisplay(endDate.toDate())}`;
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
    console.log("DEBUG(imprimirRelatorioLogGeral): Título do PDF gerado.");

    // Conteúdo: Logs do Inventário
    currentY = gerarConteudoTabelaLogPdf(doc, currentY, logsRelatorio, operador); // Passar operador para repetição de cabeçalho

    // Rodapé do PDF
    gerarRodapePdf(doc, operador);

    console.log("DEBUG(imprimirRelatorioLogGeral): Geração do relatório concluída. Tentando abrir o PDF.");
    try {
        doc.output('dataurlnewwindow', { filename: `Relatorio_Log_Inventario_${formatDateToDisplay(new Date()).replace(/\//g, '-')}.pdf` });
        console.log("DEBUG(imprimirRelatorioLogGeral): Chamada doc.output() bem-sucedida.");
        alert(`Relatório de Log de Inventário gerado com sucesso por ${operador}! Verifique a nova aba para visualizar e imprimir.`);
    } catch (outputError) {
        console.error("DEBUG(imprimirRelatorioLogGeral): Erro ao gerar ou abrir o PDF (doc.output):", outputError);
        alert("Erro ao gerar ou exibir o PDF. Verifique o console para detalhes.");
    }

    console.log("DEBUG(imprimirRelatorioLogGeral): Geração de relatório de log geral concluída.");
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
    // Margem esquerda real para as colunas
    const startX = 10; 
    // Larguras das colunas (somam aproximadamente 170-175 para caber bem na página A4, considerando startX e margem direita)
    // [Cód, Desc, Op, QtdMov, QtdAnt, QtdDep, Operador, DataHora, Obs]
    const colWidths = [12, 36, 16, 10, 10, 10, 16, 26, 34]; // Ajustado para somar 178 (com startX=10, termina em 188. Max é 200-10=190)
    const lineHeight = 4.5; // Altura de cada linha de texto dentro de uma célula (ajustado para melhor espaçamento)
    const paddingY = 2; // Espaço vertical entre a linha inferior do texto e a linha separadora da próxima linha/borda da célula
    
    // Calcular as posições X de início de cada coluna
    const colPositions = [];
    let currentX = startX;
    colWidths.forEach(width => {
        colPositions.push(currentX);
        currentX += width;
    });

    // Títulos das colunas
    doc.setFont(undefined, 'bold');
    // Para garantir que os títulos não sobreponham, passamos a largura máxima disponível para splitTextToSize
    // e desenhamos o texto resultante.
    doc.text(doc.splitTextToSize("CÓD. ITEM", colWidths[0] - 2), colPositions[0], currentY);
    doc.text(doc.splitTextToSize("DESCRIÇÃO ITEM", colWidths[1] - 2), colPositions[1], currentY);
    doc.text(doc.splitTextToSize("OPERAÇÃO", colWidths[2] - 2), colPositions[2], currentY);
    doc.text(doc.splitTextToSize("QTD. MOV.", colWidths[3] - 2), colPositions[3], currentY);
    doc.text(doc.splitTextToSize("QTD. ANT.", colWidths[4] - 2), colPositions[4], currentY);
    doc.text(doc.splitTextToSize("QTD. DEP.", colWidths[5] - 2), colPositions[5], currentY);
    doc.text(doc.splitTextToSize("OPERADOR", colWidths[6] - 2), colPositions[6], currentY);
    doc.text(doc.splitTextToSize("DATA E HORA", colWidths[7] - 2), colPositions[7], currentY);
    doc.text(doc.splitTextToSize("OBSERVAÇÕES", colWidths[8] - 2), colPositions[8], currentY);

    currentY += (doc.splitTextToSize("DATA E HORA", colWidths[7] - 2).length * lineHeight) + 2; // Altura máxima dos títulos + padding
    doc.setFont(undefined, 'normal');

    logs.forEach((log, index) => {
        // Altura limite da página antes de adicionar uma nova
        const pageHeightLimit = 280; // Margem inferior para o rodapé
        
        // CUIDADO: currentY já inclui a altura da linha anterior + padding.
        // Se currentY + altura da próxima linha (pelo menos 1 linha + padding) for maior que o limite, adicione uma nova página.
        if (currentY + lineHeight + paddingY > pageHeightLimit) { 
            doc.addPage();
            currentY = 15; // Reset Y para a nova página

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
            doc.text(doc.splitTextToSize("CÓD. ITEM", colWidths[0] - 2), colPositions[0], currentY);
            doc.text(doc.splitTextToSize("DESCRIÇÃO ITEM", colWidths[1] - 2), colPositions[1], currentY);
            doc.text(doc.splitTextToSize("OPERAÇÃO", colWidths[2] - 2), colPositions[2], currentY);
            doc.text(doc.splitTextToSize("QTD. MOV.", colWidths[3] - 2), colPositions[3], currentY);
            doc.text(doc.splitTextToSize("QTD. ANT.", colWidths[4] - 2), colPositions[4], currentY);
            doc.text(doc.splitTextToSize("QTD. DEP.", colWidths[5] - 2), colPositions[5], currentY);
            doc.text(doc.splitTextToSize("OPERADOR", colWidths[6] - 2), colPositions[6], currentY);
            doc.text(doc.splitTextToSize("DATA E HORA", colWidths[7] - 2), colPositions[7], currentY);
            doc.text(doc.splitTextToSize("OBSERVAÇÕES", colWidths[8] - 2), colPositions[8], currentY);
            currentY += (doc.splitTextToSize("DATA E HORA", colWidths[7] - 2).length * lineHeight) + 2; // Altura máxima dos títulos + padding
            doc.setFont(undefined, 'normal');
        }

        let initialY = currentY; // Y de início para o conteúdo da linha atual
        let rowMaxHeight = 0; // Altura máxima que esta linha ocupará

        // Converte o Timestamp do Firebase para um objeto Date antes de formatar
        const dataHoraObj = log.dataHoraMovimento instanceof Timestamp ? log.dataHoraMovimento.toDate() : (log.dataHoraMovimento ? new Date(log.dataHoraMovimento) : null);
        const dataHoraFormatada = dataHoraObj ? formatDateTimeToDisplay(dataHoraObj) : 'N/A';

        // Conteúdo de cada célula (prepare para quebra de linha)
        const cellContents = {
            itemCod: log.itemCod || 'N/A',
            itemNome: doc.splitTextToSize(log.itemNome || 'N/A', colWidths[1] - 2), // Descrição, potencialmente multi-linha
            tipoMovimento: log.tipoMovimento || 'N/A',
            quantidadeMovimentada: log.quantidadeMovimentada !== undefined ? `${log.quantidadeMovimentada.toString()} ${log.unidadeMedidaLog || ''}` : 'N/A',
            quantidadeAntes: log.quantidadeAntes !== undefined ? log.quantidadeAntes.toString() : 'N/A',
            quantidadeDepois: log.quantidadeDepois !== undefined ? log.quantidadeDepois.toString() : 'N/A',
            operador: doc.splitTextToSize(log.operador || 'Desconhecido', colWidths[6] - 2), // Operador, potencialmente multi-linha
            dataHora: doc.splitTextToSize(dataHoraFormatada, colWidths[7] - 2), // Data e Hora, potencialmente multi-linha
            observacoes: doc.splitTextToSize(log.observacoesMovimento || '', colWidths[8] - 2), // Observações, potencialmente multi-linha
        };

        // Calcule a altura máxima da linha com base no conteúdo de várias linhas
        rowMaxHeight = Math.max(
            (Array.isArray(cellContents.itemNome) ? cellContents.itemNome.length * lineHeight : lineHeight),
            (Array.isArray(cellContents.operador) ? cellContents.operador.length * lineHeight : lineHeight),
            (Array.isArray(cellContents.dataHora) ? cellContents.dataHora.length * lineHeight : lineHeight),
            (Array.isArray(cellContents.observacoes) ? cellContents.observacoes.length * lineHeight : lineHeight),
            lineHeight // Garante uma altura mínima para linha única
        );

        // Desenhar o conteúdo de cada célula
        doc.text(cellContents.itemCod, colPositions[0], initialY);
        doc.text(cellContents.itemNome, colPositions[1], initialY);
        doc.text(cellContents.tipoMovimento, colPositions[2], initialY);
        doc.text(cellContents.quantidadeMovimentada, colPositions[3], initialY);
        doc.text(cellContents.quantidadeAntes, colPositions[4], initialY);
        doc.text(cellContents.quantidadeDepois, colPositions[5], initialY);
        doc.text(cellContents.operador, colPositions[6], initialY);
        doc.text(cellContents.dataHora, colPositions[7], initialY);
        doc.text(cellContents.observacoes, colPositions[8], initialY);
        
        currentY = initialY + rowMaxHeight + paddingY; // Avança o Y para a próxima linha

        // Desenha linha separadora (exceto para o último item)
        if (index < logs.length - 1) {
            doc.setLineWidth(0.1);
            doc.line(colPositions[0], currentY, currentX, currentY); // Desenha a linha até o final da última coluna
            currentY += 2; // Pequeno espaço extra após a linha para o próximo item
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

// Seção 10: Validações e Utilities para Relatórios
// Funções utilitárias como getOperadorNameFromInput, formatDateTimeToDisplay, formatDateToDisplay
// são importadas de sislab_utils.js. Certifique-se de que sislab_utils.js está acessível e correto.

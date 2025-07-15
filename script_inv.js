// VERSÃO: 1.0.1 (script_inv.js)
// CHANGELOG:
// - Adicionado: Elementos de depuração (console.log) para rastrear o fluxo e valores dos filtros.
// - Adicionado: Função para atualizar um elemento HTML de depuração com o status atual do filtro.

// Importa as funções do SDK do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, where } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Importa a função de formatação de data de sislab_utils.js
import { formatDateTimeToDisplay } from './sislab_utils.js';

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

// Variável de estado para o filtro de operação
let currentLogFilterOperation = 'all'; // 'all' para todas as operações por padrão

// Função para atualizar o elemento de depuração no HTML
function updateDebugFilterStatus(status) {
    const debugElement = document.getElementById('debug-filter-status');
    if (debugElement) {
        debugElement.textContent = `Status do Filtro Atual: ${status}`;
    }
}

// Função principal para carregar e exibir o log
document.addEventListener('DOMContentLoaded', () => {
    console.log("DEBUG(script_inv.js): DOMContentLoaded - Iniciando setup da página de Log de Inventário.");

    // Vincula o event listener do filtro
    document.getElementById('filterOperationType').addEventListener('change', (event) => {
        currentLogFilterOperation = event.target.value;
        console.log(`DEBUG(script_inv.js): Filtro alterado para: "${currentLogFilterOperation}"`);
        updateDebugFilterStatus(currentLogFilterOperation); // Atualiza o status no HTML
        listarLogGeralInventario(); // Recarrega a tabela com o novo filtro
    });

    updateDebugFilterStatus(currentLogFilterOperation); // Define o status inicial no HTML
    listarLogGeralInventario(); // Carrega o log inicialmente
});

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

        // Constrói a query com base no filtro de operação
        if (currentLogFilterOperation === 'all') {
            q = query(logRef, orderBy('dataHoraMovimento', 'desc'));
            console.log("DEBUG(LogGeral): Query definida para 'Todas as Operações'.");
        } else {
            q = query(logRef, where('tipoMovimento', '==', currentLogFilterOperation), orderBy('dataHoraMovimento', 'desc'));
            console.log(`DEBUG(LogGeral): Query definida para filtro de tipo de movimento: "${currentLogFilterOperation}"`);
        }
        
        console.log("DEBUG(LogGeral): Executando query no Firebase Firestore...");
        const querySnapshot = await getDocs(q);
        const logs = querySnapshot.docs.map(doc => doc.data());
        console.log(`DEBUG(LogGeral): Query executada. ${logs.length} logs encontrados.`);

        if (logs.length === 0) {
            let noRecordsMessage = "Nenhum registro de movimentação encontrado.";
            if (currentLogFilterOperation !== 'all') {
                noRecordsMessage = `Nenhum registro de '${currentLogFilterOperation}' encontrado.`;
            }
            logTableBody.innerHTML = `<tr><td colspan="9">${noRecordsMessage}</td></tr>`;
            console.log(`DEBUG(LogGeral): Exibindo mensagem de nenhum registro: "${noRecordsMessage}"`);
            return;
        }

        logTableBody.innerHTML = ''; // Limpa antes de preencher
        logs.forEach((log, index) => {
            // console.log(`DEBUG(LogGeral): Processando log #${index}:`, log); // Pode ser muito verboso, descomente se necessário
            const row = logTableBody.insertRow();
            // Usando a função formatDateTimeToDisplay importada
            const dataHoraFormatada = log.dataHoraMovimento ? formatDateTimeToDisplay(log.dataHoraMovimento.toDate()) : 'N/A'; 

            row.insertCell(0).textContent = log.itemCod || 'N/A';
            row.insertCell(1).textContent = log.itemNome || 'N/A';
            row.insertCell(2).textContent = log.tipoMovimento || 'N/A';
            row.insertCell(3).textContent = log.quantidadeMovimentada !== undefined ? `${log.quantidadeMovimentada.toString()} ${log.unidadeMedidaLog || ''}` : 'N/A'; // Inclui unidade de medida
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

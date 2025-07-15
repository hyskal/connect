// VERSÃO: 1.0.0 (script_inv.js)
// CHANGELOG:
// - Novo arquivo: Criado para centralizar funções específicas da página log_inventario.html.
// - Movido: Toda a lógica de inicialização do Firebase e manipulação do log de inventário foi movida de log_inventario.html para este arquivo.
// - Importações: As dependências do Firebase SDK e de sislab_utils.js são agora gerenciadas aqui.

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

// Função principal para carregar e exibir o log
document.addEventListener('DOMContentLoaded', () => {
    // Vincula o event listener do filtro
    document.getElementById('filterOperationType').addEventListener('change', (event) => {
        currentLogFilterOperation = event.target.value;
        listarLogGeralInventario(); // Recarrega a tabela com o novo filtro
    });

    listarLogGeralInventario(); // Carrega o log inicialmente
});

async function listarLogGeralInventario() {
    const logTableBody = document.querySelector('#inventoryLogTable tbody');
    logTableBody.innerHTML = '<tr><td colspan="9">Carregando logs...</td></tr>';

    if (typeof db === 'undefined' || !db) {
        console.error("DEBUG(LogGeral): Banco de dados não inicializado.");
        logTableBody.innerHTML = '<tr><td colspan="9">Banco de dados não inicializado.</td></tr>';
        return;
    }

    try {
        const logRef = collection(db, 'log_inventario_v3');
        let q;

        // Constrói a query com base no filtro de operação
        if (currentLogFilterOperation === 'all') {
            q = query(logRef, orderBy('dataHoraMovimento', 'desc'));
        } else {
            q = query(logRef, where('tipoMovimento', '==', currentLogFilterOperation), orderBy('dataHoraMovimento', 'desc'));
        }

        const querySnapshot = await getDocs(q);
        const logs = querySnapshot.docs.map(doc => doc.data());

        if (logs.length === 0) {
            let noRecordsMessage = "Nenhum registro de movimentação encontrado.";
            if (currentLogFilterOperation !== 'all') {
                noRecordsMessage = `Nenhum registro de '${currentLogFilterOperation}' encontrado.`;
            }
            logTableBody.innerHTML = `<tr><td colspan="9">${noRecordsMessage}</td></tr>`;
            return;
        }

        logTableBody.innerHTML = ''; // Limpa antes de preencher
        logs.forEach(log => {
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

    } catch (error) {
        console.error("DEBUG(LogGeral): Erro ao carregar log geral de inventário:", error);
        logTableBody.innerHTML = '<tr><td colspan="9">Erro ao carregar log. Verifique o console.</td></tr>';
    }
}

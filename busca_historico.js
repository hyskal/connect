// busca_historico.js

// Importa as funções Firebase e utilitárias que são globalizadas em index.html
// e importadas por outros scripts.
import { formatDateTimeToDisplay } from './sislab_utils.js';

let historySearchInput;
let historicoListUl;

document.addEventListener('DOMContentLoaded', () => {
    console.log("DEBUG(busca_historico): DOMContentLoaded - Iniciando setup da busca de histórico.");

    historySearchInput = document.getElementById('historySearchInput');
    historicoListUl = document.querySelector('#historico ul');

    if (historySearchInput && historicoListUl) {
        // Adiciona um listener para o evento 'input' para busca dinâmica
        historySearchInput.addEventListener('input', debounce(() => {
            performHistorySearch(historySearchInput.value.trim());
        }, 300)); // Debounce para evitar muitas buscas em digitações rápidas
        console.log("DEBUG(busca_historico): Event listener para 'historySearchInput' adicionado.");
    } else {
        console.warn("DEBUG(busca_historico): Elementos de busca de histórico não encontrados. Funcionalidade desabilitada.");
    }
});

// Função debounce para limitar a frequência de chamadas da função de busca
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

// Função principal para realizar a busca no histórico
async function performHistorySearch(searchTerm) {
    console.log(`DEBUG(busca_historico): Realizando busca para termo: "${searchTerm}"`);

    historicoListUl.innerHTML = "<p style='padding: 10px;'>Buscando no histórico...</p>"; // Feedback de carregamento

    if (!window.firestoreDb) {
        historicoListUl.innerHTML = "<p style='padding: 10px; color: #CC3333;'>Erro: Banco de dados não inicializado.</p>";
        console.error("DEBUG(busca_historico): Firestore DB não inicializado ou disponível.");
        return;
    }

    try {
        const historicoRef = window.firebaseFirestoreCollection(window.firestoreDb, 'historico');
        let queryConstraints = [];
        let filteredCadastros = [];

        // Verifica se o termo de busca corresponde a um protocolo ou CPF
        const isProtocol = /^\d{4}-\d{8}$/.test(searchTerm); // Ex: 0001-15301707
        // CPF pode vir formatado ou apenas com dígitos
        const isCpf = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(searchTerm) || /^\d{11}$/.test(searchTerm.replace(/\D/g, ''));
        
        if (searchTerm === '') {
            // Se o campo de busca estiver vazio, recarrega todo o histórico
            // Chama a função existente no script.js para garantir consistência
            if (typeof window.mostrarHistorico === 'function') {
                await window.mostrarHistorico();
                console.log("DEBUG(busca_historico): Campo de busca vazio, mostrando histórico completo via script.js.");
                return;
            } else {
                // Fallback caso mostrarHistorico não esteja disponível por algum motivo
                queryConstraints.push(window.firebaseFirestoreOrderBy('protocolo', 'desc'));
                console.warn("DEBUG(busca_historico): window.mostrarHistorico não encontrada. Carregando todo o histórico por conta própria.");
            }
        } else if (isProtocol) {
            console.log("DEBUG(busca_historico): Buscando por Protocolo exato.");
            queryConstraints.push(window.firebaseFirestoreWhere('protocolo', '==', searchTerm));
        } else if (isCpf) {
            const cpfLimpo = searchTerm.replace(/\D/g, ''); // Remove máscara para busca
            console.log(`DEBUG(busca_historico): Buscando por CPF exato (limpo): "${cpfLimpo}"`);
            queryConstraints.push(window.firebaseFirestoreWhere('cpf', '==', cpfLimpo));
        } else {
            // Busca por nome (parcial e case-insensitive)
            // Firebase não suporta diretamente 'contains' ou 'endsWith' em campos de texto.
            // A melhor abordagem é buscar tudo e filtrar em memória, ou usar queries de prefixo (startAt/endAt).
            // Para simplicidade e compatibilidade com o formato atual, faremos filtro em memória sobre um `getDocs` ordenado.
            console.log("DEBUG(busca_historico): Buscando por Nome (filtro em memória).");
            queryConstraints.push(window.firebaseFirestoreOrderBy('nome', 'asc')); // Ordena por nome para otimizar busca/filtro
        }

        const q = window.firebaseFirestoreQuery(historicoRef, ...queryConstraints);
        const querySnapshot = await window.firebaseFirestoreGetDocs(q);
        
        // Mapeia todos os documentos para o formato de dados que precisamos, incluindo o ID
        const rawCadastros = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`DEBUG(busca_historico): Total de registros brutos do Firestore: ${rawCadastros.length}`);

        if (!isProtocol && !isCpf && searchTerm !== '') {
            // Se a busca não foi exata (protocolo/CPF), aplica filtro de nome em memória
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            filteredCadastros = rawCadastros.filter(c => 
                c.nome && c.nome.toLowerCase().includes(lowerCaseSearchTerm)
            );
            // Se a busca é por nome, mas o CPF ou Protocolo foram digitados (parcialmente, não formatados),
            // tentamos incluir esses também na filtragem em memória.
            // Isso cobre casos onde o usuário digita "123.456" para buscar um CPF, mas não o formato completo.
            if (lowerCaseSearchTerm.length > 2) { // Evita filtragem muito ampla para termos curtos
                 filteredCadastros = filteredCadastros.concat(rawCadastros.filter(c => 
                    (c.cpf && c.cpf.replace(/\D/g, '').includes(lowerCaseSearchTerm)) ||
                    (c.protocolo && c.protocolo.toLowerCase().includes(lowerCaseSearchTerm))
                 )).filter((value, index, self) => // Remove duplicatas
                    index === self.findIndex((t) => (t.id === value.id))
                 );
            }
            // Ordena os resultados filtrados por nome
            filteredCadastros.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

        } else {
            // Para buscas exatas de protocolo/CPF ou quando o termo está vazio, os resultados da query já são os filtrados
            filteredCadastros = rawCadastros;
        }

        if (filteredCadastros.length === 0) {
            historicoListUl.innerHTML = `<p style='padding: 10px;'>Nenhum registro encontrado para "${searchTerm}".</p>`;
            console.log(`DEBUG(busca_historico): Nenhum registro encontrado para "${searchTerm}".`);
            // Garante que o checkbox "Selecionar Todos" seja desmarcado se não houver resultados
            if (typeof window.updateSelectAllMasterCheckbox === 'function') {
                window.updateSelectAllMasterCheckbox();
            }
            return;
        }

        // Renderiza os resultados filtrados
        let html = "";
        filteredCadastros.forEach((c) => {
            const protocoloDisplay = c.protocolo ? `Protocolo: ${c.protocolo}` : `ID: ${c.id}`;
            // Usa window.carregarCadastroFirebase para compatibilidade com o script.js
            html += `<li data-doc-id="${c.id}">
                        <input type="checkbox" class="history-checkbox" value="${c.id}">
                        <span class="protocol-info" onclick="window.carregarCadastroFirebase('${c.id}')">
                            <b>${protocoloDisplay}</b> - ${c.nome} - CPF: ${c.cpf} - Idade: ${c.idade} - Exames: ${Array.isArray(c.exames) ? c.exames.join(", ") : 'N/D'}`;
            if (c.examesNaoListados) {
                html += `<br>Adicionais: ${c.examesNaoListados.substring(0, 50)}${c.examesNaoListados.length > 50 ? '...' : ''}`;
            }
            if (c.observacoes) {
                html += `<br>Observações: ${c.observacoes.substring(0, 100)}${c.observacoes.length > 100 ? '...' : ''}`;
            }
            html += `</span></li>`;
        });
        historicoListUl.innerHTML = html;
        console.log(`DEBUG(busca_historico): ${filteredCadastros.length} registros renderizados.`);

        // Atualiza o estado do checkbox "Selecionar Todos" após a renderização
        if (typeof window.updateSelectAllMasterCheckbox === 'function') {
            window.updateSelectAllMasterCheckbox();
        }

    } catch (error) {
        historicoListUl.innerHTML = `<p style='padding: 10px; color: #CC3333;'>Erro ao buscar histórico: ${error.message}.</p>`;
        console.error("DEBUG(busca_historico): Erro ao buscar histórico no Firebase:", error);
        alert(`Erro ao buscar histórico: ${error.message}. Verifique o console.`);
    }
}

// Helper para formatar CPF sem máscara (já existe em script.js, mas redefinindo para este módulo)
function formatarCPFParaBusca(cpfComMascara) {
    if (!cpfComMascara) return '';
    return cpfComMascara.replace(/\D/g, ''); // Remove todos os caracteres não-dígitos
}
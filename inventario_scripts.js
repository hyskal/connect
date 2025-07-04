<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>SISLAB - Controle de Inventário</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <style>
        /* Estilos Gerais */
        body {
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
            margin: 0;
            background-color: #E0E6EE;
        }
        .main-header-container {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 25px;
            gap: 15px;
            flex-wrap: wrap;
        }
        h1 {
            color: #1A2B4C;
            font-size: 2.5em;
            font-weight: bold;
            text-align: center;
            padding: 5px 15px;
            border-bottom: 3px solid #CC3333;
            display: inline-block;
            letter-spacing: 1.5px;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
            white-space: nowrap;
        }
        .main-content-container {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            width: 95%;
            max-width: 1400px; /* Aumentado para acomodar mais conteúdo */
            margin-bottom: 20px;
        }
        .column {
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.15);
            box-sizing: border-box;
            flex: 1;
            min-width: 300px;
            display: flex;
            flex-direction: column;
        }
        /* Ajustes para layout de 2 ou 3 colunas */
        .column.left, .column.right {
            flex-basis: calc(50% - 10px); /* Tenta duas colunas inicialmente */
        }
        /* Para telas maiores, a coluna de exibição pode ser maior */
        .column.right {
            flex-basis: calc(60% - 10px);
        }
        .form-row {
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-start;
            gap: 20px;
            margin-bottom: 15px;
            width: 100%;
        }
        .form-field {
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            flex-basis: 0;
            min-width: 150px;
        }
        .form-field.full-width {
            flex-basis: 100%;
        }
        .form-field label {
            font-weight: bold;
            margin-bottom: 5px;
            color: #334466;
        }
        .form-field input[type="text"],
        .form-field input[type="number"],
        .form-field select,
        .form-field textarea {
            padding: 10px;
            border: 1px solid #AABBDD;
            border-radius: 4px;
            font-size: 1em;
            width: 100%;
            box-sizing: border-box;
        }
        .error-message {
            color: #CC3333;
            font-size: 0.85em;
            margin-top: 5px;
        }
        .action-buttons-container {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            width: 95%;
            max-width: 1400px;
            margin-top: 20px;
            padding: 20px;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.15);
            box-sizing: border-box;
        }
        button {
            padding: 10px 20px;
            margin: 5px;
            border: none;
            border-radius: 5px;
            background-color: #1A2B4C;
            color: white;
            cursor: pointer;
            font-size: 1em;
            transition: background-color 0.3s ease;
        }
        button:hover {
            background-color: #0F1D33;
        }
        button.highlight-button {
            background-color: #28a745; /* Verde para salvar/adicionar */
            font-weight: bold;
            padding: 12px 25px;
        }
        button.highlight-button:hover {
            background-color: #218838;
        }
        button.danger-button {
            background-color: #dc3545; /* Vermelho para excluir */
        }
        button.danger-button:hover {
            background-color: #c82333;
        }
        #inventoryList {
            margin-top: 20px;
            width: 100%;
            border-collapse: collapse;
        }
        #inventoryList th, #inventoryList td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        #inventoryList th {
            background-color: #f2f2f2;
            color: #333;
        }
        #inventoryList tr:nth-child(even){background-color: #f8f8f8;}
        #inventoryList tr:hover {background-color: #ddd;}

        .edit-btn, .delete-btn {
            padding: 5px 10px;
            margin-right: 5px;
            font-size: 0.9em;
            border-radius: 3px;
        }
        .edit-btn { background-color: #007bff; }
        .edit-btn:hover { background-color: #0056b3; }
        .delete-btn { background-color: #dc3545; }
        .delete-btn:hover { background-color: #c82333; }

        #searchContainer {
            margin-bottom: 20px;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        #searchContainer input, #searchContainer select {
            flex: 1;
            min-width: 150px;
        }

        /* Responsive adjustments */
        @media (max-width: 1024px) {
            .column.left, .column.right {
                flex-basis: 100%; /* Empilha as colunas em telas médias */
            }
        }
        @media (max-width: 600px) {
            h1 {
                font-size: 1.8em;
                padding: 5px 10px;
            }
            .main-header-container {
                flex-direction: column;
                gap: 5px;
            }
            .column {
                padding: 20px;
            }
        }
    </style>
</head>
<body>

    <div class="main-header-container">
        <h1 class="main-title">SISLAB - Controle de Inventário</h1>
    </div>

    <div class="main-content-container">
        <div class="column left">
            <h3>Cadastro/Edição de Item:</h3>
            <form id="itemForm">
                <input type="hidden" id="itemId"> <div class="form-row">
                    <div class="form-field full-width">
                        <label for="nomeItem">Nome do Item:</label>
                        <input type="text" id="nomeItem" required>
                        <div id="nomeItem-error" class="error-message"></div>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-field">
                        <label for="sku">SKU/Código de Barras:</label>
                        <input type="text" id="sku">
                    </div>
                    <div class="form-field">
                        <label for="quantidade">Quantidade:</label>
                        <input type="number" id="quantidade" min="0" value="0" required>
                        <div id="quantidade-error" class="error-message"></div>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-field">
                        <label for="unidadeMedida">Unidade de Medida:</label>
                        <input type="text" id="unidadeMedida" placeholder="Ex: und, kg, L">
                    </div>
                    <div class="form-field">
                        <label for="localizacao">Localização:</label>
                        <input type="text" id="localizacao" placeholder="Ex: Prateleira A1, Armário 2">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-field">
                        <label for="precoCusto">Preço de Custo (R$):</label>
                        <input type="number" id="precoCusto" step="0.01" min="0" value="0">
                    </div>
                    <div class="form-field">
                        <label for="precoVenda">Preço de Venda (R$):</label>
                        <input type="number" id="precoVenda" step="0.01" min="0" value="0">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-field full-width">
                        <label for="fornecedor">Fornecedor:</label>
                        <input type="text" id="fornecedor">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-field full-width">
                        <label for="categoria">Categoria:</label>
                        <select id="categoria" required>
                            <option value="">Selecione uma Categoria</option>
                            </select>
                        <div id="categoria-error" class="error-message"></div>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-field full-width">
                        <label for="descricao">Descrição:</label>
                        <textarea id="descricao" rows="3"></textarea>
                    </div>
                </div>

                <button type="submit" class="highlight-button">Salvar Item</button>
                <button type="button" onclick="limparFormulario()">Limpar Formulário</button>
            </form>
        </div>

        <div class="column right">
            <h3>Itens em Estoque:</h3>
            <div id="searchContainer">
                <input type="text" id="searchItem" placeholder="Pesquisar por nome, SKU, etc.">
                <select id="filterCategory">
                    <option value="">Todas as Categorias</option>
                    </select>
                <button onclick="carregarItensInventario()">Aplicar Filtros</button>
            </div>
            
            <table id="inventoryList">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>SKU</th>
                        <th>Categoria</th>
                        <th>Qtd</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td colspan="5">Nenhum item em estoque.</td></tr>
                </tbody>
            </table>
            </div>
    </div>

    <div class="action-buttons-container">
        <button onclick="window.location.href='admin.html'">Acessar Painel Admin</button>
        <button onclick="gerarRelatorioInventario()">Gerar Relatório de Inventário (PDF)</button>
        <button onclick="abrirModalMovimentacao('entrada')">Registrar Entrada</button>
        <button onclick="abrirModalMovimentacao('saida')">Registrar Saída</button>
    </div>

    <div id="movimentacaoModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); justify-content:center; align-items:center;">
        <div style="background:white; padding:20px; border-radius:8px; width:400px;">
            <h3 id="modalTitle">Registrar Movimentação</h3>
            <div class="form-row">
                <div class="form-field full-width">
                    <label for="movItemNome">Item:</label>
                    <input type="text" id="movItemNome" readonly>
                    <input type="hidden" id="movItemId">
                </div>
            </div>
            <div class="form-row">
                <div class="form-field">
                    <label for="movQuantidade">Quantidade:</label>
                    <input type="number" id="movQuantidade" min="1" required>
                </div>
                <div class="form-field">
                    <label for="movTipo">Tipo:</label>
                    <select id="movTipo" disabled>
                        <option value="entrada">Entrada</option>
                        <option value="saida">Saída</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-field full-width">
                    <label for="movObservacoes">Observações:</label>
                    <textarea id="movObservacoes" rows="2"></textarea>
                </div>
            </div>
            <button onclick="salvarMovimentacao()">Salvar Movimentação</button>
            <button onclick="fecharModalMovimentacao()">Cancelar</button>
        </div>
    </div>


    <script type="module">
        // Configuração do Firebase
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
        import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, deleteDoc, doc, updateDoc, writeBatch, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

        // Sua configuração do Firebase (a ser reconfigurada depois, como você mencionou)
        const firebaseConfig = {
            apiKey: "SEU_API_KEY", // Substitua pelo seu API Key
            authDomain: "SEU_AUTH_DOMAIN",
            projectId: "SEU_PROJECT_ID",
            storageBucket: "SEU_STORAGE_BUCKET",
            messagingSenderId: "SEU_MESSAGING_SENDER_ID",
            appId: "SEU_APP_ID"
        };

        // Inicializa o Firebase
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        // Torna as funções do Firebase globalmente acessíveis para inventario_scripts.js
        window.firestoreDb = db;
        window.firebaseFirestoreCollection = collection;
        window.firebaseFirestoreAddDoc = addDoc;
        window.firebaseFirestoreGetDocs = getDocs;
        window.firebaseFirestoreQuery = query;
        window.firebaseFirestoreOrderBy = orderBy;
        window.firebaseFirestoreLimit = limit;
        window.firebaseFirestoreDeleteDoc = deleteDoc;
        window.firebaseFirestoreDoc = doc;
        window.firebaseFirestoreUpdateDoc = updateDoc;
        window.firebaseFirestoreWriteBatch = writeBatch;
        window.firebaseFirestoreWhere = where;
        window.firebaseFirestoreServerTimestamp = serverTimestamp;

    </script>
    <script src="inventario_scripts.js"></script>

</body>
</html>

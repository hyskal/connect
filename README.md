SISLAB: Sistema de Gestão Laboratorial (CETEP/LNAB)
O SISLAB é um sistema web modularizado, projetado para otimizar os processos de gestão em um laboratório de análises clínicas. Ele abrange desde o cadastro de pacientes e requisição de exames até o controle detalhado do inventário de suprimentos, tudo isso integrado a um robusto backend-as-a-service para persistência de dados.

1. Visão Geral do Sistema (Arquitetura e Módulos Principais)
O sistema é estruturado em módulos independentes, cada um com sua interface e responsabilidades específicas, interligados para garantir um fluxo de trabalho eficiente.

Módulo de Cadastro de Exames (index.html)
Propósito: Interface principal para o atendimento ao paciente.

Funcionalidades:

Registro completo de dados demográficos do paciente (nome, CPF, data de nascimento, sexo, contato, endereço).

Validação de CPF e contato (DDD) para garantir a integridade dos dados.

Cálculo automático e exibição da idade do paciente com base na data de nascimento.

Verificação de CPF no histórico (historico collection no Firestore) com opção de carregar dados básicos de pacientes recorrentes.

Seleção de exames de uma lista pesquisável pré-definida, carregada dinamicamente de um GitHub Gist (exames.txt) ou arquivo local.

Possibilidade de adicionar exames não listados (textos livres).

Geração e visualização instantânea de um Protocolo de Atendimento em formato PDF, com detalhes do paciente e exames solicitados.

Impressão do histórico completo de cadastros.

Geração de pacientes fictícios para testes (carregados de pacientes_aleatorios.json).

Persistência: Os protocolos de atendimento são salvos na coleção historico do Firebase Firestore.

Módulo de Controle de Inventário (inventario.html)
Propósito: Gerenciamento e rastreamento do estoque de suprimentos e materiais do laboratório.

Funcionalidades:

Cadastro e Edição de Itens: Registro de novos itens ou atualização de existentes, incluindo código (sequencial, gerado automaticamente), descrição, quantidade, unidade de medida, categoria, localização, data de vencimento e observações.

Visualização e Filtros: Exibição da lista de itens com opções de pesquisa (por código ou descrição), filtro por categoria e por status de estoque (Todos, Críticos, Com Estoque, Sem Estoque). Os status críticos são definidos por uma "Qtd. Crítica" configurável.

Movimentação Rápida: Botões + e - diretamente na tabela para ajustes rápidos de quantidade, registrando a entrada/saída.

Ações por Item: Botões para Editar, Ver Log (de um item específico) e Remover um item.

Relatórios: Geração de um Relatório de Estoque Atual em PDF, detalhando todos os itens presentes.

Persistência: Itens são armazenados na coleção inventario_v3 do Firestore. Todas as movimentações geram um registro na coleção log_inventario_v3.

Acesso Controlado: As operações de inventário exigem um Nome do Operador (campo na página) para registrar quem realizou a ação.

Módulo de Log Geral de Inventário (log_inventario.html)
Propósito: Fornecer um registro histórico e auditável de todas as movimentações de inventário.

Funcionalidades:

Exibição detalhada de cada registro de log em uma tabela.

Filtros por Operação: Permite visualizar logs de CADASTRO, ENTRADA, SAIDA, REMOCAO, AJUSTE ou Todos.

Filtro por Período: Filtra logs por data inicial e data final. Um botão "Limpar Período" reseta esses filtros.

Ordenação: Opção para ordenar os logs por Data e Hora (decrescente, padrão) ou por Nome do Item (alfabética A-Z).

Geração de um Relatório de Log de Inventário em PDF, aplicando os filtros e ordenação visíveis na tela.

Persistência: Consulta dados exclusivamente da coleção log_inventario_v3 no Firestore.

Módulo Administrativo (admin.html)
Propósito: Área com ferramentas de gerenciamento de alto nível.

Funcionalidades:

Acesso direto ao Log Geral de Inventário.

Limpar TODO o Histórico do Firebase: Ação irreversível que apaga todos os dados de pacientes e logs do Firestore. Protegida por uma senha dinâmica gerada pela hora e minuto atuais.

Gerar Novo Paciente Aleatório: Abre a página de cadastro de exames com dados preenchidos de um paciente fictício.

2. Tecnologias Utilizadas
Frontend:

HTML5, CSS3, JavaScript (ES6+): Base de desenvolvimento web.

Backend as a Service (BaaS):

Firebase Firestore: Banco de dados NoSQL escalável e flexível. Utilizado para todas as operações de leitura/escrita e armazenamento de dados.

GitHub Gist: Usado como um backend simples para armazenar listas estáticas (exames, categorias de inventário), facilitando atualizações.

Geração de Documentos:

jsPDF: Biblioteca JavaScript para criar e manipular arquivos PDF diretamente no navegador do cliente.

3. Módulos JavaScript e Responsabilidades
A lógica do sistema é dividida em arquivos JavaScript, carregados como módulos ES6 para melhor organização e evitar poluição do escopo global.

script.js: (Versão: 2.0.9a) Controla a página de cadastro de exames (index.html), incluindo formulário de paciente, histórico de CPF, e interação com a Gist de exames.

inventario_scripts.js: (Versão: 3.0.9) Lógica principal do controle de inventário (inventario.html), responsável por listar, filtrar, adicionar, editar, remover itens, e gerar relatórios de estoque.

script_inv.js: (Versão: 1.0.11) Dedicado à página de log de inventário (log_inventario.html), gerenciando filtros por operação e data, ordenação, e a geração do relatório de log.

sislab_utils.js: (Versão: 1.0.2) Contém funções utilitárias compartilhadas entre os scripts, como formatação de datas (formatDateTimeToDisplay, formatDateToDisplay), tratamento de erros de UI (showError), e obtenção do nome do operador (getOperadorNameFromInput).

Outros arquivos como script-v1.js, index-v1.html representam versões anteriores ou alternativas do desenvolvimento.

pacientes_aleatorios.json e categorias_inventario.txt, lista-de-exames.txt são arquivos de dados estáticos para funcionalidades específicas.

4. Integração com Firebase
A integração com o Firebase Firestore é o coração da persistência de dados no SISLAB.

Inicialização: As credenciais e o aplicativo Firebase são inicializados em blocos <script type="module"> dentro de cada HTML principal (index.html, inventario.html, log_inventario.html).

Acesso Global: As instâncias do db (Firestore) e as funções do SDK do Firestore (collection, addDoc, getDocs, query, orderBy, where, Timestamp, runTransaction, etc.) são expostas ao escopo global (window.firestoreDb, window.firebaseFirestoreCollection, etc.) para serem facilmente acessíveis pelos scripts da aplicação.

Coleções de Dados:

historico: Armazena os dados dos pacientes e seus protocolos de atendimento.

inventario_v3: Contém os detalhes de cada item no estoque.

log_inventario_v3: É a coleção auditável que registra cada alteração de estoque (adições, remoções, ajustes, entradas, saídas).

config_v3: Usada para gerenciar contadores, como o código sequencial de novos itens de inventário.

Queries e Índices:

Fundamental: Para consultas que combinam filtros (where()) e ordenações (orderBy()) em múltiplos campos (ou mesmo apenas um campo com filtros de range e orderBy), o Firebase exige a criação de índices compostos no seu banco de dados.

Erro Comum: A ausência de um índice necessário resultará em um FirebaseError: The query requires an index no console do navegador, fornecendo um link direto para criar o índice no Console do Firebase. É crucial criar esses índices para que as funcionalidades de filtragem e ordenação funcionem corretamente.

Exemplos de Queries que Exigem Índices:

Filtrar por tipoMovimento e ordenar por dataHoraMovimento (decrescente ou crescente).

Filtrar por um período de dataHoraMovimento e ordenar por itemNome.

Filtrar por tipoMovimento E dataHoraMovimento (range) E itemNome.

Gerenciamento de Índices: Você pode gerenciar ou verificar a existência de seus índices na seção Firestore Indexes do seu projeto Firebase.

5. Dicas para Escrita de Código e Debug
console.log() Detalhado:

Utilize console.log() extensivamente para rastrear o fluxo de execução, valores de variáveis em pontos críticos, e resultados de chamadas a APIs (fetch, Firebase).

console.log("DEBUG: Início da função X");

console.log("DEBUG: Variável Y =", Y);

console.log("DEBUG: Query construída:", queryObjeto);

try...catch para Assincronicidade:

Sempre envolva chamadas a funções async/await e interações com o Firebase em blocos try...catch. Isso permite capturar erros de rede, de banco de dados ou de lógica, e fornecer feedback útil ao usuário (via alert) e informações detalhadas no console (console.error).

Validação Robusta de Elementos DOM:

Ao acessar elementos HTML com document.getElementById('ID_DO_ELEMENTO'), adicione verificações de existência (if (elemento) { ... }). Isso previne erros TypeError: Cannot read properties of null (reading 'value') em páginas onde um elemento específico pode não estar presente. A função getOperadorNameFromInput em sislab_utils.js foi ajustada para ser robusta nesse sentido.

Organização em Sessões/Blocos:

Mantenha a prática de dividir códigos HTML e JavaScript em sessões (Seção 1: ..., // Seção X: ...) com comentários claros. Isso melhora drasticamente a legibilidade, a manutenção e a localização de blocos de código específicos.

Consistência de CSS:

Para alinhar elementos complexos (como na coluna "Mov. Rápida"), prefira abordagens flexbox ou grid no CSS. Use display: flex, flex-direction, align-items e justify-content de forma consistente nos contêineres e seus filhos diretos.

Utilize margin: 0 auto; e display: block; para centralizar elementos de bloco com largura definida dentro de um contêiner text-align: center;.

Teste de Índices (Firebase):

Após implementar novas queries ou modificar ordenações/filtros, teste-as exaustivamente. Esteja preparado para criar novos índices compostos no Firebase, clicando nos links fornecidos nos erros do console.

Caminhos de Importação:

Verifique sempre os caminhos dos arquivos importados (import ... from './caminho/arquivo.js';) e os links de CDNs (<script src="...">) para garantir que os recursos estão sendo carregados corretamente. Erros aqui podem travar a execução do script.

// zoom_script.js

// Definição dos níveis de zoom pré-configurados
const ZOOM_LEVELS = {
    '1': 75,   // 75%
    '2': 85,   // 85%
    '3': 100,  // 100% (padrão)
    '4': 115,  // 115%
    '5': 130   // 130%
};

// Defina aqui qual nível de zoom será aplicado por padrão (escolha entre '1', '2', '3', '4', '5')
const DEFAULT_ZOOM_KEY = '2'; // Por padrão, inicia em 100%

// Função para aplicar o zoom à página
function applyPreconfiguredZoom() {
    const zoomPercentage = ZOOM_LEVELS[DEFAULT_ZOOM_KEY];

    if (zoomPercentage === undefined) {
        console.error(`zoom_script.js: Chave de zoom padrão (${DEFAULT_ZOOM_KEY}) inválida. Usando 100% como fallback.`);
        zoomPercentage = 100; // Fallback para 100% se a chave for inválida
    }

    const scaleFactor = zoomPercentage / 100;

    console.log(`zoom_script.js: Aplicando zoom de ${zoomPercentage}% (Escala: ${scaleFactor}).`);

    // Elementos que serão escalados
    const elementsToScale = [
        document.body, // Escala o corpo inteiro
        document.querySelector('.main-header-container'),
        document.querySelector('.zoom-display-container'), // O próprio display de zoom
        document.querySelector('.main-content-container'),
        document.querySelector('.action-buttons-container'),
        document.getElementById('historico'),
        document.getElementById('editorExames')
    ];

    elementsToScale.forEach(element => {
        if (element) {
            element.style.transform = `scale(${scaleFactor})`;
            // transform-origin: top center; já está no CSS para esses elementos via index.html style
        }
    });

    // Ajuste da largura do body para que o conteúdo escalado não cause barras de rolagem desnecessárias
    // Se o body é escalado, sua largura efetiva diminui em relação ao viewport.
    // Ajustar width para 100% / scaleFactor% faz com que ele ocupe o espaço original.
    // No entanto, é importante que o 'transform-origin' seja 'top center' no CSS para o body.
    if (document.body) {
        document.body.style.width = `${100 / scaleFactor * 100}%`; // Retorna a largura para a proporção original do viewport
        document.body.style.margin = `0 auto`; // Centraliza o body
    }


    // Atualiza o display do nível de zoom
    const zoomLevelDisplay = document.getElementById('zoomLevelDisplay');
    if (zoomLevelDisplay) {
        zoomLevelDisplay.textContent = `${zoomPercentage}%`;
        console.log(`zoom_script.js: Display de zoom atualizado para ${zoomPercentage}%.`);
    } else {
        console.warn('zoom_script.js: Elemento #zoomLevelDisplay não encontrado.');
    }
}

// Garante que o zoom seja aplicado após o DOM estar completamente carregado
document.addEventListener('DOMContentLoaded', applyPreconfiguredZoom);

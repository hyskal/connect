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
const DEFAULT_ZOOM_KEY = '3'; // Por padrão, inicia em 100%

// Função para aplicar o zoom à página
function applyPreconfiguredZoom() {
    let zoomPercentage = ZOOM_LEVELS[DEFAULT_ZOOM_KEY];

    if (zoomPercentage === undefined) {
        console.error(`zoom_script.js: Chave de zoom padrão (${DEFAULT_ZOOM_KEY}) inválida. Usando 100% como fallback.`);
        zoomPercentage = 100; // Fallback para 100% se a chave for inválida
    }

    const scaleFactor = zoomPercentage / 100;

    console.log(`zoom_script.js: Aplicando zoom de ${zoomPercentage}% (Escala: ${scaleFactor}).`);

    // Elementos que serão escalados
    // NOTA: document.body já é incluído no CSS com transform-origin e transition.
    // Aplicar transform em elementos filhos ajuda a manter o fluxo do documento.
    const elementsToScale = [
        document.querySelector('.main-header-container'),
        document.querySelector('.zoom-display-container'),
        document.querySelector('.main-content-container'),
        document.querySelector('.action-buttons-container'),
        document.getElementById('historico'),
        document.getElementById('editorExames')
    ];

    // Aplica o transform: scale() aos elementos filhos do body
    elementsToScale.forEach(element => {
        if (element) {
            element.style.transform = `scale(${scaleFactor})`;
        }
    });

    // Ajusta o body para o zoom principal
    // A largura do body é ajustada no CSS, e o 'transform: scale' aqui afetará o body como um todo.
    if (document.body) {
        document.body.style.transform = `scale(${scaleFactor})`;
        // A linha problemática document.body.style.width = ... FOI REMOVIDA
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

// exames_ref.js
// VERSÃO: 1.0.5 (exames_ref.js)
// CHANGELOG:
// - ATUALIZADO: Adicionado atributos 'defaultMethod' e 'methodOptions' para todos os exames.
// - CORREÇÃO: Padronizado o nome de "Hemograma Completo (HC)" e outros exames para corresponder aos dados de pacientes.
// - ADICIONADO: Novos atributos 'defaultMaterial' e 'materialOptions' para cada exame.
// - ADICIONADO: Novo atributo 'specificObservation' com textos baseados em laboratórios de referência para a maioria dos exames.

export const EXAM_DETAILS = {
    "Hemograma Completo": {
        defaultUnit: "N/A",
        referenceRange: { general: "Varia (Texto Livre)" },
        inputType: "text",
        defaultMaterial: "Sangue Total",
        materialOptions: ["Sangue Total"],
        defaultMethod: "Contador Automático",
        methodOptions: ["Contador Automático", "Microscopia"],
        specificObservation: "Este exame fornece uma avaliação completa das três principais linhagens de células do sangue: glóbulos vermelhos (eritrócitos), glóbulos brancos (leucócitos) e plaquetas. É fundamental para o diagnóstico e monitoramento de condições como anemias, infecções, inflamações e distúrbios de coagulação. A interpretação dos resultados deve sempre ser correlacionada com os índices hematimétricos e o quadro clínico do paciente."
    },
    "Hemograma Completo (HC)": {
        defaultUnit: "N/A",
        referenceRange: { general: "Varia (Texto Livre)" },
        inputType: "text",
        defaultMaterial: "Sangue Total",
        materialOptions: ["Sangue Total"],
        defaultMethod: "Contador Automático",
        methodOptions: ["Contador Automático", "Microscopia"],
        specificObservation: "Este exame fornece uma avaliação completa das três principais linhagens de células do sangue: glóbulos vermelhos (eritrócitos), glóbulos brancos (leucócitos) e plaquetas. É fundamental para o diagnóstico e monitoramento de condições como anemias, infecções, inflamações e distúrbios de coagulação. A interpretação dos resultados deve sempre ser correlacionada com os índices hematimétricos e o quadro clínico do paciente."
    },
    "Glicemia": {
        defaultUnit: "mg/dL",
        referenceRange: { general: "< 99 mg/dL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro", "Plasma (Fluoreto)"],
        defaultMethod: "Enzimático Colorimétrico",
        methodOptions: ["Enzimático Colorimétrico", "Hexoquinase"],
        specificObservation: "A dosagem da glicemia em jejum é um parâmetro essencial para o rastreamento, diagnóstico e monitoramento do diabetes mellitus. O resultado deve ser interpretado em conjunto com o histórico clínico do paciente e outros exames, como a hemoglobina glicada (HbA1c), para um diagnóstico preciso. A forma da curva glicêmica em testes de sobrecarga pode servir como um biomarcador para a disfunção de células beta."
    },
    "Colesterol Total": {
        defaultUnit: "mg/dL",
        referenceRange: { general: "< 190 mg/dL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro", "Plasma (EDTA)", "Plasma (Heparina)"],
        defaultMethod: "Enzimático Colorimétrico",
        methodOptions: ["Enzimático Colorimétrico"],
        specificObservation: "O colesterol total oferece uma visão geral dos níveis de colesterol, sendo um importante indicador do risco de doenças cardiovasculares. Valores acima de 240 mg/dL são considerados altos e podem necessitar de intervenção médica e mudanças significativas no estilo de vida. Este resultado deve ser avaliado em conjunto com as frações de HDL e LDL para uma análise mais completa do perfil lipídico do paciente."
    },
    "Colestetol Total e Frações": {
        defaultUnit: "mg/dL",
        referenceRange: { general: "< 190 mg/dL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro", "Plasma (EDTA)", "Plasma (Heparina)"],
        defaultMethod: "Enzimático Colorimétrico",
        methodOptions: ["Enzimático Colorimétrico"],
        specificObservation: "O exame de Colesterol Total e Frações avalia o perfil lipídico completo do paciente, incluindo HDL, LDL e VLDL. É um importante indicador do risco de doenças cardiovasculares. Valores alterados podem necessitar de intervenção médica e mudanças significativas no estilo de vida. O resultado deve ser analisado com cautela, levando em conta o histórico clínico e familiar do paciente."
    },
    "Triglicerídeos": {
        defaultUnit: "mg/dL",
        referenceRange: { general: "< 150 mg/dL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro", "Plasma (EDTA)"],
        defaultMethod: "Enzimático Colorimétrico",
        methodOptions: ["Enzimático Colorimétrico"],
        specificObservation: "A dosagem de triglicerídeos é essencial para a avaliação do risco cardiovascular. Valores elevados (hipertrigliceridemia) são um fator de risco independente e podem estar associados a condições como obesidade e esteatose hepática. É crucial considerar o estado de jejum no momento da coleta, pois os níveis de triglicerídeos sem jejum podem ser superiores e estão relacionados a um maior risco de eventos cardiovasculares."
    },
    "Ureia": {
        defaultUnit: "mg/dL",
        referenceRange: { general: "15 - 45 mg/dL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Cinético UV",
        methodOptions: ["Cinético UV", "Colorimétrico"],
        specificObservation: "A ureia é um produto do metabolismo proteico e é eliminada pelos rins. Níveis elevados podem ser um sinal de sobrecarga renal, desidratação, ou problemas na função renal, enquanto níveis baixos podem indicar disfunções hepáticas. Este exame é frequentemente solicitado em conjunto com a creatinina para uma avaliação mais abrangente da saúde renal do paciente."
    },
    "Ureia (BUN)": {
        defaultUnit: "mg/dL",
        referenceRange: { general: "15 - 45 mg/dL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Cinético UV",
        methodOptions: ["Cinético UV", "Colorimétrico"],
        specificObservation: "A ureia é um produto do metabolismo proteico e é eliminada pelos rins. Níveis elevados podem ser um sinal de sobrecarga renal, desidratação, ou problemas na função renal, enquanto níveis baixos podem indicar disfunções hepáticas. Este exame é frequentemente solicitado em conjunto com a creatinina para uma avaliação mais abrangente da saúde renal do paciente."
    },
    "Creatinina": {
        defaultUnit: "mg/dL",
        referenceRange: { male: "0.7 - 1.2 mg/dL", female: "0.5 - 0.9 mg/dL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro", "Urina"],
        defaultMethod: "Colorimétrico (Jaffe)",
        methodOptions: ["Colorimétrico (Jaffe)", "Enzimático"],
        specificObservation: "A creatinina é um produto do metabolismo muscular, filtrado e excretado pelos rins, o que a torna um indicador fundamental da função renal. Níveis séricos elevados podem indicar um comprometimento significativo da filtração renal, geralmente em torno de 40% a 50%. Variações podem sinalizar problemas renais crônicos ou agudos, necessitando de investigação médica especializada."
    },
    "Creatinina (Creat)": {
        defaultUnit: "mg/dL",
        referenceRange: { male: "0.7 - 1.2 mg/dL", female: "0.5 - 0.9 mg/dL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro", "Urina"],
        defaultMethod: "Colorimétrico (Jaffe)",
        methodOptions: ["Colorimétrico (Jaffe)", "Enzimático"],
        specificObservation: "A creatinina é um produto do metabolismo muscular, filtrado e excretado pelos rins, o que a torna um indicador fundamental da função renal. Níveis séricos elevados podem indicar um comprometimento significativo da filtração renal, geralmente em torno de 40% a 50%. Variações podem sinalizar problemas renais crônicos ou agudos, necessitando de investigação médica especializada."
    },
    "Exame de Urina": {
        defaultUnit: "N/A",
        referenceRange: { general: "Normal" },
        inputType: "select",
        options: ["Normal", "Anormal"],
        defaultMaterial: "Urina",
        materialOptions: ["Urina"],
        defaultMethod: "Análise Físico-química",
        methodOptions: ["Análise Físico-química", "Microscopia"],
        specificObservation: "O exame de urina tipo I é uma análise completa que avalia as características físicas, químicas e microscópicas da urina. Suas alterações podem fornecer pistas importantes sobre a saúde do trato urinário e de outros órgãos, como fígado e pâncreas. A presença de pigmentos, pH alterado ou células anormais pode sugerir infecções ou doenças renais."
    },
    "Urina Tipo I (EAS)": {
        defaultUnit: "N/A",
        referenceRange: { general: "Normal" },
        inputType: "select",
        options: ["Normal", "Anormal"],
        defaultMaterial: "Urina",
        materialOptions: ["Urina"],
        defaultMethod: "Análise Físico-química",
        methodOptions: ["Análise Físico-química", "Microscopia"],
        specificObservation: "O exame de urina tipo I é uma análise completa que avalia as características físicas, químicas e microscópicas da urina. Suas alterações podem fornecer pistas importantes sobre a saúde do trato urinário e de outros órgãos, como fígado e pâncreas. A presença de pigmentos, pH alterado ou células anormais pode sugerir infecções ou doenças renais."
    },
    "Sumário de Urina": {
        defaultUnit: "N/A",
        referenceRange: { general: "Normal" },
        inputType: "select",
        options: ["Normal", "Anormal"],
        defaultMaterial: "Urina",
        materialOptions: ["Urina"],
        defaultMethod: "Análise Físico-química",
        methodOptions: ["Análise Físico-química", "Microscopia"],
        specificObservation: "O exame de urina tipo I é uma análise completa que avalia as características físicas, químicas e microscópicas da urina. Suas alterações podem fornecer pistas importantes sobre a saúde do trato urinário e de outros órgãos, como fígado e pâncreas. A presença de pigmentos, pH alterado ou células anormais pode sugerir infecções ou doenças renais."
    },
    "TSH": {
        defaultUnit: "µUI/mL",
        referenceRange: { general: "0.4 - 4.0 µUI/mL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Quimioluminescência",
        methodOptions: ["Quimioluminescência", "Imunoensaio"],
        specificObservation: "O TSH é o principal hormônio regulador da tireoide, e seus níveis refletem como a glândula está funcionando. Um TSH elevado geralmente indica hipotireoidismo, enquanto um TSH baixo pode ser um indício de hipertireoidismo. Para uma avaliação completa, o resultado deve ser analisado em conjunto com outros hormônios, como o T4 Livre."
    },
    "T4 Livre": {
        defaultUnit: "ng/dL",
        referenceRange: { general: "0.8 - 1.9 ng/dL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Quimioluminescência",
        methodOptions: ["Quimioluminescência", "Imunoensaio"],
        specificObservation: "Esta é a fração ativa do hormônio tiroxina e sua dosagem é crucial para avaliar a função da tireoide. Níveis elevados de T4 Livre podem indicar hipertireoidismo, enquanto níveis baixos sugerem hipotireoidismo. O exame é frequentemente solicitado em casos de suspeita de disfunção da tireoide, na gestação e em investigação de infertilidade feminina."
    },
    "Vitamina D": {
        defaultUnit: "ng/mL",
        referenceRange: { general: "30 - 100 ng/mL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Quimioluminescência",
        methodOptions: ["Quimioluminescência", "HPLC", "Imunoensaio"],
        specificObservation: "A dosagem da 25-OH vitamina D é utilizada para avaliar a suficiência de vitamina D no organismo, fundamental para a saúde óssea e o sistema imunológico. Os valores de referência podem variar conforme a idade, o perfil de risco do paciente e condições clínicas, como osteoporose e doenças inflamatórias. A interpretação deve considerar a população geral saudável e grupos de risco específicos."
    },
    "Ácido Úrico": {
        defaultUnit: "mg/dL",
        referenceRange: { male: "3.5 - 7.2 mg/dL", female: "2.6 - 6.0 mg/dL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro", "Urina"],
        defaultMethod: "Enzimático Colorimétrico",
        methodOptions: ["Enzimático Colorimétrico", "Colorimétrico"],
        specificObservation: "O ácido úrico é o produto final do metabolismo das purinas. Níveis elevados (hiperuricemia) podem levar à formação de cristais e estão associados à gota, cálculos renais e doenças cardiovasculares. É importante correlacionar o resultado com a dieta, o uso de medicamentos e a função renal do paciente para uma avaliação completa."
    },
    "Bilirrubinas": {
        defaultUnit: "mg/dL",
        referenceRange: { general: "Total: < 1.2 mg/dL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro", "Plasma"],
        defaultMethod: "Enzimático Colorimétrico",
        methodOptions: ["Enzimático Colorimétrico", "Diazo"],
        specificObservation: "A bilirrubina é um pigmento biliar gerado pela degradação da hemoglobina. Sua dosagem total e de frações (direta e indireta) é essencial para avaliar a função hepática e o sistema biliar. Níveis elevados podem causar icterícia e indicar condições como hepatites, obstrução das vias biliares ou anemia hemolítica."
    },
    "Ferro Sérico": {
        defaultUnit: "µg/dL",
        referenceRange: { general: "60 - 170 µg/dL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Ferrozine (Colorimétrico)",
        methodOptions: ["Ferrozine (Colorimétrico)", "Colorimétrico"],
        specificObservation: "O ferro sérico mede a quantidade de ferro circulante no sangue, ligado à transferrina. É um exame importante para investigar anemias e hemocromatose. Níveis baixos podem indicar deficiência de ferro, enquanto valores altos podem estar ligados a doenças hepáticas ou sobrecarga de ferro no organismo."
    },
    "Gama GT": {
        defaultUnit: "U/L",
        referenceRange: { male: "11 - 50 U/L", female: "7 - 32 U/L" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Cinético Colorimétrico",
        methodOptions: ["Cinético Colorimétrico"],
        specificObservation: "A Gama Glutamil Transferase (GGT) é uma enzima presente em diversos órgãos, mas principalmente no fígado. Níveis elevados são um marcador sensível de lesão hepática ou de obstrução das vias biliares, e podem estar associados ao consumo de álcool ou uso de certos medicamentos. A avaliação com outras enzimas hepáticas, como TGO e TGP, é essencial."
    },
    "PCR (Proteína C Reativa)": {
        defaultUnit: "mg/L",
        referenceRange: { general: "< 5 mg/L" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Imunoturbidimetria",
        methodOptions: ["Imunoturbidimetria", "Nefelometria"],
        specificObservation: "A Proteína C Reativa (PCR) é um marcador de inflamação e infecção. Seus níveis aumentam rapidamente em resposta a processos inflamatórios agudos, infecções bacterianas ou lesões nos tecidos. Níveis elevados não indicam a causa específica, mas servem como um sinal de alerta para a necessidade de investigação clínica mais aprofundada."
    },
    "Cálcio": {
        defaultUnit: "mg/dL",
        referenceRange: { general: "8.5 - 10.2 mg/dL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Colorimétrico",
        methodOptions: ["Colorimétrico"],
        specificObservation: "O exame de cálcio total mede a quantidade total de cálcio no sangue. O cálcio é um mineral essencial para a saúde óssea, função muscular e nervosa. Níveis alterados podem indicar problemas nas glândulas paratireoides, nos rins, deficiência de vitamina D ou outras doenças ósseas. Sua avaliação deve ser correlacionada com a albumina sérica."
    },
    "Cálcio Total (Ca Total)": {
        defaultUnit: "mg/dL",
        referenceRange: { general: "8.5 - 10.2 mg/dL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Colorimétrico",
        methodOptions: ["Colorimétrico"],
        specificObservation: "O exame de cálcio total mede a quantidade total de cálcio no sangue. O cálcio é um mineral essencial para a saúde óssea, função muscular e nervosa. Níveis alterados podem indicar problemas nas glândulas paratireoides, nos rins, deficiência de vitamina D ou outras doenças ósseas. Sua avaliação deve ser correlacionada com a albumina sérica."
    },
    "Potássio": {
        defaultUnit: "mEq/L",
        referenceRange: { general: "3.5 - 5.1 mEq/L" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Ion Seletivo",
        methodOptions: ["Ion Seletivo"],
        specificObservation: "O potássio é um eletrólito fundamental para o equilíbrio hidroeletrolítico e para a função muscular e cardíaca. Níveis anormais (hipocalemia ou hipercalemia) podem causar arritmias e fraqueza muscular. A sua dosagem é importante na avaliação de doenças renais, uso de diuréticos e distúrbios do equilíbrio ácido-base."
    },
    "Sódio": {
        defaultUnit: "mEq/L",
        referenceRange: { general: "136 - 145 mEq/L" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Ion Seletivo",
        methodOptions: ["Ion Seletivo"],
        specificObservation: "O sódio é o principal eletrólito extracelular e é crucial para a regulação do volume de fluidos, pressão arterial e função nervosa. Níveis alterados (hiponatremia ou hipernatremia) podem ser causados por desidratação, doenças renais ou uso de medicamentos. A sua dosagem é fundamental para a avaliação do equilíbrio hidroeletrolítico do paciente."
    },
    "Magnésio": {
        defaultUnit: "mg/dL",
        referenceRange: { general: "1.7 - 2.2 mg/dL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Colorimétrico",
        methodOptions: ["Colorimétrico"],
        specificObservation: "O magnésio é um mineral essencial para a função neuromuscular, cardíaca e para o metabolismo energético. Sua deficiência (hipomagnesemia) pode levar a arritmias e espasmos musculares. A dosagem é importante em casos de alcoolismo, má absorção, insuficiência renal e uso de certos medicamentos."
    },
    "TGO (AST)": {
        defaultUnit: "U/L",
        referenceRange: { general: "Até 35 U/L" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Cinético Colorimétrico",
        methodOptions: ["Cinético Colorimétrico"],
        specificObservation: "A Aspartato Aminotransferase (AST) ou TGO é uma enzima presente em diversos tecidos, como fígado, coração e músculos. Níveis elevados podem indicar lesão celular hepática, infarto do miocárdio ou lesões musculares. O resultado deve ser interpretado em conjunto com a TGP e a GGT para diferenciar a causa da alteração."
    },
    "TGP (ALT)": {
        defaultUnit: "U/L",
        referenceRange: { general: "Até 35 U/L" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Cinético Colorimétrico",
        methodOptions: ["Cinético Colorimétrico"],
        specificObservation: "A Alanina Aminotransferase (ALT) ou TGP é uma enzima encontrada principalmente no fígado. Níveis elevados são um marcador sensível e específico de lesão hepatocelular. A dosagem é fundamental para o diagnóstico e monitoramento de doenças hepáticas, como hepatites virais, cirrose e esteatose hepática (gordura no fígado)."
    },
    "Fator Reumatoide (FR)": {
        defaultUnit: "UI/mL",
        referenceRange: { general: "< 14 UI/mL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Imunoturbidimetria",
        methodOptions: ["Imunoturbidimetria", "Aglutinação em Látex"],
        specificObservation: "O Fator Reumatoide (FR) é um autoanticorpo que pode estar presente em doenças autoimunes, como a artrite reumatoide. Um resultado positivo não é exclusivo dessa condição e pode ser encontrado em outras doenças ou mesmo em indivíduos saudáveis. A interpretação exige a correlação com a clínica, outros exames e o padrão de sintomas do paciente."
    },
    "VHS (Velocidade de Hemossedimentação)": {
        defaultUnit: "mm/h",
        referenceRange: { general: "Varia com idade e sexo" },
        inputType: "text",
        defaultMaterial: "Sangue Total",
        materialOptions: ["Sangue Total"],
        defaultMethod: "Westergren",
        methodOptions: ["Westergren"],
        specificObservation: "A Velocidade de Hemossedimentação (VHS) é um exame inespecífico que indica a presença de inflamação no corpo. Níveis elevados podem ser encontrados em infecções, doenças autoimunes, inflamações crônicas e neoplasias. Não serve para diagnosticar uma condição específica, mas ajuda a monitorar a atividade de uma doença já diagnosticada."
    },
    "FAN (Fator Antinúcleo)": {
        defaultUnit: "N/A",
        referenceRange: { general: "Não Reagente" },
        inputType: "select",
        options: ["Não Reagente", "Reagente"],
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Imunofluorescência Indireta",
        methodOptions: ["Imunofluorescência Indireta", "Imunocromatografia"],
        specificObservation: "O Fator Antinúcleo (FAN) é um marcador sorológico para investigação de doenças autoimunes sistêmicas, como Lúpus Eritematoso Sistêmico, Esclerose Sistêmica e Síndrome de Sjögren. Um resultado reagente (positivo) não é diagnóstico por si só e deve ser interpretado em conjunto com a clínica do paciente, o padrão de fluorescência e a titulação do exame."
    },
    "HDL-Colesterol (Colesterol de Alta Densidade)": {
        defaultUnit: "mg/dL",
        referenceRange: { general: "> 40 mg/dL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Enzimático",
        methodOptions: ["Enzimático", "Precipitação"],
        specificObservation: "O HDL-colesterol, conhecido como 'colesterol bom', é responsável por remover o excesso de colesterol dos tecidos e transportá-lo para o fígado, onde é eliminado. Níveis elevados estão associados a um menor risco de doenças cardiovasculares, enquanto níveis baixos aumentam o risco. Sua dosagem é parte fundamental da avaliação do perfil lipídico."
    },
    "LDL-Colesterol (Colesterol de Baixa Densidade)": {
        defaultUnit: "mg/dL",
        referenceRange: { general: "< 130 mg/dL (ótimo <100)" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Enzimático Colorimétrico (Cálculo)",
        methodOptions: ["Enzimático Colorimétrico (Cálculo)", "Método Direto"],
        specificObservation: "O LDL-colesterol, conhecido como 'colesterol ruim', é um importante fator de risco para doenças cardiovasculares ateroscleróticas. Níveis elevados promovem o acúmulo de gordura nas artérias. A meta de tratamento é individualizada e depende do risco cardiovascular do paciente, avaliado por fatores como histórico familiar, diabetes e hipertensão."
    },
    "Urocultura (Cultura de Urina)": {
        defaultUnit: "UFC/mL",
        referenceRange: { general: "< 10.000 UFC/mL (Negativa)" },
        inputType: "select",
        options: ["Negativa", "Positiva"],
        defaultMaterial: "Urina",
        materialOptions: ["Urina"],
        defaultMethod: "Cultura",
        methodOptions: ["Cultura"],
        specificObservation: "A urocultura é o exame padrão-ouro para o diagnóstico de infecção do trato urinário (ITU). Um resultado positivo indica a presença de crescimento bacteriano na urina. Em casos positivos, um antibiograma é realizado para determinar a sensibilidade da bactéria aos antibióticos, guiando o tratamento clínico adequado."
    },
    "Fosfatase Alcalina (FA)": {
        defaultUnit: "U/L",
        referenceRange: { general: "40 - 129 U/L" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Cinético Colorimétrico",
        methodOptions: ["Cinético Colorimétrico"],
        specificObservation: "A Fosfatase Alcalina é uma enzima presente em vários tecidos, especialmente no fígado e nos ossos. Níveis elevados podem indicar colestase (obstrução das vias biliares), doenças hepáticas, ou aumento da atividade óssea. A interpretação deve considerar outros exames hepáticos, como GGT, e a idade do paciente, pois é fisiologicamente alta em crianças e adolescentes em fase de crescimento."
    },
    "Cloro (Cl)": {
        defaultUnit: "mEq/L",
        referenceRange: { general: "98 - 107 mEq/L" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro", "Urina"],
        defaultMethod: "Ion Seletivo",
        methodOptions: ["Ion Seletivo", "Potenciométrico"],
        specificObservation: "O cloro é um eletrólito essencial para o balanço hídrico e a regulação ácido-base. Sua dosagem é útil na investigação de distúrbios eletrolíticos, acidose metabólica, alcalose e doenças renais. Níveis críticos (muito baixos ou muito altos) devem ser comunicados imediatamente ao médico, pois indicam risco iminente ao paciente."
    },
    "Ácido Fólico (Folato)": {
        defaultUnit: "ng/mL",
        referenceRange: { general: "3.1 - 17.5 ng/mL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Quimioluminescência",
        methodOptions: ["Quimioluminescência"],
        specificObservation: "O ácido fólico (folato) é uma vitamina B fundamental para a síntese de DNA e para a formação de células sanguíneas. Sua deficiência pode causar anemia megaloblástica e está associada a defeitos do tubo neural em recém-nascidos. Sua dosagem é essencial em gestantes e na investigação de anemias, sendo monitorada durante a suplementação."
    },
    "Ferritina (Ferr)": {
        defaultUnit: "ng/mL",
        referenceRange: { male: "20 - 300 ng/mL", female: "10 - 150 ng/mL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Imunoturbidimetria",
        methodOptions: ["Imunoturbidimetria"],
        specificObservation: "A ferritina é a principal proteína de armazenamento de ferro no organismo. Níveis baixos são o primeiro indicador de deficiência de ferro, enquanto valores elevados podem indicar sobrecarga de ferro (hemocromatose), processos inflamatórios, infecções ou doenças hepáticas. É um marcador importante no diagnóstico e acompanhamento de anemias."
    },
    "Vitamina B12 (Cobalamina)": {
        defaultUnit: "pg/mL",
        referenceRange: { general: "200 - 900 pg/mL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Quimioluminescência",
        methodOptions: ["Quimioluminescência"],
        specificObservation: "A vitamina B12 (cobalamina) é vital para o sistema nervoso e para a formação dos glóbulos vermelhos. Sua deficiência pode levar a anemia megaloblástica e a sintomas neurológicos. A dosagem é importante em pacientes com queixas neurológicas, idosos, veganos e em pacientes com doenças gastrointestinais que afetam a absorção."
    },
    "Proteínas Totais e Frações (PTF)": {
        defaultUnit: "g/dL",
        referenceRange: { general: "Total: 6.0 - 8.0 g/dL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Colorimétrico",
        methodOptions: ["Colorimétrico", "Eletroforese"],
        specificObservation: "Este exame quantifica as proteínas totais e as frações albumina e globulinas no sangue. É útil na avaliação da função hepática, renal e em condições nutricionais e inflamatórias. Níveis alterados podem indicar doenças hepáticas, renais, mieloma múltiplo ou desnutrição, sendo um marcador inespecífico, porém clinicamente relevante."
    },
    "Parasitológico de Fezes (EPF)": {
        defaultUnit: "N/A",
        referenceRange: { general: "Negativo" },
        inputType: "select",
        options: ["Negativo", "Positivo"],
        defaultMaterial: "Fezes",
        materialOptions: ["Fezes"],
        defaultMethod: "Microscopia",
        methodOptions: ["Microscopia"],
        specificObservation: "O exame parasitológico de fezes é o método de escolha para o diagnóstico de infecções intestinais causadas por parasitas (protozoários e helmintos) e suas formas evolutivas (cistos, ovos ou larvas). Recomenda-se a coleta de múltiplas amostras para aumentar a sensibilidade do teste. O resultado deve ser interpretado em conjunto com a clínica e histórico do paciente."
    },
    "Pesquisa de Sangue Oculto nas Fezes (PSOMF)": {
        defaultUnit: "N/A",
        referenceRange: { general: "Negativo" },
        inputType: "select",
        options: ["Negativo", "Positivo"],
        defaultMaterial: "Fezes",
        materialOptions: ["Fezes"],
        defaultMethod: "Imuno-histoquímico",
        methodOptions: ["Imuno-histoquímico", "Guaiaco"],
        specificObservation: "A pesquisa de sangue oculto nas fezes tem como objetivo identificar a presença de sangramento no trato gastrointestinal que não é visível a olho nu. É um exame de rastreamento para câncer colorretal e pode ser útil na investigação de anemias de causa desconhecida. Recomenda-se a não ingestão de carnes e vegetais crus para evitar resultados falso-positivos."
    },
    "Cultura de Fezes (Coprocultura)": {
        defaultUnit: "N/A",
        referenceRange: { general: "Negativa" },
        inputType: "select",
        options: ["Negativa", "Positiva"],
        defaultMaterial: "Fezes",
        materialOptions: ["Fezes"],
        defaultMethod: "Cultura",
        methodOptions: ["Cultura"],
        specificObservation: "A coprocultura é um exame microbiológico que busca identificar bactérias patogênicas nas fezes que causam infecções gastrointestinais (diarreia, enterites). O teste é mais direcionado para bactérias específicas e é fundamental para guiar o tratamento com o uso de antibióticos. A coleta deve ser feita em meio de transporte adequado para garantir a viabilidade dos microrganismos."
    },
    "Peptídeo Natriurético Cerebral (BNP)": {
        defaultUnit: "pg/mL",
        referenceRange: { general: "< 100 pg/mL" },
        inputType: "text",
        defaultMaterial: "Plasma",
        materialOptions: ["Plasma"],
        defaultMethod: "Quimioluminescência",
        methodOptions: ["Quimioluminescência"],
        specificObservation: "O Peptídeo Natriurético Cerebral (BNP) é um marcador biológico liberado pelo coração em resposta ao estresse e à sobrecarga de volume. Níveis elevados são um importante indicador de insuficiência cardíaca e podem ser utilizados no diagnóstico, avaliação de prognóstico e monitoramento da eficácia do tratamento. O resultado não é influenciado por medicações."
    },
    "Eletroforese de Proteínas (Eletroforese)": {
        defaultUnit: "N/A",
        referenceRange: { general: "Padrão Normal" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Eletroforese em gel",
        methodOptions: ["Eletroforese em gel", "Imunofixação"],
        specificObservation: "A Eletroforese de Proteínas Séricas separa as proteínas do soro em frações (albumina e globulinas). O exame é útil na investigação de gamopatias monoclonais (mieloma múltiplo), doenças inflamatórias crônicas, doenças hepáticas e renais. A interpretação dos resultados deve ser feita a partir da análise do perfil de bandas proteicas."
    },
    "Chumbo (Pb)": {
        defaultUnit: "µg/dL",
        referenceRange: { general: "< 10 µg/dL" },
        inputType: "text",
        defaultMaterial: "Sangue Total",
        materialOptions: ["Sangue Total"],
        defaultMethod: "Absorção Atômica",
        methodOptions: ["Absorção Atômica"],
        specificObservation: "A dosagem de chumbo no sangue é um importante marcador biológico para a exposição ocupacional ou ambiental ao metal. Níveis elevados podem causar danos em diversos sistemas, incluindo o nervoso, hematológico e renal. É fundamental na prevenção e no acompanhamento da intoxicação por chumbo. O resultado deve ser interpretado considerando a fonte de exposição."
    },
    "Cromo (Cr)": {
        defaultUnit: "µg/L",
        referenceRange: { general: "< 1.0 µg/L" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Absorção Atômica",
        methodOptions: ["Absorção Atômica"],
        specificObservation: ""
    },
    "Fator V Leiden (FVL)": {
        defaultUnit: "N/A",
        referenceRange: { general: "Negativo" },
        inputType: "select",
        options: ["Negativo", "Positivo"],
        defaultMaterial: "Sangue Total",
        materialOptions: ["Sangue Total"],
        defaultMethod: "PCR",
        methodOptions: ["PCR", "Análise genética"],
        specificObservation: "O exame do Fator V Leiden é um teste genético para identificar uma mutação no gene F5, que confere resistência à ação da Proteína C ativada. A presença dessa mutação está associada a um risco aumentado de hipercoagulabilidade e trombose venosa. É um exame importante para pacientes com histórico de trombose de repetição ou familiar."
    },
    "D-Dímero (D-Dimer)": {
        defaultUnit: "ng/mL FEU",
        referenceRange: { general: "< 500 ng/mL FEU" },
        inputType: "text",
        defaultMaterial: "Plasma",
        materialOptions: ["Plasma"],
        defaultMethod: "Imunoturbidimetria",
        methodOptions: ["Imunoturbidimetria"],
        specificObservation: "O D-Dímero é um fragmento de proteína que se forma quando um coágulo sanguíneo se dissolve no corpo. Níveis elevados indicam a presença de coagulação e fibrinólise e são um marcador importante na investigação de trombose venosa profunda (TVP) e embolia pulmonar (EP). O resultado deve ser interpretado em conjunto com a clínica e outros exames."
    },
    "Tempo de Protrombina (TP)": {
        defaultUnit: "Segundos",
        referenceRange: { general: "10 - 14 Segundos" },
        inputType: "text",
        defaultMaterial: "Plasma (Citrato)",
        materialOptions: ["Plasma (Citrato)"],
        defaultMethod: "Coagulométrico",
        methodOptions: ["Coagulométrico"],
        specificObservation: "O Tempo de Protrombina (TP) é um teste de coagulação que avalia a via extrínseca. Sua dosagem é fundamental para o monitoramento de pacientes em uso de anticoagulantes orais, como a varfarina, e na avaliação da função hepática e da deficiência de vitamina K. O resultado é frequentemente expresso em segundos e como Razão Normalizada Internacional (INR)."
    },
    "Tempo de Tromboplastina Parcial Ativada (TTPA)": {
        defaultUnit: "Segundos",
        referenceRange: { general: "25 - 35 Segundos" },
        inputType: "text",
        defaultMaterial: "Plasma (Citrato)",
        materialOptions: ["Plasma (Citrato)"],
        defaultMethod: "Coagulométrico",
        methodOptions: ["Coagulométrico"],
        specificObservation: "O Tempo de Tromboplastina Parcial Ativada (TTPA) é um teste de coagulação que avalia a via intrínseca. Sua dosagem é indicada na investigação de distúrbios hemorrágicos, deficiência de fatores de coagulação (VIII, IX, XI, XII) e no monitoramento de pacientes em uso de heparina não fracionada. É um exame crucial para a avaliação pré-operatória."
    },
    "Pesquisa de Malária (Gota Espessa)": {
        defaultUnit: "N/A",
        referenceRange: { general: "Negativa" },
        inputType: "select",
        options: ["Negativa", "Positiva"],
        defaultMaterial: "Sangue Total",
        materialOptions: ["Sangue Total"],
        defaultMethod: "Microscopia (Gota Espessa)",
        methodOptions: ["Microscopia (Gota Espessa)", "Testes Rápidos"],
        specificObservation: "A Gota Espessa é o método oficial e padrão-ouro no Brasil para o diagnóstico da malária, permitindo a identificação do parasita (Plasmodium sp.) e a quantificação da parasitemia. É indicado para pacientes com febre, calafrios e histórico de viagem para áreas endêmicas. O resultado é fundamental para o início do tratamento em menos de 24 horas."
    },
    "Apolipoproteína A1 (ApoA1)": {
        defaultUnit: "mg/dL",
        referenceRange: { male: "100 - 190 mg/dL", female: "120 - 220 mg/dL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Imunoturbidimetria",
        methodOptions: ["Imunoturbidimetria", "Nefelometria"],
        specificObservation: "A Apolipoproteína A1 (ApoA1) é o principal componente proteico do HDL-colesterol. Sua dosagem é um marcador mais preciso do risco coronariano, especialmente em pacientes com triglicerídeos elevados. Estudos sugerem que a relação ApoB/ApoA1 pode ter maior poder preditivo do risco cardiovascular do que as frações de colesterol isoladas."
    },
    "Apolipoproteína B (ApoB)": {
        defaultUnit: "mg/dL",
        referenceRange: { general: "< 120 mg/dL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Imunoturbidimetria",
        methodOptions: ["Imunoturbidimetria", "Nefelometria"],
        specificObservation: "A Apolipoproteína B (ApoB) é o principal componente proteico das lipoproteínas aterogênicas (LDL e VLDL). Níveis elevados são um importante fator de risco para doenças cardiovasculares. Sua dosagem fornece uma medida mais precisa do risco, sendo útil na avaliação de pacientes com hipertrigliceridemia e naqueles com perfil lipídico complexo."
    },
    "Estradiol (E2)": {
        defaultUnit: "pg/mL",
        referenceRange: { general: "Varia com fase do ciclo" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Quimioluminescência",
        methodOptions: ["Quimioluminescência", "ECLIA"],
        specificObservation: "O estradiol é o estrogênio mais potente na mulher em idade reprodutiva, sendo fundamental para o ciclo menstrual e fertilidade. Seus níveis variam ao longo do ciclo e sua dosagem é indicada na investigação de infertilidade, amenorreia, puberdade precoce, ou em pacientes em terapia de reposição hormonal. O resultado deve ser interpretado de acordo com a fase do ciclo."
    },
    "Progesterona (Prog)": {
        defaultUnit: "ng/mL",
        referenceRange: { general: "Varia com fase do ciclo" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Quimioluminescência",
        methodOptions: ["Quimioluminescência", "ECLIA"],
        specificObservation: "A progesterona é um hormônio crucial para a manutenção da gravidez e para a regulação do ciclo menstrual. É produzida principalmente no corpo lúteo. A sua dosagem é utilizada para avaliar a ovulação, a fase lútea, e na monitorização da gestação. É um exame importante na investigação de infertilidade e em mulheres que utilizam hormônios."
    },
    "LH (Hormônio Luteinizante)": {
        defaultUnit: "mUI/mL",
        referenceRange: { general: "Varia com fase do ciclo" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Quimioluminescência",
        methodOptions: ["Quimioluminescência", "ECLIA"],
        specificObservation: "O LH é um hormônio gonadotrófico essencial para a ovulação na mulher e para a produção de testosterona no homem. A sua dosagem é indicada na investigação de infertilidade, amenorreia, e no diagnóstico da Síndrome dos Ovários Policísticos (SOP). Na mulher, um pico de LH no meio do ciclo menstrual indica a ovulação."
    },
    "FSH (Hormônio Folículo Estimulante)": {
        defaultUnit: "mUI/mL",
        referenceRange: { general: "Varia com fase do ciclo" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Quimioluminescência",
        methodOptions: ["Quimioluminescência", "ECLIA"],
        specificObservation: "O FSH é um hormônio gonadotrófico que estimula o crescimento dos folículos ovarianos na mulher e a espermatogênese no homem. É um marcador importante na investigação de infertilidade e na avaliação da menopausa. Níveis elevados de FSH, acompanhados de LH, podem indicar insuficiência gonadal."
    },
    "Prolactina (PRL)": {
        defaultUnit: "ng/mL",
        referenceRange: { general: "< 25 ng/mL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Quimioluminescência",
        methodOptions: ["Quimioluminescência", "ECLIA"],
        specificObservation: "A prolactina é um hormônio produzido pela hipófise, responsável pela produção de leite. Níveis elevados (hiperprolactinemia) podem estar associados a tumores na hipófise, disfunções na tireoide, uso de medicamentos ou estresse. A dosagem é indicada em casos de galactorreia (produção de leite fora da gestação) e amenorreia."
    },
    "PSA Total (Antígeno Prostático Específico Total)": {
        defaultUnit: "ng/mL",
        referenceRange: { general: "< 4.0 ng/mL (Varia com idade)" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Quimioluminescência",
        methodOptions: ["Quimioluminescência"],
        specificObservation: "O Antígeno Prostático Específico (PSA) é uma proteína produzida pela próstata, sendo o principal marcador para o rastreamento e monitoramento do câncer de próstata. Níveis elevados também podem ser causados por hiperplasia prostática benigna, prostatite ou trauma. A interpretação do resultado depende da idade e de outros fatores clínicos."
    },
    "PSA Livre (Antígeno Prostático Específico Livre)": {
        defaultUnit: "ng/mL",
        referenceRange: { general: "Proporção PSA L/T > 0.15" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Quimioluminescência",
        methodOptions: ["Quimioluminescência"],
        specificObservation: "A dosagem do PSA Livre, em conjunto com o PSA Total, é utilizada para aumentar a especificidade do rastreamento do câncer de próstata. Uma proporção PSA Livre/Total inferior a 10% está associada a um maior risco de câncer, enquanto valores acima de 25% sugerem condições benignas. A interpretação deve ser feita por um urologista."
    },
    "Testosterona Total (Testo Total)": {
        defaultUnit: "ng/dL",
        referenceRange: { male: "240 - 950 ng/dL", female: "8 - 60 ng/dL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Quimioluminescência",
        methodOptions: ["Quimioluminescência"],
        specificObservation: "A testosterona é o principal hormônio sexual masculino, responsável pelo desenvolvimento de características sexuais secundárias e pela manutenção da massa muscular e óssea. Níveis baixos podem causar fadiga, diminuição da libido e disfunção erétil. A dosagem é essencial na avaliação do hipogonadismo masculino e na investigação de distúrbios hormonais femininos."
    },
    "Testosterona Livre (Testo Livre)": {
        defaultUnit: "pg/mL",
        referenceRange: { male: "50 - 210 pg/mL", female: "0.5 - 8.0 pg/mL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Quimioluminescência (Cálculo)",
        methodOptions: ["Quimioluminescência (Cálculo)", "Imunoensaio"],
        specificObservation: "A testosterona livre representa a fração biologicamente ativa do hormônio, que não está ligada às proteínas. É um marcador mais sensível para o diagnóstico do hipogonadismo, especialmente em homens com mais de 50 anos ou em casos de obesidade e diabetes. É um exame complementar à testosterona total para uma avaliação mais precisa."
    },
    "Transferrina (Transf)": {
        defaultUnit: "mg/dL",
        referenceRange: { general: "200 - 400 mg/dL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Imunoturbidimetria",
        methodOptions: ["Imunoturbidimetria"],
        specificObservation: "A transferrina é a principal proteína de transporte de ferro no sangue. Sua dosagem é útil na avaliação do metabolismo do ferro e no diagnóstico de anemias e hemocromatose. Níveis elevados podem indicar deficiência de ferro, enquanto níveis reduzidos podem estar associados a doenças hepáticas crônicas, desnutrição ou processos inflamatórios."
    },
    "Fenitoína (Difenil-hidantoína)": {
        defaultUnit: "µg/mL",
        referenceRange: { general: "10 - 20 µg/mL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Quimioluminescência",
        methodOptions: ["Quimioluminescência", "Cromatografia"],
        specificObservation: "A fenitoína é um medicamento antiepiléptico. A dosagem sérica é essencial para o monitoramento terapêutico, pois a droga apresenta farmacocinética não linear e pode causar toxicidade com pequenos aumentos de dose. Níveis dentro da faixa terapêutica garantem a eficácia do tratamento e minimizam o risco de efeitos adversos, como sedação e nistagmo."
    },
    "Ácido Valproico (Valproato)": {
        defaultUnit: "µg/mL",
        referenceRange: { general: "50 - 100 µg/mL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Quimioluminescência",
        methodOptions: ["Quimioluminescência", "Imunoensaio"],
        specificObservation: "O ácido valproico é um medicamento anticonvulsivante e estabilizador de humor. O monitoramento de seus níveis no sangue é crucial para garantir que a concentração esteja dentro da faixa terapêutica, otimizando a eficácia e minimizando o risco de toxicidade. A coleta da amostra deve ser realizada no período de 12 horas após a última dose, ou conforme orientação médica."
    },
    "HBsAg (Antígeno de Superfície da Hepatite B)": {
        defaultUnit: "N/A",
        referenceRange: { general: "Não Reagente" },
        inputType: "select",
        options: ["Não Reagente", "Reagente"],
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Quimioluminescência",
        methodOptions: ["Quimioluminescência", "ECLIA"],
        specificObservation: "O HBsAg é um marcador sorológico que indica infecção ativa pelo vírus da Hepatite B (HBV). Um resultado reagente (positivo) confirma que o indivíduo está infectado, seja em fase aguda ou crônica. O resultado não reagente sugere ausência de infecção. A interpretação deve ser feita em conjunto com outros marcadores sorológicos para definir o estágio da doença."
    },
    "Anti-HCV (Anticorpo Anti-Hepatite C)": {
        defaultUnit: "N/A",
        referenceRange: { general: "Não Reagente" },
        inputType: "select",
        options: ["Não Reagente", "Reagente"],
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Quimioluminescência",
        methodOptions: ["Quimioluminescência", "ECLIA"],
        specificObservation: "O Anti-HCV é um teste sorológico que detecta a presença de anticorpos contra o vírus da Hepatite C (HCV). Um resultado reagente (positivo) indica contato prévio com o vírus, mas não diferencia entre infecção ativa ou curada. Para confirmar a infecção ativa, é necessário realizar um teste molecular (PCR) para detecção do RNA viral."
    },
    "VDRL (Sífilis)": {
        defaultUnit: "N/A",
        referenceRange: { general: "Não Reagente" },
        inputType: "select",
        options: ["Não Reagente", "Reagente"],
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Teste não-treponêmico",
        methodOptions: ["Teste não-treponêmico"],
        specificObservation: "O VDRL é um teste não treponêmico usado como triagem para a sífilis. Um resultado reagente (positivo) pode indicar uma infecção ativa, mas também pode ocorrer falso-positivo em outras condições. A confirmação do diagnóstico é feita com testes treponêmicos, como o FTA-Abs."
    },
    "FTA-Abs (Sífilis (Teste Confirmatório))": {
        defaultUnit: "N/A",
        referenceRange: { general: "Não Reagente" },
        inputType: "select",
        options: ["Não Reagente", "Reagente"],
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Imunofluorescência Indireta",
        methodOptions: ["Imunofluorescência Indireta"],
        specificObservation: "O FTA-Abs é um teste treponêmico, utilizado para confirmar o diagnóstico de sífilis. A presença de anticorpos reagentes é considerada um resultado confirmatório e, geralmente, permanece positivo por toda a vida, mesmo após o tratamento. É o exame de escolha para confirmar resultados reagentes do VDRL."
    },
    "Pesquisa de BAAR (Bacilo Álcool-Ácido Resistente)": {
        defaultUnit: "N/A",
        referenceRange: { general: "Negativo" },
        inputType: "select",
        options: ["Negativo", "Positivo"],
        defaultMaterial: "Escarro",
        materialOptions: ["Escarro", "Urina", "Secreção"],
        defaultMethod: "Microscopia (Ziehl-Neelsen)",
        methodOptions: ["Microscopia (Ziehl-Neelsen)"],
        specificObservation: "A pesquisa de Bacilo Álcool-Ácido Resistente (BAAR) é um exame microscópico que permite a detecção direta de micobactérias, como o Mycobacterium tuberculosis. É um teste rápido e de triagem para o diagnóstico da tuberculose pulmonar, mas um resultado negativo não exclui a doença, sendo necessária a realização de cultura."
    },
    "Pesquisa de Tuberculose (Cultura para TB)": {
        defaultUnit: "N/A",
        referenceRange: { general: "Negativa" },
        inputType: "select",
        options: ["Negativa", "Positiva"],
        defaultMaterial: "Escarro",
        materialOptions: ["Escarro", "Urina", "Secreção"],
        defaultMethod: "Cultura",
        methodOptions: ["Cultura"],
        specificObservation: "A cultura para tuberculose é o exame padrão-ouro para o diagnóstico de tuberculose ativa, pois permite o crescimento da micobactéria em laboratório. É um teste mais sensível que a pesquisa direta (BAAR) e permite a realização de testes de sensibilidade a medicamentos, sendo fundamental para o tratamento adequado da doença."
    },
    "Beta-HCG (HCG Quantitativo)": {
        defaultUnit: "mUI/mL",
        referenceRange: { general: "Varia (Gravidez)" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro", "Urina"],
        defaultMethod: "Quimioluminescência",
        methodOptions: ["Quimioluminescência", "Imunoensaio"],
        specificObservation: "O Beta-HCG é um hormônio produzido durante a gestação. A dosagem quantitativa é utilizada para confirmar a gravidez e para monitorar sua evolução. Níveis inconclusivos (entre 5 e 25 mUI/mL) requerem a repetição do exame em 48 a 72 horas para verificar se o valor está dobrando, o que indica uma gestação em curso."
    },
    "Pesquisa de Fungos (Micológico Direto)": {
        defaultUnit: "N/A",
        referenceRange: { general: "Negativo" },
        inputType: "select",
        options: ["Negativo", "Positivo"],
        defaultMaterial: "Raspado de Pele/Unhas",
        materialOptions: ["Raspado de Pele/Unhas", "Secreção"],
        defaultMethod: "Microscopia",
        methodOptions: ["Microscopia", "Cultura"],
        specificObservation: "O exame micológico direto é uma análise microscópica de amostras (pele, unhas, pelos) para a pesquisa de elementos fúngicos. É um exame de triagem que permite a identificação rápida da presença de fungos patogênicos, sendo útil no diagnóstico de micoses superficiais. A cultura pode ser solicitada como complemento."
    },
    "Pesquisa de Leishmania (Leishmania)": {
        defaultUnit: "N/A",
        referenceRange: { general: "Negativa" },
        inputType: "select",
        options: ["Negativa", "Positiva"],
        defaultMaterial: "Aspirado de Medula Óssea",
        materialOptions: ["Aspirado de Medula Óssea", "Biópsia de Pele", "Sangue Total"],
        defaultMethod: "Microscopia",
        methodOptions: ["Microscopia", "PCR"],
        specificObservation: "A pesquisa de Leishmania é um exame direto para identificar o parasita em amostras de tecido, medula óssea ou sangue. É o método padrão para o diagnóstico da leishmaniose visceral ou tegumentar. Em casos de suspeita, o exame parasitológico direto é crucial para a confirmação, além de testes sorológicos e moleculares (PCR)."
    },
    "Alfa-1 Glicoproteína Ácida (AGP)": {
        defaultUnit: "mg/dL",
        referenceRange: { general: "50 - 120 mg/dL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Imunoturbidimetria",
        methodOptions: ["Imunoturbidimetria"],
        specificObservation: "A Alfa-1 Glicoproteína Ácida (AGP) é uma proteína de fase aguda, ou seja, seus níveis aumentam rapidamente em resposta a processos inflamatórios. O exame é utilizado para monitorar a atividade de doenças inflamatórias, infecciosas ou neoplásicas. Níveis diminuídos podem ser observados em desnutrição, doenças hepáticas graves e na gravidez."
    },
    "Alfa-Fetoproteína (AFP)": {
        defaultUnit: "ng/mL",
        referenceRange: { general: "< 10 ng/mL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Quimioluminescência",
        methodOptions: ["Quimioluminescência"],
        specificObservation: "A Alfa-Fetoproteína (AFP) é uma proteína produzida pelo fígado e pelo saco vitelínico do feto. Níveis elevados em adultos são um importante marcador tumoral para o carcinoma hepatocelular (câncer de fígado) e tumores de células germinativas. Também pode estar elevada na hepatite viral crônica e cirrose, exigindo interpretação clínica cuidadosa."
    },
    "Bacterioscopia (Gram)": {
        defaultUnit: "N/A",
        referenceRange: { general: "Negativa" },
        inputType: "select",
        options: ["Negativa", "Positivo"],
        defaultMaterial: "Secreção",
        materialOptions: ["Secreção", "Esfregaço"],
        defaultMethod: "Microscopia (Gram)",
        methodOptions: ["Microscopia (Gram)"],
        specificObservation: "A bacterioscopia, com coloração de Gram, é um exame microscópico que permite a visualização direta de bactérias em uma amostra. É uma técnica rápida e de baixo custo que auxilia na classificação inicial das bactérias em Gram-positivas ou Gram-negativas, orientando a escolha do tratamento com antibióticos até o resultado da cultura."
    },
    "Lítio (Li)": {
        defaultUnit: "mEq/L",
        referenceRange: { general: "0.6 - 1.2 mEq/L" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro", "Plasma"],
        defaultMethod: "Ion Seletivo",
        methodOptions: ["Ion Seletivo", "Fotometria de Chama"],
        specificObservation: "O lítio é um medicamento utilizado no tratamento do transtorno bipolar. A dosagem sérica é essencial para monitorar a faixa terapêutica, pois a concentração do medicamento está estreitamente ligada à sua eficácia e toxicidade. Níveis acima de 1,5 mEq/L podem ser tóxicos e requerem atenção médica imediata."
    },
    "Troponina I (TnI)": {
        defaultUnit: "ng/mL",
        referenceRange: { general: "< 0.04 ng/mL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro", "Plasma"],
        defaultMethod: "Quimioluminescência",
        methodOptions: ["Quimioluminescência", "ECLIA"],
        specificObservation: "A Troponina I é uma proteína liberada na corrente sanguínea quando o músculo cardíaco sofre dano. É um marcador altamente específico e sensível para o diagnóstico de infarto agudo do miocárdio, sendo essencial na avaliação de pacientes com dor torácica. Níveis elevados indicam lesão cardíaca e devem ser interpretados em conjunto com a clínica e o eletrocardiograma."
    },
    "Painel Viral Respiratório (PCR Viral)": {
        defaultUnit: "N/A",
        referenceRange: { general: "Negativo" },
        inputType: "select",
        options: ["Negativo", "Positivo"],
        defaultMaterial: "Swab de Nasofaringe",
        materialOptions: ["Swab de Nasofaringe", "Escarro"],
        defaultMethod: "PCR",
        methodOptions: ["PCR"],
        specificObservation: "O painel viral respiratório por PCR é um exame de biologia molecular que permite a detecção simultânea de diversos vírus respiratórios. É uma ferramenta fundamental para o diagnóstico rápido e preciso de infecções respiratórias, auxiliando na escolha do tratamento adequado, principalmente em grupos de risco e em epidemias."
    },
    "Microalbuminúria (MAU)": {
        defaultUnit: "mg/24h",
        referenceRange: { general: "< 30 mg/24h" },
        inputType: "text",
        defaultMaterial: "Urina 24h",
        materialOptions: ["Urina 24h", "Urina amostra isolada"],
        defaultMethod: "Imunoturbidimetria",
        methodOptions: ["Imunoturbidimetria"],
        specificObservation: "A Microalbuminúria é a detecção de pequenas quantidades de albumina na urina. É um marcador precoce de dano renal, principalmente em pacientes com diabetes e hipertensão arterial. A dosagem é um indicador importante para monitorar a progressão de doenças renais e avaliar a eficácia do tratamento."
    },
    "Fibrinogênio (Fibrin)": {
        defaultUnit: "mg/dL",
        referenceRange: { general: "200 - 400 mg/dL" },
        inputType: "text",
        defaultMaterial: "Plasma (Citrato)",
        materialOptions: ["Plasma (Citrato)"],
        defaultMethod: "Coagulométrico",
        methodOptions: ["Coagulométrico"],
        specificObservation: "O fibrinogênio é uma proteína essencial para a coagulação do sangue. Níveis elevados podem indicar processos inflamatórios, infecciosos e aumento do risco de trombose (formação de coágulos). Níveis baixos podem causar distúrbios hemorrágicos e estão associados a doenças hepáticas e distúrbios de coagulação."
    },
    "Tireoglobulina (TG)": {
        defaultUnit: "ng/mL",
        referenceRange: { general: "< 33 ng/mL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Quimioluminescência",
        methodOptions: ["Quimioluminescência"],
        specificObservation: "A tireoglobulina é uma proteína produzida pelas células da tireoide. É um marcador importante no monitoramento de pacientes tratados para câncer de tireoide, principalmente após tireoidectomia. Níveis elevados podem sugerir recorrência da doença ou presença de tecido tireoidiano remanescente."
    },
    "Anticorpos Anti-Tireoglobulina (Anti-TG)": {
        defaultUnit: "UI/mL",
        referenceRange: { general: "< 40 UI/mL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Quimioluminescência",
        methodOptions: ["Quimioluminescência"],
        specificObservation: "Os anticorpos anti-tireoglobulina são autoanticorpos que atacam a tireoglobulina. Sua presença é um marcador de doenças autoimunes da tireoide, como a tireoidite de Hashimoto e a Doença de Graves. Sua dosagem é útil no diagnóstico e no acompanhamento da atividade dessas doenças, em conjunto com a clínica e outros exames."
    },
    "Homocisteína (Hcy)": {
        defaultUnit: "µmol/L",
        referenceRange: { general: "4 - 15 µmol/L" },
        inputType: "text",
        defaultMaterial: "Plasma",
        materialOptions: ["Plasma"],
        defaultMethod: "HPLC",
        methodOptions: ["HPLC", "Imunoensaio"],
        specificObservation: "A homocisteína é um aminoácido que, quando em excesso, é considerado um fator de risco para doenças cardiovasculares, neurológicas e trombose. Níveis elevados podem estar associados a deficiências de vitaminas do complexo B (B6, B12 e ácido fólico), insuficiência renal e predisposição genética."
    },
    "Procalcitonina (PCT)": {
        defaultUnit: "ng/mL",
        referenceRange: { general: "< 0.05 ng/mL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro", "Plasma"],
        defaultMethod: "Quimioluminescência",
        methodOptions: ["Quimioluminescência", "ECLIA"],
        specificObservation: "A procalcitonina é um biomarcador que se eleva significativamente em infecções bacterianas, mas não em infecções virais. O exame é útil no diagnóstico de sepse e na diferenciação de infecções bacterianas e virais, auxiliando na decisão clínica de iniciar ou suspender a terapia com antibióticos, principalmente em pacientes hospitalizados."
    },
    "Cobre (Cu)": {
        defaultUnit: "µg/dL",
        referenceRange: { general: "70 - 140 µg/dL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro", "Urina"],
        defaultMethod: "Espectrofotometria",
        methodOptions: ["Espectrofotometria", "Absorção Atômica"],
        specificObservation: "O cobre é um mineral essencial para o metabolismo celular e a formação de enzimas. A dosagem sérica é indicada na investigação da Doença de Wilson (acúmulo de cobre) e na monitorização de pacientes com deficiência ou intoxicação por cobre. Níveis anormais podem estar ligados a doenças hepáticas e renais."
    },
    "Amônia (NH3)": {
        defaultUnit: "µmol/L",
        referenceRange: { general: "18 - 72 µmol/L" },
        inputType: "text",
        defaultMaterial: "Plasma (EDTA)",
        materialOptions: ["Plasma (EDTA)", "Plasma (Heparina)"],
        defaultMethod: "Enzimático UV",
        methodOptions: ["Enzimático UV"],
        specificObservation: "A amônia é um produto tóxico do metabolismo de proteínas, processado pelo fígado e eliminado pelos rins. Níveis elevados no sangue são um marcador de disfunção hepática grave e podem levar à encefalopatia hepática. Sua dosagem é fundamental no monitoramento de pacientes com doenças hepáticas crônicas."
    },
    "Cálcio Iônico (Ca Iônico)": {
        defaultUnit: "mmol/L",
        referenceRange: { general: "1.12 - 1.32 mmol/L" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro", "Plasma"],
        defaultMethod: "Ion Seletivo",
        methodOptions: ["Ion Seletivo"],
        specificObservation: "O cálcio iônico é a fração biologicamente ativa do cálcio no sangue. É o marcador mais preciso do metabolismo do cálcio, pois não é afetado por alterações nas proteínas plasmáticas (como a albumina). Sua dosagem é importante na investigação de distúrbios de cálcio, doenças renais e problemas paratireoidianos."
    },
    "Hepatite A IgM (Anti-HAV IgM)": {
        defaultUnit: "N/A",
        referenceRange: { general: "Não Reagente" },
        inputType: "select",
        options: ["Não Reagente", "Reagente"],
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Quimioluminescência",
        methodOptions: ["Quimioluminescência", "ELISA"],
        specificObservation: "A presença de anticorpos IgM anti-vírus da hepatite A (HAV) é um marcador de infecção aguda e recente. Este exame é essencial para o diagnóstico da hepatite A. O anticorpo surge precocemente na fase aguda da doença e tende a desaparecer em até 6 meses, sendo um indicador de infecção ativa."
    },
    "Hepatite A IgG (Anti-HAV IgG)": {
        defaultUnit: "N/A",
        referenceRange: { general: "Não Reagente" },
        inputType: "select",
        options: ["Não Reagente", "Reagente"],
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Quimioluminescência",
        methodOptions: ["Quimioluminescência", "ELISA"],
        specificObservation: "A presença de anticorpos IgG anti-vírus da hepatite A (HAV) indica contato passado com o vírus ou imunidade adquirida por vacinação. Este exame não serve para diagnosticar a infecção aguda, mas é útil para verificar o estado de imunidade do paciente. O anticorpo IgG permanece em títulos detectáveis por toda a vida."
    },
    "Insulina (Ins)": {
        defaultUnit: "µUI/mL",
        referenceRange: { general: "2.6 - 24.9 µUI/mL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Quimioluminescência",
        methodOptions: ["Quimioluminescência", "ECLIA"],
        specificObservation: "A insulina é o principal hormônio responsável por regular a glicose no sangue. A sua dosagem é utilizada para investigar hipoglicemia, resistência à insulina e o diagnóstico de insulinoma. A interpretação do resultado deve sempre ser correlacionada com os níveis de glicose no momento da coleta e com o tempo de jejum."
    },
    "Glicosilada (Hemoglobina Glicada, HbA1c)": {
        defaultUnit: "%",
        referenceRange: { general: "< 5.7%" },
        inputType: "text",
        defaultMaterial: "Sangue Total",
        materialOptions: ["Sangue Total"],
        defaultMethod: "Cromatografia (HPLC)",
        methodOptions: ["Cromatografia (HPLC)", "Imunoensaio"],
        specificObservation: "A Hemoglobina Glicada (HbA1c) reflete o nível médio de glicose no sangue nos últimos 3 a 4 meses. É um exame crucial para o diagnóstico de pré-diabetes e diabetes, além de ser a principal ferramenta para o monitoramento do controle glicêmico de pacientes diabéticos. O exame não requer jejum."
    },
    "Cadeias Leves Kappa e Lambda (Cadeias Leves)": {
        defaultUnit: "N/A",
        referenceRange: { general: "Varia" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro", "Urina"],
        defaultMethod: "Imunoturbidimetria",
        methodOptions: ["Imunoturbidimetria", "Eletroforese"],
        specificObservation: "A dosagem de cadeias leves livres kappa e lambda é um exame complementar para o diagnóstico e monitoramento de gamopatias monoclonais, como o mieloma múltiplo e a amiloidose primária. A alteração na relação kappa/lambda no soro é um marcador sensível da produção aumentada de cadeias leves monoclonais."
    },
    "Meta-Hemoglobina (MetHb)": {
        defaultUnit: "%",
        referenceRange: { general: "< 1.5%" },
        inputType: "text",
        defaultMaterial: "Sangue Total",
        materialOptions: ["Sangue Total"],
        defaultMethod: "Co-oximetria",
        methodOptions: ["Co-oximetria", "Espectrofotometria"],
        specificObservation: "A meta-hemoglobina é uma forma de hemoglobina incapaz de transportar oxigênio. A dosagem é indicada na investigação de cianose (coloração azulada da pele) de causa desconhecida. Níveis elevados (meta-hemoglobinemia) podem ser causados por defeitos genéticos, exposição a certos medicamentos e produtos químicos."
    },
    "Pesquisa de Criptococos (Tinta da China)": {
        defaultUnit: "N/A",
        referenceRange: { general: "Negativa" },
        inputType: "select",
        options: ["Negativa", "Positiva"],
        defaultMaterial: "Líquor",
        materialOptions: ["Líquor", "Escarro"],
        defaultMethod: "Microscopia (Tinta da China)",
        methodOptions: ["Microscopia (Tinta da China)", "Cultura"],
        specificObservation: "O exame de pesquisa de Criptococos, através da técnica de Tinta da China, é um exame microscópico direto de líquor, urina ou escarro para a detecção da levedura encapsulada Cryptococcus neoformans. É um teste rápido e crucial para o diagnóstico de meningite criptocócica, especialmente em pacientes imunocomprometidos, como portadores de HIV."
    },
    "Coombs Direto (CD)": {
        defaultUnit: "N/A",
        referenceRange: { general: "Negativo" },
        inputType: "select",
        options: ["Negativo", "Positivo"],
        defaultMaterial: "Sangue Total",
        materialOptions: ["Sangue Total"],
        defaultMethod: "Aglutinação",
        methodOptions: ["Aglutinação"],
        specificObservation: "O teste de Coombs Direto é utilizado para detectar a presença de anticorpos ou proteínas do sistema complemento que estão aderidos diretamente à superfície dos glóbulos vermelhos. É o exame de escolha para o diagnóstico de anemias hemolíticas autoimunes e reações transfusionais."
    },
    "Coombs Indireto (CI)": {
        defaultUnit: "N/A",
        referenceRange: { general: "Negativo" },
        inputType: "select",
        options: ["Negativo", "Positivo"],
        defaultMaterial: "Soro",
        materialOptions: ["Soro"],
        defaultMethod: "Aglutinação",
        methodOptions: ["Aglutinação"],
        specificObservation: "O teste de Coombs Indireto é utilizado para detectar a presença de anticorpos livres no plasma que podem se ligar aos glóbulos vermelhos. É fundamental em testes pré-transfusionais para garantir a compatibilidade sanguínea e na rotina pré-natal de gestantes Rh negativas para detectar a presença de anticorpos que possam causar eritroblastose fetal."
    },
    "Glicemia de Jejum (GJ)": {
        defaultUnit: "mg/dL",
        referenceRange: { general: "< 99 mg/dL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro", "Plasma (Fluoreto)"],
        defaultMethod: "Enzimático Colorimétrico",
        methodOptions: ["Enzimático Colorimétrico", "Hexoquinase"],
        specificObservation: "A dosagem da glicemia em jejum é o exame mais comum para o rastreamento do diabetes mellitus. Níveis entre 100 e 125 mg/dL são considerados como Glicemia de Jejum Alterada, um dos critérios para pré-diabetes. Valores acima de 126 mg/dL, em mais de uma ocasião, são diagnósticos de diabetes."
    },
    "Glicemia Pós-Prandial (GPP)": {
        defaultUnit: "mg/dL",
        referenceRange: { general: "< 140 mg/dL" },
        inputType: "text",
        defaultMaterial: "Soro",
        materialOptions: ["Soro", "Plasma (Fluoreto)"],
        defaultMethod: "Enzimático Colorimétrico",
        methodOptions: ["Enzimático Colorimétrico", "Hexoquinase"],
        specificObservation: "A glicemia pós-prandial mede o nível de glicose no sangue 2 horas após uma refeição. Níveis elevados podem indicar resistência à insulina ou intolerância à glicose, sendo um marcador precoce de disfunção metabólica. O exame é complementar à glicemia de jejum e é importante para o monitoramento de pacientes diabéticos."
    },
    "Grupo Sanguíneo (Tipagem)": {
        defaultUnit: "",
        referenceRange: { general: "Variável" },
        inputType: "text",
        defaultMaterial: "Sangue Total",
        materialOptions: ["Sangue Total"],
        defaultMethod: "Aglutinação",
        methodOptions: ["Aglutinação", "Gel Test"],
        specificObservation: "A tipagem sanguínea (sistema ABO e fator Rh) é fundamental em transfusões de sangue, transplantes de órgãos e no pré-natal, para evitar reações de incompatibilidade que podem ser fatais. O exame determina a presença ou ausência dos antígenos A, B e do fator Rh na superfície dos glóbulos vermelhos."
    }

};

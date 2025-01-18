/**
 * **Função para Exportar os Dados para WhatsApp**
 */
function exportToWhatsApp(supportData) {
    if (!supportData || supportData.villages.length === 0) {
        alert('Nenhum dado para exportar.');
        return;
    }

    let message = '📊 *Estatísticas de Apoio da Tribo*\n\n';
    message += `📍 *Total de Aldeias Analisadas:* ${supportData.villages.length}\n\n`;
    message += `📌 *Coordenadas das Aldeias Analisadas:*\n`;

    supportData.villages.forEach(function(village, index) {
        message += `${index + 1}. ${village.coordinates} - ${village.villageName}\n`;
    });

    message += `\n🔍 *Contagem de Apoios por Jogador:*\n`;

    for (let player in supportData.supportCounts) {
        let supported = supportData.supportCounts[player].supported;
        let notSupported = supportData.supportCounts[player].notSupported;
        message += `• *${player}*: ${supported} Apoiou | ${notSupported} Não Apoiou\n`;
    }

    // Copiar para a área de transferência
    copyTextToClipboard(message).then(function() {
        alert('Mensagem copiada para a área de transferência! Cole no WhatsApp para compartilhar.');
    }).catch(function(err) {
        console.error('Erro ao copiar para a área de transferência:', err);
        alert('Falha ao copiar a mensagem. Por favor, copie manualmente.');
    });
}

/**
 * **Função para Copiar Texto para a Área de Transferência**
 */
function copyTextToClipboard(text) {
    return new Promise(function(resolve, reject) {
        let textarea = document.createElement('textarea');
        textarea.value = text;
        // Evita que o textarea seja visível
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        try {
            let successful = document.execCommand('copy');
            if (successful) {
                resolve();
            } else {
                reject(new Error('Falha ao copiar o texto.'));
            }
        } catch (err) {
            reject(err);
        }

        document.body.removeChild(textarea);
    });
}

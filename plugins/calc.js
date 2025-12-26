export const command = 'calc';
export const aliases = ['calculadora', 'calcular'];
export const description = 'Calculadora matemática avanzada';
export const category = 'utilidad';

export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;
    const expression = args.join(' ').trim();

    if (!expression) {
        return await sock.sendMessage(from, {
            text: `🧮 *CALCULADORA MATEMÁTICA*\n\n📝 *Uso:* .calc <expresión>\n\n📋 *Ejemplos:*\n• .calc 5 + 3\n• .calc 15 * (4 - 2)\n• .calc 10 / 2 + 8\n• .calc 2^3 + sqrt(9)\n• .calc sin(45) + cos(30)\n\n🔢 *Operadores:* +, -, *, /, ^, %\n📐 *Funciones:* sin, cos, tan, sqrt, log, ln, abs\n⚡ *Constantes:* PI, E`
        }, { quoted: msg });
    }

    try {

        let processedExpression = expression
            .replace(/PI/g, Math.PI.toString())
            .replace(/E/g, Math.E.toString())
            .replace(/π/g, Math.PI.toString())
            .replace(/e/g, Math.E.toString());


        processedExpression = processedExpression
            .replace(/sqrt\(/g, 'Math.sqrt(')
            .replace(/sin\(/g, 'Math.sin(')
            .replace(/cos\(/g, 'Math.cos(')
            .replace(/tan\(/g, 'Math.tan(')
            .replace(/log\(/g, 'Math.log10(')
            .replace(/ln\(/g, 'Math.log(')
            .replace(/abs\(/g, 'Math.abs(')
            .replace(/\^/g, '**');


        const safeRegex = /^[0-9+\-*/().\sMathPIEsincostanqrtlogb]+$/;
        if (!safeRegex.test(processedExpression.replace(/ /g, ''))) {
            throw new Error('Expresión contiene caracteres no permitidos');
        }


        const result = eval(processedExpression);
        

        let formattedResult;
        if (Number.isInteger(result)) {
            formattedResult = result.toLocaleString();
        } else {
            formattedResult = Number(result.toFixed(6)).toString();
        }

        await sock.sendMessage(from, {
            text: `🧮 *RESULTADO*\n\n📝 *Expresión:* ${expression}\n✅ *Resultado:* ${formattedResult}\n\n🔢 *Desglose:*\n• Expresión procesada: ${processedExpression}\n• Valor numérico: ${result}`
        }, { quoted: msg });

    } catch (error) {
        console.error('Error en calculadora:', error);
        
        let errorMessage = `❌ *ERROR EN CÁLCULO*\n\n`;
        errorMessage += `📝 Expresión: ${expression}\n\n`;
        
        if (error.message.includes('caracteres no permitidos')) {
            errorMessage += `⚠️ *Problema:* La expresión contiene caracteres no permitidos\n`;
            errorMessage += `💡 *Solución:* Usa solo números y operadores matemáticos básicos`;
        } else if (error.message.includes('Unexpected token') || error.message.includes('expected')) {
            errorMessage += `⚠️ *Problema:* Sintaxis incorrecta\n`;
            errorMessage += `💡 *Solución:* Verifica los paréntesis y operadores`;
        } else if (error.message.includes('Division by zero')) {
            errorMessage += `⚠️ *Problema:* División entre cero\n`;
            errorMessage += `💡 *Solución:* No se puede dividir entre cero`;
        } else {
            errorMessage += `⚠️ *Problema:* Expresión inválida\n`;
            errorMessage += `💡 *Solución:* Revisa la sintaxis y usa .calc para ver ejemplos`;
        }

        await sock.sendMessage(from, { 
            text: errorMessage 
        }, { quoted: msg });
    }
}
export const LOCK_INSTRUCTIONS: Record<string, string> = {
	tumbler: 'Gira los cilindros para alinear la combinación en la línea central.',
	cryptex: 'Alinea los cuatro símbolos elementales con la marca de alineación superior.',
	safedial: 'Gira el dial hacia la derecha e izquierda hasta las marcas indicadas.',
	breaker: 'Posiciona los interruptores de forma correcta .',
	compass: 'Ingresa la secuencia direccional con el mando de navegación.',
	sliders: 'Ajusta los controles deslizantes a los niveles requeridos.',
	terminal: 'Ingresa la clave de acceso alfanumérica en la consola de comandos.',
	pattern: 'Traza el patrón correcto uniendo los nodos en secuencia.',
	patchbay: 'Conecta los cables de conexión a los puertos de destino correspondientes.',
	frequency: 'Sintoniza la frecuencia exacta hasta alinear la señal del osciloscopio.',
	piano: 'Toca la secuencia de notas en el teclado según la partitura.'
};

export function getLockInstruction(type: string): string {
	return LOCK_INSTRUCTIONS[type] || 'Introduce el código para desbloquear la estación.';
}

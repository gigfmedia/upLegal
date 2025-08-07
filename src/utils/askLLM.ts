// Mock implementation of askMistral function
// This would normally connect to Mistral AI API or similar service

export async function askMistral(prompt: string): Promise<string> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock response based on common legal queries
  if (prompt.toLowerCase().includes('abogado')) {
    return JSON.stringify({
      tipo: "abogado",
      especialidad: detectEspecialidad(prompt),
      ciudad: detectCiudad(prompt),
      respuesta: "Perfecto, he encontrado algunos abogados que podrían ayudarte. Aquí tienes las opciones disponibles:"
    });
  }
  
  if (prompt.toLowerCase().includes('documento')) {
    return JSON.stringify({
      tipo: "documento",
      especialidad: "",
      ciudad: "",
      respuesta: "Para ayudarte con documentos legales, necesito más información específica sobre qué tipo de documento necesitas."
    });
  }
  
  return JSON.stringify({
    tipo: "analisis",
    especialidad: "",
    ciudad: "",
    respuesta: "Entiendo que necesitas asesoría legal. ¿Podrías proporcionarme más detalles sobre tu situación específica?"
  });
}

function detectEspecialidad(text: string): string {
  const especialidades = ['penal', 'civil', 'laboral', 'administrativo', 'familiar', 'mercantil', 'constitucional'];
  const textLower = text.toLowerCase();
  
  for (const esp of especialidades) {
    if (textLower.includes(esp)) {
      return esp;
    }
  }
  
  // Detectar sinónimos comunes
  if (textLower.includes('trabajo') || textLower.includes('despido') || textLower.includes('empleado')) {
    return 'laboral';
  }
  if (textLower.includes('divorcio') || textLower.includes('custodia') || textLower.includes('familia')) {
    return 'familiar';
  }
  if (textLower.includes('delito') || textLower.includes('robo') || textLower.includes('defensa')) {
    return 'penal';
  }
  if (textLower.includes('contrato') || textLower.includes('demanda') || textLower.includes('civil')) {
    return 'civil';
  }
  
  return '';
}

function detectCiudad(text: string): string {
  const ciudades = ['Santiago', 'Valparaíso', 'Concepción', 'Pucón', 'Pichilemu', 'Viña del Mar', 'Rancagua', 'Talca'];
  const textLower = text.toLowerCase();
  
  for (const ciudad of ciudades) {
    if (textLower.includes(ciudad.toLowerCase())) {
      return ciudad;
    }
  }
  
  return '';
}
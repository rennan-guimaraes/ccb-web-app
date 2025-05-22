/**
 * Constantes utilizadas no sistema.
 */

// Dictionary mapping complete document names to normalized/abbreviated names
export const DOCUMENTOS: Record<string, string> = {
  // Documentos de Propriedade
  "Escritura Definitiva - Compra e Venda/Permuta":
    "Escritura de Compra e Venda",
  "Escritura Pública - Inventário/Arrolamento": "Escritura de Inventário",
  "Escritura de Usucapião": "Escritura de Usucapião",
  "Sentença de Usucapião": "Sentença de Usucapião",
  "Formal de Partilha/Carta de Adjudicação": "Formal de Partilha",

  // Documentos de Construção/Funcionamento
  "Habite-se": "Habite-se",
  "Projeto Aprovado Pela Prefeitura": "Projeto Aprovado",
  "Alvará de Funcionamento": "Alvará de Funcionamento",
  "Averbação da Construção na Matricula": "Averbação de Construção",

  // Documentos de Segurança
  "AVCB - Auto de Vistoria do Corpo de Bombeiros": "Bombeiros",
  "CLCB - Certificado de Licença Corpo de Bombeiros": "Bombeiros",
  "SCPO - Sistema de Comunicação Prévia de Obras": "SCPO",

  // Instrumentos Particulares
  "Instrumento Particular - Cessão de Direitos de Compra e Venda":
    "Cessão de Direitos Particular",
  "Instrumento Particular - Cessão de Posse": "Cessão de Posse Particular",
  "Instrumento Particular - Cessão de Direitos Hereditários":
    "Cessão Hereditária Particular",
  "Instrumento Particular - Doação": "Doação Particular",
  "Instrumento Particular - Promessa de Compra e Venda":
    "Promessa de Compra Particular",

  // Instrumentos Públicos
  "Instrumento Público - Cessão de Direitos de Compra e Venda":
    "Cessão de Direitos Público",
  "Instrumento Público - Cessão de Direitos Hereditários":
    "Cessão Hereditária Público",
  "Instrumento Público - Cessão de Posse": "Cessão de Posse Público",
  "Instrumento Público - Doação": "Doação Público",
  "Instrumento Público - Promessa de Compra e Venda":
    "Promessa de Compra Público",

  // Outros Documentos
  "CNO – Cadastro Nacional de Obras": "CNO",
  "Licença de Ocupação": "Licença de Ocupação",
  "Regularização Fundiária": "REURB",
  "Contrato de Aluguel": "Contrato de Aluguel",

  // Documentos pessoais (mantendo compatibilidade com versão anterior)
  certidao: "certidao_nascimento",
  certidão: "certidao_nascimento",
  "certidao de nascimento": "certidao_nascimento",
  "certidão de nascimento": "certidao_nascimento",
  nascimento: "certidao_nascimento",

  rg: "rg",
  identidade: "rg",
  "carteira de identidade": "rg",

  cpf: "cpf",
  "cadastro de pessoa fisica": "cpf",
  "cadastro de pessoa física": "cpf",

  titulo: "titulo_eleitor",
  título: "titulo_eleitor",
  "titulo de eleitor": "titulo_eleitor",
  "título de eleitor": "titulo_eleitor",
  eleitor: "titulo_eleitor",

  comprovante: "comprovante_residencia",
  "comprovante de residencia": "comprovante_residencia",
  "comprovante de residência": "comprovante_residencia",
  residencia: "comprovante_residencia",
  residência: "comprovante_residencia",

  batismo: "certidao_batismo",
  "certidao de batismo": "certidao_batismo",
  "certidão de batismo": "certidao_batismo",

  profissao: "profissao_fe",
  profissão: "profissao_fe",
  "profissao de fe": "profissao_fe",
  "profissão de fé": "profissao_fe",
  fe: "profissao_fe",
  fé: "profissao_fe",
};

// Documentos obrigatórios para funcionamento
export const DOCUMENTOS_OBRIGATORIOS = [
  "Alvará de Funcionamento",
  "Bombeiros",
  "Projeto Aprovado",
  "Habite-se",
  // Documentos pessoais obrigatórios (mantendo compatibilidade)
  "certidao_nascimento",
  "rg",
  "cpf",
  "titulo_eleitor",
  "comprovante_residencia",
];

/**
 * Normalizes text by removing extra spaces, accents and converting to lowercase
 * @param texto - The text to normalize
 * @returns Normalized text
 */
function normalizarTexto(texto: string): string {
  // Remove accents using built-in JavaScript methods
  const semAcentos = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Convert to lowercase and remove extra spaces
  return semAcentos.toLowerCase().trim();
}

/**
 * Normalizes document name according to DOCUMENTOS dictionary
 * @param nome - The document name to normalize
 * @returns Normalized document name
 */
export function normalizarNomeDocumento(nome: string): string {
  // Create a dictionary with normalized keys
  const docsNormalizados: Record<string, string> = {};
  Object.entries(DOCUMENTOS).forEach(([key, value]) => {
    docsNormalizados[normalizarTexto(key)] = value;
  });

  // Normalize input name
  const nomeNormalizado = normalizarTexto(nome);

  // Search for correspondence
  for (const [key, value] of Object.entries(docsNormalizados)) {
    if (nomeNormalizado.includes(key) || key.includes(nomeNormalizado)) {
      return value;
    }
  }

  // If no match found, return original name
  return nome;
}

/**
 * Checks if a document is mandatory
 * @param nome - The document name to check
 * @returns True if the document is mandatory
 */
export function isDocumentoObrigatorio(nome: string): boolean {
  const nomeNormalizado = normalizarNomeDocumento(nome);
  return DOCUMENTOS_OBRIGATORIOS.includes(nomeNormalizado);
}

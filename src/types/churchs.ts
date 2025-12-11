export interface CasaOracao {
  codigo: string;
  nome: string;
  tipo_imovel?: string;
  endereco?: string;
  observacoes?: string;
  status?: string;
}

export interface CasaOracaoFormData {
  codigo: string;
  nome: string;
  tipo_imovel: string;
  endereco: string;
  observacoes: string;
  status: string;
}

export interface GestaoData {
  codigo: string;
  [key: string]: string; // Para outras colunas dinâmicas do Excel
}

// Interface para tracking de documentos faltantes
export interface DocumentoFaltante {
  codigo: string; // Código da casa
  documento: string; // Nome do documento faltante
  observacao?: string; // Observação sobre a falta
  desconsiderar: boolean; // Se deve desconsiderar esta falta no gráfico
  dataObservacao?: string; // Data da última observação
  responsavel?: string; // Quem fez a observação
}

// Interface para análise de documentos faltantes
export interface AnaliseDocumento {
  nomeDocumento: string;
  isObrigatorio: boolean;
  totalCasas: number;
  casasComDocumento: number;
  casasSemDocumento: number;
  casasDesconsideradas: number;
  percentualReal: number; // Considerando desconsideradas
  percentualOriginal: number; // Sem considerar desconsideradas
  casasFaltantes: Array<{
    codigo: string;
    nome: string;
    observacao?: string;
    desconsiderar: boolean;
  }>;
}

// Interface para documento detalhado do gestão a vista
export interface DocumentoDetalhado {
  codigo: string; // Código da casa
  codigoDocumento: string; // Código do documento (ex: "1.1", "3", etc.)
  nomeDocumento: string; // Nome/descrição do documento
  dataEmissao?: Date; // Data de emissão do documento
  dataValidade?: Date; // Data de validade do documento
  presente: boolean; // Se o documento está presente
}

// Interface para dados do gestão a vista
export interface GestaoVistaData {
  codigo: string; // Código da casa
  documentos: DocumentoDetalhado[]; // Lista de documentos da casa
}

// Interface para histórico de importações
export interface ImportHistory {
  id: string;
  timestamp: Date;
  fileName: string;
  type: "documentos" | "casas" | "backup";
  totalItems: number;
  totalDocumentos?: number;
  status: "success" | "error";
  message?: string;
}

// Lista dos documentos do gestão a vista com códigos e descrições
export const DOCUMENTOS_GESTAO_VISTA_LIST = [
  { codigo: "1.1", nome: "ESCRITURA DEFINITIVA - COMPRA E VENDA / PERMUTA" },
  { codigo: "1_HABITE", nome: "HABITE-SE" },
  { codigo: "3_ALVARA", nome: "ALVARÁ/LICENÇA DE FUNCIONAMENTO" },
  { codigo: "5", nome: "CLCB - CERTIFICADO DE LICENÇA CORPO DE BOMBEIROS" },
  { codigo: "4", nome: "AVCB - AUTO DE VISTORIA DO CORPO DE BOMBEIROS" },
  { codigo: "1_PROJETO", nome: "PROJETO APROVADO PELA PREFEITURA" },
  { codigo: "2_CERTIFICADO", nome: "CERTIFICADO DE REGULARIZAÇÃO" },
  { codigo: "2_AVERBACAO", nome: "AVERBAÇÃO DA CONSTRUÇÃO NA MATRICULA" },
  { codigo: "4.1", nome: "SENTENÇA DE USUCAPIÃO" },
  {
    codigo: "2.3",
    nome: "INSTRUMENTO PARTICULAR - CESSÃO DE DIREITOS HEREDITÁRIOS",
  },
  { codigo: "5.1", nome: "CONTRATO DE ALUGUEL" },
  {
    codigo: "3_SCPO",
    nome: "SCPO - SISTEMA DE COMUNICAÇÃO PRÉVIA DE OBRAS (MINISTÉRIO DO TRABALHO)",
  },
  { codigo: "2.2", nome: "INSTRUMENTO PARTICULAR - CESSÃO DE POSSE" },
];

// Helper function para encontrar documento por descrição
export const findDocumentoByCodigo = (
  codigoOriginal: string,
  descricao: string
): string => {
  // Primeiro tenta encontrar por código exato
  const porCodigo = DOCUMENTOS_GESTAO_VISTA_LIST.find(
    (d) => d.codigo === codigoOriginal
  );
  if (porCodigo) return porCodigo.codigo;

  // Depois tenta por descrição parcial
  const porDescricao = DOCUMENTOS_GESTAO_VISTA_LIST.find(
    (d) =>
      d.nome.toLowerCase().includes(descricao.toLowerCase()) ||
      descricao.toLowerCase().includes(d.nome.toLowerCase())
  );

  return porDescricao?.codigo || `${codigoOriginal}_CUSTOM`;
};

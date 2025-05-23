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

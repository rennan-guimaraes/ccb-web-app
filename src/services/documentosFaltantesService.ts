import {
  DocumentoFaltante,
  AnaliseDocumento,
  GestaoData,
  CasaOracao,
} from "../types/casaOracao";
import { isDocumentoObrigatorio } from "../utils/constants";

export class DocumentosFaltantesService {
  private readonly storageKey = "documentos_faltantes";

  /**
   * Loads missing documents tracking data from storage
   */
  loadDocumentosFaltantes(): DocumentoFaltante[] {
    try {
      if (typeof window !== "undefined") {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : [];
      }
      return [];
    } catch (error) {
      console.error("Error loading missing documents data:", error);
      return [];
    }
  }

  /**
   * Saves missing documents tracking data to storage
   */
  saveDocumentosFaltantes(documentos: DocumentoFaltante[]): boolean {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(this.storageKey, JSON.stringify(documentos));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error saving missing documents data:", error);
      return false;
    }
  }

  /**
   * Updates observation and status for a missing document
   */
  updateDocumentoFaltante(
    codigo: string,
    documento: string,
    observacao: string,
    desconsiderar: boolean,
    responsavel?: string
  ): boolean {
    try {
      const documentos = this.loadDocumentosFaltantes();

      // Find existing entry or create new one
      const existingIndex = documentos.findIndex(
        (d) => d.codigo === codigo && d.documento === documento
      );

      const documentoFaltante: DocumentoFaltante = {
        codigo,
        documento,
        observacao: observacao.trim() || undefined,
        desconsiderar,
        dataObservacao: new Date().toISOString(),
        responsavel,
      };

      if (existingIndex !== -1) {
        documentos[existingIndex] = documentoFaltante;
      } else {
        documentos.push(documentoFaltante);
      }

      return this.saveDocumentosFaltantes(documentos);
    } catch (error) {
      console.error("Error updating missing document:", error);
      return false;
    }
  }

  /**
   * Gets observation for a specific missing document
   */
  getDocumentoFaltante(
    codigo: string,
    documento: string
  ): DocumentoFaltante | null {
    const documentos = this.loadDocumentosFaltantes();
    return (
      documentos.find(
        (d) => d.codigo === codigo && d.documento === documento
      ) || null
    );
  }

  /**
   * Analyzes missing documents for all houses
   */
  analisarDocumentosFaltantes(
    gestaoData: GestaoData[],
    casasData: CasaOracao[]
  ): AnaliseDocumento[] {
    if (!gestaoData || gestaoData.length === 0) return [];

    const documentosFaltantes = this.loadDocumentosFaltantes();
    const totalCasas = casasData.length;

    // Get all document types (columns except 'codigo')
    const tiposDocumentos =
      gestaoData.length > 0
        ? Object.keys(gestaoData[0]).filter((key) => key !== "codigo")
        : [];

    const analises: AnaliseDocumento[] = [];

    tiposDocumentos.forEach((documento) => {
      const isObrigatorio = isDocumentoObrigatorio(documento);

      // Count houses with document
      const casasComDocumento = gestaoData.filter((casa) => {
        const valor = casa[documento];
        return valor && valor.toString().toUpperCase().trim() === "X";
      }).length;

      // Find houses without document
      const casasSemDocumento: Array<{
        codigo: string;
        nome: string;
        observacao?: string;
        desconsiderar: boolean;
      }> = [];

      gestaoData.forEach((casa) => {
        const valor = casa[documento];
        const temDocumento =
          valor && valor.toString().toUpperCase().trim() === "X";

        if (!temDocumento) {
          const casaInfo = casasData.find((c) => c.codigo === casa.codigo);
          const faltanteInfo = documentosFaltantes.find(
            (d) => d.codigo === casa.codigo && d.documento === documento
          );

          // Verificação especial para documentos que só são obrigatórios para imóveis próprios
          const docNormalizado = documento.toLowerCase();
          const isDocumentoApenasProprio =
            docNormalizado.includes("averbacao") ||
            docNormalizado.includes("averbação") ||
            docNormalizado.includes("escritura") ||
            (docNormalizado.includes("compra") &&
              docNormalizado.includes("venda"));

          let observacaoAuto = faltanteInfo?.observacao;
          let desconsiderarAuto = faltanteInfo?.desconsiderar || false;

          if (isDocumentoApenasProprio && casaInfo?.tipo_imovel) {
            // Esses documentos só são obrigatórios para imóveis próprios (IP - ...)
            const isImovelProprio = casaInfo.tipo_imovel
              .toUpperCase()
              .startsWith("IP");

            if (!isImovelProprio) {
              // Automaticamente marca como desconsiderado com observação
              observacaoAuto =
                observacaoAuto || "Não é imóvel próprio, logo não precisa";
              desconsiderarAuto = true;

              // Salva automaticamente no localStorage se ainda não existe
              if (!faltanteInfo) {
                this.updateDocumentoFaltante(
                  casa.codigo,
                  documento,
                  observacaoAuto,
                  desconsiderarAuto
                );
              }
            }
          }

          casasSemDocumento.push({
            codigo: casa.codigo,
            nome: casaInfo?.nome || casa.codigo,
            observacao: observacaoAuto,
            desconsiderar: desconsiderarAuto,
          });
        }
      });

      const casasDesconsideradas = casasSemDocumento.filter(
        (c) => c.desconsiderar
      ).length;
      const casasRealmenteSemDocumento =
        casasSemDocumento.length - casasDesconsideradas;

      const percentualOriginal =
        totalCasas > 0 ? (casasComDocumento / totalCasas) * 100 : 0;
      const percentualReal =
        totalCasas > 0
          ? ((casasComDocumento + casasDesconsideradas) / totalCasas) * 100
          : 0;

      analises.push({
        nomeDocumento: documento,
        isObrigatorio,
        totalCasas,
        casasComDocumento,
        casasSemDocumento: casasSemDocumento.length,
        casasDesconsideradas,
        percentualOriginal,
        percentualReal,
        casasFaltantes: casasSemDocumento,
      });
    });

    // Sort: mandatory first, then by most missing
    return analises.sort((a, b) => {
      if (a.isObrigatorio !== b.isObrigatorio) {
        return a.isObrigatorio ? -1 : 1;
      }
      return b.casasSemDocumento - a.casasSemDocumento;
    });
  }

  /**
   * Gets chart data considering exemptions
   */
  getChartDataWithExemptions(
    gestaoData: GestaoData[],
    casasData: CasaOracao[],
    totalCasas: number
  ): Array<{
    name: string;
    value: number;
    originalValue: number;
    exemptions: number;
  }> {
    if (!gestaoData || gestaoData.length === 0) return [];

    const documentosFaltantes = this.loadDocumentosFaltantes();
    const tiposDocumentos =
      gestaoData.length > 0
        ? Object.keys(gestaoData[0]).filter((key) => key !== "codigo")
        : [];

    return tiposDocumentos
      .map((documento) => {
        // Count original occurrences
        let originalValue = gestaoData.filter((casa) => {
          const valor = casa[documento];
          return valor && valor.toString().toUpperCase().trim() === "X";
        }).length;

        // Não precisa de lógica especial aqui, pois as exceções são tratadas
        // automaticamente pelo sistema de desconsideração

        // Count exemptions for this document
        const exemptions = documentosFaltantes.filter(
          (d) => d.documento === documento && d.desconsiderar
        ).length;

        return {
          name: documento,
          value: originalValue + exemptions, // Adjusted count
          originalValue,
          exemptions,
        };
      })
      .filter((item) => item.value > 0); // Only show documents with occurrences
  }

  /**
   * Clears all missing documents data
   */
  clearDocumentosFaltantes(): boolean {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem(this.storageKey);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error clearing missing documents data:", error);
      return false;
    }
  }
}

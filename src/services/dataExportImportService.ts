import {
  CasaOracao,
  GestaoData,
  DocumentoFaltante,
  GestaoVistaData,
} from "../types/churchs";

export interface SystemBackup {
  version: string;
  timestamp: string;
  data: {
    casas: CasaOracao[];
    gestao: GestaoData[];
    gestaoVista: GestaoVistaData[];
    documentos_faltantes: DocumentoFaltante[];
  };
}

export class DataExportImportService {
  private readonly version = "1.0.0";

  /**
   * Exports all localStorage data to a JSON object
   */
  exportAllData(): SystemBackup {
    try {
      const casas = this.getLocalStorageData(
        "casas"
      ) as unknown as CasaOracao[];
      const gestao = this.getLocalStorageData(
        "gestao"
      ) as unknown as GestaoData[];
      const gestaoVista = this.getLocalStorageData(
        "gestaoVista"
      ) as unknown as GestaoVistaData[];
      const documentosFaltantes = this.getLocalStorageData(
        "documentos_faltantes"
      ) as unknown as DocumentoFaltante[];

      const backup: SystemBackup = {
        version: this.version,
        timestamp: new Date().toISOString(),
        data: {
          casas,
          gestao,
          gestaoVista,
          documentos_faltantes: documentosFaltantes,
        },
      };

      return backup;
    } catch (error) {
      console.error("Error exporting data:", error);
      throw new Error(`Erro ao exportar dados: ${error}`);
    }
  }

  /**
   * Downloads all data as a JSON file
   */
  downloadDataAsJson(): void {
    try {
      const backup = this.exportAllData();
      // Remove pretty printing (null, 2) to reduce file size significantly
      const dataStr = JSON.stringify(backup);

      // Create compressed blob
      const blob = new Blob([dataStr], {
        type: "application/json",
        // Add compression hint for modern browsers
        endings: "native",
      });
      const url = URL.createObjectURL(blob);

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const filename = `sistema-igreja-backup-${timestamp}.json`;

      // Create and trigger download
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading data:", error);
      throw new Error(`Erro ao baixar dados: ${error}`);
    }
  }

  /**
   * Imports data from a backup file
   */
  async importDataFromFile(
    file: File
  ): Promise<{ success: boolean; message: string; data?: SystemBackup }> {
    try {
      // Validate file type
      if (!file.name.endsWith(".json")) {
        return {
          success: false,
          message: "Por favor, selecione um arquivo JSON válido.",
        };
      }

      // Read file content
      const fileContent = await this.readFileContent(file);
      const backup: SystemBackup = JSON.parse(fileContent);

      // Validate backup structure
      const validation = this.validateBackup(backup);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.error || "Arquivo de backup inválido.",
        };
      }

      return {
        success: true,
        message:
          "Arquivo lido com sucesso. Confirme a importação para continuar.",
        data: backup,
      };
    } catch (error) {
      console.error("Error importing data:", error);
      return {
        success: false,
        message: `Erro ao ler arquivo: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`,
      };
    }
  }

  /**
   * Applies the imported data to localStorage
   */
  applyImportedData(
    backup: SystemBackup,
    mergeMode: boolean = false
  ): { success: boolean; message: string } {
    try {
      if (!mergeMode) {
        // Replace mode - clear existing data first
        this.clearAllData();
      }

      // Apply data
      if (backup.data.casas) {
        const existingCasas = mergeMode
          ? (this.getLocalStorageData("casas") as unknown as CasaOracao[])
          : [];
        const mergedCasas = mergeMode
          ? (this.mergeArrays(
              existingCasas as unknown as Record<string, unknown>[],
              backup.data.casas as unknown as Record<string, unknown>[],
              "codigo"
            ) as unknown as CasaOracao[])
          : backup.data.casas;
        this.setLocalStorageData("casas", mergedCasas as unknown[]);
      }

      if (backup.data.gestao) {
        const existingGestao = mergeMode
          ? (this.getLocalStorageData("gestao") as unknown as GestaoData[])
          : [];
        const mergedGestao = mergeMode
          ? (this.mergeArrays(
              existingGestao as unknown as Record<string, unknown>[],
              backup.data.gestao as unknown as Record<string, unknown>[],
              "codigo"
            ) as unknown as GestaoData[])
          : backup.data.gestao;
        this.setLocalStorageData("gestao", mergedGestao as unknown[]);
      }

      if (backup.data.gestaoVista) {
        const existingGestaoVista = mergeMode
          ? (this.getLocalStorageData(
              "gestaoVista"
            ) as unknown as GestaoVistaData[])
          : [];
        const mergedGestaoVista = mergeMode
          ? (this.mergeArrays(
              existingGestaoVista as unknown as Record<string, unknown>[],
              backup.data.gestaoVista as unknown as Record<string, unknown>[],
              "codigo"
            ) as unknown as GestaoVistaData[])
          : backup.data.gestaoVista;
        this.setLocalStorageData("gestaoVista", mergedGestaoVista as unknown[]);
      }

      if (backup.data.documentos_faltantes) {
        const existingDocs = mergeMode
          ? (this.getLocalStorageData(
              "documentos_faltantes"
            ) as unknown as DocumentoFaltante[])
          : [];
        const mergedDocs = mergeMode
          ? this.mergeDocumentosFaltantes(
              existingDocs,
              backup.data.documentos_faltantes
            )
          : backup.data.documentos_faltantes;
        this.setLocalStorageData(
          "documentos_faltantes",
          mergedDocs as unknown[]
        );
      }

      return {
        success: true,
        message: `Dados importados com sucesso! ${
          mergeMode
            ? "Dados mesclados com os existentes."
            : "Dados substituídos."
        }`,
      };
    } catch (error) {
      console.error("Error applying imported data:", error);
      return {
        success: false,
        message: `Erro ao aplicar dados importados: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`,
      };
    }
  }

  /**
   * Gets data summary for preview
   */
  getDataSummary(backup: SystemBackup): {
    casas: number;
    gestao: number;
    gestaoVista: number;
    documentosFaltantes: number;
    timestamp: string;
    version: string;
  } {
    return {
      casas: backup.data.casas?.length || 0,
      gestao: backup.data.gestao?.length || 0,
      gestaoVista: backup.data.gestaoVista?.length || 0,
      documentosFaltantes: backup.data.documentos_faltantes?.length || 0,
      timestamp: backup.timestamp,
      version: backup.version,
    };
  }

  // Private helper methods

  private getLocalStorageData(key: string): unknown[] {
    try {
      if (typeof window !== "undefined") {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
      }
      return [];
    } catch (error) {
      console.error(`Error getting localStorage data for key ${key}:`, error);
      return [];
    }
  }

  private setLocalStorageData(key: string, data: unknown[]): void {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(key, JSON.stringify(data));
      }
    } catch (error) {
      console.error(`Error setting localStorage data for key ${key}:`, error);
      throw error;
    }
  }

  private clearAllData(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("casas");
      localStorage.removeItem("gestao");
      localStorage.removeItem("gestaoVista");
      localStorage.removeItem("documentos_faltantes");

      // Reset with empty arrays
      localStorage.setItem("casas", JSON.stringify([]));
      localStorage.setItem("gestao", JSON.stringify([]));
      localStorage.setItem("gestaoVista", JSON.stringify([]));
      localStorage.setItem("documentos_faltantes", JSON.stringify([]));
    }
  }

  private readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };

      reader.onerror = () => {
        reject(new Error("Erro ao ler o arquivo"));
      };

      reader.readAsText(file);
    });
  }

  private validateBackup(backup: unknown): {
    isValid: boolean;
    error?: string;
  } {
    // Check basic structure
    if (!backup || typeof backup !== "object") {
      return { isValid: false, error: "Estrutura de backup inválida" };
    }

    const backupObj = backup as Record<string, unknown>;

    if (!backupObj.version || !backupObj.timestamp || !backupObj.data) {
      return {
        isValid: false,
        error: "Backup incompleto - campos obrigatórios ausentes",
      };
    }

    // Check data structure
    if (typeof backupObj.data !== "object") {
      return { isValid: false, error: "Seção de dados inválida" };
    }

    // Validate arrays
    const dataObj = backupObj.data as Record<string, unknown>;
    const { casas, gestao, documentos_faltantes } = dataObj;

    if (casas && !Array.isArray(casas)) {
      return { isValid: false, error: "Dados de casas inválidos" };
    }

    if (gestao && !Array.isArray(gestao)) {
      return { isValid: false, error: "Dados de gestão inválidos" };
    }

    if (documentos_faltantes && !Array.isArray(documentos_faltantes)) {
      return {
        isValid: false,
        error: "Dados de documentos faltantes inválidos",
      };
    }

    return { isValid: true };
  }

  private mergeArrays<T extends Record<string, unknown>>(
    existing: T[],
    incoming: T[],
    keyField: string
  ): T[] {
    const merged = [...existing];

    incoming.forEach((item) => {
      const existingIndex = merged.findIndex(
        (existing) => existing[keyField] === item[keyField]
      );

      if (existingIndex !== -1) {
        // Update existing item
        merged[existingIndex] = { ...merged[existingIndex], ...item };
      } else {
        // Add new item
        merged.push(item);
      }
    });

    return merged;
  }

  private mergeDocumentosFaltantes(
    existing: DocumentoFaltante[],
    incoming: DocumentoFaltante[]
  ): DocumentoFaltante[] {
    const merged = [...existing];

    incoming.forEach((item) => {
      const existingIndex = merged.findIndex(
        (existing) =>
          existing.codigo === item.codigo &&
          existing.documento === item.documento
      );

      if (existingIndex !== -1) {
        // Update existing item (keep most recent)
        const existingDate = new Date(
          merged[existingIndex].dataObservacao || 0
        );
        const incomingDate = new Date(item.dataObservacao || 0);

        if (incomingDate > existingDate) {
          merged[existingIndex] = item;
        }
      } else {
        // Add new item
        merged.push(item);
      }
    });

    return merged;
  }
}

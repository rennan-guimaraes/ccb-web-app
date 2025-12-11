import * as XLSX from "xlsx";
import {
  CasaOracao,
  GestaoData,
  DocumentoDetalhado,
  GestaoVistaData,
  ImportHistory,
  findDocumentoByCodigo,
} from "../types/churchs";
import { normalizarNomeDocumento } from "../utils/constants";

export class DataService {
  private readonly dataDir: string;
  private readonly gestaoFile: string;
  private readonly casasFile: string;
  private readonly isDebugMode: boolean = false; // Control debug logging

  constructor(dataDir: string = "data") {
    this.dataDir = dataDir;
    this.gestaoFile = `${dataDir}/gestao.json`;
    this.casasFile = `${dataDir}/casas.json`;

    // Initialize data directory and files if needed
    this.initializeDataFiles();
  }

  private debugLog(...args: unknown[]): void {
    if (this.isDebugMode) {
      console.log(...args);
    }
  }

  private initializeDataFiles(): void {
    // In browser environment, we'll use localStorage instead of files
    if (typeof window !== "undefined") {
      if (!localStorage.getItem("gestao")) {
        localStorage.setItem("gestao", JSON.stringify([]));
      }
      if (!localStorage.getItem("casas")) {
        localStorage.setItem("casas", JSON.stringify([]));
      }
      if (!localStorage.getItem("importHistory")) {
        localStorage.setItem("importHistory", JSON.stringify([]));
      }
    }
  }

  /**
   * Loads import history from storage
   */
  loadImportHistory(): ImportHistory[] {
    try {
      if (typeof window !== "undefined") {
        const data = localStorage.getItem("importHistory");
        const parsed = data ? JSON.parse(data) : [];
        // Parse dates from JSON
        return parsed.map((item: ImportHistory) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
      }
      return [];
    } catch (error) {
      console.error("Error loading import history:", error);
      return [];
    }
  }

  /**
   * Saves import history to storage
   */
  private saveImportHistory(history: ImportHistory[]): boolean {
    try {
      if (typeof window !== "undefined") {
        // Keep only the last 20 imports
        const limitedHistory = history.slice(0, 20);
        localStorage.setItem("importHistory", JSON.stringify(limitedHistory));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error saving import history:", error);
      return false;
    }
  }

  /**
   * Adds a new entry to import history
   */
  addImportHistory(entry: Omit<ImportHistory, "id" | "timestamp">): ImportHistory {
    const history = this.loadImportHistory();
    const newEntry: ImportHistory = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    history.unshift(newEntry);
    this.saveImportHistory(history);
    return newEntry;
  }

  /**
   * Clears import history
   */
  clearImportHistory(): boolean {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("importHistory", JSON.stringify([]));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error clearing import history:", error);
      return false;
    }
  }

  /**
   * Loads management data from storage
   */
  loadGestao(): GestaoData[] {
    try {
      if (typeof window !== "undefined") {
        const data = localStorage.getItem("gestao");
        return data ? JSON.parse(data) : [];
      }
      return [];
    } catch (error) {
      console.error("Error loading management data:", error);
      return [];
    }
  }

  /**
   * Saves management data to storage
   */
  saveGestao(data: GestaoData[]): boolean {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("gestao", JSON.stringify(data));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error saving management data:", error);
      return false;
    }
  }

  /**
   * Loads houses of prayer from storage
   */
  loadCasas(): CasaOracao[] {
    try {
      if (typeof window !== "undefined") {
        const data = localStorage.getItem("casas");
        return data ? JSON.parse(data) : [];
      }
      return [];
    } catch (error) {
      console.error("Error loading houses of prayer:", error);
      return [];
    }
  }

  /**
   * Saves houses of prayer to storage
   */
  saveCasas(casas: CasaOracao[]): boolean {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("casas", JSON.stringify(casas));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error saving houses of prayer:", error);
      return false;
    }
  }

  /**
   * Clears management data
   */
  clearGestao(): boolean {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("gestao");
        localStorage.setItem("gestao", JSON.stringify([]));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error clearing management data:", error);
      return false;
    }
  }

  /**
   * Clears houses of prayer data
   */
  clearCasas(): boolean {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("casas");
        localStorage.setItem("casas", JSON.stringify([]));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error clearing houses of prayer:", error);
      return false;
    }
  }

  /**
   * Optimized Excel file reader
   */
  private readExcelSafe(
    file: File,
    headerRow: number = 14
  ): Promise<unknown[][]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, {
            type: "array",
            cellDates: true, // Parse dates automatically
            cellNF: false, // Don't parse number formats
            cellText: false, // Don't convert to text
          });

          // Get the first worksheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Convert to JSON with optimized options
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            range: headerRow,
            defval: null,
            blankrows: false, // Skip blank rows for performance
            raw: false, // Use formatted values
          });

          this.debugLog(`Excel file read - total rows: ${jsonData.length}`);
          resolve(jsonData as unknown[][]);
        } catch (error) {
          reject(new Error(`Error reading Excel file: ${error}`));
        }
      };

      reader.onerror = () => {
        reject(new Error("Error reading file"));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Imports management data from Excel file
   */
  async importGestaoFromExcel(
    file: File,
    shouldSave: boolean = true
  ): Promise<GestaoData[] | null> {
    try {
      const data = await this.importGestaoFromExcelInternal(file);

      if (data && shouldSave) {
        this.saveGestao(data);
      }

      return data;
    } catch (error) {
      console.error("Error importing management file:", error);
      throw new Error(`Error importing management file: ${error}`);
    }
  }

  /**
   * Optimized internal function to import management data from Excel
   */
  private async importGestaoFromExcelInternal(
    file: File
  ): Promise<GestaoData[]> {
    try {
      // Read Excel file
      const rawData = await this.readExcelSafe(file, 14);

      if (!rawData || rawData.length === 0) {
        throw new Error("Excel file is empty or has invalid format");
      }

      // First row should contain headers
      const headers = rawData[0] as string[];
      const dataRows = rawData.slice(1);

      // Optimize header processing
      const validColumns: Array<{
        index: number;
        name: string;
        normalized?: string;
      }> = [];

      headers.forEach((header, index) => {
        if (
          header &&
          header.toString().trim() &&
          !header.toString().startsWith("Unnamed")
        ) {
          const headerStr = header.toString().trim();
          const column: { index: number; name: string; normalized?: string } = {
            index,
            name: headerStr,
          };

          if (index === 0 && !headerStr.toLowerCase().includes("codigo")) {
            column.normalized = "codigo";
          } else if (index > 0) {
            try {
              column.normalized = normalizarNomeDocumento(headerStr);
            } catch (error) {
              console.log("Error normalizing document name:", error);
              column.normalized = headerStr
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "_");
            }
          }

          validColumns.push(column);
        }
      });

      if (validColumns.length === 0) {
        throw new Error("No valid columns found in file");
      }

      // Process data rows with optimized logic
      const processedData: GestaoData[] = [];
      const rowDataMap = new Map<string, Record<string, string>>();

      // Batch process rows for better performance
      const batchSize = 100;
      for (let i = 0; i < dataRows.length; i += batchSize) {
        const batch = dataRows.slice(i, i + batchSize);

        batch.forEach((row) => {
          if (!row || row.length === 0) return;

          const tempRowData: Record<string, string> = {};
          let codigo = "";

          // Process each valid column
          validColumns.forEach((column) => {
            const value = row[column.index];
            const stringValue = value ? value.toString().trim() : "";

            if (column.index === 0) {
              codigo = stringValue;
              tempRowData["codigo"] = codigo;
            } else if (column.normalized && stringValue) {
              const normalized = column.normalized;

              if (tempRowData[normalized]) {
                // Combine values efficiently
                const existing = tempRowData[normalized].toUpperCase().trim();
                const newValue = stringValue.toUpperCase().trim();

                tempRowData[normalized] =
                  existing === "X" || newValue === "X"
                    ? "X"
                    : existing || stringValue;
              } else {
                tempRowData[normalized] = stringValue;
              }
            }
          });

          // Only add rows with valid codigo
          if (codigo) {
            rowDataMap.set(codigo, tempRowData);
          }
        });
      }

      // Convert map to array
      rowDataMap.forEach((rowData) => {
        const finalRowData: GestaoData = { codigo: rowData.codigo || "" };

        Object.entries(rowData).forEach(([key, value]) => {
          if (key !== "codigo") {
            finalRowData[key] = value ? value.trim() : "";
          }
        });

        processedData.push(finalRowData);
      });

      return processedData;
    } catch (error) {
      console.error("Error importing management file:", error);
      throw error;
    }
  }

  /**
   * Imports houses of prayer from Excel file
   */
  async importCasasFromExcel(file: File): Promise<CasaOracao[]> {
    try {
      // Validate file extension
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
        throw new Error("File must be Excel format (.xlsx or .xls)");
      }

      this.debugLog(`Trying to read file: ${file.name}`);

      // Read Excel file starting from row 15 (Python header=14 means row 14 is header, data starts at row 15)
      const rawData = await this.readExcelSafe(file, 15);

      if (!rawData || rawData.length === 0) {
        throw new Error(
          "Excel file is empty or has no data starting from row 16"
        );
      }

      // Remove completely empty rows efficiently
      const nonEmptyRows = rawData.filter(
        (row) =>
          row &&
          row.some(
            (cell) =>
              cell !== undefined &&
              cell !== null &&
              cell.toString().trim() !== ""
          )
      );

      if (nonEmptyRows.length === 0) {
        throw new Error("No data found after removing empty rows");
      }

      // Use the first row as column names (following Python logic)
      const firstRow = nonEmptyRows[0];
      const columnNames: string[] = [];

      firstRow.forEach((cell, index) => {
        if (cell !== undefined && cell !== null && cell.toString().trim()) {
          columnNames.push(cell.toString().trim());
        } else {
          columnNames.push(`Column_${index}`);
        }
      });

      // Remove the first row (now used as headers) and get data rows
      const dataRows = nonEmptyRows.slice(1);

      // Optimize column filtering
      const validColumnIndices: number[] = [];
      const removedColumns: string[] = [];

      columnNames.forEach((columnName, colIndex) => {
        const hasValidHeader =
          columnName &&
          !columnName.startsWith("Column_") &&
          columnName.trim() !== "";

        const hasData = dataRows.some(
          (row) =>
            row[colIndex] !== undefined &&
            row[colIndex] !== null &&
            row[colIndex].toString().trim() !== ""
        );

        if (hasValidHeader || hasData) {
          validColumnIndices.push(colIndex);
        } else {
          removedColumns.push(`[${colIndex}] ${columnName || "empty"}`);
        }
      });

      this.debugLog(`Removed columns: ${removedColumns.join(", ")}`);
      this.debugLog(`Valid column indices: ${validColumnIndices.join(", ")}`);

      // Filter columns and rows efficiently
      const finalColumnNames = validColumnIndices.map(
        (index) => columnNames[index]
      );
      const finalDataRows = dataRows
        .map((row) => validColumnIndices.map((index) => row[index]))
        .filter((row) =>
          row.some(
            (cell) =>
              cell !== undefined &&
              cell !== null &&
              cell.toString().trim() !== ""
          )
        );

      // Optimize column mapping
      const createColumnMapping = (
        headers: string[]
      ): Record<string, string> => {
        const mapping: Record<string, string> = {};

        headers.forEach((header) => {
          const normalized = header.toLowerCase().trim();

          if (
            normalized.includes("codigo") ||
            normalized.includes("código") ||
            normalized.includes("administra") ||
            normalized === "cod"
          ) {
            mapping["codigo"] = header;
          } else if (
            normalized.includes("nome") ||
            normalized.includes("título") ||
            normalized.includes("titulo") ||
            normalized.includes("denominação") ||
            normalized.includes("denominacao") ||
            normalized.includes("casa") ||
            (normalized.includes("casa") && normalized.includes("oração")) ||
            (normalized.includes("casa") && normalized.includes("oracao"))
          ) {
            mapping["nome"] = header;
          } else if (
            normalized.includes("tipo") &&
            normalized.includes("imov")
          ) {
            mapping["tipo_imovel"] = header;
          } else if (
            normalized.includes("endereco") ||
            normalized.includes("endereço") ||
            normalized.includes("local") ||
            normalized.includes("rua")
          ) {
            mapping["endereco"] = header;
          } else if (
            normalized.includes("status") ||
            normalized.includes("situacao") ||
            normalized.includes("situação") ||
            normalized.includes("estado")
          ) {
            mapping["status"] = header;
          } else if (
            normalized.includes("observa") ||
            normalized.includes("obs") ||
            normalized.includes("comentar") ||
            normalized.includes("notas")
          ) {
            mapping["observacoes"] = header;
          }
        });

        return mapping;
      };

      const columnMapping = createColumnMapping(finalColumnNames);

      this.debugLog(`Available columns: ${finalColumnNames.join(", ")}`);
      this.debugLog(`Total columns found: ${finalColumnNames.length}`);
      this.debugLog(
        `Column mapping: ${JSON.stringify(columnMapping, null, 2)}`
      );
      if (this.isDebugMode && finalDataRows.length > 0) {
        this.debugLog(
          `Sample of first few data rows:`,
          finalDataRows.slice(0, 2)
        );
      }

      // Auto-detect codigo and nome if not found
      if (!columnMapping["codigo"] && !columnMapping["nome"]) {
        if (finalColumnNames.length >= 1) {
          columnMapping["codigo"] = finalColumnNames[0];
          this.debugLog(
            `Using first column '${finalColumnNames[0]}' as codigo`
          );
        }
        if (finalColumnNames.length >= 2) {
          columnMapping["nome"] = finalColumnNames[1];
          this.debugLog(`Using second column '${finalColumnNames[1]}' as nome`);
        }
      }

      // Final validation
      if (!columnMapping["codigo"] && !columnMapping["nome"]) {
        throw new Error(
          `Could not identify codigo or nome columns.\n` +
            `Available columns: ${finalColumnNames.join(", ")}\n` +
            `Expected columns like: codigo/código/administração, nome/título/denominação`
        );
      }

      // Process each row efficiently
      const casas: CasaOracao[] = [];

      finalDataRows.forEach((row, index) => {
        try {
          if (!row || row.length === 0) return;

          const rowData: Record<string, string> = {};

          // Use column mapping to find the correct positions for each field
          const casaOracaoIndex = finalColumnNames.indexOf("Casa de Oração");
          const tipoImovelIndex = finalColumnNames.indexOf("Tipo de Imóvel");

          if (casaOracaoIndex >= 0 && row[casaOracaoIndex]) {
            const casaInfo = row[casaOracaoIndex]?.toString().trim() || "";

            if (casaInfo.includes(" - ")) {
              const parts = casaInfo.split(" - ");
              rowData["codigo"] = parts[0]?.trim() || "";
              rowData["nome"] = parts.slice(1).join(" - ").trim() || "";
            } else {
              rowData["codigo"] = "";
              rowData["nome"] = casaInfo;
            }
          }

          if (tipoImovelIndex >= 0 && row[tipoImovelIndex]) {
            rowData["tipo_imovel"] =
              row[tipoImovelIndex]?.toString().trim() || "";
          }

          // Optimize column processing - only debug log when in debug mode
          if (this.isDebugMode) {
            this.debugLog(`Row ${index + 1} total length: ${row.length}`);
            this.debugLog(
              `Row ${index + 1} all values:`,
              row.map((val, idx) => `[${idx}]: ${val}`)
            );
          }

          // Map columns efficiently
          finalColumnNames.forEach((columnName, colIndex) => {
            const cellValue = row[colIndex]?.toString().trim() || "";
            if (cellValue && cellValue !== "undefined") {
              const normalizedColumnName = columnName.toLowerCase().trim();

              if (
                normalizedColumnName.includes("endereço") ||
                normalizedColumnName.includes("endereco")
              ) {
                rowData["endereco"] = cellValue;
                this.debugLog(
                  `Found endereco in column '${columnName}' at position ${colIndex}: ${cellValue}`
                );
              }

              if (
                normalizedColumnName.includes("status") ||
                normalizedColumnName.includes("situação") ||
                normalizedColumnName.includes("situacao")
              ) {
                rowData["status"] = cellValue;
                this.debugLog(
                  `Found status in column '${columnName}' at position ${colIndex}: ${cellValue}`
                );
              }
            }
          });

          // Fallback search - only when needed
          if (!rowData["endereco"] || !rowData["status"]) {
            for (let i = 0; i < row.length; i++) {
              const cellValue = row[i]?.toString().trim() || "";
              if (cellValue && cellValue !== "undefined") {
                if (
                  !rowData["endereco"] &&
                  (cellValue.includes("RUA") ||
                    cellValue.includes("AVENIDA") ||
                    cellValue.includes("ESTRADA") ||
                    cellValue.includes("ALAMEDA") ||
                    cellValue.includes("PRAÇA") ||
                    cellValue.includes("TRAVESSA") ||
                    (/\d+/.test(cellValue) && cellValue.includes(",")))
                ) {
                  rowData["endereco"] = cellValue;
                  this.debugLog(
                    `Found endereco at fallback position ${i}: ${cellValue}`
                  );
                }
                if (
                  !rowData["status"] &&
                  (cellValue.toLowerCase().includes("ativo") ||
                    cellValue.toLowerCase().includes("inativo") ||
                    cellValue.toLowerCase().includes("pendente") ||
                    cellValue.toLowerCase().includes("ativa") ||
                    cellValue.toLowerCase().includes("inativa"))
                ) {
                  rowData["status"] = cellValue;
                  this.debugLog(
                    `Found status at fallback position ${i}: ${cellValue}`
                  );
                }
              }
            }
          }

          // Optimize debugging
          if (this.isDebugMode) {
            this.debugLog(`Row ${index + 1} raw data:`, row);
            this.debugLog(`Row ${index + 1} mapped data:`, rowData);
          }

          // Validate required fields
          const codigo = rowData.codigo?.trim();
          const nome = rowData.nome?.trim();

          if (!codigo || !nome) {
            this.debugLog(
              `Row ${
                index + 1
              } ignored: empty code or name (codigo: "${codigo}", nome: "${nome}")`
            );
            return;
          }

          this.debugLog(
            `Processing row ${index + 1}: code=${codigo}, name=${nome}`
          );

          // Create Casa object
          const casa: CasaOracao = {
            codigo,
            nome,
            tipo_imovel: rowData.tipo_imovel?.trim() || undefined,
            endereco: rowData.endereco?.trim() || undefined,
            observacoes: rowData.observacoes?.trim() || undefined,
            status: rowData.status?.trim() || undefined,
          };

          casas.push(casa);
        } catch (error) {
          console.error(`Error processing row ${index + 1}:`, error);
        }
      });

      if (casas.length === 0) {
        throw new Error("No valid houses of prayer found in file");
      }

      console.log(`Total houses imported: ${casas.length}`);

      // Save houses to storage
      if (this.saveCasas(casas)) {
        console.log("Houses saved successfully");
        return casas;
      } else {
        throw new Error("Error saving houses to storage");
      }
    } catch (error) {
      console.error("Error importing houses file:", error);
      throw new Error(`Error importing file: ${error}`);
    }
  }

  /**
   * Saves a house of prayer
   */
  saveCasa(
    casa: CasaOracao,
    oldCasa?: CasaOracao
  ): { success: boolean; message: string } {
    try {
      // Validate required fields
      if (!casa.codigo?.trim() || !casa.nome?.trim()) {
        return {
          success: false,
          message: "Code and name are required fields!",
        };
      }

      // Load existing houses
      const casas = this.loadCasas();

      // If editing, check if code changed
      if (oldCasa && oldCasa.codigo !== casa.codigo) {
        // Check if new code already exists
        if (casas.some((c) => c.codigo === casa.codigo)) {
          return {
            success: false,
            message: "A house with this code already exists!",
          };
        }
      }

      if (oldCasa) {
        // Update existing house
        const updatedCasas = casas.map((c) =>
          c.codigo === oldCasa.codigo ? casa : c
        );

        if (this.saveCasas(updatedCasas)) {
          return {
            success: true,
            message: "House of prayer updated successfully!",
          };
        }
      } else {
        // Check if code already exists
        if (casas.some((c) => c.codigo === casa.codigo)) {
          return {
            success: false,
            message: "A house with this code already exists!",
          };
        }

        // Add new house
        casas.push(casa);

        if (this.saveCasas(casas)) {
          return {
            success: true,
            message: "House of prayer saved successfully!",
          };
        }
      }

      return { success: false, message: "Error saving house of prayer" };
    } catch (error) {
      return {
        success: false,
        message: `Error saving house of prayer: ${error}`,
      };
    }
  }

  /**
   * Deletes a house of prayer
   */
  deleteCasa(codigo: string): { success: boolean; message: string } {
    try {
      const casas = this.loadCasas();
      const filteredCasas = casas.filter((casa) => casa.codigo !== codigo);

      if (this.saveCasas(filteredCasas)) {
        return {
          success: true,
          message: "House of prayer deleted successfully!",
        };
      }

      return { success: false, message: "Error deleting house of prayer" };
    } catch (error) {
      return {
        success: false,
        message: `Error deleting house of prayer: ${error}`,
      };
    }
  }

  /**
   * Loads gestao vista data from storage
   */
  loadGestaoVista(): GestaoVistaData[] {
    try {
      if (typeof window !== "undefined") {
        const data = localStorage.getItem("gestaoVista");
        // Parse dates from JSON
        const parsed = data ? JSON.parse(data) : [];
        return parsed.map((item: unknown) => {
          const typedItem = item as GestaoVistaData & {
            documentos: Array<Record<string, unknown>>;
          };
          return {
            ...typedItem,
            documentos: typedItem.documentos.map((doc) => ({
              ...doc,
              dataEmissao:
                typeof doc.dataEmissao === "string"
                  ? new Date(doc.dataEmissao)
                  : undefined,
              dataValidade:
                typeof doc.dataValidade === "string"
                  ? new Date(doc.dataValidade)
                  : undefined,
            })) as DocumentoDetalhado[],
          };
        });
      }
      return [];
    } catch (error) {
      console.error("Error loading gestao vista data:", error);
      return [];
    }
  }

  /**
   * Saves gestao vista data to storage
   */
  saveGestaoVista(data: GestaoVistaData[]): boolean {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("gestaoVista", JSON.stringify(data));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error saving gestao vista data:", error);
      return false;
    }
  }

  /**
   * Clears gestao vista data
   */
  clearGestaoVista(): boolean {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("gestaoVista");
        localStorage.setItem("gestaoVista", JSON.stringify([]));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error clearing gestao vista data:", error);
      return false;
    }
  }

  /**
   * Imports gestao vista data from Excel file
   */
  async importGestaoVistaFromExcel(
    file: File,
    shouldSave: boolean = true
  ): Promise<GestaoVistaData[] | null> {
    try {
      const newData = await this.importGestaoVistaFromExcelInternal(file);

      if (newData && shouldSave) {
        // Merge with existing data to avoid duplicates
        const mergedData = this.mergeGestaoVistaData(newData);
        this.saveGestaoVista(mergedData);
        return mergedData;
      }

      return newData;
    } catch (error) {
      console.error("Error importing gestao vista file:", error);
      throw new Error(`Error importing gestao vista file: ${error}`);
    }
  }

  /**
   * Internal method to import gestao vista data from Excel
   */
  private async importGestaoVistaFromExcelInternal(
    file: File
  ): Promise<GestaoVistaData[]> {
    try {
      // Read Excel with header starting at row 11 (index 10)
      const data = await this.readExcelSafe(file, 10);

      if (!data || data.length === 0) {
        throw new Error("Excel file is empty or invalid");
      }

      this.debugLog("Raw Excel data:", data);

      const gestaoVistaData: GestaoVistaData[] = [];
      const casasProcessadas = new Map<string, GestaoVistaData>();

      // Process data starting from row 13 (index 2 after header row 11)
      for (let i = 2; i < data.length; i += 2) {
        // Pula uma linha entre registros
        const row = data[i] as unknown[];

        if (!row || row.length === 0) {
          this.debugLog(`Row ${i + 1} is empty, skipping`);
          continue;
        }

        try {
          // Extract codigo da casa from column 4 (index 3)
          const codigoCompleto = row[3]?.toString().trim();
          if (!codigoCompleto) {
            this.debugLog(`Row ${i + 1}: No code found in column 4, skipping`);
            continue;
          }

          // Extract the code part (before the " - ")
          const codigo = codigoCompleto.split(" - ")[0]?.trim();
          if (!codigo) {
            this.debugLog(
              `Row ${
                i + 1
              }: Could not extract code from "${codigoCompleto}", skipping`
            );
            continue;
          }

          // Extract document info from column 8 (index 7)
          const documentoCompleto = row[7]?.toString().trim();
          if (!documentoCompleto) {
            this.debugLog(
              `Row ${i + 1}: No document found in column 8, skipping`
            );
            continue;
          }

          // Parse document code and name
          const documentoParts = documentoCompleto.split(" ", 2);
          const codigoDocumento = documentoParts[0]?.trim();
          const nomeDocumento = documentoCompleto
            .substring(codigoDocumento.length)
            .trim();

          if (!codigoDocumento || !nomeDocumento) {
            this.debugLog(
              `Row ${
                i + 1
              }: Could not parse document "${documentoCompleto}", skipping`
            );
            continue;
          }

          // Get or create casa data
          let casaData = casasProcessadas.get(codigo);
          if (!casaData) {
            casaData = {
              codigo,
              documentos: [],
            };
            casasProcessadas.set(codigo, casaData);
          }

          // Extract dates from columns 14 and 16 (indexes 13 and 15)
          const dataEmissaoStr = row[13]?.toString().trim();
          const dataValidadeStr = row[15]?.toString().trim();

          let dataEmissao: Date | undefined;
          let dataValidade: Date | undefined;

          // Parse dates - support multiple formats
          if (dataEmissaoStr && dataEmissaoStr !== "undefined") {
            dataEmissao = this.parseExcelDate(dataEmissaoStr);
          }

          if (dataValidadeStr && dataValidadeStr !== "undefined") {
            dataValidade = this.parseExcelDate(dataValidadeStr);
          }

          // Create document object
          const documento: DocumentoDetalhado = {
            codigo,
            codigoDocumento: findDocumentoByCodigo(
              codigoDocumento,
              nomeDocumento
            ),
            nomeDocumento,
            dataEmissao,
            dataValidade,
            presente: true, // If it's in the file, it's present
          };

          casaData.documentos.push(documento);

          this.debugLog(
            `Processed document for casa ${codigo}: ${nomeDocumento}`
          );
        } catch (error) {
          console.error(`Error processing row ${i + 1}:`, error);
        }
      }

      // Convert map to array
      gestaoVistaData.push(...casasProcessadas.values());

      if (gestaoVistaData.length === 0) {
        throw new Error("No valid gestao vista data found in file");
      }

      console.log(
        `Total casas with documents imported: ${gestaoVistaData.length}`
      );

      return gestaoVistaData;
    } catch (error) {
      console.error("Error importing gestao vista file:", error);
      throw new Error(`Error importing gestao vista file: ${error}`);
    }
  }

  /**
   * Helper to parse Excel dates in various formats
   * Prioritizes Brazilian date format (DD/MM/YYYY) to avoid MM/DD/YYYY confusion
   */
  private parseExcelDate(dateStr: string): Date | undefined {
    if (!dateStr || dateStr.trim() === "" || dateStr === "undefined") {
      return undefined;
    }

    try {
      // Try to parse as Excel serial number first
      const asNumber = parseFloat(dateStr);
      if (!isNaN(asNumber) && asNumber > 0) {
        // Excel serial date (days since 1900-01-01, with some adjustments)
        const excelEpoch = new Date(1900, 0, 1);
        const date = new Date(
          excelEpoch.getTime() + (asNumber - 1) * 24 * 60 * 60 * 1000
        );
        if (date.getFullYear() > 1900 && date.getFullYear() < 2100) {
          return date;
        }
      }

      // Try Brazilian date format (DD/MM/YYYY) first to avoid confusion with MM/DD/YYYY
      if (dateStr.includes("/")) {
        const parts = dateStr.split("/");
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1; // Month is 0-based
          const year = parseInt(parts[2]);

          // Validate day, month, and year ranges
          if (
            !isNaN(day) &&
            !isNaN(month) &&
            !isNaN(year) &&
            day >= 1 &&
            day <= 31 &&
            month >= 0 &&
            month <= 11 &&
            year >= 1900 &&
            year <= 2100
          ) {
            const date = new Date(year, month, day);
            if (
              !isNaN(date.getTime()) &&
              date.getDate() === day &&
              date.getMonth() === month
            ) {
              return date;
            }
          }
        }
      }

      // Try to parse as regular date string (fallback for other formats)
      const parsed = new Date(dateStr);
      if (
        !isNaN(parsed.getTime()) &&
        parsed.getFullYear() > 1900 &&
        parsed.getFullYear() < 2100
      ) {
        // Log a warning when using fallback parsing to help identify format issues
        console.warn(
          `Used fallback date parsing for: "${dateStr}" -> ${parsed.toLocaleDateString(
            "pt-BR"
          )}`
        );
        return parsed;
      }

      console.warn(`Could not parse date: "${dateStr}"`);
      return undefined;
    } catch (error) {
      console.warn(`Error parsing date "${dateStr}":`, error);
      return undefined;
    }
  }

  /**
   * Generate traditional gestao data from gestao vista data for compatibility
   * Only considers the most current valid document of each type
   */
  generateGestaoFromGestaoVista(
    gestaoVistaData: GestaoVistaData[]
  ): GestaoData[] {
    const gestaoData: GestaoData[] = [];

    // Get all unique normalized document names
    const allDocuments = new Set<string>();
    gestaoVistaData.forEach((casa) => {
      casa.documentos.forEach((doc) => {
        // Normalize document name for consistency
        const normalizedName = normalizarNomeDocumento(doc.nomeDocumento);
        allDocuments.add(normalizedName);
      });
    });

    // Convert each casa to gestao format
    gestaoVistaData.forEach((casa) => {
      const gestaoRow: GestaoData = {
        codigo: casa.codigo,
      };

      // Group documents by type and find the most current valid one
      const documentsByType = new Map<string, DocumentoDetalhado[]>();

      casa.documentos.forEach((doc) => {
        if (doc.presente) {
          const normalizedName = normalizarNomeDocumento(doc.nomeDocumento);
          if (!documentsByType.has(normalizedName)) {
            documentsByType.set(normalizedName, []);
          }
          documentsByType.get(normalizedName)!.push(doc);
        }
      });

      // For each document type, find the most current valid document
      const documentsPresent = new Set<string>();
      documentsByType.forEach((docs, docType) => {
        const mostCurrentValidDoc = this.getMostCurrentValidDocument(docs);
        if (mostCurrentValidDoc) {
          documentsPresent.add(docType);
        }
      });

      // Mark present documents with 'X'
      documentsPresent.forEach((docName) => {
        gestaoRow[docName] = "X";
      });

      // Set empty string for missing documents
      allDocuments.forEach((docName) => {
        if (!(docName in gestaoRow)) {
          gestaoRow[docName] = "";
        }
      });

      gestaoData.push(gestaoRow);
    });

    return gestaoData;
  }

  /**
   * Check if a document is valid (not expired)
   */
  private isDocumentValid(doc: DocumentoDetalhado): boolean {
    // If no expiration date, consider valid
    if (!doc.dataValidade) {
      return true;
    }

    // Check if document is not expired
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for comparison

    const validadeDate = new Date(doc.dataValidade);
    validadeDate.setHours(0, 0, 0, 0);

    return validadeDate >= today;
  }

  /**
   * From a list of documents of the same type, return the most current valid one
   * Prioritizes: 1) Valid over invalid, 2) Most recent validity date, 3) Most recent emission date
   */
  private getMostCurrentValidDocument(
    docs: DocumentoDetalhado[]
  ): DocumentoDetalhado | null {
    if (docs.length === 0) {
      return null;
    }

    if (docs.length === 1) {
      return this.isDocumentValid(docs[0]) ? docs[0] : null;
    }

    // Separate valid and invalid documents
    const validDocs = docs.filter((doc) => this.isDocumentValid(doc));
    const invalidDocs = docs.filter((doc) => !this.isDocumentValid(doc));

    // If we have valid documents, work with those; otherwise consider invalid ones
    const candidateDocs = validDocs.length > 0 ? validDocs : invalidDocs;

    // Sort by validity date (most distant future first), then by emission date (most recent first)
    const sortedDocs = candidateDocs.sort((a, b) => {
      // First, compare validity dates
      if (a.dataValidade && b.dataValidade) {
        const validadeComparison =
          b.dataValidade.getTime() - a.dataValidade.getTime();
        if (validadeComparison !== 0) {
          return validadeComparison;
        }
      } else if (a.dataValidade && !b.dataValidade) {
        return -1; // a has validity date, b doesn't - prefer a
      } else if (!a.dataValidade && b.dataValidade) {
        return 1; // b has validity date, a doesn't - prefer b
      }

      // If validity dates are equal or both missing, compare emission dates
      if (a.dataEmissao && b.dataEmissao) {
        return b.dataEmissao.getTime() - a.dataEmissao.getTime(); // Most recent emission first
      } else if (a.dataEmissao && !b.dataEmissao) {
        return -1; // a has emission date, b doesn't - prefer a
      } else if (!a.dataEmissao && b.dataEmissao) {
        return 1; // b has emission date, a doesn't - prefer b
      }

      return 0; // Equal in all criteria
    });

    // Return the most current document only if it's valid, or null if no valid documents
    const mostCurrent = sortedDocs[0];
    return validDocs.length > 0 ? mostCurrent : null;
  }

  /**
   * Merge new gestao vista data with existing data, avoiding duplicates
   * and keeping the most recent/valid documents
   */
  private mergeGestaoVistaData(newData: GestaoVistaData[]): GestaoVistaData[] {
    const existingData = this.loadGestaoVista();
    const mergedMap = new Map<string, GestaoVistaData>();

    // First, add all existing casas to the map
    existingData.forEach((casa) => {
      mergedMap.set(casa.codigo, { ...casa });
    });

    // Then merge new data
    newData.forEach((newCasa) => {
      const existingCasa = mergedMap.get(newCasa.codigo);

      if (!existingCasa) {
        // New casa, add it directly
        mergedMap.set(newCasa.codigo, { ...newCasa });
      } else {
        // Merge documents for existing casa
        const mergedDocuments = this.mergeDocuments(
          existingCasa.documentos,
          newCasa.documentos
        );

        mergedMap.set(newCasa.codigo, {
          ...existingCasa,
          documentos: mergedDocuments,
        });
      }
    });

    return Array.from(mergedMap.values());
  }

  /**
   * Merge document arrays, keeping all documents but organizing by type
   * Multiple documents of the same type are allowed (with different validity dates)
   */
  private mergeDocuments(
    existingDocs: DocumentoDetalhado[],
    newDocs: DocumentoDetalhado[]
  ): DocumentoDetalhado[] {
    const allDocuments: DocumentoDetalhado[] = [];
    const documentsByType = new Map<string, DocumentoDetalhado[]>();

    // Helper to create a unique key for each document type
    const getDocumentKey = (doc: DocumentoDetalhado): string => {
      return normalizarNomeDocumento(doc.nomeDocumento);
    };

    // Helper to create a unique identifier for each specific document instance
    const getDocumentInstanceKey = (doc: DocumentoDetalhado): string => {
      const baseKey = getDocumentKey(doc);
      const emissaoStr = doc.dataEmissao?.toISOString() || "no-emission";
      const validadeStr = doc.dataValidade?.toISOString() || "no-validity";
      return `${baseKey}_${emissaoStr}_${validadeStr}`;
    };

    // Combine all documents first
    const allCombined = [...existingDocs, ...newDocs];
    const seenInstances = new Set<string>();

    // Remove exact duplicates (same type, same dates)
    allCombined.forEach((doc) => {
      const instanceKey = getDocumentInstanceKey(doc);
      if (!seenInstances.has(instanceKey)) {
        seenInstances.add(instanceKey);
        allDocuments.push(doc);

        // Group by type for easier processing
        const typeKey = getDocumentKey(doc);
        if (!documentsByType.has(typeKey)) {
          documentsByType.set(typeKey, []);
        }
        documentsByType.get(typeKey)!.push(doc);
      }
    });

    return allDocuments;
  }

  /**
   * Determine if we should replace an existing document with a new one
   * Prioritizes: 1) Valid over invalid, 2) More recent emission date
   */
  private shouldReplaceDocument(
    existing: DocumentoDetalhado,
    newDoc: DocumentoDetalhado
  ): boolean {
    const existingValid = this.isDocumentValid(existing);
    const newValid = this.isDocumentValid(newDoc);

    // If validity differs, prefer the valid one
    if (existingValid !== newValid) {
      return newValid; // Replace if new is valid and existing is not
    }

    // If both have same validity, prefer more recent emission date
    if (existing.dataEmissao && newDoc.dataEmissao) {
      return newDoc.dataEmissao > existing.dataEmissao;
    }

    // If only one has emission date, prefer that one
    if (newDoc.dataEmissao && !existing.dataEmissao) {
      return true;
    }

    // Otherwise keep existing
    return false;
  }
}

import * as XLSX from "xlsx";
import { CasaOracao, GestaoData } from "../types/churchs";
import { normalizarNomeDocumento } from "../utils/constants";

export class DataService {
  private readonly dataDir: string;
  private readonly gestaoFile: string;
  private readonly casasFile: string;

  constructor(dataDir: string = "data") {
    this.dataDir = dataDir;
    this.gestaoFile = `${dataDir}/gestao.json`;
    this.casasFile = `${dataDir}/casas.json`;

    // Initialize data directory and files if needed
    this.initializeDataFiles();
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
   * Safely reads an Excel file
   */
  private readExcelSafe(file: File, headerRow: number = 14): Promise<any[][]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });

          // Get the first worksheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Convert to JSON with header row specified and force reading more columns
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            range: headerRow,
            defval: null, // Fill empty cells with null instead of skipping
            blankrows: true, // Include blank rows
          });

          // Debug log to see what we're actually reading
          console.log(`Excel file read - total rows: ${jsonData.length}`);
          if (jsonData.length > 0) {
            console.log(`First row length: ${(jsonData[0] as any[])?.length}`);
            console.log(`First row content:`, jsonData[0]);
          }

          resolve(jsonData as any[][]);
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
   * Internal function to import management data from Excel
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

      // Clean headers - remove empty columns
      const cleanHeaders: string[] = [];
      const validColumnIndices: number[] = [];

      headers.forEach((header, index) => {
        if (
          header &&
          header.toString().trim() &&
          !header.toString().startsWith("Unnamed")
        ) {
          cleanHeaders.push(header.toString().trim());
          validColumnIndices.push(index);
        }
      });

      if (cleanHeaders.length === 0) {
        throw new Error("No valid columns found in file");
      }

      // Ensure first column is "codigo"
      if (!cleanHeaders[0].toLowerCase().includes("codigo")) {
        cleanHeaders[0] = "codigo";
      }

      // Process data rows - collect all values first, then combine duplicates (following Python logic)
      const processedData: GestaoData[] = [];

      dataRows.forEach((row, rowIndex) => {
        if (!row || row.length === 0) return;

        const tempRowData: Record<string, string> = {};

        // Step 1: Collect all values with normalized column names
        cleanHeaders.forEach((header, headerIndex) => {
          const colIndex = validColumnIndices[headerIndex];
          const value = row[colIndex];

          if (headerIndex === 0) {
            // Handle codigo column
            tempRowData["codigo"] = value ? value.toString().trim() : "";
          } else {
            try {
              const normalized = normalizarNomeDocumento(header);
              const stringValue = value ? value.toString().trim() : "";

              // Check if this normalized name already exists
              if (tempRowData[normalized] !== undefined) {
                // Combine values: "X" if any value is "X", otherwise keep first non-empty value
                const existingValue = tempRowData[normalized]
                  .toUpperCase()
                  .trim();
                const newValue = stringValue.toUpperCase().trim();

                if (existingValue === "X" || newValue === "X") {
                  tempRowData[normalized] = "X";
                } else if (!existingValue && stringValue) {
                  tempRowData[normalized] = stringValue;
                }
              } else {
                tempRowData[normalized] = stringValue;
              }
            } catch (error) {
              console.error(`Error normalizing column ${header}:`, error);
              const fallbackName = header
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "_");
              tempRowData[fallbackName] = value ? value.toString().trim() : "";
            }
          }
        });

        // Step 2: Create final row object - keep ALL columns (like Python)
        const finalRowData: GestaoData = { codigo: tempRowData.codigo || "" };

        Object.entries(tempRowData).forEach(([key, value]) => {
          if (key !== "codigo") {
            // Keep all columns, even empty ones (following Python behavior)
            finalRowData[key] = value ? value.trim() : "";
          }
        });

        // Only add rows with valid codigo
        if (finalRowData.codigo) {
          processedData.push(finalRowData);
        }
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

      console.log(`Trying to read file: ${file.name}`);

      // Read Excel file starting from row 15 (Python header=14 means row 14 is header, data starts at row 15)
      const rawData = await this.readExcelSafe(file, 15);

      if (!rawData || rawData.length === 0) {
        throw new Error(
          "Excel file is empty or has no data starting from row 16"
        );
      }

      // Remove completely empty rows
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

      // Remove empty columns and rows (following Python logic)
      const validColumnIndices: number[] = [];
      const removedColumns: string[] = [];

      columnNames.forEach((columnName, colIndex) => {
        // Keep column if:
        // 1. Header has a meaningful name (not empty or generic)
        // 2. OR column has any data in the rows
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

      console.log(`Removed columns: ${removedColumns.join(", ")}`);
      console.log(`Valid column indices: ${validColumnIndices.join(", ")}`);

      // Filter columns to keep only valid ones
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

      // Create column mapping for flexible header recognition
      const createColumnMapping = (
        headers: string[]
      ): Record<string, string> => {
        const mapping: Record<string, string> = {};

        headers.forEach((header) => {
          const normalized = header.toLowerCase().trim();

          // Map different variations to standard field names
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

      console.log(`Available columns: ${finalColumnNames.join(", ")}`);
      console.log(`Total columns found: ${finalColumnNames.length}`);
      console.log(`Column mapping: ${JSON.stringify(columnMapping, null, 2)}`);
      console.log(`Sample of first few data rows:`, finalDataRows.slice(0, 2));

      // Check if we have at least codigo or nome mapped
      if (!columnMapping["codigo"] && !columnMapping["nome"]) {
        // If no standard mapping found, try to use the first column as codigo and second as nome
        if (finalColumnNames.length >= 1) {
          columnMapping["codigo"] = finalColumnNames[0];
          console.log(`Using first column '${finalColumnNames[0]}' as codigo`);
        }
        if (finalColumnNames.length >= 2) {
          columnMapping["nome"] = finalColumnNames[1];
          console.log(`Using second column '${finalColumnNames[1]}' as nome`);
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

      // Process each row
      const casas: CasaOracao[] = [];

      finalDataRows.forEach((row, index) => {
        try {
          if (!row || row.length === 0) return;

          // Create object from row data using column mapping
          const rowData: Record<string, string> = {};

          // Use column mapping to find the correct positions for each field
          const casaOracaoIndex = finalColumnNames.indexOf("Casa de Oração");
          const tipoImovelIndex = finalColumnNames.indexOf("Tipo de Imóvel");

          if (casaOracaoIndex >= 0 && row[casaOracaoIndex]) {
            // Extract codigo and nome from "Casa de Oração" column: "BR 21-1346 - VILA JACIRA"
            const casaInfo = row[casaOracaoIndex]?.toString().trim() || "";

            if (casaInfo.includes(" - ")) {
              const parts = casaInfo.split(" - ");
              rowData["codigo"] = parts[0]?.trim() || "";
              rowData["nome"] = parts.slice(1).join(" - ").trim() || ""; // Join in case there are multiple " - "
            } else {
              // If no separator found, use the whole string as nome and leave codigo empty
              rowData["codigo"] = "";
              rowData["nome"] = casaInfo;
            }
          }

          if (tipoImovelIndex >= 0 && row[tipoImovelIndex]) {
            rowData["tipo_imovel"] =
              row[tipoImovelIndex]?.toString().trim() || "";
          }

          // Log all values to debug (showing total length and all positions)
          console.log(`Row ${index + 1} total length: ${row.length}`);
          console.log(
            `Row ${index + 1} all values:`,
            row.map((val, idx) => `[${idx}]: ${val}`)
          );

          // Try to map by column headers instead of fixed positions
          finalColumnNames.forEach((columnName, colIndex) => {
            const cellValue = row[colIndex]?.toString().trim() || "";
            if (cellValue && cellValue !== "undefined") {
              const normalizedColumnName = columnName.toLowerCase().trim();

              // Check if this column is "Endereço"
              if (
                normalizedColumnName.includes("endereço") ||
                normalizedColumnName.includes("endereco")
              ) {
                rowData["endereco"] = cellValue;
                console.log(
                  `Found endereco in column '${columnName}' at position ${colIndex}: ${cellValue}`
                );
              }

              // Check if this column is "Status" or "Situação"
              if (
                normalizedColumnName.includes("status") ||
                normalizedColumnName.includes("situação") ||
                normalizedColumnName.includes("situacao")
              ) {
                rowData["status"] = cellValue;
                console.log(
                  `Found status in column '${columnName}' at position ${colIndex}: ${cellValue}`
                );
              }
            }
          });

          // Fallback: Try to find endereço and status in ANY position if not found in specific positions
          if (!rowData["endereco"] || !rowData["status"]) {
            for (let i = 0; i < row.length; i++) {
              const cellValue = row[i]?.toString().trim() || "";
              if (cellValue && cellValue !== "undefined") {
                // Check if this looks like an address (more comprehensive)
                if (
                  !rowData["endereco"] &&
                  (cellValue.includes("RUA") ||
                    cellValue.includes("AVENIDA") ||
                    cellValue.includes("ESTRADA") ||
                    cellValue.includes("ALAMEDA") ||
                    cellValue.includes("PRAÇA") ||
                    cellValue.includes("TRAVESSA") ||
                    (/\d+/.test(cellValue) && cellValue.includes(","))) // Has numbers and comma (address pattern)
                ) {
                  rowData["endereco"] = cellValue;
                  console.log(
                    `Found endereco at fallback position ${i}: ${cellValue}`
                  );
                }
                // Check if this looks like a status (more comprehensive)
                if (
                  !rowData["status"] &&
                  (cellValue.toLowerCase().includes("ativo") ||
                    cellValue.toLowerCase().includes("inativo") ||
                    cellValue.toLowerCase().includes("pendente") ||
                    cellValue.toLowerCase().includes("ativa") ||
                    cellValue.toLowerCase().includes("inativa"))
                ) {
                  rowData["status"] = cellValue;
                  console.log(
                    `Found status at fallback position ${i}: ${cellValue}`
                  );
                }
              }
            }
          }

          // Debug: log the actual row data
          console.log(`Row ${index + 1} raw data:`, row);
          console.log(`Row ${index + 1} mapped data:`, rowData);

          // Validate required fields
          const codigo = rowData.codigo?.trim();
          const nome = rowData.nome?.trim();

          if (!codigo || !nome) {
            console.log(
              `Row ${
                index + 1
              } ignored: empty code or name (codigo: "${codigo}", nome: "${nome}")`
            );
            return;
          }

          console.log(
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
}

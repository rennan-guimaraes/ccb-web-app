import * as XLSX from "xlsx";
import { CasaOracao, GestaoData } from "../types/casaOracao";
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

          // Convert to JSON with header row specified
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            range: headerRow,
          });

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

      // Read Excel file
      const rawData = await this.readExcelSafe(file, 0);

      if (!rawData || rawData.length === 0) {
        throw new Error("Excel file is empty");
      }

      // First row contains headers
      const headers = rawData[0] as string[];
      const dataRows = rawData.slice(1);

      // Normalize and validate headers
      const normalizedHeaders = headers.map((h) =>
        h ? h.toString().toLowerCase().trim() : ""
      );

      console.log(`Columns after normalization: ${normalizedHeaders}`);

      // Check required columns
      const requiredColumns = ["codigo", "nome"];
      const missingColumns = requiredColumns.filter(
        (col) => !normalizedHeaders.includes(col)
      );

      if (missingColumns.length > 0) {
        throw new Error(
          `Required columns not found: ${missingColumns.join(", ")}.\n` +
            `Available columns: ${normalizedHeaders.join(", ")}`
        );
      }

      // Process each row
      const casas: CasaOracao[] = [];

      dataRows.forEach((row, index) => {
        try {
          if (!row || row.length === 0) return;

          // Create object from row data
          const rowData: Record<string, string> = {};
          normalizedHeaders.forEach((header, colIndex) => {
            if (header && row[colIndex] !== undefined) {
              rowData[header] = row[colIndex]?.toString().trim() || "";
            }
          });

          // Validate required fields
          const codigo = rowData.codigo?.trim();
          const nome = rowData.nome?.trim();

          if (!codigo || !nome) {
            console.log(`Row ${index + 1} ignored: empty code or name`);
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

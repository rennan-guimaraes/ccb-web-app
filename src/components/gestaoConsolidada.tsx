"use client";

import React, { useState, useEffect } from "react";
import { DataService } from "../services/dataService";
import { GestaoVistaData, GestaoData, CasaOracao } from "../types/churchs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Calendar,
  Clock,
  Search,
  Eye,
  Trash2,
  RefreshCw,
  FileDown,
  Settings,
  Loader2,
  Grid3X3,
  BarChart3,
} from "lucide-react";
import GestaoVistaImport from "./gestaoVistaImport";
import { isDocumentoObrigatorio } from "../utils/constants";
import { DocumentosFaltantesService } from "../services/missingDocumentsService";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

interface GestaoConsolidadaProps {
  casas?: CasaOracao[];
}

export default function GestaoConsolidada({
  casas = [],
}: GestaoConsolidadaProps) {
  const [gestaoVistaData, setGestaoVistaData] = useState<GestaoVistaData[]>([]);
  const [gestaoData, setGestaoData] = useState<GestaoData[]>([]);
  const [filteredData, setFilteredData] = useState<GestaoVistaData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCasa, setSelectedCasa] = useState<GestaoVistaData | null>(
    null
  );
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [exportMode, setExportMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportUseExemptions, setExportUseExemptions] = useState(false);

  const dataService = new DataService();
  const documentosService = new DocumentosFaltantesService();

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Filter data based on search term (código or nome)
  useEffect(() => {
    if (!searchTerm) {
      setFilteredData(gestaoVistaData);
    } else {
      const filtered = gestaoVistaData.filter((casa) => {
        const searchLower = searchTerm.toLowerCase();

        // Search by código
        const matchesCodigo = casa.codigo.toLowerCase().includes(searchLower);

        // Search by nome (find corresponding casa from props)
        const casaInfo = casas.find((c) => c.codigo === casa.codigo);
        const matchesNome =
          casaInfo?.nome?.toLowerCase().includes(searchLower) || false;

        return matchesCodigo || matchesNome;
      });
      setFilteredData(filtered);
    }
  }, [searchTerm, gestaoVistaData, casas]);

  const loadData = () => {
    const gestaoVistaData = dataService.loadGestaoVista();
    const gestaoData = dataService.loadGestao();
    setGestaoVistaData(gestaoVistaData);
    setGestaoData(gestaoData);
  };

  const handleImportSuccess = (data: GestaoVistaData[]) => {
    loadData();

    // Automaticamente gerar dados tradicionais após importação
    const generatedGestaoData = dataService.generateGestaoFromGestaoVista(data);
    if (generatedGestaoData.length > 0) {
      dataService.saveGestao(generatedGestaoData);
      setGestaoData(generatedGestaoData);
      console.log(
        `Dados tradicionais gerados automaticamente: ${generatedGestaoData.length} registros`
      );
    }
  };

  const clearAllData = () => {
    if (confirm("Tem certeza que deseja limpar todos os dados de gestão?")) {
      dataService.clearGestaoVista();
      dataService.clearGestao();
      loadData();
    }
  };

  const formatDate = (date: Date | undefined): string => {
    if (!date) return "-";
    return new Intl.DateTimeFormat("pt-BR").format(date);
  };

  const isDateExpired = (date: Date | undefined): boolean => {
    if (!date) return false;
    return date < new Date();
  };

  const isDateExpiringSoon = (date: Date | undefined): boolean => {
    if (!date) return false;
    const today = new Date();
    const thirtyDaysFromNow = new Date(
      today.getTime() + 30 * 24 * 60 * 60 * 1000
    );
    return date > today && date <= thirtyDaysFromNow;
  };

  const getDateBadgeVariant = (
    date: Date | undefined
  ): "default" | "destructive" | "secondary" | "outline" => {
    if (isDateExpired(date)) return "destructive";
    if (isDateExpiringSoon(date)) return "secondary";
    return "default";
  };

  const generateGestaoTradicional = () => {
    const generatedGestaoData =
      dataService.generateGestaoFromGestaoVista(gestaoVistaData);
    if (generatedGestaoData.length > 0) {
      dataService.saveGestao(generatedGestaoData);
      setGestaoData(generatedGestaoData);
      alert(
        `Dados de gestão tradicional gerados com sucesso! ${generatedGestaoData.length} registros criados.`
      );
    } else {
      alert("Nenhum dado encontrado para gerar gestão tradicional.");
    }
  };

  const getTotalDocumentTypes = () => {
    const allTypes = new Set<string>();
    gestaoVistaData.forEach((casa) => {
      casa.documentos.forEach((doc) => {
        allTypes.add(doc.nomeDocumento);
      });
    });
    return allTypes.size;
  };

  const getValidDocuments = () => {
    return gestaoVistaData.reduce((total, casa) => {
      // Group documents by type and count only the most current valid ones
      const documentsByType = new Map<string, any[]>();

      casa.documentos.forEach((doc) => {
        const normalizedName = doc.nomeDocumento; // Using original name for now
        if (!documentsByType.has(normalizedName)) {
          documentsByType.set(normalizedName, []);
        }
        documentsByType.get(normalizedName)!.push(doc);
      });

      let validDocsForThisCasa = 0;
      documentsByType.forEach((docs) => {
        // Find the most current valid document of this type
        const validDocs = docs.filter(
          (doc) => !isDateExpired(doc.dataValidade)
        );
        if (validDocs.length > 0) {
          // Sort by validity date (most distant future first)
          const sortedValid = validDocs.sort((a, b) => {
            if (a.dataValidade && b.dataValidade) {
              return b.dataValidade.getTime() - a.dataValidade.getTime();
            }
            return 0;
          });
          validDocsForThisCasa += 1; // Count this document type as having a valid document
        }
      });

      return total + validDocsForThisCasa;
    }, 0);
  };

  const getDocumentsExpired = () => {
    return gestaoVistaData.reduce((total, casa) => {
      // Group documents by type and check only the most current ones
      const documentsByType = new Map<string, any[]>();

      casa.documentos.forEach((doc) => {
        const normalizedName = doc.nomeDocumento;
        if (!documentsByType.has(normalizedName)) {
          documentsByType.set(normalizedName, []);
        }
        documentsByType.get(normalizedName)!.push(doc);
      });

      let expiredCurrentDocsForThisCasa = 0;
      documentsByType.forEach((docs) => {
        // Find the most current document of this type
        let currentDoc;

        // First try to find the most current valid document
        const validDocs = docs.filter(
          (doc) => !isDateExpired(doc.dataValidade)
        );

        if (validDocs.length > 0) {
          // Sort valid documents by validity date (most distant future first)
          const sortedValid = validDocs.sort((a, b) => {
            if (a.dataValidade && b.dataValidade) {
              return b.dataValidade.getTime() - a.dataValidade.getTime();
            }
            return 0;
          });
          currentDoc = sortedValid[0];
        } else {
          // No valid documents - use the most recently expired one
          const sortedByValidity = docs.sort((a, b) => {
            if (a.dataValidade && b.dataValidade) {
              return b.dataValidade.getTime() - a.dataValidade.getTime();
            }
            return 0;
          });
          currentDoc = sortedByValidity[0];
        }

        // Check if the current document is expired
        if (currentDoc && isDateExpired(currentDoc.dataValidade)) {
          expiredCurrentDocsForThisCasa += 1;
        }
      });

      return total + expiredCurrentDocsForThisCasa;
    }, 0);
  };

  const getDocumentsExpiringSoon = () => {
    return gestaoVistaData.reduce((total, casa) => {
      // Group documents by type and check only the most current ones
      const documentsByType = new Map<string, any[]>();

      casa.documentos.forEach((doc) => {
        const normalizedName = doc.nomeDocumento;
        if (!documentsByType.has(normalizedName)) {
          documentsByType.set(normalizedName, []);
        }
        documentsByType.get(normalizedName)!.push(doc);
      });

      let expiringSoonCurrentDocsForThisCasa = 0;
      documentsByType.forEach((docs) => {
        // Find the most current valid document of this type
        const validDocs = docs.filter(
          (doc) => !isDateExpired(doc.dataValidade)
        );
        if (validDocs.length > 0) {
          // Sort by validity date (most distant future first)
          const sortedValid = validDocs.sort((a, b) => {
            if (a.dataValidade && b.dataValidade) {
              return b.dataValidade.getTime() - a.dataValidade.getTime();
            }
            return 0;
          });

          // Check if the most current valid document is expiring soon
          const mostCurrent = sortedValid[0];
          if (isDateExpiringSoon(mostCurrent.dataValidade)) {
            expiringSoonCurrentDocsForThisCasa += 1;
          }
        }
      });

      return total + expiringSoonCurrentDocsForThisCasa;
    }, 0);
  };

  const showCasaDetails = (casa: GestaoVistaData) => {
    setSelectedCasa(casa);
    setIsDetailsOpen(true);
  };

  // Função para preparar dados para exportação (similar à original)
  const prepareExportTableData = () => {
    if (!gestaoData || gestaoData.length === 0) return null;

    const documentosFaltantes = documentosService.loadDocumentosFaltantes();

    // Get all document types (columns except 'codigo')
    const tiposDocumentos = Object.keys(gestaoData[0]).filter(
      (key) => key !== "codigo"
    );

    // Filter documents that have at least one house with the document present
    const documentosComDados = tiposDocumentos.filter((documento) => {
      return gestaoData.some((gestao) => {
        const valor = gestao[documento];
        return valor?.toString().toUpperCase().trim() === "X";
      });
    });

    // Separate mandatory and optional documents (only those with data)
    const documentosObrigatorios = documentosComDados.filter((doc) =>
      isDocumentoObrigatorio(doc)
    );
    const documentosOpcionais = documentosComDados.filter(
      (doc) => !isDocumentoObrigatorio(doc)
    );

    interface DocumentoStatus {
      nome: string;
      presente: boolean;
      obrigatorio: boolean;
      desconsiderar: boolean;
    }

    const dadosTabela: {
      casa: CasaOracao;
      documentosObrigatorios: DocumentoStatus[];
      documentosOpcionais: DocumentoStatus[];
      percentualObrigatorios: number;
      percentualOpcionais: number;
    }[] = [];

    casas.forEach((casa) => {
      const gestao = gestaoData.find((g) => g.codigo === casa.codigo);
      if (!gestao) return;

      const processDocuments = (documentos: string[]): DocumentoStatus[] => {
        return documentos.map((documento) => {
          const valor = gestao[documento];
          const presente = valor?.toString().toUpperCase().trim() === "X";

          const faltanteInfo = documentosFaltantes.find(
            (d) => d.codigo === casa.codigo && d.documento === documento
          );

          // Check if document applies to property type
          const docNormalizado = documento.toLowerCase();
          const isDocumentoApenasProprio =
            docNormalizado.includes("averbacao") ||
            docNormalizado.includes("averbação") ||
            docNormalizado.includes("escritura") ||
            (docNormalizado.includes("compra") &&
              docNormalizado.includes("venda"));

          let desconsiderar = faltanteInfo?.desconsiderar || false;

          if (isDocumentoApenasProprio && casa.tipo_imovel) {
            const isImovelProprio = casa.tipo_imovel
              .toUpperCase()
              .startsWith("IP");
            if (!isImovelProprio) {
              desconsiderar = true;
            }
          }

          return {
            nome: documento,
            presente,
            obrigatorio: isDocumentoObrigatorio(documento),
            desconsiderar,
          };
        });
      };

      const docsObrigatorios = processDocuments(documentosObrigatorios);
      const docsOpcionais = processDocuments(documentosOpcionais);

      const calcPercentual = (docs: DocumentoStatus[]) => {
        if (docs.length === 0) return 0;

        let total = 0;
        docs.forEach((doc) => {
          if (doc.presente) {
            total += 1;
          } else if (exportUseExemptions && doc.desconsiderar) {
            total += 1;
          }
        });

        return (total / docs.length) * 100;
      };

      dadosTabela.push({
        casa,
        documentosObrigatorios: docsObrigatorios,
        documentosOpcionais: docsOpcionais,
        percentualObrigatorios: calcPercentual(docsObrigatorios),
        percentualOpcionais: calcPercentual(docsOpcionais),
      });
    });

    return {
      dadosTabela,
      documentosObrigatorios: documentosObrigatorios,
      documentosOpcionais: documentosOpcionais,
    };
  };

  const getCellColor = (doc: {
    nome: string;
    presente: boolean;
    obrigatorio: boolean;
    desconsiderar: boolean;
  }): string => {
    if (doc.presente) return "bg-green-500";
    if (exportUseExemptions && doc.desconsiderar) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Helper function to compress canvas image
  const compressCanvasImage = (
    canvas: HTMLCanvasElement,
    quality: number = 0.7
  ): string => {
    // Convert to JPEG with compression for smaller file size
    return canvas.toDataURL("image/jpeg", quality);
  };

  const exportToPDF = async () => {
    const tableElement = document.getElementById("export-table-view");
    if (!tableElement) {
      alert("Tabela não encontrada para exportação.");
      return;
    }

    setIsExporting(true);
    try {
      // Temporariamente mostrar o elemento para captura
      const wasHidden = tableElement.classList.contains("hidden");
      if (wasHidden) {
        tableElement.classList.remove("hidden");
        tableElement.style.position = "absolute";
        tableElement.style.left = "-9999px";
        tableElement.style.top = "0";
      }

      // Aguardar um pequeno delay para garantir que o elemento seja renderizado
      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(tableElement, {
        scale: 1,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: tableElement.scrollWidth,
        height: tableElement.scrollHeight,
        logging: false,
        imageTimeout: 15000,
        removeContainer: true,
      });

      // Restaurar estado original do elemento
      if (wasHidden) {
        tableElement.classList.add("hidden");
        tableElement.style.position = "";
        tableElement.style.left = "";
        tableElement.style.top = "";
      }

      const imgData = compressCanvasImage(canvas);
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a3",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Debug: log das dimensões
      console.log("Dimensões do canvas:", { imgWidth, imgHeight });
      console.log("Dimensões do PDF:", { pdfWidth, pdfHeight });

      // Validar dimensões antes de calcular
      if (!imgWidth || !imgHeight || imgWidth <= 0 || imgHeight <= 0) {
        throw new Error(
          `Dimensões da imagem inválidas: ${imgWidth}x${imgHeight}`
        );
      }

      const ratioX = pdfWidth / imgWidth;
      const ratioY = (pdfHeight - 20) / imgHeight; // Deixar margem de 20mm
      const ratio = Math.min(ratioX, ratioY);

      // Validar ratio
      if (!ratio || ratio <= 0 || !isFinite(ratio)) {
        throw new Error(`Ratio de escala inválido: ${ratio}`);
      }

      const scaledWidth = imgWidth * ratio;
      const scaledHeight = imgHeight * ratio;
      const imgX = Math.max(0, (pdfWidth - scaledWidth) / 2);
      const imgY = Math.max(10, (pdfHeight - scaledHeight) / 2);

      // Validar coordenadas finais
      if (
        !isFinite(imgX) ||
        !isFinite(imgY) ||
        !isFinite(scaledWidth) ||
        !isFinite(scaledHeight)
      ) {
        throw new Error(
          `Coordenadas calculadas são inválidas: x=${imgX}, y=${imgY}, w=${scaledWidth}, h=${scaledHeight}`
        );
      }

      console.log("Coordenadas finais:", {
        imgX,
        imgY,
        scaledWidth,
        scaledHeight,
      });

      pdf.addImage(imgData, "JPEG", imgX, imgY, scaledWidth, scaledHeight);

      const fileName = `tabela_gestao_vista_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      alert(`Erro ao gerar PDF: ${errorMessage}. Tente novamente.`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            Gestão de Documentos
          </CardTitle>
          <CardDescription>
            Sistema unificado com controle de datas e visualizações avançadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex gap-2">
              <GestaoVistaImport onImportSuccess={handleImportSuccess} />
              {gestaoVistaData.length > 0 && gestaoData.length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateGestaoTradicional}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regerar Dados Tradicional
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllData}
                disabled={
                  gestaoVistaData.length === 0 && gestaoData.length === 0
                }
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código ou nome da casa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Mode Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Label htmlFor="view-mode">Modo de Visualização:</Label>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "cards" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("cards")}
                  className="gap-2"
                >
                  <Grid3X3 className="h-4 w-4" />
                  Cards
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className="gap-2"
                  disabled={gestaoData.length === 0}
                >
                  <BarChart3 className="h-4 w-4" />
                  Tabela
                </Button>
              </div>
            </div>

            {viewMode === "table" && gestaoData.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant={exportMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExportMode(!exportMode)}
                  className="gap-2"
                >
                  <FileDown className="h-4 w-4" />
                  {exportMode ? "Sair do Modo Export" : "Modo Export"}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistics - Only show if gestaoVistaData has data */}
      {gestaoVistaData.length > 0 && viewMode === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                {gestaoVistaData.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Casas de Oração
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {getValidDocuments()}
              </div>
              <div className="text-sm text-muted-foreground">Tipos Válidos</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {getTotalDocumentTypes()}
              </div>
              <div className="text-sm text-muted-foreground">
                Tipos de Documentos
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">
                {getDocumentsExpiringSoon()}
              </div>
              <div className="text-sm text-muted-foreground">
                Tipos a Vencer
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">
                {getDocumentsExpired()}
              </div>
              <div className="text-sm text-muted-foreground">
                Tipos Vencidos
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Content based on view mode */}
      {viewMode === "cards" ? (
        // Cards View (Gestão a Vista)
        filteredData.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Casas de Oração - Vista Detalhada</CardTitle>
              <CardDescription>
                {filteredData.length} casa(s) encontrada(s) com controle de
                datas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Casa de Oração</TableHead>
                    <TableHead>Documentos</TableHead>
                    <TableHead>Vencidos</TableHead>
                    <TableHead>A Vencer</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((casa) => {
                    // Count only current documents that are expired (same logic as metrics)
                    const documentsByType = new Map<string, any[]>();

                    casa.documentos.forEach((doc) => {
                      const normalizedName = doc.nomeDocumento;
                      if (!documentsByType.has(normalizedName)) {
                        documentsByType.set(normalizedName, []);
                      }
                      documentsByType.get(normalizedName)!.push(doc);
                    });

                    let expired = 0;
                    let expiringSoon = 0;

                    documentsByType.forEach((docs) => {
                      // Find the most current document of this type
                      let currentDoc;

                      // First try to find the most current valid document
                      const validDocs = docs.filter(
                        (doc) => !isDateExpired(doc.dataValidade)
                      );

                      if (validDocs.length > 0) {
                        // Sort valid documents by validity date (most distant future first)
                        const sortedValid = validDocs.sort((a, b) => {
                          if (a.dataValidade && b.dataValidade) {
                            return (
                              b.dataValidade.getTime() -
                              a.dataValidade.getTime()
                            );
                          }
                          return 0;
                        });
                        currentDoc = sortedValid[0];
                      } else {
                        // No valid documents - use the most recently expired one
                        const sortedByValidity = docs.sort((a, b) => {
                          if (a.dataValidade && b.dataValidade) {
                            return (
                              b.dataValidade.getTime() -
                              a.dataValidade.getTime()
                            );
                          }
                          return 0;
                        });
                        currentDoc = sortedByValidity[0];
                      }

                      // Count based on current document status
                      if (currentDoc) {
                        if (isDateExpired(currentDoc.dataValidade)) {
                          expired += 1;
                        } else if (
                          isDateExpiringSoon(currentDoc.dataValidade)
                        ) {
                          expiringSoon += 1;
                        }
                      }
                    });

                    return (
                      <TableRow key={casa.codigo}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-medium">
                              {(() => {
                                const casaInfo = casas.find(
                                  (c) => c.codigo === casa.codigo
                                );
                                return casaInfo?.nome || casa.codigo;
                              })()}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {casa.codigo}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {casa.documentos.length} docs
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {expired > 0 ? (
                            <Badge variant="destructive">{expired}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {expiringSoon > 0 ? (
                            <Badge variant="secondary">{expiringSoon}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => showCasaDetails(casa)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : gestaoVistaData.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                Nenhum dado encontrado
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Importe um arquivo Excel do gestão a vista para começar
              </p>
              <GestaoVistaImport onImportSuccess={handleImportSuccess} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                Nenhuma casa encontrada
              </h3>
              <p className="text-sm text-muted-foreground">
                Tente ajustar o termo de busca
              </p>
            </CardContent>
          </Card>
        )
      ) : // Table View (Gestão Tradicional)
      gestaoData.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Dados tradicionais não disponíveis
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {gestaoVistaData.length === 0
                ? "Importe dados do gestão a vista para visualizar a tabela"
                : "Os dados tradicionais serão gerados automaticamente após a importação"}
            </p>
            {gestaoVistaData.length > 0 && (
              <Button onClick={generateGestaoTradicional} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Regerar Dados Tradicional
              </Button>
            )}
          </CardContent>
        </Card>
      ) : exportMode ? (
        // Export Mode
        <div className="space-y-4">
          {/* Controles de exportação */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="export-exemptions-toggle">
                      Aplicar exceções
                    </Label>
                    <Switch
                      id="export-exemptions-toggle"
                      checked={exportUseExemptions}
                      onCheckedChange={setExportUseExemptions}
                    />
                  </div>
                </div>
                <Button
                  onClick={exportToPDF}
                  disabled={isExporting}
                  className="gap-2"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="h-4 w-4" />
                  )}
                  {isExporting ? "Gerando PDF..." : "Exportar PDF"}
                </Button>
              </div>

              {exportUseExemptions && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Modo com exceções ativado:</strong> Documentos
                    marcados como &quot;desconsiderar&quot; serão tratados como
                    presentes na tabela.
                  </p>
                </div>
              )}

              {/* Informações de filtragem */}
              {(() => {
                const tableData = prepareExportTableData();
                if (!tableData) return null;

                const totalDocumentos = Object.keys(gestaoData[0]).filter(
                  (key) => key !== "codigo"
                ).length;
                const documentosComDados =
                  tableData.documentosObrigatorios.length +
                  tableData.documentosOpcionais.length;
                const documentosRemovidos =
                  totalDocumentos - documentosComDados;

                return (
                  <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-bold text-lg text-blue-600">
                          {documentosComDados}
                        </div>
                        <div className="text-gray-600">
                          Documentos na tabela
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-lg text-gray-600">
                          {documentosRemovidos}
                        </div>
                        <div className="text-gray-600">Colunas removidas</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-lg text-green-600">
                          {totalDocumentos}
                        </div>
                        <div className="text-gray-600">Total de documentos</div>
                      </div>
                    </div>
                    {documentosRemovidos > 0 && (
                      <div className="mt-2 text-xs text-gray-600 text-center">
                        ℹ️ Colunas sem dados foram removidas automaticamente
                        para otimizar a visualização
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Tabela para exportação */}
          {(() => {
            const tableData = prepareExportTableData();
            if (!tableData || tableData.dadosTabela.length === 0) return null;

            const metade = Math.ceil(tableData.dadosTabela.length / 2);
            const primeiraMetade = tableData.dadosTabela.slice(0, metade);
            const segundaMetade = tableData.dadosTabela.slice(metade);

            return (
              <>
                {/* Versão visível com scroll horizontal */}
                <div className="border rounded-lg bg-white">
                  <div className="p-6 border-b">
                    <div className="text-center">
                      <h2 className="text-xl font-bold text-blue-800 mb-1">
                        ⛪ Tabela Comparativa de Documentação
                      </h2>
                      <p className="text-gray-600 text-sm">
                        Preview da exportação -{" "}
                        {new Date().toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <div className="min-w-max p-6">
                      <table className="w-full border-collapse border border-gray-400 text-xs">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-400 p-2 text-left font-bold sticky left-0 bg-gray-100 z-10 min-w-[150px]">
                              Casa de Oração
                            </th>
                            {tableData.documentosObrigatorios.map((doc) => (
                              <th
                                key={doc}
                                className="border border-gray-400 p-1 text-center font-bold min-w-8 relative"
                                style={{
                                  height: "120px",
                                  width: "32px",
                                }}
                              >
                                <div
                                  className="absolute inset-0 flex items-center justify-center"
                                  style={{
                                    transform: "rotate(-90deg)",
                                    transformOrigin: "center",
                                    fontSize: "10px",
                                    fontWeight: "bold",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {doc.replace(/_/g, " ")}
                                </div>
                              </th>
                            ))}
                            <th className="border border-gray-400 p-2 text-center font-bold bg-blue-50 min-w-[80px]">
                              % Obrig.
                            </th>
                            <th className="border border-gray-400 p-1 bg-gray-200 w-4"></th>
                            {tableData.documentosOpcionais.map((doc) => (
                              <th
                                key={doc}
                                className="border border-gray-400 p-1 text-center font-bold min-w-8 relative"
                                style={{ height: "120px", width: "32px" }}
                              >
                                <div
                                  className="absolute inset-0 flex items-center justify-center"
                                  style={{
                                    transform: "rotate(-90deg)",
                                    transformOrigin: "center",
                                    fontSize: "10px",
                                    fontWeight: "bold",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {doc.replace(/_/g, " ")}
                                </div>
                              </th>
                            ))}
                            <th className="border border-gray-400 p-2 text-center font-bold bg-blue-50 min-w-[80px]">
                              % Opc.
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {tableData.dadosTabela.map((item, index) => (
                            <tr
                              key={`export-web-${item.casa.codigo}-${index}`}
                              className={
                                index % 2 === 0 ? "bg-gray-50" : "bg-white"
                              }
                            >
                              <td className="border border-gray-400 p-2 font-bold sticky left-0 bg-inherit z-10">
                                {item.casa.nome}
                              </td>
                              {item.documentosObrigatorios.map((doc) => (
                                <td
                                  key={doc.nome}
                                  className={`border border-gray-400 p-1 text-center ${getCellColor(
                                    doc
                                  )}`}
                                >
                                  <div className="w-full h-6"></div>
                                </td>
                              ))}
                              <td className="border border-gray-400 p-2 text-center font-bold bg-blue-50">
                                {item.percentualObrigatorios.toFixed(1)}%
                              </td>
                              <td className="border border-gray-400 p-1 bg-gray-200"></td>
                              {item.documentosOpcionais.map((doc) => (
                                <td
                                  key={doc.nome}
                                  className={`border border-gray-400 p-1 text-center ${getCellColor(
                                    doc
                                  )}`}
                                >
                                  <div className="w-full h-6"></div>
                                </td>
                              ))}
                              <td className="border border-gray-400 p-2 text-center font-bold bg-blue-50">
                                {item.percentualOpcionais.toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Legenda */}
                  <div className="p-4 border-t bg-gray-50 flex justify-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 border border-gray-400"></div>
                      <span className="text-sm">Presente</span>
                    </div>
                    {exportUseExemptions && (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-yellow-500 border border-gray-400"></div>
                        <span className="text-sm">Desconsiderado</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 border border-gray-400"></div>
                      <span className="text-sm">Faltante</span>
                    </div>
                  </div>
                </div>

                {/* Versão oculta para PDF - layout original dividido */}
                <div
                  id="export-table-view"
                  className="hidden bg-white p-8 min-w-max"
                >
                  <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-blue-800 mb-2">
                      ⛪ Sistema de Gestão da Igreja
                    </h1>
                    <h2 className="text-xl text-blue-600 mb-2">
                      Tabela Comparativa de Documentação
                    </h2>
                    <p className="text-gray-600 text-sm">
                      Gerado em {new Date().toLocaleDateString("pt-BR")} às{" "}
                      {new Date().toLocaleTimeString("pt-BR")}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    {/* Primeira metade */}
                    <div>
                      <table className="w-full border-collapse border border-gray-400 text-xs">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-400 p-2 text-left font-bold">
                              Casa de Oração
                            </th>
                            {tableData.documentosObrigatorios.map((doc) => (
                              <th
                                key={doc}
                                className="border border-gray-400 p-1 text-center font-bold min-w-8 relative"
                                style={{
                                  height: "120px",
                                  width: "32px",
                                }}
                              >
                                <div
                                  className="absolute inset-0 flex items-center justify-center"
                                  style={{
                                    transform: "rotate(-90deg)",
                                    transformOrigin: "center",
                                    fontSize: "10px",
                                    fontWeight: "bold",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {doc.replace(/_/g, " ")}
                                </div>
                              </th>
                            ))}
                            <th className="border border-gray-400 p-2 text-center font-bold">
                              % Obrig.
                            </th>
                            <th className="border border-gray-400 p-1 bg-gray-200"></th>
                            {tableData.documentosOpcionais.map((doc) => (
                              <th
                                key={doc}
                                className="border border-gray-400 p-1 text-center font-bold min-w-8 relative"
                                style={{ height: "120px", width: "32px" }}
                              >
                                <div
                                  className="absolute inset-0 flex items-center justify-center"
                                  style={{
                                    transform: "rotate(-90deg)",
                                    transformOrigin: "center",
                                    fontSize: "10px",
                                    fontWeight: "bold",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {doc.replace(/_/g, " ")}
                                </div>
                              </th>
                            ))}
                            <th className="border border-gray-400 p-2 text-center font-bold">
                              % Opc.
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {primeiraMetade.map((item, index) => (
                            <tr
                              key={`export-pdf-first-${item.casa.codigo}-${index}`}
                              className={index % 2 === 0 ? "bg-gray-50" : ""}
                            >
                              <td className="border border-gray-400 p-2 font-bold">
                                {item.casa.nome}
                              </td>
                              {item.documentosObrigatorios.map((doc) => (
                                <td
                                  key={doc.nome}
                                  className={`border border-gray-400 p-1 text-center ${getCellColor(
                                    doc
                                  )}`}
                                >
                                  <div className="w-full h-6"></div>
                                </td>
                              ))}
                              <td className="border border-gray-400 p-2 text-center font-bold">
                                {item.percentualObrigatorios.toFixed(1)}%
                              </td>
                              <td className="border border-gray-400 p-1 bg-gray-200"></td>
                              {item.documentosOpcionais.map((doc) => (
                                <td
                                  key={doc.nome}
                                  className={`border border-gray-400 p-1 text-center ${getCellColor(
                                    doc
                                  )}`}
                                >
                                  <div className="w-full h-6"></div>
                                </td>
                              ))}
                              <td className="border border-gray-400 p-2 text-center font-bold">
                                {item.percentualOpcionais.toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Segunda metade */}
                    {segundaMetade.length > 0 && (
                      <div>
                        <table className="w-full border-collapse border border-gray-400 text-xs">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border border-gray-400 p-2 text-left font-bold">
                                Casa de Oração
                              </th>
                              {tableData.documentosObrigatorios.map((doc) => (
                                <th
                                  key={doc}
                                  className="border border-gray-400 p-1 text-center font-bold min-w-8 relative"
                                  style={{
                                    height: "120px",
                                    width: "32px",
                                  }}
                                >
                                  <div
                                    className="absolute inset-0 flex items-center justify-center"
                                    style={{
                                      transform: "rotate(-90deg)",
                                      transformOrigin: "center",
                                      fontSize: "10px",
                                      fontWeight: "bold",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {doc.replace(/_/g, " ")}
                                  </div>
                                </th>
                              ))}
                              <th className="border border-gray-400 p-2 text-center font-bold">
                                % Obrig.
                              </th>
                              <th className="border border-gray-400 p-1 bg-gray-200"></th>
                              {tableData.documentosOpcionais.map((doc) => (
                                <th
                                  key={doc}
                                  className="border border-gray-400 p-1 text-center font-bold min-w-8 relative"
                                  style={{
                                    height: "120px",
                                    width: "32px",
                                  }}
                                >
                                  <div
                                    className="absolute inset-0 flex items-center justify-center"
                                    style={{
                                      transform: "rotate(-90deg)",
                                      transformOrigin: "center",
                                      fontSize: "10px",
                                      fontWeight: "bold",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {doc.replace(/_/g, " ")}
                                  </div>
                                </th>
                              ))}
                              <th className="border border-gray-400 p-2 text-center font-bold">
                                % Opc.
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {segundaMetade.map((item, index) => (
                              <tr
                                key={`export-pdf-second-${item.casa.codigo}-${index}`}
                                className={index % 2 === 0 ? "bg-gray-50" : ""}
                              >
                                <td className="border border-gray-400 p-2 font-bold">
                                  {item.casa.nome}
                                </td>
                                {item.documentosObrigatorios.map((doc) => (
                                  <td
                                    key={doc.nome}
                                    className={`border border-gray-400 p-1 text-center ${getCellColor(
                                      doc
                                    )}`}
                                  >
                                    <div className="w-full h-6"></div>
                                  </td>
                                ))}
                                <td className="border border-gray-400 p-2 text-center font-bold">
                                  {item.percentualObrigatorios.toFixed(1)}%
                                </td>
                                <td className="border border-gray-400 p-1 bg-gray-200"></td>
                                {item.documentosOpcionais.map((doc) => (
                                  <td
                                    key={doc.nome}
                                    className={`border border-gray-400 p-1 text-center ${getCellColor(
                                      doc
                                    )}`}
                                  >
                                    <div className="w-full h-6"></div>
                                  </td>
                                ))}
                                <td className="border border-gray-400 p-2 text-center font-bold">
                                  {item.percentualOpcionais.toFixed(1)}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Legenda */}
                  <div className="mt-8 flex justify-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 border border-gray-400"></div>
                      <span className="text-sm">Presente</span>
                    </div>
                    {exportUseExemptions && (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-yellow-500 border border-gray-400"></div>
                        <span className="text-sm">Desconsiderado</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 border border-gray-400"></div>
                      <span className="text-sm">Faltante</span>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      ) : (
        // Normal Table View
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                {gestaoData.length > 0 &&
                  Object.keys(gestaoData[0])
                    .filter((key) => key !== "codigo")
                    .map((key) => (
                      <TableHead key={key} className="min-w-[120px]">
                        {key.replace(/_/g, " ").toUpperCase()}
                      </TableHead>
                    ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {gestaoData.map((item, index) => (
                <TableRow key={`${item.codigo}-${index}`}>
                  <TableCell className="font-medium">{item.codigo}</TableCell>
                  {Object.entries(item)
                    .filter(([key]) => key !== "codigo")
                    .map(([key, value]) => (
                      <TableCell key={`${item.codigo}-${index}-${key}`}>
                        {value ? (
                          value.toUpperCase() === "X" ? (
                            <Badge variant="default" className="bg-green-600">
                              ✓
                            </Badge>
                          ) : (
                            <span className="text-sm">{value}</span>
                          )
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detalhes -{" "}
              {(() => {
                if (!selectedCasa) return "";
                const casaInfo = casas.find(
                  (c) => c.codigo === selectedCasa.codigo
                );
                return casaInfo?.nome
                  ? `${casaInfo.nome} (${selectedCasa.codigo})`
                  : selectedCasa.codigo;
              })()}
            </DialogTitle>
          </DialogHeader>

          {selectedCasa && (
            <div className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {(() => {
                        // Count unique document types
                        const documentTypes = new Set<string>();
                        selectedCasa.documentos.forEach((doc) => {
                          documentTypes.add(doc.nomeDocumento);
                        });
                        return documentTypes.size;
                      })()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Tipos de Docs
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {(() => {
                        // Count only current documents that are expiring soon
                        const documentsByType = new Map<string, any[]>();

                        selectedCasa.documentos.forEach((doc) => {
                          if (!documentsByType.has(doc.nomeDocumento)) {
                            documentsByType.set(doc.nomeDocumento, []);
                          }
                          documentsByType.get(doc.nomeDocumento)!.push(doc);
                        });

                        let expiringSoonCurrent = 0;
                        documentsByType.forEach((docs) => {
                          const validDocs = docs.filter(
                            (doc) => !isDateExpired(doc.dataValidade)
                          );
                          if (validDocs.length > 0) {
                            const sortedValid = validDocs.sort((a, b) => {
                              if (a.dataValidade && b.dataValidade) {
                                return (
                                  b.dataValidade.getTime() -
                                  a.dataValidade.getTime()
                                );
                              }
                              return 0;
                            });

                            const mostCurrent = sortedValid[0];
                            if (isDateExpiringSoon(mostCurrent.dataValidade)) {
                              expiringSoonCurrent += 1;
                            }
                          }
                        });

                        return expiringSoonCurrent;
                      })()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      A Vencer (Atuais)
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {(() => {
                        // Count only current documents that are expired
                        const documentsByType = new Map<string, any[]>();

                        selectedCasa.documentos.forEach((doc) => {
                          if (!documentsByType.has(doc.nomeDocumento)) {
                            documentsByType.set(doc.nomeDocumento, []);
                          }
                          documentsByType.get(doc.nomeDocumento)!.push(doc);
                        });

                        let expiredCurrent = 0;
                        documentsByType.forEach((docs) => {
                          // Find the most current document of this type
                          let currentDoc;

                          // First try to find the most current valid document
                          const validDocs = docs.filter(
                            (doc) => !isDateExpired(doc.dataValidade)
                          );

                          if (validDocs.length > 0) {
                            // Sort valid documents by validity date (most distant future first)
                            const sortedValid = validDocs.sort((a, b) => {
                              if (a.dataValidade && b.dataValidade) {
                                return (
                                  b.dataValidade.getTime() -
                                  a.dataValidade.getTime()
                                );
                              }
                              return 0;
                            });
                            currentDoc = sortedValid[0];
                          } else {
                            // No valid documents - use the most recently expired one
                            const sortedByValidity = docs.sort((a, b) => {
                              if (a.dataValidade && b.dataValidade) {
                                return (
                                  b.dataValidade.getTime() -
                                  a.dataValidade.getTime()
                                );
                              }
                              return 0;
                            });
                            currentDoc = sortedByValidity[0];
                          }

                          // Check if the current document is expired
                          if (
                            currentDoc &&
                            isDateExpired(currentDoc.dataValidade)
                          ) {
                            expiredCurrent += 1;
                          }
                        });

                        return expiredCurrent;
                      })()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Vencidos (Atuais)
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Documents Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Documentos</CardTitle>
                  <CardDescription>
                    {(() => {
                      const totalDocs = selectedCasa.documentos.length;
                      const documentsByType = new Map<string, any[]>();

                      selectedCasa.documentos.forEach((doc) => {
                        if (!documentsByType.has(doc.nomeDocumento)) {
                          documentsByType.set(doc.nomeDocumento, []);
                        }
                        documentsByType.get(doc.nomeDocumento)!.push(doc);
                      });

                      const duplicateTypes = Array.from(
                        documentsByType.entries()
                      ).filter(([_, docs]) => docs.length > 1).length;

                      return duplicateTypes > 0
                        ? `${totalDocs} documentos (${duplicateTypes} tipos com múltiplas versões)`
                        : `${totalDocs} documentos únicos`;
                    })()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Documento</TableHead>
                        <TableHead>Data Emissão</TableHead>
                        <TableHead>Data Validade</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Atual</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        // Group documents by type to identify current ones
                        const documentsByType = new Map<string, any[]>();

                        selectedCasa.documentos.forEach((doc) => {
                          if (!documentsByType.has(doc.nomeDocumento)) {
                            documentsByType.set(doc.nomeDocumento, []);
                          }
                          documentsByType.get(doc.nomeDocumento)!.push(doc);
                        });

                        // Find the most current document for each type (same logic as metrics)
                        const currentDocuments = new Set<number>();
                        documentsByType.forEach((docs) => {
                          let currentDoc;

                          // First try to find the most current valid document
                          const validDocs = docs.filter(
                            (doc) => !isDateExpired(doc.dataValidade)
                          );

                          if (validDocs.length > 0) {
                            // Sort valid documents by validity date (most distant future first)
                            const sortedValid = validDocs.sort((a, b) => {
                              if (a.dataValidade && b.dataValidade) {
                                return (
                                  b.dataValidade.getTime() -
                                  a.dataValidade.getTime()
                                );
                              }
                              return 0;
                            });
                            currentDoc = sortedValid[0];
                          } else {
                            // No valid documents - use the most recently expired one
                            const sortedByValidity = docs.sort((a, b) => {
                              if (a.dataValidade && b.dataValidade) {
                                return (
                                  b.dataValidade.getTime() -
                                  a.dataValidade.getTime()
                                );
                              }
                              return 0;
                            });
                            currentDoc = sortedByValidity[0];
                          }

                          // Add the current document to the set
                          if (currentDoc) {
                            const currentIndex =
                              selectedCasa.documentos.indexOf(currentDoc);
                            currentDocuments.add(currentIndex);
                          }
                        });

                        return selectedCasa.documentos.map((doc, index) => {
                          const isCurrent = currentDocuments.has(index);
                          const hasDuplicates =
                            documentsByType.get(doc.nomeDocumento)!.length > 1;

                          return (
                            <TableRow
                              key={index}
                              className={
                                !isCurrent && hasDuplicates ? "opacity-60" : ""
                              }
                            >
                              <TableCell>
                                <div>
                                  <div className="font-medium flex items-center gap-2">
                                    {doc.nomeDocumento}
                                    {hasDuplicates && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {
                                          documentsByType.get(
                                            doc.nomeDocumento
                                          )!.length
                                        }
                                        x
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Código: {doc.codigoDocumento}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  {formatDate(doc.dataEmissao)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <Badge
                                    variant={getDateBadgeVariant(
                                      doc.dataValidade
                                    )}
                                  >
                                    {formatDate(doc.dataValidade)}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell>
                                {isDateExpired(doc.dataValidade) ? (
                                  <Badge variant="destructive">Vencido</Badge>
                                ) : isDateExpiringSoon(doc.dataValidade) ? (
                                  <Badge variant="secondary">A Vencer</Badge>
                                ) : (
                                  <Badge variant="default">Válido</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {isCurrent ? (
                                  <Badge
                                    variant="default"
                                    className="bg-green-600"
                                  >
                                    ✓ Atual
                                  </Badge>
                                ) : hasDuplicates ? (
                                  <Badge
                                    variant="outline"
                                    className="text-gray-500"
                                  >
                                    Anterior
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        });
                      })()}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

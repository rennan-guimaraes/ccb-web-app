"use client";

import React, { useState, useEffect } from "react";
import { DataService } from "../services/dataService";
import { CasaOracao, GestaoData } from "../types/churchs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Badge } from "@/components/ui/badge";

import {
  BarChart3,
  Home,
  FileText,
  RefreshCw,
  Trash2,
  Loader2,
  FileX,
  Settings,
  Search,
  FileDown,
} from "lucide-react";
import ChartDisplay from "./chartDisplay";
import DocumentosFaltantesAnalysis from "./missingDocuments";
import AddCasaModal from "./addChurchModal";
import BuscarImovelFaltante from "./seachChurchFaltante";
import DataExportImport from "./dataExportImport";
import CasasImport from "./churchImport";
import GestaoImport from "./manageImport";
import CasaDocumentosDetail from "./churchDocumentsDetail";
import { isDocumentoObrigatorio } from "../utils/constants";
import { DocumentosFaltantesService } from "../services/missingDocumentsService";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

interface DataDisplayProps {
  refreshTrigger?: number;
}

export default function DataDisplay({ refreshTrigger }: DataDisplayProps) {
  const [casas, setCasas] = useState<CasaOracao[]>([]);
  const [gestaoData, setGestaoData] = useState<GestaoData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [useExemptions, setUseExemptions] = useState(false);

  // Estados para modo de exportação
  const [exportMode, setExportMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportUseExemptions, setExportUseExemptions] = useState(false);

  const dataService = new DataService();
  const documentosService = new DocumentosFaltantesService();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const loadedCasas = dataService.loadCasas();
      const loadedGestao = dataService.loadGestao();

      setCasas(loadedCasas);
      setGestaoData(loadedGestao);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearData = (type: "casas" | "gestao") => {
    if (
      confirm(
        `Tem certeza que deseja limpar todos os dados de ${
          type === "casas" ? "casas de oração" : "gestão"
        }?`
      )
    ) {
      if (type === "casas") {
        dataService.clearCasas();
        setCasas([]);
      } else {
        dataService.clearGestao();
        setGestaoData([]);
      }
    }
  };

  const deleteCasa = (codigo: string) => {
    if (
      confirm(`Tem certeza que deseja excluir a casa com código ${codigo}?`)
    ) {
      const result = dataService.deleteCasa(codigo);
      if (result.success) {
        setCasas((prev) => prev.filter((casa) => casa.codigo !== codigo));
      } else {
        alert(`Erro: ${result.message}`);
      }
    }
  };

  const handleCasaAdded = (novaCasa: CasaOracao) => {
    setCasas((prev) => [...prev, novaCasa]);
  };

  // Função para preparar dados para exportação
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

      // Calculate percentages
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
      documentosObrigatorios,
      documentosOpcionais,
    };
  };

  const getCellColor = (doc: any): string => {
    if (doc.presente) return "bg-green-500";
    if (exportUseExemptions && doc.desconsiderar) return "bg-yellow-500";
    return "bg-red-500";
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
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: tableElement.scrollWidth,
        height: tableElement.scrollHeight,
      });

      // Restaurar estado original do elemento
      if (wasHidden) {
        tableElement.classList.add("hidden");
        tableElement.style.position = "";
        tableElement.style.left = "";
        tableElement.style.top = "";
      }

      const imgData = canvas.toDataURL("image/png");
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

      pdf.addImage(imgData, "PNG", imgX, imgY, scaledWidth, scaledHeight);

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

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-muted-foreground">Carregando dados...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const EmptyState = ({ type }: { type: "casas" | "gestao" }) => (
    <div className="text-center py-12">
      <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
        {type === "casas" ? (
          <Home className="h-12 w-12 text-muted-foreground" />
        ) : (
          <FileText className="h-12 w-12 text-muted-foreground" />
        )}
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">
        {type === "casas"
          ? "Nenhuma casa de oração importada"
          : "Nenhum dado de gestão importado"}
      </h3>
      <p className="text-sm text-muted-foreground">
        Use o formulário de importação acima para carregar dados.
      </p>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            Dados Importados
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="casas" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="casas" className="gap-2">
              <Home className="h-4 w-4" />
              Casas de Oração
              <Badge variant="secondary" className="ml-2">
                {casas.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="gestao" className="gap-2">
              <FileText className="h-4 w-4" />
              Gestão
              <Badge variant="secondary" className="ml-2">
                {gestaoData.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="detalhes" className="gap-2">
              <Search className="h-4 w-4" />
              Detalhes da Casa
            </TabsTrigger>
            <TabsTrigger value="chart" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Gráfico
            </TabsTrigger>
            <TabsTrigger value="analysis" className="gap-2">
              <FileX className="h-4 w-4" />
              Documentos Faltantes
            </TabsTrigger>
            <TabsTrigger value="backup" className="gap-2">
              <Settings className="h-4 w-4" />
              Backup
            </TabsTrigger>
          </TabsList>

          {/* Casas Tab */}
          <TabsContent value="casas" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Casas de Oração</h3>
              <div className="flex items-center gap-2">
                <CasasImport
                  onImportSuccess={() => loadData()}
                  onImportError={(error) => console.error(error)}
                />
                <AddCasaModal onCasaAdded={handleCasaAdded} />
                <BuscarImovelFaltante
                  gestaoData={gestaoData}
                  casasData={casas}
                  onCasaAdded={handleCasaAdded}
                />
                {casas.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => clearData("casas")}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Limpar Dados
                  </Button>
                )}
              </div>
            </div>

            {casas.length === 0 ? (
              <EmptyState type="casas" />
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo Imóvel</TableHead>
                      <TableHead>Endereço</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {casas.map((casa, index) => (
                      <TableRow key={`casa-${casa.codigo}-${index}`}>
                        <TableCell className="font-medium">
                          {casa.codigo}
                        </TableCell>
                        <TableCell>{casa.nome}</TableCell>
                        <TableCell>
                          {casa.tipo_imovel ? (
                            <Badge variant="outline">{casa.tipo_imovel}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {casa.endereco || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {casa.status ? (
                            <Badge
                              variant={
                                casa.status.toLowerCase() === "ativo"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {casa.status}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteCasa(casa.codigo)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Gestao Tab */}
          <TabsContent value="gestao" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Dados de Gestão</h3>
              <div className="flex items-center gap-2">
                <GestaoImport
                  onImportSuccess={() => loadData()}
                  onImportError={(error) => console.error(error)}
                />
                {gestaoData.length > 0 && (
                  <>
                    <Button
                      variant={exportMode ? "default" : "outline"}
                      size="sm"
                      onClick={() => setExportMode(!exportMode)}
                      className="gap-2"
                    >
                      <FileDown className="h-4 w-4" />
                      {exportMode ? "Visualização Normal" : "Modo Exportação"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => clearData("gestao")}
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Limpar Dados
                    </Button>
                  </>
                )}
              </div>
            </div>

            {gestaoData.length === 0 ? (
              <EmptyState type="gestao" />
            ) : exportMode ? (
              // Modo Exportação
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
                          💡 <strong>Modo com exceções ativado:</strong>{" "}
                          Documentos marcados como "desconsiderar" serão
                          tratados como presentes na tabela.
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
                              <div className="text-gray-600">
                                Colunas removidas
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-lg text-green-600">
                                {totalDocumentos}
                              </div>
                              <div className="text-gray-600">
                                Total de documentos
                              </div>
                            </div>
                          </div>
                          {documentosRemovidos > 0 && (
                            <div className="mt-2 text-xs text-gray-600 text-center">
                              ℹ️ Colunas sem dados foram removidas
                              automaticamente para otimizar a visualização
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
                  if (!tableData || tableData.dadosTabela.length === 0)
                    return null;

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
                                  {tableData.documentosObrigatorios.map(
                                    (doc) => (
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
                                    )
                                  )}
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
                                      index % 2 === 0
                                        ? "bg-gray-50"
                                        : "bg-white"
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
                            Gerado em {new Date().toLocaleDateString("pt-BR")}{" "}
                            às {new Date().toLocaleTimeString("pt-BR")}
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
                                  {tableData.documentosObrigatorios.map(
                                    (doc) => (
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
                                    )
                                  )}
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
                                    className={
                                      index % 2 === 0 ? "bg-gray-50" : ""
                                    }
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
                                    {tableData.documentosObrigatorios.map(
                                      (doc) => (
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
                                      )
                                    )}
                                    <th className="border border-gray-400 p-2 text-center font-bold">
                                      % Obrig.
                                    </th>
                                    <th className="border border-gray-400 p-1 bg-gray-200"></th>
                                    {tableData.documentosOpcionais.map(
                                      (doc) => (
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
                                      )
                                    )}
                                    <th className="border border-gray-400 p-2 text-center font-bold">
                                      % Opc.
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {segundaMetade.map((item, index) => (
                                    <tr
                                      key={`export-pdf-second-${item.casa.codigo}-${index}`}
                                      className={
                                        index % 2 === 0 ? "bg-gray-50" : ""
                                      }
                                    >
                                      <td className="border border-gray-400 p-2 font-bold">
                                        {item.casa.nome}
                                      </td>
                                      {item.documentosObrigatorios.map(
                                        (doc) => (
                                          <td
                                            key={doc.nome}
                                            className={`border border-gray-400 p-1 text-center ${getCellColor(
                                              doc
                                            )}`}
                                          >
                                            <div className="w-full h-6"></div>
                                          </td>
                                        )
                                      )}
                                      <td className="border border-gray-400 p-2 text-center font-bold">
                                        {item.percentualObrigatorios.toFixed(1)}
                                        %
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
              // Visualização normal
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      {/* Dynamic columns based on first record */}
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
                        <TableCell className="font-medium">
                          {item.codigo}
                        </TableCell>
                        {Object.entries(item)
                          .filter(([key]) => key !== "codigo")
                          .map(([key, value]) => (
                            <TableCell key={`${item.codigo}-${index}-${key}`}>
                              {value ? (
                                value.toUpperCase() === "X" ? (
                                  <Badge
                                    variant="default"
                                    className="bg-green-600"
                                  >
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
          </TabsContent>

          {/* Detalhes da Casa Tab */}
          <TabsContent value="detalhes" className="space-y-4">
            <CasaDocumentosDetail casas={casas} gestaoData={gestaoData} />
          </TabsContent>

          {/* Chart Tab */}
          <TabsContent value="chart" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Análise de Documentação</h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <label className="text-sm font-medium">
                    Aplicar exceções
                  </label>
                  <Switch
                    checked={useExemptions}
                    onCheckedChange={setUseExemptions}
                    id="exemptions-toggle"
                  />
                </div>
              </div>
            </div>

            {useExemptions && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                <p className="text-sm text-blue-800">
                  💡 <strong>Modo com exceções ativado:</strong> O gráfico
                  considera documentos marcados como "desconsiderar" na análise
                  de documentos faltantes como se fossem documentos presentes.
                </p>
              </div>
            )}

            <ChartDisplay
              gestaoData={gestaoData}
              casasData={casas}
              useExemptions={useExemptions}
            />
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-4">
            <DocumentosFaltantesAnalysis
              gestaoData={gestaoData}
              casasData={casas}
            />
          </TabsContent>

          {/* Backup Tab */}
          <TabsContent value="backup" className="space-y-4">
            <DataExportImport onImportSuccess={loadData} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

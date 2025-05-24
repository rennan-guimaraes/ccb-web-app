"use client";

import React, { useState, useEffect } from "react";
import { DataService } from "../services/dataService";
import { CasaOracao, GestaoData } from "../types/churchs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
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
  FileX,
  Settings,
  Search,
} from "lucide-react";
import ChartDisplay from "./chartDisplay";
import DocumentosFaltantesAnalysis from "./missingDocuments";
import AddCasaModal from "./addChurchModal";
import BuscarImovelFaltante from "./seachChurchFaltante";
import DataExportImport from "./dataExportImport";
import CasasImport from "./churchImport";
import CasaDocumentosDetail from "./churchDocumentsDetail";
import GestaoConsolidada from "./gestaoConsolidada";

interface DataDisplayProps {
  refreshTrigger?: number;
}

export default function DataDisplay({ refreshTrigger }: DataDisplayProps) {
  const [casas, setCasas] = useState<CasaOracao[]>([]);
  const [gestaoData, setGestaoData] = useState<GestaoData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [useExemptions, setUseExemptions] = useState(false);

  const dataService = new DataService();

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

  const clearData = (type: "casas") => {
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

  // Load data on component mount and when refreshTrigger changes
  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const EmptyState = ({ type }: { type: "casas" }) => (
    <Card>
      <CardContent className="p-8 text-center">
        <div className="text-muted-foreground text-lg mb-4">
          {type === "casas"
            ? "📋 Nenhuma casa de oração cadastrada"
            : "📊 Nenhum dado de gestão encontrado"}
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {type === "casas"
            ? "Importe um arquivo Excel ou adicione manualmente uma casa de oração para começar."
            : "Importe dados de gestão para visualizar informações sobre documentação."}
        </p>
        {type === "casas" ? (
          <div className="flex gap-2 justify-center">
            <CasasImport
              onImportSuccess={() => loadData()}
              onImportError={(error) => console.error(error)}
            />
            <AddCasaModal onCasaAdded={handleCasaAdded} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Sistema de Gestão da Igreja</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            {isLoading ? "Carregando..." : "Atualizar"}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Carregando dados...</p>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="casas" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="casas" className="gap-2">
                <Home className="h-4 w-4" />
                Casas de Oração
                <Badge variant="secondary" className="ml-2">
                  {casas.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="gestao-vista" className="gap-2">
                <FileText className="h-4 w-4 text-purple-600" />
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
                              <Badge variant="outline">
                                {casa.tipo_imovel}
                              </Badge>
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

            {/* Gestao a Vista Tab */}
            <TabsContent value="gestao-vista" className="space-y-4">
              <GestaoConsolidada casas={casas} />
            </TabsContent>

            {/* Detalhes da Casa Tab */}
            <TabsContent value="detalhes" className="space-y-4">
              <CasaDocumentosDetail casas={casas} gestaoData={gestaoData} />
            </TabsContent>

            {/* Chart Tab */}
            <TabsContent value="chart" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Análise de Documentação
                </h3>
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
                    considera documentos marcados como &quot;desconsiderar&quot;
                    na análise de documentos faltantes como se fossem documentos
                    presentes.
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
        )}
      </CardContent>
    </Card>
  );
}

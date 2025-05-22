"use client";

import React, { useState, useEffect } from "react";
import { DataService } from "../services/dataService";
import { CasaOracao, GestaoData } from "../types/casaOracao";
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
  Loader2,
  FileX,
  Settings,
} from "lucide-react";
import ChartDisplay from "./chartDisplay";
import DocumentosFaltantesAnalysis from "./documentosFaltantesAnalysis";

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
          <TabsList className="grid w-full grid-cols-4">
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
            <TabsTrigger value="chart" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Gráfico
            </TabsTrigger>
            <TabsTrigger value="analysis" className="gap-2">
              <FileX className="h-4 w-4" />
              Documentos Faltantes
            </TabsTrigger>
          </TabsList>

          {/* Casas Tab */}
          <TabsContent value="casas" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Casas de Oração</h3>
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
              {gestaoData.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => clearData("gestao")}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Limpar Dados
                </Button>
              )}
            </div>

            {gestaoData.length === 0 ? (
              <EmptyState type="gestao" />
            ) : (
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
              totalCasas={casas.length}
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
        </Tabs>
      </CardContent>
    </Card>
  );
}

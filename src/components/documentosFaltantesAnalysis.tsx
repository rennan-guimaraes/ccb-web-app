"use client";

import React, { useState, useEffect } from "react";
import { AnaliseDocumento, GestaoData, CasaOracao } from "../types/casaOracao";
import { DocumentosFaltantesService } from "../services/documentosFaltantesService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertTriangle,
  FileText,
  MessageSquare,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  Save,
  FileX,
} from "lucide-react";

interface DocumentosFaltantesAnalysisProps {
  gestaoData: GestaoData[];
  casasData: CasaOracao[];
}

export default function DocumentosFaltantesAnalysis({
  gestaoData,
  casasData,
}: DocumentosFaltantesAnalysisProps) {
  const [analises, setAnalises] = useState<AnaliseDocumento[]>([]);
  const [filtro, setFiltro] = useState("");
  const [showOnlyMandatory, setShowOnlyMandatory] = useState(false);
  const [selectedCasa, setSelectedCasa] = useState<{
    codigo: string;
    nome: string;
    documento: string;
  } | null>(null);
  const [observacao, setObservacao] = useState("");
  const [desconsiderar, setDesconsiderar] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const documentosService = new DocumentosFaltantesService();

  useEffect(() => {
    loadAnalises();
  }, [gestaoData, casasData]);

  const loadAnalises = () => {
    const novasAnalises = documentosService.analisarDocumentosFaltantes(
      gestaoData,
      casasData
    );
    setAnalises(novasAnalises);
  };

  const handleOpenDialog = (
    codigo: string,
    nome: string,
    documento: string
  ) => {
    const existingData = documentosService.getDocumentoFaltante(
      codigo,
      documento
    );

    setSelectedCasa({ codigo, nome, documento });
    setObservacao(existingData?.observacao || "");
    setDesconsiderar(existingData?.desconsiderar || false);
    setIsDialogOpen(true);
  };

  const handleSaveObservation = () => {
    if (!selectedCasa) return;

    const success = documentosService.updateDocumentoFaltante(
      selectedCasa.codigo,
      selectedCasa.documento,
      observacao,
      desconsiderar
    );

    if (success) {
      loadAnalises(); // Reload analysis with new data
      setIsDialogOpen(false);
      setSelectedCasa(null);
      setObservacao("");
      setDesconsiderar(false);
    }
  };

  const filteredAnalises = analises.filter((analise) => {
    const matchFilter =
      filtro === "" ||
      analise.nomeDocumento.toLowerCase().includes(filtro.toLowerCase());
    const matchMandatory = !showOnlyMandatory || analise.isObrigatorio;
    return matchFilter && matchMandatory;
  });

  const getStatusIcon = (casa: any) => {
    if (casa.desconsiderar) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    if (casa.observacao) {
      return <MessageSquare className="h-4 w-4 text-blue-600" />;
    }
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  const getStatusText = (casa: any) => {
    if (casa.desconsiderar) return "Desconsiderado";
    if (casa.observacao) return "Com observação";
    return "Pendente";
  };

  if (
    !gestaoData ||
    gestaoData.length === 0 ||
    !casasData ||
    casasData.length === 0
  ) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
            <FileX className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            Dados insuficientes
          </h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            É necessário ter dados de gestão e casas de oração importados para
            visualizar a análise de documentos faltantes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileX className="h-6 w-6 text-orange-600" />
            Análise de Documentos Faltantes
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Gerencie observações e exceções para documentos em falta nas casas
            de oração.
          </p>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filtrar documentos..."
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={showOnlyMandatory}
                onCheckedChange={setShowOnlyMandatory}
                id="mandatory-only"
              />
              <label htmlFor="mandatory-only" className="text-sm">
                Apenas obrigatórios
              </label>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Total Documentos
                </span>
              </div>
              <p className="text-2xl font-bold text-blue-800 mt-1">
                {analises.length}
              </p>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">
                  Obrigatórios
                </span>
              </div>
              <p className="text-2xl font-bold text-red-800 mt-1">
                {analises.filter((a) => a.isObrigatorio).length}
              </p>
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Desconsiderados
                </span>
              </div>
              <p className="text-2xl font-bold text-green-800 mt-1">
                {analises.reduce((sum, a) => sum + a.casasDesconsideradas, 0)}
              </p>
            </div>
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">
                  Com Observações
                </span>
              </div>
              <p className="text-2xl font-bold text-orange-800 mt-1">
                {analises.reduce(
                  (sum, a) =>
                    sum + a.casasFaltantes.filter((c) => c.observacao).length,
                  0
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Analysis */}
      <Card>
        <CardContent className="p-0">
          <Accordion type="single" collapsible className="w-full">
            {filteredAnalises.map((analise, index) => (
              <AccordionItem
                key={analise.nomeDocumento}
                value={`item-${index}`}
              >
                <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                  <div className="flex items-center justify-between w-full mr-4">
                    <div className="flex items-center gap-3">
                      {analise.isObrigatorio ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Obrigatório
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <FileText className="h-3 w-3" />
                          Opcional
                        </Badge>
                      )}
                      <span className="font-medium text-left">
                        {analise.nomeDocumento.replace(/_/g, " ").toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-red-600">
                        {analise.casasSemDocumento} faltando
                      </span>
                      {analise.casasDesconsideradas > 0 && (
                        <span className="text-green-600">
                          {analise.casasDesconsideradas} desconsideradas
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        {analise.percentualReal.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-4">
                    {/* Statistics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">
                          Com Documento
                        </p>
                        <p className="text-lg font-semibold text-green-600">
                          {analise.casasComDocumento}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">
                          Sem Documento
                        </p>
                        <p className="text-lg font-semibold text-red-600">
                          {analise.casasSemDocumento}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">
                          Desconsideradas
                        </p>
                        <p className="text-lg font-semibold text-blue-600">
                          {analise.casasDesconsideradas}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">
                          % Ajustado
                        </p>
                        <p className="text-lg font-semibold">
                          {analise.percentualReal.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {/* Missing Houses List */}
                    {analise.casasFaltantes.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">
                          Casas sem este documento (
                          {analise.casasFaltantes.length})
                        </h4>
                        <div className="grid gap-2">
                          {analise.casasFaltantes.map((casa) => (
                            <div
                              key={`${casa.codigo}-${analise.nomeDocumento}`}
                              className="flex items-center justify-between p-3 border rounded-lg bg-background"
                            >
                              <div className="flex items-center gap-3">
                                {getStatusIcon(casa)}
                                <div>
                                  <p className="font-medium">{casa.nome}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Código: {casa.codigo}
                                  </p>
                                  {casa.observacao && (
                                    <p className="text-xs text-blue-600 mt-1">
                                      💬 {casa.observacao}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    casa.desconsiderar
                                      ? "default"
                                      : casa.observacao
                                      ? "secondary"
                                      : "outline"
                                  }
                                  className="text-xs"
                                >
                                  {getStatusText(casa)}
                                </Badge>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        handleOpenDialog(
                                          casa.codigo,
                                          casa.nome,
                                          analise.nomeDocumento
                                        )
                                      }
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                </Dialog>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Observation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar Documento Faltante</DialogTitle>
          </DialogHeader>
          {selectedCasa && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Casa de Oração</p>
                <p className="font-medium">{selectedCasa.nome}</p>
                <p className="text-xs text-muted-foreground">
                  Código: {selectedCasa.codigo}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Documento</p>
                <p className="font-medium">
                  {selectedCasa.documento.replace(/_/g, " ").toUpperCase()}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Observação</label>
                <Textarea
                  placeholder="Adicione uma observação sobre este documento faltante..."
                  value={observacao}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setObservacao(e.target.value)
                  }
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={desconsiderar}
                  onCheckedChange={setDesconsiderar}
                  id="desconsiderar"
                />
                <label htmlFor="desconsiderar" className="text-sm">
                  Desconsiderar esta falta no gráfico
                </label>
              </div>
              {desconsiderar && (
                <p className="text-xs text-muted-foreground bg-blue-50 p-2 rounded">
                  💡 Ao marcar como desconsiderado, este documento será contado
                  como presente nos cálculos do gráfico.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveObservation} className="gap-2">
              <Save className="h-4 w-4" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

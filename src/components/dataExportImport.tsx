"use client";

import React, { useState } from "react";
import {
  DataExportImportService,
  SystemBackup,
} from "../services/dataExportImportService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Download,
  Upload,
  FileText,
  Database,
  AlertTriangle,
  CheckCircle,
  Info,
  Calendar,
  Hash,
} from "lucide-react";

interface DataExportImportProps {
  onImportSuccess?: () => void;
}

export default function DataExportImport({
  onImportSuccess,
}: DataExportImportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState<SystemBackup | null>(null);
  const [mergeMode, setMergeMode] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const exportService = new DataExportImportService();

  const handleExport = () => {
    setIsExporting(true);
    try {
      exportService.downloadDataAsJson();
      setMessage({
        type: "success",
        text: "Dados exportados com sucesso! O arquivo foi baixado automaticamente.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao exportar dados",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setMessage(null);

    try {
      const result = await exportService.importDataFromFile(file);

      if (result.success && result.data) {
        setImportData(result.data);
        setShowImportDialog(true);
        setMessage({
          type: "info",
          text: result.message,
        });
      } else {
        setMessage({
          type: "error",
          text: result.message,
        });
      }
    } catch (_error) {
      console.error("Erro inesperado ao processar arquivo", _error);
      setMessage({
        type: "error",
        text: "Erro inesperado ao processar arquivo",
      });
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = "";
    }
  };

  const confirmImport = () => {
    if (!importData) return;

    try {
      const result = exportService.applyImportedData(importData, mergeMode);

      if (result.success) {
        setMessage({
          type: "success",
          text: result.message,
        });
        setShowImportDialog(false);
        setImportData(null);

        // Trigger refresh of parent components
        if (onImportSuccess) {
          onImportSuccess();
        }
      } else {
        setMessage({
          type: "error",
          text: result.message,
        });
      }
    } catch (_error) {
      console.error("Erro inesperado ao aplicar dados importados", _error);
      setMessage({
        type: "error",
        text: "Erro ao aplicar dados importados",
      });
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDataSummary = () => {
    if (!importData) return null;
    return exportService.getDataSummary(importData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-6 w-6 text-blue-600" />
          Backup e Restauração
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Exporte todos os dados salvos para um arquivo JSON ou importe dados de
          um backup anterior.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Messages */}
        {message && (
          <Alert
            className={
              message.type === "error"
                ? "border-red-200 bg-red-50"
                : message.type === "success"
                ? "border-green-200 bg-green-50"
                : "border-blue-200 bg-blue-50"
            }
          >
            <div className="flex items-center gap-2">
              {message.type === "error" && (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              {message.type === "success" && (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
              {message.type === "info" && (
                <Info className="h-4 w-4 text-blue-600" />
              )}
              <AlertDescription
                className={
                  message.type === "error"
                    ? "text-red-800"
                    : message.type === "success"
                    ? "text-green-800"
                    : "text-blue-800"
                }
              >
                {message.text}
              </AlertDescription>
            </div>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export Section */}
          <Card className="border-2 border-dashed border-blue-200">
            <CardContent className="p-6 text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Download className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Exportar Dados</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Baixe um arquivo JSON com todos os dados salvos no sistema
                (casas, gestão e documentos faltantes).
              </p>
              <Button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full gap-2"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Exportar Dados
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Import Section */}
          <Card className="border-2 border-dashed border-green-200">
            <CardContent className="p-6 text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Upload className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Importar Dados</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Selecione um arquivo JSON de backup para restaurar os dados no
                sistema.
              </p>
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  disabled={isImporting}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button
                  disabled={isImporting}
                  variant="outline"
                  className="w-full gap-2 border-green-200 hover:bg-green-50"
                >
                  {isImporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Selecionar Arquivo
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Section */}
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <h4 className="font-medium text-yellow-800 mb-1">
                  Informações Importantes
                </h4>
                <ul className="text-yellow-700 space-y-1 text-xs">
                  <li>
                    • O arquivo de backup inclui todos os dados: casas de
                    oração, gestão e observações de documentos
                  </li>
                  <li>
                    • Ao importar, você pode escolher entre substituir os dados
                    existentes ou mesclar com os novos
                  </li>
                  <li>
                    • É recomendado fazer backup regularmente para não perder
                    dados importantes
                  </li>
                  <li>
                    • O arquivo é salvo no formato JSON e pode ser aberto em
                    qualquer editor de texto
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Import Confirmation Dialog */}
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Confirmar Importação
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {importData &&
                (() => {
                  const summary = getDataSummary();
                  return summary ? (
                    <div className="space-y-4">
                      {/* File Info */}
                      <div className="bg-muted p-3 rounded-lg space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Data do backup:</span>
                          <span>{formatDate(summary.timestamp)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Hash className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Versão:</span>
                          <Badge variant="outline">{summary.version}</Badge>
                        </div>
                      </div>

                      {/* Data Summary */}
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">
                          Dados a serem importados:
                        </h4>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-blue-50 p-2 rounded text-xs">
                            <div className="font-semibold text-blue-700">
                              {summary.casas}
                            </div>
                            <div className="text-blue-600">Casas</div>
                          </div>
                          <div className="bg-green-50 p-2 rounded text-xs">
                            <div className="font-semibold text-green-700">
                              {summary.gestao}
                            </div>
                            <div className="text-green-600">Gestão</div>
                          </div>
                          <div className="bg-orange-50 p-2 rounded text-xs">
                            <div className="font-semibold text-orange-700">
                              {summary.documentosFaltantes}
                            </div>
                            <div className="text-orange-600">Documentos</div>
                          </div>
                        </div>
                      </div>

                      {/* Merge Option */}
                      <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex-1">
                          <label
                            htmlFor="merge-mode"
                            className="text-sm font-medium cursor-pointer"
                          >
                            Mesclar com dados existentes
                          </label>
                          <p className="text-xs text-muted-foreground mt-1">
                            {mergeMode
                              ? "Dados serão combinados com os existentes"
                              : "Dados existentes serão substituídos"}
                          </p>
                        </div>
                        <Switch
                          id="merge-mode"
                          checked={mergeMode}
                          onCheckedChange={setMergeMode}
                        />
                      </div>
                    </div>
                  ) : null;
                })()}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowImportDialog(false)}
              >
                Cancelar
              </Button>
              <Button onClick={confirmImport} className="gap-2">
                <Upload className="h-4 w-4" />
                {mergeMode ? "Mesclar Dados" : "Substituir Dados"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

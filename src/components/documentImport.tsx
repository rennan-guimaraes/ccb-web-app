"use client";

import React, { useState, useRef, useEffect } from "react";
import { DataService } from "../services/dataService";
import { GestaoVistaData, ImportHistory } from "../types/churchs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Info,
  Loader2,
  Calendar,
  Clock,
  History,
  Trash2,
  FileUp,
  AlertCircle,
} from "lucide-react";

interface DocumentImportProps {
  onImportSuccess?: (data: GestaoVistaData[]) => void;
  onImportError?: (error: string) => void;
}

export default function DocumentImport({
  onImportSuccess,
  onImportError,
}: DocumentImportProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dataService = new DataService();

  // Load import history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    const history = dataService.loadImportHistory();
    setImportHistory(history);
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const processFile = async (file: File) => {
    setIsLoading(true);
    setMessage({ type: "info", text: "Importando documentos..." });

    try {
      const gestaoVistaData = await dataService.importGestaoVistaFromExcel(file);
      
      if (gestaoVistaData) {
        const totalDocumentos = gestaoVistaData.reduce(
          (acc, casa) => acc + casa.documentos.length,
          0
        );

        // Add to history
        dataService.addImportHistory({
          fileName: file.name,
          type: "documentos",
          totalItems: gestaoVistaData.length,
          totalDocumentos,
          status: "success",
          message: `${gestaoVistaData.length} casas com ${totalDocumentos} documentos`,
        });

        setMessage({
          type: "success",
          text: `${gestaoVistaData.length} casas com ${totalDocumentos} documentos importados com sucesso!`,
        });

        loadHistory();
        onImportSuccess?.(gestaoVistaData);

        // Clear message after some time
        setTimeout(() => {
          setMessage(null);
        }, 5000);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      
      // Add error to history
      dataService.addImportHistory({
        fileName: file.name,
        type: "documentos",
        totalItems: 0,
        status: "error",
        message: errorMessage,
      });

      setMessage({ type: "error", text: errorMessage });
      loadHistory();
      onImportError?.(errorMessage);
    } finally {
      setIsLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        await processFile(file);
      } else {
        setMessage({
          type: "error",
          text: "Apenas arquivos Excel (.xlsx, .xls) são aceitos",
        });
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const clearHistory = () => {
    if (confirm("Tem certeza que deseja limpar o histórico de importações?")) {
      dataService.clearImportHistory();
      loadHistory();
    }
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Agora mesmo";
    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays} dias atrás`;
    return formatDate(date);
  };

  const getMessageIcon = () => {
    switch (message?.type) {
      case "success":
        return <CheckCircle className="h-4 w-4" />;
      case "error":
        return <XCircle className="h-4 w-4" />;
      case "info":
        return <Info className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5 text-emerald-600" />
            Importar Documentos
          </CardTitle>
          <CardDescription>
            Arraste e solte ou clique para selecionar o arquivo Excel com os documentos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Hidden File Input */}
          <Input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Drag and Drop Zone */}
          <div
            onClick={triggerFileInput}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-xl p-8 cursor-pointer
              transition-all duration-200 ease-in-out
              ${isDragging 
                ? "border-emerald-500 bg-emerald-50" 
                : "border-gray-300 hover:border-emerald-400 hover:bg-gray-50"
              }
              ${isLoading ? "pointer-events-none opacity-60" : ""}
            `}
          >
            <div className="flex flex-col items-center justify-center gap-4">
              {isLoading ? (
                <>
                  <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
                  <div className="text-center">
                    <p className="text-lg font-medium text-gray-700">
                      Importando...
                    </p>
                    <p className="text-sm text-gray-500">
                      Aguarde enquanto processamos o arquivo
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className={`
                    p-4 rounded-full transition-colors
                    ${isDragging ? "bg-emerald-100" : "bg-gray-100"}
                  `}>
                    <FileSpreadsheet className={`
                      h-10 w-10 transition-colors
                      ${isDragging ? "text-emerald-600" : "text-gray-500"}
                    `} />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-medium text-gray-700">
                      {isDragging ? "Solte o arquivo aqui" : "Clique ou arraste um arquivo"}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Arquivos Excel (.xlsx, .xls)
                    </p>
                  </div>
                  <Button variant="outline" className="mt-2" disabled={isLoading}>
                    <Upload className="h-4 w-4 mr-2" />
                    Selecionar Arquivo
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* File Format Instructions */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-lg border">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium">Formato do Arquivo:</span>
            </div>

            <ul className="text-xs text-muted-foreground space-y-1.5 ml-6">
              <li className="flex items-start gap-2">
                <span className="text-xs mt-0.5">•</span>
                <span>
                  Cabeçalho na{" "}
                  <Badge variant="secondary" className="text-xs">
                    linha 11
                  </Badge>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-xs mt-0.5">•</span>
                <span>
                  Primeiro dado na{" "}
                  <Badge variant="secondary" className="text-xs">
                    linha 13
                  </Badge>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-xs mt-0.5">•</span>
                <span>Pula uma linha entre registros</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-xs mt-0.5">•</span>
                <span>
                  <Badge variant="outline" className="text-xs">
                    Coluna 4
                  </Badge>
                  : Código da casa (ex: BR 21-0332 - JARDIM DO LAGO)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-xs mt-0.5">•</span>
                <span>
                  <Badge variant="outline" className="text-xs">
                    Coluna 8
                  </Badge>
                  : Documentos (código + descrição)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Calendar className="h-3 w-3 mt-0.5 text-emerald-600" />
                <span>
                  <Badge variant="outline" className="text-xs">
                    Coluna 14
                  </Badge>
                  : Data de emissão
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="h-3 w-3 mt-0.5 text-emerald-600" />
                <span>
                  <Badge variant="outline" className="text-xs">
                    Coluna 16
                  </Badge>
                  : Data de validade
                </span>
              </li>
            </ul>
          </div>

          {/* Message Display */}
          {message && (
            <Alert
              className={`${
                message.type === "success"
                  ? "border-green-200 bg-green-50 text-green-800"
                  : message.type === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-blue-200 bg-blue-50 text-blue-800"
              }`}
            >
              <AlertDescription className="flex items-start gap-2">
                {getMessageIcon()}
                <span className="text-sm">{message.text}</span>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Import History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-slate-600" />
                Histórico de Importações
              </CardTitle>
              <CardDescription>
                Últimas importações realizadas no sistema
              </CardDescription>
            </div>
            {importHistory.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearHistory}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {importHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma importação realizada ainda</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-[180px]">Data/Hora</TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead className="text-center">Casas</TableHead>
                    <TableHead className="text-center">Documentos</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {formatRelativeTime(item.timestamp)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(item.timestamp)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                          <span className="text-sm truncate max-w-[200px]" title={item.fileName}>
                            {item.fileName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {item.totalItems}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.totalDocumentos ? (
                          <Badge variant="outline">
                            {item.totalDocumentos}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.status === "success" ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Sucesso
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Erro
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



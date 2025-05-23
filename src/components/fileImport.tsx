"use client";

import React, { useState, useRef } from "react";
import { DataService } from "../services/dataService";
import { CasaOracao, GestaoData } from "../types/churchs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Info,
  Loader2,
} from "lucide-react";

interface FileImportProps {
  onImportSuccess?: (data: CasaOracao[] | GestaoData[]) => void;
  onImportError?: (error: string) => void;
}

export default function FileImport({
  onImportSuccess,
  onImportError,
}: FileImportProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [importType, setImportType] = useState<"casas" | "gestao">("casas");
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dataService = new DataService();

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setMessage(null);

    try {
      if (importType === "casas") {
        setMessage({ type: "info", text: "Importando casas de oração..." });
        const casas = await dataService.importCasasFromExcel(file);
        setMessage({
          type: "success",
          text: `${casas.length} casas de oração importadas com sucesso!`,
        });
        onImportSuccess?.(casas);
      } else {
        setMessage({ type: "info", text: "Importando dados de gestão..." });
        const gestaoData = await dataService.importGestaoFromExcel(file);
        if (gestaoData) {
          setMessage({
            type: "success",
            text: `${gestaoData.length} registros de gestão importados com sucesso!`,
          });
          onImportSuccess?.(gestaoData);
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      setMessage({ type: "error", text: errorMessage });
      onImportError?.(errorMessage);
    } finally {
      setIsLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleImportTypeChange = (type: "casas" | "gestao") => {
    setImportType(type);
    setMessage(null);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6 text-blue-600" />
          Importar Dados do Excel
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Import Type Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Tipo de Importação:</Label>
          <div className="flex gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="casas"
                name="importType"
                value="casas"
                checked={importType === "casas"}
                onChange={() => handleImportTypeChange("casas")}
                className="w-4 h-4 text-blue-600"
              />
              <Label htmlFor="casas" className="text-sm cursor-pointer">
                Casas de Oração
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="gestao"
                name="importType"
                value="gestao"
                checked={importType === "gestao"}
                onChange={() => handleImportTypeChange("gestao")}
                className="w-4 h-4 text-blue-600"
              />
              <Label htmlFor="gestao" className="text-sm cursor-pointer">
                Dados de Gestão
              </Label>
            </div>
          </div>
        </div>

        {/* File Input */}
        <Input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Import Button */}
        <Button
          onClick={triggerFileInput}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importando...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Selecionar Arquivo Excel
            </>
          )}
        </Button>

        {/* Instructions */}
        <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">Instruções:</span>
          </div>

          {importType === "casas" ? (
            <ul className="text-sm text-muted-foreground space-y-1 ml-6">
              <li className="flex items-start gap-2">
                <span className="text-xs mt-1">•</span>
                <span>
                  O arquivo deve conter as colunas:{" "}
                  <Badge variant="secondary" className="text-xs">
                    codigo
                  </Badge>{" "}
                  e{" "}
                  <Badge variant="secondary" className="text-xs">
                    nome
                  </Badge>{" "}
                  (obrigatórias)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-xs mt-1">•</span>
                <span>
                  Colunas opcionais:{" "}
                  <Badge variant="outline" className="text-xs">
                    tipo_imovel
                  </Badge>{" "}
                  <Badge variant="outline" className="text-xs">
                    endereco
                  </Badge>{" "}
                  <Badge variant="outline" className="text-xs">
                    observacoes
                  </Badge>{" "}
                  <Badge variant="outline" className="text-xs">
                    status
                  </Badge>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-xs mt-1">•</span>
                <span>A primeira linha deve conter os cabeçalhos</span>
              </li>
            </ul>
          ) : (
            <ul className="text-sm text-muted-foreground space-y-1 ml-6">
              <li className="flex items-start gap-2">
                <span className="text-xs mt-1">•</span>
                <span>
                  Os cabeçalhos devem estar na linha 15 (linha 14 zero-indexed)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-xs mt-1">•</span>
                <span>A primeira coluna deve conter o código</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-xs mt-1">•</span>
                <span>Outras colunas serão normalizadas automaticamente</span>
              </li>
            </ul>
          )}
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
  );
}

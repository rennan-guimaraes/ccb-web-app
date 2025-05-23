"use client";

import React, { useState, useRef } from "react";
import { DataService } from "../services/dataService";
import { GestaoVistaData } from "../types/churchs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Info,
  Loader2,
  Calendar,
  Clock,
} from "lucide-react";

interface GestaoVistaImportProps {
  onImportSuccess?: (data: GestaoVistaData[]) => void;
  onImportError?: (error: string) => void;
}

export default function GestaoVistaImport({
  onImportSuccess,
  onImportError,
}: GestaoVistaImportProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
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
    setMessage({ type: "info", text: "Importando dados do gestão a vista..." });

    try {
      const gestaoVistaData = await dataService.importGestaoVistaFromExcel(
        file
      );
      if (gestaoVistaData) {
        const totalDocumentos = gestaoVistaData.reduce(
          (acc, casa) => acc + casa.documentos.length,
          0
        );
        setMessage({
          type: "success",
          text: `${gestaoVistaData.length} casas com ${totalDocumentos} documentos importados com sucesso! Dados tradicionais gerados automaticamente.`,
        });
        onImportSuccess?.(gestaoVistaData);

        // Close dialog after successful import
        setTimeout(() => {
          setIsOpen(false);
          setMessage(null);
        }, 3000);
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar Gestão a Vista
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-purple-600" />
            Importar Dados do Gestão a Vista
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
          <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">
                Formato Gestão a Vista:
              </span>
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
                <Calendar className="h-3 w-3 mt-0.5 text-purple-600" />
                <span>
                  <Badge variant="outline" className="text-xs">
                    Coluna 14
                  </Badge>
                  : Data de emissão
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="h-3 w-3 mt-0.5 text-purple-600" />
                <span>
                  <Badge variant="outline" className="text-xs">
                    Coluna 16
                  </Badge>
                  : Data de validade
                </span>
              </li>
            </ul>
          </div>

          {/* Features highlight */}
          <div className="space-y-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">
                Recursos inclusos:
              </span>
            </div>
            <ul className="text-xs text-purple-700 space-y-1 ml-6">
              <li>• Datas de emissão e validade dos documentos</li>
              <li>• Controle detalhado por documento</li>
              <li>• Geração automática do formato gestão tradicional</li>
              <li>• Validação inteligente de dados</li>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

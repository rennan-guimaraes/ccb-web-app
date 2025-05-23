"use client";

import React, { useState, useRef } from "react";
import { DataService } from "../services/dataService";
import { GestaoData } from "../types/churchs";
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
} from "lucide-react";

interface GestaoImportProps {
  onImportSuccess?: (data: GestaoData[]) => void;
  onImportError?: (error: string) => void;
}

export default function GestaoImport({
  onImportSuccess,
  onImportError,
}: GestaoImportProps) {
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
    setMessage({ type: "info", text: "Importando dados de gestão..." });

    try {
      const gestaoData = await dataService.importGestaoFromExcel(file);
      if (gestaoData) {
        setMessage({
          type: "success",
          text: `${gestaoData.length} registros de gestão importados com sucesso!`,
        });
        onImportSuccess?.(gestaoData);

        // Close dialog after successful import
        setTimeout(() => {
          setIsOpen(false);
          setMessage(null);
        }, 2000);
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
          Importar Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Importar Dados de Gestão
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
              <Info className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Instruções:</span>
            </div>

            <ul className="text-xs text-muted-foreground space-y-1 ml-6">
              <li className="flex items-start gap-2">
                <span className="text-xs mt-0.5">•</span>
                <span>
                  Os cabeçalhos devem estar na linha 15 (linha 14 zero-indexed)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-xs mt-0.5">•</span>
                <span>
                  A primeira coluna deve conter o{" "}
                  <Badge variant="secondary" className="text-xs">
                    código
                  </Badge>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-xs mt-0.5">•</span>
                <span>
                  Marque com{" "}
                  <Badge variant="outline" className="text-xs">
                    X
                  </Badge>{" "}
                  os documentos presentes
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-xs mt-0.5">•</span>
                <span>Outras colunas serão normalizadas automaticamente</span>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

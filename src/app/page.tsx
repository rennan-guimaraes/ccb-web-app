"use client";

import React, { useState } from "react";
import FileImport from "../components/fileImport";
import DataDisplay from "../components/dataDisplay";
import { CasaOracao, GestaoData } from "../types/casaOracao";
import { Church } from "lucide-react";

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleImportSuccess = (data: CasaOracao[] | GestaoData[]) => {
    console.log("Data imported successfully:", data);
    // Trigger refresh of data display
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleImportError = (error: string) => {
    console.error("Import error:", error);
    // Could show a toast notification here
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Church className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold text-foreground">
              ⛪ Sistema de Gestão da Igreja
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Importação e gerenciamento de dados das casas de oração e gestão
            administrativa
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* File Import Section */}
          <FileImport
            onImportSuccess={handleImportSuccess}
            onImportError={handleImportError}
          />

          {/* Data Display Section */}
          <DataDisplay refreshTrigger={refreshTrigger} />
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-border">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Sistema desenvolvido para gerenciamento de dados da igreja
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              © 2024 - Todos os direitos reservados
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

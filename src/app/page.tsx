"use client";

import React, { useState } from "react";
import DataDisplay from "../components/dataDisplay";
import { Church } from "lucide-react";

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
            Gerenciamento completo de dados das casas de oração e gestão
            administrativa com funcionalidades de importação, backup e análise
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
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

"use client";

import React, { useState } from "react";
import DataDisplay from "../components/dataDisplay";

export default function Home() {
  const [refreshTrigger] = useState(0);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
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

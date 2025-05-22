"use client";

import React, { useState } from "react";
import { CasaOracao } from "../types/casaOracao";
import { DataService } from "../services/dataService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Save } from "lucide-react";

interface AddCasaModalProps {
  onCasaAdded: (casa: CasaOracao) => void;
}

export default function AddCasaModal({ onCasaAdded }: AddCasaModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    codigo: "",
    nome: "",
    tipo_imovel: "",
    endereco: "",
    observacoes: "",
    status: "Ativo",
  });

  const dataService = new DataService();

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddCasa = () => {
    // Validação básica
    if (!formData.codigo.trim() || !formData.nome.trim()) {
      alert("Código e Nome são obrigatórios!");
      return;
    }

    // Adicionar a nova casa
    const novaCasa: CasaOracao = {
      codigo: formData.codigo.trim(),
      nome: formData.nome.trim(),
      tipo_imovel: formData.tipo_imovel.trim() || undefined,
      endereco: formData.endereco.trim() || undefined,
      observacoes: formData.observacoes.trim() || undefined,
      status: formData.status,
    };

    const result = dataService.saveCasa(novaCasa);
    if (result.success) {
      onCasaAdded(novaCasa);
      // Limpar formulário
      setFormData({
        codigo: "",
        nome: "",
        tipo_imovel: "",
        endereco: "",
        observacoes: "",
        status: "Ativo",
      });
      setIsOpen(false);
    } else {
      alert(`Erro ao adicionar casa: ${result.message}`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Casa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Casa de Oração</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Código <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Ex: BR 21-0001"
              value={formData.codigo}
              onChange={(e) => handleFormChange("codigo", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Nome <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Nome da casa de oração"
              value={formData.nome}
              onChange={(e) => handleFormChange("nome", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo do Imóvel</label>
            <Select
              value={formData.tipo_imovel}
              onValueChange={(value) => handleFormChange("tipo_imovel", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IP - Imóvel Próprio">
                  IP - Imóvel Próprio
                </SelectItem>
                <SelectItem value="AL - Imóvel Alugado">
                  AL - Imóvel Alugado
                </SelectItem>
                <SelectItem value="CD - Imóvel Cedido">
                  CD - Imóvel Cedido
                </SelectItem>
                <SelectItem value="IP - Sigla 1. IPR">
                  IP - Sigla 1. IPR
                </SelectItem>
                <SelectItem value="IP - Sigla 2. IPS">
                  IP - Sigla 2. IPS
                </SelectItem>
                <SelectItem value="ND - Indeterminado">
                  ND - Indeterminado
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Endereço</label>
            <Input
              placeholder="Endereço completo"
              value={formData.endereco}
              onChange={(e) => handleFormChange("endereco", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleFormChange("status", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Inativo">Inativo</SelectItem>
                <SelectItem value="Em Análise">Em Análise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Observações</label>
            <Textarea
              placeholder="Observações adicionais..."
              value={formData.observacoes}
              onChange={(e) => handleFormChange("observacoes", e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleAddCasa} className="gap-2">
            <Save className="h-4 w-4" />
            Salvar Casa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

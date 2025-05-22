"use client";

import React, { useState } from "react";
import { CasaOracao, GestaoData } from "../types/casaOracao";
import { DataService } from "../services/dataService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, Save, AlertTriangle } from "lucide-react";

interface BuscarImovelFaltanteProps {
  gestaoData: GestaoData[];
  casasData: CasaOracao[];
  onCasaAdded: (casa: CasaOracao) => void;
}

interface ImovelFaltante {
  codigo: string;
}

export default function BuscarImovelFaltante({
  gestaoData,
  casasData,
  onCasaAdded,
}: BuscarImovelFaltanteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [imovelsFaltantes, setImovelsFaltantes] = useState<ImovelFaltante[]>(
    []
  );
  const [selectedImovel, setSelectedImovel] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    tipo_imovel: "",
    endereco: "",
    observacoes: "",
    status: "Ativo",
  });

  const dataService = new DataService();

  const buscarImovelsFaltantes = () => {
    // Pegar todos os códigos únicos dos dados de gestão
    const codigosGestao = [...new Set(gestaoData.map((item) => item.codigo))];

    // Pegar todos os códigos das casas cadastradas
    const codigosCasas = casasData.map((casa) => casa.codigo);

    // Encontrar códigos que estão na gestão mas não nas casas
    const faltantes = codigosGestao.filter(
      (codigo) => !codigosCasas.includes(codigo)
    );

    setImovelsFaltantes(faltantes.map((codigo) => ({ codigo })));
    setIsOpen(true);
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSelectImovel = (codigo: string) => {
    setSelectedImovel(codigo);
    // Limpar formulário ao selecionar novo imóvel
    setFormData({
      nome: "",
      tipo_imovel: "",
      endereco: "",
      observacoes: "",
      status: "Ativo",
    });
  };

  const handleAddCasa = () => {
    if (!selectedImovel) {
      alert("Selecione um imóvel para cadastrar!");
      return;
    }

    if (!formData.nome.trim()) {
      alert("Nome é obrigatório!");
      return;
    }

    // Adicionar a nova casa
    const novaCasa: CasaOracao = {
      codigo: selectedImovel,
      nome: formData.nome.trim(),
      tipo_imovel: formData.tipo_imovel.trim() || undefined,
      endereco: formData.endereco.trim() || undefined,
      observacoes: formData.observacoes.trim() || undefined,
      status: formData.status,
    };

    const result = dataService.saveCasa(novaCasa);
    if (result.success) {
      onCasaAdded(novaCasa);
      // Remover da lista de faltantes
      setImovelsFaltantes((prev) =>
        prev.filter((item) => item.codigo !== selectedImovel)
      );
      setSelectedImovel(null);
      // Limpar formulário
      setFormData({
        nome: "",
        tipo_imovel: "",
        endereco: "",
        observacoes: "",
        status: "Ativo",
      });

      if (imovelsFaltantes.length === 1) {
        // Se era o último, fechar o modal
        setIsOpen(false);
      }
    } else {
      alert(`Erro ao adicionar casa: ${result.message}`);
    }
  };

  const totalFaltantes =
    gestaoData.length > 0 && casasData.length > 0
      ? [...new Set(gestaoData.map((item) => item.codigo))].filter(
          (codigo) => !casasData.map((casa) => casa.codigo).includes(codigo)
        ).length
      : 0;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={buscarImovelsFaltantes}
        disabled={gestaoData.length === 0}
      >
        <Search className="h-4 w-4" />
        Buscar Faltantes
        {totalFaltantes > 0 && (
          <Badge variant="destructive" className="ml-1">
            {totalFaltantes}
          </Badge>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Imóveis Faltantes no Cadastro
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {imovelsFaltantes.length === 0
                ? "Todos os imóveis dos dados de gestão estão cadastrados! 🎉"
                : `Encontrados ${imovelsFaltantes.length} imóveis que estão nos dados de gestão mas não estão cadastrados.`}
            </p>
          </DialogHeader>

          {imovelsFaltantes.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Lista de imóveis faltantes */}
              <div className="space-y-4">
                <h4 className="font-medium">
                  Selecione um imóvel para cadastrar:
                </h4>
                <div className="border rounded-md max-h-80 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead className="w-[100px]">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {imovelsFaltantes.map((imovel) => (
                        <TableRow
                          key={imovel.codigo}
                          className={
                            selectedImovel === imovel.codigo ? "bg-blue-50" : ""
                          }
                        >
                          <TableCell className="font-medium">
                            {imovel.codigo}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant={
                                selectedImovel === imovel.codigo
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() => handleSelectImovel(imovel.codigo)}
                            >
                              {selectedImovel === imovel.codigo
                                ? "Selecionado"
                                : "Selecionar"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Formulário de cadastro */}
              <div className="space-y-4">
                {selectedImovel ? (
                  <>
                    <h4 className="font-medium">
                      Cadastrar:{" "}
                      <span className="text-blue-600">{selectedImovel}</span>
                    </h4>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Nome <span className="text-red-500">*</span>
                      </label>
                      <Input
                        placeholder="Nome da casa de oração"
                        value={formData.nome}
                        onChange={(e) =>
                          handleFormChange("nome", e.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Tipo do Imóvel
                      </label>
                      <Select
                        value={formData.tipo_imovel}
                        onValueChange={(value) =>
                          handleFormChange("tipo_imovel", value)
                        }
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
                        onChange={(e) =>
                          handleFormChange("endereco", e.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) =>
                          handleFormChange("status", value)
                        }
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
                        onChange={(e) =>
                          handleFormChange("observacoes", e.target.value)
                        }
                        rows={3}
                      />
                    </div>

                    <Button onClick={handleAddCasa} className="w-full gap-2">
                      <Save className="h-4 w-4" />
                      Cadastrar Casa
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Selecione um imóvel da lista ao lado para cadastrar
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

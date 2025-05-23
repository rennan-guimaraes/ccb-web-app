"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  CheckCircle,
  XCircle,
  FileText,
  AlertCircle,
  Building,
  MapPin,
  EyeOff,
  Download,
  X,
  Search,
} from "lucide-react";
import { CasaOracao, GestaoData } from "../types/churchs";
import { DocumentosFaltantesService } from "../services/missingDocumentsService";
import { isDocumentoObrigatorio } from "../utils/constants";
import { exportarRelatorioPDF } from "./reportExport";

interface CasaDocumentosDetailProps {
  casas: CasaOracao[];
  gestaoData: GestaoData[];
}

interface DocumentoStatus {
  nome: string;
  presente: boolean;
  obrigatorio: boolean;
  observacao?: string;
  desconsiderar: boolean;
  aplicavel: boolean; // Se o documento se aplica ao tipo de imóvel
}

// Move normalizarBoolean function outside the component to avoid recreation on every render
const normalizarBoolean = (
  valor: boolean | string | null | undefined
): boolean => {
  if (valor === null || valor === undefined) return false;
  if (typeof valor === "boolean") return valor;
  if (typeof valor === "string") return valor.toLowerCase() === "true";
  return Boolean(valor);
};

export default function CasaDocumentosDetail({
  casas,
  gestaoData,
}: CasaDocumentosDetailProps) {
  const [casaSelecionada, setCasaSelecionada] = useState<string>("");
  const [documentos, setDocumentos] = useState<DocumentoStatus[]>([]);
  const [observacaoEditando, setObservacaoEditando] = useState<string>("");
  const [documentoEditando, setDocumentoEditando] = useState<string>("");
  const [desconsiderarEditando, setDesconsiderarEditando] = useState(false);
  const [buscaCasa, setBuscaCasa] = useState<string>("");
  const [mostrarDropdown, setMostrarDropdown] = useState(false);

  // Use useMemo to create the service instance only once
  const documentosService = useMemo(() => new DocumentosFaltantesService(), []);

  // Filtrar casas baseado na busca
  const casasFiltradas = casas.filter((casa) => {
    const termoBusca = buscaCasa.toLowerCase();
    return (
      casa.codigo.toLowerCase().includes(termoBusca) ||
      casa.nome.toLowerCase().includes(termoBusca) ||
      (casa.endereco && casa.endereco.toLowerCase().includes(termoBusca))
    );
  });

  const selecionarCasa = (codigoCasa: string) => {
    setCasaSelecionada(codigoCasa);
    const casa = casas.find((c) => c.codigo === codigoCasa);
    setBuscaCasa(casa ? `${casa.codigo} - ${casa.nome}` : "");
    setMostrarDropdown(false);
  };

  const limparSelecao = () => {
    setCasaSelecionada("");
    setBuscaCasa("");
    setDocumentos([]);
  };

  const carregarDocumentosCasa = useCallback(
    (codigoCasa: string) => {
      const casa = casas.find((c) => c.codigo === codigoCasa);
      const gestao = gestaoData.find((g) => g.codigo === codigoCasa);

      if (!gestao) {
        setDocumentos([]);
        return;
      }

      const documentosStatus: DocumentoStatus[] = [];
      const tiposDocumentos = Object.keys(gestao).filter(
        (key) => key !== "codigo"
      );

      tiposDocumentos.forEach((nomeDocumento) => {
        const presente =
          gestao[nomeDocumento]?.toString().toUpperCase().trim() === "X";
        const obrigatorio = isDocumentoObrigatorio(nomeDocumento);

        // Verificar se o documento se aplica ao tipo de imóvel
        const docNormalizado = nomeDocumento.toLowerCase();
        const isDocumentoApenasProprio =
          docNormalizado.includes("averbacao") ||
          docNormalizado.includes("averbação") ||
          docNormalizado.includes("escritura") ||
          (docNormalizado.includes("compra") &&
            docNormalizado.includes("venda"));

        let aplicavel = true;
        if (isDocumentoApenasProprio && casa?.tipo_imovel) {
          aplicavel = casa.tipo_imovel.toUpperCase().startsWith("IP");
        }

        // Buscar informações de exceção/observação
        const documentoFaltante = documentosService.getDocumentoFaltante(
          codigoCasa,
          nomeDocumento
        );

        documentosStatus.push({
          nome: nomeDocumento,
          presente,
          obrigatorio,
          observacao: documentoFaltante?.observacao,
          desconsiderar: normalizarBoolean(documentoFaltante?.desconsiderar),
          aplicavel,
        });
      });

      // Ordenar: obrigatórios primeiro, depois por nome
      documentosStatus.sort((a, b) => {
        if (a.obrigatorio !== b.obrigatorio) {
          return a.obrigatorio ? -1 : 1;
        }
        return a.nome.localeCompare(b.nome);
      });

      setDocumentos(documentosStatus);
    },
    [casas, gestaoData, documentosService]
  );

  useEffect(() => {
    if (casaSelecionada) {
      carregarDocumentosCasa(casaSelecionada);
    }
  }, [casaSelecionada, gestaoData, carregarDocumentosCasa]);

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      const dropdown = document.querySelector('[data-dropdown="casa-search"]');
      if (dropdown && !dropdown.contains(target)) {
        setMostrarDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const casaInfo = casas.find((c) => c.codigo === casaSelecionada);

  const handleSalvarObservacao = () => {
    if (!casaSelecionada || !documentoEditando) return;

    const sucesso = documentosService.updateDocumentoFaltante(
      casaSelecionada,
      documentoEditando,
      observacaoEditando,
      desconsiderarEditando,
      "Sistema" // ou você pode pedir o nome do usuário
    );

    if (sucesso) {
      // Recarregar documentos para mostrar a atualização
      carregarDocumentosCasa(casaSelecionada);
      // Limpar edição
      setDocumentoEditando("");
      setObservacaoEditando("");
      setDesconsiderarEditando(false);
    }
  };

  const iniciarEdicao = (documento: DocumentoStatus) => {
    setDocumentoEditando(documento.nome);
    setObservacaoEditando(documento.observacao || "");
    setDesconsiderarEditando(documento.desconsiderar);
  };

  const cancelarEdicao = () => {
    setDocumentoEditando("");
    setObservacaoEditando("");
    setDesconsiderarEditando(false);
  };

  const getStatusIcon = (documento: DocumentoStatus) => {
    if (documento.presente) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    if (documento.desconsiderar) {
      return <EyeOff className="h-5 w-5 text-gray-500" />;
    }
    if (!documento.aplicavel) {
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
    return <XCircle className="h-5 w-5 text-red-600" />;
  };

  const getStatusText = (documento: DocumentoStatus) => {
    if (documento.presente) return "Presente";
    if (documento.desconsiderar) return "Desconsiderado";
    if (!documento.aplicavel) return "Não aplicável";
    return "Faltante";
  };

  const getStatusColor = (documento: DocumentoStatus) => {
    if (documento.presente) return "bg-green-100 text-green-800";
    if (documento.desconsiderar) return "bg-gray-100 text-gray-800";
    if (!documento.aplicavel) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const contarDocumentos = useMemo(() => {
    const presentes = documentos.filter((d) => d.presente).length;
    const desconsiderados = documentos.filter((d) => d.desconsiderar).length;
    const total = documentos.length;
    const efetivos = total - desconsiderados;
    const percentual =
      efetivos > 0 ? ((presentes / efetivos) * 100).toFixed(1) : "0";

    return { presentes, desconsiderados, total, efetivos, percentual };
  }, [documentos]);

  const stats = contarDocumentos;

  const exportarRelatorio = async () => {
    if (!casaSelecionada || !casaInfo) {
      alert("Selecione uma casa de oração primeiro.");
      return;
    }

    try {
      await exportarRelatorioPDF({
        casaInfo,
        documentos,
        stats,
      });
    } catch (error) {
      console.error("Erro ao exportar relatório:", error);
      alert("Erro ao gerar o relatório. Tente novamente.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Seleção da Casa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-6 w-6 text-blue-600" />
            Selecionar Casa de Oração
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Campo de busca personalizado */}
            <div className="relative" data-dropdown="casa-search">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={buscaCasa}
                  onChange={(e) => {
                    setBuscaCasa(e.target.value);
                    setMostrarDropdown(true);
                    if (!e.target.value) {
                      setCasaSelecionada("");
                      setDocumentos([]);
                    }
                  }}
                  onFocus={() => setMostrarDropdown(true)}
                  placeholder="Digite para buscar uma casa de oração..."
                  className="pl-10 pr-10"
                />
                {buscaCasa && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={limparSelecao}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Dropdown de resultados */}
              {mostrarDropdown && buscaCasa && casasFiltradas.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                  {casasFiltradas.slice(0, 10).map((casa, index) => (
                    <div
                      key={`${casa.codigo}-${index}`}
                      onClick={() => selecionarCasa(casa.codigo)}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">
                          {casa.codigo} - {casa.nome}
                        </span>
                        {casa.endereco && (
                          <span className="text-sm text-gray-500 mt-1">
                            📍 {casa.endereco}
                          </span>
                        )}
                        {casa.tipo_imovel && (
                          <span className="text-xs text-blue-600 mt-1">
                            🏠 {casa.tipo_imovel}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {casasFiltradas.length > 10 && (
                    <div className="px-4 py-2 text-sm text-gray-500 bg-gray-50 text-center">
                      Mostrando 10 de {casasFiltradas.length} resultados.
                      Continue digitando para refinar.
                    </div>
                  )}
                </div>
              )}

              {/* Mensagem quando não há resultados */}
              {mostrarDropdown && buscaCasa && casasFiltradas.length === 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-4 text-center text-gray-500">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">Nenhuma casa encontrada</p>
                  <p className="text-xs mt-1">
                    Tente buscar por código, nome ou endereço
                  </p>
                </div>
              )}
            </div>

            {casaSelecionada && (
              <div className="flex justify-end">
                <Button size="sm" onClick={exportarRelatorio} className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportar PDF
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Informações da Casa Selecionada */}
      {casaInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600" />
              {casaInfo.nome}
              <Badge variant="outline">{casaInfo.codigo}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {casaInfo.tipo_imovel && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Tipo de Imóvel
                  </span>
                  <p className="text-sm">{casaInfo.tipo_imovel}</p>
                </div>
              )}
              {casaInfo.endereco && (
                <div className="col-span-2">
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Endereço
                  </span>
                  <p className="text-sm">{casaInfo.endereco}</p>
                </div>
              )}
              {casaInfo.status && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Status
                  </span>
                  <p className="text-sm">{casaInfo.status}</p>
                </div>
              )}
            </div>
            {casaInfo.observacoes && (
              <div className="mt-4">
                <span className="text-sm font-medium text-muted-foreground">
                  Observações
                </span>
                <p className="text-sm bg-gray-50 p-2 rounded">
                  {casaInfo.observacoes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resumo dos Documentos */}
      {casaSelecionada && documentos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Resumo dos Documentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.presentes}
                </div>
                <div className="text-sm text-muted-foreground">Presentes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {stats.total - stats.presentes - stats.desconsiderados}
                </div>
                <div className="text-sm text-muted-foreground">Faltantes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {stats.desconsiderados}
                </div>
                <div className="text-sm text-muted-foreground">
                  Desconsiderados
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.total}
                </div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {stats.percentual}%
                </div>
                <div className="text-sm text-muted-foreground">Completude</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Documentos */}
      {casaSelecionada && documentos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Documentos da Casa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Observação</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documentos.map((documento) => (
                  <TableRow key={documento.nome}>
                    <TableCell className="font-medium">
                      {documento.nome}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          documento.obrigatorio ? "default" : "secondary"
                        }
                      >
                        {documento.obrigatorio ? "Obrigatório" : "Opcional"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(documento)}
                        <Badge
                          variant="secondary"
                          className={getStatusColor(documento)}
                        >
                          {getStatusText(documento)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {documentoEditando === documento.nome ? (
                        <div className="space-y-2">
                          <Textarea
                            value={observacaoEditando}
                            onChange={(e) =>
                              setObservacaoEditando(e.target.value)
                            }
                            placeholder="Digite uma observação..."
                            className="min-h-[60px]"
                          />
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`desconsiderar-${documento.nome}`}
                              checked={desconsiderarEditando}
                              onCheckedChange={setDesconsiderarEditando}
                            />
                            <Label htmlFor={`desconsiderar-${documento.nome}`}>
                              Desconsiderar
                            </Label>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {documento.observacao && (
                            <p className="text-sm bg-gray-50 p-2 rounded mb-2">
                              {documento.observacao}
                            </p>
                          )}
                          {!documento.observacao && (
                            <span className="text-muted-foreground text-sm">
                              Sem observação
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {documentoEditando === documento.nome ? (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSalvarObservacao}>
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelarEdicao}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => iniciarEdicao(documento)}
                          disabled={documento.presente}
                        >
                          {documento.observacao ? "Editar" : "Adicionar"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Estado vazio */}
      {casaSelecionada && documentos.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Nenhum documento encontrado
            </h3>
            <p className="text-sm text-muted-foreground">
              Esta casa não possui dados de gestão importados ou não há
              documentos cadastrados.
            </p>
          </CardContent>
        </Card>
      )}

      {!casaSelecionada && (
        <Card>
          <CardContent className="text-center py-12">
            <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Selecione uma casa de oração
            </h3>
            <p className="text-sm text-muted-foreground">
              Escolha uma casa de oração acima para visualizar seus documentos.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

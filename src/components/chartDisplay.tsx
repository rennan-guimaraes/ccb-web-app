"use client";

import React, { useState, useRef } from "react";
import { GestaoData } from "../types/casaOracao";
import { isDocumentoObrigatorio } from "../utils/constants";
import { DocumentosFaltantesService } from "../services/documentosFaltantesService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Download,
  FileImage,
  AlertTriangle,
  FileText,
  Info,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import html2canvas from "html2canvas";

interface ChartDisplayProps {
  gestaoData: GestaoData[];
  totalCasas: number;
  useExemptions?: boolean; // New prop to enable exemptions
}

interface ChartDataItem {
  name: string;
  value: number;
  originalValue?: number; // Original count without exemptions
  exemptions?: number; // Number of exemptions
  percentage: number;
  isObrigatorio: boolean;
  fill: string;
  shortName: string;
}

export default function ChartDisplay({
  gestaoData,
  totalCasas,
  useExemptions = false,
}: ChartDisplayProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Function to abbreviate long document names
  const getShortName = (name: string): string => {
    if (name.length <= 20) return name;

    // Split by common separators and take meaningful parts
    const parts = name.split(/[-–—/,]/);
    if (parts.length > 1) {
      return parts[0].trim().substring(0, 20) + "...";
    }

    return name.substring(0, 20) + "...";
  };

  // Process data for chart
  const processChartData = (): ChartDataItem[] => {
    if (!gestaoData || gestaoData.length === 0) return [];

    const documentosService = new DocumentosFaltantesService();
    const chartData: ChartDataItem[] = [];

    if (useExemptions) {
      // Use data with exemptions
      const dataWithExemptions = documentosService.getChartDataWithExemptions(
        gestaoData,
        totalCasas
      );

      dataWithExemptions.forEach((item) => {
        const isObrigatorio = isDocumentoObrigatorio(item.name);
        const percentage = totalCasas > 0 ? (item.value / totalCasas) * 100 : 0;
        const displayName = item.name.replace(/_/g, " ").toUpperCase();

        chartData.push({
          name: displayName,
          shortName: getShortName(displayName),
          value: item.value,
          originalValue: item.originalValue,
          exemptions: item.exemptions,
          percentage,
          isObrigatorio,
          fill: isObrigatorio
            ? "hsl(var(--destructive))"
            : "hsl(var(--primary))",
        });
      });
    } else {
      // Original logic without exemptions
      const caracteristicas =
        gestaoData.length > 0
          ? Object.keys(gestaoData[0]).filter((key) => key !== "codigo")
          : [];

      caracteristicas.forEach((caracteristica) => {
        const contagem = gestaoData.reduce((count, item) => {
          const valor = item[caracteristica];
          return valor && valor.toString().toUpperCase().trim() === "X"
            ? count + 1
            : count;
        }, 0);

        const isObrigatorio = isDocumentoObrigatorio(caracteristica);
        const percentage = totalCasas > 0 ? (contagem / totalCasas) * 100 : 0;
        const displayName = caracteristica.replace(/_/g, " ").toUpperCase();

        // Only add documents that have at least one occurrence
        if (contagem > 0) {
          chartData.push({
            name: displayName,
            shortName: getShortName(displayName),
            value: contagem,
            percentage,
            isObrigatorio,
            fill: isObrigatorio
              ? "hsl(var(--destructive))"
              : "hsl(var(--primary))",
          });
        }
      });
    }

    // Sort: mandatory documents first (by count desc), then optional (by count desc)
    const obrigatorios = chartData
      .filter((item) => item.isObrigatorio)
      .sort((a, b) => b.value - a.value);

    const opcionais = chartData
      .filter((item) => !item.isObrigatorio)
      .sort((a, b) => b.value - a.value);

    return [...obrigatorios, ...opcionais];
  };

  const chartData = processChartData();
  const obrigatoriosCount = chartData.filter(
    (item) => item.isObrigatorio
  ).length;
  const opcionaisCount = chartData.filter((item) => !item.isObrigatorio).length;

  const exportChart = async () => {
    if (!chartRef.current) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
        useCORS: true,
        width: chartRef.current.scrollWidth,
        height: chartRef.current.scrollHeight,
      });

      // Create download link
      const link = document.createElement("a");
      link.download = `grafico_gestao_vista_${
        new Date().toISOString().split("T")[0]
      }.png`;
      link.href = canvas.toDataURL("image/png");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log("Gráfico exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar gráfico:", error);
      alert("Erro ao exportar gráfico. Tente novamente.");
    } finally {
      setIsExporting(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg min-w-[200px]">
          <p className="font-medium text-foreground mb-1">{data.name}</p>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Casas com documento:{" "}
              <span className="font-medium text-foreground">{data.value}</span>
            </p>
            {useExemptions &&
              data.originalValue !== undefined &&
              data.exemptions !== undefined && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Original:{" "}
                    <span className="font-medium text-foreground">
                      {data.originalValue}
                    </span>
                  </p>
                  {data.exemptions > 0 && (
                    <p className="text-sm text-green-600">
                      Desconsideradas:{" "}
                      <span className="font-medium">+{data.exemptions}</span>
                    </p>
                  )}
                </>
              )}
            <p className="text-sm text-muted-foreground">
              Porcentagem:{" "}
              <span className="font-medium text-foreground">
                {data.percentage.toFixed(1)}%
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              Total de casas:{" "}
              <span className="font-medium text-foreground">{totalCasas}</span>
            </p>
          </div>
          <div className="flex items-center gap-1 mt-2">
            {data.isObrigatorio ? (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Obrigatório
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                Opcional
              </Badge>
            )}
            {useExemptions && (
              <Badge variant="outline" className="text-xs">
                Com exceções
              </Badge>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = () => (
    <div className="flex items-center justify-center gap-6 mb-4 p-3 bg-muted/30 rounded-lg">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-destructive"></div>
        <span className="text-sm font-medium">
          Documentos Obrigatórios ({obrigatoriosCount})
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-primary"></div>
        <span className="text-sm font-medium">
          Documentos Opcionais ({opcionaisCount})
        </span>
      </div>
    </div>
  );

  const chartConfig = {
    value: {
      label: "Número de Casas",
    },
  };

  if (!gestaoData || gestaoData.length === 0 || chartData.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
            <BarChart3 className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            Nenhum dado disponível
          </h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Importe um arquivo de Gestão à Vista para visualizar o gráfico de
            características das casas de oração.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            Análise de Documentação das Casas de Oração
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={exportChart}
            disabled={isExporting}
            className="gap-2"
          >
            {isExporting ? (
              <>
                <Download className="h-4 w-4 animate-pulse" />
                Exportando...
              </>
            ) : (
              <>
                <FileImage className="h-4 w-4" />
                Exportar Gráfico
              </>
            )}
          </Button>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Total de Casas</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">
              {totalCasas}
            </p>
          </div>
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">
                Documentos Obrigatórios
              </span>
            </div>
            <p className="text-2xl font-bold text-red-800 mt-1">
              {obrigatoriosCount}
            </p>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Documentos Opcionais
              </span>
            </div>
            <p className="text-2xl font-bold text-blue-800 mt-1">
              {opcionaisCount}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div ref={chartRef} className="bg-background p-4 rounded-lg">
          {/* Legend */}
          <CustomLegend />

          {/* Chart */}
          <ChartContainer config={chartConfig} className="h-[450px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 40,
                  bottom: 80,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--muted))"
                />
                <XAxis
                  dataKey="shortName"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  label={{
                    value: "Número de Casas de Oração",
                    angle: -90,
                    position: "insideLeft",
                    style: {
                      textAnchor: "middle",
                      fill: "hsl(var(--foreground))",
                    },
                  }}
                />
                <ChartTooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Detailed Data Table */}
          <div className="mt-6">
            <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalhamento por Documento
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Mandatory Documents */}
              <div className="space-y-2">
                <h5 className="font-medium text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Documentos Obrigatórios
                </h5>
                <div className="space-y-1">
                  {chartData
                    .filter((item) => item.isObrigatorio)
                    .map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 border border-red-200 bg-red-50 rounded text-sm"
                      >
                        <span className="font-medium truncate mr-2 text-red-900">
                          {item.name}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="destructive" className="text-xs">
                            {item.value}
                          </Badge>
                          <span className="text-red-700 text-xs">
                            ({item.percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Optional Documents */}
              <div className="space-y-2">
                <h5 className="font-medium text-primary flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Documentos Opcionais
                </h5>
                <div className="space-y-1">
                  {chartData
                    .filter((item) => !item.isObrigatorio)
                    .map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 border border-blue-200 bg-blue-50 rounded text-sm"
                      >
                        <span className="font-medium truncate mr-2 text-blue-900">
                          {item.name}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="secondary" className="text-xs">
                            {item.value}
                          </Badge>
                          <span className="text-blue-700 text-xs">
                            ({item.percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

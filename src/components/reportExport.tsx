"use client";

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { CasaOracao } from "../types/churchs";

interface DocumentoStatus {
  nome: string;
  presente: boolean;
  obrigatorio: boolean;
  observacao?: string;
  desconsiderar: boolean;
  aplicavel: boolean;
}

interface RelatorioExportProps {
  casaInfo: CasaOracao;
  documentos: DocumentoStatus[];
  stats: {
    presentes: number;
    desconsiderados: number;
    total: number;
    efetivos: number;
    percentual: string;
  };
}

interface CasaFaltante {
  codigo: string;
  nome: string;
  observacao?: string;
  desconsiderar: boolean;
}

export const exportarRelatorioPDF = async ({
  casaInfo,
  documentos,
  stats,
}: RelatorioExportProps) => {
  // Criar elemento temporário para renderizar o relatório
  const reportElement = document.createElement("div");
  reportElement.style.position = "absolute";
  reportElement.style.left = "-9999px";
  reportElement.style.width = "800px";
  reportElement.style.backgroundColor = "white";
  reportElement.style.padding = "40px";
  reportElement.style.fontFamily = "Arial, sans-serif";

  const dataAtual = new Date().toLocaleDateString("pt-BR");
  const horaAtual = new Date().toLocaleTimeString("pt-BR");

  const getStatusColor = (documento: DocumentoStatus) => {
    if (documento.presente) return "#10b981"; // green
    if (documento.desconsiderar) return "#6b7280"; // gray
    if (!documento.aplicavel) return "#f59e0b"; // yellow
    return "#ef4444"; // red
  };

  const getStatusText = (documento: DocumentoStatus) => {
    if (documento.presente) return "Presente";
    if (documento.desconsiderar) return "Desconsiderado";
    if (!documento.aplicavel) return "Não aplicável";
    return "Faltante";
  };

  // Separar documentos
  const obrigatorios = documentos.filter((d) => d.obrigatorio);
  const opcionais = documentos.filter((d) => !d.obrigatorio);

  reportElement.innerHTML = `
    <div style="max-width: 800px; margin: 0 auto; line-height: 1.6;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 40px; border-bottom: 3px solid #3b82f6; padding-bottom: 20px;">
        <h1 style="color: #1e40af; margin: 0; font-size: 28px; font-weight: bold;">
          ⛪ Sistema de Gestão da Igreja
        </h1>
        <h2 style="color: #3b82f6; margin: 10px 0; font-size: 20px;">
          Relatório de Documentos - Casa de Oração
        </h2>
        <p style="color: #6b7280; margin: 0; font-size: 14px;">
          Gerado em ${dataAtual} às ${horaAtual}
        </p>
      </div>

      <!-- Informações da Casa -->
      <div style="background: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 30px; border-left: 4px solid #3b82f6;">
        <h3 style="color: #1e40af; margin: 0 0 16px 0; font-size: 18px; display: flex; align-items: center;">
          🏠 Informações da Casa
        </h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div><strong>Código:</strong> ${casaInfo.codigo}</div>
          <div><strong>Nome:</strong> ${casaInfo.nome}</div>
          ${
            casaInfo.tipo_imovel
              ? `<div><strong>Tipo de Imóvel:</strong> ${casaInfo.tipo_imovel}</div>`
              : ""
          }
          ${
            casaInfo.status
              ? `<div><strong>Status:</strong> ${casaInfo.status}</div>`
              : ""
          }
        </div>
        ${
          casaInfo.endereco
            ? `<div style="margin-top: 12px;"><strong>Endereço:</strong> ${casaInfo.endereco}</div>`
            : ""
        }
        ${
          casaInfo.observacoes
            ? `<div style="margin-top: 12px; background: white; padding: 12px; border-radius: 4px;"><strong>Observações:</strong> ${casaInfo.observacoes}</div>`
            : ""
        }
      </div>

      <!-- Resumo Estatístico -->
      <div style="margin-bottom: 30px;">
        <h3 style="color: #1e40af; margin: 0 0 20px 0; font-size: 18px; display: flex; align-items: center;">
          📊 Resumo dos Documentos
        </h3>
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; text-align: center;">
          <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 16px;">
            <div style="font-size: 24px; font-weight: bold; color: #10b981;">${
              stats.presentes
            }</div>
            <div style="font-size: 12px; color: #065f46;">Presentes</div>
          </div>
          <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 16px;">
            <div style="font-size: 24px; font-weight: bold; color: #ef4444;">${
              stats.total - stats.presentes - stats.desconsiderados
            }</div>
            <div style="font-size: 12px; color: #991b1b;">Faltantes</div>
          </div>
          <div style="background: #f3f4f6; border: 1px solid #6b7280; border-radius: 8px; padding: 16px;">
            <div style="font-size: 24px; font-weight: bold; color: #6b7280;">${
              stats.desconsiderados
            }</div>
            <div style="font-size: 12px; color: #374151;">Desconsiderados</div>
          </div>
          <div style="background: #eff6ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 16px;">
            <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${
              stats.total
            }</div>
            <div style="font-size: 12px; color: #1e40af;">Total</div>
          </div>
          <div style="background: #f3e8ff; border: 1px solid #8b5cf6; border-radius: 8px; padding: 16px;">
            <div style="font-size: 24px; font-weight: bold; color: #8b5cf6;">${
              stats.percentual
            }%</div>
            <div style="font-size: 12px; color: #5b21b6;">Completude</div>
          </div>
        </div>
      </div>

      <!-- Documentos Obrigatórios -->
      ${
        obrigatorios.length > 0
          ? `
      <div style="margin-bottom: 30px;">
        <h3 style="color: #1e40af; margin: 0 0 16px 0; font-size: 18px; display: flex; align-items: center;">
          ⚠️ Documentos Obrigatórios (${obrigatorios.length})
        </h3>
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          ${obrigatorios
            .map(
              (doc, index) => `
            <div style="padding: 16px; border-bottom: 1px solid #f3f4f6; ${
              index % 2 === 0 ? "background: #f9fafb;" : ""
            }">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <strong style="color: #1f2937;">${doc.nome}</strong>
                <span style="background: ${getStatusColor(
                  doc
                )}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                  ${getStatusText(doc)}
                </span>
              </div>
              ${
                doc.observacao
                  ? `<div style="background: #f8fafc; padding: 8px; border-radius: 4px; font-size: 14px; color: #4b5563;"><strong>Observação:</strong> ${doc.observacao}</div>`
                  : ""
              }
              ${
                !doc.aplicavel
                  ? `<div style="color: #f59e0b; font-size: 12px; font-style: italic;">⚠️ Não se aplica ao tipo de imóvel</div>`
                  : ""
              }
            </div>
          `
            )
            .join("")}
        </div>
      </div>
      `
          : ""
      }

      <!-- Documentos Opcionais -->
      ${
        opcionais.length > 0
          ? `
      <div style="margin-bottom: 30px;">
        <h3 style="color: #1e40af; margin: 0 0 16px 0; font-size: 18px; display: flex; align-items: center;">
          📄 Documentos Opcionais (${opcionais.length})
        </h3>
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          ${opcionais
            .map(
              (doc, index) => `
            <div style="padding: 16px; border-bottom: 1px solid #f3f4f6; ${
              index % 2 === 0 ? "background: #f9fafb;" : ""
            }">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <strong style="color: #1f2937;">${doc.nome}</strong>
                <span style="background: ${getStatusColor(
                  doc
                )}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                  ${getStatusText(doc)}
                </span>
              </div>
              ${
                doc.observacao
                  ? `<div style="background: #f8fafc; padding: 8px; border-radius: 4px; font-size: 14px; color: #4b5563;"><strong>Observação:</strong> ${doc.observacao}</div>`
                  : ""
              }
              ${
                !doc.aplicavel
                  ? `<div style="color: #f59e0b; font-size: 12px; font-style: italic;">⚠️ Não se aplica ao tipo de imóvel</div>`
                  : ""
              }
            </div>
          `
            )
            .join("")}
        </div>
      </div>
      `
          : ""
      }

      <!-- Footer -->
      <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
        <p style="margin: 0;">Sistema de Gestão da Igreja - Relatório gerado automaticamente</p>
      </div>
    </div>
  `;

  document.body.appendChild(reportElement);

  try {
    // Capturar o elemento como canvas
    const canvas = await html2canvas(reportElement, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      allowTaint: true,
    });

    // Criar PDF
    const pdf = new jsPDF("p", "mm", "a4");
    const imgData = canvas.toDataURL("image/png");

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pdfWidth - 20; // margem de 10mm de cada lado
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 10;

    // Adicionar primeira página
    pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight - 20;

    // Adicionar páginas adicionais se necessário
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight + 10;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight - 20;
    }

    // Download do PDF
    const fileName = `relatorio-documentos-${casaInfo.codigo.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}-${new Date().toISOString().split("T")[0]}.pdf`;

    pdf.save(fileName);
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    alert("Erro ao gerar o relatório PDF. Tente novamente.");
  } finally {
    // Remover elemento temporário
    document.body.removeChild(reportElement);
  }
};

export const exportarRelatorioDocumentoPDF = async ({
  analiseDocumento,
  casasData,
}: {
  analiseDocumento: {
    nomeDocumento: string;
    isObrigatorio: boolean;
    totalCasas: number;
    casasComDocumento: number;
    casasSemDocumento: number;
    casasDesconsideradas: number;
    percentualReal: number;
    percentualOriginal: number;
    casasFaltantes: CasaFaltante[];
  };
  casasData: CasaOracao[];
}) => {
  // Criar elemento temporário para renderizar o relatório
  const reportElement = document.createElement("div");
  reportElement.style.position = "absolute";
  reportElement.style.left = "-9999px";
  reportElement.style.width = "800px";
  reportElement.style.backgroundColor = "white";
  reportElement.style.padding = "40px";
  reportElement.style.fontFamily = "Arial, sans-serif";

  const dataAtual = new Date().toLocaleDateString("pt-BR");
  const horaAtual = new Date().toLocaleTimeString("pt-BR");

  const getStatusColor = (casa: CasaFaltante) => {
    if (casa.desconsiderar) return "#10b981"; // green
    if (casa.observacao) return "#3b82f6"; // blue
    return "#ef4444"; // red
  };

  const getStatusText = (casa: CasaFaltante) => {
    if (casa.desconsiderar) return "Desconsiderado";
    if (casa.observacao) return "Com observação";
    return "Pendente";
  };

  const isDocumentoApenasProprio = (nomeDocumento: string) => {
    const docNormalizado = nomeDocumento.toLowerCase();
    return (
      docNormalizado.includes("averbacao") ||
      docNormalizado.includes("averbação") ||
      docNormalizado.includes("escritura") ||
      (docNormalizado.includes("compra") && docNormalizado.includes("venda"))
    );
  };

  reportElement.innerHTML = `
    <div style="max-width: 800px; margin: 0 auto; line-height: 1.6;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 40px; border-bottom: 3px solid #3b82f6; padding-bottom: 20px;">
        <h1 style="color: #1e40af; margin: 0; font-size: 28px; font-weight: bold;">
          ⛪ Sistema de Gestão da Igreja
        </h1>
        <h2 style="color: #3b82f6; margin: 10px 0; font-size: 20px;">
          Relatório de Documento Faltante
        </h2>
        <p style="color: #6b7280; margin: 0; font-size: 14px;">
          Gerado em ${dataAtual} às ${horaAtual}
        </p>
      </div>

      <!-- Informações do Documento -->
      <div style="background: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 30px; border-left: 4px solid #${
        analiseDocumento.isObrigatorio ? "ef4444" : "3b82f6"
      };">
        <h3 style="color: #1e40af; margin: 0 0 16px 0; font-size: 18px; display: flex; align-items: center;">
          📄 ${analiseDocumento.nomeDocumento.replace(/_/g, " ").toUpperCase()}
        </h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div><strong>Tipo:</strong> ${
            analiseDocumento.isObrigatorio ? "Obrigatório" : "Opcional"
          }</div>
          <div><strong>Total de Casas:</strong> ${
            analiseDocumento.totalCasas
          }</div>
          ${
            isDocumentoApenasProprio(analiseDocumento.nomeDocumento)
              ? `<div style="grid-column: 1 / -1;"><strong>Aplicabilidade:</strong> <span style="color: #8b5cf6;">Apenas para Imóveis Próprios (IP)</span></div>`
              : ""
          }
        </div>
      </div>

      <!-- Resumo Estatístico -->
      <div style="margin-bottom: 30px;">
        <h3 style="color: #1e40af; margin: 0 0 20px 0; font-size: 18px; display: flex; align-items: center;">
          📊 Resumo Estatístico
        </h3>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; text-align: center;">
          <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 16px;">
            <div style="font-size: 24px; font-weight: bold; color: #10b981;">${
              analiseDocumento.casasComDocumento
            }</div>
            <div style="font-size: 12px; color: #065f46;">Com Documento</div>
          </div>
          <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 16px;">
            <div style="font-size: 24px; font-weight: bold; color: #ef4444;">${
              analiseDocumento.casasSemDocumento
            }</div>
            <div style="font-size: 12px; color: #991b1b;">Sem Documento</div>
          </div>
          <div style="background: #f3f4f6; border: 1px solid #6b7280; border-radius: 8px; padding: 16px;">
            <div style="font-size: 24px; font-weight: bold; color: #6b7280;">${
              analiseDocumento.casasDesconsideradas
            }</div>
            <div style="font-size: 12px; color: #374151;">Desconsideradas</div>
          </div>
          <div style="background: #f3e8ff; border: 1px solid #8b5cf6; border-radius: 8px; padding: 16px;">
            <div style="font-size: 24px; font-weight: bold; color: #8b5cf6;">${analiseDocumento.percentualReal.toFixed(
              1
            )}%</div>
            <div style="font-size: 12px; color: #5b21b6;">Completude</div>
          </div>
        </div>
        
        <!-- Comparação de Percentuais -->
        <div style="margin-top: 16px; padding: 12px; background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 14px; color: #92400e;"><strong>Percentual Original:</strong> ${analiseDocumento.percentualOriginal.toFixed(
              1
            )}%</span>
            <span style="font-size: 14px; color: #92400e;"><strong>Percentual Ajustado:</strong> ${analiseDocumento.percentualReal.toFixed(
              1
            )}%</span>
          </div>
          <p style="font-size: 12px; color: #92400e; margin: 8px 0 0 0;">
            💡 O percentual ajustado considera documentos desconsiderados como presentes
          </p>
        </div>
      </div>

      <!-- Lista de Casas Faltantes -->
      ${
        analiseDocumento.casasFaltantes.length > 0
          ? `
      <div style="margin-bottom: 30px;">
        <h3 style="color: #1e40af; margin: 0 0 16px 0; font-size: 18px; display: flex; align-items: center;">
          🏠 Casas sem este documento (${
            analiseDocumento.casasFaltantes.length
          })
        </h3>
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          ${analiseDocumento.casasFaltantes
            .map((casa, index) => {
              const casaInfo = casasData.find((c) => c.codigo === casa.codigo);
              return `
            <div style="padding: 16px; border-bottom: 1px solid #f3f4f6; ${
              index % 2 === 0 ? "background: #f9fafb;" : ""
            }">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div style="flex: 1;">
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <strong style="color: #1f2937;">${casa.codigo} - ${
                casa.nome
              }</strong>
                    <span style="background: ${getStatusColor(
                      casa
                    )}; color: white; padding: 2px 8px; border-radius: 8px; font-size: 11px; font-weight: bold;">
                      ${getStatusText(casa)}
                    </span>
                  </div>
                  ${
                    casaInfo?.tipo_imovel
                      ? `<div style="font-size: 12px; color: #6b7280;">🏠 ${casaInfo.tipo_imovel}</div>`
                      : ""
                  }
                  ${
                    casaInfo?.endereco
                      ? `<div style="font-size: 12px; color: #6b7280;">📍 ${casaInfo.endereco}</div>`
                      : ""
                  }
                </div>
              </div>
              ${
                casa.observacao
                  ? `<div style="background: #f8fafc; padding: 8px; border-radius: 4px; font-size: 14px; color: #4b5563; margin-top: 8px;"><strong>Observação:</strong> ${casa.observacao}</div>`
                  : ""
              }
            </div>
          `;
            })
            .join("")}
        </div>
      </div>
      `
          : `
      <div style="margin-bottom: 30px; text-align: center; padding: 40px; background: #f0fdf4; border: 1px solid #10b981; border-radius: 8px;">
        <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
        <h3 style="color: #15803d; margin: 0 0 8px 0;">Parabéns!</h3>
        <p style="color: #166534; margin: 0;">Todas as casas possuem este documento ou foram devidamente desconsideradas.</p>
      </div>
      `
      }

      <!-- Footer -->
      <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
        <p style="margin: 0;">Sistema de Gestão da Igreja - Relatório gerado automaticamente</p>
      </div>
    </div>
  `;

  document.body.appendChild(reportElement);

  try {
    // Capturar o elemento como canvas
    const canvas = await html2canvas(reportElement, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      allowTaint: true,
    });

    // Criar PDF
    const pdf = new jsPDF("p", "mm", "a4");
    const imgData = canvas.toDataURL("image/png");

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pdfWidth - 20; // margem de 10mm de cada lado
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 10;

    // Adicionar primeira página
    pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight - 20;

    // Adicionar páginas adicionais se necessário
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight + 10;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight - 20;
    }

    // Download do PDF
    const fileName = `relatorio-documento-${analiseDocumento.nomeDocumento
      .replace(/[^a-zA-Z0-9]/g, "_")
      .toLowerCase()}-${new Date().toISOString().split("T")[0]}.pdf`;

    pdf.save(fileName);
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    alert("Erro ao gerar o relatório PDF. Tente novamente.");
  } finally {
    // Remover elemento temporário
    document.body.removeChild(reportElement);
  }
};

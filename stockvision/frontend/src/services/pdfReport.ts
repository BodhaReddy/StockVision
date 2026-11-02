import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

export interface GeneratePdfOptions {
  symbol: string;
  stockName?: string;
  model: string;
  horizon: number;
  latestPrice: number;
  predictedPrice: number;
  expectedChange: number;
  expectedChangePct: number;
  direction: string;
  forecast: Array<{
    step: number;
    date: string;
    predicted_close: number;
    lower_bound: number;
    upper_bound: number;
  }>;
  metrics?: {
    mae?: number;
    rmse?: number;
    mape?: number;
    directional_accuracy?: number;
    training_time_seconds?: number;
  } | null;
  explanation?: {
    recent_trend_summary: string;
    moving_averages_context: string;
    volume_change_context: string;
    influential_factors: string[];
    label: string;
  } | null;
  chartElementId?: string;
  disclaimer?: string;
}

export async function generateForecastPdfReport(options: GeneratePdfOptions): Promise<void> {
  const {
    symbol,
    stockName,
    model,
    horizon,
    latestPrice,
    predictedPrice,
    expectedChange,
    expectedChangePct,
    direction,
    forecast,
    metrics,
    chartElementId = 'forecast-chart-card',
    disclaimer = 'Experimental forecasts for educational use, not investment advice.',
  } = options;

  // Initialize jsPDF (A4 portrait: 210 x 297 mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // 1. Top Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('StockVision', margin, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Deep Learning Quantitative Price Forecast Report', margin, 18);

  // Date on the right of banner
  const dateStr = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`Generated: ${dateStr}`, pageWidth - margin, 14, { align: 'right' });

  let currentY = 32;

  // 2. Executive Forecast Summary Cards
  // Left Meta Box
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(margin, currentY, (contentWidth - 4) / 2, 28, 2, 2, 'FD');

  doc.setTextColor(71, 85, 105); // slate-600
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('EQUITY & ARCHITECTURE METADATA', margin + 4, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59); // slate-800
  doc.setFontSize(8.5);
  doc.text(`Symbol: ${symbol} (${stockName || symbol})`, margin + 4, currentY + 12);
  doc.text(`Model: ${model.toUpperCase()} (Sequential Keras)`, margin + 4, currentY + 17);
  doc.text(`Forecast Horizon: ${horizon} Trading Days`, margin + 4, currentY + 22);

  // Right Prediction Box
  const rightX = margin + (contentWidth - 4) / 2 + 4;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(rightX, currentY, (contentWidth - 4) / 2, 28, 2, 2, 'FD');

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('PREDICTION TARGET HIGHLIGHTS', rightX + 4, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(8.5);
  doc.text(`Base Settlement Close: Rs ${latestPrice.toFixed(2)}`, rightX + 4, currentY + 12);

  const changeSign = expectedChange >= 0 ? '+' : '';
  const dirColor = direction === 'UP' ? [16, 185, 129] : direction === 'DOWN' ? [239, 68, 68] : [100, 116, 139];
  doc.setTextColor(dirColor[0], dirColor[1], dirColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(`Target Price (+${horizon}d): Rs ${predictedPrice.toFixed(2)} (${direction})`, rightX + 4, currentY + 17);

  doc.setFont('helvetica', 'normal');
  doc.text(`Expected Variance: ${changeSign}${expectedChange.toFixed(2)} (${changeSign}${expectedChangePct.toFixed(2)}%)`, rightX + 4, currentY + 22);

  currentY += 34;

  // 3. Offline Test Evaluation Metrics (if available)
  if (metrics) {
    doc.setFillColor(241, 245, 249); // slate-100
    doc.roundedRect(margin, currentY, contentWidth, 14, 2, 2, 'F');

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('TEST SPLIT EVALUATION BENCHMARK (15% Out-of-Sample):', margin + 4, currentY + 5);

    doc.setFont('helvetica', 'normal');
    const colW = contentWidth / 4;
    const maeText = metrics.mae !== undefined ? `Rs ${metrics.mae.toFixed(2)}` : 'N/A';
    const rmseText = metrics.rmse !== undefined ? `Rs ${metrics.rmse.toFixed(2)}` : 'N/A';
    const mapeText = metrics.mape !== undefined ? `${metrics.mape.toFixed(2)}%` : 'N/A';
    const accText = metrics.directional_accuracy !== undefined ? `${metrics.directional_accuracy.toFixed(1)}%` : 'N/A';

    doc.text(`MAE: ${maeText}`, margin + 4, currentY + 10);
    doc.text(`RMSE: ${rmseText}`, margin + 4 + colW, currentY + 10);
    doc.text(`MAPE: ${mapeText}`, margin + 4 + colW * 2, currentY + 10);
    doc.text(`Directional Accuracy: ${accText}`, margin + 4 + colW * 3, currentY + 10);

    currentY += 18;
  }

  // 4. Forecast Trajectory Chart
  const chartEl = document.getElementById(chartElementId);
  if (chartEl) {
    try {
      const canvas = await html2canvas(chartEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const imgHeight = 60;
      doc.addImage(imgData, 'JPEG', margin, currentY, contentWidth, imgHeight);
      currentY += imgHeight + 6;
    } catch (chartErr) {
      console.warn('Could not render chart into PDF:', chartErr);
    }
  }

  // 5. Step-by-Step Forecast Schedule Table
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Iterative Multi-Step Forecast Schedule', margin, currentY);
  currentY += 3;

  const tableRows = forecast.map((fc) => {
    const delta = fc.predicted_close - latestPrice;
    const deltaPct = (delta / latestPrice) * 100;
    const sign = delta >= 0 ? '+' : '';
    return [
      `+${fc.step}d`,
      fc.date,
      `Rs ${fc.predicted_close.toFixed(2)}`,
      `Rs ${fc.lower_bound.toFixed(2)}`,
      `Rs ${fc.upper_bound.toFixed(2)}`,
      `${sign}${delta.toFixed(2)} (${sign}${deltaPct.toFixed(2)}%)`,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Step', 'Forecast Date', 'Predicted Price', '90% Lower', '90% Upper', 'Delta vs Base']],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
      halign: 'center',
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 6 : currentY + 45;
  currentY = finalY;

  // 6. Why this prediction? Explanation Section
  if (options.explanation) {
    if (currentY > pageHeight - 48) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, contentWidth, 20, 2, 2, 'FD');

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('WHY THIS PREDICTION? (Influential input features, not causes of price movement)', margin + 4, currentY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    const expText = `${options.explanation.recent_trend_summary} ${options.explanation.moving_averages_context}`;
    const splitExp = doc.splitTextToSize(expText, contentWidth - 8);
    doc.text(splitExp, margin + 4, currentY + 8.5);

    currentY += 24;
  }

  // Check if disclaimer fits on current page or needs new page
  if (currentY > pageHeight - 26) {
    doc.addPage();
    currentY = 20;
  }

  // 6. Educational Disclaimer Banner
  doc.setFillColor(254, 243, 199); // amber-100
  doc.setDrawColor(245, 158, 11); // amber-500
  doc.roundedRect(margin, currentY, contentWidth, 18, 2, 2, 'FD');

  doc.setTextColor(180, 83, 9); // amber-700
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('MANDATORY EDUCATIONAL DISCLAIMER', margin + 4, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const disclaimerText =
    `${disclaimer} This report was generated automatically by StockVision strictly for academic research and college project evaluation. ` +
    'Financial equities exhibit high non-stationarity and stochastic risk. Deep learning forecasts must NEVER be utilized as investment, trading, or financial advice.';
  
  const splitDisclaimer = doc.splitTextToSize(disclaimerText, contentWidth - 8);
  doc.text(splitDisclaimer, margin + 4, currentY + 9);

  // 7. Footer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('StockVision Machine Learning Platform • Experimental Educational System', margin, pageHeight - 6);
  doc.text(`Page 1 of 1`, pageWidth - margin, pageHeight - 6, { align: 'right' });

  // Save PDF
  const cleanSymbol = symbol.replace('.NS', '');
  const fileName = `StockVision_${cleanSymbol}_${model.toUpperCase()}_${horizon}D_Report.pdf`;
  doc.save(fileName);
}


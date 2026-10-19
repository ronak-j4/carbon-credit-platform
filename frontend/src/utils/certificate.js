import { jsPDF } from "jspdf";
import QRCode from "qrcode";

/**
 * Generates an authentic QR code data URL pointing to on-chain verification.
 */
export async function generateQrDataUrl(text) {
  try {
    return await QRCode.toDataURL(text, {
      margin: 1,
      width: 160,
      color: {
        dark: "#14532d",
        light: "#ffffff",
      },
    });
  } catch (err) {
    console.error("Failed to generate QR code:", err);
    return null;
  }
}

/**
 * Generates and downloads an enhanced PDF "Proof of Carbon Retirement" certificate
 * with embedded QR code, certificate ID, beneficiary, and on-chain audit proof.
 */
export async function generateRetirementCertificate({
  projectName,
  location,
  projectType,
  amount,
  ownerLabel,
  ownerAddress,
  txHash,
  projectId,
  certificateId,
  beneficiary = "Self",
  retirementReason = "Voluntary Carbon Offset",
}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;

  const certIdDisplay = certificateId ? `#CERT-${certificateId}` : `#CERT-PENDING`;
  const verificationUrl = `${window.location.origin}/explorer?type=certificate&id=${certificateId || 1}&tx=${txHash || ""}`;

  // Outer decorative double border
  doc.setDrawColor(22, 101, 52);
  doc.setLineWidth(3);
  doc.rect(20, 20, pageWidth - 40, pageHeight - 40);

  doc.setDrawColor(34, 197, 94);
  doc.setLineWidth(1);
  doc.rect(26, 26, pageWidth - 52, pageHeight - 52);

  // Certificate Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(22, 101, 52);
  doc.text("Certificate of Carbon Credit Retirement", centerX, 75, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "Verified On-Chain · Immutable Hardhat Local Blockchain Record",
    centerX,
    95,
    { align: "center" }
  );

  // Big Tonnes Certify Banner
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `This certifies that ${amount} tonnes of verified CO2 credits have been permanently retired.`,
    centerX,
    140,
    { align: "center" }
  );

  const detailStartY = 185;
  const lineHeight = 24;
  const labelX = 60;
  const valueX = 220;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  const rows = [
    ["Certificate ID", certIdDisplay],
    ["Beneficiary", beneficiary || "Self"],
    ["Retirement Purpose", retirementReason || "Voluntary Carbon Offset"],
    ["Project Name", projectName],
    ["Project Type & Location", `${projectType} · ${location}`],
    ["On-Chain Project ID", `#${projectId}`],
    ["Retiree Wallet", `${ownerLabel} (${ownerAddress})`],
    ["Transaction Hash", txHash || "Pending"],
    ["Issued Timestamp", new Date().toUTCString()],
  ];

  rows.forEach(([label, value], i) => {
    const y = detailStartY + i * lineHeight;
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.text(label + ":", labelX, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(String(value), valueX, y);
  });

  // Embed QR Code for direct on-chain verification
  try {
    const qrDataUrl = await generateQrDataUrl(verificationUrl);
    if (qrDataUrl) {
      const qrSize = 110;
      const qrX = pageWidth - 170;
      const qrY = 180;

      doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(22, 101, 52);
      doc.text("SCAN TO VERIFY", qrX + qrSize / 2, qrY + qrSize + 15, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("Public Audit Explorer", qrX + qrSize / 2, qrY + qrSize + 28, { align: "center" });
    }
  } catch (err) {
    console.error("Could not append QR to PDF:", err);
  }

  // Footer Disclaimers
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "This certificate represents an irreversible retirement transaction recorded directly on the CarbonCreditPlatform smart contract.",
    centerX,
    pageHeight - 50,
    { align: "center" }
  );
  doc.text(
    "Retired credits are permanently removed from circulating supply and cannot be resold, transferred, or reclaimed.",
    centerX,
    pageHeight - 36,
    { align: "center" }
  );

  const safeProjectName = projectName.replace(/[^a-z0-9]/gi, "_").slice(0, 30);
  doc.save(`CarbonChain_Retirement_${certIdDisplay}_${safeProjectName}.pdf`);
}

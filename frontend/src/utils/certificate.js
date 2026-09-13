import { jsPDF } from "jspdf";

/**
 * Generates and downloads a PDF "proof of retirement" certificate after
 * a credit retirement transaction is confirmed on-chain. This is a
 * client-side convenience document — the actual permanent, tamper-proof
 * record of the retirement lives on the blockchain (the CreditsRetired
 * event and the totalRetired counter); this PDF just gives the retiree
 * something shareable and printable that references that on-chain proof.
 */
export function generateRetirementCertificate({
  projectName,
  location,
  projectType,
  amount,
  ownerLabel,
  ownerAddress,
  txHash,
  projectId,
}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;

  // Border
  doc.setDrawColor(47, 82, 51);
  doc.setLineWidth(3);
  doc.rect(24, 24, pageWidth - 48, doc.internal.pageSize.getHeight() - 48);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(47, 82, 51);
  doc.text("Certificate of Carbon Credit Retirement", centerX, 100, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(80, 80, 80);
  doc.text("Issued by CarbonChain \u2014 Blockchain-Verified Carbon Credit Platform", centerX, 130, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(30, 30, 30);
  doc.text(`This certifies that ${amount} tonnes of CO2 credits`, centerX, 190, { align: "center" });
  doc.text("have been permanently retired.", centerX, 220, { align: "center" });

  const detailStartY = 270;
  const lineHeight = 26;
  const labelX = centerX - 220;
  const valueX = centerX - 80;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);

  const rows = [
    ["Project", projectName],
    ["Location", location],
    ["Project Type", projectType],
    ["On-chain Project ID", `#${projectId}`],
    ["Retired By", `${ownerLabel} (${ownerAddress})`],
    ["Amount Retired", `${amount} tonnes CO2`],
    ["Transaction Hash", txHash],
    ["Date Issued", new Date().toLocaleString()],
  ];

  rows.forEach(([label, value], i) => {
    const y = detailStartY + i * lineHeight;
    doc.setTextColor(100, 100, 100);
    doc.text(label + ":", labelX, y);
    doc.setTextColor(20, 20, 20);
    doc.text(String(value), valueX, y);
  });

  doc.setFontSize(10);
  doc.setTextColor(130, 130, 130);
  doc.text(
    "This certificate references a transaction recorded immutably on the CarbonChain smart contract.",
    centerX,
    doc.internal.pageSize.getHeight() - 60,
    { align: "center" }
  );
  doc.text(
    "Retired credits cannot be traded or re-claimed \u2014 this retirement is permanent and auditable on-chain.",
    centerX,
    doc.internal.pageSize.getHeight() - 44,
    { align: "center" }
  );

  const safeProjectName = projectName.replace(/[^a-z0-9]/gi, "_").slice(0, 40);
  doc.save(`CarbonChain_Retirement_Certificate_${safeProjectName}_${Date.now()}.pdf`);
}

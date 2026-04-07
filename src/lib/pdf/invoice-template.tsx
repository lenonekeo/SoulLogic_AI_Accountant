import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { SalesInvoice, Client, LineItem } from "@/types/entities";
import { formatDate } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/currency";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, padding: 40, color: "#333" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30 },
  companyName: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#1e40af" },
  invoiceTitle: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#1e40af", textAlign: "right" },
  invoiceId: { fontSize: 12, color: "#6b7280", textAlign: "right" },
  section: { marginBottom: 20 },
  label: { fontFamily: "Helvetica-Bold", fontSize: 9, color: "#6b7280", marginBottom: 2 },
  value: { fontSize: 10 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1e40af",
    color: "white",
    padding: "6 8",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  tableRow: { flexDirection: "row", padding: "5 8", borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb" },
  colDesc: { flex: 3 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 1, textAlign: "right" },
  colAmount: { flex: 1, textAlign: "right" },
  totalsBox: { alignSelf: "flex-end", width: 200, marginTop: 10 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", padding: "3 8" },
  totalRow: {
    flexDirection: "row", justifyContent: "space-between",
    padding: "5 8", backgroundColor: "#1e40af", color: "white",
    fontFamily: "Helvetica-Bold",
  },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, textAlign: "center", color: "#9ca3af", fontSize: 8 },
});

interface InvoicePdfProps {
  invoice: SalesInvoice;
  client?: Client;
}

const InvoicePdf: React.FC<InvoicePdfProps> = ({ invoice, client }) => {
  const lineItems: LineItem[] = typeof invoice.Line_Items === "string"
    ? JSON.parse(invoice.Line_Items)
    : invoice.Line_Items;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>SoulLogic AI Accountant</Text>
            <Text style={{ color: "#6b7280" }}>Professional Accounting Services</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceId}>{invoice.Invoice_ID}</Text>
          </View>
        </View>

        {/* Bill To + Dates */}
        <View style={{ flexDirection: "row", marginBottom: 20 }}>
          <View style={{ flex: 2 }}>
            <Text style={styles.label}>BILL TO</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{client?.Company_Name ?? invoice.Client_ID}</Text>
            {client?.Address && <Text>{client.Address}</Text>}
            {client?.Email && <Text>{client.Email}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>INVOICE DATE</Text>
            <Text style={styles.value}>{formatDate(invoice.Invoice_Date)}</Text>
            <Text style={[styles.label, { marginTop: 8 }]}>DUE DATE</Text>
            <Text style={styles.value}>{formatDate(invoice.Due_Date)}</Text>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.tableHeader}>
          <Text style={styles.colDesc}>Description</Text>
          <Text style={styles.colQty}>Qty</Text>
          <Text style={styles.colPrice}>Unit Price</Text>
          <Text style={styles.colAmount}>Amount</Text>
        </View>
        {lineItems.map((item, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.colDesc}>{item.Item_Name}{item.Description ? `\n${item.Description}` : ""}</Text>
            <Text style={styles.colQty}>{item.Qty}</Text>
            <Text style={styles.colPrice}>{formatCurrency(item.Unit_Price)}</Text>
            <Text style={styles.colAmount}>{formatCurrency(item.Amount)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}>
            <Text>Subtotal</Text>
            <Text>{formatCurrency(Number(invoice.Subtotal))}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>Tax</Text>
            <Text>{formatCurrency(Number(invoice.Tax_Amount))}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>TOTAL DUE</Text>
            <Text>{formatCurrency(Number(invoice.Total_Amount))}</Text>
          </View>
        </View>

        {/* Notes */}
        {invoice.Notes && (
          <View style={{ marginTop: 20 }}>
            <Text style={styles.label}>NOTES</Text>
            <Text>{invoice.Notes}</Text>
          </View>
        )}

        <Text style={styles.footer}>Thank you for your business. Payment due by {formatDate(invoice.Due_Date)}.</Text>
      </Page>
    </Document>
  );
};

export async function generateInvoicePdf(invoice: SalesInvoice, client?: Client): Promise<Buffer> {
  const element = React.createElement(InvoicePdf, { invoice, client });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Buffer.from(await renderToBuffer(element as any));
}

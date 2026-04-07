import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatDate } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/currency";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, padding: 40, color: "#333" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#1e40af", marginBottom: 4 },
  tableHeader: { flexDirection: "row", backgroundColor: "#1e40af", color: "white", padding: "5 8", fontFamily: "Helvetica-Bold", fontSize: 9 },
  row: { flexDirection: "row", padding: "4 8", borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb" },
  col1: { flex: 1 },
  col2: { flex: 2 },
  col3: { flex: 1, textAlign: "right" },
  col4: { flex: 1, textAlign: "right" },
  col5: { flex: 1, textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", padding: "6 8", backgroundColor: "#f3f4f6", fontFamily: "Helvetica-Bold" },
});

interface StatementItem {
  date: string;
  reference: string;
  description: string;
  charges: number;
  payments: number;
  balance: number;
}

interface StatementPdfProps {
  entityName: string;
  statementDate: string;
  items: StatementItem[];
  totalBalance: number;
}

const StatementPdf: React.FC<StatementPdfProps> = ({ entityName, statementDate, items, totalBalance }) => (
  <Document>
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.title}>Account Statement</Text>
      <Text style={{ marginBottom: 4 }}>Account: {entityName}</Text>
      <Text style={{ color: "#6b7280", marginBottom: 20 }}>Statement Date: {formatDate(statementDate)}</Text>

      <View style={styles.tableHeader}>
        <Text style={styles.col1}>Date</Text>
        <Text style={styles.col2}>Description</Text>
        <Text style={styles.col1}>Ref #</Text>
        <Text style={styles.col3}>Charges</Text>
        <Text style={styles.col4}>Payments</Text>
        <Text style={styles.col5}>Balance</Text>
      </View>

      {items.map((item, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.col1}>{formatDate(item.date, "MMM d")}</Text>
          <Text style={styles.col2}>{item.description}</Text>
          <Text style={styles.col1}>{item.reference}</Text>
          <Text style={styles.col3}>{item.charges > 0 ? formatCurrency(item.charges) : ""}</Text>
          <Text style={styles.col4}>{item.payments > 0 ? formatCurrency(item.payments) : ""}</Text>
          <Text style={styles.col5}>{formatCurrency(item.balance)}</Text>
        </View>
      ))}

      <View style={styles.totalRow}>
        <Text>Balance Due: {formatCurrency(totalBalance)}</Text>
      </View>
    </Page>
  </Document>
);

export async function generateStatementPdf(
  entityName: string,
  statementDate: string,
  items: StatementItem[],
  totalBalance: number
): Promise<Buffer> {
  const element = React.createElement(StatementPdf, { entityName, statementDate, items, totalBalance });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Buffer.from(await renderToBuffer(element as any));
}

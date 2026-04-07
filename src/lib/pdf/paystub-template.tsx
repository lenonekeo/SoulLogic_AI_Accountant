import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { PayrollEntry, Employee } from "@/types/entities";
import { formatDate } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/currency";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, padding: 40, color: "#333" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#1e40af", marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#6b7280", marginBottom: 20 },
  row: { flexDirection: "row", justifyContent: "space-between", padding: "4 0", borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb" },
  label: { color: "#6b7280" },
  bold: { fontFamily: "Helvetica-Bold" },
  section: { marginBottom: 16 },
  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 10, backgroundColor: "#f3f4f6", padding: "4 8", marginBottom: 4 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", padding: "5 8", backgroundColor: "#1e40af", color: "white", fontFamily: "Helvetica-Bold" },
});

interface PaystubProps {
  entry: PayrollEntry;
  employee: Employee;
}

const PaystubPdf: React.FC<PaystubProps> = ({ entry, employee }) => (
  <Document>
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.title}>Pay Stub</Text>
      <Text style={styles.subtitle}>SoulLogic AI Accountant</Text>

      {/* Employee Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Employee Information</Text>
        <View style={styles.row}><Text style={styles.label}>Name</Text><Text>{employee.First_Name} {employee.Last_Name}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Employee ID</Text><Text>{employee.Employee_ID}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Position</Text><Text>{employee.Position}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Pay Period</Text><Text>{formatDate(entry.Pay_Period_Start)} – {formatDate(entry.Pay_Period_End)}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Pay Date</Text><Text>{entry.Pay_Date ? formatDate(entry.Pay_Date) : "—"}</Text></View>
      </View>

      {/* Earnings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Earnings</Text>
        <View style={styles.row}><Text style={styles.label}>Hours Worked</Text><Text>{entry.Hours_Worked}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Hourly Rate</Text><Text>{formatCurrency(Number(entry.Hourly_Rate))}</Text></View>
        <View style={styles.row}><Text style={styles.bold}>Gross Pay</Text><Text style={styles.bold}>{formatCurrency(Number(entry.Gross_Pay))}</Text></View>
      </View>

      {/* Deductions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Deductions</Text>
        <View style={styles.row}><Text style={styles.label}>Federal Income Tax</Text><Text>{formatCurrency(Number(entry.Federal_Tax))}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Provincial Income Tax</Text><Text>{formatCurrency(Number(entry.Provincial_Tax))}</Text></View>
        <View style={styles.row}><Text style={styles.label}>CPP/QPP (Employee)</Text><Text>{formatCurrency(Number(entry.CPP_QPP_Employee))}</Text></View>
        <View style={styles.row}><Text style={styles.label}>EI (Employee)</Text><Text>{formatCurrency(Number(entry.EI_Employee))}</Text></View>
        {Number(entry.QPIP_Employee) > 0 && <View style={styles.row}><Text style={styles.label}>QPIP (Employee)</Text><Text>{formatCurrency(Number(entry.QPIP_Employee))}</Text></View>}
        {Number(entry.Other_Deductions) > 0 && <View style={styles.row}><Text style={styles.label}>Other Deductions</Text><Text>{formatCurrency(Number(entry.Other_Deductions))}</Text></View>}
      </View>

      {/* Net Pay */}
      <View style={styles.totalRow}>
        <Text>NET PAY</Text>
        <Text>{formatCurrency(Number(entry.Net_Pay))}</Text>
      </View>

      {/* Employer Contributions */}
      <View style={[styles.section, { marginTop: 16 }]}>
        <Text style={styles.sectionTitle}>Employer Contributions</Text>
        <View style={styles.row}><Text style={styles.label}>CPP/QPP (Employer)</Text><Text>{formatCurrency(Number(entry.CPP_QPP_Employer))}</Text></View>
        <View style={styles.row}><Text style={styles.label}>EI (Employer)</Text><Text>{formatCurrency(Number(entry.EI_Employer))}</Text></View>
        {Number(entry.QPIP_Employer) > 0 && <View style={styles.row}><Text style={styles.label}>QPIP (Employer)</Text><Text>{formatCurrency(Number(entry.QPIP_Employer))}</Text></View>}
      </View>
    </Page>
  </Document>
);

export async function generatePaystubPdf(entry: PayrollEntry, employee: Employee): Promise<Buffer> {
  const element = React.createElement(PaystubPdf, { entry, employee });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Buffer.from(await renderToBuffer(element as any));
}
